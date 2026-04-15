import { config as loadEnv } from 'dotenv';
import { readFile } from 'fs/promises';
import path from 'path';
import { DataSource, Repository } from 'typeorm';
import { StudentShift } from '../../common/enums/student-shift.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { hashPassword } from '../../common/utils/password.util';
import { StudentEnrollmentStatus } from '../../common/enums/student-enrollment-status.enum';
import { StudentEnrollment } from '../../students/entities/student-enrollment.entity';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../users/entities/user.entity';
import dataSource from '../data-source';
import { InstitutionSetting } from '../../institution/entities/institution-setting.entity';
import { INSTITUTION_SETTINGS_ID } from '../../institution/constants/institution.constants';

loadEnv({ path: '.env' });

interface InitialAdminUserInput {
  username: string;
  displayName: string;
  role: UserRole.DIRECTOR | UserRole.SECRETARY | UserRole.AUXILIARY;
  password: string;
  isActive?: boolean;
}

interface InitialStudentInput {
  code: string;
  firstName: string;
  lastName: string;
  document?: string | null;
  grade: number;
  section: string;
  shift: StudentShift;
  schoolYear: number;
  isActive?: boolean;
}

interface InstitutionSettingsInput {
  schoolName?: string;
  activeSchoolYear?: number;
  initialStudentPassword?: string;
  enabledTurns?: StudentShift[];
  enabledGrades?: number[];
  sectionsByGrade?: Record<string, string[]>;
}

function resolveEnabledGrades(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return Array.from(new Set(value.map((grade) => normalizeGrade(grade)))).sort(
    (left, right) => left - right,
  );
}

function resolveEnabledTurns(value: unknown): StudentShift[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return Array.from(new Set(value.map((shift) => normalizeShift(shift))));
}

interface InitialLoadInput {
  institutionSettings?: InstitutionSettingsInput;
  adminUsers: InitialAdminUserInput[];
  students: InitialStudentInput[];
}

interface LoadSummary {
  institutionSettingsCreated: boolean;
  institutionSettingsUpdated: boolean;
  adminUsersCreated: number;
  adminUsersUpdated: number;
  studentsCreated: number;
  studentsUpdated: number;
  enrollmentsCreated: number;
  enrollmentsUpdated: number;
}

