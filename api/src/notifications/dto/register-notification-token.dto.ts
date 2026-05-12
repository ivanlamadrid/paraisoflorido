import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NotificationPlatform } from '../enums/notification-platform.enum';

export class RegisterNotificationTokenDto {
  @IsString()
  @MinLength(10)
  token: string;

  @IsEnum(NotificationPlatform)
  platform: NotificationPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}
