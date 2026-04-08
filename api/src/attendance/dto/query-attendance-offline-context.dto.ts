import { IsDateString, IsOptional } from 'class-validator';

export class QueryAttendanceOfflineContextDto {
  @IsOptional()
  @IsDateString()
  attendanceDate?: string;
}