async function run(): Promise<void> {
  const initialLoadFilePath = resolveInitialLoadFilePath();
  const initialLoadData = await readInitialLoadFile(initialLoadFilePath);
  const summary: LoadSummary = {
    institutionSettingsCreated: false,
    institutionSettingsUpdated: false,
    adminUsersCreated: 0,
    adminUsersUpdated: 0,
    studentsCreated: 0,
    studentsUpdated: 0,
    enrollmentsCreated: 0,
    enrollmentsUpdated: 0,
  };

  await initializeDataSource(dataSource);

  try {
    await dataSource.transaction(async (manager) => {
      const institutionSettingsRepository =
        manager.getRepository(InstitutionSetting);
      const usersRepository = manager.getRepository(User);
      const studentsRepository = manager.getRepository(Student);
      const studentEnrollmentsRepository =
        manager.getRepository(StudentEnrollment);

      const settingsResult = await upsertInstitutionSettings(
        institutionSettingsRepository,
        initialLoadData,
      );

      summary.institutionSettingsCreated = settingsResult === 'created';
      summary.institutionSettingsUpdated = settingsResult === 'updated';

      const institutionSettings = await institutionSettingsRepository.findOne({
        where: { id: INSTITUTION_SETTINGS_ID },
      });

      if (!institutionSettings) {
        throw new Error(
          'No se pudo preparar la configuracion institucional inicial.',
        );
      }

      for (const adminUserInput of initialLoadData.adminUsers) {
        const result = await upsertAdminUser(usersRepository, adminUserInput);

        if (result === 'created') {
          summary.adminUsersCreated += 1;
        } else {
          summary.adminUsersUpdated += 1;
        }
      }

      for (const studentInput of initialLoadData.students) {
        const result = await upsertStudent(
          usersRepository,
          studentsRepository,
          studentEnrollmentsRepository,
          studentInput,
          institutionSettings.initialStudentPasswordHash,
        );

        if (result.student === 'created') {
          summary.studentsCreated += 1;
        } else {
          summary.studentsUpdated += 1;
        }

        if (result.enrollment === 'created') {
          summary.enrollmentsCreated += 1;
        } else {
          summary.enrollmentsUpdated += 1;
        }
      }
    });

    console.log('Carga inicial completada correctamente.');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function initializeDataSource(source: DataSource): Promise<void> {
  if (!source.isInitialized) {
    await source.initialize();
  }
}

function resolveInitialLoadFilePath(): string {
  const configuredPath =
    process.env.INITIAL_LOAD_FILE?.trim() ?? 'seeds/initial-load.json';

  return path.resolve(process.cwd(), configuredPath);
}

async function readInitialLoadFile(
  initialLoadFilePath: string,
): Promise<InitialLoadInput> {
  const fileContent = await readFile(initialLoadFilePath, 'utf8');
  const parsedContent = JSON.parse(fileContent) as unknown;

  return validateInitialLoadInput(parsedContent);
}

function validateInitialLoadInput(input: unknown): InitialLoadInput {
  if (!input || typeof input !== 'object') {
    throw new Error('El archivo de carga inicial debe ser un objeto JSON.');
  }

  const inputObject = input as Record<string, unknown>;
  const adminUsers = Array.isArray(inputObject.adminUsers)
    ? inputObject.adminUsers
    : [];
  const students = Array.isArray(inputObject.students)
    ? inputObject.students
    : [];

  return {
    institutionSettings: validateInstitutionSettingsInput(
      inputObject.institutionSettings,
      students,
    ),
    adminUsers: adminUsers.map(validateAdminUserInput),
    students: students.map(validateStudentInput),
  };
}

function validateInstitutionSettingsInput(
  input: unknown,
  rawStudents: unknown[],
): InstitutionSettingsInput {
  if (!input || typeof input !== 'object') {
    return buildDefaultInstitutionSettings(rawStudents);
  }

  const item = input as Record<string, unknown>;
  const fallback = buildDefaultInstitutionSettings(rawStudents);
  const enabledTurns = resolveEnabledTurns(item.enabledTurns);
  const enabledGrades = resolveEnabledGrades(item.enabledGrades);

  return {
    schoolName:
      typeof item.schoolName === 'string' && item.schoolName.trim().length > 0
        ? item.schoolName.trim()
        : fallback.schoolName,
    activeSchoolYear:
      typeof item.activeSchoolYear === 'number'
        ? normalizeSchoolYear(item.activeSchoolYear)
        : fallback.activeSchoolYear,
    initialStudentPassword:
      typeof item.initialStudentPassword === 'string' &&
      item.initialStudentPassword.trim().length >= 8
        ? item.initialStudentPassword.trim()
        : fallback.initialStudentPassword,
    enabledTurns: enabledTurns ?? fallback.enabledTurns,
    enabledGrades: enabledGrades ?? fallback.enabledGrades,
    sectionsByGrade:
      item.sectionsByGrade && typeof item.sectionsByGrade === 'object'
        ? normalizeSectionsByGrade(
            item.sectionsByGrade as Record<string, unknown>,
            enabledGrades ?? fallback.enabledGrades ?? [1, 2, 3, 4, 5],
          )
        : fallback.sectionsByGrade,
  };
}

function buildDefaultInstitutionSettings(
  rawStudents: unknown[],
): InstitutionSettingsInput {
  const validatedStudents = rawStudents
    .map((rawStudent) => {
      try {
        return validateStudentInput(rawStudent);
      } catch {
        return null;
      }
    })
    .filter((student): student is InitialStudentInput => student !== null);

  const enabledTurns = Array.from(
    new Set(validatedStudents.map((student) => student.shift)),
  );
  const enabledGrades = Array.from(
    new Set(validatedStudents.map((student) => student.grade)),
  ).sort((left, right) => left - right);
  const activeSchoolYear =
    validatedStudents
      .map((student) => student.schoolYear)
      .sort((left, right) => right - left)[0] ?? new Date().getFullYear();

  return {
    schoolName:
      process.env.SCHOOL_NAME?.trim() ?? 'Colegio Paraiso Florido 3082',
    activeSchoolYear,
    initialStudentPassword:
      process.env.INITIAL_STUDENT_PASSWORD?.trim() ?? 'paraiso3082',
    enabledTurns:
      enabledTurns.length > 0
        ? enabledTurns
        : [StudentShift.MORNING, StudentShift.AFTERNOON],
    enabledGrades: enabledGrades.length > 0 ? enabledGrades : [1, 2, 3, 4, 5],
    sectionsByGrade: normalizeSectionsByGrade(
      Object.fromEntries(
        (enabledGrades.length > 0 ? enabledGrades : [1, 2, 3, 4, 5]).map(
          (grade) => {
            const sections = validatedStudents
              .filter((student) => student.grade === grade)
              .map((student) => student.section);

            return [String(grade), sections.length > 0 ? sections : ['A']];
          },
        ),
      ),
      enabledGrades.length > 0 ? enabledGrades : [1, 2, 3, 4, 5],
    ),
  };
}

function validateAdminUserInput(input: unknown): InitialAdminUserInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Cada usuario administrativo debe ser un objeto valido.');
  }

  const item = input as Record<string, unknown>;
  const username = normalizeUsername(item.username);
  const displayName = normalizeRequiredText(item.displayName, 'displayName');
  const role = normalizeAdminRole(item.role);
  const password = normalizeRequiredText(item.password, 'password');
  const isActive = typeof item.isActive === 'boolean' ? item.isActive : true;

  return {
    username,
    displayName,
    role,
    password,
    isActive,
  };
}

