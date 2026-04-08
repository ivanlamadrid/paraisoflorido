import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

function normalizeNullableText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export class UpdateStudentConsentDto {
  @IsBoolean()
  imageConsentGranted: boolean;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observation?: string | null;
}
