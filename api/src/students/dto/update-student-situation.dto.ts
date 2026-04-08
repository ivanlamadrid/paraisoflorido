import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StudentEnrollmentMovement } from '../../common/enums/student-enrollment-movement.enum';
import { StudentEnrollmentStatus } from '../../common/enums/student-enrollment-status.enum';

function normalizeNullableText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export class UpdateStudentSituationDto {
  @IsEnum(StudentEnrollmentStatus)
  status: StudentEnrollmentStatus;

  @IsEnum(StudentEnrollmentMovement)
  movementType: StudentEnrollmentMovement;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  administrativeDetail?: string | null;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  schoolYear?: number;
}
