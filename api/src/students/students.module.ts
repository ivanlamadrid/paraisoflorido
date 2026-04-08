import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceModule } from '../attendance/attendance.module';
import { AttendanceDayStatus } from '../attendance/entities/attendance-day-status.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { InstitutionModule } from '../institution/institution.module';
import { User } from '../users/entities/user.entity';
import { TutorAssignment } from '../users/entities/tutor-assignment.entity';
import { Student } from './entities/student.entity';
import { StudentChangeLog } from './entities/student-change-log.entity';
import { StudentContact } from './entities/student-contact.entity';
import { StudentEnrollment } from './entities/student-enrollment.entity';
import { StudentFollowUp } from './entities/student-follow-up.entity';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [
    AttendanceModule,
    InstitutionModule,
    TypeOrmModule.forFeature([
      AttendanceRecord,
      AttendanceDayStatus,
      Student,
      StudentEnrollment,
      StudentChangeLog,
      StudentContact,
      StudentFollowUp,
      User,
      TutorAssignment,
    ]),
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
