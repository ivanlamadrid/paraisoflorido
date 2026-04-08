import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceRecord } from '../../attendance/entities/attendance-record.entity';
import { User } from '../../users/entities/user.entity';
import { StudentChangeLog } from './student-change-log.entity';
import { StudentContact } from './student-contact.entity';
import { StudentEnrollment } from './student-enrollment.entity';
import { StudentFollowUp } from './student-follow-up.entity';

@Entity({ name: 'students' })
@Index('IDX_students_user_id', ['userId'], { unique: true })
@Index('IDX_students_code', ['code'], { unique: true })
@Index('IDX_students_last_name_first_name', ['lastName', 'firstName'])
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'code', type: 'varchar', length: 32 })
  code: string;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 120 })
  lastName: string;

  @Column({ name: 'document', type: 'varchar', length: 20, nullable: true })
  document: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'image_consent_granted',
    type: 'boolean',
    nullable: true,
  })
  imageConsentGranted: boolean | null;

  @Column({
    name: 'image_consent_recorded_at',
    type: 'timestamptz',
    nullable: true,
  })
  imageConsentRecordedAt: Date | null;

  @Column({
    name: 'image_consent_recorded_by_user_id',
    type: 'uuid',
    nullable: true,
  })
  imageConsentRecordedByUserId: string | null;

  @Column({
    name: 'image_consent_observation',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  imageConsentObservation: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(
    () => AttendanceRecord,
    (attendanceRecord) => attendanceRecord.student,
  )
  attendanceRecords: AttendanceRecord[];

  @OneToOne(() => User, (user) => user.student, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => StudentEnrollment, (enrollment) => enrollment.student)
  enrollments: StudentEnrollment[];

  @OneToMany(() => StudentChangeLog, (changeLog) => changeLog.student)
  changeLogs: StudentChangeLog[];

  @OneToMany(() => StudentContact, (contact) => contact.student)
  contacts: StudentContact[];

  @OneToMany(() => StudentFollowUp, (followUp) => followUp.student)
  followUps: StudentFollowUp[];

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'image_consent_recorded_by_user_id' })
  imageConsentRecordedByUser: User | null;
}
