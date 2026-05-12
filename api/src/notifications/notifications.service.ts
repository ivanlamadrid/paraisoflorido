import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { Student } from '../students/entities/student.entity';
import { RegisterNotificationTokenDto } from './dto/register-notification-token.dto';
import {
  MarkNotificationReadResponseDto,
  NotificationDebugSendResponseDto,
  NotificationDeliverySummaryDto,
  NotificationResponseDto,
  NotificationTestResponseDto,
  NotificationTokenResponseDto,
} from './dto/notification-response.dto';
import { NotificationDeliveryAttempt } from './entities/notification-delivery-attempt.entity';
import { NotificationToken } from './entities/notification-token.entity';
import { Notification } from './entities/notification.entity';
import { NotificationDeliveryProvider } from './enums/notification-delivery-provider.enum';
import { NotificationDeliveryStatus } from './enums/notification-delivery-status.enum';
import { NotificationPlatform } from './enums/notification-platform.enum';
import { NotificationType } from './enums/notification-type.enum';
import { FcmPushPayload, FcmService } from './fcm.service';

type CreateInternalNotificationInput = {
  userId: string;
  studentId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
};

type AttendanceMarkedInput = {
  attendanceRecordId: string;
  studentId: string;
  markedAt: Date;
};

type AttendanceNotificationRecipient = {
  userId: string;
  student: Student;
};

