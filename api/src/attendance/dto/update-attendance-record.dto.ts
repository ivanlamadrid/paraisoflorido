import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { AttendanceRecordStatus } from '../../common/enums/attendance-record-status.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';

function normalizeObservation(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeReason(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeSection(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class UpdateAttendanceRecordDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora corregida debe tener el formato HH:mm.',
  })
  markedTime: string;

  @IsOptional()
  @IsEnum(AttendanceRecordStatus)
  status?: AttendanceRecordStatus;

  @Transform(({ value }) => normalizeObservation(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observation?: string | null;

  @Transform(({ value }) => normalizeReason(value))
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  reason: string;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  schoolYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  grade?: number;

  @IsOptional()
  @Transform(({ value }) => normalizeSection(value))
  @IsString()
  @MaxLength(10)
  section?: string;

  @IsOptional()
  @IsEnum(StudentShift)
  shift?: StudentShift;
}
