import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AnnouncementAudienceInputDto } from './announcement-audience.dto';
import { AnnouncementLinkInputDto } from './announcement-link.dto';
import { AnnouncementPriority } from '../enums/announcement-priority.enum';
import { AnnouncementType } from '../enums/announcement-type.enum';

function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateAnnouncementDto {
  @Transform(({ value }) => normalizeText(value))
  @IsString()
  @MaxLength(160)
  title: string;

  @Transform(({ value }) => normalizeText(value))
  @IsString()
  @MaxLength(280)
  summary: string;

  @Transform(({ value }) => normalizeText(value))
  @IsString()
  @MaxLength(6000)
  body: string;

  @IsEnum(AnnouncementType)
  type: AnnouncementType;

  @IsEnum(AnnouncementPriority)
  priority: AnnouncementPriority;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  visibleFrom?: string;

  @IsOptional()
  @IsDateString()
  visibleUntil?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AnnouncementLinkInputDto)
  links?: AnnouncementLinkInputDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => AnnouncementAudienceInputDto)
  audiences: AnnouncementAudienceInputDto[];
}
