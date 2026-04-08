import { IsUUID } from 'class-validator';
import { AttendanceMarkBaseDto } from './attendance-mark-base.dto';

export class CreateAttendanceManualDto extends AttendanceMarkBaseDto {
  @IsUUID()
  studentId: string;
}
