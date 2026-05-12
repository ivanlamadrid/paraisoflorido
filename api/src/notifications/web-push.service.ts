import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as webPush from 'web-push';
import { Repository } from 'typeorm';
import type { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { Student } from '../students/entities/student.entity';
import {
  RegisterWebPushSubscriptionDto,
  UnregisterWebPushSubscriptionDto,
} from './dto/web-push-subscription.dto';
import {
  WebPushDebugResponseDto,
  WebPushDebugSendResponseDto,
  WebPushDeliveryResultDto,
  WebPushDeliverySummaryDto,
  WebPushSubscriptionResponseDto,
} from './dto/notification-response.dto';
import { NotificationDeliveryAttempt } from './entities/notification-delivery-attempt.entity';
import { Notification } from './entities/notification.entity';
import { WebPushSubscription } from './entities/web-push-subscription.entity';
import { NotificationDeliveryProvider } from './enums/notification-delivery-provider.enum';
import { NotificationDeliveryStatus } from './enums/notification-delivery-status.enum';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationsService } from './notifications.service';

type WebPushPayload = {
  title: string;
  body: string;
  route?: string;
  type?: string;
  [key: string]: string | number | boolean | null | undefined;
};

type WebPushConfigState = {
  enabled: boolean;
  subject: string;
  publicKey: string;
  privateKey: string;
  configured: boolean;
};

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private vapidConfigured = false;
  private missingConfigLogged = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(WebPushSubscription)
    private readonly webPushSubscriptionsRepository: Repository<WebPushSubscription>,
    @InjectRepository(NotificationDeliveryAttempt)
    private readonly deliveryAttemptsRepository: Repository<NotificationDeliveryAttempt>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly notificationsService: NotificationsService,
  ) {}

  isEnabled(): boolean {
    return this.readBoolean(this.configService.get('WEB_PUSH_ENABLED'), true);
  }

  async registerSubscription(
    userId: string,
    dto: RegisterWebPushSubscriptionDto,
    userAgent: string | undefined,
  ): Promise<WebPushSubscriptionResponseDto> {
    const endpoint = dto.endpoint.trim();
    const p256dh = dto.keys.p256dh.trim();
    const auth = dto.keys.auth.trim();
    const resolvedUserAgent = (dto.userAgent ?? userAgent ?? '').trim() || null;

    if (!endpoint || !p256dh || !auth) {
      throw new BadRequestException('La suscripcion Web Push esta incompleta.');
    }

    const now = new Date();
    let subscription = await this.webPushSubscriptionsRepository.findOneBy({
      endpoint,
    });

    if (!subscription) {
      subscription = this.webPushSubscriptionsRepository.create({
        userId,
        endpoint,
        p256dh,
        auth,
        userAgent: resolvedUserAgent,
        enabled: true,
        lastSeenAt: now,
        revokedAt: null,
      });
    } else {
      subscription.userId = userId;
      subscription.p256dh = p256dh;
      subscription.auth = auth;
      subscription.userAgent = resolvedUserAgent;
      subscription.enabled = true;
      subscription.lastSeenAt = now;
      subscription.revokedAt = null;
    }

    const savedSubscription =
      await this.webPushSubscriptionsRepository.save(subscription);

    this.logger.log(
      `[WEB-PUSH] subscription registered userId=${userId} subscriptionId=${savedSubscription.id} endpoint=${this.maskEndpoint(savedSubscription.endpoint)}`,
    );

    return this.toSubscriptionResponse(savedSubscription);
  }

  async unregisterSubscription(
    userId: string,
    dto: UnregisterWebPushSubscriptionDto,
  ): Promise<{ ok: true }> {
    const subscription = await this.webPushSubscriptionsRepository.findOneBy({
      userId,
      endpoint: dto.endpoint.trim(),
    });

    if (!subscription) {
      return { ok: true };
    }

    subscription.enabled = false;
    subscription.revokedAt = new Date();
    await this.webPushSubscriptionsRepository.save(subscription);

    this.logger.log(
      `[WEB-PUSH] subscription disabled userId=${userId} subscriptionId=${subscription.id} endpoint=${this.maskEndpoint(subscription.endpoint)}`,
    );

    return { ok: true };
  }

  async getDebugInfo(
    authUser: AuthenticatedRequestUser,
  ): Promise<WebPushDebugResponseDto> {
    const subscriptions = await this.findActiveSubscriptionsForUser(authUser.id);
    const config = this.getConfigState();

    return {
      userId: authUser.id,
      role: authUser.role,
      webPushEnabled: config.enabled,
      webPushConfigured: config.configured,
      vapidSubjectConfigured: Boolean(config.subject),
      vapidPublicKeyConfigured: Boolean(config.publicKey),
      vapidPrivateKeyConfigured: Boolean(config.privateKey),
      activeSubscriptionsCount: subscriptions.length,
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        endpointPreview: this.maskEndpoint(subscription.endpoint),
        lastSeenAt: subscription.lastSeenAt?.toISOString() ?? null,
      })),
    };
  }

  async sendDebugToUser(
    authUser: AuthenticatedRequestUser,
  ): Promise<WebPushDebugSendResponseDto> {
    const testId = `web-push-debug-${Date.now()}`;
    const payload: WebPushPayload = {
      title: 'Prueba Web Push',
      body: 'Esta es una notificacion real enviada con Web Push directo.',
      route: '/mi-asistencia',
      type: 'web_push_test',
      testId,
    };
    const subscriptions = await this.findActiveSubscriptionsForUser(authUser.id);
    const notification = await this.notificationsService.createInternalNotification({
      userId: authUser.id,
      type: NotificationType.SYSTEM_TEST,
      title: payload.title,
      body: payload.body,
      data: payload,
    });
    const delivery = await this.sendToUser(authUser.id, payload, notification);

    return {
      userId: authUser.id,
      role: authUser.role,
      activeSubscriptionsCount: subscriptions.length,
      message:
        subscriptions.length > 0
          ? 'Se envio una prueba Web Push al usuario autenticado.'
          : 'No hay suscripciones Web Push activas para este usuario.',
      delivery,
    };
  }

  async sendAttendanceEntryToStudent(input: {
    attendanceRecordId: string;
    studentId: string;
    markedAt: Date;
    notification?: Notification | null;
  }): Promise<WebPushDeliverySummaryDto> {
    const student = await this.studentsRepository.findOne({
      where: { id: input.studentId },
      relations: ['user'],
    });

    if (!student?.user || student.user.role !== UserRole.STUDENT) {
      this.logger.warn(
        `[WEB-PUSH][Attendance] attendanceRecordId=${input.attendanceRecordId} studentId=${input.studentId} no_student_user`,
      );
      return this.buildSkippedSummary('no_student_user');
    }

    if (!student.user.isActive) {
      this.logger.warn(
        `[WEB-PUSH][Attendance] attendanceRecordId=${input.attendanceRecordId} studentId=${input.studentId} resolvedUserId=${student.user.id} user_inactive`,
      );
      return this.buildSkippedSummary('student_user_inactive');
    }

    const title = 'Entrada registrada';
    const body = `${this.getStudentDisplayName(student)} registró entrada el ${this.formatDateInLima(input.markedAt)} a las ${this.formatTimeInLima(input.markedAt)}.`;
    const payload: WebPushPayload = {
      title,
      body,
      route: '/mi-asistencia',
      type: NotificationType.ATTENDANCE_ENTRY_MARKED,
      studentId: input.studentId,
      attendanceRecordId: input.attendanceRecordId,
      markedAt: input.markedAt.toISOString(),
    };

    this.logger.log(
      `[WEB-PUSH][Attendance] attendanceRecordId=${input.attendanceRecordId} studentId=${input.studentId} resolvedUserId=${student.user.id} resolvedUserRole=student`,
    );

    const delivery = await this.sendToUser(
      student.user.id,
      payload,
      input.notification ?? null,
    );

    this.logger.log(
      `[WEB-PUSH][Attendance] attendanceRecordId=${input.attendanceRecordId} studentId=${input.studentId} resolvedUserId=${student.user.id} activeSubscriptionsCount=${delivery.totalSubscriptions} sent=${delivery.sent} failed=${delivery.failed} skipped=${delivery.skipped}`,
    );

    return delivery;
  }

  async sendToUser(
    userId: string,
    payload: WebPushPayload,
    notification?: Notification | null,
  ): Promise<WebPushDeliverySummaryDto> {
    const subscriptions = await this.findActiveSubscriptionsForUser(userId);
    const config = this.getConfigState();
    const summary = this.buildEmptySummary(config, subscriptions.length);

    this.logger.log(
      `[WEB-PUSH] delivery userId=${userId} notificationId=${notification?.id ?? 'none'} activeSubscriptionsCount=${subscriptions.length}`,
    );

    if (!config.enabled) {
      summary.skipped = 1;
      summary.results.push(this.buildSkippedResult('web_push_disabled'));
      await this.createDeliveryAttempt(notification, {
        status: NotificationDeliveryStatus.SKIPPED,
        errorCode: 'web_push_disabled',
        errorMessage: 'Web Push directo esta deshabilitado.',
      });
      return summary;
    }

    if (!this.configureVapid(config)) {
      summary.skipped = 1;
      summary.results.push(this.buildSkippedResult('web_push_not_configured'));
      await this.createDeliveryAttempt(notification, {
        status: NotificationDeliveryStatus.SKIPPED,
        errorCode: 'web_push_not_configured',
        errorMessage: 'Faltan las claves VAPID para Web Push directo.',
      });
      return summary;
    }

    if (subscriptions.length === 0) {
      summary.skipped = 1;
      summary.results.push(this.buildSkippedResult('no_active_web_push_subscriptions'));
      await this.createDeliveryAttempt(notification, {
        status: NotificationDeliveryStatus.SKIPPED,
        errorCode: 'no_active_web_push_subscriptions',
        errorMessage:
          'El usuario no tiene suscripciones Web Push activas para este navegador.',
      });
      this.logger.warn(
        `[WEB-PUSH] delivery skipped userId=${userId} reason=no_active_web_push_subscriptions`,
      );
      return summary;
    }

    const normalizedPayload = this.normalizePayload(payload);

    for (const subscription of subscriptions) {
      const endpointPreview = this.maskEndpoint(subscription.endpoint);

      try {
        const result = await webPush.sendNotification(
          this.toPushSubscription(subscription),
          JSON.stringify(normalizedPayload),
          {
            TTL: 3600,
            urgency: 'high',
          },
        );

        summary.sent += 1;
        summary.results.push({
          subscriptionId: subscription.id,
          endpointPreview,
          status: 'sent',
          statusCode: result.statusCode,
          errorCode: null,
          errorMessage: null,
        });
        await this.createDeliveryAttempt(notification, {
          status: NotificationDeliveryStatus.SENT,
          providerMessageId: null,
          errorCode: null,
          errorMessage: null,
        });

        this.logger.log(
          `[WEB-PUSH] delivery sent userId=${userId} subscriptionId=${subscription.id} endpoint=${endpointPreview} statusCode=${result.statusCode}`,
        );
      } catch (error) {
        const statusCode = this.extractStatusCode(error);
        const isGone = statusCode === 404 || statusCode === 410;
        const errorMessage = this.sanitizeErrorMessage(error);
        const status = isGone
          ? NotificationDeliveryStatus.INVALID_TOKEN
          : NotificationDeliveryStatus.FAILED;

        if (isGone) {
          summary.disabledSubscriptions += 1;
          await this.disableSubscription(subscription);
          this.logger.warn(
            `[WEB-PUSH] endpoint_gone disabled subscriptionId=${subscription.id} endpoint=${endpointPreview} statusCode=${statusCode}`,
          );
        }

        if (isGone) {
          summary.failed += 1;
        } else {
          summary.failed += 1;
        }

        summary.results.push({
          subscriptionId: subscription.id,
          endpointPreview,
          status,
          statusCode,
          errorCode: this.extractErrorCode(error),
          errorMessage,
        });
        await this.createDeliveryAttempt(notification, {
          status,
          providerMessageId: null,
          errorCode: this.extractErrorCode(error),
          errorMessage,
        });

        this.logger.warn(
          `[WEB-PUSH] delivery failed userId=${userId} subscriptionId=${subscription.id} endpoint=${endpointPreview} statusCode=${statusCode ?? 'none'} error=${errorMessage}`,
        );
      }
    }

    return summary;
  }

  private configureVapid(config: WebPushConfigState): boolean {
    if (!config.enabled) {
      return false;
    }

    if (!config.configured) {
      if (!this.missingConfigLogged) {
        this.logger.warn(
          'WEB_PUSH_VAPID_PUBLIC_KEY o WEB_PUSH_VAPID_PRIVATE_KEY no estan configuradas. Se omitira Web Push directo.',
        );
        this.missingConfigLogged = true;
      }
      return false;
    }

    if (!this.vapidConfigured) {
      webPush.setVapidDetails(
        config.subject,
        config.publicKey,
        config.privateKey,
      );
      this.vapidConfigured = true;
      this.logger.log('Web Push VAPID configurado para envio directo.');
    }

    return true;
  }

  private getConfigState(): WebPushConfigState {
    const enabled = this.isEnabled();
    const subject =
      this.configService.get<string>('WEB_PUSH_VAPID_SUBJECT')?.trim() ||
      'mailto:admin@tudominio.com';
    const publicKey =
      this.configService.get<string>('WEB_PUSH_VAPID_PUBLIC_KEY')?.trim() ?? '';
    const privateKey =
      this.configService.get<string>('WEB_PUSH_VAPID_PRIVATE_KEY')?.trim() ?? '';

    return {
      enabled,
      subject,
      publicKey,
      privateKey,
      configured: enabled && Boolean(subject && publicKey && privateKey),
    };
  }

  private readBoolean(value: unknown, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.trim().toLowerCase() === 'true';
    }

    return defaultValue;
  }

  private findActiveSubscriptionsForUser(
    userId: string,
  ): Promise<WebPushSubscription[]> {
    return this.webPushSubscriptionsRepository.find({
      where: {
        userId,
        enabled: true,
      },
      order: { lastSeenAt: 'DESC' },
    });
  }

  private toPushSubscription(
    subscription: WebPushSubscription,
  ): webPush.PushSubscription {
    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };
  }

  private async disableSubscription(
    subscription: WebPushSubscription,
  ): Promise<void> {
    subscription.enabled = false;
    subscription.revokedAt = new Date();
    await this.webPushSubscriptionsRepository.save(subscription);
  }

  private async createDeliveryAttempt(
    notification: Notification | null | undefined,
    input: {
      status: NotificationDeliveryStatus;
      providerMessageId?: string | null;
      errorCode?: string | null;
      errorMessage?: string | null;
    },
  ): Promise<void> {
    if (!notification) {
      return;
    }

    const deliveryAttempt = this.deliveryAttemptsRepository.create({
      notificationId: notification.id,
      notificationTokenId: null,
      provider: NotificationDeliveryProvider.WEB_PUSH,
      status: input.status,
      providerMessageId: input.providerMessageId ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage?.slice(0, 512) ?? null,
    });

    await this.deliveryAttemptsRepository.save(deliveryAttempt);
  }

  private buildEmptySummary(
    config: WebPushConfigState,
    totalSubscriptions: number,
  ): WebPushDeliverySummaryDto {
    return {
      enabled: config.enabled,
      configured: config.configured,
      totalSubscriptions,
      sent: 0,
      failed: 0,
      skipped: 0,
      disabledSubscriptions: 0,
      results: [],
    };
  }

  private buildSkippedSummary(errorCode: string): WebPushDeliverySummaryDto {
    const config = this.getConfigState();

    return {
      ...this.buildEmptySummary(config, 0),
      skipped: 1,
      results: [this.buildSkippedResult(errorCode)],
    };
  }

  private buildSkippedResult(errorCode: string): WebPushDeliveryResultDto {
    return {
      subscriptionId: null,
      endpointPreview: null,
      status: 'skipped',
      statusCode: null,
      errorCode,
      errorMessage: null,
    };
  }

  private normalizePayload(payload: WebPushPayload): Record<string, string> {
    return Object.entries(payload).reduce<Record<string, string>>(
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

  private maskEndpoint(endpoint: string | null | undefined): string {
    if (!endpoint) {
      return 'none';
    }

    if (endpoint.length <= 18) {
      return `${endpoint.slice(0, 8)}...`;
    }

    return `${endpoint.slice(0, 12)}...${endpoint.slice(-8)}`;
  }

  private extractStatusCode(error: unknown): number | null {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      const statusCode = (error as { statusCode?: unknown }).statusCode;

      if (typeof statusCode === 'number') {
        return statusCode;
      }
    }

    return null;
  }

  private extractErrorCode(error: unknown): string {
    const statusCode = this.extractStatusCode(error);

    if (statusCode === 404 || statusCode === 410) {
      return 'endpoint_gone';
    }

    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;

      if (typeof code === 'string' && code.trim()) {
        return code;
      }
    }

    return 'web_push_send_failed';
  }

  private sanitizeErrorMessage(error: unknown): string {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Error desconocido de Web Push.';

    return message.replace(/\s+/g, ' ').slice(0, 512);
  }

  private toSubscriptionResponse(
    subscription: WebPushSubscription,
  ): WebPushSubscriptionResponseDto {
    return {
      id: subscription.id,
      enabled: subscription.enabled,
      lastSeenAt: subscription.lastSeenAt?.toISOString() ?? null,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }
}
