import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import {
  getMessaging,
  type Message,
  type Messaging,
} from 'firebase-admin/messaging';
import { existsSync, readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';
import { NotificationDeliveryStatus } from './enums/notification-delivery-status.enum';

export type FcmPushPayload = {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
};

export type FcmSendResult = {
  status:
    | NotificationDeliveryStatus.SENT
    | NotificationDeliveryStatus.FAILED
    | NotificationDeliveryStatus.INVALID_TOKEN
    | NotificationDeliveryStatus.SKIPPED;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private app: App | null = null;
  private messaging: Messaging | null = null;
  private initializationAttempted = false;

  constructor(private readonly configService: ConfigService) {}

  async sendToToken(
    token: string,
    payload: FcmPushPayload,
  ): Promise<FcmSendResult> {
    const messaging = this.getMessagingClient();

    if (!messaging) {
      return {
        status: NotificationDeliveryStatus.SKIPPED,
        providerMessageId: null,
        errorCode: 'firebase_not_configured',
        errorMessage:
          'Firebase Admin no esta configurado para enviar notificaciones.',
      };
    }

    if (!token.trim()) {
      return {
        status: NotificationDeliveryStatus.INVALID_TOKEN,
        providerMessageId: null,
        errorCode: 'empty_token',
        errorMessage: 'El token FCM esta vacio.',
      };
    }

    try {
      const providerMessageId = await messaging.send(
        this.buildMessage(token, payload),
      );

      return {
        status: NotificationDeliveryStatus.SENT,
        providerMessageId,
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      const errorCode = this.extractErrorCode(error);
      const errorMessage = this.sanitizeErrorMessage(error);

      return {
        status: this.isInvalidTokenError(errorCode)
          ? NotificationDeliveryStatus.INVALID_TOKEN
          : NotificationDeliveryStatus.FAILED,
        providerMessageId: null,
        errorCode,
        errorMessage,
      };
    }
  }

  private getMessagingClient(): Messaging | null {
    if (this.messaging) {
      return this.messaging;
    }

    if (this.initializationAttempted) {
      return null;
    }

    this.initializationAttempted = true;

    const serviceAccountPath = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_PATH',
    );

    if (!serviceAccountPath) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_PATH no esta definido. Se omitira el envio FCM.',
      );
      return null;
    }

    const resolvedPath = this.resolveServiceAccountPath(serviceAccountPath);

    if (!resolvedPath) {
      this.logger.warn(
        'No se encontro el service account de Firebase en la ruta configurada.',
      );
      return null;
    }

    try {
      const serviceAccount = JSON.parse(
        readFileSync(resolvedPath, 'utf8'),
      ) as ServiceAccount;
      const projectId =
        this.configService.get<string>('FIREBASE_PROJECT_ID') ??
        serviceAccount.projectId;

      this.app =
        getApps()[0] ??
        initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
      this.messaging = getMessaging(this.app);

      this.logger.log('Firebase Admin SDK inicializado para FCM.');
      return this.messaging;
    } catch (error) {
      this.logger.warn(
        `No se pudo inicializar Firebase Admin SDK: ${this.sanitizeErrorMessage(error)}`,
      );
      return null;
    }
  }

  private resolveServiceAccountPath(value: string): string | null {
    const candidates = isAbsolute(value)
      ? [value]
      : [
          resolve(process.cwd(), value),
          resolve(process.cwd(), '..', value),
          resolve(process.cwd(), '..', '..', value),
        ];

    return candidates.find((candidate) => existsSync(candidate)) ?? null;
  }

  private buildMessage(token: string, payload: FcmPushPayload): Message {
    const data = this.normalizeData({
      ...(payload.data ?? {}),
      title: payload.title,
      body: payload.body,
    });

    return {
      token,
      data,
      webpush: {
        headers: {
          Urgency: 'normal',
        },
      },
    };
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

  private extractErrorCode(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;

      if (typeof code === 'string' && code.trim()) {
        return code;
      }
    }

    return 'firebase_unknown_error';
  }

  private sanitizeErrorMessage(error: unknown): string {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Error desconocido de Firebase.';

    return message.replace(/\s+/g, ' ').slice(0, 512);
  }

  private isInvalidTokenError(errorCode: string): boolean {
    return [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
    ].includes(errorCode);
  }
}
