import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';
import type { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { StudentShift } from '../common/enums/student-shift.enum';
import { InstitutionService } from '../institution/institution.service';
import { StudentEnrollment } from '../students/entities/student-enrollment.entity';
import { Student } from '../students/entities/student.entity';
import { TutorAssignment } from '../users/entities/tutor-assignment.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import {
  AnnouncementAdminDetailResponseDto,
  AnnouncementAdminListItemDto,
  AnnouncementAdminListResponseDto,
  AnnouncementAudienceResponseDto,
  AnnouncementDetailResponseDto,
  AnnouncementFeedItemDto,
  AnnouncementFeedResponseDto,
  AnnouncementLinkResponseDto,
  AnnouncementReadResponseDto,
  AnnouncementUnreadCountResponseDto,
} from './dto/announcement-response.dto';
import { QueryAdminAnnouncementsDto } from './dto/query-admin-announcements.dto';
import { QueryAnnouncementFeedDto } from './dto/query-announcement-feed.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementAudience } from './entities/announcement-audience.entity';
import { AnnouncementLink } from './entities/announcement-link.entity';
import { AnnouncementRead } from './entities/announcement-read.entity';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementAudienceType } from './enums/announcement-audience-type.enum';
import { AnnouncementPriority } from './enums/announcement-priority.enum';
import { AnnouncementStatus } from './enums/announcement-status.enum';
import { AnnouncementType } from './enums/announcement-type.enum';

type PreparedAnnouncementLink = {
  label: string;
  url: string;
  sortOrder: number;
};

type PreparedAnnouncementAudience = {
  audienceType: AnnouncementAudienceType;
  role: UserRole | null;
  schoolYear: number | null;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
  studentId: string | null;
};

type PreparedAnnouncementPayload = {
  title: string;
  summary: string;
  body: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  isPinned: boolean;
  scheduledAt: Date | null;
  visibleFrom: Date | null;
  visibleUntil: Date | null;
  links: PreparedAnnouncementLink[];
  audiences: PreparedAnnouncementAudience[];
};

type AnnouncementAudienceContext = {
  role: UserRole;
  studentId: string | null;
  schoolYear: number | null;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
};

