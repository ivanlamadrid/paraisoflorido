import { DataSourceOptions } from 'typeorm';
import { AttendanceDayStatus } from '../attendance/entities/attendance-day-status.entity';
import { AttendanceCorrectionLog } from '../attendance/entities/attendance-correction-log.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { AnnouncementAudience } from '../announcements/entities/announcement-audience.entity';
import { AnnouncementLink } from '../announcements/entities/announcement-link.entity';
import { AnnouncementRead } from '../announcements/entities/announcement-read.entity';
import { Announcement } from '../announcements/entities/announcement.entity';
import { CreateUsersAndPasswordResetLogs1743520000000 } from './migrations/1743520000000-create-users-and-password-reset-logs';
import { CreateStudents1743600000000 } from './migrations/1743600000000-create-students';
import { CreateAttendanceRecords1743700000000 } from './migrations/1743700000000-create-attendance-records';
import { AddInstitutionSettingsAndAnnualStudents1743800000000 } from './migrations/1743800000000-add-institution-settings-and-annual-students';
import { AddAttendanceCorrectionLogs1743900000000 } from './migrations/1743900000000-add-attendance-correction-logs';
import { AddAttendanceStatuses1744000000000 } from './migrations/1744000000000-add-attendance-statuses';
import { FixStudentChangeLogConstraint1744100000000 } from './migrations/1744100000000-fix-student-change-log-constraint';
import { CreateAnnouncements1744200000000 } from './migrations/1744200000000-create-announcements';
import { AddStudentContacts1744300000000 } from './migrations/1744300000000-add-student-contacts';
import { AddPasswordChangeLogs1744400000000 } from './migrations/1744400000000-add-password-change-logs';
import { AddUserNameParts1744500000000 } from './migrations/1744500000000-add-user-name-parts';
import { AddTutorAssignments1744600000000 } from './migrations/1744600000000-add-tutor-assignments';
import { InstitutionSetting } from '../institution/entities/institution-setting.entity';
import { SchoolYearPreparationLog } from '../institution/entities/school-year-preparation-log.entity';
import { Student } from '../students/entities/student.entity';
import { StudentChangeLog } from '../students/entities/student-change-log.entity';
import { StudentContact } from '../students/entities/student-contact.entity';
import { StudentEnrollment } from '../students/entities/student-enrollment.entity';
import { StudentFollowUp } from '../students/entities/student-follow-up.entity';
import { PasswordChangeLog } from '../users/entities/password-change-log.entity';
import { PasswordResetLog } from '../users/entities/password-reset-log.entity';
import { TutorAssignment } from '../users/entities/tutor-assignment.entity';
import { User } from '../users/entities/user.entity';
import { AddStudentSituationFollowUpsAndConsents1744700000000 } from './migrations/1744700000000-add-student-situation-follow-ups-and-consents';
import { AddSchoolYearPreparationLogs1744800000000 } from './migrations/1744800000000-add-school-year-preparation-logs';

interface DatabaseConnectionConfig {
  nodeEnv: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export function buildTypeOrmOptions(
  config: DatabaseConnectionConfig,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    entities: [
      User,
      PasswordChangeLog,
      PasswordResetLog,
      TutorAssignment,
      InstitutionSetting,
      SchoolYearPreparationLog,
      Student,
      StudentEnrollment,
      StudentChangeLog,
      StudentContact,
      StudentFollowUp,
      AttendanceRecord,
      AttendanceCorrectionLog,
      AttendanceDayStatus,
      Announcement,
      AnnouncementLink,
      AnnouncementAudience,
      AnnouncementRead,
    ],
    migrations: [
      CreateUsersAndPasswordResetLogs1743520000000,
      CreateStudents1743600000000,
      CreateAttendanceRecords1743700000000,
      AddInstitutionSettingsAndAnnualStudents1743800000000,
      AddAttendanceCorrectionLogs1743900000000,
      AddAttendanceStatuses1744000000000,
      FixStudentChangeLogConstraint1744100000000,
      CreateAnnouncements1744200000000,
      AddStudentContacts1744300000000,
      AddPasswordChangeLogs1744400000000,
      AddUserNameParts1744500000000,
      AddTutorAssignments1744600000000,
      AddStudentSituationFollowUpsAndConsents1744700000000,
      AddSchoolYearPreparationLogs1744800000000,
    ],
    synchronize: false,
    logging: config.nodeEnv !== 'production',
    migrationsTableName: 'typeorm_migrations',
  };
}
