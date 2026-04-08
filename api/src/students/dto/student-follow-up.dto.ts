import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StudentFollowUpCategory } from '../../common/enums/student-follow-up-category.enum';
import { StudentFollowUpRecordType } from '../../common/enums/student-follow-up-record-type.enum';
import { StudentFollowUpStatus } from '../../common/enums/student-follow-up-status.enum';

function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeNullableText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export class CreateStudentFollowUpDto {
  @IsEnum(StudentFollowUpRecordType)
  recordType: StudentFollowUpRecordType;

  @IsOptional()
  @IsEnum(StudentFollowUpCategory)
  category?: StudentFollowUpCategory;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  incidentType?: string | null;

  @IsDateString()
  recordedAt: string;

  @Transform(({ value }) => normalizeText(value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note: string;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionsTaken?: string | null;

  @IsEnum(StudentFollowUpStatus)
  status: StudentFollowUpStatus;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  externalReference?: string | null;
}

export class UpdateStudentFollowUpDto {
  @IsOptional()
  @IsEnum(StudentFollowUpCategory)
  category?: StudentFollowUpCategory;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  incidentType?: string | null;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note?: string;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionsTaken?: string | null;

  @IsOptional()
  @IsEnum(StudentFollowUpStatus)
  status?: StudentFollowUpStatus;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  externalReference?: string | null;
}
