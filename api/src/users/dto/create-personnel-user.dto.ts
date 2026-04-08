import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
  ArrayMaxSize,
  IsArray,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';
import { TutorAssignmentInputDto } from './tutor-assignment.dto';
import { Type } from 'class-transformer';

function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreatePersonnelUserDto {
  @Transform(({ value }: { value: unknown }) => normalizeText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @Transform(({ value }: { value: unknown }) => normalizeText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  lastName: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  username: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  temporaryPassword: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean = true;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => TutorAssignmentInputDto)
  assignments?: TutorAssignmentInputDto[];
}
