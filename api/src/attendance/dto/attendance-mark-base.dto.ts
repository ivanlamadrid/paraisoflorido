import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AttendanceMarkType } from '../../common/enums/attendance-mark-type.enum';
import { AttendanceRecordStatus } from '../../common/enums/attendance-record-status.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';

function normalizeSection(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

function normalizeObservation(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AttendanceMarkBaseDto {
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

  @IsEnum(AttendanceMarkType)
  markType: AttendanceMarkType;

  @IsOptional()
  @IsEnum(AttendanceRecordStatus)
  status?: AttendanceRecordStatus;

  @IsOptional()
  @Transform(({ value }) => normalizeObservation(value))
  @IsString()
  @MaxLength(255)
  observation?: string;
}
