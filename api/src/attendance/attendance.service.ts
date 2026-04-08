import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as XLSX from 'xlsx';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { AttendanceDayStatusType } from '../common/enums/attendance-day-status-type.enum';
import { AttendanceMarkType } from '../common/enums/attendance-mark-type.enum';
import { AttendanceRecordStatus } from '../common/enums/attendance-record-status.enum';
import { AttendanceSource } from '../common/enums/attendance-source.enum';
import { StudentShift } from '../common/enums/student-shift.enum';
import { StudentEnrollmentStatus } from '../common/enums/student-enrollment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { InstitutionService } from '../institution/institution.service';
import { StudentEnrollment } from '../students/entities/student-enrollment.entity';
import { Student } from '../students/entities/student.entity';
import { TutorAssignment } from '../users/entities/tutor-assignment.entity';
import { AttendanceCorrectionLogResponseDto } from './dto/attendance-correction-response.dto';
import {
  AttendanceAlertItemDto,
  AttendanceAlertsResponseDto,
  AttendanceAlertsSummaryDto,
  AttendanceOfflineContextClassroomDto,
  AttendanceOfflineContextResponseDto,
  AttendanceOfflineContextStudentDto,
  AttendanceOfflineSyncItemResultDto,
  AttendanceOfflineSyncResponseDto,
  AttendanceOfflineSyncSummaryDto,
  AttendanceAlertTypeDto,
  AttendanceRegularizationItemDto,
  AttendanceRegularizationItemTypeDto,
  AttendanceRegularizationResponseDto,
  AttendanceRegularizationSummaryDto,
  AttendanceRecordResponseDto,
  DailyAttendanceItemDto,
  DailyAttendanceResponseDto,
  DailyAttendanceSummaryDto,
  MonthlyAttendanceClassroomItemDto,
  MonthlyAttendanceReportResponseDto,
  MonthlyAttendanceReportSummaryDto,
  MonthlyAttendanceStudentItemDto,
  MyAttendanceHistoryItemDto,
  MyAttendanceHistoryResponseDto,
} from './dto/attendance-response.dto';
import { CreateAttendanceByScanDto } from './dto/create-attendance-by-scan.dto';
import { CreateAttendanceManualDto } from './dto/create-attendance-manual.dto';
import { QueryAttendanceAlertsDto } from './dto/query-attendance-alerts.dto';
import {
  AttendanceExportFormat,
  QueryAttendanceExportDto,
} from './dto/query-attendance-export.dto';
import { QueryAttendanceOfflineContextDto } from './dto/query-attendance-offline-context.dto';
import { QueryAttendanceRegularizationDto } from './dto/query-attendance-regularization.dto';
import { QueryDailyAttendanceDto } from './dto/query-daily-attendance.dto';
import { QueryMonthlyAttendanceReportDto } from './dto/query-monthly-attendance-report.dto';
import { QueryMyAttendanceHistoryDto } from './dto/query-my-attendance-history.dto';
import {
  SyncOfflineAttendanceBatchDto,
  SyncOfflineAttendanceItemDto,
} from './dto/sync-offline-attendance.dto';
import { UpsertAttendanceDayStatusDto } from './dto/upsert-attendance-day-status.dto';
import { UpdateAttendanceRecordDto } from './dto/update-attendance-record.dto';
import { AttendanceCorrectionLog } from './entities/attendance-correction-log.entity';
import { AttendanceDayStatus } from './entities/attendance-day-status.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';

type AttendanceExportRow = Record<string, string | number>;

type AttendanceExportFile = {
  fileName: string;
  contentType: string;
  buffer: Buffer;
};

type AttendanceByStudentAndDate = {
  entry: AttendanceRecord | null;
  exit: AttendanceRecord | null;
};

type AttendanceAlertComputation = {
  alertType: AttendanceAlertTypeDto;
  count: number;
  threshold: number;
  title: string;
  description: string;
  recentDates: string[];
};

type AttendanceDailyStatusMap = Map<
  string,
  {
    absence: AttendanceDayStatus | null;
    entry: AttendanceRecord | null;
    exit: AttendanceRecord | null;
  }
>;

type MonthlyAttendanceCounters = {
  attendedDays: number;
  completeDays: number;
  entriesRegistered: number;
  exitsRegistered: number;
  lateEntries: number;
  earlyDepartures: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  absences: number;
  incompleteRecords: number;
};

type CreateAttendanceRecordInput = {
  student: Student;
  attendanceDate: string;
  markType: AttendanceMarkType;
  status?: AttendanceRecordStatus;
  observation?: string;
  enrollment: StudentEnrollment;
  recordedBy: AuthenticatedRequestUser;
  source: AttendanceSource;
  recordedAt?: Date;
};

type OfflineSyncProcessingResult = {
  status: 'accepted' | 'duplicate' | 'rejected';
  message: string;
  record: AttendanceRecordResponseDto | null;
};

