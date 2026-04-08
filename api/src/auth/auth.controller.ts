import { Body, Controller, Get, Post } from '@nestjs/common';
import { AllowPasswordChangeRequired } from '../common/decorators/allow-password-change-required.decorator';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeInitialPasswordDto } from './dto/change-initial-password.dto';
import {
  ChangePasswordResponseDto,
  ChangeInitialPasswordResponseDto,
  LoginResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import type { AuthenticatedRequestUser } from './interfaces/authenticated-request-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @AllowPasswordChangeRequired()
  @Get('me')
  me(@AuthUser() authUser: AuthenticatedRequestUser): Promise<UserResponseDto> {
    return this.authService.me(authUser);
  }

  @AllowPasswordChangeRequired()
  @Post('change-initial-password')
  changeInitialPassword(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Body() dto: ChangeInitialPasswordDto,
  ): Promise<ChangeInitialPasswordResponseDto> {
    return this.authService.changeInitialPassword(authUser, dto);
  }

  @AllowPasswordChangeRequired()
  @Post('change-password')
  changePassword(
    @AuthUser() authUser: AuthenticatedRequestUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    return this.authService.changePassword(authUser, dto);
  }
}