function validateStudentInput(input: unknown): InitialStudentInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Cada estudiante debe ser un objeto valido.');
  }

  const item = input as Record<string, unknown>;
  const code = normalizeUsername(item.code);
  const firstName = normalizeRequiredText(item.firstName, 'firstName');
  const lastName = normalizeRequiredText(item.lastName, 'lastName');
  const document = normalizeOptionalDocument(item.document);
  const grade = normalizeGrade(item.grade);
  const section = normalizeSection(item.section);
  const shift = normalizeShift(item.shift);
  const schoolYear = normalizeSchoolYear(item.schoolYear);
  const isActive = typeof item.isActive === 'boolean' ? item.isActive : true;

  return {
    code,
    firstName,
    lastName,
    document,
    grade,
    section,
    shift,
    schoolYear,
    isActive,
  };
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`El campo ${fieldName} es obligatorio.`);
  }

  return value.trim();
}

function normalizeUsername(value: unknown): string {
  const username = normalizeRequiredText(value, 'username/codigo');

  if (username.length > 32) {
    throw new Error('El username o codigo no puede superar 32 caracteres.');
  }

  return username.toLowerCase();
}

function normalizeOptionalDocument(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const document = normalizeRequiredText(value, 'document');

  if (document.length > 20) {
    throw new Error('El documento no puede superar 20 caracteres.');
  }

  return document;
}

function normalizeAdminRole(value: unknown): InitialAdminUserInput['role'] {
  if (
    value === UserRole.DIRECTOR ||
    value === UserRole.SECRETARY ||
    value === UserRole.AUXILIARY
  ) {
    return value;
  }

  throw new Error(
    'El rol administrativo debe ser director, secretary o auxiliary.',
  );
}

