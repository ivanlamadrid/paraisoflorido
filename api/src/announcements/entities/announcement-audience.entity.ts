import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';
import { Student } from '../../students/entities/student.entity';
import { AnnouncementAudienceType } from '../enums/announcement-audience-type.enum';
import { Announcement } from './announcement.entity';

@Entity({ name: 'announcement_audiences' })
@Index('IDX_announcement_audiences_announcement_id', ['announcementId'])
@Index('IDX_announcement_audiences_student_target', [
  'audienceType',
  'schoolYear',
  'grade',
  'section',
  'shift',
])
export class AnnouncementAudience {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'announcement_id', type: 'uuid' })
  announcementId: string;

  @Column({ name: 'audience_type', type: 'varchar', length: 32 })
  audienceType: AnnouncementAudienceType;

  @Column({ type: 'varchar', length: 32, nullable: true })
  role: UserRole | null;

  @Column({ name: 'school_year', type: 'smallint', nullable: true })
  schoolYear: number | null;

  @Column({ type: 'smallint', nullable: true })
  grade: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  section: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  shift: StudentShift | null;

  @Column({ name: 'student_id', type: 'uuid', nullable: true })
  studentId: string | null;

  @ManyToOne(() => Announcement, (announcement) => announcement.audiences, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @ManyToOne(() => Student, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'student_id' })
  student: Student | null;
}