type NotifyAttendanceEntryOptions = {
  sendFcm?: boolean;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationToken)
    private readonly notificationTokensRepository: Repository<NotificationToken>,
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationDeliveryAttempt)
    private readonly deliveryAttemptsRepository: Repository<NotificationDeliveryAttempt>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly fcmService: FcmService,
  ) {}

  async registerToken(
    userId: string,
    dto: RegisterNotificationTokenDto,
    userAgent: string | undefined,
  ): Promise<NotificationTokenResponseDto> {
    const now = new Date();
    const token = dto.token.trim();
    const platform = dto.platform ?? NotificationPlatform.UNKNOWN;
    const resolvedUserAgent = (dto.userAgent ?? userAgent ?? '').trim() || null;

    let notificationToken = await this.notificationTokensRepository.findOneBy({
      token,
    });

    if (!notificationToken) {
      notificationToken = this.notificationTokensRepository.create({
        userId,
        token,
        platform,
        userAgent: resolvedUserAgent,
        enabled: true,
        lastSeenAt: now,
        revokedAt: null,
      });
    } else {
      notificationToken.userId = userId;
      notificationToken.platform = platform;
      notificationToken.userAgent = resolvedUserAgent;
      notificationToken.enabled = true;
      notificationToken.lastSeenAt = now;
      notificationToken.revokedAt = null;
    }

    const savedToken =
      await this.notificationTokensRepository.save(notificationToken);

    return this.toNotificationTokenResponse(savedToken);
  }

  async unregisterToken(userId: string, token: string): Promise<{ ok: true }> {
    const notificationToken = await this.notificationTokensRepository.findOneBy(
      {
        userId,
        token: token.trim(),
      },
    );

    if (!notificationToken) {
      return { ok: true };
    }

    notificationToken.enabled = false;
    notificationToken.revokedAt = new Date();
    await this.notificationTokensRepository.save(notificationToken);

    return { ok: true };
  }

  async listUserNotifications(
    userId: string,
  ): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return notifications.map((notification) =>
      this.toNotificationResponse(notification),
    );
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<MarkNotificationReadResponseDto> {
    const notification = await this.notificationsRepository.findOneBy({
      id: notificationId,
      userId,
    });

    if (!notification) {
      throw new NotFoundException('Notificacion no encontrada.');
    }

    notification.readAt = notification.readAt ?? new Date();
    const savedNotification =
      await this.notificationsRepository.save(notification);

    return {
      id: savedNotification.id,
      readAt:
        savedNotification.readAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async createInternalNotification(
    input: CreateInternalNotificationInput,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId: input.userId,
      studentId: input.studentId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      dataJson: input.data ? this.normalizeData(input.data) : null,
      readAt: null,
    });

    return this.notificationsRepository.save(notification);
  }

  async sendPushToUser(
    userId: string,
    payload: FcmPushPayload,
    notification: Notification,
  ): Promise<NotificationDeliverySummaryDto> {
    const activeTokens = await this.findActiveTokensForUser(userId);

    const summary: NotificationDeliverySummaryDto = {
      totalTokens: activeTokens.length,
      sent: 0,
      failed: 0,
      invalidTokens: 0,
      skipped: 0,
    };

    this.logger.log(
      `[FCM] delivery notificationId=${notification.id} userId=${userId} activeTokensCount=${activeTokens.length}`,
    );

    if (activeTokens.length === 0) {
      summary.skipped = 1;
      await this.createDeliveryAttempt({
        notificationId: notification.id,
        notificationTokenId: null,
        status: NotificationDeliveryStatus.SKIPPED,
        providerMessageId: null,
        errorCode: 'no_active_tokens',
        errorMessage:
          'El usuario no tiene dispositivos activos para notificaciones push.',
      });

      this.logger.warn(
        `[FCM] delivery skipped notificationId=${notification.id} userId=${userId} reason=no_active_tokens`,
      );

      return summary;
    }

    for (const token of activeTokens) {
      const result = await this.fcmService.sendToToken(token.token, payload);

      if (result.status === NotificationDeliveryStatus.SENT) {
        summary.sent += 1;
      } else if (result.status === NotificationDeliveryStatus.INVALID_TOKEN) {
        summary.invalidTokens += 1;
        await this.disableInvalidToken(token);
      } else if (result.status === NotificationDeliveryStatus.SKIPPED) {
        summary.skipped += 1;
      } else {
        summary.failed += 1;
      }

      await this.createDeliveryAttempt({
        notificationId: notification.id,
        notificationTokenId: token.id,
        status: result.status,
        providerMessageId: result.providerMessageId,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      });

      this.logger.log(
        `[FCM] delivery attempt notificationId=${notification.id} userId=${userId} tokenId=${token.id} token=${this.maskToken(token.token)} status=${result.status} messageId=${result.providerMessageId ?? 'none'} errorCode=${result.errorCode ?? 'none'}`,
      );
    }

    return summary;
  }

  async notifyAttendanceEntryMarked(
    input: AttendanceMarkedInput,
    options: NotifyAttendanceEntryOptions = {},
  ): Promise<Notification[]> {
    const recipients = await this.resolveAttendanceNotificationRecipients(
      input.studentId,
    );
    const notifications: Notification[] = [];
    const sendFcm = options.sendFcm ?? true;

    for (const recipient of recipients) {
      const body = `${this.getStudentDisplayName(recipient.student)} registró entrada el ${this.formatDateInLima(input.markedAt)} a las ${this.formatTimeInLima(input.markedAt)}.`;
      this.logger.log(
        `[FCM][Attendance] attendanceRecordId=${input.attendanceRecordId} studentId=${input.studentId} resolvedUserId=${recipient.userId} resolvedUserRole=student`,
      );
      const notification = await this.createInternalNotification({
        userId: recipient.userId,
        studentId: input.studentId,
        type: NotificationType.ATTENDANCE_ENTRY_MARKED,
        title: 'Entrada registrada',
        body,
        data: {
          type: NotificationType.ATTENDANCE_ENTRY_MARKED,
          studentId: input.studentId,
          attendanceRecordId: input.attendanceRecordId,
          markedAt: input.markedAt.toISOString(),
          route: '/mi-asistencia',
          title: 'Entrada registrada',
          body,
        },
      });
      notifications.push(notification);

      if (sendFcm) {
        await this.sendPushToUser(
          recipient.userId,
          {
            title: notification.title,
            body: notification.body,
            data: {
              ...(notification.dataJson ?? {}),
              notificationId: notification.id,
            },
          },
          notification,
        );
      }
    }

    return notifications;
  }

  private async resolveAttendanceNotificationRecipients(
    studentId: string,
  ): Promise<AttendanceNotificationRecipient[]> {
    const student = await this.studentsRepository.findOne({
      where: { id: studentId },
      relations: ['user'],
    });

    if (!student?.user || student.user.role !== UserRole.STUDENT) {
      this.logger.warn(
        `[FCM][Attendance] studentId=${studentId} no_student_user`,
      );
      return [];
    }

    if (!student.user.isActive) {
      this.logger.warn(
        `[FCM][Attendance] studentId=${studentId} resolvedUserId=${student.user.id} user_inactive`,
      );
      return [];
    }

    return [{ userId: student.user.id, student }];
  }

  private maskToken(token: string): string {
    if (token.length <= 12) {
      return `${token.slice(0, 3)}...`;
    }

    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }

  async sendDebugNotificationToUser(
    authUser: AuthenticatedRequestUser,
  ): Promise<NotificationDebugSendResponseDto> {
    const testId = `debug-${Date.now()}`;
    const title = 'Prueba de notificación';
    const body = 'Esta es una notificación real del sistema.';
    const activeTokens = await this.findActiveTokensForUser(authUser.id);

    const notification = await this.createInternalNotification({
      userId: authUser.id,
      type: NotificationType.SYSTEM_TEST,
      title,
      body,
      data: {
        type: NotificationType.SYSTEM_TEST,
        route: '/mi-asistencia',
        title,
        body,
        testId,
      },
    });

    const delivery = await this.sendPushToUser(
      authUser.id,
      {
        title,
        body,
        data: {
          ...(notification.dataJson ?? {}),
          notificationId: notification.id,
        },
      },
      notification,
    );

    return {
      userId: authUser.id,
      role: authUser.role,
      activeTokensCount: activeTokens.length,
      tokens: activeTokens.map((token) => ({
        id: token.id,
        platform: token.platform,
        tokenPreview: this.maskToken(token.token),
        lastSeenAt: token.lastSeenAt?.toISOString() ?? null,
      })),
      message:
        activeTokens.length > 0
          ? 'Se envió una prueba FCM al usuario autenticado.'
          : 'No hay tokens FCM activos para este usuario.',
      notification: this.toNotificationResponse(notification),
      delivery,
    };
  }

  async sendTestNotification(
    userId: string,
  ): Promise<NotificationTestResponseDto> {
    const notification = await this.createInternalNotification({
      userId,
      type: NotificationType.SYSTEM_TEST,
      title: 'Notificacion de prueba',
      body: 'Firebase Cloud Messaging esta funcionando correctamente.',
      data: {
        type: NotificationType.SYSTEM_TEST,
        route: '/',
        title: 'Notificacion de prueba',
        body: 'Firebase Cloud Messaging esta funcionando correctamente.',
      },
    });

    const delivery = await this.sendPushToUser(
      userId,
      {
        title: notification.title,
        body: notification.body,
        data: {
          ...(notification.dataJson ?? {}),
          notificationId: notification.id,
        },
      },
      notification,
    );

    return {
      notification: this.toNotificationResponse(notification),
      delivery,
    };
  }

  private findActiveTokensForUser(
    userId: string,
  ): Promise<NotificationToken[]> {
    return this.notificationTokensRepository.find({
      where: {
        userId,
        enabled: true,
      },
      order: { lastSeenAt: 'DESC' },
    });
  }

  private getStudentDisplayName(student: Student): string {
    return `${student.lastName} ${student.firstName}`.trim();
  }

  private formatDateInLima(value: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Lima',
    }).format(value);
  }

  private formatTimeInLima(value: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Lima',
    }).format(value);
  }

  private async createDeliveryAttempt(input: {
    notificationId: string;
    notificationTokenId: string | null;
    status: NotificationDeliveryStatus;
    providerMessageId: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  }): Promise<void> {
    const deliveryAttempt = this.deliveryAttemptsRepository.create({
      notificationId: input.notificationId,
      notificationTokenId: input.notificationTokenId,
      provider: NotificationDeliveryProvider.FCM,
      status: input.status,
      providerMessageId: input.providerMessageId,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage?.slice(0, 512) ?? null,
    });

    await this.deliveryAttemptsRepository.save(deliveryAttempt);
  }

  private async disableInvalidToken(
    notificationToken: NotificationToken,
  ): Promise<void> {
    notificationToken.enabled = false;
    notificationToken.revokedAt = new Date();
    await this.notificationTokensRepository.save(notificationToken);
  }

  private normalizeData(
    data: Record<string, string | number | boolean | null | undefined>,
  ): Record<string, string> {
    return Object.entries(data).reduce<Record<string, string>>(
      (accumulator, [key, value]) => {
        if (typeof value === 'undefined' || value === null) {
          return accumulator;
        }

        accumulator[key] = String(value);
        return accumulator;
      },
      {},
    );
  }

  private toNotificationTokenResponse(
    notificationToken: NotificationToken,
  ): NotificationTokenResponseDto {
    return {
      id: notificationToken.id,
      platform: notificationToken.platform,
      enabled: notificationToken.enabled,
      lastSeenAt: notificationToken.lastSeenAt?.toISOString() ?? null,
      createdAt: notificationToken.createdAt.toISOString(),
      updatedAt: notificationToken.updatedAt.toISOString(),
    };
  }

  private toNotificationResponse(
    notification: Notification,
  ): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      studentId: notification.studentId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.dataJson,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
