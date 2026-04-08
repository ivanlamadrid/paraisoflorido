import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StudentFollowUpRecordType } from '../../common/enums/student-follow-up-record-type.enum';
import { StudentFollowUpStatus } from '../../common/enums/student-follow-up-status.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';

function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeSection(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class QueryStudentFollowUpsOverviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  schoolYear?: number;

  @IsOptional()
  @IsEnum(StudentFollowUpRecordType)
  recordType?: StudentFollowUpRecordType;

  @IsOptional()
  @IsEnum(StudentFollowUpStatus)
  status?: StudentFollowUpStatus;

  @IsOptional()
  @Type(() => Number)
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
