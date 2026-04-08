import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceDayStatusType } from '../../common/enums/attendance-day-status-type.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'attendance_day_statuses' })
@Index('IDX_attendance_day_statuses_student_id_attendance_date', [
  'studentId',
  'attendanceDate',
])
@Index('IDX_attendance_day_statuses_attendance_date_grade_section_shift', [
  'attendanceDate',
  'grade',
  'section',
  'shift',
])
@Index('IDX_attendance_day_statuses_recorded_by_user_id_created_at', [
  'recordedByUserId',
  'createdAt',
])
export class AttendanceDayStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: string;

  @Column({ name: 'school_year', type: 'smallint' })
  schoolYear: number;

  @Column({ name: 'grade', type: 'smallint' })
  grade: number;

  @Column({ name: 'section', type: 'varchar', length: 10 })
  section: string;

  @Column({ name: 'shift', type: 'varchar', length: 20 })
  shift: StudentShift;

  @Column({ name: 'status_type', type: 'varchar', length: 32 })
  statusType: AttendanceDayStatusType;

  @Column({ name: 'observation', type: 'varchar', length: 255, nullable: true })
  observation: string | null;

  @Column({ name: 'recorded_by_user_id', type: 'uuid' })
  recordedByUserId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'resolved_by_user_id', type: 'uuid', nullable: true })
  resolvedByUserId: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Student, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recorded_by_user_id' })
  recordedByUser: User;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'resolved_by_user_id' })
  resolvedByUser: User | null;
}
