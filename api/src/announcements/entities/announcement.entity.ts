import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AnnouncementStatus } from '../enums/announcement-status.enum';
import { AnnouncementPriority } from '../enums/announcement-priority.enum';
import { AnnouncementType } from '../enums/announcement-type.enum';
import { AnnouncementAudience } from './announcement-audience.entity';
import { AnnouncementLink } from './announcement-link.entity';
import { AnnouncementRead } from './announcement-read.entity';

@Entity({ name: 'announcements' })
@Index('IDX_announcements_status_created_at', ['status', 'createdAt'])
@Index('IDX_announcements_published_at', ['publishedAt'])
@Index('IDX_announcements_scheduled_at', ['scheduledAt'])
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'varchar', length: 280 })
  summary: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 32 })
  type: AnnouncementType;

  @Column({ type: 'varchar', length: 16, default: AnnouncementPriority.NORMAL })
  priority: AnnouncementPriority;

  @Column({ type: 'varchar', length: 16, default: AnnouncementStatus.DRAFT })
  status: AnnouncementStatus;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'visible_from', type: 'timestamptz', nullable: true })
  visibleFrom: Date | null;

  @Column({ name: 'visible_until', type: 'timestamptz', nullable: true })
  visibleUntil: Date | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string;

  @Column({ name: 'published_by_user_id', type: 'uuid', nullable: true })
  publishedByUserId: string | null;

  @Column({ name: 'archived_by_user_id', type: 'uuid', nullable: true })
  archivedByUserId: string | null;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'published_by_user_id' })
  publishedByUser: User | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'archived_by_user_id' })
  archivedByUser: User | null;

  @OneToMany(
    () => AnnouncementLink,
    (announcementLink) => announcementLink.announcement,
  )
  links: AnnouncementLink[];

  @OneToMany(
    () => AnnouncementAudience,
    (announcementAudience) => announcementAudience.announcement,
  )
  audiences: AnnouncementAudience[];

  @OneToMany(
    () => AnnouncementRead,
    (announcementRead) => announcementRead.announcement,
  )
  reads: AnnouncementRead[];
}
