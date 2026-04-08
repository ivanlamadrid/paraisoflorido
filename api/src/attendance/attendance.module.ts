import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionModule } from '../institution/institution.module';
import { StudentEnrollment } from '../students/entities/student-enrollment.entity';
import { Student } from '../students/entities/student.entity';
import { TutorAssignment } from '../users/entities/tutor-assignment.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceCorrectionLog } from './entities/attendance-correction-log.entity';
import { AttendanceDayStatus } from './entities/attendance-day-status.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';

@Module({
  imports: [
    InstitutionModule,
    TypeOrmModule.forFeature([
      AttendanceRecord,
      AttendanceCorrectionLog,
      AttendanceDayStatus,
      Student,
      StudentEnrollment,
      TutorAssignment,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
