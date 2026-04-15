import { config as loadEnv } from 'dotenv';
import path from 'path';
import * as XLSX from 'xlsx';
import { In, Repository } from 'typeorm';
import { hashPassword } from '../../common/utils/password.util';
import { StudentShift } from '../../common/enums/student-shift.enum';
import { INSTITUTION_SETTINGS_ID } from '../../institution/constants/institution.constants';
import { InstitutionSetting } from '../../institution/entities/institution-setting.entity';
import { Student } from '../../students/entities/student.entity';
import { StudentEnrollment } from '../../students/entities/student-enrollment.entity';
import { User } from '../../users/entities/user.entity';
import dataSource from '../data-source';
import {
  formatGeneratedStudentCode,
  GENERATED_STUDENT_CODE_MAX_SEQUENCE,
  isSupportedStudentCode,
  extractGeneratedStudentSequence,
} from '../../students/student-code.util';

loadEnv({ path: '.env' });

type ScriptOptions = {
  filePath: string;
  apply: boolean;
  schoolYear?: number;
  syncPasswordWithCode: boolean;
};

type RepairRow = {
  rowNumber: number;
  desiredCode: string | null;
  firstName: string;
  lastName: string;
  document: string | null;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
};

type RepairPlanItem = {
  row: RepairRow;
  student: Student & { user: User; enrollments: StudentEnrollment[] };
  nextCode: string;
  reason: 'provided' | 'generated';
};

