import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { RegisterNotificationTokenDto } from './dto/register-notification-token.dto';
import { UnregisterNotificationTokenDto } from './dto/unregister-notification-token.dto';
import {
  MarkNotificationReadResponseDto,
  NotificationDebugSendResponseDto,
  NotificationResponseDto,
  NotificationTestResponseDto,
  NotificationTokenResponseDto,
  WebPushDebugResponseDto,
  WebPushDebugSendResponseDto,
  WebPushSubscriptionResponseDto,
} from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';
import {
  RegisterWebPushSubscriptionDto,
  UnregisterWebPushSubscriptionDto,
} from './dto/web-push-subscription.dto';
import { WebPushService } from './web-push.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly webPushService: WebPushService,
  ) {}

  @Post('tokens')
  registerToken(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Body() dto: RegisterNotificationTokenDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<NotificationTokenResponseDto> {
    return this.notificationsService.registerToken(authUser.id, dto, userAgent);
  }

  @Delete('tokens/current')
  unregisterCurrentToken(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Body() dto: UnregisterNotificationTokenDto,
  ): Promise<{ ok: true }> {
    return this.notificationsService.unregisterToken(authUser.id, dto.token);
  }

  @Post('web-push/subscriptions')
  registerWebPushSubscription(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Body() dto: RegisterWebPushSubscriptionDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<WebPushSubscriptionResponseDto> {
    return this.webPushService.registerSubscription(
      authUser.id,
      dto,
      userAgent,
    );
  }

  @Delete('web-push/subscriptions/current')
  unregisterCurrentWebPushSubscription(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Body() dto: UnregisterWebPushSubscriptionDto,
  ): Promise<{ ok: true }> {
    return this.webPushService.unregisterSubscription(authUser.id, dto);
  }

  @Get('web-push/debug/me')
  getWebPushDebugInfo(
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<WebPushDebugResponseDto> {
    return this.webPushService.getDebugInfo(authUser);
  }

  @Post('web-push/debug/send-to-me')
  sendWebPushDebugToMe(
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<WebPushDebugSendResponseDto> {
    return this.webPushService.sendDebugToUser(authUser);
  }

  @Get()
  listNotifications(
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationsService.listUserNotifications(authUser.id);
  }

  @Patch(':id/read')
  markAsRead(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MarkNotificationReadResponseDto> {
    return this.notificationsService.markAsRead(authUser.id, id);
  }

  @Post('test')
  sendTestNotification(
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<NotificationTestResponseDto> {
    return this.notificationsService.sendTestNotification(authUser.id);
  }

  @Post('debug/send-to-me')
  sendDebugNotificationToMe(
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<NotificationDebugSendResponseDto> {
    return this.notificationsService.sendDebugNotificationToUser(authUser);
  }
}
