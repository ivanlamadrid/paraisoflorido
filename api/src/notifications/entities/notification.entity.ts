import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationDeliveryAttempt } from './notification-delivery-attempt.entity';

@Entity({ name: 'notifications' })
@Index('IDX_notifications_user_id_created_at', ['userId', 'createdAt'])
@Index('IDX_notifications_user_id_read_at', ['userId', 'readAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'student_id', type: 'uuid', nullable: true })
  studentId: string | null;

  @Column({ name: 'type', type: 'varchar', length: 40 })
  type: NotificationType;

  @Column({ name: 'title', type: 'varchar', length: 140 })
  title: string;

  @Column({ name: 'body', type: 'varchar', length: 280 })
  body: string;

  @Column({ name: 'data_json', type: 'jsonb', nullable: true })
  dataJson: Record<string, string> | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Student, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'student_id' })
  student: Student | null;

  @OneToMany(
    () => NotificationDeliveryAttempt,
    (deliveryAttempt) => deliveryAttempt.notification,
  )
  deliveryAttempts: NotificationDeliveryAttempt[];
}
