import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StudentShift } from '../../common/enums/student-shift.enum';

function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeSection(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class QueryMonthlyAttendanceReportDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  schoolYear: number;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month: string;

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
  @Transform(({ value }) => normalizeText(value))
  @IsString()
  @MaxLength(120)
  search?: string;
}
