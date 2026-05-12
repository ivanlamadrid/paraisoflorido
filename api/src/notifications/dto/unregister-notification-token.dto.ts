import { IsString, MinLength } from 'class-validator';

export class UnregisterNotificationTokenDto {
  @IsString()
  @MinLength(10)
  token: string;
}
