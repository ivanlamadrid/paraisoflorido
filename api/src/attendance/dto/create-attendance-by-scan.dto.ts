import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AttendanceMarkType } from '../../common/enums/attendance-mark-type.enum';

function normalizeCode(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function normalizeObservation(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateAttendanceByScanDto {
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  studentCode: string;

  @IsEnum(AttendanceMarkType)
  markType: AttendanceMarkType;

  @IsOptional()
  @Transform(({ value }) => normalizeObservation(value))
  @IsString()
  @MaxLength(255)
  observation?: string;
}
