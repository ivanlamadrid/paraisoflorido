import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import type { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { StudentEnrollmentMovement } from '../common/enums/student-enrollment-movement.enum';
import { StudentEnrollmentStatus } from '../common/enums/student-enrollment-status.enum';
import { StudentShift } from '../common/enums/student-shift.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { PasswordResetLog } from '../users/entities/password-reset-log.entity';
import { User } from '../users/entities/user.entity';
import { INSTITUTION_SETTINGS_ID } from './constants/institution.constants';
import { UpdateInstitutionSettingsDto } from './dto/update-institution-settings.dto';
import { InstitutionSettingsResponseDto } from './dto/institution-settings-response.dto';
import {
  ExecuteSchoolYearPreparationDto,
  ExecuteSchoolYearPreparationResponseDto,
  SchoolYearPreparationPreviewDto,
  SchoolYearPreparationPreviewResponseDto,
} from './dto/school-year-preparation.dto';
import { InstitutionSetting } from './entities/institution-setting.entity';
import { SchoolYearPreparationLog } from './entities/school-year-preparation-log.entity';
import { StudentEnrollment } from '../students/entities/student-enrollment.entity';
import { Student } from '../students/entities/student.entity';

type SchoolYearPreparationAction = 'continue' | 'graduate' | 'skip';

type SchoolYearPreparationDecision = {
  action: SchoolYearPreparationAction;
  enrollment: StudentEnrollment;
  student: Student;
  user: User;
  nextGrade: number | null;
  nextSection: string | null;
  nextShift: StudentShift | null;
  sectionAdjusted: boolean;
  shiftAdjusted: boolean;
  skipReason: string | null;
};

type SchoolYearPreparationPlan = {
  settings: InstitutionSetting;
  currentSchoolYear: number;
  targetSchoolYear: number;
  resetStudentPasswords: boolean;
  decisions: SchoolYearPreparationDecision[];
  blockers: string[];
};

const PREPARE_NEW_SCHOOL_YEAR_CONFIRMATION_TEXT = 'PREPARAR NUEVO AÑO';

@Injectable()
export class InstitutionService {
  constructor(
    @InjectRepository(InstitutionSetting)
    private readonly institutionSettingsRepository: Repository<InstitutionSetting>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async getSettings(): Promise<InstitutionSettingsResponseDto> {
    const settings = await this.getSettingsEntity();
    return this.toSettingsResponse(settings);
  }

  async updateSettings(
    dto: UpdateInstitutionSettingsDto,
  ): Promise<InstitutionSettingsResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const settings = await this.getSettingsEntity(manager);

      if (dto.activeSchoolYear !== settings.activeSchoolYear) {
        throw new BadRequestException(
          'El cambio de año activo se realiza solo desde la preparación segura del nuevo año escolar.',
        );
      }

      settings.schoolName = dto.schoolName.trim();
      settings.activeSchoolYear = dto.activeSchoolYear;
      settings.enabledTurns = [...dto.enabledTurns];
      settings.enabledGrades = [...dto.enabledGrades].sort(
        (left, right) => left - right,
      );
      settings.sectionsByGrade = this.normalizeSectionsByGrade(
        dto.sectionsByGrade,
        settings.enabledGrades,
      );

      if (dto.newInitialStudentPassword?.trim()) {
        settings.initialStudentPasswordHash = await hashPassword(
          dto.newInitialStudentPassword.trim(),
        );
        settings.initialStudentPasswordUpdatedAt = new Date();
      }

      const repository = manager.getRepository(InstitutionSetting);
      const savedSettings = await repository.save(settings);
      return this.toSettingsResponse(savedSettings);
    });
  }

  async previewSchoolYearPreparation(
    dto: SchoolYearPreparationPreviewDto,
    authUser: AuthenticatedRequestUser,
  ): Promise<SchoolYearPreparationPreviewResponseDto> {
    this.assertDirector(authUser);

    const plan = await this.buildSchoolYearPreparationPlan(
      dto.targetSchoolYear,
      dto.resetStudentPasswords ?? false,
    );

    return this.toSchoolYearPreparationPreviewResponse(plan);
  }

  async executeSchoolYearPreparation(
    dto: ExecuteSchoolYearPreparationDto,
    authUser: AuthenticatedRequestUser,
  ): Promise<ExecuteSchoolYearPreparationResponseDto> {
    this.assertDirector(authUser);

    if (
      dto.confirmationText.trim().toUpperCase() !==
      PREPARE_NEW_SCHOOL_YEAR_CONFIRMATION_TEXT
    ) {
      throw new BadRequestException(
        `Debes escribir exactamente "${PREPARE_NEW_SCHOOL_YEAR_CONFIRMATION_TEXT}" para continuar.`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const plan = await this.buildSchoolYearPreparationPlan(
        dto.targetSchoolYear,
        dto.resetStudentPasswords ?? false,
        manager,
      );

      if (plan.blockers.length > 0) {
        throw new BadRequestException(plan.blockers.join(' '));
      }

      const performer = await manager.getRepository(User).findOne({
        where: { id: authUser.id },
      });

      if (!performer) {
        throw new NotFoundException('Usuario no encontrado.');
      }

      const passwordMatches = await verifyPassword(
        dto.currentPassword,
        performer.passwordHash,
      );

      if (!passwordMatches) {
        throw new ForbiddenException('La contraseña actual es incorrecta.');
      }

      const enrollmentsRepository = manager.getRepository(StudentEnrollment);
      const usersRepository = manager.getRepository(User);
      const passwordResetLogsRepository =
        manager.getRepository(PasswordResetLog);
      const logsRepository = manager.getRepository(SchoolYearPreparationLog);

      const now = new Date();
      const reason = `Preparación de nuevo año escolar ${plan.targetSchoolYear}`;
      const continuedStudents = plan.decisions.filter(
        (decision) => decision.action === 'continue',
      );
      const graduatedStudents = plan.decisions.filter(
        (decision) => decision.action === 'graduate',
      );

      const nextEnrollments = continuedStudents.map((decision) =>
        enrollmentsRepository.create({
          studentId: decision.student.id,
          schoolYear: plan.targetSchoolYear,
          grade: decision.nextGrade as number,
          section: decision.nextSection as string,
          shift: decision.nextShift as StudentShift,
          status: StudentEnrollmentStatus.ACTIVE,
          movementType: StudentEnrollmentMovement.CONTINUITY,
          administrativeDetail: null,
          statusChangedAt: now,
          statusChangedByUserId: authUser.id,
          isActive: decision.student.isActive,
        }),
      );

      if (nextEnrollments.length > 0) {
        await enrollmentsRepository.save(nextEnrollments);
      }

      if (graduatedStudents.length > 0) {
        for (const decision of graduatedStudents) {
          decision.enrollment.status = StudentEnrollmentStatus.GRADUATED;
          decision.enrollment.statusChangedAt = now;
          decision.enrollment.statusChangedByUserId = authUser.id;
        }

        await enrollmentsRepository.save(
          graduatedStudents.map((decision) => decision.enrollment),
        );
      }

      if (plan.resetStudentPasswords && continuedStudents.length > 0) {
        for (const decision of continuedStudents) {
          decision.user.passwordHash = plan.settings.initialStudentPasswordHash;
          decision.user.mustChangePassword = true;
          decision.user.lastLoginAt = null;
          decision.user.authVersion += 1;
        }

        await usersRepository.save(
          continuedStudents.map((decision) => decision.user),
        );
        await passwordResetLogsRepository.save(
          continuedStudents.map((decision) =>
            passwordResetLogsRepository.create({
              targetUserId: decision.user.id,
              performedByUserId: authUser.id,
              reason,
              createdAt: now,
            }),
          ),
        );
      }

      plan.settings.activeSchoolYear = plan.targetSchoolYear;
      const savedSettings = await manager
        .getRepository(InstitutionSetting)
        .save(plan.settings);

      const preview = this.toSchoolYearPreparationPreviewResponse(plan);
      const log = await logsRepository.save(
        logsRepository.create({
          preparedFromSchoolYear: plan.currentSchoolYear,
          preparedToSchoolYear: plan.targetSchoolYear,
          performedByUserId: authUser.id,
          resetStudentPasswords: plan.resetStudentPasswords,
          continuedStudentsCount: preview.continuedStudentsCount,
          graduatedStudentsCount: preview.graduatedStudentsCount,
          skippedStudentsCount: preview.skippedStudentsCount,
          passwordsResetCount: preview.passwordsResetCount,
          sectionAdjustmentsCount: preview.sectionAdjustmentsCount,
          shiftAdjustmentsCount: preview.shiftAdjustmentsCount,
          summary: {
            blockers: preview.blockers,
            notes: preview.notes,
            totalCurrentEnrollments: preview.totalCurrentEnrollments,
          },
        }),
      );

      return {
        message:
          'El nuevo año escolar fue preparado correctamente sin borrar el historial existente.',
        executedAt: now.toISOString(),
        logId: log.id,
        preview,
        settings: this.toSettingsResponse(savedSettings),
      };
    });
  }

  async getSettingsEntity(
    manager?: EntityManager,
  ): Promise<InstitutionSetting> {
    const repository =
      manager?.getRepository(InstitutionSetting) ??
      this.institutionSettingsRepository;

    let settings = await repository.findOne({
      where: { id: INSTITUTION_SETTINGS_ID },
    });

    if (!settings) {
      settings = repository.create(await this.buildDefaultSettingsEntity());
      settings = await repository.save(settings);
    }

    return settings;
  }

  async getInitialStudentPasswordHash(): Promise<string> {
    const settings = await this.getSettingsEntity();
    return settings.initialStudentPasswordHash;
  }

  async getActiveSchoolYear(): Promise<number> {
    const settings = await this.getSettingsEntity();
    return settings.activeSchoolYear;
  }

  async verifyMatchesInitialStudentPassword(
    password: string,
  ): Promise<boolean> {
    const initialPasswordHash = await this.getInitialStudentPasswordHash();
    return verifyPassword(password, initialPasswordHash);
  }

  async upsertSettingsFromSeed(input: {
    schoolName: string;
    activeSchoolYear: number;
    enabledTurns: StudentShift[];
    enabledGrades: number[];
    sectionsByGrade: Record<string, string[]>;
    initialStudentPasswordHash?: string;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(InstitutionSetting);
      const existing = await repository.findOne({
        where: { id: INSTITUTION_SETTINGS_ID },
      });

      const settings =
        existing ?? repository.create({ id: INSTITUTION_SETTINGS_ID });
      settings.schoolName = input.schoolName;
      settings.activeSchoolYear = input.activeSchoolYear;
      settings.enabledTurns = [...input.enabledTurns];
      settings.enabledGrades = [...input.enabledGrades].sort(
        (left, right) => left - right,
      );
      settings.sectionsByGrade = this.normalizeSectionsByGrade(
        input.sectionsByGrade,
        settings.enabledGrades,
      );

      if (input.initialStudentPasswordHash) {
        settings.initialStudentPasswordHash = input.initialStudentPasswordHash;
        settings.initialStudentPasswordUpdatedAt = new Date();
      } else if (!settings.initialStudentPasswordHash) {
        settings.initialStudentPasswordHash = await hashPassword(
          this.getDefaultInitialStudentPassword(),
        );
        settings.initialStudentPasswordUpdatedAt = new Date();
      }

      await repository.save(settings);
    });
  }

  toSettingsResponse(
    settings: InstitutionSetting,
  ): InstitutionSettingsResponseDto {
    return {
      schoolName: settings.schoolName,
      activeSchoolYear: settings.activeSchoolYear,
      enabledTurns: [...settings.enabledTurns],
      enabledGrades: [...settings.enabledGrades],
      sectionsByGrade: this.cloneSectionsByGrade(settings.sectionsByGrade),
      hasInitialStudentPasswordConfigured:
        settings.initialStudentPasswordHash.trim().length > 0,
      initialStudentPasswordUpdatedAt:
        settings.initialStudentPasswordUpdatedAt?.toISOString() ?? null,
    };
  }

  private async buildDefaultSettingsEntity(): Promise<InstitutionSetting> {
    return {
      id: INSTITUTION_SETTINGS_ID,
      schoolName:
        this.configService.get<string>('SCHOOL_NAME')?.trim() ??
        'Colegio Paraiso Florido 3082',
      activeSchoolYear: new Date().getFullYear(),
      initialStudentPasswordHash: await hashPassword(
        this.getDefaultInitialStudentPassword(),
      ),
      enabledTurns: [StudentShift.MORNING, StudentShift.AFTERNOON],
      enabledGrades: [1, 2, 3, 4, 5],
      sectionsByGrade: {
        '1': ['A'],
        '2': ['A'],
        '3': ['A'],
        '4': ['A'],
        '5': ['A'],
      },
      initialStudentPasswordUpdatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getDefaultInitialStudentPassword(): string {
    const configuredPassword =
      this.configService.get<string>('INITIAL_STUDENT_PASSWORD')?.trim() ?? '';

    if (!configuredPassword) {
      throw new NotFoundException(
        'No se encontro una contrasena inicial general configurada.',
      );
    }

    return configuredPassword;
  }

  private normalizeSectionsByGrade(
    input: Record<string, string[]>,
    enabledGrades: number[],
  ): Record<string, string[]> {
    if (!input || typeof input !== 'object') {
      throw new NotFoundException(
        'La configuracion de secciones por grado es obligatoria.',
      );
    }

    const normalized: Record<string, string[]> = {};

    for (const grade of enabledGrades) {
      const rawSections = input[String(grade)];

      if (!Array.isArray(rawSections) || rawSections.length === 0) {
        throw new NotFoundException(
          `Debes configurar al menos una seccion para ${grade} grado.`,
        );
      }

      const sections = Array.from(
        new Set(
          rawSections
            .filter((section): section is string => typeof section === 'string')
            .map((section) => section.trim().toUpperCase())
            .filter((section) => section.length > 0 && section.length <= 10),
        ),
      );

      if (sections.length === 0) {
        throw new NotFoundException(
          `Debes configurar al menos una seccion valida para ${grade} grado.`,
        );
      }

      normalized[String(grade)] = sections;
    }

    return normalized;
  }

  private cloneSectionsByGrade(
    input: Record<string, string[]>,
  ): Record<string, string[]> {
    return Object.fromEntries(
      Object.entries(input ?? {}).map(([grade, sections]) => [
        grade,
        [...sections],
      ]),
    );
  }

  private assertDirector(authUser: AuthenticatedRequestUser): void {
    if (authUser.role !== UserRole.DIRECTOR) {
      throw new ForbiddenException(
        'Solo el director puede preparar un nuevo año escolar.',
      );
    }
  }

  private async buildSchoolYearPreparationPlan(
    targetSchoolYear: number,
    resetStudentPasswords: boolean,
    manager?: EntityManager,
  ): Promise<SchoolYearPreparationPlan> {
    const settings = await this.getSettingsEntity(manager);
    const currentSchoolYear = settings.activeSchoolYear;
    const blockers: string[] = [];

    if (targetSchoolYear !== currentSchoolYear + 1) {
      blockers.push(
        'La preparación solo permite avanzar al siguiente año escolar inmediato.',
      );
    }

    const enrollmentsRepository =
      manager?.getRepository(StudentEnrollment) ??
      this.dataSource.getRepository(StudentEnrollment);

    const existingTargetYearEnrollments = await enrollmentsRepository.count({
      where: { schoolYear: targetSchoolYear },
    });

    if (existingTargetYearEnrollments > 0) {
      blockers.push(
        'Ya existen matrículas registradas para el año escolar de destino.',
      );
    }

    const currentEnrollments = await enrollmentsRepository.find({
      where: { schoolYear: currentSchoolYear },
      relations: ['student', 'student.user'],
      order: {
        grade: 'ASC',
        section: 'ASC',
        shift: 'ASC',
        createdAt: 'ASC',
      },
    });

    const eligibleStatuses = new Set<StudentEnrollmentStatus>([
      StudentEnrollmentStatus.ACTIVE,
      StudentEnrollmentStatus.OBSERVED,
      StudentEnrollmentStatus.PROMOTED,
    ]);

    const decisions = currentEnrollments.map<SchoolYearPreparationDecision>(
      (enrollment) => {
        const student = enrollment.student;
        const user = student.user;

        if (!student || !user) {
          return {
            action: 'skip',
            enrollment,
            student,
            user,
            nextGrade: null,
            nextSection: null,
            nextShift: null,
            sectionAdjusted: false,
            shiftAdjusted: false,
            skipReason: 'missing_relations',
          };
        }

        if (!eligibleStatuses.has(enrollment.status)) {
          return {
            action: 'skip',
            enrollment,
            student,
            user,
            nextGrade: null,
            nextSection: null,
            nextShift: null,
            sectionAdjusted: false,
            shiftAdjusted: false,
            skipReason: 'closed_status',
          };
        }

        if (!student.isActive || !user.isActive || !enrollment.isActive) {
          return {
            action: 'skip',
            enrollment,
            student,
            user,
            nextGrade: null,
            nextSection: null,
            nextShift: null,
            sectionAdjusted: false,
            shiftAdjusted: false,
            skipReason: 'inactive_record',
          };
        }

        if (enrollment.grade >= 5) {
          return {
            action: 'graduate',
            enrollment,
            student,
            user,
            nextGrade: null,
            nextSection: null,
            nextShift: null,
            sectionAdjusted: false,
            shiftAdjusted: false,
            skipReason: null,
          };
        }

        const nextGrade = enrollment.grade + 1;
        const availableSections =
          settings.sectionsByGrade[String(nextGrade)] ?? [];

        if (availableSections.length === 0) {
          blockers.push(
            `Debes configurar al menos una sección para ${nextGrade} grado antes de preparar el nuevo año.`,
          );
        }

        const nextSection = availableSections.includes(enrollment.section)
          ? enrollment.section
          : (availableSections[0] ?? null);
        const nextShift = settings.enabledTurns.includes(enrollment.shift)
          ? enrollment.shift
          : (settings.enabledTurns[0] ?? null);

        if (!nextSection || !nextShift) {
          blockers.push(
            'La configuración institucional no define secciones o turnos válidos para el nuevo año.',
          );
        }

        return {
          action: 'continue',
          enrollment,
          student,
          user,
          nextGrade,
          nextSection,
          nextShift,
          sectionAdjusted: nextSection !== enrollment.section,
          shiftAdjusted: nextShift !== enrollment.shift,
          skipReason: null,
        };
      },
    );

    return {
      settings,
      currentSchoolYear,
      targetSchoolYear,
      resetStudentPasswords,
      decisions,
      blockers: Array.from(new Set(blockers)),
    };
  }

  private toSchoolYearPreparationPreviewResponse(
    plan: SchoolYearPreparationPlan,
  ): SchoolYearPreparationPreviewResponseDto {
    const continuedStudents = plan.decisions.filter(
      (decision) => decision.action === 'continue',
    );
    const graduatedStudents = plan.decisions.filter(
      (decision) => decision.action === 'graduate',
    );
    const skippedStudents = plan.decisions.filter(
      (decision) => decision.action === 'skip',
    );
    const sectionAdjustmentsCount = continuedStudents.filter(
      (decision) => decision.sectionAdjusted,
    ).length;
    const shiftAdjustmentsCount = continuedStudents.filter(
      (decision) => decision.shiftAdjusted,
    ).length;
    const notes: string[] = [
      'El historial de asistencia, seguimiento, comunicados y trazabilidad no se elimina.',
    ];

    if (graduatedStudents.length > 0) {
      notes.push(
        'Los estudiantes de 5.º elegibles quedarán cerrados como egresados en el año actual.',
      );
    }

    if (sectionAdjustmentsCount > 0) {
      notes.push(
        'Algunas continuidades usarán la primera sección habilitada del grado de destino porque la sección original ya no está disponible.',
      );
    }

    if (plan.resetStudentPasswords) {
      notes.push(
        'Las cuentas de continuidad volverán a la contraseña inicial general y exigirán cambio al ingresar.',
      );
    }

    return {
      currentSchoolYear: plan.currentSchoolYear,
      targetSchoolYear: plan.targetSchoolYear,
      canPrepare: plan.blockers.length === 0,
      resetStudentPasswords: plan.resetStudentPasswords,
      totalCurrentEnrollments: plan.decisions.length,
      continuedStudentsCount: continuedStudents.length,
      graduatedStudentsCount: graduatedStudents.length,
      skippedStudentsCount: skippedStudents.length,
      passwordsResetCount: plan.resetStudentPasswords
        ? continuedStudents.length
        : 0,
      sectionAdjustmentsCount,
      shiftAdjustmentsCount,
      blockers: [...plan.blockers],
      notes,
    };
  }
}
