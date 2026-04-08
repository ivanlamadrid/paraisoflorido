import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreatePersonnelUserDto } from './dto/create-personnel-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';
import { TutorAssignmentResponseDto } from './dto/tutor-assignment.dto';
import { UpdatePersonnelUserDto } from './dto/update-personnel-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import type { AuthenticatedRequestUser } from '../auth/interfaces/authenticated-request-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  listUsers(@Query() query: QueryUsersDto): Promise<{
    items: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.usersService.listUsers(query);
  }

  @Get('personnel')
  @Roles(UserRole.DIRECTOR)
  listPersonnel(@Query() query: QueryUsersDto): Promise<{
    items: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.usersService.listPersonnel(query);
  }

  @Get('me/tutor-assignments')
  @Roles(UserRole.TUTOR)
  getMyTutorAssignments(
    @AuthUser() authUser: AuthenticatedRequestUser,
  ): Promise<TutorAssignmentResponseDto[]> {
    return this.usersService.getMyTutorAssignments(authUser);
  }

  @Post('personnel')
  @Roles(UserRole.DIRECTOR)
  createPersonnel(
    @Body() dto: CreatePersonnelUserDto,
    @AuthUser() performedBy: AuthenticatedRequestUser,
  ): Promise<UserResponseDto> {
    return this.usersService.createPersonnel(dto, performedBy);
  }

  @Patch('personnel/:id')
  @Roles(UserRole.DIRECTOR)
  updatePersonnel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePersonnelUserDto,
    @AuthUser() performedBy: AuthenticatedRequestUser,
  ): Promise<UserResponseDto> {
    return this.usersService.updatePersonnel(id, dto, performedBy);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.DIRECTOR, UserRole.SECRETARY)
  resetPassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResetPasswordDto,
    @AuthUser() performedBy: AuthenticatedRequestUser,
  ): Promise<ResetPasswordResponseDto> {
    return this.usersService.resetUserPassword(id, performedBy, dto);
  }
}