function normalizeGrade(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 5
  ) {
    throw new Error('El grado debe ser un entero entre 1 y 5.');
  }

  return value;
}

function normalizeSection(value: unknown): string {
  const section = normalizeRequiredText(value, 'section').toUpperCase();

  if (section.length > 10) {
    throw new Error('La seccion no puede superar 10 caracteres.');
  }

  return section;
}

function normalizeSectionsByGrade(
  input: Record<string, unknown>,
  enabledGrades: number[],
): Record<string, string[]> {
  const normalized: Record<string, string[]> = {};

  for (const grade of enabledGrades) {
    const rawSections = input[String(grade)];

    if (!Array.isArray(rawSections) || rawSections.length === 0) {
      throw new Error(
        `Debes definir al menos una seccion para ${grade} grado.`,
      );
    }

    const sections = Array.from(
      new Set(rawSections.map((section) => normalizeSection(section))),
    );

    normalized[String(grade)] = sections;
  }

  return normalized;
}

function normalizeShift(value: unknown): StudentShift {
  if (value === StudentShift.MORNING || value === StudentShift.AFTERNOON) {
    return value;
  }

  throw new Error('El turno debe ser morning o afternoon.');
}

function normalizeSchoolYear(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 2000 ||
    value > 2100
  ) {
    throw new Error('El anio escolar debe ser un entero valido.');
  }

  return value;
}

async function upsertInstitutionSettings(
  institutionSettingsRepository: Repository<InstitutionSetting>,
  input: InitialLoadInput,
): Promise<'created' | 'updated'> {
  const initialSettings =
    input.institutionSettings ?? buildDefaultInstitutionSettings([]);
  const existingSettings = await institutionSettingsRepository.findOne({
    where: { id: INSTITUTION_SETTINGS_ID },
  });

  const settings = existingSettings
    ? existingSettings
    : institutionSettingsRepository.create({ id: INSTITUTION_SETTINGS_ID });

  settings.schoolName =
    initialSettings.schoolName?.trim() ?? 'Colegio Paraiso Florido 3082';
  settings.activeSchoolYear =
    initialSettings.activeSchoolYear ?? new Date().getFullYear();
  const configuredEnabledTurns = initialSettings.enabledTurns ?? [
    StudentShift.MORNING,
    StudentShift.AFTERNOON,
  ];
  const configuredEnabledGrades = initialSettings.enabledGrades ?? [
    1, 2, 3, 4, 5,
  ];
  settings.enabledTurns =
    configuredEnabledTurns.length > 0
      ? [...configuredEnabledTurns]
      : [StudentShift.MORNING, StudentShift.AFTERNOON];
  settings.enabledGrades =
    configuredEnabledGrades.length > 0
      ? [...configuredEnabledGrades].sort((left, right) => left - right)
      : [1, 2, 3, 4, 5];
  settings.sectionsByGrade = normalizeSectionsByGrade(
    initialSettings.sectionsByGrade ?? {
      '1': ['A'],
      '2': ['A'],
      '3': ['A'],
      '4': ['A'],
      '5': ['A'],
    },
    settings.enabledGrades,
  );

  const explicitInitialStudentPassword =
    input.institutionSettings?.initialStudentPassword?.trim() ?? '';

  if (explicitInitialStudentPassword) {
    settings.initialStudentPasswordHash = await hashPassword(
      explicitInitialStudentPassword,
    );
    settings.initialStudentPasswordUpdatedAt = new Date();
  } else if (!settings.initialStudentPasswordHash) {
    const fallbackInitialStudentPassword =
      process.env.INITIAL_STUDENT_PASSWORD?.trim() ?? '';

    if (!fallbackInitialStudentPassword) {
      throw new Error(
        'INITIAL_STUDENT_PASSWORD es obligatorio para la carga inicial.',
      );
    }

    settings.initialStudentPasswordHash = await hashPassword(
      fallbackInitialStudentPassword,
    );
    settings.initialStudentPasswordUpdatedAt = new Date();
  }

  await institutionSettingsRepository.save(settings);
  return existingSettings ? 'updated' : 'created';
}

