import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'password_reset_logs' })
@Index('IDX_password_reset_logs_target_user_id_created_at', [
  'targetUserId',
  'createdAt',
])
@Index('IDX_password_reset_logs_performed_by_user_id_created_at', [
  'performedByUserId',
  'createdAt',
])
export class PasswordResetLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'target_user_id', type: 'uuid' })
  targetUserId: string;

  @Column({ name: 'performed_by_user_id', type: 'uuid' })
  performedByUserId: string;

  @Column({ name: 'reason', type: 'varchar', length: 255 })
  reason: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.passwordResetLogsReceived, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'target_user_id' })
  targetUser: User;

  @ManyToOne(() => User, (user) => user.passwordResetLogsPerformed, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'performed_by_user_id' })
  performedByUser: User;
}
