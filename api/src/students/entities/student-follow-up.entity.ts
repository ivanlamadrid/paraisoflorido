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
import { StudentFollowUpCategory } from '../../common/enums/student-follow-up-category.enum';
import { StudentFollowUpRecordType } from '../../common/enums/student-follow-up-record-type.enum';
import { StudentFollowUpStatus } from '../../common/enums/student-follow-up-status.enum';
import { User } from '../../users/entities/user.entity';
import { Student } from './student.entity';

@Entity({ name: 'student_follow_ups' })
@Index('IDX_student_follow_ups_student_id_recorded_at', [
  'studentId',
  'recordedAt',
])
@Index('IDX_student_follow_ups_student_id_record_type_status', [
  'studentId',
  'recordType',
  'status',
])
@Index('IDX_student_follow_ups_author_user_id_recorded_at', [
  'authorUserId',
  'recordedAt',
])
export class StudentFollowUp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'author_user_id', type: 'uuid' })
  authorUserId: string;

  @Column({ name: 'record_type', type: 'varchar', length: 24 })
  recordType: StudentFollowUpRecordType;

  @Column({ name: 'category', type: 'varchar', length: 24, nullable: true })
  category: StudentFollowUpCategory | null;

  @Column({
    name: 'incident_type',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  incidentType: string | null;

  @Column({ name: 'recorded_at', type: 'date' })
  recordedAt: string;

  @Column({ name: 'note', type: 'varchar', length: 500 })
  note: string;

  @Column({
    name: 'actions_taken',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  actionsTaken: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: StudentFollowUpStatus;

  @Column({
    name: 'external_reference',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  externalReference: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Student, (student) => student.followUps, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_user_id' })
  authorUser: User;
}
