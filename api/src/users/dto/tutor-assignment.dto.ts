import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { StudentShift } from '../../common/enums/student-shift.enum';

function normalizeSection(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class TutorAssignmentInputDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  schoolYear: number;

  @IsInt()
  @Min(1)
  @Max(5)
  grade: number;

  @Transform(({ value }: { value: unknown }) => normalizeSection(value))
  @IsString()
  @MaxLength(10)
  section: string;

  @IsEnum(StudentShift)
  shift: StudentShift;
}

export class TutorAssignmentResponseDto {
  id: string;
  schoolYear: number;
  grade: number;
  section: string;
  shift: StudentShift;
}
