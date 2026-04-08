import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AttendanceMarkType } from '../../common/enums/attendance-mark-type.enum';
import { AttendanceRecordStatus } from '../../common/enums/attendance-record-status.enum';
import { AttendanceSource } from '../../common/enums/attendance-source.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';

function normalizeString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeCode(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class SyncOfflineAttendanceItemDto {
  @Transform(({ value }) => normalizeString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  clientId: string;

  @IsEnum(AttendanceSource)
  source: AttendanceSource;

  @ValidateIf(
    (dto: SyncOfflineAttendanceItemDto) => dto.source === AttendanceSource.QR,
  )
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  studentCode?: string;

  @ValidateIf(
    (dto: SyncOfflineAttendanceItemDto) =>
      dto.source === AttendanceSource.MANUAL,
  )
  @IsUUID()
  studentId?: string;

  @IsDateString()
  attendanceDate: string;

  @IsISO8601()
  markedAt: string;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  schoolYear: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  grade: number;

  @Transform(({ value }) => normalizeString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  section: string;

  @IsEnum(StudentShift)
  shift: StudentShift;

  @IsEnum(AttendanceMarkType)
  markType: AttendanceMarkType;

  @IsOptional()
  @IsEnum(AttendanceRecordStatus)
  status?: AttendanceRecordStatus;

  @IsOptional()
  @Transform(({ value }) => normalizeString(value))
  @IsString()
  @MaxLength(255)
  observation?: string;
}

export class SyncOfflineAttendanceBatchDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SyncOfflineAttendanceItemDto)
  items: SyncOfflineAttendanceItemDto[];
}
