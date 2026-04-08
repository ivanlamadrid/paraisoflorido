import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Announcement } from './announcement.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'announcement_reads' })
@Index(
  'UQ_announcement_reads_announcement_user',
  ['announcementId', 'userId'],
  {
    unique: true,
  },
)
@Index('IDX_announcement_reads_user_id_last_read_at', ['userId', 'lastReadAt'])
export class AnnouncementRead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'announcement_id', type: 'uuid' })
  announcementId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'first_read_at', type: 'timestamptz' })
  firstReadAt: Date;

  @Column({ name: 'last_read_at', type: 'timestamptz' })
  lastReadAt: Date;

  @ManyToOne(() => Announcement, (announcement) => announcement.reads, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
