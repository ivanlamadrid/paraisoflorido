import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AnnouncementLinkInputDto {
  @Transform(({ value }) => normalizeText(value))
  @IsString()
  @MaxLength(120)
  label: string;

  @Transform(({ value }) => normalizeText(value))
  @IsUrl({
    require_protocol: true,
    protocols: ['http', 'https'],
  })
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  sortOrder?: number;
}
