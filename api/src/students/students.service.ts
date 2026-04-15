import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  Brackets,
  DataSource,
  EntityManager,
  In,
  Repository,
} from 'typeorm';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import { AttendanceService } from '../attendance/attendance.service';
import { AttendanceDayStatus } from '../attendance/entities/attendance-day-status.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { AttendanceDayStatusType } from '../common/enums/attendance-day-status-type.enum';
import { AttendanceMarkType } from '../common/enums/attendance-mark-type.enum';
import { AttendanceRecordStatus } from '../common/enums/attendance-record-status.enum';
import { StudentEnrollmentMovement } from '../common/enums/student-enrollment-movement.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { StudentChangeType } from '../common/enums/student-change-type.enum';
import { StudentEnrollmentStatus } from '../common/enums/student-enrollment-status.enum';
import { StudentFollowUpCategory } from '../common/enums/student-follow-up-category.enum';
import { StudentFollowUpRecordType } from '../common/enums/student-follow-up-record-type.enum';
import { StudentShift } from '../common/enums/student-shift.enum';
import { hashPassword } from '../common/utils/password.util';
import { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { INSTITUTION_SETTINGS_ID } from '../institution/constants/institution.constants';
import { InstitutionSetting } from '../institution/entities/institution-setting.entity';
import { InstitutionService } from '../institution/institution.service';
import { TutorAssignment } from '../users/entities/tutor-assignment.entity';
import { User } from '../users/entities/user.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import {
  QueryStudentExportDto,
  StudentExportFormat,
} from './dto/query-student-export.dto';
import { QueryStudentFollowUpsOverviewDto } from './dto/query-student-follow-ups-overview.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import {
  ImportStudentsDto,
  StudentImportPreviewResponseDto,
  StudentImportPreviewRowDto,
  StudentImportResultResponseDto,
} from './dto/student-import.dto';
import {
  CreateStudentFollowUpDto,
  UpdateStudentFollowUpDto,
} from './dto/student-follow-up.dto';
import {
  CreateStudentContactDto,
  StudentContactResponseDto,
  UpdateStudentContactDto,
} from './dto/student-contact.dto';
import {
  StudentConsentResponseDto,
  StudentChangeLogResponseDto,
  StudentDetailResponseDto,
  StudentFollowUpOverviewItemResponseDto,
  StudentFollowUpOverviewResponseDto,
  StudentFollowUpResponseDto,
  StudentRecentAttendanceItemDto,
  StudentRecentAttendanceSummaryDto,
  StudentResponseDto,
  StudentSituationResponseDto,
  StudentTodayAttendanceStatusDto,
} from './dto/student-response.dto';
import { UpdateStudentConsentDto } from './dto/update-student-consent.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateStudentSituationDto } from './dto/update-student-situation.dto';
import { StudentChangeLog } from './entities/student-change-log.entity';
import { StudentContact } from './entities/student-contact.entity';
import { StudentEnrollment } from './entities/student-enrollment.entity';
import { StudentFollowUp } from './entities/student-follow-up.entity';
import { Student } from './entities/student.entity';
import {
  extractGeneratedStudentSequence,
  formatGeneratedStudentCode,
  GENERATED_STUDENT_CODE_MAX_SEQUENCE,
  isSupportedStudentCode,
} from './student-code.util';

type StudentImportRawRow = {
  rowNumber: number;
  code: string | null;
  firstName: string;
  lastName: string;
  document: string | null;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
  isActive: boolean;
};

type StudentImportValidationSummary =
  StudentImportPreviewResponseDto['summary'];

type StudentImportValidationResult = {
  schoolYear: number;
  rows: StudentImportPreviewRowDto[];
  summary: StudentImportValidationSummary;
  validRows: Array<StudentImportRawRow & { code: string | null }>;
};

type StudentImportSession = {
  token: string;
  createdByUserId: string;
  schoolYear: number;
  fileName: string;
  sheetName: string;
  rows: StudentImportPreviewRowDto[];
  summary: StudentImportValidationSummary;
  validRows: Array<StudentImportRawRow & { code: string | null }>;
  expiresAt: number;
};

type StudentExportFile = {
  fileName: string;
  contentType: string;
  buffer: Buffer;
};

type StudentExportRow = {
  'Username (codigo opcional al importar)': string;
  Nombres: string;
  Apellidos: string;
  Documento: string;
  Grado: number | '';
  Seccion: string;
  Turno: string;
  Estado: string;
};

const STUDENT_IMPORT_REQUIRED_HEADERS = [
  'nombres',
  'apellidos',
  'grado',
  'seccion',
  'turno',
] as const;

const STUDENT_EXPORT_HEADERS = [
  'Username (codigo opcional al importar)',
  'Nombres',
  'Apellidos',
  'Documento',
  'Grado',
  'Seccion',
  'Turno',
  'Estado',
] as const satisfies ReadonlyArray<keyof StudentExportRow>;

