import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { InstitutionSettingsResponseDto } from './institution-settings-response.dto';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class SchoolYearPreparationPreviewDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  targetSchoolYear: number;

  @IsOptional()
  @IsBoolean()
  resetStudentPasswords?: boolean;
}

export class ExecuteSchoolYearPreparationDto extends SchoolYearPreparationPreviewDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  confirmationText: string;
}

export class SchoolYearPreparationPreviewResponseDto {
  currentSchoolYear: number;
  targetSchoolYear: number;
  canPrepare: boolean;
  resetStudentPasswords: boolean;
  totalCurrentEnrollments: number;
  continuedStudentsCount: number;
  graduatedStudentsCount: number;
  skippedStudentsCount: number;
  passwordsResetCount: number;
  sectionAdjustmentsCount: number;
  shiftAdjustmentsCount: number;
  blockers: string[];
  notes: string[];
}

export class ExecuteSchoolYearPreparationResponseDto {
  message: string;
  executedAt: string;
  logId: string;
  preview: SchoolYearPreparationPreviewResponseDto;
  settings: InstitutionSettingsResponseDto;
}
