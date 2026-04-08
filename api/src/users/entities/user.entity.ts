import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceRecord } from '../../attendance/entities/attendance-record.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { Student } from '../../students/entities/student.entity';
import { PasswordChangeLog } from './password-change-log.entity';
import { PasswordResetLog } from './password-reset-log.entity';
import { TutorAssignment } from './tutor-assignment.entity';

@Entity({ name: 'users' })
@Index('IDX_users_username', ['username'], { unique: true })
@Index('IDX_users_role_is_active', ['role', 'isActive'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'username', type: 'varchar', length: 32 })
  username: string;

  @Column({ name: 'display_name', type: 'varchar', length: 120 })
  displayName: string;

  @Column({ name: 'first_name', type: 'varchar', length: 80, nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 120, nullable: true })
  lastName: string | null;

  @Column({ name: 'role', type: 'varchar', length: 20 })
  role: UserRole;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'must_change_password', type: 'boolean', default: false })
  mustChangePassword: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'auth_version', type: 'integer', default: 1 })
  authVersion: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Student, (student) => student.user)
  student: Student | null;

  @OneToMany(
    () => AttendanceRecord,
    (attendanceRecord) => attendanceRecord.recordedByUser,
  )
  recordedAttendanceRecords: AttendanceRecord[];

  @OneToMany(
    () => PasswordChangeLog,
    (passwordChangeLog) => passwordChangeLog.user,
  )
  passwordChangeLogs: PasswordChangeLog[];

  @OneToMany(
    () => PasswordResetLog,
    (passwordResetLog) => passwordResetLog.targetUser,
  )
  passwordResetLogsReceived: PasswordResetLog[];

  @OneToMany(
    () => PasswordResetLog,
    (passwordResetLog) => passwordResetLog.performedByUser,
  )
  passwordResetLogsPerformed: PasswordResetLog[];

  @OneToMany(
    () => TutorAssignment,
    (tutorAssignment) => tutorAssignment.tutorUser,
  )
  tutorAssignments: TutorAssignment[];
}
