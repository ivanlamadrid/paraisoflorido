import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';
import { StudentShift } from '../../common/enums/student-shift.enum';
import { AnnouncementAudienceType } from '../enums/announcement-audience-type.enum';

function normalizeSection(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class AnnouncementAudienceInputDto {
  @IsEnum(AnnouncementAudienceType)
  audienceType: AnnouncementAudienceType;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  schoolYear?: number;

  @IsOptional()
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
  @IsUUID()
  studentId?: string;
}
