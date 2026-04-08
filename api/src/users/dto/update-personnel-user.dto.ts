import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';
import { Type } from 'class-transformer';
import { TutorAssignmentInputDto } from './tutor-assignment.dto';

function normalizeOptionalText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdatePersonnelUserDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeOptionalText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeOptionalText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  username?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => TutorAssignmentInputDto)
  assignments?: TutorAssignmentInputDto[];
}
