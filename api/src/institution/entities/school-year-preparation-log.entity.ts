import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'school_year_preparation_logs' })
@Index('IDX_school_year_preparation_logs_prepared_to_school_year_created_at', [
  'preparedToSchoolYear',
  'createdAt',
])
@Index('IDX_school_year_preparation_logs_performed_by_user_id_created_at', [
  'performedByUserId',
  'createdAt',
])
export class SchoolYearPreparationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'prepared_from_school_year', type: 'smallint' })
  preparedFromSchoolYear: number;

  @Column({ name: 'prepared_to_school_year', type: 'smallint' })
  preparedToSchoolYear: number;

  @Column({ name: 'performed_by_user_id', type: 'uuid' })
  performedByUserId: string;

  @Column({ name: 'reset_student_passwords', type: 'boolean', default: false })
  resetStudentPasswords: boolean;

  @Column({ name: 'continued_students_count', type: 'integer', default: 0 })
  continuedStudentsCount: number;

  @Column({ name: 'graduated_students_count', type: 'integer', default: 0 })
  graduatedStudentsCount: number;

  @Column({ name: 'skipped_students_count', type: 'integer', default: 0 })
  skippedStudentsCount: number;

  @Column({ name: 'passwords_reset_count', type: 'integer', default: 0 })
  passwordsResetCount: number;

  @Column({ name: 'section_adjustments_count', type: 'integer', default: 0 })
  sectionAdjustmentsCount: number;

  @Column({ name: 'shift_adjustments_count', type: 'integer', default: 0 })
  shiftAdjustmentsCount: number;

  @Column({ name: 'summary', type: 'jsonb' })
  summary: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'performed_by_user_id' })
  performedByUser: User;
}
