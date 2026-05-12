import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../students/entities/student.entity';
import { NotificationDeliveryAttempt } from './entities/notification-delivery-attempt.entity';
import { NotificationToken } from './entities/notification-token.entity';
import { Notification } from './entities/notification.entity';
import { WebPushSubscription } from './entities/web-push-subscription.entity';
import { FcmService } from './fcm.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WebPushService } from './web-push.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationToken,
      Notification,
      NotificationDeliveryAttempt,
      WebPushSubscription,
      Student,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, FcmService, WebPushService],
  exports: [NotificationsService, WebPushService],
})
export class NotificationsModule {}
