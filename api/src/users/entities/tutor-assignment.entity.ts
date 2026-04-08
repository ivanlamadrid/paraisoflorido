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
import { StudentShift } from '../../common/enums/student-shift.enum';
import { User } from './user.entity';

@Entity({ name: 'tutor_assignments' })
@Index(
  'UQ_tutor_assignments_user_classroom',
  ['tutorUserId', 'schoolYear', 'grade', 'section', 'shift'],
  { unique: true },
)
@Index('IDX_tutor_assignments_tutor_user_id', ['tutorUserId'])
@Index('IDX_tutor_assignments_classroom', [
  'schoolYear',
  'grade',
  'section',
  'shift',
])
export class TutorAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tutor_user_id', type: 'uuid' })
  tutorUserId: string;

  @Column({ name: 'school_year', type: 'smallint' })
  schoolYear: number;

  @Column({ type: 'smallint' })
  grade: number;

  @Column({ type: 'varchar', length: 10 })
  section: string;

  @Column({ type: 'varchar', length: 20 })
  shift: StudentShift;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.tutorAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorUser: User;
}
