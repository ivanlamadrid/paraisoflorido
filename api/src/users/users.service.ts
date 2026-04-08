import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { hashPassword } from '../common/utils/password.util';
import { InstitutionService } from '../institution/institution.service';
import { CreatePersonnelUserDto } from './dto/create-personnel-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';
import {
  TutorAssignmentInputDto,
  TutorAssignmentResponseDto,
} from './dto/tutor-assignment.dto';
import { UpdatePersonnelUserDto } from './dto/update-personnel-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PasswordChangeLog } from './entities/password-change-log.entity';
import { PasswordResetLog } from './entities/password-reset-log.entity';
import { TutorAssignment } from './entities/tutor-assignment.entity';
import { User } from './entities/user.entity';

const MANAGEABLE_PERSONNEL_ROLES = [
  UserRole.SECRETARY,
  UserRole.AUXILIARY,
  UserRole.TUTOR,
] as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(TutorAssignment)
    private readonly tutorAssignmentsRepository: Repository<TutorAssignment>,
    private readonly institutionService: InstitutionService,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        username: this.normalizeUsername(username),
      },
    });
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async listUsers(query: QueryUsersDto): Promise<{
    items: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: FindOptionsWhere<User>[] = [];
    const normalizedSearch = query.search?.trim();

    if (normalizedSearch) {
      where.push({
        username: ILike(`%${normalizedSearch}%`),
        ...(query.role ? { role: query.role } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      });
      where.push({
        displayName: ILike(`%${normalizedSearch}%`),
        ...(query.role ? { role: query.role } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      });
    }

    const [users, total] = await this.usersRepository.findAndCount({
      where: where.length > 0 ? where : this.buildBaseFilters(query),
      order: {
        displayName: 'ASC',
      },
      skip: ((query.page ?? 1) - 1) * (query.limit ?? 20),
      take: query.limit ?? 20,
    });

    return {
      items: users.map((user) => this.toUserResponse(user)),
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }

  async listPersonnel(query: QueryUsersDto): Promise<{
    items: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (query.role && !this.isManageablePersonnelRole(query.role)) {
      return {
        items: [],
        total: 0,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      };
    }

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.tutorAssignments', 'tutorAssignments')
      .where('user.role IN (:...roles)', {
        roles: [...MANAGEABLE_PERSONNEL_ROLES],
      })
      .distinct(true);

    if (query.role) {
      queryBuilder.andWhere('user.role = :role', {
        role: query.role,
      });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    if (query.search?.trim()) {
      queryBuilder.andWhere(
        '(user.username ILIKE :search OR user.displayName ILIKE :search)',
        {
          search: `%${query.search.trim()}%`,
        },
      );
    }

    queryBuilder
      .orderBy('user.displayName', 'ASC')
      .addOrderBy('tutorAssignments.schoolYear', 'DESC')
      .addOrderBy('tutorAssignments.grade', 'ASC')
      .addOrderBy('tutorAssignments.section', 'ASC')
      .addOrderBy('tutorAssignments.shift', 'ASC')
      .skip(((query.page ?? 1) - 1) * (query.limit ?? 20))
      .take(query.limit ?? 20);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      items: users.map((user) => this.toUserResponse(user)),
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }

  async createPersonnel(
    dto: CreatePersonnelUserDto,
    performedBy: AuthenticatedRequestUser,
  ): Promise<UserResponseDto> {
    if (performedBy.role !== UserRole.DIRECTOR) {
      throw new ForbiddenException(
        'Solo el director puede crear cuentas de personal.',
      );
    }

    this.assertManageablePersonnelRole(dto.role);

    const username = this.normalizeUsername(dto.username);
    const existingUser = await this.findByUsername(username);

    if (existingUser) {
      throw new ConflictException('El usuario ya estÃ¡ registrado.');
    }

    if (dto.temporaryPassword.trim() === username) {
      throw new BadRequestException(
        'La contraseÃ±a temporal no puede ser igual al usuario.',
      );
    }

    const assignments = await this.prepareTutorAssignments(
      dto.role,
      dto.assignments,
    );
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();

    const createdUser = await this.dataSource.transaction(async (manager) => {
      const usersRepository = manager.getRepository(User);
      const tutorAssignmentsRepository = manager.getRepository(TutorAssignment);
      const savedUser = await usersRepository.save(
        usersRepository.create({
          username,
          displayName: this.buildDisplayName(firstName, lastName),
          firstName,
          lastName,
          role: dto.role,
          passwordHash: await hashPassword(dto.temporaryPassword.trim()),
          isActive: dto.isActive ?? true,
          mustChangePassword: dto.mustChangePassword ?? true,
        }),
      );

      await this.replaceTutorAssignments(
        tutorAssignmentsRepository,
        savedUser.id,
        dto.role,
        assignments,
      );

      return usersRepository.findOne({
        where: { id: savedUser.id },
        relations: ['tutorAssignments'],
        order: {
          tutorAssignments: {
            schoolYear: 'DESC',
            grade: 'ASC',
            section: 'ASC',
            shift: 'ASC',
          },
        },
      });
    });

    if (!createdUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.toUserResponse(createdUser);
  }

  async updatePersonnel(
    targetUserId: string,
    dto: UpdatePersonnelUserDto,
    performedBy: AuthenticatedRequestUser,
  ): Promise<UserResponseDto> {
    if (performedBy.role !== UserRole.DIRECTOR) {
      throw new ForbiddenException(
        'Solo el director puede editar cuentas de personal.',
      );
    }

    const targetUser = await this.findRequiredUser(targetUserId);

    if (!this.isManageablePersonnelRole(targetUser.role)) {
      throw new ForbiddenException(
        'Solo se pueden editar cuentas de personal del colegio.',
      );
    }

    if (performedBy.id === targetUser.id) {
      throw new ForbiddenException(
        'Tu propia cuenta administrativa se gestiona desde tu secciÃ³n de cuenta.',
      );
    }

    if (dto.role) {
      this.assertManageablePersonnelRole(dto.role);
    }

    const nextRole = dto.role ?? targetUser.role;
    const assignments = await this.prepareTutorAssignments(
      nextRole,
      dto.assignments,
    );

    if (dto.username) {
      const normalizedUsername = this.normalizeUsername(dto.username);
      const existingUser = await this.findByUsername(normalizedUsername);

      if (existingUser && existingUser.id !== targetUser.id) {
        throw new ConflictException('El usuario ya estÃ¡ registrado.');
      }

      targetUser.username = normalizedUsername;
    }

    if (dto.firstName !== undefined) {
      targetUser.firstName = dto.firstName.trim();
    }

    if (dto.lastName !== undefined) {
      targetUser.lastName = dto.lastName.trim();
    }

    if (dto.role !== undefined) {
      targetUser.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      targetUser.isActive = dto.isActive;
    }

    targetUser.displayName = this.buildDisplayName(
      targetUser.firstName ?? targetUser.displayName,
      targetUser.lastName ?? '',
    );

    const updatedUser = await this.dataSource.transaction(async (manager) => {
      const usersRepository = manager.getRepository(User);
      const tutorAssignmentsRepository = manager.getRepository(TutorAssignment);
      const savedUser = await usersRepository.save(targetUser);

      await this.replaceTutorAssignments(
        tutorAssignmentsRepository,
        savedUser.id,
        nextRole,
        assignments,
        dto.assignments !== undefined,
      );

      return usersRepository.findOne({
        where: { id: savedUser.id },
        relations: ['tutorAssignments'],
        order: {
          tutorAssignments: {
            schoolYear: 'DESC',
            grade: 'ASC',
            section: 'ASC',
            shift: 'ASC',
          },
        },
      });
    });

    if (!updatedUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.toUserResponse(updatedUser);
  }

  async getMyTutorAssignments(
    authUser: AuthenticatedRequestUser,
  ): Promise<TutorAssignmentResponseDto[]> {
    if (authUser.role !== UserRole.TUTOR) {
      throw new ForbiddenException(
        'Solo los tutores pueden consultar sus asignaciones.',
      );
    }

    const assignments = await this.tutorAssignmentsRepository.find({
      where: { tutorUserId: authUser.id },
      order: {
        schoolYear: 'DESC',
        grade: 'ASC',
        section: 'ASC',
        shift: 'ASC',
      },
    });

    return assignments.map((assignment) =>
      this.toTutorAssignmentResponse(assignment),
    );
  }

  async changeOwnPassword(userId: string, nextPassword: string): Promise<User> {
    return this.updatePassword(userId, nextPassword, {
      mustChangePassword: false,
      logType: 'self_change',
    });
  }

  async resetUserPassword(
    targetUserId: string,
    performedBy: AuthenticatedRequestUser,
    dto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    const resetAt = new Date();
    const normalizedTemporaryPassword = dto.newPassword.trim();

    const targetUser = await this.findRequiredUser(targetUserId);

    this.assertCanResetTarget(performedBy.role, targetUser.role);

    if (targetUser.id === performedBy.id) {
      throw new ForbiddenException(
        'Usa tu propio cambio de contraseÃ±a para actualizar tu acceso.',
      );
    }

    if (
      normalizedTemporaryPassword ===
      this.normalizeUsername(targetUser.username)
    ) {
      throw new BadRequestException(
        'La contraseÃ±a temporal no puede ser igual al usuario del sistema.',
      );
    }

    await this.updatePassword(targetUser.id, normalizedTemporaryPassword, {
      mustChangePassword: true,
      logType: 'admin_reset',
      performedByUserId: performedBy.id,
      reason: dto.reason,
      resetAt,
    });

    return {
      message:
        'La contraseÃ±a temporal fue restablecida correctamente y requerirÃ¡ cambio en el siguiente ingreso.',
      targetUserId,
      mustChangePassword: true,
      resetAt: resetAt.toISOString(),
    };
  }

  toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      assignments: [...(user.tutorAssignments ?? [])]
        .sort((left, right) => {
          if (left.schoolYear !== right.schoolYear) {
            return right.schoolYear - left.schoolYear;
          }

          if (left.grade !== right.grade) {
            return left.grade - right.grade;
          }

          if (left.section !== right.section) {
            return left.section.localeCompare(right.section, 'es');
          }

          return left.shift.localeCompare(right.shift, 'es');
        })
        .map((assignment) => this.toTutorAssignmentResponse(assignment)),
    };
  }

  normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  private async updatePassword(
    userId: string,
    nextPassword: string,
    options: {
      mustChangePassword: boolean;
      logType: 'self_change' | 'admin_reset';
      performedByUserId?: string;
      reason?: string;
      resetAt?: Date;
    },
  ): Promise<User> {
    const passwordHash = await hashPassword(nextPassword);

    return this.dataSource.transaction(async (manager) => {
      const usersRepository = manager.getRepository(User);
      const passwordChangeLogsRepository =
        manager.getRepository(PasswordChangeLog);
      const passwordResetLogsRepository =
        manager.getRepository(PasswordResetLog);

      const targetUser = await usersRepository.findOne({
        where: { id: userId },
      });

      if (!targetUser) {
        throw new NotFoundException('Usuario no encontrado.');
      }

      targetUser.passwordHash = passwordHash;
      targetUser.mustChangePassword = options.mustChangePassword;
      targetUser.authVersion += 1;

      if (options.mustChangePassword) {
        targetUser.lastLoginAt = null;
      }

      const savedUser = await usersRepository.save(targetUser);

      if (options.logType === 'self_change') {
        await passwordChangeLogsRepository.save(
          passwordChangeLogsRepository.create({
            userId: savedUser.id,
          }),
        );
      }

      if (options.logType === 'admin_reset') {
        await passwordResetLogsRepository.save(
          passwordResetLogsRepository.create({
            targetUserId: savedUser.id,
            performedByUserId: options.performedByUserId,
            reason: options.reason ?? 'Restablecimiento administrativo',
            createdAt: options.resetAt ?? new Date(),
          }),
        );
      }

      return savedUser;
    });
  }

  private async findRequiredUser(id: string): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return user;
  }

  private assertCanResetTarget(
    performerRole: UserRole,
    targetRole: UserRole,
  ): void {
    const allowedTargetsByRole: Record<UserRole, UserRole[]> = {
      [UserRole.DIRECTOR]: [
        UserRole.STUDENT,
        UserRole.AUXILIARY,
        UserRole.SECRETARY,
        UserRole.TUTOR,
      ],
      [UserRole.SECRETARY]: [UserRole.STUDENT, UserRole.AUXILIARY],
      [UserRole.AUXILIARY]: [],
      [UserRole.TUTOR]: [],
      [UserRole.STUDENT]: [],
    };

    const allowedTargets = allowedTargetsByRole[performerRole] ?? [];

    if (!allowedTargets.includes(targetRole)) {
      throw new ForbiddenException(
        'No tienes permisos para restablecer la contraseÃ±a de este usuario.',
      );
    }
  }

  private assertManageablePersonnelRole(role: UserRole): void {
    if (!this.isManageablePersonnelRole(role)) {
      throw new BadRequestException(
        'Solo se pueden gestionar cuentas de secretarÃ­a, auxiliares y tutores en esta fase.',
      );
    }
  }

  private isManageablePersonnelRole(role: UserRole): boolean {
    return MANAGEABLE_PERSONNEL_ROLES.includes(
      role as (typeof MANAGEABLE_PERSONNEL_ROLES)[number],
    );
  }

  private buildDisplayName(firstName: string, lastName: string): string {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    if (!fullName) {
      throw new BadRequestException(
        'Debes registrar nombres y apellidos del personal.',
      );
    }

    return fullName;
  }

  private buildBaseFilters(query: QueryUsersDto): FindOptionsWhere<User> {
    return {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };
  }

  private async prepareTutorAssignments(
    role: UserRole,
    assignments: TutorAssignmentInputDto[] | undefined,
  ): Promise<TutorAssignmentInputDto[]> {
    if (role !== UserRole.TUTOR) {
      if (assignments?.length) {
        throw new BadRequestException(
          'Las asignaciones de aula solo aplican a cuentas de tutor.',
        );
      }

      return [];
    }

    if (!assignments?.length) {
      return [];
    }

    const settings = await this.institutionService.getSettings();
    const normalizedAssignments: TutorAssignmentInputDto[] = [];
    const seenKeys = new Set<string>();

    for (const assignment of assignments) {
      if (!settings.enabledGrades.includes(assignment.grade)) {
        throw new BadRequestException(
          'El grado asignado al tutor no esta habilitado institucionalmente.',
        );
      }

      if (!settings.enabledTurns.includes(assignment.shift)) {
        throw new BadRequestException(
          'El turno asignado al tutor no esta habilitado institucionalmente.',
        );
      }

      const normalizedSection = assignment.section.trim().toUpperCase();
      const availableSections =
        settings.sectionsByGrade[String(assignment.grade)] ?? [];

      if (!availableSections.includes(normalizedSection)) {
        throw new BadRequestException(
          'La seccion asignada al tutor no esta habilitada para el grado indicado.',
        );
      }

      const key = [
        assignment.schoolYear,
        assignment.grade,
        normalizedSection,
        assignment.shift,
      ].join('::');

      if (seenKeys.has(key)) {
        throw new BadRequestException(
          'No repitas la misma asignacion de aula para el tutor.',
        );
      }

      seenKeys.add(key);
      normalizedAssignments.push({
        schoolYear: assignment.schoolYear,
        grade: assignment.grade,
        section: normalizedSection,
        shift: assignment.shift,
      });
    }

    return normalizedAssignments;
  }

  private async replaceTutorAssignments(
    tutorAssignmentsRepository: Repository<TutorAssignment>,
    tutorUserId: string,
    role: UserRole,
    assignments: TutorAssignmentInputDto[],
    forceReplace = true,
  ): Promise<void> {
    if (role !== UserRole.TUTOR) {
      await tutorAssignmentsRepository.delete({ tutorUserId });
      return;
    }

    if (!forceReplace) {
      return;
    }

    await tutorAssignmentsRepository.delete({ tutorUserId });

    if (!assignments.length) {
      return;
    }

    await tutorAssignmentsRepository.save(
      assignments.map((assignment) =>
        tutorAssignmentsRepository.create({
          tutorUserId,
          schoolYear: assignment.schoolYear,
          grade: assignment.grade,
          section: assignment.section,
          shift: assignment.shift,
        }),
      ),
    );
  }

  private toTutorAssignmentResponse(
    assignment: TutorAssignment,
  ): TutorAssignmentResponseDto {
    return {
      id: assignment.id,
      schoolYear: assignment.schoolYear,
      grade: assignment.grade,
      section: assignment.section,
      shift: assignment.shift,
    };
  }
}
