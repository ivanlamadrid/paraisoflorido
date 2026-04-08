import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { StudentShift } from '../../common/enums/student-shift.enum';

function normalizeSchoolName(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateInstitutionSettingsDto {
  @Transform(({ value }) => normalizeSchoolName(value))
  @IsString()
  @MaxLength(160)
  schoolName: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  activeSchoolYear: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(StudentShift, { each: true })
  enabledTurns: StudentShift[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(5, { each: true })
  enabledGrades: number[];

  @IsObject()
  sectionsByGrade: Record<string, string[]>;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newInitialStudentPassword?: string;
}
