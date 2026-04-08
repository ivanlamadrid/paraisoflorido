import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StudentShift } from '../../common/enums/student-shift.enum';

function normalizeSection(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class QueryDailyAttendanceDto {
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
}
