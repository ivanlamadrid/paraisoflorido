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
import { AttendanceSource } from '../../common/enums/attendance-source.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'attendance_records' })
@Index(
  'UQ_attendance_records_student_id_attendance_date_mark_type',
  ['studentId', 'attendanceDate', 'markType'],
  { unique: true },
)
@Index('IDX_attendance_records_student_id_attendance_date', [
  'studentId',
  'attendanceDate',
])
@Index('IDX_attendance_records_attendance_date_grade_section_shift', [
  'attendanceDate',
  'grade',
  'section',
  'shift',
])
@Index('IDX_attendance_records_recorded_by_user_id_created_at', [
  'recordedByUserId',
  'createdAt',
])
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: string;

  @Column({ name: 'mark_type', type: 'varchar', length: 20 })
  markType: AttendanceMarkType;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    default: AttendanceRecordStatus.REGULAR,
  })
  status: AttendanceRecordStatus;

  @Column({ name: 'source', type: 'varchar', length: 20 })
  source: AttendanceSource;

  @Column({ name: 'marked_at', type: 'timestamptz' })
  markedAt: Date;

  @Column({ name: 'recorded_by_user_id', type: 'uuid' })
  recordedByUserId: string;

  @Column({ name: 'school_year', type: 'smallint' })
  schoolYear: number;

  @Column({ name: 'grade', type: 'smallint' })
  grade: number;

  @Column({ name: 'section', type: 'varchar', length: 10 })
  section: string;

  @Column({ name: 'shift', type: 'varchar', length: 20 })
  shift: StudentShift;

  @Column({ name: 'observation', type: 'varchar', length: 255, nullable: true })
  observation: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Student, (student) => student.attendanceRecords, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => User, (user) => user.recordedAttendanceRecords, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'recorded_by_user_id' })
  recordedByUser: User;
}