const STUDENT_IMPORT_TOKEN_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);
  private hasStudentContactsTable = false;
  private hasLoggedMissingContactsTable = false;
  private readonly studentImportSessions = new Map<
    string,
    StudentImportSession
  >();

  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRecordsRepository: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceDayStatus)
    private readonly attendanceDayStatusesRepository: Repository<AttendanceDayStatus>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(StudentContact)
    private readonly studentContactsRepository: Repository<StudentContact>,
    @InjectRepository(StudentEnrollment)
    private readonly studentEnrollmentsRepository: Repository<StudentEnrollment>,
    @InjectRepository(StudentFollowUp)
    private readonly studentFollowUpsRepository: Repository<StudentFollowUp>,
    @InjectRepository(TutorAssignment)
    private readonly tutorAssignmentsRepository: Repository<TutorAssignment>,
    private readonly attendanceService: AttendanceService,
    private readonly institutionService: InstitutionService,
    private readonly dataSource: DataSource,
  ) {}

  async createStudent(
    dto: CreateStudentDto,
    createdBy: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    const schoolYear =
      dto.schoolYear ?? (await this.institutionService.getActiveSchoolYear());
    const institutionSettings = await this.institutionService.getSettings();

    if (!institutionSettings.enabledGrades.includes(dto.grade)) {
      throw new BadRequestException(
        'El grado seleccionado no esta habilitado en la configuracion institucional.',
      );
    }

    if (!institutionSettings.enabledTurns.includes(dto.shift)) {
      throw new BadRequestException(
        'El turno seleccionado no esta habilitado en la configuracion institucional.',
      );
    }

    const availableSections =
      institutionSettings.sectionsByGrade[String(dto.grade)] ?? [];

    if (!availableSections.includes(dto.section)) {
      throw new BadRequestException(
        'La seccion seleccionada no esta habilitada para el grado indicado.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const studentsRepository = manager.getRepository(Student);
      const usersRepository = manager.getRepository(User);
      const enrollmentsRepository = manager.getRepository(StudentEnrollment);
      const changeLogsRepository = manager.getRepository(StudentChangeLog);

      await this.ensureDocumentIsUnique(dto.document ?? null, null, manager);
      const [generatedCode] = await this.allocateStudentCodes(
        manager,
        schoolYear,
        1,
      );

      const initialPasswordHash =
        await this.institutionService.getInitialStudentPasswordHash();
      const displayName =
        `${dto.lastName.trim()} ${dto.firstName.trim()}`.trim();
      const user = usersRepository.create({
        username: generatedCode,
        displayName,
        role: UserRole.STUDENT,
        passwordHash:
          initialPasswordHash || (await hashPassword(generatedCode)),
        isActive: dto.isActive,
        mustChangePassword: true,
        authVersion: 1,
      });

      const savedUser = await usersRepository.save(user);
      const student = studentsRepository.create({
        userId: savedUser.id,
        code: generatedCode,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        document: dto.document?.trim() || null,
        isActive: dto.isActive,
      });
      const savedStudent = await studentsRepository.save(student);
      const enrollment = enrollmentsRepository.create({
        studentId: savedStudent.id,
        schoolYear,
        grade: dto.grade,
        section: dto.section.trim().toUpperCase(),
        shift: dto.shift,
        status: StudentEnrollmentStatus.ACTIVE,
        movementType: StudentEnrollmentMovement.NEW_ADMISSION,
        administrativeDetail: null,
        statusChangedAt: new Date(),
        statusChangedByUserId: createdBy.id,
        isActive: dto.isActive,
      });

      await enrollmentsRepository.save(enrollment);
      await changeLogsRepository.save(
        changeLogsRepository.create({
          studentId: savedStudent.id,
          changedByUserId: createdBy.id,
          schoolYear,
          changeType: StudentChangeType.STUDENT_CREATED,
          previousData: null,
          nextData: {
            code: savedStudent.code,
            firstName: savedStudent.firstName,
            lastName: savedStudent.lastName,
            document: savedStudent.document,
            isActive: savedStudent.isActive,
            schoolYear,
            grade: enrollment.grade,
            section: enrollment.section,
            shift: enrollment.shift,
            status: enrollment.status,
            movementType: enrollment.movementType,
          },
        }),
      );

      const refreshedStudent = await studentsRepository.findOne({
        where: { id: savedStudent.id },
        ...(await this.buildInstitutionalProfileQueryOptions()),
      });

      if (!refreshedStudent) {
        throw new NotFoundException('Estudiante no encontrado.');
      }

      const currentEnrollment = await this.resolveStudentEnrollment(
        refreshedStudent,
        schoolYear,
      );

      return this.toStudentDetailResponse(refreshedStudent, currentEnrollment, {
        viewerRole: createdBy.role,
      });
    });
  }

  async previewStudentsImport(
    file: { buffer: Buffer; originalname: string } | undefined,
    authUser: AuthenticatedRequestUser,
  ): Promise<StudentImportPreviewResponseDto> {
    if (!file?.buffer || !file.originalname) {
      throw new BadRequestException(
        'Adjunta un archivo Excel antes de continuar con la validacion previa.',
      );
    }

    const schoolYear = await this.institutionService.getActiveSchoolYear();
    const institutionSettings = await this.institutionService.getSettings();
    const workbook = this.readStudentImportWorkbook(file);
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new BadRequestException(
        'El archivo no contiene hojas con informacion para importar.',
      );
    }

    const firstSheet = workbook.Sheets[firstSheetName];
    const rows = this.parseStudentImportWorksheet(firstSheet);
    const validation = await this.validateStudentImportRows(
      rows,
      schoolYear,
      institutionSettings,
    );
    const session = this.storeStudentImportSession({
      createdByUserId: authUser.id,
      schoolYear,
      fileName: file.originalname,
      sheetName: firstSheetName,
      rows: validation.rows,
      summary: validation.summary,
      validRows: validation.validRows,
    });

    return {
      fileName: file.originalname,
      sheetName: firstSheetName,
      schoolYear,
      importToken: session.token,
      expiresAt: new Date(session.expiresAt).toISOString(),
      rows: validation.rows,
      summary: validation.summary,
    };
  }

  async importStudents(
    dto: ImportStudentsDto,
    createdBy: AuthenticatedRequestUser,
  ): Promise<StudentImportResultResponseDto> {
    const previewSession = this.consumeStudentImportSession(
      dto.importToken,
      createdBy.id,
    );
    const schoolYear = previewSession.schoolYear;
    const validation: StudentImportValidationResult = {
      schoolYear,
      rows: previewSession.rows,
      summary: previewSession.summary,
      validRows: previewSession.validRows,
    };
    const rawRows = previewSession.rows.map((row) => ({
      rowNumber: row.rowNumber,
      code: row.code,
      firstName: row.firstName,
      lastName: row.lastName,
      document: row.document,
      grade: row.grade,
      section: row.section,
      shift: row.shift,
      isActive: row.isActive,
    }));

    if (validation.validRows.length === 0) {
      return {
        schoolYear,
        summary: {
          receivedRows: rawRows.length,
          importedRows: 0,
          skippedRows: rawRows.length,
          generatedCodes: 0,
        },
        imported: [],
        skipped: validation.rows.map((row) => ({
          rowNumber: row.rowNumber,
          fullName:
            `${row.lastName} ${row.firstName}`.trim() || 'Fila sin nombre',
          reason:
            row.issues.map((issue) => issue.message).join(' ') ||
            'La fila no supero la validacion.',
        })),
      };
    }

    return this.dataSource.transaction(async (manager) => {
      const generatedCodes = await this.allocateStudentCodes(
        manager,
        schoolYear,
        validation.validRows.filter((row) => !row.code).length,
        validation.validRows
          .map((row) => row.code)
          .filter((row): row is string => Boolean(row)),
      );
      const initialPasswordHash =
        await this.institutionService.getInitialStudentPasswordHash();
      const imported: StudentImportResultResponseDto['imported'] = [];
      const skipped: StudentImportResultResponseDto['skipped'] = [];
      let generatedCodeIndex = 0;

      for (const row of validation.validRows) {
        const resolvedCode = row.code ?? generatedCodes[generatedCodeIndex++];

        try {
          const createdStudent = await this.createStudentFromImportRow(
            manager,
            row,
            resolvedCode,
            schoolYear,
            initialPasswordHash,
            createdBy,
          );

          imported.push({
            rowNumber: row.rowNumber,
            studentId: createdStudent.id,
            code: createdStudent.code,
            fullName:
              `${createdStudent.lastName} ${createdStudent.firstName}`.trim(),
          });
        } catch (error) {
          const reason =
            error instanceof Error
              ? error.message
              : 'La fila no pudo importarse por una validacion de ultimo momento.';

          skipped.push({
            rowNumber: row.rowNumber,
            fullName: `${row.lastName} ${row.firstName}`.trim(),
            reason,
          });
        }
      }

      const invalidRows = validation.rows.filter((row) => !row.isValid);

      skipped.push(
        ...invalidRows.map((row) => ({
          rowNumber: row.rowNumber,
          fullName:
            `${row.lastName} ${row.firstName}`.trim() || 'Fila sin nombre',
          reason:
            row.issues.map((issue) => issue.message).join(' ') ||
            'La fila no supero la validacion.',
        })),
      );

      return {
        schoolYear,
        summary: {
          receivedRows: rawRows.length,
          importedRows: imported.length,
          skippedRows: skipped.length,
          generatedCodes: generatedCodes.length,
        },
        imported,
        skipped,
      };
    });
  }

  async exportStudents(
    query: QueryStudentExportDto,
  ): Promise<StudentExportFile> {
    const schoolYear =
      query.schoolYear ?? (await this.institutionService.getActiveSchoolYear());
    const institutionSettings = await this.institutionService.getSettings();

    if (
      typeof query.grade === 'number' &&
      !institutionSettings.enabledGrades.includes(query.grade)
    ) {
      throw new BadRequestException(
        'El grado solicitado no esta habilitado en la configuracion institucional.',
      );
    }

    if (query.section && typeof query.grade === 'number') {
      const availableSections =
        institutionSettings.sectionsByGrade[String(query.grade)] ?? [];

      if (!availableSections.includes(query.section)) {
        throw new BadRequestException(
          'La seccion solicitada no esta habilitada para el grado indicado.',
        );
      }
    }

    const queryBuilder = this.studentEnrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.student', 'student')
      .where('enrollment.schoolYear = :schoolYear', { schoolYear })
      .andWhere('enrollment.status = :status', {
        status: StudentEnrollmentStatus.ACTIVE,
      });

    if (typeof query.grade === 'number') {
      queryBuilder.andWhere('enrollment.grade = :grade', {
        grade: query.grade,
      });
    }

    if (query.section) {
      queryBuilder.andWhere('enrollment.section = :section', {
        section: query.section,
      });
    }

    const enrollments = await queryBuilder
      .orderBy('enrollment.grade', 'ASC')
      .addOrderBy('enrollment.section', 'ASC')
      .addOrderBy('student.lastName', 'ASC')
      .addOrderBy('student.firstName', 'ASC')
      .getMany();

    const rows = enrollments.map((enrollment) =>
      this.toStudentExportRow(enrollment.student, enrollment),
    );

    return this.buildStudentExportFile(query.format, rows, {
      schoolYear,
      grade: query.grade,
      section: query.section,
    });
  }

  async listStudents(query: QueryStudentsDto): Promise<{
    items: StudentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const schoolYear =
      query.schoolYear ?? (await this.institutionService.getActiveSchoolYear());
    const normalizedSearch = query.search?.trim();
    const normalizedSection = query.section?.trim().toUpperCase();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const queryBuilder = this.studentEnrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.student', 'student')
      .where('enrollment.schoolYear = :schoolYear', { schoolYear })
      .andWhere('enrollment.status = :status', {
        status: StudentEnrollmentStatus.ACTIVE,
      });

    if (query.grade !== undefined) {
      queryBuilder.andWhere('enrollment.grade = :grade', {
        grade: query.grade,
      });
    }

    if (normalizedSection) {
      queryBuilder.andWhere('enrollment.section = :section', {
        section: normalizedSection,
      });
    }

    if (query.shift) {
      queryBuilder.andWhere('enrollment.shift = :shift', {
        shift: query.shift,
      });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('student.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    if (normalizedSearch) {
      queryBuilder.andWhere(
        `
          (
            student.code ILIKE :search
            OR student.first_name ILIKE :search
            OR student.last_name ILIKE :search
            OR COALESCE(student.document, '') ILIKE :search
          )
        `,
        { search: `%${normalizedSearch}%` },
      );
    }

    const [enrollments, total] = await queryBuilder
      .orderBy('student.lastName', 'ASC')
      .addOrderBy('student.firstName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: enrollments.map((enrollment) =>
        this.toStudentResponse(enrollment.student, enrollment),
      ),
      total,
      page,
      limit,
    };
  }

  async findByCode(code: string): Promise<StudentResponseDto> {
    const normalizedCode = code.trim().toLowerCase();
    const student = await this.studentsRepository.findOne({
      where: { code: normalizedCode },
      relations: ['enrollments', 'user'],
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado.');
    }

    const enrollment = await this.resolveStudentEnrollment(student);
    return this.toStudentResponse(student, enrollment);
  }

  async getStudentProfile(
    authUser: AuthenticatedRequestUser,
  ): Promise<StudentResponseDto> {
    if (authUser.role !== UserRole.STUDENT) {
      throw new NotFoundException('Perfil de estudiante no encontrado.');
    }

    const student = await this.studentsRepository.findOne({
      where: { userId: authUser.id },
      relations: ['enrollments', 'user'],
    });

    if (!student) {
      throw new NotFoundException('Perfil de estudiante no encontrado.');
    }

    const enrollment = await this.resolveStudentEnrollment(student);
    return this.toStudentResponse(student, enrollment);
  }

  async getMyInstitutionalProfile(
    authUser: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    if (authUser.role !== UserRole.STUDENT) {
      throw new NotFoundException('Perfil de estudiante no encontrado.');
    }

    const student = await this.studentsRepository.findOne({
      where: { userId: authUser.id },
      ...(await this.buildInstitutionalProfileQueryOptions()),
    });

    if (!student) {
      throw new NotFoundException('Perfil de estudiante no encontrado.');
    }

    const enrollment = await this.resolveStudentEnrollment(student);
    return this.toStudentDetailResponse(student, enrollment, {
      viewerRole: authUser.role,
      includeChangeLogs: false,
    });
  }

  async getStudentInstitutionalProfile(
    id: string,
    authUser: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    const student = await this.studentsRepository.findOne({
      where: { id },
      ...(await this.buildInstitutionalProfileQueryOptions()),
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado.');
    }

    const enrollment = await this.resolveStudentEnrollment(student);
    await this.ensureViewerCanAccessStudent(enrollment, authUser);
    return this.toStudentDetailResponse(student, enrollment, {
      viewerRole: authUser.role,
      includeChangeLogs:
        authUser.role !== UserRole.AUXILIARY &&
        authUser.role !== UserRole.TUTOR,
    });
  }

  async getStudentDetail(
    id: string,
    authUser?: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    return this.getStudentInstitutionalProfile(
      id,
      authUser ?? {
        id: '',
        username: '',
        displayName: '',
        role: UserRole.DIRECTOR,
        mustChangePassword: false,
        authVersion: 1,
        isActive: true,
      },
    );
  }

  async getStudentContacts(
    id: string,
    authUser: AuthenticatedRequestUser,
  ): Promise<StudentContactResponseDto[]> {
    await this.ensureStudentContactsStorageAvailable();

    const student = await this.studentsRepository.findOne({
      where: { id },
      relations: ['enrollments'],
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado.');
    }

    const enrollment = await this.resolveStudentEnrollment(student);
    await this.ensureViewerCanAccessStudent(enrollment, authUser);

    const contacts = await this.studentContactsRepository.find({
      where: { studentId: id, isActive: true },
      order: {
        isPrimary: 'DESC',
        isEmergencyContact: 'DESC',
        createdAt: 'ASC',
      },
    });

    return this.mapStudentContacts(contacts, authUser.role);
  }

  async updateStudent(
    id: string,
    dto: UpdateStudentDto,
    changedBy: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    const schoolYear =
      dto.schoolYear ?? (await this.institutionService.getActiveSchoolYear());
    const institutionSettings = await this.institutionService.getSettings();

    if (!institutionSettings.enabledGrades.includes(dto.grade)) {
      throw new BadRequestException(
        'El grado seleccionado no esta habilitado en la configuracion institucional.',
      );
    }

    if (!institutionSettings.enabledTurns.includes(dto.shift)) {
      throw new BadRequestException(
        'El turno seleccionado no esta habilitado en la configuracion institucional.',
      );
    }

    const availableSections =
      institutionSettings.sectionsByGrade[String(dto.grade)] ?? [];

    if (!availableSections.includes(dto.section)) {
      throw new BadRequestException(
        'La seccion seleccionada no esta habilitada para el grado indicado.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const studentsRepository = manager.getRepository(Student);
      const usersRepository = manager.getRepository(User);
      const enrollmentsRepository = manager.getRepository(StudentEnrollment);
      const changeLogsRepository = manager.getRepository(StudentChangeLog);

      const student = await studentsRepository.findOne({
        where: { id },
        relations: ['enrollments', 'user'],
      });

      if (!student) {
        throw new NotFoundException('Estudiante no encontrado.');
      }

      await this.ensureDocumentIsUnique(
        dto.document ?? null,
        student.id,
        manager,
      );

      const enrollment =
        student.enrollments.find(
          (currentEnrollment) => currentEnrollment.schoolYear === schoolYear,
        ) ??
        enrollmentsRepository.create({
          studentId: student.id,
          schoolYear,
          status: StudentEnrollmentStatus.ACTIVE,
          movementType: StudentEnrollmentMovement.CONTINUITY,
          administrativeDetail: null,
          statusChangedAt: new Date(),
          statusChangedByUserId: changedBy.id,
        });

      const previousProfile = {
        firstName: student.firstName,
        lastName: student.lastName,
        document: student.document,
      };
      const previousStatus = {
        isActive: student.isActive,
        userIsActive: student.user.isActive,
        enrollmentIsActive: enrollment.isActive ?? true,
      };
      const previousEnrollment = {
        schoolYear,
        grade: enrollment.grade ?? null,
        section: enrollment.section ?? null,
        shift: enrollment.shift ?? null,
        status: enrollment.status ?? StudentEnrollmentStatus.ACTIVE,
        movementType:
          enrollment.movementType ?? StudentEnrollmentMovement.CONTINUITY,
        administrativeDetail: enrollment.administrativeDetail ?? null,
        statusChangedAt: enrollment.statusChangedAt?.toISOString() ?? null,
        statusChangedByUserId: enrollment.statusChangedByUserId ?? null,
        isActive: enrollment.isActive ?? true,
      };

      const normalizedDocument = dto.document?.trim() || null;

      student.firstName = dto.firstName.trim();
      student.lastName = dto.lastName.trim();
      student.document = normalizedDocument;
      student.isActive = dto.isActive;
      student.user.displayName =
        `${student.lastName} ${student.firstName}`.trim();
      student.user.isActive = dto.isActive;

      enrollment.studentId = student.id;
      enrollment.schoolYear = schoolYear;
      enrollment.grade = dto.grade;
      enrollment.section = dto.section.trim().toUpperCase();
      enrollment.shift = dto.shift;
      enrollment.status = enrollment.status ?? StudentEnrollmentStatus.ACTIVE;
      enrollment.movementType =
        enrollment.movementType ?? StudentEnrollmentMovement.CONTINUITY;
      enrollment.isActive = dto.isActive;

      await usersRepository.save(student.user);
      await studentsRepository.save(student);
      await enrollmentsRepository.save(enrollment);

      const nextProfile = {
        firstName: student.firstName,
        lastName: student.lastName,
        document: student.document,
      };
      const nextStatus = {
        isActive: student.isActive,
        userIsActive: student.user.isActive,
        enrollmentIsActive: enrollment.isActive,
      };
      const nextEnrollment = {
        schoolYear,
        grade: enrollment.grade,
        section: enrollment.section,
        shift: enrollment.shift,
        status: enrollment.status,
        movementType: enrollment.movementType,
        administrativeDetail: enrollment.administrativeDetail,
        statusChangedAt: enrollment.statusChangedAt?.toISOString() ?? null,
        statusChangedByUserId: enrollment.statusChangedByUserId,
        isActive: enrollment.isActive,
      };

      const changeLogs: StudentChangeLog[] = [];

      if (JSON.stringify(previousProfile) !== JSON.stringify(nextProfile)) {
        changeLogs.push(
          changeLogsRepository.create({
            studentId: student.id,
            changedByUserId: changedBy.id,
            schoolYear,
            changeType: StudentChangeType.PROFILE_UPDATED,
            previousData: previousProfile,
            nextData: nextProfile,
          }),
        );
      }

      if (
        JSON.stringify(previousEnrollment) !== JSON.stringify(nextEnrollment)
      ) {
        changeLogs.push(
          changeLogsRepository.create({
            studentId: student.id,
            changedByUserId: changedBy.id,
            schoolYear,
            changeType: StudentChangeType.ENROLLMENT_UPDATED,
            previousData: previousEnrollment,
            nextData: nextEnrollment,
          }),
        );
      }

      if (JSON.stringify(previousStatus) !== JSON.stringify(nextStatus)) {
        changeLogs.push(
          changeLogsRepository.create({
            studentId: student.id,
            changedByUserId: changedBy.id,
            schoolYear,
            changeType: StudentChangeType.STATUS_UPDATED,
            previousData: previousStatus,
            nextData: nextStatus,
          }),
        );
      }

      if (changeLogs.length > 0) {
        await changeLogsRepository.save(changeLogs);
      }

      const refreshedStudent = await studentsRepository.findOne({
        where: { id: student.id },
        ...(await this.buildInstitutionalProfileQueryOptions()),
      });

      if (!refreshedStudent) {
        throw new NotFoundException('Estudiante no encontrado.');
      }

      const currentEnrollment = await this.resolveStudentEnrollment(
        refreshedStudent,
        schoolYear,
      );

      return this.toStudentDetailResponse(refreshedStudent, currentEnrollment, {
        viewerRole: changedBy.role,
      });
    });
  }

  async updateStudentSituation(
    studentId: string,
    dto: UpdateStudentSituationDto,
    changedBy: AuthenticatedRequestUser,
  ): Promise<StudentDetailResponseDto> {
    const schoolYear =
      dto.schoolYear ?? (await this.institutionService.getActiveSchoolYear());

    return this.dataSource.transaction(async (manager) => {
      const student = await this.findStudentOrFail(studentId, manager);
      const enrollmentsRepository = manager.getRepository(StudentEnrollment);
      const changeLogsRepository = manager.getRepository(StudentChangeLog);
      const enrollment = student.enrollments.find(
        (currentEnrollment) => currentEnrollment.schoolYear === schoolYear,
      );

      if (!enrollment) {
        throw new BadRequestException(
          'Primero debes registrar la asignacion anual del estudiante antes de actualizar su situacion.',
        );
      }

      const previousData = this.toStudentSituationLogData(enrollment);
      enrollment.status = dto.status;
      enrollment.movementType = dto.movementType;
      enrollment.administrativeDetail = dto.administrativeDetail ?? null;
      enrollment.statusChangedAt = new Date();
      enrollment.statusChangedByUserId = changedBy.id;
      enrollment.isActive = [
        StudentEnrollmentStatus.ACTIVE,
        StudentEnrollmentStatus.OBSERVED,
      ].includes(dto.status);

      await enrollmentsRepository.save(enrollment);

      await changeLogsRepository.save(
        changeLogsRepository.create({
          studentId: student.id,
          changedByUserId: changedBy.id,
          schoolYear,
          changeType: StudentChangeType.STATUS_UPDATED,
          previousData,
          nextData: this.toStudentSituationLogData(enrollment),
        }),
      );

      const refreshedStudent = await manager.getRepository(Student).findOne({
        where: { id: student.id },
        ...(await this.buildInstitutionalProfileQueryOptions()),
      });

      if (!refreshedStudent) {
        throw new NotFoundException('Estudiante no encontrado.');
      }

      const currentEnrollment = await this.resolveStudentEnrollment(
        refreshedStudent,
        schoolYear,
      );

      return this.toStudentDetailResponse(refreshedStudent, currentEnrollment, {
        viewerRole: changedBy.role,
      });
    });
  }

  async updateStudentConsent(
    studentId: string,
    dto: UpdateStudentConsentDto,
    changedBy: AuthenticatedRequestUser,
  ): Promise<StudentConsentResponseDto | null> {
    return this.dataSource.transaction(async (manager) => {
      const student = await this.findStudentOrFail(studentId, manager);
      const changeLogsRepository = manager.getRepository(StudentChangeLog);
      const schoolYear =
        (await this.resolveStudentEnrollment(student))?.schoolYear ?? null;
      const previousData = this.toStudentConsentLogData(student);

      student.imageConsentGranted = dto.imageConsentGranted;
      student.imageConsentRecordedAt = new Date();
      student.imageConsentRecordedByUserId = changedBy.id;
      student.imageConsentObservation = dto.observation ?? null;

      await manager.getRepository(Student).save(student);
      await changeLogsRepository.save(
        changeLogsRepository.create({
          studentId,
          changedByUserId: changedBy.id,
          schoolYear,
          changeType: StudentChangeType.CONSENT_UPDATED,
          previousData,
          nextData: this.toStudentConsentLogData(student),
        }),
      );

      const refreshedStudent = await manager.getRepository(Student).findOne({
        where: { id: student.id },
        relations: ['imageConsentRecordedByUser'],
      });

      if (!refreshedStudent) {
        throw new NotFoundException('Estudiante no encontrado.');
      }

      return this.toStudentConsentResponse(refreshedStudent, changedBy.role);
    });
  }

  async getStudentFollowUps(
    studentId: string,
    authUser: AuthenticatedRequestUser,
  ): Promise<StudentFollowUpResponseDto[]> {
    const student = await this.studentsRepository.findOne({
      where: { id: studentId },
      relations: ['enrollments'],
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado.');
    }

    const enrollment = await this.resolveStudentEnrollment(student);
    await this.ensureViewerCanAccessStudent(enrollment, authUser);

    const followUps = await this.studentFollowUpsRepository.find({
      where: { studentId },
      relations: ['authorUser'],
      order: {
        recordedAt: 'DESC',
        createdAt: 'DESC',
      },
    });

    return followUps.map((followUp) =>
      this.toStudentFollowUpResponse(followUp),
    );
  }

  async getStudentFollowUpsOverview(
    query: QueryStudentFollowUpsOverviewDto,
    authUser: AuthenticatedRequestUser,
  ): Promise<StudentFollowUpOverviewResponseDto> {
    if (
      ![UserRole.DIRECTOR, UserRole.SECRETARY, UserRole.TUTOR].includes(
        authUser.role,
      )
    ) {
      throw new ForbiddenException(
        'No tienes permisos para consultar el seguimiento institucional.',
      );
    }

    const schoolYear =
      query.schoolYear ?? (await this.institutionService.getActiveSchoolYear());
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const normalizedSearch = query.search?.trim().toLowerCase();

    const queryBuilder = this.studentFollowUpsRepository
      .createQueryBuilder('followUp')
      .innerJoinAndSelect('followUp.authorUser', 'authorUser')
      .innerJoinAndSelect('followUp.student', 'student')
      .innerJoin(
        StudentEnrollment,
        'enrollment',
        'enrollment.student_id = followUp.student_id AND enrollment.school_year = :schoolYear',
        { schoolYear },
      );

    if (authUser.role === UserRole.TUTOR) {
      queryBuilder.innerJoin(
        TutorAssignment,
        'assignment',
        [
          'assignment.tutorUserId = :tutorUserId',
          'assignment.schoolYear = enrollment.schoolYear',
          'assignment.grade = enrollment.grade',
          'assignment.section = enrollment.section',
          'assignment.shift = enrollment.shift',
        ].join(' AND '),
        { tutorUserId: authUser.id },
      );
    }

    if (query.recordType) {
      queryBuilder.andWhere('followUp.record_type = :recordType', {
        recordType: query.recordType,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('followUp.status = :status', {
        status: query.status,
      });
    }

    if (typeof query.grade === 'number') {
      queryBuilder.andWhere('enrollment.grade = :grade', {
        grade: query.grade,
      });
    }

    if (query.section) {
      queryBuilder.andWhere('enrollment.section = :section', {
        section: query.section,
      });
    }

    if (query.shift) {
      queryBuilder.andWhere('enrollment.shift = :shift', {
        shift: query.shift,
      });
    }

    if (normalizedSearch) {
      queryBuilder.andWhere(
        new Brackets((searchQuery) => {
          searchQuery
            .where('LOWER(student.code) LIKE :search', {
              search: `%${normalizedSearch}%`,
            })
            .orWhere('LOWER(student.first_name) LIKE :search', {
              search: `%${normalizedSearch}%`,
            })
            .orWhere('LOWER(student.last_name) LIKE :search', {
              search: `%${normalizedSearch}%`,
            })
            .orWhere(
              "LOWER(CONCAT(student.last_name, ' ', student.first_name)) LIKE :search",
              {
                search: `%${normalizedSearch}%`,
              },
            )
            .orWhere("LOWER(COALESCE(followUp.note, '')) LIKE :search", {
              search: `%${normalizedSearch}%`,
            })
            .orWhere(
              "LOWER(COALESCE(followUp.incidentType, '')) LIKE :search",
              {
                search: `%${normalizedSearch}%`,
              },
            );
        }),
      );
    }

    const [followUps, total] = await queryBuilder
      .orderBy('followUp.recordedAt', 'DESC')
      .addOrderBy('followUp.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const studentIds = [
      ...new Set(followUps.map((followUp) => followUp.studentId)),
    ];
    const enrollments = studentIds.length
      ? await this.studentEnrollmentsRepository.find({
          where: {
            schoolYear,
            studentId: In(studentIds),
          },
        })
      : [];
    const enrollmentMap = new Map(
      enrollments.map(
        (enrollment) => [enrollment.studentId, enrollment] as const,
      ),
    );

    return {
      items: followUps.map((followUp) =>
        this.toStudentFollowUpOverviewResponse(
          followUp,
          enrollmentMap.get(followUp.studentId) ?? null,
          schoolYear,
        ),
      ),
      total,
      page,
      limit,
    };
  }

  async createStudentFollowUp(
    studentId: string,
    dto: CreateStudentFollowUpDto,
    authUser: AuthenticatedRequestUser,
  ): Promise<StudentFollowUpResponseDto[]> {
    return this.dataSource.transaction(async (manager) => {
      const student = await this.findStudentOrFail(studentId, manager);
      const enrollment = await this.resolveStudentEnrollment(student);
      await this.ensureViewerCanAccessStudent(enrollment, authUser);
      this.validateStudentFollowUpPayload(
        dto.recordType,
        dto.category,
        dto.incidentType,
      );

      const followUp = manager.getRepository(StudentFollowUp).create({
        studentId,
        authorUserId: authUser.id,
        recordType: dto.recordType,
        category: dto.category ?? null,
        incidentType: dto.incidentType ?? null,
        recordedAt: dto.recordedAt.slice(0, 10),
        note: dto.note.trim(),
        actionsTaken: dto.actionsTaken ?? null,
        status: dto.status,
        externalReference: dto.externalReference ?? null,
      });

      await manager.getRepository(StudentFollowUp).save(followUp);
      return this.getStudentFollowUpsFromManager(studentId, manager);
    });
  }

  async updateStudentFollowUp(
    studentId: string,
    followUpId: string,
    dto: UpdateStudentFollowUpDto,
    authUser: AuthenticatedRequestUser,
  ): Promise<StudentFollowUpResponseDto[]> {
    return this.dataSource.transaction(async (manager) => {
      const student = await this.findStudentOrFail(studentId, manager);
      const enrollment = await this.resolveStudentEnrollment(student);
      await this.ensureViewerCanAccessStudent(enrollment, authUser);

      const followUp = await manager.getRepository(StudentFollowUp).findOne({
        where: { id: followUpId, studentId },
        relations: ['authorUser'],
      });

      if (!followUp) {
        throw new NotFoundException('Seguimiento no encontrado.');
      }

      if (
        authUser.role === UserRole.TUTOR &&
        followUp.authorUserId !== authUser.id
      ) {
        throw new NotFoundException('Seguimiento no encontrado.');
      }

      const nextCategory = dto.category ?? followUp.category;
      const nextIncidentType =
        dto.incidentType === undefined
          ? followUp.incidentType
          : (dto.incidentType ?? null);
      this.validateStudentFollowUpPayload(
        followUp.recordType,
        nextCategory,
        nextIncidentType,
      );

      followUp.category = nextCategory ?? null;
      followUp.incidentType = nextIncidentType;

      if (dto.recordedAt) {
        followUp.recordedAt = dto.recordedAt.slice(0, 10);
      }

      if (dto.note !== undefined) {
        followUp.note = dto.note.trim();
      }

      if (dto.actionsTaken !== undefined) {
        followUp.actionsTaken = dto.actionsTaken ?? null;
      }

      if (dto.status !== undefined) {
        followUp.status = dto.status;
      }

      if (dto.externalReference !== undefined) {
        followUp.externalReference = dto.externalReference ?? null;
      }

      await manager.getRepository(StudentFollowUp).save(followUp);
      return this.getStudentFollowUpsFromManager(studentId, manager);
    });
  }

  async createStudentContact(
    studentId: string,
    dto: CreateStudentContactDto,
    changedBy: AuthenticatedRequestUser,
  ): Promise<StudentContactResponseDto[]> {
    await this.ensureStudentContactsStorageAvailable();

    return this.dataSource.transaction(async (manager) => {
      const student = await this.findStudentOrFail(studentId, manager);
      const contactsRepository = manager.getRepository(StudentContact);
      const changeLogsRepository = manager.getRepository(StudentChangeLog);
      const schoolYear =
        (await this.resolveStudentEnrollment(student))?.schoolYear ??
        (await this.institutionService.getActiveSchoolYear());

      const activeContacts = await contactsRepository.find({
        where: { studentId, isActive: true },
        order: { createdAt: 'ASC' },
      });
      const shouldBePrimary =
        dto.isPrimary === true || activeContacts.length === 0;

      if (shouldBePrimary) {
        await this.clearPrimaryStudentContacts(studentId, manager);
      }

      const createdContact = contactsRepository.create({
        studentId,
        fullName: dto.fullName.trim(),
        relationship: dto.relationship.trim(),
        phonePrimary: dto.phonePrimary.trim(),
        phoneSecondary: dto.phoneSecondary ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        isPrimary: shouldBePrimary,
        isEmergencyContact: dto.isEmergencyContact ?? false,
        isAuthorizedToCoordinate: dto.isAuthorizedToCoordinate ?? false,
        isAuthorizedToPickUp: dto.isAuthorizedToPickUp ?? false,
        notes: dto.notes ?? null,
        isActive: true,
      });

      await contactsRepository.save(createdContact);
      await changeLogsRepository.save(
        changeLogsRepository.create({
          studentId,
          changedByUserId: changedBy.id,
          schoolYear,
          changeType: StudentChangeType.CONTACT_CREATED,
          previousData: null,
          nextData: this.toStudentContactLogData(createdContact),
        }),
      );

      return this.getStudentContactsFromManager(
        studentId,
        changedBy.role,
        manager,
      );
    });
  }

  async updateStudentContact(
    studentId: string,
    contactId: string,
    dto: UpdateStudentContactDto,
    changedBy: AuthenticatedRequestUser,
  ): Promise<StudentContactResponseDto[]> {
    await this.ensureStudentContactsStorageAvailable();

    return this.dataSource.transaction(async (manager) => {
      const student = await this.findStudentOrFail(studentId, manager);
      const contactsRepository = manager.getRepository(StudentContact);
      const changeLogsRepository = manager.getRepository(StudentChangeLog);
      const contact = await contactsRepository.findOne({
        where: {
          id: contactId,
          studentId,
          isActive: true,
        },
      });

      if (!contact) {
        throw new NotFoundException('Contacto no encontrado.');
      }

      const previousData = this.toStudentContactLogData(contact);
      const activeContacts = await contactsRepository.find({
        where: { studentId, isActive: true },
        order: { createdAt: 'ASC' },
      });

      if (dto.isPrimary === true) {
        await this.clearPrimaryStudentContacts(studentId, manager);
        contact.isPrimary = true;
      }

      if (dto.fullName !== undefined) {
        contact.fullName = dto.fullName.trim();
      }

      if (dto.relationship !== undefined) {
        contact.relationship = dto.relationship.trim();
      }

      if (dto.phonePrimary !== undefined) {
        contact.phonePrimary = dto.phonePrimary.trim();
      }

      if (dto.phoneSecondary !== undefined) {
        contact.phoneSecondary = dto.phoneSecondary;
      }

      if (dto.email !== undefined) {
        contact.email = dto.email ?? null;
      }

      if (dto.address !== undefined) {
        contact.address = dto.address;
      }

      if (dto.isPrimary === false) {
        if (
          contact.isPrimary &&
          activeContacts.filter((item) => item.id !== contact.id).length > 0
        ) {
          throw new BadRequestException(
            'Debe mantenerse al menos un contacto principal activo.',
          );
        }

        contact.isPrimary = false;
      }

      if (dto.isEmergencyContact !== undefined) {
        contact.isEmergencyContact = dto.isEmergencyContact;
      }

      if (dto.isAuthorizedToCoordinate !== undefined) {
        contact.isAuthorizedToCoordinate = dto.isAuthorizedToCoordinate;
      }

      if (dto.isAuthorizedToPickUp !== undefined) {
        contact.isAuthorizedToPickUp = dto.isAuthorizedToPickUp;
      }

      if (dto.notes !== undefined) {
        contact.notes = dto.notes;
      }

      await contactsRepository.save(contact);

      const schoolYear =
        (await this.resolveStudentEnrollment(student))?.schoolYear ??
        (await this.institutionService.getActiveSchoolYear());

      await changeLogsRepository.save(
        changeLogsRepository.create({
          studentId,
          changedByUserId: changedBy.id,
          schoolYear,
          changeType: StudentChangeType.CONTACT_UPDATED,
          previousData,
          nextData: this.toStudentContactLogData(contact),
        }),
      );

      return this.getStudentContactsFromManager(
        studentId,
        changedBy.role,
        manager,
      );
    });
  }

  async deactivateStudentContact(
    studentId: string,
    contactId: string,
    changedBy: AuthenticatedRequestUser,
  ): Promise<StudentContactResponseDto[]> {
    await this.ensureStudentContactsStorageAvailable();

    return this.dataSource.transaction(async (manager) => {
      const student = await this.findStudentOrFail(studentId, manager);
      const contactsRepository = manager.getRepository(StudentContact);
      const changeLogsRepository = manager.getRepository(StudentChangeLog);
      const contact = await contactsRepository.findOne({
        where: {
          id: contactId,
          studentId,
          isActive: true,
        },
      });

      if (!contact) {
        throw new NotFoundException('Contacto no encontrado.');
      }

      const previousData = this.toStudentContactLogData(contact);
      contact.isActive = false;
      contact.isPrimary = false;
      await contactsRepository.save(contact);
      await this.promoteFallbackPrimaryContact(studentId, manager);

      const schoolYear =
        (await this.resolveStudentEnrollment(student))?.schoolYear ??
        (await this.institutionService.getActiveSchoolYear());

      await changeLogsRepository.save(
        changeLogsRepository.create({
          studentId,
          changedByUserId: changedBy.id,
          schoolYear,
          changeType: StudentChangeType.CONTACT_DEACTIVATED,
          previousData,
          nextData: this.toStudentContactLogData(contact),
        }),
      );

      return this.getStudentContactsFromManager(
        studentId,
        changedBy.role,
        manager,
      );
    });
  }

  toStudentResponse(
    student: Student,
    enrollment: StudentEnrollment | null,
  ): StudentResponseDto {
    return {
      id: student.id,
      userId: student.userId,
      username: student.user?.username ?? student.code,
      code: student.code,
      document: student.document,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.lastName} ${student.firstName}`.trim(),
      isActive: student.isActive,
      institutionalStatus: this.resolveInstitutionalStatus(student, enrollment),
      schoolYear: enrollment?.schoolYear ?? null,
      grade: enrollment?.grade ?? null,
      section: enrollment?.section ?? null,
      shift: enrollment?.shift ?? null,
      enrollmentStatus: enrollment?.status ?? null,
      currentSituation: enrollment
        ? this.toStudentSituationResponse(enrollment)
        : null,
    };
  }

  private toStudentDetailResponse(
    student: Student,
    enrollment: StudentEnrollment | null,
    options?: {
      viewerRole?: UserRole;
      includeChangeLogs?: boolean;
    },
  ): Promise<StudentDetailResponseDto> {
    return this.buildStudentDetailResponse(
      student,
      enrollment,
      options?.viewerRole ?? UserRole.DIRECTOR,
      options?.includeChangeLogs ?? true,
    );
  }

  private async buildStudentDetailResponse(
    student: Student,
    enrollment: StudentEnrollment | null,
    viewerRole: UserRole,
    includeChangeLogs: boolean,
  ): Promise<StudentDetailResponseDto> {
    const todayStatus = await this.buildTodayAttendanceStatus(
      student.id,
      enrollment?.schoolYear ??
        (await this.institutionService.getActiveSchoolYear()),
    );
    const recentAttendance = await this.buildRecentAttendanceProfile(
      student.id,
      enrollment?.schoolYear ??
        (await this.institutionService.getActiveSchoolYear()),
    );
    const alerts = enrollment
      ? await this.attendanceService.getStudentAttendanceAlerts(
          Object.assign(enrollment, { student }),
        )
      : [];

    return {
      ...this.toStudentResponse(student, enrollment),
      enrollments: [...(student.enrollments ?? [])]
        .sort((left, right) => right.schoolYear - left.schoolYear)
        .map((currentEnrollment) => ({
          id: currentEnrollment.id,
          schoolYear: currentEnrollment.schoolYear,
          grade: currentEnrollment.grade,
          section: currentEnrollment.section,
          shift: currentEnrollment.shift,
          status: currentEnrollment.status,
          movementType: currentEnrollment.movementType,
          administrativeDetail: currentEnrollment.administrativeDetail,
          statusChangedAt:
            currentEnrollment.statusChangedAt?.toISOString() ?? null,
          statusChangedByUserId: currentEnrollment.statusChangedByUserId,
          statusChangedByDisplayName:
            currentEnrollment.statusChangedByUser?.displayName ?? null,
          isActive: currentEnrollment.isActive,
        })),
      todayStatus,
      recentSummary: recentAttendance.summary,
      recentItems: recentAttendance.items,
      alerts,
      contacts: this.mapStudentContacts(student.contacts ?? [], viewerRole),
      consent: this.toStudentConsentResponse(student, viewerRole),
      followUps:
        viewerRole === UserRole.STUDENT
          ? []
          : [...(student.followUps ?? [])]
              .sort((left, right) => {
                if (left.recordedAt !== right.recordedAt) {
                  return right.recordedAt.localeCompare(left.recordedAt);
                }

                return right.createdAt.getTime() - left.createdAt.getTime();
              })
              .slice(0, 12)
              .map((followUp) => this.toStudentFollowUpResponse(followUp)),
      changeLogs: includeChangeLogs
        ? [...(student.changeLogs ?? [])]
            .sort(
              (left, right) =>
                right.createdAt.getTime() - left.createdAt.getTime(),
            )
            .slice(0, 12)
            .map((changeLog) => this.toStudentChangeLogResponse(changeLog))
        : [],
    };
  }

  private async buildTodayAttendanceStatus(
    studentId: string,
    schoolYear: number,
  ): Promise<StudentTodayAttendanceStatusDto> {
    const today = this.getTodayInLima();
    const [attendanceRecords, attendanceDayStatuses] = await Promise.all([
      this.attendanceRecordsRepository.find({
        where: {
          studentId,
          schoolYear,
          attendanceDate: today,
        },
        order: {
          markedAt: 'ASC',
        },
      }),
      this.attendanceDayStatusesRepository.find({
        where: {
          studentId,
          schoolYear,
          attendanceDate: today,
          isActive: true,
        },
        order: {
          createdAt: 'DESC',
        },
      }),
    ]);

    const entry =
      attendanceRecords.find(
        (attendanceRecord) =>
          attendanceRecord.markType === AttendanceMarkType.ENTRY,
      ) ?? null;
    const exit =
      attendanceRecords.find(
        (attendanceRecord) =>
          attendanceRecord.markType === AttendanceMarkType.EXIT,
      ) ?? null;
    const absence = attendanceDayStatuses[0] ?? null;

    return {
      attendanceDate: today,
      operationalStatus: this.getAttendanceOperationalLabel(
        entry,
        exit,
        absence,
      ),
      absence: this.toAttendanceDayStatus(absence),
      entry: entry ? this.toDailyMark(entry) : null,
      exit: exit ? this.toDailyMark(exit) : null,
    };
  }

  private async buildRecentAttendanceProfile(
    studentId: string,
    schoolYear: number,
  ): Promise<{
    summary: StudentRecentAttendanceSummaryDto;
    items: StudentRecentAttendanceItemDto[];
  }> {
    const periodEnd = this.getTodayInLima();
    const periodStart = this.shiftDate(periodEnd, -29);
    const schoolDates = this.buildSchoolDateRange(periodStart, periodEnd);
    const [attendanceRecords, attendanceDayStatuses] = await Promise.all([
      this.attendanceRecordsRepository.find({
        where: {
          studentId,
          schoolYear,
          attendanceDate: Between(periodStart, periodEnd),
        },
        order: {
          attendanceDate: 'DESC',
          markedAt: 'DESC',
        },
      }),
      this.attendanceDayStatusesRepository.find({
        where: {
          studentId,
          schoolYear,
          attendanceDate: Between(periodStart, periodEnd),
          isActive: true,
        },
        order: {
          attendanceDate: 'DESC',
          createdAt: 'DESC',
        },
      }),
    ]);

    const attendanceMap = new Map<
      string,
      {
        absence: AttendanceDayStatus | null;
        entry: AttendanceRecord | null;
        exit: AttendanceRecord | null;
      }
    >();

    for (const attendanceRecord of attendanceRecords) {
      const key = this.buildAttendanceKey(
        studentId,
        attendanceRecord.attendanceDate,
      );
      const currentValue = attendanceMap.get(key) ?? {
        absence: null,
        entry: null,
        exit: null,
      };

      if (attendanceRecord.markType === AttendanceMarkType.ENTRY) {
        currentValue.entry = attendanceRecord;
      } else {
        currentValue.exit = attendanceRecord;
      }

      attendanceMap.set(key, currentValue);
    }

    for (const attendanceDayStatus of attendanceDayStatuses) {
      const key = this.buildAttendanceKey(
        studentId,
        attendanceDayStatus.attendanceDate,
      );
      const currentValue = attendanceMap.get(key) ?? {
        absence: null,
        entry: null,
        exit: null,
      };

      if (!currentValue.absence) {
        currentValue.absence = attendanceDayStatus;
      }

      attendanceMap.set(key, currentValue);
    }

    const summary: StudentRecentAttendanceSummaryDto = {
      periodStart,
      periodEnd,
      schoolDays: schoolDates.length,
      attendedDays: 0,
      completeDays: 0,
      attendancePercentage: 0,
      entriesRegistered: 0,
      exitsRegistered: 0,
      lateEntries: 0,
      earlyDepartures: 0,
      justifiedAbsences: 0,
      unjustifiedAbsences: 0,
      absences: 0,
      incompleteRecords: 0,
    };

    for (const attendanceDate of schoolDates) {
      const currentValue = attendanceMap.get(
        this.buildAttendanceKey(studentId, attendanceDate),
      ) ?? {
        absence: null,
        entry: null,
        exit: null,
      };

      if (currentValue.absence) {
        summary.absences += 1;

        if (
          currentValue.absence.statusType ===
          AttendanceDayStatusType.JUSTIFIED_ABSENCE
        ) {
          summary.justifiedAbsences += 1;
        } else {
          summary.unjustifiedAbsences += 1;
        }

        continue;
      }

      if (currentValue.entry || currentValue.exit) {
        summary.attendedDays += 1;
      }

      if (currentValue.entry) {
        summary.entriesRegistered += 1;

        if (currentValue.entry.status === AttendanceRecordStatus.LATE) {
          summary.lateEntries += 1;
        }
      }

      if (currentValue.exit) {
        summary.exitsRegistered += 1;

        if (
          currentValue.exit.status === AttendanceRecordStatus.EARLY_DEPARTURE
        ) {
          summary.earlyDepartures += 1;
        }
      }

      if (currentValue.entry && currentValue.exit) {
        summary.completeDays += 1;
      }

      if (Boolean(currentValue.entry) !== Boolean(currentValue.exit)) {
        summary.incompleteRecords += 1;
      }
    }

    summary.attendancePercentage = this.calculateAttendancePercentage(
      summary.attendedDays,
      summary.schoolDays,
    );

    const items: StudentRecentAttendanceItemDto[] = [
      ...attendanceRecords.map((attendanceRecord) => ({
        itemType: 'mark' as const,
        attendanceDate: attendanceRecord.attendanceDate,
        markType: attendanceRecord.markType,
        status: attendanceRecord.status,
        markedAt: attendanceRecord.markedAt.toISOString(),
        source: attendanceRecord.source,
        observation: attendanceRecord.observation,
      })),
      ...attendanceDayStatuses.map((attendanceDayStatus) => ({
        itemType: 'absence' as const,
        attendanceDate: attendanceDayStatus.attendanceDate,
        markType: null,
        status: attendanceDayStatus.statusType,
        markedAt: null,
        source: null,
        observation: attendanceDayStatus.observation,
      })),
    ]
      .sort((left, right) => {
        if (left.attendanceDate !== right.attendanceDate) {
          return right.attendanceDate.localeCompare(left.attendanceDate);
        }

        const leftMarkedAt = left.markedAt ?? '';
        const rightMarkedAt = right.markedAt ?? '';

        if (leftMarkedAt !== rightMarkedAt) {
          return rightMarkedAt.localeCompare(leftMarkedAt);
        }

        return left.itemType === 'absence' ? 1 : -1;
      })
      .slice(0, 8);

    return {
      summary,
      items,
    };
  }

  private async getStudentContactsFromManager(
    studentId: string,
    viewerRole: UserRole,
    manager: EntityManager,
  ): Promise<StudentContactResponseDto[]> {
    await this.ensureStudentContactsStorageAvailable();

    const student = await manager.getRepository(Student).findOne({
      where: { id: studentId },
      relations: ['contacts'],
      order: {
        contacts: {
          isPrimary: 'DESC',
          isEmergencyContact: 'DESC',
          createdAt: 'ASC',
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado.');
    }

    return this.mapStudentContacts(student.contacts ?? [], viewerRole);
  }

  private async getStudentFollowUpsFromManager(
    studentId: string,
    manager: EntityManager,
  ): Promise<StudentFollowUpResponseDto[]> {
    const followUps = await manager.getRepository(StudentFollowUp).find({
      where: { studentId },
      relations: ['authorUser'],
      order: {
        recordedAt: 'DESC',
        createdAt: 'DESC',
      },
    });

    return followUps.map((followUp) =>
      this.toStudentFollowUpResponse(followUp),
    );
  }

  private async clearPrimaryStudentContacts(
    studentId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(StudentContact)
      .update(
        { studentId, isActive: true, isPrimary: true },
        { isPrimary: false },
      );
  }

  private async promoteFallbackPrimaryContact(
    studentId: string,
    manager: EntityManager,
  ): Promise<void> {
    const contactsRepository = manager.getRepository(StudentContact);
    const nextPrimary = await contactsRepository.findOne({
      where: { studentId, isActive: true },
      order: {
        isEmergencyContact: 'DESC',
        createdAt: 'ASC',
      },
    });

    if (!nextPrimary) {
      return;
    }

    nextPrimary.isPrimary = true;
    await contactsRepository.save(nextPrimary);
  }

  private validateStudentFollowUpPayload(
    recordType: StudentFollowUpRecordType,
    category?: StudentFollowUpCategory | null,
    incidentType?: string | null,
  ): void {
    if (recordType === StudentFollowUpRecordType.TUTORIAL_NOTE) {
      if (!category) {
        throw new BadRequestException(
          'La observacion tutorial debe indicar una categoria.',
        );
      }

      return;
    }

    if (!incidentType?.trim()) {
      throw new BadRequestException(
        'La incidencia debe indicar un tipo breve para el registro interno.',
      );
    }
  }

  private async buildInstitutionalProfileQueryOptions(): Promise<{
    relations: string[];
    order: {
      enrollments: {
        schoolYear: 'DESC';
      };
      followUps: {
        recordedAt: 'DESC';
        createdAt: 'DESC';
      };
      changeLogs: {
        createdAt: 'DESC';
      };
      contacts?: {
        isPrimary: 'DESC';
        isEmergencyContact: 'DESC';
        createdAt: 'ASC';
      };
    };
  }> {
    const contactsAvailable = await this.isStudentContactsStorageAvailable();

    return {
      relations: [
        'user',
        'enrollments',
        'enrollments.statusChangedByUser',
        'changeLogs',
        'changeLogs.changedByUser',
        'followUps',
        'followUps.authorUser',
        'imageConsentRecordedByUser',
        ...(contactsAvailable ? ['contacts'] : []),
      ],
      order: {
        enrollments: {
          schoolYear: 'DESC',
        },
        followUps: {
          recordedAt: 'DESC',
          createdAt: 'DESC',
        },
        changeLogs: {
          createdAt: 'DESC',
        },
        ...(contactsAvailable
          ? {
              contacts: {
                isPrimary: 'DESC' as const,
                isEmergencyContact: 'DESC' as const,
                createdAt: 'ASC' as const,
              },
            }
          : {}),
      },
    };
  }

  private async ensureStudentContactsStorageAvailable(): Promise<void> {
    if (await this.isStudentContactsStorageAvailable()) {
      return;
    }

    throw new ServiceUnavailableException(
      'La estructura de contactos del estudiante aun no esta disponible. Aplica la migracion pendiente para habilitar esta operacion.',
    );
  }

  private async isStudentContactsStorageAvailable(): Promise<boolean> {
    if (this.hasStudentContactsTable) {
      return true;
    }

    const rawResult: unknown = await this.dataSource.query(
      `SELECT to_regclass('public.student_contacts') AS table_name`,
    );
    const rows = Array.isArray(rawResult) ? (rawResult as unknown[]) : [];
    const firstRow = rows[0];
    const tableValue =
      firstRow && typeof firstRow === 'object'
        ? (firstRow as Record<string, unknown>)['table_name']
        : null;
    const tableName =
      typeof tableValue === 'string' || tableValue === null ? tableValue : null;
    const isAvailable = typeof tableName === 'string' && tableName.length > 0;

    if (isAvailable) {
      this.hasStudentContactsTable = true;
      return true;
    }

    if (!this.hasLoggedMissingContactsTable) {
      this.logger.warn(
        'La tabla "student_contacts" no existe en la base de datos actual. Se omitiran los contactos en la ficha estudiantil hasta aplicar la migracion 1744300000000-add-student-contacts.',
      );
      this.hasLoggedMissingContactsTable = true;
    }

    return false;
  }

  private async findStudentOrFail(
    studentId: string,
    manager: EntityManager,
  ): Promise<Student> {
    const student = await manager.getRepository(Student).findOne({
      where: { id: studentId },
      relations: ['enrollments', 'user'],
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado.');
    }

    return student;
  }

  private readStudentImportWorkbook(
    file: Pick<
      { buffer: Buffer; originalname: string },
      'buffer' | 'originalname'
    >,
  ): XLSX.WorkBook {
    try {
      return XLSX.read(file.buffer, {
        type: 'buffer',
        raw: false,
        cellDates: false,
      });
    } catch {
      throw new BadRequestException(
        'No se pudo leer el archivo Excel. Verifica que tenga una hoja valida y vuelve a intentarlo.',
      );
    }
  }

  private parseStudentImportWorksheet(
    worksheet: XLSX.WorkSheet,
  ): StudentImportRawRow[] {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (matrix.length === 0) {
      throw new BadRequestException(
        'El archivo no contiene filas para importar estudiantes.',
      );
    }

    const [headerRow, ...dataRows] = matrix;
    const headerMap = this.buildStudentImportHeaderMap(
      Array.isArray(headerRow) ? headerRow : [],
    );
    const missingHeaders = STUDENT_IMPORT_REQUIRED_HEADERS.filter(
      (header) => !headerMap.has(header),
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Faltan columnas obligatorias en el archivo: ${missingHeaders.join(', ')}.`,
      );
    }

    return dataRows
      .map((row, index) =>
        this.parseStudentImportRow(
          Array.isArray(row) ? row : [],
          headerMap,
          index + 2,
        ),
      )
      .filter((row) => !this.isStudentImportRowEmpty(row));
  }

  private buildStudentImportHeaderMap(headers: unknown[]): Map<string, number> {
    const map = new Map<string, number>();

    headers.forEach((header, index) => {
      const normalizedHeader = this.normalizeStudentImportHeader(header);

      if (!normalizedHeader) {
        return;
      }

      if (
        [
          'codigo',
          'code',
          'studentcode',
          'codigodelestudiante',
          'codigoopcionalalimportar',
          'username',
          'usuario',
          'user',
          'usernamecodigoopcionalalimportar',
        ].includes(normalizedHeader)
      ) {
        map.set('code', index);
      }

      if (
        ['nombres', 'nombre', 'firstname', 'firstnames'].includes(
          normalizedHeader,
        )
      ) {
        map.set('nombres', index);
      }

      if (
        ['apellidos', 'apellido', 'lastname', 'lastnames'].includes(
          normalizedHeader,
        )
      ) {
        map.set('apellidos', index);
      }

      if (['documento', 'document', 'dni', 'doc'].includes(normalizedHeader)) {
        map.set('documento', index);
      }

      if (['grado', 'grade'].includes(normalizedHeader)) {
        map.set('grado', index);
      }

      if (
        ['seccion', 'section', 'aula', 'classroom'].includes(normalizedHeader)
      ) {
        map.set('seccion', index);
      }

      if (['turno', 'shift'].includes(normalizedHeader)) {
        map.set('turno', index);
      }

      if (
        ['activo', 'estado', 'isactive', 'status'].includes(normalizedHeader)
      ) {
        map.set('activo', index);
      }
    });

    return map;
  }

  private normalizeStudentImportHeader(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  private parseStudentImportRow(
    values: unknown[],
    headerMap: Map<string, number>,
    rowNumber: number,
  ): StudentImportRawRow {
    const getValue = (key: string): unknown =>
      values[headerMap.get(key) ?? -1] ?? '';

    return {
      rowNumber,
      code: this.normalizeImportCode(getValue('code')),
      firstName: this.normalizeImportName(getValue('nombres')),
      lastName: this.normalizeImportName(getValue('apellidos')),
      document: this.normalizeImportDocument(getValue('documento')),
      grade: this.normalizeImportGrade(getValue('grado')),
      section: this.normalizeImportSection(getValue('seccion')),
      shift: this.normalizeImportShift(getValue('turno')),
      isActive: this.normalizeImportActiveState(getValue('activo')),
    };
  }

  private normalizeImportCode(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const normalizedValue = String(value).trim().toLowerCase();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private normalizeImportName(value: unknown): string {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return '';
    }

    return String(value).trim();
  }

  private normalizeImportDocument(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const normalizedValue = String(value).trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private normalizeImportGrade(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value)) {
      return value;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const normalizedValue = Number.parseInt(value.trim(), 10);
    return Number.isNaN(normalizedValue) ? null : normalizedValue;
  }

  private normalizeImportSection(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const normalizedValue = String(value).trim().toUpperCase();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private normalizeImportShift(value: unknown): StudentShift | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const normalizedValue = String(value)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toLowerCase();

    if (
      ['morning', 'manana', 'turnomanana', 'mananaam'].includes(normalizedValue)
    ) {
      return StudentShift.MORNING;
    }

    if (['afternoon', 'tarde', 'turnotarde', 'pm'].includes(normalizedValue)) {
      return StudentShift.AFTERNOON;
    }

    return null;
  }

  private normalizeImportActiveState(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value !== 'string') {
      return true;
    }

    const normalizedValue = value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toLowerCase();

    if (!normalizedValue) {
      return true;
    }

    if (
      ['activo', 'activa', 'si', 'sí', 'true', '1'].includes(normalizedValue)
    ) {
      return true;
    }

    if (
      ['inactivo', 'inactiva', 'no', 'false', '0'].includes(normalizedValue)
    ) {
      return false;
    }

    return true;
  }

  private isStudentImportRowEmpty(row: StudentImportRawRow): boolean {
    return (
      !row.code &&
      !row.firstName &&
      !row.lastName &&
      !row.document &&
      row.grade === null &&
      !row.section &&
      !row.shift
    );
  }

  private async validateStudentImportRows(
    rows: StudentImportRawRow[],
    schoolYear: number,
    institutionSettings: Awaited<ReturnType<InstitutionService['getSettings']>>,
  ): Promise<StudentImportValidationResult> {
    const providedCodes = rows
      .map((row) => row.code)
      .filter((row): row is string => Boolean(row));
    const providedDocuments = rows
      .map((row) => row.document)
      .filter((row): row is string => Boolean(row));

    const duplicateCodesInFile = this.findDuplicateValues(providedCodes);
    const duplicateDocumentsInFile =
      this.findDuplicateValues(providedDocuments);
    const existingStudentCodes = providedCodes.length
      ? await this.studentsRepository.find({
          where: { code: In(providedCodes) },
          select: { code: true },
        })
      : [];
    const existingUserCodes = providedCodes.length
      ? await this.dataSource.getRepository(User).find({
          where: { username: In(providedCodes) },
          select: { username: true },
        })
      : [];
    const existingDocuments = providedDocuments.length
      ? await this.studentsRepository.find({
          where: { document: In(providedDocuments) },
          select: { document: true },
        })
      : [];
    const existingCodeSet = new Set([
      ...existingStudentCodes.map((student) => student.code),
      ...existingUserCodes.map((user) => user.username),
    ]);
    const existingDocumentSet = new Set(
      existingDocuments
        .map((student) => student.document)
        .filter((document): document is string => Boolean(document)),
    );
    const summary: StudentImportValidationSummary = {
      totalRows: rows.length,
      validRows: 0,
      invalidRows: 0,
      rowsWithProvidedCode: 0,
      rowsWithoutCode: 0,
      rowsWithInvalidCode: 0,
      rowsWithDuplicateCode: 0,
      rowsWithDuplicateDocument: 0,
      rowsWithInvalidClassroomData: 0,
      rowsWithIncompleteData: 0,
    };

    const previewRows = rows.map((row) => {
      const issues: StudentImportPreviewRowDto['issues'] = [];

      if (!row.code) {
        summary.rowsWithoutCode += 1;
      } else {
        summary.rowsWithProvidedCode += 1;
      }

      if (
        !row.firstName ||
        !row.lastName ||
        !row.grade ||
        !row.section ||
        !row.shift
      ) {
        issues.push({
          code: 'incomplete',
          message:
            'Completa nombres, apellidos, grado, seccion y turno antes de importar.',
        });
      }

      if (row.code && !isSupportedStudentCode(row.code)) {
        issues.push({
          code: 'invalid_code',
          message:
            'El codigo debe respetar el formato institucional uAAAA00000 o un codigo legacy valido con letras, numeros, guion o guion bajo.',
        });
      }

      if (row.code && duplicateCodesInFile.has(row.code)) {
        issues.push({
          code: 'duplicate_code',
          message:
            'El codigo se repite dentro del mismo archivo. Corrigelo antes de continuar.',
        });
      }

      if (row.code && existingCodeSet.has(row.code)) {
        issues.push({
          code: 'duplicate_code',
          message:
            'El codigo ya existe en el sistema y no puede reutilizarse en esta importacion.',
        });
      }

      if (row.document && duplicateDocumentsInFile.has(row.document)) {
        issues.push({
          code: 'duplicate_document',
          message:
            'El documento se repite dentro del mismo archivo. Corrigelo antes de continuar.',
        });
      }

      if (row.document && existingDocumentSet.has(row.document)) {
        issues.push({
          code: 'duplicate_document',
          message:
            'El documento ya esta asignado a otro estudiante en el sistema.',
        });
      }

      if (
        row.grade !== null &&
        !institutionSettings.enabledGrades.includes(row.grade)
      ) {
        issues.push({
          code: 'invalid_grade',
          message:
            'El grado no esta habilitado en la configuracion institucional actual.',
        });
      }

      if (row.shift && !institutionSettings.enabledTurns.includes(row.shift)) {
        issues.push({
          code: 'invalid_shift',
          message:
            'El turno no esta habilitado en la configuracion institucional actual.',
        });
      }

      if (row.grade !== null && row.section) {
        const availableSections =
          institutionSettings.sectionsByGrade[String(row.grade)] ?? [];

        if (!availableSections.includes(row.section)) {
          issues.push({
            code: 'invalid_section',
            message:
              'La seccion no esta habilitada para el grado indicado en el año activo.',
          });
        }
      }

      const uniqueIssueCodes = new Set(issues.map((issue) => issue.code));

      if (uniqueIssueCodes.has('incomplete')) {
        summary.rowsWithIncompleteData += 1;
      }

      if (uniqueIssueCodes.has('duplicate_code')) {
        summary.rowsWithDuplicateCode += 1;
      }

      if (uniqueIssueCodes.has('invalid_code')) {
        summary.rowsWithInvalidCode += 1;
      }

      if (uniqueIssueCodes.has('duplicate_document')) {
        summary.rowsWithDuplicateDocument += 1;
      }

      if (
        uniqueIssueCodes.has('invalid_grade') ||
        uniqueIssueCodes.has('invalid_section') ||
        uniqueIssueCodes.has('invalid_shift')
      ) {
        summary.rowsWithInvalidClassroomData += 1;
      }

      const isValid = issues.length === 0;

      if (isValid) {
        summary.validRows += 1;
      } else {
        summary.invalidRows += 1;
      }

      return {
        ...row,
        schoolYear,
        isValid,
        issues,
      };
    });

    return {
      schoolYear,
      rows: previewRows.map((row) => ({
        rowNumber: row.rowNumber,
        code: row.code,
        firstName: row.firstName,
        lastName: row.lastName,
        document: row.document,
        grade: row.grade,
        section: row.section,
        shift: row.shift,
        isActive: row.isActive,
        isValid: row.isValid,
        issues: row.issues,
      })),
      summary,
      validRows: previewRows
        .filter((row) => row.isValid)
        .map((row) => ({
          rowNumber: row.rowNumber,
          code: row.code,
          firstName: row.firstName,
          lastName: row.lastName,
          document: row.document,
          grade: row.grade,
          section: row.section,
          shift: row.shift,
          isActive: row.isActive,
        })),
    };
  }

  private findDuplicateValues(values: string[]): Set<string> {
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

  private async allocateStudentCodes(
    manager: EntityManager,
    schoolYear: number,
    quantity: number,
    reservedCodes: string[] = [],
  ): Promise<string[]> {
    if (quantity <= 0) {
      return [];
    }

    await manager
      .getRepository(InstitutionSetting)
      .createQueryBuilder('settings')
      .setLock('pessimistic_write')
      .where('settings.id = :id', { id: INSTITUTION_SETTINGS_ID })
      .getOne();

    const prefix = `u${schoolYear}`;
    const prefixLike = `${prefix}%`;
    const studentCodes = await manager
      .getRepository(Student)
      .createQueryBuilder('student')
      .select('student.code', 'code')
      .where('student.code LIKE :prefixLike', { prefixLike })
      .getRawMany<{ code: string }>();
    const userCodes = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .select('user.username', 'username')
      .where('user.username LIKE :prefixLike', { prefixLike })
      .getRawMany<{ username: string }>();
    const reservedCodeSet = new Set(reservedCodes);
    const sequenceCandidates = [
      ...studentCodes.map((item) => item.code),
      ...userCodes.map((item) => item.username),
      ...reservedCodes,
    ];
    let currentSequence = 0;

    for (const code of sequenceCandidates) {
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
        throw new ServiceUnavailableException(
          `Se alcanzo el limite de codigos automaticos disponibles para el año ${schoolYear}.`,
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

  private async createStudentFromImportRow(
    manager: EntityManager,
    row: StudentImportRawRow,
    code: string,
    schoolYear: number,
    initialPasswordHash: string,
    createdBy: AuthenticatedRequestUser,
  ): Promise<Student> {
    await this.ensureStudentCodeIsUnique(code, manager);
    await this.ensureDocumentIsUnique(row.document ?? null, null, manager);

    const usersRepository = manager.getRepository(User);
    const studentsRepository = manager.getRepository(Student);
    const enrollmentsRepository = manager.getRepository(StudentEnrollment);
    const changeLogsRepository = manager.getRepository(StudentChangeLog);
    const displayName = `${row.lastName.trim()} ${row.firstName.trim()}`.trim();
    const user = usersRepository.create({
      username: code,
      displayName,
      role: UserRole.STUDENT,
      passwordHash: initialPasswordHash || (await hashPassword(code)),
      isActive: row.isActive,
      mustChangePassword: true,
      authVersion: 1,
    });
    const savedUser = await usersRepository.save(user);
    const student = studentsRepository.create({
      userId: savedUser.id,
      code,
      firstName: row.firstName.trim(),
      lastName: row.lastName.trim(),
      document: row.document?.trim() || null,
      isActive: row.isActive,
    });
    const savedStudent = await studentsRepository.save(student);
    const enrollment = enrollmentsRepository.create({
      studentId: savedStudent.id,
      schoolYear,
      grade: row.grade as number,
      section: row.section as string,
      shift: row.shift as StudentShift,
      status: StudentEnrollmentStatus.ACTIVE,
      movementType: StudentEnrollmentMovement.NEW_ADMISSION,
      administrativeDetail: null,
      statusChangedAt: new Date(),
      statusChangedByUserId: createdBy.id,
      isActive: row.isActive,
    });

    await enrollmentsRepository.save(enrollment);
    await changeLogsRepository.save(
      changeLogsRepository.create({
        studentId: savedStudent.id,
        changedByUserId: createdBy.id,
        schoolYear,
        changeType: StudentChangeType.STUDENT_CREATED,
        previousData: null,
        nextData: {
          code: savedStudent.code,
          firstName: savedStudent.firstName,
          lastName: savedStudent.lastName,
          document: savedStudent.document,
          isActive: savedStudent.isActive,
          schoolYear,
          grade: enrollment.grade,
          section: enrollment.section,
          shift: enrollment.shift,
          status: enrollment.status,
          movementType: enrollment.movementType,
        },
      }),
    );

    return savedStudent;
  }

  private async ensureStudentCodeIsUnique(
    code: string,
    manager: EntityManager,
  ): Promise<void> {
    const existingStudent = await manager.getRepository(Student).findOne({
      where: { code },
    });

    if (existingStudent) {
      throw new ConflictException(
        'El codigo ingresado ya esta asignado a otro estudiante.',
      );
    }

    const existingUser = await manager.getRepository(User).findOne({
      where: { username: code },
    });

    if (existingUser) {
      throw new ConflictException(
        'El codigo ingresado ya esta asignado a otro usuario.',
      );
    }
  }

  private toStudentExportRow(
    student: Student,
    enrollment: StudentEnrollment,
  ): StudentExportRow {
    return {
      'Username (codigo opcional al importar)': student.code,
      Nombres: student.firstName,
      Apellidos: student.lastName,
      Documento: student.document ?? '',
      Grado: enrollment.grade,
      Seccion: enrollment.section,
      Turno: enrollment.shift === StudentShift.MORNING ? 'Mañana' : 'Tarde',
      Estado: student.isActive ? 'Activo' : 'Inactivo',
    };
  }

  private buildStudentExportFile(
    format: StudentExportFormat | undefined,
    rows: StudentExportRow[],
    metadata: {
      schoolYear: number;
      grade?: number;
      section?: string;
    },
  ): StudentExportFile {
    const exportFormat = format ?? StudentExportFormat.XLSX;
    const worksheet = this.buildStudentExportWorksheet(rows);
    const fileName = this.buildStudentExportFileName(exportFormat, metadata);

    if (exportFormat === StudentExportFormat.XLSX) {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes');

      return {
        fileName,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: XLSX.write(workbook, {
          bookType: 'xlsx',
          type: 'buffer',
        }) as Buffer,
      };
    }

    const csvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });

    return {
      fileName,
      contentType: 'text/csv; charset=utf-8',
      buffer: Buffer.from(`\uFEFF${csvContent}`, 'utf8'),
    };
  }

  private buildStudentExportWorksheet(
    rows: StudentExportRow[],
  ): XLSX.WorkSheet {
    const data = [
      [...STUDENT_EXPORT_HEADERS],
      ...rows.map((row) =>
        STUDENT_EXPORT_HEADERS.map((header) => row[header] ?? ''),
      ),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    worksheet['!cols'] = STUDENT_EXPORT_HEADERS.map((header) => ({
      wch: Math.max(
        header.length + 2,
        ...rows.map((row) => String(row[header] ?? '').length),
        14,
      ),
    }));

    return worksheet;
  }

  private buildStudentExportFileName(
    format: StudentExportFormat,
    metadata: {
      schoolYear: number;
      grade?: number;
      section?: string;
    },
  ): string {
    const parts = ['estudiantes', `anio_${metadata.schoolYear}`];

    if (typeof metadata.grade === 'number') {
      parts.push(`grado_${metadata.grade}`);
    }

    if (metadata.section) {
      parts.push(
        `seccion_${this.sanitizeStudentFileNamePart(metadata.section)}`,
      );
    }

    return `${parts.join('_')}.${format}`;
  }

  private storeStudentImportSession(input: {
    createdByUserId: string;
    schoolYear: number;
    fileName: string;
    sheetName: string;
    rows: StudentImportPreviewRowDto[];
    summary: StudentImportValidationSummary;
    validRows: Array<StudentImportRawRow & { code: string | null }>;
  }): StudentImportSession {
    this.cleanupExpiredStudentImportSessions();

    const token = randomUUID();
    const session: StudentImportSession = {
      token,
      createdByUserId: input.createdByUserId,
      schoolYear: input.schoolYear,
      fileName: input.fileName,
      sheetName: input.sheetName,
      rows: input.rows,
      summary: input.summary,
      validRows: input.validRows,
      expiresAt: Date.now() + STUDENT_IMPORT_TOKEN_TTL_MS,
    };

    this.studentImportSessions.set(token, session);

    return session;
  }

  private consumeStudentImportSession(
    token: string,
    userId: string,
  ): StudentImportSession {
    this.cleanupExpiredStudentImportSessions();

    const session = this.studentImportSessions.get(token);

    if (!session) {
      throw new BadRequestException(
        'La validacion previa ya vencio o no esta disponible. Analiza el archivo nuevamente antes de importar.',
      );
    }

    if (session.createdByUserId !== userId) {
      this.studentImportSessions.delete(token);
      throw new ForbiddenException(
        'La validacion previa de esta importacion pertenece a otra sesion administrativa.',
      );
    }

    this.studentImportSessions.delete(token);
    return session;
  }

  private cleanupExpiredStudentImportSessions(): void {
    const now = Date.now();

    for (const [token, session] of this.studentImportSessions.entries()) {
      if (session.expiresAt <= now) {
        this.studentImportSessions.delete(token);
      }
    }
  }

  private sanitizeStudentFileNamePart(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private mapStudentContacts(
    contacts: StudentContact[],
    viewerRole: UserRole,
  ): StudentContactResponseDto[] {
    return [...contacts]
      .filter((contact) => contact.isActive)
      .sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return Number(right.isPrimary) - Number(left.isPrimary);
        }

        if (left.isEmergencyContact !== right.isEmergencyContact) {
          return (
            Number(right.isEmergencyContact) - Number(left.isEmergencyContact)
          );
        }

        return left.createdAt.getTime() - right.createdAt.getTime();
      })
      .map((contact) => this.toStudentContactResponse(contact, viewerRole));
  }

  private toStudentContactResponse(
    contact: StudentContact,
    viewerRole: UserRole,
  ): StudentContactResponseDto {
    const isAuxiliaryView = viewerRole === UserRole.AUXILIARY;
    const isTutorView = viewerRole === UserRole.TUTOR;
    const isStudentView = viewerRole === UserRole.STUDENT;

    return {
      id: contact.id,
      fullName: contact.fullName,
      relationship: contact.relationship,
      phonePrimary: contact.phonePrimary,
      phoneSecondary: contact.phoneSecondary,
      email: isAuxiliaryView || isTutorView ? null : contact.email,
      address: isAuxiliaryView || isTutorView ? null : contact.address,
      isPrimary: contact.isPrimary,
      isEmergencyContact: contact.isEmergencyContact,
      isAuthorizedToCoordinate: contact.isAuthorizedToCoordinate,
      isAuthorizedToPickUp: contact.isAuthorizedToPickUp,
      notes:
        isAuxiliaryView || isTutorView || isStudentView ? null : contact.notes,
      isActive: contact.isActive,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    };
  }

  private toStudentContactLogData(
    contact: StudentContact,
  ): Record<string, unknown> {
    return {
      id: contact.id,
      fullName: contact.fullName,
      relationship: contact.relationship,
      phonePrimary: contact.phonePrimary,
      phoneSecondary: contact.phoneSecondary,
      email: contact.email,
      address: contact.address,
      isPrimary: contact.isPrimary,
      isEmergencyContact: contact.isEmergencyContact,
      isAuthorizedToCoordinate: contact.isAuthorizedToCoordinate,
      isAuthorizedToPickUp: contact.isAuthorizedToPickUp,
      notes: contact.notes,
      isActive: contact.isActive,
    };
  }

  private toStudentSituationLogData(
    enrollment: StudentEnrollment,
  ): Record<string, unknown> {
    return {
      schoolYear: enrollment.schoolYear,
      status: enrollment.status,
      movementType: enrollment.movementType,
      administrativeDetail: enrollment.administrativeDetail,
      statusChangedAt: enrollment.statusChangedAt?.toISOString() ?? null,
      statusChangedByUserId: enrollment.statusChangedByUserId,
      isActive: enrollment.isActive,
    };
  }

  private toStudentSituationResponse(
    enrollment: StudentEnrollment,
  ): StudentSituationResponseDto {
    return {
      schoolYear: enrollment.schoolYear,
      status: enrollment.status,
      movementType: enrollment.movementType,
      administrativeDetail: enrollment.administrativeDetail,
      statusChangedAt: enrollment.statusChangedAt?.toISOString() ?? null,
      statusChangedByUserId: enrollment.statusChangedByUserId,
      statusChangedByDisplayName:
        enrollment.statusChangedByUser?.displayName ?? null,
    };
  }

  private toStudentConsentLogData(student: Student): Record<string, unknown> {
    return {
      imageConsentGranted: student.imageConsentGranted,
      imageConsentRecordedAt:
        student.imageConsentRecordedAt?.toISOString() ?? null,
      imageConsentRecordedByUserId: student.imageConsentRecordedByUserId,
      imageConsentObservation: student.imageConsentObservation,
    };
  }

  private toStudentConsentResponse(
    student: Student,
    viewerRole: UserRole,
  ): StudentConsentResponseDto | null {
    if (![UserRole.DIRECTOR, UserRole.SECRETARY].includes(viewerRole)) {
      return null;
    }

    return {
      imageConsentGranted: student.imageConsentGranted,
      recordedAt: student.imageConsentRecordedAt?.toISOString() ?? null,
      recordedByUserId: student.imageConsentRecordedByUserId,
      recordedByDisplayName:
        student.imageConsentRecordedByUser?.displayName ?? null,
      observation: student.imageConsentObservation,
    };
  }

  private toStudentFollowUpResponse(
    followUp: StudentFollowUp,
  ): StudentFollowUpResponseDto {
    return {
      id: followUp.id,
      recordType: followUp.recordType,
      category: followUp.category,
      incidentType: followUp.incidentType,
      recordedAt: followUp.recordedAt,
      note: followUp.note,
      actionsTaken: followUp.actionsTaken,
      status: followUp.status,
      externalReference: followUp.externalReference,
      authorUserId: followUp.authorUserId,
      authorDisplayName:
        followUp.authorUser?.displayName ?? 'Usuario no disponible',
      createdAt: followUp.createdAt.toISOString(),
      updatedAt: followUp.updatedAt.toISOString(),
    };
  }

  private toStudentFollowUpOverviewResponse(
    followUp: StudentFollowUp,
    enrollment: StudentEnrollment | null,
    schoolYear: number,
  ): StudentFollowUpOverviewItemResponseDto {
    return {
      ...this.toStudentFollowUpResponse(followUp),
      studentId: followUp.studentId,
      studentCode: followUp.student?.code ?? '',
      studentFullName: followUp.student
        ? `${followUp.student.lastName} ${followUp.student.firstName}`.trim()
        : 'Estudiante no disponible',
      schoolYear,
      grade: enrollment?.grade ?? null,
      section: enrollment?.section ?? null,
      shift: enrollment?.shift ?? null,
    };
  }

  private resolveInstitutionalStatus(
    student: Student,
    enrollment: StudentEnrollment | null,
  ): string {
    if (
      enrollment?.status &&
      enrollment.status !== StudentEnrollmentStatus.ACTIVE
    ) {
      return enrollment.status;
    }

    return student.isActive ? StudentEnrollmentStatus.ACTIVE : 'inactive';
  }

  private async resolveStudentEnrollment(
    student: Student,
    schoolYear?: number,
  ): Promise<StudentEnrollment | null> {
    const targetSchoolYear =
      schoolYear ?? (await this.institutionService.getActiveSchoolYear());

    const matchingEnrollment =
      student.enrollments?.find(
        (currentEnrollment) =>
          currentEnrollment.schoolYear === targetSchoolYear,
      ) ?? null;

    if (matchingEnrollment) {
      return matchingEnrollment;
    }

    const latestEnrollment = [...(student.enrollments ?? [])].sort(
      (left, right) => right.schoolYear - left.schoolYear,
    )[0];

    return latestEnrollment ?? null;
  }

  private async ensureViewerCanAccessStudent(
    enrollment: StudentEnrollment | null,
    authUser: AuthenticatedRequestUser,
  ): Promise<void> {
    if (authUser.role !== UserRole.TUTOR) {
      return;
    }

    if (!enrollment) {
      throw new NotFoundException('Estudiante no encontrado.');
    }

    const assignment = await this.tutorAssignmentsRepository.findOne({
      where: {
        tutorUserId: authUser.id,
        schoolYear: enrollment.schoolYear,
        grade: enrollment.grade,
        section: enrollment.section,
        shift: enrollment.shift,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Estudiante no encontrado.');
    }
  }

  private async ensureDocumentIsUnique(
    document: string | null,
    studentId: string | null,
    manager: EntityManager,
  ): Promise<void> {
    if (!document) {
      return;
    }

    const existingStudent = await manager.getRepository(Student).findOne({
      where: { document },
    });

    if (existingStudent && existingStudent.id !== studentId) {
      throw new ConflictException(
        'El documento ingresado ya esta asignado a otro estudiante.',
      );
    }
  }

  private toStudentChangeLogResponse(
    changeLog: StudentChangeLog,
  ): StudentChangeLogResponseDto {
    return {
      id: changeLog.id,
      schoolYear: changeLog.schoolYear,
      changeType: changeLog.changeType,
      changedAt: changeLog.createdAt.toISOString(),
      changedByUserId: changeLog.changedByUserId,
      changedByDisplayName:
        changeLog.changedByUser?.displayName ?? 'Usuario no disponible',
      previousData: changeLog.previousData,
      nextData: changeLog.nextData,
    };
  }

  private buildAttendanceKey(
    studentId: string,
    attendanceDate: string,
  ): string {
    return `${studentId}::${attendanceDate}`;
  }

  private buildSchoolDateRange(startDate: string, endDate: string): string[] {
    return this.buildDateRange(startDate, endDate).filter((date) => {
      const dayOfWeek = new Date(`${date}T00:00:00-05:00`).getUTCDay();

      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });
  }

  private buildDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const currentDate = new Date(`${startDate}T00:00:00-05:00`);
    const finalDate = new Date(`${endDate}T00:00:00-05:00`);

    while (currentDate <= finalDate) {
      dates.push(currentDate.toISOString().slice(0, 10));
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return dates;
  }

  private getTodayInLima(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(now);
  }

  private shiftDate(date: string, days: number): string {
    const shiftedDate = new Date(`${date}T00:00:00-05:00`);
    shiftedDate.setUTCDate(shiftedDate.getUTCDate() + days);
    return shiftedDate.toISOString().slice(0, 10);
  }

  private calculateAttendancePercentage(
    numerator: number,
    denominator: number,
  ): number {
    if (denominator <= 0) {
      return 0;
    }

    return Number(((numerator / denominator) * 100).toFixed(1));
  }

  private getAttendanceOperationalLabel(
    entry: AttendanceRecord | null,
    exit: AttendanceRecord | null,
    absence: AttendanceDayStatus | null,
  ): string {
    if (absence) {
      return absence.statusType === AttendanceDayStatusType.JUSTIFIED_ABSENCE
        ? 'Ausencia justificada'
        : 'Ausencia no justificada';
    }

    if (entry && exit) {
      return 'Completo';
    }

    if (entry) {
      return 'Pendiente de salida';
    }

    if (exit) {
      return 'Pendiente de entrada';
    }

    return 'Sin registro de hoy';
  }

  private toDailyMark(attendanceRecord: AttendanceRecord) {
    return {
      id: attendanceRecord.id,
      markedAt: attendanceRecord.markedAt.toISOString(),
      status: attendanceRecord.status,
      source: attendanceRecord.source,
      observation: attendanceRecord.observation,
      recordedByUserId: attendanceRecord.recordedByUserId,
    };
  }

  private toAttendanceDayStatus(
    attendanceDayStatus: AttendanceDayStatus | null,
  ) {
    if (!attendanceDayStatus) {
      return null;
    }

    return {
      id: attendanceDayStatus.id,
      statusType: attendanceDayStatus.statusType,
      observation: attendanceDayStatus.observation,
      recordedByUserId: attendanceDayStatus.recordedByUserId,
      createdAt: attendanceDayStatus.createdAt.toISOString(),
    };
  }
}
