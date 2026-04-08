import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AttendanceMarkType } from '../../common/enums/attendance-mark-type.enum';
import { AttendanceRecordStatus } from '../../common/enums/attendance-record-status.enum';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../users/entities/user.entity';
import { AttendanceRecord } from './attendance-record.entity';

type AttendanceCorrectionSnapshot = {
  markedAt: string;
  markedTime: string;
  status: AttendanceRecordStatus;
  observation: string | null;
};

@Entity({ name: 'attendance_correction_logs' })
@Index('IDX_attendance_correction_logs_attendance_record_id_created_at', [
  'attendanceRecordId',
  'createdAt',
])
@Index('IDX_attendance_correction_logs_student_id_created_at', [
  'studentId',
  'createdAt',
])
@Index('IDX_attendance_correction_logs_corrected_by_user_id_created_at', [
  'correctedByUserId',
  'createdAt',
])
export class AttendanceCorrectionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attendance_record_id', type: 'uuid' })
  attendanceRecordId: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: string;

  @Column({ name: 'mark_type', type: 'varchar', length: 20 })
  markType: AttendanceMarkType;

  @Column({ name: 'reason', type: 'varchar', length: 255 })
  reason: string;

  @Column({ name: 'previous_data', type: 'jsonb' })
  previousData: AttendanceCorrectionSnapshot;

  @Column({ name: 'next_data', type: 'jsonb' })
  nextData: AttendanceCorrectionSnapshot;

  @Column({ name: 'corrected_by_user_id', type: 'uuid' })
  correctedByUserId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => AttendanceRecord, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'attendance_record_id' })
  attendanceRecord: AttendanceRecord;

  @ManyToOne(() => Student, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'corrected_by_user_id' })
  correctedByUser: User;
}