const ATTENDANCE_EXPORT_HEADERS = [
  'Fecha',
  'Codigo',
  'Estudiante',
  'Documento',
  'Grado',
  'Seccion',
  'Turno',
  'Estado del estudiante',
  'Estado operativo',
  'Entrada',
  'Estado entrada',
  'Fuente entrada',
  'Observacion entrada',
  'Salida',
  'Estado salida',
  'Fuente salida',
  'Observacion salida',
  'Ausencia',
  'Observacion ausencia',
] as const;

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRecordsRepository: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceCorrectionLog)
    private readonly attendanceCorrectionLogsRepository: Repository<AttendanceCorrectionLog>,
    @InjectRepository(AttendanceDayStatus)
    private readonly attendanceDayStatusesRepository: Repository<AttendanceDayStatus>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(StudentEnrollment)
    private readonly studentEnrollmentsRepository: Repository<StudentEnrollment>,
    @InjectRepository(TutorAssignment)
    private readonly tutorAssignmentsRepository: Repository<TutorAssignment>,
    private readonly institutionService: InstitutionService,
  ) {}

  async registerByScan(
    dto: CreateAttendanceByScanDto,
    recordedBy: AuthenticatedRequestUser,
  ): Promise<AttendanceRecordResponseDto> {
    const student = await this.studentsRepository.findOne({
      where: { code: dto.studentCode },
    });

    if (!student) {
      throw new NotFoundException(
        'Estudiante no encontrado para el código enviado.',
      );
    }

    this.ensureStudentIsActive(student);
    const schoolYear = await this.institutionService.getActiveSchoolYear();
    const enrollment = await this.findActiveEnrollmentForStudent(
      student.id,
      schoolYear,
    );
    const attendanceRecord = await this.createAttendanceRecord({
      student,
      attendanceDate: this.getTodayInLima(),
      markType: dto.markType,
      observation: dto.observation,
      enrollment,
      recordedBy,
      source: AttendanceSource.QR,
    });

    return this.toAttendanceRecordResponse(attendanceRecord, student);
  }

  async registerManual(
    dto: CreateAttendanceManualDto,
    recordedBy: AuthenticatedRequestUser,
  ): Promise<AttendanceRecordResponseDto> {
    const student = await this.studentsRepository.findOne({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado.');
    }

    this.ensureStudentIsActive(student);
    const enrollment = await this.findActiveEnrollmentForStudent(
      student.id,
      dto.schoolYear,
    );
    this.ensureStudentMatchesContext(enrollment, dto);

    const attendanceRecord = await this.createAttendanceRecord({
      student,
      attendanceDate: dto.attendanceDate,
      markType: dto.markType,
      status: dto.status,
      observation: dto.observation,
      enrollment,
      recordedBy,
      source: AttendanceSource.MANUAL,
    });

    return this.toAttendanceRecordResponse(attendanceRecord, student);
  }

  async getOfflineContext(
    authUser: AuthenticatedRequestUser,
    query: QueryAttendanceOfflineContextDto,
  ): Promise<AttendanceOfflineContextResponseDto> {
    const attendanceDate = query.attendanceDate ?? this.getTodayInLima();
    const schoolYear = await this.institutionService.getActiveSchoolYear();

    if (authUser.role === UserRole.TUTOR) {
      throw new ForbiddenException(
        'El contexto offline de asistencia está disponible solo para dirección, secretaría y auxiliar.',
      );
    }

    const enrollments = await this.studentEnrollmentsRepository.find({
      where: {
        schoolYear,
        status: StudentEnrollmentStatus.ACTIVE,
        isActive: true,
      },
      relations: ['student'],
      order: {
        grade: 'ASC',
        section: 'ASC',
        shift: 'ASC',
        student: {
          lastName: 'ASC',
          firstName: 'ASC',
        },
      },
    });

    const classroomMap = new Map<
      string,
      AttendanceOfflineContextClassroomDto
    >();
    const students: AttendanceOfflineContextStudentDto[] = [];

    for (const enrollment of enrollments) {
      const classroomKey = `${enrollment.grade}-${enrollment.section}-${enrollment.shift}`;
      const classroom =
        classroomMap.get(classroomKey) ??
        ({
          grade: enrollment.grade,
          section: enrollment.section,
          shift: enrollment.shift,
          totalStudents: 0,
        } satisfies AttendanceOfflineContextClassroomDto);

      classroom.totalStudents += 1;
      classroomMap.set(classroomKey, classroom);

      students.push({
        studentId: enrollment.studentId,
        code: enrollment.student.code,
        fullName:
          `${enrollment.student.lastName} ${enrollment.student.firstName}`.trim(),
        grade: enrollment.grade,
        section: enrollment.section,
        shift: enrollment.shift,
      });
    }

    return {
      context: {
        schoolYear,
        attendanceDate,
        generatedAt: new Date().toISOString(),
      },
      classrooms: Array.from(classroomMap.values()),
      students,
    };
  }

  async syncOfflineAttendance(
    dto: SyncOfflineAttendanceBatchDto,
    recordedBy: AuthenticatedRequestUser,
  ): Promise<AttendanceOfflineSyncResponseDto> {
    const items: AttendanceOfflineSyncItemResultDto[] = [];
    const summary: AttendanceOfflineSyncSummaryDto = {
      totalItems: dto.items.length,
      acceptedItems: 0,
      duplicateItems: 0,
      rejectedItems: 0,
    };

    for (const item of dto.items) {
      const result = await this.processOfflineAttendanceItem(item, recordedBy);

      if (result.status === 'accepted') {
        summary.acceptedItems += 1;
      } else if (result.status === 'duplicate') {
        summary.duplicateItems += 1;
      } else {
        summary.rejectedItems += 1;
      }

      items.push({
        clientId: item.clientId,
        status: result.status,
        message: result.message,
        record: result.record,
      });
    }

    return {
      summary,
      items,
    };
  }

  async getDailyAttendance(
    authUser: AuthenticatedRequestUser,
    query: QueryDailyAttendanceDto,
  ): Promise<DailyAttendanceResponseDto> {
    await this.ensureDailyAttendanceAccess(authUser, query);
    const items = await this.buildDailyAttendanceItems(query);

    const summary = this.buildDailyAttendanceSummary(items);

    return {
      context: {
        attendanceDate: query.attendanceDate,
        schoolYear: Number(query.schoolYear),
        grade: Number(query.grade),
        section: query.section,
        shift: query.shift,
      },
      summary,
      items,
    };
  }

  async getAttendanceAlerts(
    authUser: AuthenticatedRequestUser,
    query: QueryAttendanceAlertsDto,
  ): Promise<AttendanceAlertsResponseDto> {
    await this.ensureAlertAccess(authUser, query);

    const enrollments = await this.findEnrollmentsForAttendanceAlerts(query);

    if (!enrollments.length) {
      return {
        summary: {
          totalAlerts: 0,
          studentsWithAlerts: 0,
          consecutiveAbsenceAlerts: 0,
          repeatedIncompleteRecordAlerts: 0,
          repeatedLateEntryAlerts: 0,
        },
        items: [],
      };
    }

    const attendanceByStudentAndDate = await this.buildAttendanceDailyStatusMap(
      enrollments,
      query.schoolYear,
    );
    const items: AttendanceAlertItemDto[] = [];

    for (const enrollment of enrollments) {
      const student = enrollment.student;

      if (!student.isActive || !enrollment.isActive) {
        continue;
      }

      const studentAlerts = this.buildStudentAttendanceAlerts(
        enrollment,
        attendanceByStudentAndDate,
      );

      items.push(...studentAlerts);
    }

    items.sort((left, right) => {
      const priority = this.getAttendanceAlertPriority(left.alertType);
      const nextPriority = this.getAttendanceAlertPriority(right.alertType);

      if (priority !== nextPriority) {
        return priority - nextPriority;
      }

      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return left.fullName.localeCompare(right.fullName, 'es');
    });

    const summary = this.buildAttendanceAlertsSummary(items);
    const limitedItems = items.slice(0, query.limit ?? 50);

    return {
      summary,
      items: limitedItems,
    };
  }

  async getAttendanceRegularization(
    authUser: AuthenticatedRequestUser,
    query: QueryAttendanceRegularizationDto,
  ): Promise<AttendanceRegularizationResponseDto> {
    if (![UserRole.DIRECTOR, UserRole.SECRETARY].includes(authUser.role)) {
      throw new ForbiddenException(
        'Solo direccion y secretaria pueden revisar la bandeja de regularizacion.',
      );
    }

    if (query.from > query.to) {
      throw new BadRequestException(
        'La fecha inicial no puede ser mayor que la fecha final.',
      );
    }

    if (this.buildDateRange(query.from, query.to).length > 31) {
      throw new BadRequestException(
        'La bandeja de regularizacion admite como maximo 31 dias por consulta.',
      );
    }

    const enrollments =
      await this.findEnrollmentsForAttendanceRegularization(query);

    if (!enrollments.length) {
      return {
        context: {
          schoolYear: query.schoolYear,
          from: query.from,
          to: query.to,
          grade: query.grade ?? null,
          section: query.section ?? null,
          shift: query.shift ?? null,
          search: query.search?.trim() || null,
        },
        summary: this.buildEmptyAttendanceRegularizationSummary(),
        items: [],
      };
    }

    const schoolDates = this.buildSchoolDateRange(query.from, query.to);
    const attendanceByStudentAndDate =
      await this.buildAttendanceDailyStatusMapForRange(
        enrollments,
        query.schoolYear,
        query.from,
        query.to,
      );
    const corrections = await this.attendanceCorrectionLogsRepository.find({
      where: {
        studentId: In(enrollments.map((enrollment) => enrollment.studentId)),
        attendanceDate: Between(query.from, query.to),
      },
      relations: ['student'],
      order: {
        createdAt: 'DESC',
      },
    });
    const recurringAlertItems = enrollments.flatMap((enrollment) => {
      const alerts = this.buildStudentAttendanceAlerts(
        enrollment,
        attendanceByStudentAndDate,
      );

      if (!alerts.length) {
        return [];
      }

      const hasRecurringPattern =
        alerts.length >= 2 ||
        alerts.some((alert) => alert.count > alert.threshold);

      if (!hasRecurringPattern) {
        return [];
      }

      const recentDate =
        alerts
          .flatMap((alert) => alert.recentDates)
          .sort((left, right) => right.localeCompare(left))[0] ?? query.to;
      const labels = alerts.map((alert) =>
        this.getAttendanceAlertLabel(alert.alertType),
      );

      return [
        this.buildAttendanceRegularizationItem(
          AttendanceRegularizationItemTypeDto.HIGH_ALERT_RECURRENCE,
          enrollment.student,
          enrollment,
          recentDate,
          'Recurrencia de alertas',
          null,
          labels.join(' | '),
        ),
      ];
    });

    const items: AttendanceRegularizationItemDto[] = [];

    for (const enrollment of enrollments) {
      for (const attendanceDate of schoolDates) {
        const currentValue = attendanceByStudentAndDate.get(
          this.buildAttendanceKey(enrollment.studentId, attendanceDate),
        ) ?? {
          absence: null,
          entry: null,
          exit: null,
        };

        if (!currentValue.absence && !currentValue.entry) {
          items.push(
            this.buildAttendanceRegularizationItem(
              AttendanceRegularizationItemTypeDto.PENDING_ENTRY,
              enrollment.student,
              enrollment,
              attendanceDate,
              'Entrada pendiente',
              null,
              'Sin marca de entrada',
            ),
          );
        }

        if (!currentValue.absence && currentValue.entry && !currentValue.exit) {
          items.push(
            this.buildAttendanceRegularizationItem(
              AttendanceRegularizationItemTypeDto.PENDING_EXIT,
              enrollment.student,
              enrollment,
              attendanceDate,
              'Salida pendiente',
              currentValue.entry.observation,
              'Entrada registrada sin salida',
            ),
          );
        }

        if (currentValue.entry?.status === AttendanceRecordStatus.LATE) {
          items.push(
            this.buildAttendanceRegularizationItem(
              AttendanceRegularizationItemTypeDto.LATE_ENTRY_REVIEW,
              enrollment.student,
              enrollment,
              attendanceDate,
              'Tardanza para revisar',
              currentValue.entry.observation,
              this.formatMarkedTime(currentValue.entry.markedAt),
            ),
          );
        }

        if (
          currentValue.absence?.statusType ===
          AttendanceDayStatusType.UNJUSTIFIED_ABSENCE
        ) {
          items.push(
            this.buildAttendanceRegularizationItem(
              AttendanceRegularizationItemTypeDto.PENDING_JUSTIFICATION,
              enrollment.student,
              enrollment,
              attendanceDate,
              'Ausencia sin justificar',
              currentValue.absence.observation,
              'Pendiente de regularizacion',
            ),
          );
        }
      }
    }

    items.push(
      ...corrections.map((correction) => {
        const enrollment = enrollments.find(
          (currentEnrollment) =>
            currentEnrollment.studentId === correction.studentId,
        );

        if (!enrollment) {
          throw new NotFoundException('Estudiante no encontrado.');
        }

        return this.buildAttendanceRegularizationItem(
          AttendanceRegularizationItemTypeDto.RECENT_CORRECTION,
          enrollment.student,
          enrollment,
          correction.attendanceDate,
          `Correccion reciente de ${this.getMarkTypeLabel(correction.markType)}`,
          correction.nextData.observation,
          correction.reason,
        );
      }),
    );

    items.push(...recurringAlertItems);

    const filteredItems = items
      .filter((item) =>
        this.matchesAttendanceRegularizationSearch(item, query.search),
      )
      .sort((left, right) => {
        if (left.attendanceDate !== right.attendanceDate) {
          return right.attendanceDate.localeCompare(left.attendanceDate);
        }

        return (
          this.getAttendanceRegularizationPriority(left.itemType) -
          this.getAttendanceRegularizationPriority(right.itemType)
        );
      })
      .slice(0, query.limit ?? 120);

    return {
      context: {
        schoolYear: query.schoolYear,
        from: query.from,
        to: query.to,
        grade: query.grade ?? null,
        section: query.section ?? null,
        shift: query.shift ?? null,
        search: query.search?.trim() || null,
      },
      summary: this.buildAttendanceRegularizationSummary(filteredItems),
      items: filteredItems,
    };
  }

  async exportAttendance(
    authUser: AuthenticatedRequestUser,
    query: QueryAttendanceExportDto,
  ): Promise<AttendanceExportFile> {
    this.ensureExportAccess(authUser, query);
    const { startDate, endDate } = this.resolveAttendanceExportRange(query);
    const enrollments = await this.findEnrollmentsForAttendanceExport(query);
    const studentIds = enrollments.map((enrollment) => enrollment.studentId);
    const [attendanceRecords, attendanceDayStatuses] = studentIds.length
      ? await Promise.all([
          this.attendanceRecordsRepository.find({
            where: {
              studentId: In(studentIds),
              attendanceDate: Between(startDate, endDate),
            },
            order: {
              attendanceDate: 'ASC',
              markedAt: 'ASC',
            },
          }),
          this.attendanceDayStatusesRepository.find({
            where: {
              studentId: In(studentIds),
              attendanceDate: Between(startDate, endDate),
              isActive: true,
            },
            order: {
              attendanceDate: 'ASC',
              createdAt: 'DESC',
            },
          }),
        ])
      : [[], []];

    const attendanceByStudentAndDate = new Map<
      string,
      AttendanceByStudentAndDate
    >();
    const dayStatusByStudentAndDate = new Map<string, AttendanceDayStatus>();

    for (const attendanceRecord of attendanceRecords) {
      const attendanceKey = this.buildAttendanceKey(
        attendanceRecord.studentId,
        attendanceRecord.attendanceDate,
      );
      const currentValue = attendanceByStudentAndDate.get(attendanceKey) ?? {
        entry: null,
        exit: null,
      };

      if (attendanceRecord.markType === AttendanceMarkType.ENTRY) {
        currentValue.entry = attendanceRecord;
      } else {
        currentValue.exit = attendanceRecord;
      }

      attendanceByStudentAndDate.set(attendanceKey, currentValue);
    }

    for (const attendanceDayStatus of attendanceDayStatuses) {
      const attendanceKey = this.buildAttendanceKey(
        attendanceDayStatus.studentId,
        attendanceDayStatus.attendanceDate,
      );

      if (!dayStatusByStudentAndDate.has(attendanceKey)) {
        dayStatusByStudentAndDate.set(attendanceKey, attendanceDayStatus);
      }
    }

    const dateRange = this.buildDateRange(startDate, endDate);
    const rows: AttendanceExportRow[] = [];

    for (const attendanceDate of dateRange) {
      for (const enrollment of enrollments) {
        const attendanceKey = this.buildAttendanceKey(
          enrollment.studentId,
          attendanceDate,
        );
        const attendance = attendanceByStudentAndDate.get(attendanceKey) ?? {
          entry: null,
          exit: null,
        };
        const absence = dayStatusByStudentAndDate.get(attendanceKey) ?? null;

        rows.push(
          this.buildAttendanceExportRow(
            attendanceDate,
            enrollment,
            attendance.entry,
            attendance.exit,
            absence,
          ),
        );
      }
    }

    return this.buildAttendanceExportFile(query.format, rows, {
      schoolYear: query.schoolYear,
      startDate,
      endDate,
      grade: query.grade,
      section: query.section,
      shift: query.shift,
    });
  }

  async getMonthlyAttendanceReport(
    query: QueryMonthlyAttendanceReportDto,
  ): Promise<MonthlyAttendanceReportResponseDto> {
    const { startDate, endDate, monthLabel } =
      this.resolveMonthlyAttendanceReportRange(query);
    const schoolDates = this.buildSchoolDateRange(startDate, endDate);
    const enrollments =
      await this.findEnrollmentsForMonthlyAttendanceReport(query);
    const activeEnrollments = enrollments.filter(
      (enrollment) => enrollment.isActive && enrollment.student.isActive,
    );

    if (!activeEnrollments.length) {
      return {
        context: {
          schoolYear: query.schoolYear,
          month: query.month,
          monthLabel,
          grade: query.grade ?? null,
          section: query.section ?? null,
          shift: query.shift ?? null,
          schoolDays: schoolDates.length,
        },
        summary: this.buildEmptyMonthlyAttendanceSummary(schoolDates.length),
        classroomItems: [],
        studentItems: [],
      };
    }

    const attendanceByStudentAndDate =
      await this.buildAttendanceDailyStatusMapForRange(
        activeEnrollments,
        query.schoolYear,
        startDate,
        endDate,
      );
    const studentItems: MonthlyAttendanceStudentItemDto[] = [];
    const classroomAggregates = new Map<
      string,
      MonthlyAttendanceClassroomItemDto
    >();

    for (const enrollment of activeEnrollments) {
      const student = enrollment.student;
      const counters = this.buildMonthlyAttendanceCounters(
        enrollment.studentId,
        attendanceByStudentAndDate,
        schoolDates,
      );
      const classroomKey = `${enrollment.grade}::${enrollment.section}::${enrollment.shift}`;
      const currentClassroom =
        classroomAggregates.get(classroomKey) ??
        this.createMonthlyAttendanceClassroomItem(
          enrollment.grade,
          enrollment.section,
          enrollment.shift,
          schoolDates.length,
        );

      currentClassroom.totalStudents += 1;
      currentClassroom.attendedStudentDays += counters.attendedDays;
      currentClassroom.entriesRegistered += counters.entriesRegistered;
      currentClassroom.exitsRegistered += counters.exitsRegistered;
      currentClassroom.lateEntries += counters.lateEntries;
      currentClassroom.earlyDepartures += counters.earlyDepartures;
      currentClassroom.justifiedAbsences += counters.justifiedAbsences;
      currentClassroom.unjustifiedAbsences += counters.unjustifiedAbsences;
      currentClassroom.absences += counters.absences;
      currentClassroom.incompleteRecords += counters.incompleteRecords;
      classroomAggregates.set(classroomKey, currentClassroom);

      studentItems.push({
        studentId: student.id,
        studentCode: student.code,
        fullName: `${student.lastName} ${student.firstName}`.trim(),
        document: student.document,
        grade: enrollment.grade,
        section: enrollment.section,
        shift: enrollment.shift,
        schoolDays: schoolDates.length,
        attendedDays: counters.attendedDays,
        completeDays: counters.completeDays,
        attendancePercentage: this.calculateAttendancePercentage(
          counters.attendedDays,
          schoolDates.length,
        ),
        entriesRegistered: counters.entriesRegistered,
        exitsRegistered: counters.exitsRegistered,
        lateEntries: counters.lateEntries,
        earlyDepartures: counters.earlyDepartures,
        justifiedAbsences: counters.justifiedAbsences,
        unjustifiedAbsences: counters.unjustifiedAbsences,
        absences: counters.absences,
        incompleteRecords: counters.incompleteRecords,
      });
    }

    const classroomItems = Array.from(classroomAggregates.values()).map(
      (item) => ({
        ...item,
        attendancePercentage: this.calculateAttendancePercentage(
          item.attendedStudentDays,
          item.totalStudents * item.schoolDays,
        ),
      }),
    );

    return {
      context: {
        schoolYear: query.schoolYear,
        month: query.month,
        monthLabel,
        grade: query.grade ?? null,
        section: query.section ?? null,
        shift: query.shift ?? null,
        schoolDays: schoolDates.length,
      },
      summary: this.buildMonthlyAttendanceSummary(
        studentItems,
        classroomItems,
        schoolDates.length,
      ),
      classroomItems,
      studentItems,
    };
  }

  async getStudentAttendanceAlerts(
    enrollment: StudentEnrollment,
  ): Promise<AttendanceAlertItemDto[]> {
    if (!enrollment.isActive || !enrollment.student?.isActive) {
      return [];
    }

    const attendanceByStudentAndDate = await this.buildAttendanceDailyStatusMap(
      [enrollment],
      enrollment.schoolYear,
    );

    return this.buildStudentAttendanceAlerts(
      enrollment,
      attendanceByStudentAndDate,
    );
  }

  async getMyAttendanceHistory(
    authUser: AuthenticatedRequestUser,
    query: QueryMyAttendanceHistoryDto,
  ): Promise<MyAttendanceHistoryResponseDto> {
    if (authUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException(
        'Solo los estudiantes pueden consultar su historial de asistencia.',
      );
    }

    const student = await this.studentsRepository.findOne({
      where: {
        userId: authUser.id,
      },
    });

    if (!student) {
      throw new NotFoundException('Perfil de estudiante no encontrado.');
    }

    if (!student.isActive) {
      throw new ForbiddenException('El estudiante esta inactivo.');
    }

    const attendanceRecordWhere: FindOptionsWhere<AttendanceRecord> = {
      studentId: student.id,
    };
    const attendanceDayStatusWhere: FindOptionsWhere<AttendanceDayStatus> = {
      studentId: student.id,
      isActive: true,
    };

    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'El rango de fechas es invalido: from no puede ser mayor que to.',
      );
    }

    if (query.from && query.to) {
      attendanceRecordWhere.attendanceDate = Between(query.from, query.to);
      attendanceDayStatusWhere.attendanceDate = Between(query.from, query.to);
    } else if (query.from) {
      attendanceRecordWhere.attendanceDate = Between(query.from, '9999-12-31');
      attendanceDayStatusWhere.attendanceDate = Between(
        query.from,
        '9999-12-31',
      );
    } else if (query.to) {
      attendanceRecordWhere.attendanceDate = Between('0001-01-01', query.to);
      attendanceDayStatusWhere.attendanceDate = Between('0001-01-01', query.to);
    }

    const [attendanceRecords, attendanceDayStatuses] = await Promise.all([
      this.attendanceRecordsRepository.find({
        where: attendanceRecordWhere,
        order: {
          attendanceDate: 'DESC',
          markedAt: 'DESC',
        },
      }),
      this.attendanceDayStatusesRepository.find({
        where: attendanceDayStatusWhere,
        order: {
          attendanceDate: 'DESC',
          createdAt: 'DESC',
        },
      }),
    ]);

    const historyItems: MyAttendanceHistoryItemDto[] = [
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
    ].sort((left, right) => {
      if (left.attendanceDate !== right.attendanceDate) {
        return right.attendanceDate.localeCompare(left.attendanceDate);
      }

      const leftMarkedAt = left.markedAt ?? '';
      const rightMarkedAt = right.markedAt ?? '';

      if (leftMarkedAt !== rightMarkedAt) {
        return rightMarkedAt.localeCompare(leftMarkedAt);
      }

      return left.itemType === 'absence' ? 1 : -1;
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const total = historyItems.length;
    const items = historyItems.slice((page - 1) * limit, page * limit);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async upsertAttendanceDayStatus(
    dto: UpsertAttendanceDayStatusDto,
    recordedBy: AuthenticatedRequestUser,
  ) {
    const student = await this.studentsRepository.findOne({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado.');
    }

    this.ensureStudentIsActive(student);
    const enrollment = await this.findActiveEnrollmentForStudent(
      student.id,
      dto.schoolYear,
    );
    this.ensureStudentMatchesContext(enrollment, dto);

    const existingAttendanceRecords =
      await this.attendanceRecordsRepository.count({
        where: {
          studentId: student.id,
          attendanceDate: dto.attendanceDate,
        },
      });

    if (existingAttendanceRecords > 0) {
      throw new ConflictException(
        'No se puede registrar una ausencia porque el estudiante ya tiene asistencia registrada en esa fecha.',
      );
    }

    const existingAttendanceDayStatus =
      await this.attendanceDayStatusesRepository.findOne({
        where: {
          studentId: student.id,
          attendanceDate: dto.attendanceDate,
          isActive: true,
        },
      });

    const attendanceDayStatus = existingAttendanceDayStatus
      ? existingAttendanceDayStatus
      : this.attendanceDayStatusesRepository.create({
          studentId: student.id,
          attendanceDate: dto.attendanceDate,
          schoolYear: enrollment.schoolYear,
          grade: enrollment.grade,
          section: enrollment.section,
          shift: enrollment.shift,
          isActive: true,
        });

    attendanceDayStatus.schoolYear = enrollment.schoolYear;
    attendanceDayStatus.grade = enrollment.grade;
    attendanceDayStatus.section = enrollment.section;
    attendanceDayStatus.shift = enrollment.shift;
    attendanceDayStatus.statusType = dto.statusType;
    attendanceDayStatus.observation = dto.observation ?? null;
    attendanceDayStatus.recordedByUserId = recordedBy.id;
    attendanceDayStatus.isActive = true;
    attendanceDayStatus.resolvedAt = null;
    attendanceDayStatus.resolvedByUserId = null;

    const savedAttendanceDayStatus =
      await this.attendanceDayStatusesRepository.save(attendanceDayStatus);

    return this.toAttendanceDayStatus(savedAttendanceDayStatus);
  }

  async resolveAttendanceDayStatus(
    attendanceDayStatusId: string,
    resolvedBy: AuthenticatedRequestUser,
  ) {
    const attendanceDayStatus =
      await this.attendanceDayStatusesRepository.findOne({
        where: {
          id: attendanceDayStatusId,
          isActive: true,
        },
      });

    if (!attendanceDayStatus) {
      throw new NotFoundException(
        'Estado diario de asistencia no encontrado o ya resuelto.',
      );
    }

    attendanceDayStatus.isActive = false;
    attendanceDayStatus.resolvedAt = new Date();
    attendanceDayStatus.resolvedByUserId = resolvedBy.id;

    await this.attendanceDayStatusesRepository.save(attendanceDayStatus);

    return {
      message: 'El estado diario de asistencia fue retirado correctamente.',
      id: attendanceDayStatus.id,
    };
  }

  async correctAttendanceRecord(
    attendanceRecordId: string,
    dto: UpdateAttendanceRecordDto,
    correctedBy: AuthenticatedRequestUser,
  ): Promise<AttendanceRecordResponseDto> {
    return this.attendanceRecordsRepository.manager.transaction(
      async (manager) => {
        const attendanceRecordsRepository =
          manager.getRepository(AttendanceRecord);
        const attendanceCorrectionLogsRepository = manager.getRepository(
          AttendanceCorrectionLog,
        );
        const studentsRepository = manager.getRepository(Student);

        const attendanceRecord = await attendanceRecordsRepository.findOne({
          where: { id: attendanceRecordId },
        });

        if (!attendanceRecord) {
          throw new NotFoundException('Registro de asistencia no encontrado.');
        }

        this.ensureCorrectionAccess(attendanceRecord, dto, correctedBy);

        const student = await studentsRepository.findOne({
          where: { id: attendanceRecord.studentId },
        });

        if (!student) {
          throw new NotFoundException('Estudiante no encontrado.');
        }

        const nextObservation =
          dto.observation === undefined
            ? attendanceRecord.observation
            : (dto.observation ?? null);
        const nextStatus = this.resolveAttendanceRecordStatus(
          attendanceRecord.markType,
          dto.status ?? attendanceRecord.status,
        );
        const nextMarkedAt = this.buildCorrectedMarkedAt(
          attendanceRecord.attendanceDate,
          dto.markedTime,
        );
        const previousSnapshot = this.buildCorrectionSnapshot(attendanceRecord);
        const nextSnapshot = {
          markedAt: nextMarkedAt.toISOString(),
          markedTime: dto.markedTime,
          status: nextStatus,
          observation: nextObservation,
        };

        if (JSON.stringify(previousSnapshot) === JSON.stringify(nextSnapshot)) {
          throw new BadRequestException(
            'La correccion no contiene cambios sobre la marca seleccionada.',
          );
        }

        attendanceRecord.markedAt = nextMarkedAt;
        attendanceRecord.status = nextStatus;
        attendanceRecord.observation = nextObservation;

        const savedRecord =
          await attendanceRecordsRepository.save(attendanceRecord);

        const correctionLog = attendanceCorrectionLogsRepository.create({
          attendanceRecordId: savedRecord.id,
          studentId: savedRecord.studentId,
          attendanceDate: savedRecord.attendanceDate,
          markType: savedRecord.markType,
          reason: dto.reason.trim(),
          previousData: previousSnapshot,
          nextData: nextSnapshot,
          correctedByUserId: correctedBy.id,
        });

        await attendanceCorrectionLogsRepository.save(correctionLog);

        return this.toAttendanceRecordResponse(savedRecord, student);
      },
    );
  }

  async getAttendanceCorrectionHistory(
    attendanceRecordId: string,
    authUser: AuthenticatedRequestUser,
  ): Promise<AttendanceCorrectionLogResponseDto[]> {
    const attendanceRecord = await this.attendanceRecordsRepository.findOne({
      where: { id: attendanceRecordId },
    });

    if (!attendanceRecord) {
      throw new NotFoundException('Registro de asistencia no encontrado.');
    }

    this.ensureCorrectionHistoryAccess(attendanceRecord, authUser);

    const correctionLogs = await this.attendanceCorrectionLogsRepository.find({
      where: { attendanceRecordId },
      relations: ['correctedByUser'],
      order: { createdAt: 'DESC' },
    });

    return correctionLogs.map((correctionLog) =>
      this.toAttendanceCorrectionLogResponse(correctionLog),
    );
  }

  private async createAttendanceRecord(
    input: CreateAttendanceRecordInput,
  ): Promise<AttendanceRecord> {
    const status = this.resolveAttendanceRecordStatus(
      input.markType,
      input.status,
    );

    const activeAttendanceDayStatus =
      await this.attendanceDayStatusesRepository.findOne({
        where: {
          studentId: input.student.id,
          attendanceDate: input.attendanceDate,
          isActive: true,
        },
      });

    if (activeAttendanceDayStatus) {
      throw new ConflictException(
        'Existe una ausencia registrada para este estudiante en la fecha indicada. Retirala desde soporte administrativo antes de registrar asistencia.',
      );
    }

    const existingRecord = await this.attendanceRecordsRepository.findOne({
      where: {
        studentId: input.student.id,
        attendanceDate: input.attendanceDate,
        markType: input.markType,
      },
    });

    if (existingRecord) {
      throw new ConflictException(
        `Ya existe una marca de ${this.getMarkTypeLabel(input.markType)} para este estudiante en la fecha indicada.`,
      );
    }

    if (input.markType === AttendanceMarkType.EXIT) {
      const entryRecord = await this.attendanceRecordsRepository.findOne({
        where: {
          studentId: input.student.id,
          attendanceDate: input.attendanceDate,
          markType: AttendanceMarkType.ENTRY,
        },
      });

      if (!entryRecord) {
        throw new ConflictException(
          'No se puede registrar salida sin una entrada previa para este estudiante en la fecha indicada.',
        );
      }
    }

    const attendanceRecord = this.attendanceRecordsRepository.create({
      studentId: input.student.id,
      attendanceDate: input.attendanceDate,
      markType: input.markType,
      status,
      source: input.source,
      markedAt: input.recordedAt ?? new Date(),
      recordedByUserId: input.recordedBy.id,
      schoolYear: input.enrollment.schoolYear,
      grade: input.enrollment.grade,
      section: input.enrollment.section,
      shift: input.enrollment.shift,
      observation: input.observation?.trim() || null,
    });

    return this.attendanceRecordsRepository.save(attendanceRecord);
  }

  private async buildDailyAttendanceItems(
    query: QueryDailyAttendanceDto,
  ): Promise<DailyAttendanceItemDto[]> {
    const enrollments = await this.studentEnrollmentsRepository.find({
      where: {
        schoolYear: query.schoolYear,
        grade: query.grade,
        section: query.section,
        shift: query.shift,
        status: StudentEnrollmentStatus.ACTIVE,
      },
      relations: ['student'],
      order: {
        student: {
          lastName: 'ASC',
          firstName: 'ASC',
        },
      },
    });

    const [attendanceRecords, attendanceDayStatuses] = enrollments.length
      ? await Promise.all([
          this.attendanceRecordsRepository.find({
            where: {
              attendanceDate: query.attendanceDate,
              schoolYear: query.schoolYear,
              grade: query.grade,
              section: query.section,
              shift: query.shift,
            },
            order: {
              markedAt: 'ASC',
            },
          }),
          this.attendanceDayStatusesRepository.find({
            where: {
              attendanceDate: query.attendanceDate,
              schoolYear: query.schoolYear,
              grade: query.grade,
              section: query.section,
              shift: query.shift,
              isActive: true,
            },
            order: {
              createdAt: 'DESC',
            },
          }),
        ])
      : [[], []];

    const recordsByStudentId = new Map<string, AttendanceRecord[]>();
    const dayStatusByStudentId = new Map<string, AttendanceDayStatus>();

    for (const attendanceRecord of attendanceRecords) {
      const studentRecords =
        recordsByStudentId.get(attendanceRecord.studentId) ?? [];
      studentRecords.push(attendanceRecord);
      recordsByStudentId.set(attendanceRecord.studentId, studentRecords);
    }

    for (const attendanceDayStatus of attendanceDayStatuses) {
      if (!dayStatusByStudentId.has(attendanceDayStatus.studentId)) {
        dayStatusByStudentId.set(
          attendanceDayStatus.studentId,
          attendanceDayStatus,
        );
      }
    }

    return enrollments.map((enrollment) => {
      const student = enrollment.student;
      const studentRecords = recordsByStudentId.get(student.id) ?? [];
      const entry =
        studentRecords.find(
          (attendanceRecord) =>
            attendanceRecord.markType === AttendanceMarkType.ENTRY,
        ) ?? null;
      const exit =
        studentRecords.find(
          (attendanceRecord) =>
            attendanceRecord.markType === AttendanceMarkType.EXIT,
        ) ?? null;

      return {
        studentId: student.id,
        code: student.code,
        fullName: `${student.lastName} ${student.firstName}`.trim(),
        isActive: student.isActive && enrollment.isActive,
        absence: this.toAttendanceDayStatus(
          dayStatusByStudentId.get(student.id) ?? null,
        ),
        entry: entry ? this.toDailyMark(entry) : null,
        exit: exit ? this.toDailyMark(exit) : null,
      };
    });
  }

  private ensureAlertAccess(
    authUser: AuthenticatedRequestUser,
    query: QueryAttendanceAlertsDto,
  ): Promise<void> | void {
    if (
      authUser.role === UserRole.AUXILIARY &&
      (typeof query.grade !== 'number' || !query.section || !query.shift)
    ) {
      throw new BadRequestException(
        'El auxiliar debe seleccionar grado, seccion y turno para revisar alertas del aula.',
      );
    }

    if (
      authUser.role === UserRole.TUTOR &&
      (typeof query.grade !== 'number' || !query.section || !query.shift)
    ) {
      throw new BadRequestException(
        'El tutor debe seleccionar una de sus secciones para revisar alertas.',
      );
    }

    if (
      authUser.role === UserRole.TUTOR &&
      typeof query.grade === 'number' &&
      query.section &&
      query.shift
    ) {
      return this.ensureTutorAssignmentAccess(authUser.id, {
        schoolYear: query.schoolYear,
        grade: query.grade,
        section: query.section,
        shift: query.shift,
      });
    }
  }

  private async ensureDailyAttendanceAccess(
    authUser: AuthenticatedRequestUser,
    query: QueryDailyAttendanceDto,
  ): Promise<void> {
    if (authUser.role === UserRole.TUTOR) {
      await this.ensureTutorAssignmentAccess(authUser.id, query);
    }
  }

  private ensureExportAccess(
    authUser: AuthenticatedRequestUser,
    query: QueryAttendanceExportDto,
  ): void {
    if (authUser.role !== UserRole.AUXILIARY) {
      return;
    }

    if (typeof query.grade !== 'number' || !query.section || !query.shift) {
      throw new BadRequestException(
        'El auxiliar debe seleccionar grado, seccion y turno para exportar el aula actual.',
      );
    }

    if (query.attendanceDate) {
      return;
    }

    if (query.from && query.to && query.from === query.to) {
      return;
    }

    throw new BadRequestException(
      'El auxiliar solo puede exportar una fecha unica del aula seleccionada.',
    );
  }

  private ensureCorrectionAccess(
    attendanceRecord: AttendanceRecord,
    dto: UpdateAttendanceRecordDto,
    correctedBy: AuthenticatedRequestUser,
  ): void {
    if (correctedBy.role !== UserRole.AUXILIARY) {
      return;
    }

    if (attendanceRecord.attendanceDate !== this.getTodayInLima()) {
      throw new ForbiddenException(
        'El auxiliar solo puede corregir marcas del dia actual.',
      );
    }

    if (
      dto.schoolYear !== attendanceRecord.schoolYear ||
      dto.grade !== attendanceRecord.grade ||
      dto.section !== attendanceRecord.section ||
      dto.shift !== attendanceRecord.shift
    ) {
      throw new ForbiddenException(
        'La correccion del auxiliar debe coincidir con el aula activa de la marca seleccionada.',
      );
    }
  }

  private ensureCorrectionHistoryAccess(
    attendanceRecord: AttendanceRecord,
    authUser: AuthenticatedRequestUser,
  ): void {
    if (authUser.role !== UserRole.AUXILIARY) {
      return;
    }

    if (attendanceRecord.attendanceDate !== this.getTodayInLima()) {
      throw new ForbiddenException(
        'El auxiliar solo puede revisar historial de correcciones del dia actual.',
      );
    }
  }

  private async ensureTutorAssignmentAccess(
    tutorUserId: string,
    query: {
      schoolYear: number;
      grade: number;
      section: string;
      shift: StudentShift;
    },
  ): Promise<void> {
    const assignment = await this.tutorAssignmentsRepository.findOne({
      where: {
        tutorUserId,
        schoolYear: query.schoolYear,
        grade: query.grade,
        section: query.section,
        shift: query.shift,
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'Solo puedes revisar aulas que esten asignadas a tu cuenta de tutor.',
      );
    }
  }

  private async findEnrollmentsForAttendanceAlerts(
    query: QueryAttendanceAlertsDto,
  ): Promise<StudentEnrollment[]> {
    const where: FindOptionsWhere<StudentEnrollment> = {
      schoolYear: query.schoolYear,
      status: StudentEnrollmentStatus.ACTIVE,
    };

    if (typeof query.grade === 'number') {
      where.grade = query.grade;
    }

    if (query.section) {
      where.section = query.section;
    }

    if (query.shift) {
      where.shift = query.shift;
    }

    const enrollments = await this.studentEnrollmentsRepository.find({
      where,
      relations: ['student'],
      order: {
        grade: 'ASC',
        section: 'ASC',
        shift: 'ASC',
        student: {
          lastName: 'ASC',
          firstName: 'ASC',
        },
      },
    });

    if (!query.search) {
      return enrollments;
    }

    const normalizedSearch = query.search.trim().toLowerCase();

    return enrollments.filter((enrollment) => {
      const student = enrollment.student;
      const fullName = `${student.lastName} ${student.firstName}`
        .trim()
        .toLowerCase();

      return (
        student.code.toLowerCase().includes(normalizedSearch) ||
        fullName.includes(normalizedSearch) ||
        (student.document?.toLowerCase().includes(normalizedSearch) ?? false)
      );
    });
  }

  private async findEnrollmentsForMonthlyAttendanceReport(
    query: QueryMonthlyAttendanceReportDto,
  ): Promise<StudentEnrollment[]> {
    const where: FindOptionsWhere<StudentEnrollment> = {
      schoolYear: query.schoolYear,
      status: StudentEnrollmentStatus.ACTIVE,
    };

    if (typeof query.grade === 'number') {
      where.grade = query.grade;
    }

    if (query.section) {
      where.section = query.section;
    }

    if (query.shift) {
      where.shift = query.shift;
    }

    const enrollments = await this.studentEnrollmentsRepository.find({
      where,
      relations: ['student'],
      order: {
        grade: 'ASC',
        section: 'ASC',
        shift: 'ASC',
        student: {
          lastName: 'ASC',
          firstName: 'ASC',
        },
      },
    });

    if (!query.search) {
      return enrollments;
    }

    const normalizedSearch = query.search.trim().toLowerCase();

    return enrollments.filter((enrollment) => {
      const student = enrollment.student;
      const fullName = `${student.lastName} ${student.firstName}`
        .trim()
        .toLowerCase();

      return (
        student.code.toLowerCase().includes(normalizedSearch) ||
        fullName.includes(normalizedSearch) ||
        (student.document?.toLowerCase().includes(normalizedSearch) ?? false)
      );
    });
  }

  private async buildAttendanceDailyStatusMap(
    enrollments: StudentEnrollment[],
    schoolYear: number,
  ): Promise<AttendanceDailyStatusMap> {
    return this.buildAttendanceDailyStatusMapForRange(
      enrollments,
      schoolYear,
      null,
      null,
    );
  }

  private async buildAttendanceDailyStatusMapForRange(
    enrollments: StudentEnrollment[],
    schoolYear: number,
    startDate: string | null,
    endDate: string | null,
  ): Promise<AttendanceDailyStatusMap> {
    const studentIds = enrollments.map((enrollment) => enrollment.studentId);

    if (!studentIds.length) {
      return new Map();
    }

    const attendanceRecordWhere: FindOptionsWhere<AttendanceRecord> = {
      studentId: In(studentIds),
      schoolYear,
    };
    const attendanceDayStatusWhere: FindOptionsWhere<AttendanceDayStatus> = {
      studentId: In(studentIds),
      schoolYear,
      isActive: true,
    };

    if (startDate && endDate) {
      attendanceRecordWhere.attendanceDate = Between(startDate, endDate);
      attendanceDayStatusWhere.attendanceDate = Between(startDate, endDate);
    }

    const [attendanceRecords, attendanceDayStatuses] = await Promise.all([
      this.attendanceRecordsRepository.find({
        where: attendanceRecordWhere,
        order: {
          attendanceDate: 'ASC',
          markedAt: 'ASC',
        },
      }),
      this.attendanceDayStatusesRepository.find({
        where: attendanceDayStatusWhere,
        order: {
          attendanceDate: 'ASC',
          createdAt: 'DESC',
        },
      }),
    ]);

    const attendanceByStudentAndDate: AttendanceDailyStatusMap = new Map();

    for (const attendanceRecord of attendanceRecords) {
      const attendanceKey = this.buildAttendanceKey(
        attendanceRecord.studentId,
        attendanceRecord.attendanceDate,
      );
      const currentValue = attendanceByStudentAndDate.get(attendanceKey) ?? {
        absence: null,
        entry: null,
        exit: null,
      };

      if (attendanceRecord.markType === AttendanceMarkType.ENTRY) {
        currentValue.entry = attendanceRecord;
      } else {
        currentValue.exit = attendanceRecord;
      }

      attendanceByStudentAndDate.set(attendanceKey, currentValue);
    }

    for (const attendanceDayStatus of attendanceDayStatuses) {
      const attendanceKey = this.buildAttendanceKey(
        attendanceDayStatus.studentId,
        attendanceDayStatus.attendanceDate,
      );
      const currentValue = attendanceByStudentAndDate.get(attendanceKey) ?? {
        absence: null,
        entry: null,
        exit: null,
      };

      if (!currentValue.absence) {
        currentValue.absence = attendanceDayStatus;
      }

      attendanceByStudentAndDate.set(attendanceKey, currentValue);
    }

    return attendanceByStudentAndDate;
  }

  private buildStudentAttendanceAlerts(
    enrollment: StudentEnrollment,
    attendanceByStudentAndDate: AttendanceDailyStatusMap,
  ): AttendanceAlertItemDto[] {
    const student = enrollment.student;
    const entries = [...attendanceByStudentAndDate.entries()].filter(([key]) =>
      key.startsWith(`${student.id}::`),
    );

    const alerts: AttendanceAlertItemDto[] = [];
    const consecutiveAbsenceAlert = this.buildConsecutiveAbsenceAlert(entries);
    const repeatedIncompleteAlert =
      this.buildRepeatedIncompleteRecordsAlert(entries);
    const repeatedLateEntriesAlert =
      this.buildRepeatedLateEntriesAlert(entries);

    for (const alert of [
      consecutiveAbsenceAlert,
      repeatedIncompleteAlert,
      repeatedLateEntriesAlert,
    ]) {
      if (!alert) {
        continue;
      }

      alerts.push({
        alertType: alert.alertType,
        studentId: student.id,
        studentCode: student.code,
        fullName: `${student.lastName} ${student.firstName}`.trim(),
        document: student.document,
        grade: enrollment.grade,
        section: enrollment.section,
        shift: enrollment.shift,
        count: alert.count,
        threshold: alert.threshold,
        title: alert.title,
        description: alert.description,
        recentDates: alert.recentDates,
      });
    }

    return alerts;
  }

  private buildConsecutiveAbsenceAlert(
    entries: Array<[string, { absence: AttendanceDayStatus | null }]>,
  ): AttendanceAlertComputation | null {
    const absenceDates = entries
      .filter(([, value]) => Boolean(value.absence))
      .map(([, value]) => value.absence?.attendanceDate ?? '')
      .filter((date) => date.length > 0)
      .sort();

    if (absenceDates.length < 3) {
      return null;
    }

    const today = this.getTodayInLima();
    const windowStart = this.shiftDate(today, -30);
    const streaks: string[][] = [];
    let currentStreak: string[] = [absenceDates[0]];

    for (let index = 1; index < absenceDates.length; index += 1) {
      const currentDate = absenceDates[index];
      const previousDate = absenceDates[index - 1];

      if (this.getNextSchoolDay(previousDate) === currentDate) {
        currentStreak.push(currentDate);
        continue;
      }

      streaks.push(currentStreak);
      currentStreak = [currentDate];
    }

    streaks.push(currentStreak);

    const qualifyingStreaks = streaks.filter(
      (streak) =>
        streak.length >= 3 && streak[streak.length - 1] >= windowStart,
    );

    if (!qualifyingStreaks.length) {
      return null;
    }

    const mostRecentStreak = qualifyingStreaks[qualifyingStreaks.length - 1];
    const lastDate = mostRecentStreak[mostRecentStreak.length - 1];

    return {
      alertType: AttendanceAlertTypeDto.CONSECUTIVE_ABSENCES,
      count: mostRecentStreak.length,
      threshold: 3,
      title: 'Ausencias consecutivas',
      description: `${mostRecentStreak.length} ausencias consecutivas hasta el ${this.formatAlertDate(lastDate)}.`,
      recentDates: mostRecentStreak.slice(-5).reverse(),
    };
  }

  private buildRepeatedIncompleteRecordsAlert(
    entries: Array<
      [
        string,
        {
          absence: AttendanceDayStatus | null;
          entry: AttendanceRecord | null;
          exit: AttendanceRecord | null;
        },
      ]
    >,
  ): AttendanceAlertComputation | null {
    const today = this.getTodayInLima();
    const windowStart = this.shiftDate(today, -30);
    const incompleteDates = entries
      .filter(([key, value]) => {
        const attendanceDate = key.split('::')[1];

        return (
          attendanceDate >= windowStart &&
          !value.absence &&
          Boolean(value.entry) !== Boolean(value.exit)
        );
      })
      .map(([key]) => key.split('::')[1])
      .sort();

    if (incompleteDates.length < 3) {
      return null;
    }

    return {
      alertType: AttendanceAlertTypeDto.REPEATED_INCOMPLETE_RECORDS,
      count: incompleteDates.length,
      threshold: 3,
      title: 'Registros incompletos repetidos',
      description: `${incompleteDates.length} dias con solo entrada o solo salida en los ultimos 30 dias.`,
      recentDates: incompleteDates.slice(-5).reverse(),
    };
  }

  private buildRepeatedLateEntriesAlert(
    entries: Array<[string, { entry: AttendanceRecord | null }]>,
  ): AttendanceAlertComputation | null {
    const today = this.getTodayInLima();
    const windowStart = this.shiftDate(today, -30);
    const lateDates = entries
      .filter(([key, value]) => {
        const attendanceDate = key.split('::')[1];

        return (
          attendanceDate >= windowStart &&
          value.entry?.status === AttendanceRecordStatus.LATE
        );
      })
      .map(([key]) => key.split('::')[1])
      .sort();

    if (lateDates.length < 3) {
      return null;
    }

    return {
      alertType: AttendanceAlertTypeDto.REPEATED_LATE_ENTRIES,
      count: lateDates.length,
      threshold: 3,
      title: 'Tardanzas repetidas',
      description: `${lateDates.length} entradas con tardanza en los ultimos 30 dias.`,
      recentDates: lateDates.slice(-5).reverse(),
    };
  }

  private buildAttendanceAlertsSummary(
    items: AttendanceAlertItemDto[],
  ): AttendanceAlertsSummaryDto {
    return {
      totalAlerts: items.length,
      studentsWithAlerts: new Set(items.map((item) => item.studentId)).size,
      consecutiveAbsenceAlerts: items.filter(
        (item) =>
          item.alertType === AttendanceAlertTypeDto.CONSECUTIVE_ABSENCES,
      ).length,
      repeatedIncompleteRecordAlerts: items.filter(
        (item) =>
          item.alertType === AttendanceAlertTypeDto.REPEATED_INCOMPLETE_RECORDS,
      ).length,
      repeatedLateEntryAlerts: items.filter(
        (item) =>
          item.alertType === AttendanceAlertTypeDto.REPEATED_LATE_ENTRIES,
      ).length,
    };
  }

  private ensureStudentIsActive(student: Student): void {
    if (!student.isActive) {
      throw new ForbiddenException('El estudiante esta inactivo.');
    }
  }

  private async findActiveEnrollmentForStudent(
    studentId: string,
    schoolYear: number,
  ): Promise<StudentEnrollment> {
    const enrollment = await this.studentEnrollmentsRepository.findOne({
      where: {
        studentId,
        schoolYear,
        status: StudentEnrollmentStatus.ACTIVE,
      },
    });

    if (!enrollment || !enrollment.isActive) {
      throw new ForbiddenException(
        'El estudiante no tiene una asignacion activa para el anio escolar indicado.',
      );
    }

    return enrollment;
  }

  private ensureStudentMatchesContext(
    enrollment: StudentEnrollment,
    dto: {
      attendanceDate: string;
      schoolYear: number;
      grade: number;
      section: string;
      shift: StudentEnrollment['shift'];
    },
  ): void {
    if (
      enrollment.schoolYear !== dto.schoolYear ||
      enrollment.grade !== dto.grade ||
      enrollment.section !== dto.section ||
      enrollment.shift !== dto.shift
    ) {
      throw new UnprocessableEntityException(
        'El estudiante no pertenece al grado, seccion, turno o anio escolar seleccionados.',
      );
    }
  }

  private async processOfflineAttendanceItem(
    item: SyncOfflineAttendanceItemDto,
    recordedBy: AuthenticatedRequestUser,
  ): Promise<OfflineSyncProcessingResult> {
    try {
      const student = await this.resolveOfflineSyncStudent(item);
      this.ensureStudentIsActive(student);

      const enrollment = await this.findActiveEnrollmentForStudent(
        student.id,
        item.schoolYear,
      );
      this.ensureStudentMatchesContext(enrollment, item);

      const recordedAt = new Date(item.markedAt);

      if (Number.isNaN(recordedAt.getTime())) {
        throw new BadRequestException(
          'La marca offline no tiene una fecha y hora válidas para sincronizar.',
        );
      }

      const attendanceRecord = await this.createAttendanceRecord({
        student,
        attendanceDate: item.attendanceDate,
        markType: item.markType,
        status: item.status,
        observation: item.observation,
        enrollment,
        recordedBy,
        source: item.source,
        recordedAt,
      });

      return {
        status: 'accepted',
        message: 'La marca pendiente se sincronizó correctamente.',
        record: this.toAttendanceRecordResponse(attendanceRecord, student),
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        const duplicateRecord =
          await this.findDuplicateOfflineAttendanceRecord(item);

        if (duplicateRecord) {
          const student = await this.studentsRepository.findOne({
            where:
              item.source === AttendanceSource.QR
                ? { code: item.studentCode }
                : { id: item.studentId },
          });

          if (student) {
            return {
              status: 'duplicate',
              message:
                'La marca ya existía en el servidor y se tomó como sincronizada.',
              record: this.toAttendanceRecordResponse(duplicateRecord, student),
            };
          }
        }

        return {
          status: 'rejected',
          message: error.message,
          record: null,
        };
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof UnprocessableEntityException
      ) {
        return {
          status: 'rejected',
          message: error.message,
          record: null,
        };
      }

      throw error;
    }
  }

  private async resolveOfflineSyncStudent(
    item: SyncOfflineAttendanceItemDto,
  ): Promise<Student> {
    if (item.source === AttendanceSource.QR && !item.studentCode) {
      throw new BadRequestException(
        'La marca offline no incluye el código del estudiante.',
      );
    }

    if (item.source === AttendanceSource.MANUAL && !item.studentId) {
      throw new BadRequestException(
        'La marca offline no incluye el identificador del estudiante.',
      );
    }

    const student = await this.studentsRepository.findOne({
      where:
        item.source === AttendanceSource.QR
          ? { code: item.studentCode }
          : { id: item.studentId },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado para sincronizar.');
    }

    return student;
  }

  private findDuplicateOfflineAttendanceRecord(
    item: SyncOfflineAttendanceItemDto,
  ): Promise<AttendanceRecord | null> {
    if (item.source === AttendanceSource.QR) {
      if (!item.studentCode) {
        return Promise.resolve(null);
      }

      return this.attendanceRecordsRepository
        .createQueryBuilder('record')
        .innerJoin('record.student', 'student')
        .where('student.code = :studentCode', {
          studentCode: item.studentCode,
        })
        .andWhere('record.attendanceDate = :attendanceDate', {
          attendanceDate: item.attendanceDate,
        })
        .andWhere('record.markType = :markType', {
          markType: item.markType,
        })
        .getOne();
    }

    if (!item.studentId) {
      return Promise.resolve(null);
    }

    return this.attendanceRecordsRepository.findOne({
      where: {
        studentId: item.studentId,
        attendanceDate: item.attendanceDate,
        markType: item.markType,
      },
    });
  }

  private toAttendanceRecordResponse(
    attendanceRecord: AttendanceRecord,
    student: Student,
  ): AttendanceRecordResponseDto {
    return {
      id: attendanceRecord.id,
      studentId: student.id,
      studentCode: student.code,
      fullName: `${student.lastName} ${student.firstName}`.trim(),
      attendanceDate: attendanceRecord.attendanceDate,
      markType: attendanceRecord.markType,
      status: attendanceRecord.status,
      source: attendanceRecord.source,
      markedAt: attendanceRecord.markedAt.toISOString(),
      recordedByUserId: attendanceRecord.recordedByUserId,
      schoolYear: attendanceRecord.schoolYear,
      grade: attendanceRecord.grade,
      section: attendanceRecord.section,
      shift: attendanceRecord.shift,
      observation: attendanceRecord.observation,
    };
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

  private async findEnrollmentsForAttendanceExport(
    query: QueryAttendanceExportDto,
  ): Promise<StudentEnrollment[]> {
    const where: FindOptionsWhere<StudentEnrollment> = {
      schoolYear: query.schoolYear,
      status: StudentEnrollmentStatus.ACTIVE,
    };

    if (typeof query.grade === 'number') {
      where.grade = query.grade;
    }

    if (typeof query.section === 'string' && query.section.length > 0) {
      where.section = query.section;
    }

    if (typeof query.shift === 'string' && query.shift.length > 0) {
      where.shift = query.shift;
    }

    return this.studentEnrollmentsRepository.find({
      where,
      relations: ['student'],
      order: {
        grade: 'ASC',
        section: 'ASC',
        shift: 'ASC',
        student: {
          lastName: 'ASC',
          firstName: 'ASC',
        },
      },
    });
  }

  private async findEnrollmentsForAttendanceRegularization(
    query: QueryAttendanceRegularizationDto,
  ): Promise<StudentEnrollment[]> {
    const queryBuilder = this.studentEnrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.student', 'student')
      .where('enrollment.schoolYear = :schoolYear', {
        schoolYear: query.schoolYear,
      })
      .andWhere('enrollment.isActive = true')
      .andWhere('enrollment.status IN (:...statuses)', {
        statuses: [
          StudentEnrollmentStatus.ACTIVE,
          StudentEnrollmentStatus.OBSERVED,
        ],
      });

    if (typeof query.grade === 'number') {
      queryBuilder.andWhere('enrollment.grade = :grade', {
        grade: query.grade,
      });
    }

    if (typeof query.section === 'string' && query.section.length > 0) {
      queryBuilder.andWhere('enrollment.section = :section', {
        section: query.section,
      });
    }

    if (typeof query.shift === 'string' && query.shift.length > 0) {
      queryBuilder.andWhere('enrollment.shift = :shift', {
        shift: query.shift,
      });
    }

    return queryBuilder
      .orderBy('enrollment.grade', 'ASC')
      .addOrderBy('enrollment.section', 'ASC')
      .addOrderBy('enrollment.shift', 'ASC')
      .addOrderBy('student.lastName', 'ASC')
      .addOrderBy('student.firstName', 'ASC')
      .getMany();
  }

  private resolveMonthlyAttendanceReportRange(
    query: QueryMonthlyAttendanceReportDto,
  ): { startDate: string; endDate: string; monthLabel: string } {
    const [yearText, monthText] = query.month.split('-');
    const year = Number(yearText);
    const month = Number(monthText);

    if (year !== query.schoolYear) {
      throw new BadRequestException(
        'El mes seleccionado debe pertenecer al anio escolar enviado.',
      );
    }

    const startDate = `${query.month}-01`;
    const finalDate = new Date(Date.UTC(year, month, 0));
    const endDate = `${query.month}-${String(finalDate.getUTCDate()).padStart(2, '0')}`;
    const monthLabel = new Intl.DateTimeFormat('es-PE', {
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Lima',
    }).format(new Date(`${startDate}T00:00:00-05:00`));

    return {
      startDate,
      endDate,
      monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    };
  }

  private resolveAttendanceExportRange(query: QueryAttendanceExportDto): {
    startDate: string;
    endDate: string;
  } {
    if (query.attendanceDate && (query.from || query.to)) {
      throw new BadRequestException(
        'Usa una fecha unica o un rango de fechas, pero no ambos al mismo tiempo.',
      );
    }

    if (query.attendanceDate) {
      return {
        startDate: query.attendanceDate,
        endDate: query.attendanceDate,
      };
    }

    if (!query.from || !query.to) {
      throw new BadRequestException(
        'Debes enviar attendanceDate o el rango completo from y to para exportar.',
      );
    }

    if (query.from > query.to) {
      throw new BadRequestException(
        'El rango de fechas es invalido: from no puede ser mayor que to.',
      );
    }

    const dateRange = this.buildDateRange(query.from, query.to);

    if (dateRange.length > 62) {
      throw new BadRequestException(
        'La exportacion admite como maximo 62 dias por archivo para mantenerla practica y legible.',
      );
    }

    return {
      startDate: query.from,
      endDate: query.to,
    };
  }

  private buildMonthlyAttendanceCounters(
    studentId: string,
    attendanceByStudentAndDate: AttendanceDailyStatusMap,
    schoolDates: string[],
  ): MonthlyAttendanceCounters {
    const counters: MonthlyAttendanceCounters = {
      attendedDays: 0,
      completeDays: 0,
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
      const currentValue = attendanceByStudentAndDate.get(
        this.buildAttendanceKey(studentId, attendanceDate),
      ) ?? {
        absence: null,
        entry: null,
        exit: null,
      };

      if (currentValue.absence) {
        counters.absences += 1;

        if (
          currentValue.absence.statusType ===
          AttendanceDayStatusType.JUSTIFIED_ABSENCE
        ) {
          counters.justifiedAbsences += 1;
        } else {
          counters.unjustifiedAbsences += 1;
        }

        continue;
      }

      if (currentValue.entry || currentValue.exit) {
        counters.attendedDays += 1;
      }

      if (currentValue.entry) {
        counters.entriesRegistered += 1;

        if (currentValue.entry.status === AttendanceRecordStatus.LATE) {
          counters.lateEntries += 1;
        }
      }

      if (currentValue.exit) {
        counters.exitsRegistered += 1;

        if (
          currentValue.exit.status === AttendanceRecordStatus.EARLY_DEPARTURE
        ) {
          counters.earlyDepartures += 1;
        }
      }

      if (currentValue.entry && currentValue.exit) {
        counters.completeDays += 1;
      }

      if (Boolean(currentValue.entry) !== Boolean(currentValue.exit)) {
        counters.incompleteRecords += 1;
      }
    }

    return counters;
  }

  private createMonthlyAttendanceClassroomItem(
    grade: number,
    section: string,
    shift: StudentShift,
    schoolDays: number,
  ): MonthlyAttendanceClassroomItemDto {
    return {
      grade,
      section,
      shift,
      totalStudents: 0,
      schoolDays,
      attendancePercentage: 0,
      attendedStudentDays: 0,
      entriesRegistered: 0,
      exitsRegistered: 0,
      lateEntries: 0,
      earlyDepartures: 0,
      justifiedAbsences: 0,
      unjustifiedAbsences: 0,
      absences: 0,
      incompleteRecords: 0,
    };
  }

  private buildMonthlyAttendanceSummary(
    studentItems: MonthlyAttendanceStudentItemDto[],
    classroomItems: MonthlyAttendanceClassroomItemDto[],
    schoolDays: number,
  ): MonthlyAttendanceReportSummaryDto {
    const totalStudents = studentItems.length;
    const expectedStudentDays = totalStudents * schoolDays;
    const attendedStudentDays = studentItems.reduce(
      (total, item) => total + item.attendedDays,
      0,
    );
    const entriesRegistered = studentItems.reduce(
      (total, item) => total + item.entriesRegistered,
      0,
    );
    const exitsRegistered = studentItems.reduce(
      (total, item) => total + item.exitsRegistered,
      0,
    );
    const lateEntries = studentItems.reduce(
      (total, item) => total + item.lateEntries,
      0,
    );
    const earlyDepartures = studentItems.reduce(
      (total, item) => total + item.earlyDepartures,
      0,
    );
    const justifiedAbsences = studentItems.reduce(
      (total, item) => total + item.justifiedAbsences,
      0,
    );
    const unjustifiedAbsences = studentItems.reduce(
      (total, item) => total + item.unjustifiedAbsences,
      0,
    );
    const absences = studentItems.reduce(
      (total, item) => total + item.absences,
      0,
    );
    const incompleteRecords = studentItems.reduce(
      (total, item) => total + item.incompleteRecords,
      0,
    );

    return {
      totalStudents,
      schoolDays,
      expectedStudentDays,
      attendedStudentDays,
      attendancePercentage: this.calculateAttendancePercentage(
        attendedStudentDays,
        expectedStudentDays,
      ),
      entriesRegistered,
      exitsRegistered,
      lateEntries,
      earlyDepartures,
      justifiedAbsences,
      unjustifiedAbsences,
      absences,
      incompleteRecords,
      classroomsCount: classroomItems.length,
    };
  }

  private buildEmptyMonthlyAttendanceSummary(
    schoolDays: number,
  ): MonthlyAttendanceReportSummaryDto {
    return {
      totalStudents: 0,
      schoolDays,
      expectedStudentDays: 0,
      attendedStudentDays: 0,
      attendancePercentage: 0,
      entriesRegistered: 0,
      exitsRegistered: 0,
      lateEntries: 0,
      earlyDepartures: 0,
      justifiedAbsences: 0,
      unjustifiedAbsences: 0,
      absences: 0,
      incompleteRecords: 0,
      classroomsCount: 0,
    };
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

  private buildSchoolDateRange(startDate: string, endDate: string): string[] {
    return this.buildDateRange(startDate, endDate).filter((date) => {
      const dayOfWeek = new Date(`${date}T00:00:00-05:00`).getUTCDay();

      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });
  }

  private buildAttendanceExportRow(
    attendanceDate: string,
    enrollment: StudentEnrollment,
    entry: AttendanceRecord | null,
    exit: AttendanceRecord | null,
    absence: AttendanceDayStatus | null,
  ): AttendanceExportRow {
    const student = enrollment.student;
    const studentIsActive = student.isActive && enrollment.isActive;

    return {
      Fecha: attendanceDate,
      Codigo: student.code,
      Estudiante: `${student.lastName} ${student.firstName}`.trim(),
      Documento: student.document ?? '',
      Grado: enrollment.grade,
      Seccion: enrollment.section,
      Turno: this.getShiftLabel(enrollment.shift),
      'Estado del estudiante': studentIsActive ? 'Activo' : 'Inactivo',
      'Estado operativo': this.getAttendanceOperationalLabel(
        entry,
        exit,
        absence,
      ),
      Entrada: entry ? this.formatMarkedTime(entry.markedAt) : '',
      'Estado entrada': entry
        ? this.getAttendanceRecordStatusLabel(entry.status)
        : '',
      'Fuente entrada': entry
        ? this.getAttendanceSourceLabel(entry.source)
        : '',
      'Observacion entrada': entry?.observation ?? '',
      Salida: exit ? this.formatMarkedTime(exit.markedAt) : '',
      'Estado salida': exit
        ? this.getAttendanceRecordStatusLabel(exit.status)
        : '',
      'Fuente salida': exit ? this.getAttendanceSourceLabel(exit.source) : '',
      'Observacion salida': exit?.observation ?? '',
      Ausencia: absence
        ? this.getAttendanceDayStatusLabel(absence.statusType)
        : '',
      'Observacion ausencia': absence?.observation ?? '',
    };
  }

  private buildAttendanceExportFile(
    format: AttendanceExportFormat | undefined,
    rows: AttendanceExportRow[],
    metadata: {
      schoolYear: number;
      startDate: string;
      endDate: string;
      grade?: number;
      section?: string;
      shift?: StudentEnrollment['shift'];
    },
  ): AttendanceExportFile {
    const exportFormat = format ?? AttendanceExportFormat.CSV;
    const worksheet = this.buildAttendanceExportWorksheet(rows);
    const fileName = this.buildAttendanceExportFileName(exportFormat, metadata);

    if (exportFormat === AttendanceExportFormat.XLSX) {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencia');

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

  private buildAttendanceExportWorksheet(
    rows: AttendanceExportRow[],
  ): XLSX.WorkSheet {
    const data = [
      [...ATTENDANCE_EXPORT_HEADERS],
      ...rows.map((row) =>
        ATTENDANCE_EXPORT_HEADERS.map((header) => row[header] ?? ''),
      ),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    worksheet['!cols'] = ATTENDANCE_EXPORT_HEADERS.map((header) => ({
      wch: Math.max(
        header.length + 2,
        ...rows.map((row) => String(row[header] ?? '').length),
        12,
      ),
    }));

    return worksheet;
  }

  private buildAttendanceExportFileName(
    format: AttendanceExportFormat,
    metadata: {
      schoolYear: number;
      startDate: string;
      endDate: string;
      grade?: number;
      section?: string;
      shift?: StudentEnrollment['shift'];
    },
  ): string {
    const dateLabel =
      metadata.startDate === metadata.endDate
        ? metadata.startDate
        : `${metadata.startDate}_a_${metadata.endDate}`;
    const parts = ['asistencia', `anio_${metadata.schoolYear}`, dateLabel];

    if (typeof metadata.grade === 'number') {
      parts.push(`grado_${metadata.grade}`);
    }

    if (metadata.section) {
      parts.push(`seccion_${this.sanitizeFileNamePart(metadata.section)}`);
    }

    if (metadata.shift) {
      parts.push(
        metadata.shift === StudentShift.MORNING
          ? 'turno_manana'
          : 'turno_tarde',
      );
    }

    return `${parts.join('_')}.${format}`;
  }

  private sanitizeFileNamePart(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private buildAttendanceKey(
    studentId: string,
    attendanceDate: string,
  ): string {
    return `${studentId}::${attendanceDate}`;
  }

  private getAttendanceAlertPriority(
    alertType: AttendanceAlertTypeDto,
  ): number {
    if (alertType === AttendanceAlertTypeDto.CONSECUTIVE_ABSENCES) {
      return 1;
    }

    if (alertType === AttendanceAlertTypeDto.REPEATED_INCOMPLETE_RECORDS) {
      return 2;
    }

    return 3;
  }

  private getAttendanceAlertLabel(alertType: AttendanceAlertTypeDto): string {
    if (alertType === AttendanceAlertTypeDto.CONSECUTIVE_ABSENCES) {
      return 'Ausencias consecutivas';
    }

    if (alertType === AttendanceAlertTypeDto.REPEATED_INCOMPLETE_RECORDS) {
      return 'Registros incompletos';
    }

    return 'Tardanzas reiteradas';
  }

  private getAttendanceRegularizationPriority(
    itemType: AttendanceRegularizationItemTypeDto,
  ): number {
    if (
      itemType === AttendanceRegularizationItemTypeDto.PENDING_JUSTIFICATION
    ) {
      return 1;
    }

    if (itemType === AttendanceRegularizationItemTypeDto.PENDING_EXIT) {
      return 2;
    }

    if (itemType === AttendanceRegularizationItemTypeDto.PENDING_ENTRY) {
      return 3;
    }

    if (
      itemType === AttendanceRegularizationItemTypeDto.HIGH_ALERT_RECURRENCE
    ) {
      return 4;
    }

    if (itemType === AttendanceRegularizationItemTypeDto.LATE_ENTRY_REVIEW) {
      return 5;
    }

    return 6;
  }

  private buildAttendanceRegularizationItem(
    itemType: AttendanceRegularizationItemTypeDto,
    student: Student,
    enrollment: StudentEnrollment,
    attendanceDate: string,
    statusLabel: string,
    observation: string | null,
    supportLabel: string | null,
  ): AttendanceRegularizationItemDto {
    return {
      itemType,
      studentId: student.id,
      studentCode: student.code,
      fullName: `${student.lastName} ${student.firstName}`.trim(),
      document: student.document,
      attendanceDate,
      schoolYear: enrollment.schoolYear,
      grade: enrollment.grade,
      section: enrollment.section,
      shift: enrollment.shift,
      statusLabel,
      observation,
      supportLabel,
    };
  }

  private buildEmptyAttendanceRegularizationSummary(): AttendanceRegularizationSummaryDto {
    return {
      pendingEntries: 0,
      pendingExits: 0,
      lateEntriesForReview: 0,
      pendingJustifications: 0,
      recentCorrections: 0,
      studentsWithRecurringAlerts: 0,
      totalItems: 0,
    };
  }

  private buildAttendanceRegularizationSummary(
    items: AttendanceRegularizationItemDto[],
  ): AttendanceRegularizationSummaryDto {
    const summary = this.buildEmptyAttendanceRegularizationSummary();

    for (const item of items) {
      if (item.itemType === AttendanceRegularizationItemTypeDto.PENDING_ENTRY) {
        summary.pendingEntries += 1;
      }

      if (item.itemType === AttendanceRegularizationItemTypeDto.PENDING_EXIT) {
        summary.pendingExits += 1;
      }

      if (
        item.itemType === AttendanceRegularizationItemTypeDto.LATE_ENTRY_REVIEW
      ) {
        summary.lateEntriesForReview += 1;
      }

      if (
        item.itemType ===
        AttendanceRegularizationItemTypeDto.PENDING_JUSTIFICATION
      ) {
        summary.pendingJustifications += 1;
      }

      if (
        item.itemType === AttendanceRegularizationItemTypeDto.RECENT_CORRECTION
      ) {
        summary.recentCorrections += 1;
      }

      if (
        item.itemType ===
        AttendanceRegularizationItemTypeDto.HIGH_ALERT_RECURRENCE
      ) {
        summary.studentsWithRecurringAlerts += 1;
      }
    }

    summary.totalItems = items.length;
    return summary;
  }

  private matchesAttendanceRegularizationSearch(
    item: AttendanceRegularizationItemDto,
    search?: string,
  ): boolean {
    if (!search?.trim()) {
      return true;
    }

    const normalizedSearch = search.trim().toLowerCase();
    return [
      item.studentCode,
      item.fullName,
      item.document ?? '',
      item.statusLabel,
      item.supportLabel ?? '',
      item.observation ?? '',
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
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

  private getNextSchoolDay(date: string): string {
    let nextDate = this.shiftDate(date, 1);

    while (
      [0, 6].includes(new Date(`${nextDate}T00:00:00-05:00`).getUTCDay())
    ) {
      nextDate = this.shiftDate(nextDate, 1);
    }

    return nextDate;
  }

  private formatAlertDate(date: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Lima',
    }).format(new Date(`${date}T00:00:00-05:00`));
  }

  private getMarkTypeLabel(markType: AttendanceMarkType): string {
    return markType === AttendanceMarkType.ENTRY ? 'entrada' : 'salida';
  }

  private buildCorrectedMarkedAt(
    attendanceDate: string,
    markedTime: string,
  ): Date {
    return new Date(`${attendanceDate}T${markedTime}:00-05:00`);
  }

  private buildCorrectionSnapshot(attendanceRecord: AttendanceRecord) {
    return {
      markedAt: attendanceRecord.markedAt.toISOString(),
      markedTime: this.formatMarkedTime(attendanceRecord.markedAt),
      status: attendanceRecord.status,
      observation: attendanceRecord.observation,
    };
  }

  private toAttendanceCorrectionLogResponse(
    correctionLog: AttendanceCorrectionLog,
  ): AttendanceCorrectionLogResponseDto {
    return {
      id: correctionLog.id,
      attendanceRecordId: correctionLog.attendanceRecordId,
      studentId: correctionLog.studentId,
      attendanceDate: correctionLog.attendanceDate,
      markType: correctionLog.markType,
      reason: correctionLog.reason,
      correctedByUserId: correctionLog.correctedByUserId,
      correctedByDisplayName:
        correctionLog.correctedByUser?.displayName ?? 'Usuario no disponible',
      correctedAt: correctionLog.createdAt.toISOString(),
      previousData: this.normalizeCorrectionSnapshot(
        correctionLog.previousData,
      ),
      nextData: this.normalizeCorrectionSnapshot(correctionLog.nextData),
    };
  }

  private formatMarkedTime(markedAt: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Lima',
    }).format(markedAt);
  }

  private getShiftLabel(shift: StudentEnrollment['shift']): string {
    return shift === StudentShift.MORNING ? 'Manana' : 'Tarde';
  }

  private getAttendanceRecordStatusLabel(
    status: AttendanceRecordStatus,
  ): string {
    if (status === AttendanceRecordStatus.LATE) {
      return 'Tardanza';
    }

    if (status === AttendanceRecordStatus.EARLY_DEPARTURE) {
      return 'Salida anticipada';
    }

    return 'Regular';
  }

  private getAttendanceSourceLabel(source: AttendanceSource): string {
    return source === AttendanceSource.QR ? 'QR' : 'Manual';
  }

  private getAttendanceDayStatusLabel(
    statusType: AttendanceDayStatusType,
  ): string {
    return statusType === AttendanceDayStatusType.JUSTIFIED_ABSENCE
      ? 'Ausencia justificada'
      : 'Ausencia no justificada';
  }

  private getAttendanceOperationalLabel(
    entry: AttendanceRecord | null,
    exit: AttendanceRecord | null,
    absence: AttendanceDayStatus | null,
  ): string {
    if (absence) {
      return this.getAttendanceDayStatusLabel(absence.statusType);
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

    return 'Pendiente';
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

  private buildDailyAttendanceSummary(
    items: DailyAttendanceItemDto[],
  ): DailyAttendanceSummaryDto {
    const activeItems = items.filter((item) => item.isActive);
    const inactiveStudents = items.length - activeItems.length;
    const entriesRegistered = activeItems.filter((item) =>
      Boolean(item.entry),
    ).length;
    const exitsRegistered = activeItems.filter((item) =>
      Boolean(item.exit),
    ).length;
    const lateEntries = activeItems.filter(
      (item) => item.entry?.status === AttendanceRecordStatus.LATE,
    ).length;
    const earlyDepartures = activeItems.filter(
      (item) => item.exit?.status === AttendanceRecordStatus.EARLY_DEPARTURE,
    ).length;
    const justifiedAbsences = activeItems.filter(
      (item) =>
        item.absence?.statusType === AttendanceDayStatusType.JUSTIFIED_ABSENCE,
    ).length;
    const unjustifiedAbsences = activeItems.filter(
      (item) =>
        item.absence?.statusType ===
        AttendanceDayStatusType.UNJUSTIFIED_ABSENCE,
    ).length;
    const absences = justifiedAbsences + unjustifiedAbsences;
    const pendingEntries = activeItems.filter(
      (item) => !item.absence && !item.entry,
    ).length;
    const pendingExits = activeItems.filter(
      (item) => !item.absence && !item.exit,
    ).length;
    const incompleteRecords = activeItems.filter(
      (item) => !item.absence && Boolean(item.entry) !== Boolean(item.exit),
    ).length;

    return {
      totalStudents: items.length,
      activeStudents: activeItems.length,
      inactiveStudents,
      entriesRegistered,
      exitsRegistered,
      lateEntries,
      earlyDepartures,
      justifiedAbsences,
      unjustifiedAbsences,
      absences,
      pendingEntries,
      pendingExits,
      incompleteRecords,
    };
  }

  private resolveAttendanceRecordStatus(
    markType: AttendanceMarkType,
    status?: AttendanceRecordStatus,
  ): AttendanceRecordStatus {
    const normalizedStatus = status ?? AttendanceRecordStatus.REGULAR;

    if (
      markType === AttendanceMarkType.ENTRY &&
      ![AttendanceRecordStatus.REGULAR, AttendanceRecordStatus.LATE].includes(
        normalizedStatus,
      )
    ) {
      throw new BadRequestException(
        'La entrada solo puede registrarse como regular o tardanza.',
      );
    }

    if (
      markType === AttendanceMarkType.EXIT &&
      ![
        AttendanceRecordStatus.REGULAR,
        AttendanceRecordStatus.EARLY_DEPARTURE,
      ].includes(normalizedStatus)
    ) {
      throw new BadRequestException(
        'La salida solo puede registrarse como regular o salida anticipada.',
      );
    }

    return normalizedStatus;
  }

  private normalizeCorrectionSnapshot(
    snapshot: AttendanceCorrectionLog['previousData'],
  ) {
    return {
      ...snapshot,
      status: snapshot.status ?? AttendanceRecordStatus.REGULAR,
    };
  }
}
