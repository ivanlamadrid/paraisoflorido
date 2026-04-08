import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { StudentShift } from '../../common/enums/student-shift.enum';

function normalizeCode(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function normalizeName(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeSection(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

function normalizeDocument(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export class CreateStudentDto {
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  code: string;

  @Transform(({ value }) => normalizeName(value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName: string;

  @Transform(({ value }) => normalizeName(value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName: string;

  @Transform(({ value }) => normalizeDocument(value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string | null;

  @IsInt()
  @Min(1)
  @Max(5)
  grade: number;

  @Transform(({ value }) => normalizeSection(value))
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  section: string;

  @IsEnum(StudentShift)
  shift: StudentShift;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  schoolYear?: number;
}
