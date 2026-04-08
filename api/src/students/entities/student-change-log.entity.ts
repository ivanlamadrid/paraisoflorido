import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StudentChangeType } from '../../common/enums/student-change-type.enum';
import { Student } from './student.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'student_change_logs' })
@Index('IDX_student_change_logs_student_id_created_at', [
  'studentId',
  'createdAt',
])
@Index('IDX_student_change_logs_changed_by_user_id_created_at', [
  'changedByUserId',
  'createdAt',
])
export class StudentChangeLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'changed_by_user_id', type: 'uuid' })
  changedByUserId: string;

  @Column({ name: 'school_year', type: 'smallint', nullable: true })
  schoolYear: number | null;

  @Column({ name: 'change_type', type: 'varchar', length: 40 })
  changeType: StudentChangeType;

  @Column({ name: 'previous_data', type: 'jsonb', nullable: true })
  previousData: Record<string, unknown> | null;

  @Column({ name: 'next_data', type: 'jsonb', nullable: true })
  nextData: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Student, (student) => student.changeLogs, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser: User;
}
