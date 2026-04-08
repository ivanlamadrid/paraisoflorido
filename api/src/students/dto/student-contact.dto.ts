import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function normalizeText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

function normalizeNullableText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export class CreateStudentContactDto {
  @Transform(({ value }) => normalizeText(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  fullName: string;

  @Transform(({ value }) => normalizeText(value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  relationship: string;

  @Transform(({ value }) => normalizeText(value))
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phonePrimary: string;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneSecondary?: string | null;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string | null;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isEmergencyContact?: boolean;

  @IsOptional()
  @IsBoolean()
  isAuthorizedToCoordinate?: boolean;

  @IsOptional()
  @IsBoolean()
  isAuthorizedToPickUp?: boolean;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string | null;
}

export class UpdateStudentContactDto {
  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  fullName?: string;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  relationship?: string;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phonePrimary?: string;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneSecondary?: string | null;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string | null;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isEmergencyContact?: boolean;

  @IsOptional()
  @IsBoolean()
  isAuthorizedToCoordinate?: boolean;

  @IsOptional()
  @IsBoolean()
  isAuthorizedToPickUp?: boolean;

  @Transform(({ value }) => normalizeNullableText(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string | null;
}

export class StudentContactResponseDto {
  id: string;
  fullName: string;
  relationship: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  email: string | null;
  address: string | null;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  isAuthorizedToCoordinate: boolean;
  isAuthorizedToPickUp: boolean;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