const FEED_PAGE_SIZE = 12;
const ADMIN_PAGE_SIZE = 12;
const MAX_LINKS = 5;
const MAX_AUDIENCES = 12;
const PRIORITY_ORDER: Record<AnnouncementPriority, number> = {
  [AnnouncementPriority.URGENT]: 3,
  [AnnouncementPriority.IMPORTANT]: 2,
  [AnnouncementPriority.NORMAL]: 1,
};

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);
  private hasAnnouncementsStorage = false;
  private hasLoggedMissingAnnouncementsStorage = false;

  constructor(
    @InjectRepository(Announcement)
    private readonly announcementsRepository: Repository<Announcement>,
    @InjectRepository(AnnouncementLink)
    private readonly announcementLinksRepository: Repository<AnnouncementLink>,
    @InjectRepository(AnnouncementAudience)
    private readonly announcementAudiencesRepository: Repository<AnnouncementAudience>,
    @InjectRepository(AnnouncementRead)
    private readonly announcementReadsRepository: Repository<AnnouncementRead>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(StudentEnrollment)
    private readonly studentEnrollmentsRepository: Repository<StudentEnrollment>,
    @InjectRepository(TutorAssignment)
    private readonly tutorAssignmentsRepository: Repository<TutorAssignment>,
    private readonly institutionService: InstitutionService,
    private readonly dataSource: DataSource,
  ) {}

  async createAnnouncement(
    dto: CreateAnnouncementDto,
    createdBy: AuthenticatedRequestUser,
  ): Promise<AnnouncementAdminDetailResponseDto> {
    await this.ensureAnnouncementsStorageAvailable();
    const prepared = await this.prepareAnnouncementPayload(dto);
    await this.ensureAnnouncementManagementAllowed(
      createdBy,
      null,
      prepared.audiences,
    );

    const announcementId = await this.dataSource.transaction(
      async (manager) => {
        const savedAnnouncement = await manager
          .getRepository(Announcement)
          .save(
            manager.getRepository(Announcement).create({
              title: prepared.title,
              summary: prepared.summary,
              body: prepared.body,
              type: prepared.type,
              priority: prepared.priority,
              isPinned: prepared.isPinned,
              scheduledAt: prepared.scheduledAt,
              visibleFrom: prepared.visibleFrom,
              visibleUntil: prepared.visibleUntil,
              status: AnnouncementStatus.DRAFT,
              createdByUserId: createdBy.id,
            }),
          );

        await this.replaceAnnouncementRelations(
          manager,
          savedAnnouncement.id,
          prepared.links,
          prepared.audiences,
        );

        return savedAnnouncement.id;
      },
    );

    return this.getAdminAnnouncementById(announcementId, createdBy);
  }

  async updateAnnouncement(
    id: string,
    dto: UpdateAnnouncementDto,
    updatedBy: AuthenticatedRequestUser,
  ): Promise<AnnouncementAdminDetailResponseDto> {
    await this.ensureAnnouncementsStorageAvailable();
    await this.syncScheduledAnnouncements();
    const currentAnnouncement = await this.findAnnouncementById(id);

    if (
      ![AnnouncementStatus.DRAFT, AnnouncementStatus.SCHEDULED].includes(
        currentAnnouncement.status,
      )
    ) {
      throw new ConflictException(
        'Solo se pueden editar comunicados en borrador o programados.',
      );
    }

    const prepared = await this.prepareMergedAnnouncementPayload(
      currentAnnouncement,
      dto,
    );
    await this.ensureAnnouncementManagementAllowed(
      updatedBy,
      currentAnnouncement,
      prepared.audiences,
    );

    const announcementId = await this.dataSource.transaction(
      async (manager) => {
        const announcementRepository = manager.getRepository(Announcement);
        const announcement = await announcementRepository.findOneByOrFail({
          id,
        });

        announcement.title = prepared.title;
        announcement.summary = prepared.summary;
        announcement.body = prepared.body;
        announcement.type = prepared.type;
        announcement.priority = prepared.priority;
        announcement.isPinned = prepared.isPinned;
        announcement.scheduledAt = prepared.scheduledAt;
        announcement.visibleFrom = prepared.visibleFrom;
        announcement.visibleUntil = prepared.visibleUntil;

        if (announcement.status === AnnouncementStatus.SCHEDULED) {
          announcement.publishedAt = null;
          announcement.publishedByUserId = updatedBy.id;
        }

        await announcementRepository.save(announcement);
        await this.replaceAnnouncementRelations(
          manager,
          announcement.id,
          prepared.links,
          prepared.audiences,
        );

        return announcement.id;
      },
    );

    return this.getAdminAnnouncementById(announcementId, updatedBy);
  }

  async publishAnnouncement(
    id: string,
    publishedBy: AuthenticatedRequestUser,
  ): Promise<AnnouncementAdminDetailResponseDto> {
    await this.ensureAnnouncementsStorageAvailable();
    await this.syncScheduledAnnouncements();
    const announcement = await this.findAnnouncementById(id);
    await this.ensureAnnouncementManagementAllowed(
      publishedBy,
      announcement,
      announcement.audiences ?? [],
    );

    if (announcement.status === AnnouncementStatus.ARCHIVED) {
      throw new ConflictException(
        'No se puede publicar un comunicado archivado.',
      );
    }

    if (announcement.status === AnnouncementStatus.PUBLISHED) {
      throw new ConflictException(
        'El comunicado seleccionado ya fue publicado.',
      );
    }

    if (
      announcement.status === AnnouncementStatus.SCHEDULED &&
      announcement.scheduledAt
    ) {
      throw new ConflictException(
        'El comunicado seleccionado ya esta programado para su publicacion.',
      );
    }

    this.ensurePublishable(announcement);

    const now = new Date();
    const shouldSchedule =
      announcement.scheduledAt instanceof Date &&
      announcement.scheduledAt.getTime() > now.getTime();

    await this.announcementsRepository.update(
      { id: announcement.id },
      {
        status: shouldSchedule
          ? AnnouncementStatus.SCHEDULED
          : AnnouncementStatus.PUBLISHED,
        publishedByUserId: publishedBy.id,
        publishedAt: shouldSchedule ? null : now,
      },
    );

    return this.getAdminAnnouncementById(id, publishedBy);
  }

  async archiveAnnouncement(
    id: string,
    archivedBy: AuthenticatedRequestUser,
  ): Promise<AnnouncementAdminDetailResponseDto> {
    await this.ensureAnnouncementsStorageAvailable();
    await this.syncScheduledAnnouncements();
    const announcement = await this.findAnnouncementById(id);
    await this.ensureAnnouncementManagementAllowed(
      archivedBy,
      announcement,
      announcement.audiences ?? [],
    );

    if (announcement.status === AnnouncementStatus.ARCHIVED) {
      throw new ConflictException(
        'El comunicado seleccionado ya se encuentra archivado.',
      );
    }

    if (announcement.status !== AnnouncementStatus.PUBLISHED) {
      throw new ConflictException(
        'Solo los comunicados publicados se archivan. Los borradores o programados deben eliminarse si ya no se usarán.',
      );
    }

    await this.announcementsRepository.update(
      { id: announcement.id },
      {
        status: AnnouncementStatus.ARCHIVED,
        archivedAt: new Date(),
        archivedByUserId: archivedBy.id,
      },
    );

    return this.getAdminAnnouncementById(id, archivedBy);
  }

  async deleteAnnouncement(
    id: string,
    deletedBy: AuthenticatedRequestUser,
  ): Promise<{ id: string; message: string }> {
    await this.ensureAnnouncementsStorageAvailable();
    await this.syncScheduledAnnouncements();
    const announcement = await this.findAnnouncementById(id);
    await this.ensureAnnouncementManagementAllowed(
      deletedBy,
      announcement,
      announcement.audiences ?? [],
    );

    if (
      ![AnnouncementStatus.DRAFT, AnnouncementStatus.SCHEDULED].includes(
        announcement.status,
      )
    ) {
      throw new ConflictException(
        'Solo se pueden eliminar comunicados en borrador o programados que todavía no se hayan publicado.',
      );
    }

    await this.announcementsRepository.delete({ id: announcement.id });

    return {
      id: announcement.id,
      message: 'El comunicado fue eliminado correctamente.',
    };
  }

  async getAdminAnnouncements(
    query: QueryAdminAnnouncementsDto,
    authUser: AuthenticatedRequestUser,
  ): Promise<AnnouncementAdminListResponseDto> {
    await this.ensureAnnouncementsStorageAvailable();
    await this.syncScheduledAnnouncements();
    const page = query.page ?? 1;
    const limit = query.limit ?? ADMIN_PAGE_SIZE;
    const search = query.search?.trim().toLowerCase();

    const idsQuery =
      this.announcementsRepository.createQueryBuilder('announcement');

    if (authUser.role === UserRole.TUTOR) {
      idsQuery.andWhere('announcement.createdByUserId = :createdByUserId', {
        createdByUserId: authUser.id,
      });
    }

    if (query.status) {
      idsQuery.andWhere('announcement.status = :status', {
        status: query.status,
      });
    }

    if (query.priority) {
      idsQuery.andWhere('announcement.priority = :priority', {
        priority: query.priority,
      });
    }

    if (query.type) {
      idsQuery.andWhere('announcement.type = :type', {
        type: query.type,
      });
    }

    if (typeof query.isPinned === 'boolean') {
      idsQuery.andWhere('announcement.isPinned = :isPinned', {
        isPinned: query.isPinned,
      });
    }

    if (search) {
      idsQuery.andWhere(
        '(LOWER(announcement.title) LIKE :search OR LOWER(announcement.summary) LIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    idsQuery
      .orderBy('announcement.isPinned', 'DESC')
      .addOrderBy('announcement.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [announcementIds, total] = await idsQuery.getManyAndCount();

    if (announcementIds.length === 0) {
      return {
        items: [],
        total,
        page,
        limit,
      };
    }

    const announcements = await this.announcementsRepository.find({
      where: {
        id: In(announcementIds.map((announcement) => announcement.id)),
      },
      relations: [
        'links',
        'audiences',
        'audiences.student',
        'createdByUser',
        'publishedByUser',
        'archivedByUser',
      ],
    });

    const readsCountByAnnouncementId =
      await this.getReadCountsByAnnouncementIds(
        announcements.map((announcement) => announcement.id),
      );

    const announcementsById = new Map(
      announcements.map((announcement) => [announcement.id, announcement]),
    );

    return {
      items: announcementIds
        .map((announcement) => announcementsById.get(announcement.id))
        .filter((announcement): announcement is Announcement =>
          Boolean(announcement),
        )
        .map((announcement) =>
          this.toAnnouncementAdminListItem(
            announcement,
            readsCountByAnnouncementId.get(announcement.id) ?? 0,
          ),
        ),
      total,
      page,
      limit,
    };
  }

  async getAdminAnnouncementById(
    id: string,
    authUser: AuthenticatedRequestUser,
  ): Promise<AnnouncementAdminDetailResponseDto> {
    await this.ensureAnnouncementsStorageAvailable();
    await this.syncScheduledAnnouncements();
    const announcement = await this.findAnnouncementById(id);
    await this.ensureAnnouncementManagementAllowed(
      authUser,
      announcement,
      announcement.audiences ?? [],
    );
    const readCount = await this.announcementReadsRepository.count({
      where: { announcementId: id },
    });

    return this.toAnnouncementAdminDetail(announcement, readCount);
  }

  async getFeed(
    authUser: AuthenticatedRequestUser,
    query: QueryAnnouncementFeedDto,
  ): Promise<AnnouncementFeedResponseDto> {
    await this.ensureAnnouncementsStorageAvailable();
    await this.syncScheduledAnnouncements();
    const page = query.page ?? 1;
    const limit = query.limit ?? FEED_PAGE_SIZE;
    const audienceContext = await this.resolveAudienceContext(authUser);
    const announcements =
      await this.loadVisibleAnnouncementsForAudience(audienceContext);
    const readMap = await this.getAnnouncementReadMap(
      authUser.id,
      announcements.map((announcement) => announcement.id),
    );
    const readState =
      query.readState ?? (query.unreadOnly === true ? 'unread' : 'all');

    const filteredAnnouncements = this.sortAnnouncementsForFeed(
      announcements.filter((announcement) => {
        if (query.type && announcement.type !== query.type) {
          return false;
        }

        if (query.priority && announcement.priority !== query.priority) {
          return false;
        }

        if (readState === 'unread' && readMap.has(announcement.id)) {
          return false;
        }

        if (readState === 'read' && !readMap.has(announcement.id)) {
          return false;
        }

        return true;
      }),
    );

    const total = filteredAnnouncements.length;
    const start = (page - 1) * limit;
    const paginatedAnnouncements = filteredAnnouncements.slice(
      start,
      start + limit,
    );

    return {
      items: paginatedAnnouncements.map((announcement) =>
        this.toAnnouncementFeedItem(
          announcement,
          readMap.get(announcement.id) ?? null,
        ),
      ),
      total,
      page,
      limit,
      summary: {
        unreadCount: filteredAnnouncements.filter(
          (announcement) => !readMap.has(announcement.id),
        ).length,
        pinnedCount: filteredAnnouncements.filter(
          (announcement) => announcement.isPinned,
        ).length,
        urgentCount: filteredAnnouncements.filter(
          (announcement) =>
            announcement.priority === AnnouncementPriority.URGENT,
        ).length,
      },
    };
  }

  async getUnreadCount(
    authUser: AuthenticatedRequestUser,
  ): Promise<AnnouncementUnreadCountResponseDto> {
    await this.ensureAnnouncementsStorageAvailable();
    await this.syncScheduledAnnouncements();
    const audienceContext = await this.resolveAudienceContext(authUser);
    const announcements =
      await this.loadVisibleAnnouncementsForAudience(audienceContext);
    const readMap = await this.getAnnouncementReadMap(
      authUser.id,
      announcements.map((announcement) => announcement.id),
    );

    return {
      unreadCount: announcements.filter(
        (announcement) => !readMap.has(announcement.id),
      ).length,
    };
  }

  async getAnnouncementDetail(
    id: string,
    authUser: AuthenticatedRequestUser,
  ): Promise<AnnouncementDetailResponseDto> {
    await this.ensureAnnouncementsStorageAvailable();
    await this.syncScheduledAnnouncements();
    const audienceContext = await this.resolveAudienceContext(authUser);
    const announcement = await this.findAnnouncementById(id);

    if (!this.isAnnouncementReadableByUser(announcement, audienceContext)) {
      throw new NotFoundException('Comunicado no encontrado.');
    }

    const readMap = await this.getAnnouncementReadMap(authUser.id, [
      announcement.id,
    ]);

    return this.toAnnouncementDetail(
      announcement,
      readMap.get(announcement.id) ?? null,
    );
  }

  async markAsRead(
    id: string,
    authUser: AuthenticatedRequestUser,
  ): Promise<AnnouncementReadResponseDto> {
    await this.ensureAnnouncementsStorageAvailable();
    await this.getAnnouncementDetail(id, authUser);
    const now = new Date();
    let announcementRead = await this.announcementReadsRepository.findOne({
      where: {
        announcementId: id,
        userId: authUser.id,
      },
    });

    if (!announcementRead) {
      announcementRead = this.announcementReadsRepository.create({
        announcementId: id,
        userId: authUser.id,
        firstReadAt: now,
        lastReadAt: now,
      });
    } else {
      announcementRead.lastReadAt = now;
    }

    const savedRead =
      await this.announcementReadsRepository.save(announcementRead);

    return {
      announcementId: savedRead.announcementId,
      firstReadAt: savedRead.firstReadAt.toISOString(),
      lastReadAt: savedRead.lastReadAt.toISOString(),
    };
  }

  private async prepareMergedAnnouncementPayload(
    currentAnnouncement: Announcement,
    dto: UpdateAnnouncementDto,
  ): Promise<PreparedAnnouncementPayload> {
    return this.prepareAnnouncementPayload({
      title: dto.title ?? currentAnnouncement.title,
      summary: dto.summary ?? currentAnnouncement.summary,
      body: dto.body ?? currentAnnouncement.body,
      type: dto.type ?? currentAnnouncement.type,
      priority: dto.priority ?? currentAnnouncement.priority,
      isPinned: dto.isPinned ?? currentAnnouncement.isPinned,
      scheduledAt:
        dto.scheduledAt === undefined
          ? currentAnnouncement.scheduledAt?.toISOString()
          : (dto.scheduledAt ?? undefined),
      visibleFrom:
        dto.visibleFrom === undefined
          ? currentAnnouncement.visibleFrom?.toISOString()
          : (dto.visibleFrom ?? undefined),
      visibleUntil:
        dto.visibleUntil === undefined
          ? currentAnnouncement.visibleUntil?.toISOString()
          : (dto.visibleUntil ?? undefined),
      links:
        dto.links ??
        currentAnnouncement.links.map((link) => ({
          label: link.label,
          url: link.url,
          sortOrder: link.sortOrder,
        })),
      audiences:
        dto.audiences ??
        currentAnnouncement.audiences.map((audience) => ({
          audienceType: audience.audienceType,
          role: audience.role ?? undefined,
          schoolYear: audience.schoolYear ?? undefined,
          grade: audience.grade ?? undefined,
          section: audience.section ?? undefined,
          shift: audience.shift ?? undefined,
          studentId: audience.studentId ?? undefined,
        })),
    });
  }

  private async prepareAnnouncementPayload(
    dto: CreateAnnouncementDto | UpdateAnnouncementDto,
  ): Promise<PreparedAnnouncementPayload> {
    const title = dto.title?.trim();
    const summary = dto.summary?.trim();
    const body = dto.body?.trim();

    if (!title) {
      throw new BadRequestException('El titulo del comunicado es obligatorio.');
    }

    if (!summary) {
      throw new BadRequestException(
        'El resumen del comunicado es obligatorio.',
      );
    }

    if (!body) {
      throw new BadRequestException('El cuerpo del comunicado es obligatorio.');
    }

    const scheduledAt = this.parseOptionalDate(dto.scheduledAt);
    const visibleFrom = this.parseOptionalDate(dto.visibleFrom);
    const visibleUntil = this.parseOptionalDate(dto.visibleUntil);
    const links = this.prepareLinks(dto.links ?? []);
    const audiences = await this.prepareAudiences(dto.audiences ?? []);

    this.ensureValidVisibilityWindow({
      scheduledAt,
      visibleFrom,
      visibleUntil,
    });

    return {
      title,
      summary,
      body,
      type: dto.type as AnnouncementType,
      priority: dto.priority as AnnouncementPriority,
      isPinned: dto.isPinned ?? false,
      scheduledAt,
      visibleFrom,
      visibleUntil,
      links,
      audiences,
    };
  }

  private prepareLinks(
    links: Array<{
      label: string;
      url: string;
      sortOrder?: number;
    }>,
  ): PreparedAnnouncementLink[] {
    if (!Array.isArray(links)) {
      return [];
    }

    if (links.length > MAX_LINKS) {
      throw new BadRequestException(
        `Solo puedes registrar hasta ${MAX_LINKS} enlaces por comunicado.`,
      );
    }

    return links.map((link, index) => ({
      label: link.label.trim(),
      url: link.url.trim(),
      sortOrder: typeof link.sortOrder === 'number' ? link.sortOrder : index,
    }));
  }

  private async prepareAudiences(
    audiences: Array<{
      audienceType: AnnouncementAudienceType;
      role?: UserRole;
      schoolYear?: number;
      grade?: number;
      section?: string;
      shift?: StudentShift;
      studentId?: string;
    }>,
  ): Promise<PreparedAnnouncementAudience[]> {
    if (!Array.isArray(audiences) || audiences.length === 0) {
      throw new BadRequestException(
        'Debes definir al menos una audiencia para el comunicado.',
      );
    }

    if (audiences.length > MAX_AUDIENCES) {
      throw new BadRequestException(
        `Solo puedes registrar hasta ${MAX_AUDIENCES} segmentos de audiencia por comunicado.`,
      );
    }

    const dedupedAudiences = new Map<string, PreparedAnnouncementAudience>();

    for (const audience of audiences) {
      const prepared = await this.prepareAudience(audience);
      const dedupeKey = [
        prepared.audienceType,
        prepared.role ?? '',
        prepared.schoolYear ?? '',
        prepared.grade ?? '',
        prepared.section ?? '',
        prepared.shift ?? '',
        prepared.studentId ?? '',
      ].join('|');

      dedupedAudiences.set(dedupeKey, prepared);
    }

    return Array.from(dedupedAudiences.values());
  }

  private async prepareAudience(audience: {
    audienceType: AnnouncementAudienceType;
    role?: UserRole;
    schoolYear?: number;
    grade?: number;
    section?: string;
    shift?: StudentShift;
    studentId?: string;
  }): Promise<PreparedAnnouncementAudience> {
    const baseAudience: PreparedAnnouncementAudience = {
      audienceType: audience.audienceType,
      role: null,
      schoolYear: null,
      grade: null,
      section: null,
      shift: null,
      studentId: null,
    };

    if (
      [
        AnnouncementAudienceType.ALL,
        AnnouncementAudienceType.ALL_STUDENTS,
        AnnouncementAudienceType.ALL_STAFF,
      ].includes(audience.audienceType)
    ) {
      return baseAudience;
    }

    if (audience.audienceType === AnnouncementAudienceType.ROLE) {
      if (!audience.role) {
        throw new BadRequestException(
          'Debes indicar el rol cuando la audiencia es por rol.',
        );
      }

      return {
        ...baseAudience,
        role: audience.role,
      };
    }

    if (audience.audienceType === AnnouncementAudienceType.STUDENT_SHIFT) {
      if (!audience.schoolYear || !audience.shift) {
        throw new BadRequestException(
          'La audiencia por turno necesita ano escolar y turno.',
        );
      }

      return {
        ...baseAudience,
        schoolYear: audience.schoolYear,
        shift: audience.shift,
      };
    }

    if (audience.audienceType === AnnouncementAudienceType.STUDENT_GRADE) {
      if (!audience.schoolYear || typeof audience.grade !== 'number') {
        throw new BadRequestException(
          'La audiencia por grado necesita ano escolar y grado.',
        );
      }

      return {
        ...baseAudience,
        schoolYear: audience.schoolYear,
        grade: audience.grade,
      };
    }

    if (audience.audienceType === AnnouncementAudienceType.STUDENT_CLASSROOM) {
      if (
        !audience.schoolYear ||
        typeof audience.grade !== 'number' ||
        !audience.section ||
        !audience.shift
      ) {
        throw new BadRequestException(
          'La audiencia por aula necesita ano escolar, grado, seccion y turno.',
        );
      }

      return {
        ...baseAudience,
        schoolYear: audience.schoolYear,
        grade: audience.grade,
        section: audience.section.trim().toUpperCase(),
        shift: audience.shift,
      };
    }

    if (audience.audienceType === AnnouncementAudienceType.STUDENT) {
      if (!audience.studentId) {
        throw new BadRequestException(
          'La audiencia por estudiante necesita un estudiante valido.',
        );
      }

      const student = await this.studentsRepository.findOneBy({
        id: audience.studentId,
      });

      if (!student) {
        throw new NotFoundException(
          'El estudiante seleccionado para la audiencia no existe.',
        );
      }

      return {
        ...baseAudience,
        studentId: student.id,
      };
    }

    throw new BadRequestException('Tipo de audiencia no soportado.');
  }

  private ensureValidVisibilityWindow(input: {
    scheduledAt: Date | null;
    visibleFrom: Date | null;
    visibleUntil: Date | null;
  }): void {
    const now = new Date();

    if (input.scheduledAt && input.scheduledAt.getTime() <= now.getTime()) {
      throw new BadRequestException(
        'La fecha programada debe ser posterior al momento actual.',
      );
    }

    if (
      input.visibleFrom &&
      input.visibleUntil &&
      input.visibleUntil.getTime() < input.visibleFrom.getTime()
    ) {
      throw new BadRequestException(
        'La fecha final de visibilidad no puede ser anterior a la fecha inicial.',
      );
    }

    if (
      input.scheduledAt &&
      input.visibleFrom &&
      input.visibleFrom.getTime() < input.scheduledAt.getTime()
    ) {
      throw new BadRequestException(
        'La visibilidad no puede empezar antes de la publicacion programada.',
      );
    }
  }

  private ensurePublishable(announcement: Announcement): void {
    if (!announcement.title.trim()) {
      throw new BadRequestException(
        'No se puede publicar un comunicado sin titulo.',
      );
    }

    if (!announcement.summary.trim()) {
      throw new BadRequestException(
        'No se puede publicar un comunicado sin resumen.',
      );
    }

    if (!announcement.body.trim()) {
      throw new BadRequestException(
        'No se puede publicar un comunicado sin contenido.',
      );
    }

    if (!announcement.audiences?.length) {
      throw new BadRequestException(
        'No se puede publicar un comunicado sin audiencia definida.',
      );
    }
  }

  private async replaceAnnouncementRelations(
    manager: DataSource['manager'],
    announcementId: string,
    links: PreparedAnnouncementLink[],
    audiences: PreparedAnnouncementAudience[],
  ): Promise<void> {
    await manager.getRepository(AnnouncementLink).delete({ announcementId });
    await manager
      .getRepository(AnnouncementAudience)
      .delete({ announcementId });

    if (links.length > 0) {
      await manager.getRepository(AnnouncementLink).save(
        links.map((link) => ({
          announcementId,
          label: link.label,
          url: link.url,
          sortOrder: link.sortOrder,
        })),
      );
    }

    if (audiences.length > 0) {
      await manager.getRepository(AnnouncementAudience).save(
        audiences.map((audience) => ({
          announcementId,
          audienceType: audience.audienceType,
          role: audience.role,
          schoolYear: audience.schoolYear,
          grade: audience.grade,
          section: audience.section,
          shift: audience.shift,
          studentId: audience.studentId,
        })),
      );
    }
  }

  private async syncScheduledAnnouncements(): Promise<void> {
    const now = new Date();
    const dueAnnouncements = await this.announcementsRepository.find({
      where: {
        status: AnnouncementStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(now),
      },
    });

    if (dueAnnouncements.length === 0) {
      return;
    }

    for (const announcement of dueAnnouncements) {
      announcement.status = AnnouncementStatus.PUBLISHED;
      announcement.publishedAt = announcement.scheduledAt ?? now;
    }

    await this.announcementsRepository.save(dueAnnouncements);
  }

  private async ensureAnnouncementManagementAllowed(
    authUser: AuthenticatedRequestUser,
    announcement: Announcement | null,
    audiences: PreparedAnnouncementAudience[] | AnnouncementAudience[],
  ): Promise<void> {
    if (authUser.role !== UserRole.TUTOR) {
      return;
    }

    if (announcement && announcement.createdByUserId !== authUser.id) {
      throw new NotFoundException('Comunicado no encontrado.');
    }

    await this.ensureTutorSectionAudiences(authUser.id, audiences);
  }

  private async ensureTutorSectionAudiences(
    tutorUserId: string,
    audiences: PreparedAnnouncementAudience[] | AnnouncementAudience[],
  ): Promise<void> {
    if (audiences.length === 0) {
      throw new BadRequestException(
        'El tutor debe definir al menos una seccion de destino para el comunicado.',
      );
    }

    const assignments = await this.tutorAssignmentsRepository.find({
      where: { tutorUserId },
    });

    if (assignments.length === 0) {
      throw new BadRequestException(
        'Tu cuenta de tutor no tiene secciones asignadas para gestionar comunicados.',
      );
    }

    const allowedClassrooms = new Set(
      assignments.map((assignment) =>
        [
          assignment.schoolYear,
          assignment.grade,
          assignment.section,
          assignment.shift,
        ].join('::'),
      ),
    );

    for (const audience of audiences) {
      if (
        audience.audienceType !== AnnouncementAudienceType.STUDENT_CLASSROOM ||
        typeof audience.schoolYear !== 'number' ||
        typeof audience.grade !== 'number' ||
        !audience.section ||
        !audience.shift
      ) {
        throw new BadRequestException(
          'El tutor solo puede enviar comunicados a sus secciones asignadas.',
        );
      }

      const key = [
        audience.schoolYear,
        audience.grade,
        audience.section,
        audience.shift,
      ].join('::');

      if (!allowedClassrooms.has(key)) {
        throw new ForbiddenException(
          'Solo puedes publicar comunicados para las secciones asignadas a tu cuenta de tutor.',
        );
      }
    }
  }

  private async resolveAudienceContext(
    authUser: AuthenticatedRequestUser,
  ): Promise<AnnouncementAudienceContext> {
    if (authUser.role !== UserRole.STUDENT) {
      return {
        role: authUser.role,
        studentId: null,
        schoolYear: null,
        grade: null,
        section: null,
        shift: null,
      };
    }

    const activeSchoolYear =
      await this.institutionService.getActiveSchoolYear();
    const student = await this.studentsRepository.findOne({
      where: { userId: authUser.id },
      relations: ['enrollments'],
    });

    if (!student) {
      return {
        role: authUser.role,
        studentId: null,
        schoolYear: activeSchoolYear,
        grade: null,
        section: null,
        shift: null,
      };
    }

    const enrollment =
      student.enrollments?.find(
        (currentEnrollment) =>
          currentEnrollment.schoolYear === activeSchoolYear &&
          currentEnrollment.isActive,
      ) ?? null;

    return {
      role: authUser.role,
      studentId: student.id,
      schoolYear: enrollment?.schoolYear ?? activeSchoolYear,
      grade: enrollment?.grade ?? null,
      section: enrollment?.section ?? null,
      shift: enrollment?.shift ?? null,
    };
  }

  private async loadVisibleAnnouncementsForAudience(
    audienceContext: AnnouncementAudienceContext,
  ): Promise<Announcement[]> {
    const announcements = await this.announcementsRepository.find({
      where: {
        status: AnnouncementStatus.PUBLISHED,
      },
      relations: [
        'links',
        'audiences',
        'audiences.student',
        'createdByUser',
        'publishedByUser',
        'archivedByUser',
      ],
    });

    const now = new Date();

    return announcements
      .filter((announcement) =>
        this.isWithinVisibilityWindow(announcement, now),
      )
      .filter((announcement) =>
        this.matchesAudience(announcement.audiences ?? [], audienceContext),
      );
  }

  private isWithinVisibilityWindow(
    announcement: Announcement,
    now: Date,
  ): boolean {
    if (announcement.status !== AnnouncementStatus.PUBLISHED) {
      return false;
    }

    if (
      announcement.visibleFrom &&
      announcement.visibleFrom.getTime() > now.getTime()
    ) {
      return false;
    }

    if (
      announcement.visibleUntil &&
      announcement.visibleUntil.getTime() < now.getTime()
    ) {
      return false;
    }

    return true;
  }

  private matchesAudience(
    audiences: AnnouncementAudience[],
    audienceContext: AnnouncementAudienceContext,
  ): boolean {
    return audiences.some((audience) => {
      if (audience.audienceType === AnnouncementAudienceType.ALL) {
        return true;
      }

      if (audience.audienceType === AnnouncementAudienceType.ALL_STAFF) {
        return [
          UserRole.DIRECTOR,
          UserRole.SECRETARY,
          UserRole.AUXILIARY,
          UserRole.TUTOR,
        ].includes(audienceContext.role);
      }

      if (audience.audienceType === AnnouncementAudienceType.ALL_STUDENTS) {
        return audienceContext.role === UserRole.STUDENT;
      }

      if (audience.audienceType === AnnouncementAudienceType.ROLE) {
        return audience.role === audienceContext.role;
      }

      if (audienceContext.role !== UserRole.STUDENT) {
        return false;
      }

      if (
        audience.audienceType === AnnouncementAudienceType.STUDENT &&
        audience.studentId
      ) {
        return audience.studentId === audienceContext.studentId;
      }

      if (
        audience.audienceType === AnnouncementAudienceType.STUDENT_SHIFT &&
        audience.schoolYear === audienceContext.schoolYear
      ) {
        return audience.shift === audienceContext.shift;
      }

      if (
        audience.audienceType === AnnouncementAudienceType.STUDENT_GRADE &&
        audience.schoolYear === audienceContext.schoolYear
      ) {
        return audience.grade === audienceContext.grade;
      }

      if (
        audience.audienceType === AnnouncementAudienceType.STUDENT_CLASSROOM &&
        audience.schoolYear === audienceContext.schoolYear
      ) {
        return (
          audience.grade === audienceContext.grade &&
          audience.section === audienceContext.section &&
          audience.shift === audienceContext.shift
        );
      }

      return false;
    });
  }

  private isAnnouncementReadableByUser(
    announcement: Announcement,
    audienceContext: AnnouncementAudienceContext,
  ): boolean {
    return (
      this.isWithinVisibilityWindow(announcement, new Date()) &&
      this.matchesAudience(announcement.audiences ?? [], audienceContext)
    );
  }

  private async findAnnouncementById(id: string): Promise<Announcement> {
    const announcement = await this.announcementsRepository.findOne({
      where: { id },
      relations: [
        'links',
        'audiences',
        'audiences.student',
        'createdByUser',
        'publishedByUser',
        'archivedByUser',
      ],
    });

    if (!announcement) {
      throw new NotFoundException('Comunicado no encontrado.');
    }

    announcement.links = [...(announcement.links ?? [])].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );

    return announcement;
  }

  private async getReadCountsByAnnouncementIds(
    announcementIds: string[],
  ): Promise<Map<string, number>> {
    if (announcementIds.length === 0) {
      return new Map();
    }

    const groupedReads = await this.announcementReadsRepository
      .createQueryBuilder('announcementRead')
      .select('announcementRead.announcementId', 'announcementId')
      .addSelect('COUNT(announcementRead.id)', 'count')
      .where('announcementRead.announcementId IN (:...announcementIds)', {
        announcementIds,
      })
      .groupBy('announcementRead.announcementId')
      .getRawMany<{ announcementId: string; count: string }>();

    return new Map(
      groupedReads.map((item) => [item.announcementId, Number(item.count)]),
    );
  }

  private async getAnnouncementReadMap(
    userId: string,
    announcementIds: string[],
  ): Promise<Map<string, AnnouncementRead>> {
    if (announcementIds.length === 0) {
      return new Map();
    }

    const reads = await this.announcementReadsRepository.find({
      where: {
        userId,
        announcementId: In(announcementIds),
      },
    });

    return new Map(
      reads.map((announcementRead) => [
        announcementRead.announcementId,
        announcementRead,
      ]),
    );
  }

  private sortAnnouncementsForFeed(
    announcements: Announcement[],
  ): Announcement[] {
    return [...announcements].sort((left, right) => {
      const pinnedDelta = Number(right.isPinned) - Number(left.isPinned);

      if (pinnedDelta !== 0) {
        return pinnedDelta;
      }

      const priorityDelta =
        PRIORITY_ORDER[right.priority] - PRIORITY_ORDER[left.priority];

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const rightDate =
        right.publishedAt?.getTime() ?? right.createdAt.getTime();
      const leftDate = left.publishedAt?.getTime() ?? left.createdAt.getTime();
      return rightDate - leftDate;
    });
  }

  private toAnnouncementFeedItem(
    announcement: Announcement,
    read: AnnouncementRead | null,
  ): AnnouncementFeedItemDto {
    return {
      id: announcement.id,
      title: announcement.title,
      summary: announcement.summary,
      type: announcement.type,
      priority: announcement.priority,
      isPinned: announcement.isPinned,
      publishedAt:
        announcement.publishedAt?.toISOString() ??
        announcement.createdAt.toISOString(),
      visibleFrom: announcement.visibleFrom?.toISOString() ?? null,
      visibleUntil: announcement.visibleUntil?.toISOString() ?? null,
      linksCount: announcement.links?.length ?? 0,
      isRead: Boolean(read),
      firstReadAt: read?.firstReadAt.toISOString() ?? null,
      lastReadAt: read?.lastReadAt.toISOString() ?? null,
    };
  }

  private toAnnouncementDetail(
    announcement: Announcement,
    read: AnnouncementRead | null,
  ): AnnouncementDetailResponseDto {
    return {
      ...this.toAnnouncementFeedItem(announcement, read),
      body: announcement.body,
      links: (announcement.links ?? []).map((link) =>
        this.toAnnouncementLink(link),
      ),
    };
  }

  private toAnnouncementAdminListItem(
    announcement: Announcement,
    readCount: number,
  ): AnnouncementAdminListItemDto {
    return {
      id: announcement.id,
      title: announcement.title,
      summary: announcement.summary,
      type: announcement.type,
      priority: announcement.priority,
      status: announcement.status,
      isPinned: announcement.isPinned,
      scheduledAt: announcement.scheduledAt?.toISOString() ?? null,
      publishedAt: announcement.publishedAt?.toISOString() ?? null,
      visibleFrom: announcement.visibleFrom?.toISOString() ?? null,
      visibleUntil: announcement.visibleUntil?.toISOString() ?? null,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
      createdByUserId: announcement.createdByUserId,
      createdByDisplayName:
        announcement.createdByUser?.displayName ?? 'Usuario no disponible',
      publishedByUserId: announcement.publishedByUserId,
      publishedByDisplayName: announcement.publishedByUser?.displayName ?? null,
      archivedByUserId: announcement.archivedByUserId,
      archivedByDisplayName: announcement.archivedByUser?.displayName ?? null,
      archivedAt: announcement.archivedAt?.toISOString() ?? null,
      readCount,
      audienceSummary: this.buildAudienceSummary(announcement.audiences ?? []),
    };
  }

  private toAnnouncementAdminDetail(
    announcement: Announcement,
    readCount: number,
  ): AnnouncementAdminDetailResponseDto {
    return {
      ...this.toAnnouncementAdminListItem(announcement, readCount),
      body: announcement.body,
      links: (announcement.links ?? []).map((link) =>
        this.toAnnouncementLink(link),
      ),
      audiences: (announcement.audiences ?? []).map((audience) =>
        this.toAnnouncementAudience(audience),
      ),
      canEdit: [
        AnnouncementStatus.DRAFT,
        AnnouncementStatus.SCHEDULED,
      ].includes(announcement.status),
      canPublish: announcement.status === AnnouncementStatus.DRAFT,
      canArchive: announcement.status === AnnouncementStatus.PUBLISHED,
      canDelete: [
        AnnouncementStatus.DRAFT,
        AnnouncementStatus.SCHEDULED,
      ].includes(announcement.status),
    };
  }

  private toAnnouncementLink(
    link: AnnouncementLink,
  ): AnnouncementLinkResponseDto {
    return {
      id: link.id,
      label: link.label,
      url: link.url,
      sortOrder: link.sortOrder,
    };
  }

  private toAnnouncementAudience(
    audience: AnnouncementAudience,
  ): AnnouncementAudienceResponseDto {
    const studentFullName = audience.student
      ? `${audience.student.lastName} ${audience.student.firstName}`.trim()
      : null;

    return {
      id: audience.id,
      audienceType: audience.audienceType,
      role: audience.role,
      schoolYear: audience.schoolYear,
      grade: audience.grade,
      section: audience.section,
      shift: audience.shift,
      studentId: audience.studentId,
      studentCode: audience.student?.code ?? null,
      studentFullName,
      label: this.buildAudienceLabel(audience, audience.student ?? null),
    };
  }

  private buildAudienceSummary(audiences: AnnouncementAudience[]): string[] {
    return Array.from(
      new Set(
        audiences.map((audience) =>
          this.buildAudienceLabel(audience, audience.student ?? null),
        ),
      ),
    );
  }

  private buildAudienceLabel(
    audience: AnnouncementAudience | PreparedAnnouncementAudience,
    student: Student | null,
  ): string {
    if (audience.audienceType === AnnouncementAudienceType.ALL) {
      return 'Todos';
    }

    if (audience.audienceType === AnnouncementAudienceType.ALL_STUDENTS) {
      return 'Todos los estudiantes';
    }

    if (audience.audienceType === AnnouncementAudienceType.ALL_STAFF) {
      return 'Todo el personal';
    }

    if (audience.audienceType === AnnouncementAudienceType.ROLE) {
      return `Rol: ${this.getRoleLabel(audience.role)}`;
    }

    if (audience.audienceType === AnnouncementAudienceType.STUDENT_SHIFT) {
      return `Estudiantes del turno ${this.getShiftLabel(audience.shift)}`;
    }

    if (audience.audienceType === AnnouncementAudienceType.STUDENT_GRADE) {
      return `Estudiantes de ${audience.grade}. grado`;
    }

    if (audience.audienceType === AnnouncementAudienceType.STUDENT_CLASSROOM) {
      return `${audience.grade}. ${audience.section} - ${this.getShiftLabel(audience.shift)}`;
    }

    if (audience.audienceType === AnnouncementAudienceType.STUDENT) {
      if (student) {
        return `Estudiante: ${student.code} - ${student.lastName} ${student.firstName}`.trim();
      }

      return 'Estudiante especifico';
    }

    return 'Audiencia';
  }

  private getRoleLabel(role: UserRole | null): string {
    if (role === UserRole.DIRECTOR) {
      return 'Director';
    }

    if (role === UserRole.SECRETARY) {
      return 'Secretaria';
    }

    if (role === UserRole.AUXILIARY) {
      return 'Auxiliar';
    }

    if (role === UserRole.TUTOR) {
      return 'Tutor';
    }

    if (role === UserRole.STUDENT) {
      return 'Estudiante';
    }

    return 'Rol';
  }

  private getShiftLabel(shift: StudentShift | null): string {
    if (shift === StudentShift.MORNING) {
      return 'manana';
    }

    if (shift === StudentShift.AFTERNOON) {
      return 'tarde';
    }

    return 'sin turno';
  }

  private parseOptionalDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    return new Date(value);
  }

  private async ensureAnnouncementsStorageAvailable(): Promise<void> {
    if (await this.isAnnouncementsStorageAvailable()) {
      return;
    }

    throw new ServiceUnavailableException(
      'La estructura de comunicados aun no esta disponible. Aplica la migracion pendiente para habilitar este modulo.',
    );
  }

  private async isAnnouncementsStorageAvailable(): Promise<boolean> {
    if (this.hasAnnouncementsStorage) {
      return true;
    }

    const rawResult: unknown = await this.dataSource.query(`
      SELECT
        to_regclass('public.announcements') AS announcements,
        to_regclass('public.announcement_links') AS announcement_links,
        to_regclass('public.announcement_audiences') AS announcement_audiences,
        to_regclass('public.announcement_reads') AS announcement_reads
    `);
    const rows = Array.isArray(rawResult) ? (rawResult as unknown[]) : [];
    const firstRow = rows[0];
    const schemaState =
      firstRow && typeof firstRow === 'object'
        ? (firstRow as Record<string, unknown>)
        : {};
    const requiredTables = [
      'announcements',
      'announcement_links',
      'announcement_audiences',
      'announcement_reads',
    ];
    const isAvailable = requiredTables.every((tableName) => {
      const value = schemaState[tableName];
      return typeof value === 'string' && value.length > 0;
    });

    if (isAvailable) {
      this.hasAnnouncementsStorage = true;
      return true;
    }

    if (!this.hasLoggedMissingAnnouncementsStorage) {
      this.logger.warn(
        'Las tablas del modulo de comunicados no existen en la base de datos actual. Aplica la migracion 1744200000000-create-announcements para habilitar este modulo.',
      );
      this.hasLoggedMissingAnnouncementsStorage = true;
    }

    return false;
  }
}
