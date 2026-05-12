import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationDeliveryProvider } from '../enums/notification-delivery-provider.enum';
import { NotificationDeliveryStatus } from '../enums/notification-delivery-status.enum';
import { NotificationToken } from './notification-token.entity';
import { Notification } from './notification.entity';

@Entity({ name: 'notification_delivery_attempts' })
@Index('IDX_notification_delivery_attempts_notification_id_created_at', [
  'notificationId',
  'createdAt',
])
@Index('IDX_notification_delivery_attempts_token_id_created_at', [
  'notificationTokenId',
  'createdAt',
])
export class NotificationDeliveryAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId: string;

  @Column({ name: 'notification_token_id', type: 'uuid', nullable: true })
  notificationTokenId: string | null;

  @Column({
    name: 'provider',
    type: 'varchar',
    length: 20,
    default: NotificationDeliveryProvider.FCM,
  })
  provider: NotificationDeliveryProvider;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    default: NotificationDeliveryStatus.PENDING,
  })
  status: NotificationDeliveryStatus;

  @Column({
    name: 'provider_message_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerMessageId: string | null;

  @Column({ name: 'error_code', type: 'varchar', length: 120, nullable: true })
  errorCode: string | null;

  @Column({
    name: 'error_message',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(
    () => Notification,
    (notification) => notification.deliveryAttempts,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @ManyToOne(
    () => NotificationToken,
    (notificationToken) => notificationToken.deliveryAttempts,
    {
      onDelete: 'SET NULL',
      nullable: true,
    },
  )
  @JoinColumn({ name: 'notification_token_id' })
  notificationToken: NotificationToken | null;
}
