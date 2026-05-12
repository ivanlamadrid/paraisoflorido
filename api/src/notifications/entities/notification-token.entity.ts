import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationPlatform } from '../enums/notification-platform.enum';
import { NotificationDeliveryAttempt } from './notification-delivery-attempt.entity';

@Entity({ name: 'notification_tokens' })
@Index('UQ_notification_tokens_token', ['token'], { unique: true })
@Index('IDX_notification_tokens_user_id_enabled', ['userId', 'enabled'])
export class NotificationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'token', type: 'text' })
  token: string;

  @Column({
    name: 'platform',
    type: 'varchar',
    length: 20,
    default: NotificationPlatform.UNKNOWN,
  })
  platform: NotificationPlatform;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(
    () => NotificationDeliveryAttempt,
    (deliveryAttempt) => deliveryAttempt.notificationToken,
  )
  deliveryAttempts: NotificationDeliveryAttempt[];
}
