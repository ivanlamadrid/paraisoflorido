import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionModule } from '../institution/institution.module';
import { StudentEnrollment } from '../students/entities/student-enrollment.entity';
import { Student } from '../students/entities/student.entity';
import { TutorAssignment } from '../users/entities/tutor-assignment.entity';
import { User } from '../users/entities/user.entity';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementAudience } from './entities/announcement-audience.entity';
import { AnnouncementLink } from './entities/announcement-link.entity';
import { AnnouncementRead } from './entities/announcement-read.entity';
import { Announcement } from './entities/announcement.entity';

@Module({
  imports: [
    InstitutionModule,
    TypeOrmModule.forFeature([
      Announcement,
      AnnouncementAudience,
      AnnouncementLink,
      AnnouncementRead,
      User,
      TutorAssignment,
      Student,
      StudentEnrollment,
    ]),
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
