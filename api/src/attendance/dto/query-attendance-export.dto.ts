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
import { StudentShift } from '../../common/enums/student-shift.enum';

export enum AttendanceExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
}

function normalizeSection(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class QueryAttendanceExportDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  schoolYear: number;

  @IsOptional()
  @IsDateString()
  attendanceDate?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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

  @IsOptional()
  @IsEnum(AttendanceExportFormat)
  format: AttendanceExportFormat = AttendanceExportFormat.CSV;
}
