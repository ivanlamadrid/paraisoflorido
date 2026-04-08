export class ResetPasswordResponseDto {
  message: string;
  targetUserId: string;
  mustChangePassword: boolean;
  resetAt: string;
}
