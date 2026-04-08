import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AttendanceDayStatusType } from '../../common/enums/attendance-day-status-type.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';

function normalizeSection(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

function normalizeObservation(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export class UpsertAttendanceDayStatusDto {
  @IsUUID()
  studentId: string;

  @IsDateString()
  attendanceDate: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  schoolYear: number;

  @IsInt()
  @Min(1)
  @Max(5)
  grade: number;

  @Transform(({ value }) => normalizeSection(value))
  @IsString()
  @MaxLength(10)
  section: string;

  @IsEnum(StudentShift)
  shift: StudentShift;

  @IsEnum(AttendanceDayStatusType)
  statusType: AttendanceDayStatusType;

  @IsOptional()
  @Transform(({ value }) => normalizeObservation(value))
  @IsString()
  @MaxLength(255)
  observation?: string | null;
}
