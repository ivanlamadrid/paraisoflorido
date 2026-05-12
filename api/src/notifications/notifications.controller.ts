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
  NotificationResponseDto,
  NotificationTestResponseDto,
  NotificationTokenResponseDto,
} from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
}
