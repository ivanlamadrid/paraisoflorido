import { UserResponseDto } from '../../users/dto/user-response.dto';

export class LoginResponseDto {
  accessToken: string;
  user: UserResponseDto;
}

export class ChangeInitialPasswordResponseDto {
  message: string;
  accessToken: string;
  user: UserResponseDto;
}

export class ChangePasswordResponseDto {
  message: string;
  accessToken: string;
  user: UserResponseDto;
}
