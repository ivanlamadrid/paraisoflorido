import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

function normalizeReason(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;

  @Transform(({ value }) => normalizeReason(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}