async function run(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  await initializeDataSource();

  try {
    const schoolYear = options.schoolYear ?? (await resolveActiveSchoolYear());
    const rows = parseWorkbook(options.filePath);
    const studentsRepository = dataSource.getRepository(Student);
    const usersRepository = dataSource.getRepository(User);

    const matchedStudents = await buildRepairPlanCandidates(
      rows,
      schoolYear,
      studentsRepository,
    );
    const plan = await assignTargetCodes(
      matchedStudents,
      schoolYear,
      studentsRepository,
      usersRepository,
    );

    printPlanSummary(plan, options);

    if (!options.apply) {
      console.log(
        'Modo simulacion: no se aplicaron cambios. Usa --apply para ejecutar la correccion.',
      );
      return;
    }

    await dataSource.transaction(async (manager) => {
      const txStudentsRepository = manager.getRepository(Student);
      const txUsersRepository = manager.getRepository(User);

      for (const item of plan) {
        if (
          item.student.code === item.nextCode &&
          item.student.user.username === item.nextCode
        ) {
          continue;
        }

        item.student.code = item.nextCode;
        item.student.user.username = item.nextCode;
        item.student.user.authVersion += 1;

        if (options.syncPasswordWithCode) {
          item.student.user.passwordHash = await hashPassword(item.nextCode);
          item.student.user.mustChangePassword = true;
          item.student.user.lastLoginAt = null;
        }

        await txUsersRepository.save(item.student.user);
        await txStudentsRepository.save(item.student);
      }
    });

    console.log('Correccion masiva aplicada correctamente.');
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function resolveActiveSchoolYear(): Promise<number> {
  const settings = await dataSource.getRepository(InstitutionSetting).findOne({
    where: { id: INSTITUTION_SETTINGS_ID },
  });

  if (!settings) {
    throw new Error('No se encontro la configuracion institucional activa.');
  }

  return settings.activeSchoolYear;
}

function parseOptions(args: string[]): ScriptOptions {
  const fileIndex = args.findIndex((value) => value === '--file');

  if (fileIndex < 0 || !args[fileIndex + 1]) {
    throw new Error(
      'Debes indicar el Excel origen con --file <ruta-del-archivo>.',
    );
  }

  const schoolYearIndex = args.findIndex((value) => value === '--school-year');

  return {
    filePath: path.resolve(process.cwd(), args[fileIndex + 1]),
    apply: args.includes('--apply'),
    schoolYear:
      schoolYearIndex >= 0 && args[schoolYearIndex + 1]
        ? Number.parseInt(args[schoolYearIndex + 1] ?? '', 10)
        : undefined,
    syncPasswordWithCode: args.includes('--sync-password-with-code'),
  };
}

async function initializeDataSource(): Promise<void> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
}

function parseWorkbook(filePath: string): RepairRow[] {
  const workbook = XLSX.readFile(filePath, {
    raw: false,
    cellDates: false,
  });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('El Excel no contiene hojas con datos.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (matrix.length === 0) {
    throw new Error('El Excel no contiene filas para reparar.');
  }

  const [headerRow, ...dataRows] = matrix;
  const headerMap = buildHeaderMap(Array.isArray(headerRow) ? headerRow : []);

  return dataRows
    .map((row, index) =>
      parseRepairRow(Array.isArray(row) ? row : [], headerMap, index + 2),
    )
    .filter(
      (row) => row.desiredCode || row.document || row.firstName || row.lastName,
    );
}

function buildHeaderMap(headers: unknown[]): Map<string, number> {
  const map = new Map<string, number>();

  headers.forEach((header, index) => {
    const normalizedHeader = normalizeHeader(header);

    if (!normalizedHeader) {
      return;
    }

    if (
      [
        'codigo',
        'code',
        'studentcode',
        'codigodelestudiante',
        'username',
        'usuario',
        'user',
      ].includes(normalizedHeader)
    ) {
      map.set('code', index);
    }

    if (
      ['nombres', 'nombre', 'firstname', 'firstnames'].includes(
        normalizedHeader,
      )
    ) {
      map.set('firstName', index);
    }

    if (
      ['apellidos', 'apellido', 'lastname', 'lastnames'].includes(
        normalizedHeader,
      )
    ) {
      map.set('lastName', index);
    }

    if (['documento', 'document', 'dni', 'doc'].includes(normalizedHeader)) {
      map.set('document', index);
    }

    if (['grado', 'grade'].includes(normalizedHeader)) {
      map.set('grade', index);
    }

    if (
      ['seccion', 'section', 'aula', 'classroom'].includes(normalizedHeader)
    ) {
      map.set('section', index);
    }

    if (['turno', 'shift'].includes(normalizedHeader)) {
      map.set('shift', index);
    }
  });

  return map;
}

function normalizeHeader(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function parseRepairRow(
  values: unknown[],
  headerMap: Map<string, number>,
  rowNumber: number,
): RepairRow {
  const getValue = (key: string): unknown =>
    values[headerMap.get(key) ?? -1] ?? '';

  return {
    rowNumber,
    desiredCode: normalizeText(getValue('code')),
    firstName: normalizeText(getValue('firstName')) ?? '',
    lastName: normalizeText(getValue('lastName')) ?? '',
    document: normalizeText(getValue('document')),
    grade: normalizeGrade(getValue('grade')),
    section: normalizeSection(getValue('section')),
    shift: normalizeShift(getValue('shift')),
  };
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const normalizedValue = String(value).trim().toLowerCase();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeGrade(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsedValue = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function normalizeSection(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const normalizedValue = String(value).trim().toUpperCase();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeShift(value: unknown): StudentShift | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const normalizedValue = String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

  if (['morning', 'manana', 'turnomanana', 'am'].includes(normalizedValue)) {
    return StudentShift.MORNING;
  }

  if (['afternoon', 'tarde', 'turnotarde', 'pm'].includes(normalizedValue)) {
    return StudentShift.AFTERNOON;
  }

  return null;
}

async function buildRepairPlanCandidates(
  rows: RepairRow[],
  schoolYear: number,
  studentsRepository: Repository<Student>,
): Promise<
  Array<{
    row: RepairRow;
    student: Student & { user: User; enrollments: StudentEnrollment[] };
  }>
> {
  const plan: Array<{
    row: RepairRow;
    student: Student & { user: User; enrollments: StudentEnrollment[] };
  }> = [];

  for (const row of rows) {
    if (row.desiredCode && !isSupportedStudentCode(row.desiredCode)) {
      throw new Error(
        `Fila ${row.rowNumber}: el username/codigo ${row.desiredCode} no respeta el formato permitido.`,
      );
    }

    const student = await findTargetStudent(
      row,
      schoolYear,
      studentsRepository,
    );
    plan.push({ row, student });
  }

  return plan;
}

async function findTargetStudent(
  row: RepairRow,
  schoolYear: number,
  studentsRepository: Repository<Student>,
): Promise<Student & { user: User; enrollments: StudentEnrollment[] }> {
  if (row.document) {
    const studentByDocument = await studentsRepository.findOne({
      where: { document: row.document },
      relations: ['user', 'enrollments'],
    });

    if (!studentByDocument?.user) {
      throw new Error(
        `Fila ${row.rowNumber}: no se encontro un estudiante con documento ${row.document}.`,
      );
    }

    return studentByDocument as Student & {
      user: User;
      enrollments: StudentEnrollment[];
    };
  }

  const candidates = await studentsRepository.find({
    where: {
      firstName: row.firstName,
      lastName: row.lastName,
    },
    relations: ['user', 'enrollments'],
  });

  const filteredCandidates = candidates.filter((student) => {
    const currentEnrollment =
      student.enrollments.find(
        (enrollment) => enrollment.schoolYear === schoolYear,
      ) ?? null;

    if (!currentEnrollment) {
      return false;
    }

    if (row.grade !== null && currentEnrollment.grade !== row.grade) {
      return false;
    }

    if (row.section && currentEnrollment.section !== row.section) {
      return false;
    }

    if (row.shift && currentEnrollment.shift !== row.shift) {
      return false;
    }

    return true;
  });

  if (filteredCandidates.length !== 1 || !filteredCandidates[0]?.user) {
    throw new Error(
      `Fila ${row.rowNumber}: no se pudo identificar de forma unica al estudiante ${row.lastName} ${row.firstName}.`,
    );
  }

  return filteredCandidates[0] as Student & {
    user: User;
    enrollments: StudentEnrollment[];
  };
}

async function assignTargetCodes(
  items: Array<{
    row: RepairRow;
    student: Student & { user: User; enrollments: StudentEnrollment[] };
  }>,
  schoolYear: number,
  studentsRepository: Repository<Student>,
  usersRepository: Repository<User>,
): Promise<RepairPlanItem[]> {
  const desiredCodes = items
    .map((item) => item.row.desiredCode)
    .filter((code): code is string => Boolean(code));
  const duplicateDesiredCodes = findDuplicates(desiredCodes);

  if (duplicateDesiredCodes.size > 0) {
    throw new Error(
      `El Excel repite estos codigos: ${Array.from(duplicateDesiredCodes).join(', ')}.`,
    );
  }

  const reservedCodes = new Set(desiredCodes);
  const generatedCodes = await allocateGeneratedCodes(
    schoolYear,
    items.filter((item) => !item.row.desiredCode).length,
    studentsRepository,
    usersRepository,
    Array.from(reservedCodes),
  );
  let generatedIndex = 0;

  const plan: RepairPlanItem[] = items.map((item) => ({
    row: item.row,
    student: item.student,
    nextCode: item.row.desiredCode ?? generatedCodes[generatedIndex++] ?? '',
    reason: item.row.desiredCode ? 'provided' : 'generated',
  }));

  const targetCodes = plan.map((item) => item.nextCode);
  const existingStudents =
    targetCodes.length > 0
      ? await studentsRepository.find({
          where: { code: In(targetCodes) },
          relations: ['user'],
        })
      : [];
  const existingUsers =
    targetCodes.length > 0
      ? await usersRepository.find({
          where: { username: In(targetCodes) },
        })
      : [];
  const ownerByCode = new Map<string, string>();

  for (const student of existingStudents) {
    ownerByCode.set(student.code, student.id);
  }

  for (const user of existingUsers) {
    ownerByCode.set(user.username, user.id);
  }

  for (const item of plan) {
    const existingOwnerId = ownerByCode.get(item.nextCode);

    if (
      existingOwnerId &&
      existingOwnerId !== item.student.id &&
      existingOwnerId !== item.student.user.id
    ) {
      throw new Error(
        `Fila ${item.row.rowNumber}: el codigo ${item.nextCode} ya esta en uso por otro registro.`,
      );
    }
  }

  return plan;
}

async function allocateGeneratedCodes(
  schoolYear: number,
  quantity: number,
  studentsRepository: Repository<Student>,
  usersRepository: Repository<User>,
  reservedCodes: string[],
): Promise<string[]> {
  if (quantity <= 0) {
    return [];
  }

  const prefix = `u${schoolYear}`;
  const studentCodes = await studentsRepository
    .createQueryBuilder('student')
    .select('student.code', 'code')
    .where('student.code LIKE :prefix', { prefix: `${prefix}%` })
    .getRawMany<{ code: string }>();
  const userCodes = await usersRepository
    .createQueryBuilder('user')
    .select('user.username', 'username')
    .where('user.username LIKE :prefix', { prefix: `${prefix}%` })
    .getRawMany<{ username: string }>();
  const reservedCodeSet = new Set(reservedCodes);
  let currentSequence = 0;

  for (const code of [
    ...studentCodes.map((item) => item.code),
    ...userCodes.map((item) => item.username),
    ...reservedCodes,
  ]) {
    const sequence = extractGeneratedStudentSequence(code, schoolYear);

    if (sequence === null) {
      continue;
    }

    currentSequence = Math.max(currentSequence, sequence);
  }

  const generatedCodes: string[] = [];

  while (generatedCodes.length < quantity) {
    currentSequence += 1;

    if (currentSequence > GENERATED_STUDENT_CODE_MAX_SEQUENCE) {
      throw new Error(
        `No hay mas correlativos automaticos disponibles para el ano ${schoolYear}.`,
      );
    }

    const candidate = formatGeneratedStudentCode(schoolYear, currentSequence);

    if (reservedCodeSet.has(candidate)) {
      continue;
    }

    reservedCodeSet.add(candidate);
    generatedCodes.push(candidate);
  }

  return generatedCodes;
}

function findDuplicates(values: string[]): Set<string> {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([value]) => value),
  );
}

function printPlanSummary(
  plan: RepairPlanItem[],
  options: ScriptOptions,
): void {
  const changedItems = plan.filter(
    (item) =>
      item.student.code !== item.nextCode ||
      item.student.user.username !== item.nextCode,
  );

  console.log(
    JSON.stringify(
      {
        filePath: options.filePath,
        apply: options.apply,
        syncPasswordWithCode: options.syncPasswordWithCode,
        totalRows: plan.length,
        changedRows: changedItems.length,
        generatedRows: changedItems.filter(
          (item) => item.reason === 'generated',
        ).length,
        sample: changedItems.slice(0, 20).map((item) => ({
          rowNumber: item.row.rowNumber,
          studentId: item.student.id,
          document: item.student.document,
          currentCode: item.student.code,
          nextCode: item.nextCode,
          fullName: `${item.student.lastName} ${item.student.firstName}`.trim(),
          reason: item.reason,
        })),
      },
      null,
      2,
    ),
  );
}

void run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Error no controlado.';
  console.error(message);
  process.exitCode = 1;
});
