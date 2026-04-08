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
import { StudentEnrollmentMovement } from '../../common/enums/student-enrollment-movement.enum';
import { StudentEnrollmentStatus } from '../../common/enums/student-enrollment-status.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';
import { User } from '../../users/entities/user.entity';
import { Student } from './student.entity';

@Entity({ name: 'student_enrollments' })
@Index(
  'UQ_student_enrollments_student_id_school_year',
  ['studentId', 'schoolYear'],
  {
    unique: true,
  },
)
@Index('IDX_student_enrollments_school_year_grade_section_shift', [
  'schoolYear',
  'grade',
  'section',
  'shift',
])
@Index('IDX_student_enrollments_school_year_status_is_active', [
  'schoolYear',
  'status',
  'isActive',
])
export class StudentEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'school_year', type: 'smallint' })
  schoolYear: number;

  @Column({ name: 'grade', type: 'smallint' })
  grade: number;

  @Column({ name: 'section', type: 'varchar', length: 10 })
  section: string;

  @Column({ name: 'shift', type: 'varchar', length: 20 })
  shift: StudentShift;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: StudentEnrollmentStatus;

  @Column({
    name: 'movement_type',
    type: 'varchar',
    length: 24,
    default: StudentEnrollmentMovement.CONTINUITY,
  })
  movementType: StudentEnrollmentMovement;

  @Column({
    name: 'administrative_detail',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  administrativeDetail: string | null;

  @Column({ name: 'status_changed_at', type: 'timestamptz', nullable: true })
  statusChangedAt: Date | null;

  @Column({ name: 'status_changed_by_user_id', type: 'uuid', nullable: true })
  statusChangedByUserId: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Student, (student) => student.enrollments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'status_changed_by_user_id' })
  statusChangedByUser: User | null;
}