async function upsertAdminUser(
  usersRepository: Repository<User>,
  input: InitialAdminUserInput,
): Promise<'created' | 'updated'> {
  const existingUser = await usersRepository.findOne({
    where: { username: input.username },
  });

  if (!existingUser) {
    await usersRepository.save(
      usersRepository.create({
        username: input.username,
        displayName: input.displayName,
        role: input.role,
        passwordHash: await hashPassword(input.password),
        isActive: input.isActive ?? true,
        mustChangePassword: false,
        authVersion: 1,
      }),
    );

    return 'created';
  }

  if (existingUser.role === UserRole.STUDENT) {
    throw new Error(
      `El username ${input.username} ya existe y pertenece a un estudiante.`,
    );
  }

  existingUser.displayName = input.displayName;
  existingUser.role = input.role;
  existingUser.isActive = input.isActive ?? true;

  await usersRepository.save(existingUser);

  return 'updated';
}

async function upsertStudent(
  usersRepository: Repository<User>,
  studentsRepository: Repository<Student>,
  studentEnrollmentsRepository: Repository<StudentEnrollment>,
  input: InitialStudentInput,
  initialStudentPasswordHash: string,
): Promise<{
  student: 'created' | 'updated';
  enrollment: 'created' | 'updated';
}> {
  const displayName = `${input.lastName} ${input.firstName}`.trim();

  let user = await usersRepository.findOne({
    where: { username: input.code },
  });

  if (user && user.role !== UserRole.STUDENT) {
    throw new Error(
      `El codigo ${input.code} ya existe y esta asignado a un usuario no estudiante.`,
    );
  }

  if (!user) {
    user = usersRepository.create({
      username: input.code,
      displayName,
      role: UserRole.STUDENT,
      passwordHash: initialStudentPasswordHash,
      isActive: input.isActive ?? true,
      mustChangePassword: true,
      authVersion: 1,
    });

    user = await usersRepository.save(user);
  } else {
    user.displayName = displayName;
    user.role = UserRole.STUDENT;
    user.isActive = input.isActive ?? true;
    user = await usersRepository.save(user);
  }

  let student = await studentsRepository.findOne({
    where: [{ code: input.code }, { userId: user.id }],
  });
  const studentResult: 'created' | 'updated' = student ? 'updated' : 'created';

  if (!student) {
    student = studentsRepository.create({
      userId: user.id,
      code: input.code,
      firstName: input.firstName,
      lastName: input.lastName,
      document: input.document ?? null,
      isActive: input.isActive ?? true,
    });
  } else {
    student.userId = user.id;
    student.code = input.code;
    student.firstName = input.firstName;
    student.lastName = input.lastName;
    student.document = input.document ?? null;
    student.isActive = input.isActive ?? true;
  }

  student = await studentsRepository.save(student);

  let enrollment = await studentEnrollmentsRepository.findOne({
    where: {
      studentId: student.id,
      schoolYear: input.schoolYear,
    },
  });

  const enrollmentResult: 'created' | 'updated' = enrollment
    ? 'updated'
    : 'created';

  if (!enrollment) {
    enrollment = studentEnrollmentsRepository.create({
      studentId: student.id,
      schoolYear: input.schoolYear,
      status: StudentEnrollmentStatus.ACTIVE,
    });
  }

  enrollment.grade = input.grade;
  enrollment.section = input.section;
  enrollment.shift = input.shift;
  enrollment.status = StudentEnrollmentStatus.ACTIVE;
  enrollment.isActive = input.isActive ?? true;

  await studentEnrollmentsRepository.save(enrollment);

  return {
    student: studentResult,
    enrollment: enrollmentResult,
  };
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('La carga inicial fallo.');
  console.error(message);
  process.exitCode = 1;
});
