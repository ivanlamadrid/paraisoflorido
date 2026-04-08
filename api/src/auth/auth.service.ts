import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../common/enums/user-role.enum';
import { verifyPassword } from '../common/utils/password.util';
import { InstitutionService } from '../institution/institution.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeInitialPasswordDto } from './dto/change-initial-password.dto';
import {
  ChangePasswordResponseDto,
  ChangeInitialPasswordResponseDto,
  LoginResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedRequestUser } from './interfaces/authenticated-request-user.interface';
import { JwtTokenPayload } from './interfaces/jwt-token-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly institutionService: InstitutionService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByUsername(dto.username);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('El usuario está inactivo.');
    }

    const isPasswordValid = await verifyPassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    user.lastLoginAt = new Date();
    await this.saveUser(user);

    return {
      accessToken: await this.signAccessToken(user),
      user: this.usersService.toUserResponse(user),
    };
  }

  async me(authUser: AuthenticatedRequestUser): Promise<UserResponseDto> {
    const user = await this.usersService.findById(authUser.id);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    return this.usersService.toUserResponse(user);
  }

  async changeInitialPassword(
    authUser: AuthenticatedRequestUser,
    dto: ChangeInitialPasswordDto,
  ): Promise<ChangeInitialPasswordResponseDto> {
    const user = await this.usersService.findById(authUser.id);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException(
        'Solo los estudiantes pueden cambiar la contraseña inicial.',
      );
    }

    if (!user.mustChangePassword) {
      throw new ForbiddenException('La contraseña inicial ya fue cambiada.');
    }

    await this.validatePasswordChange(user, dto, {
      enforceStudentInitialRestrictions: true,
    });

    const updatedUser = await this.usersService.changeOwnPassword(
      user.id,
      dto.newPassword,
    );

    return {
      message: 'La contraseña inicial fue actualizada correctamente.',
      accessToken: await this.signAccessToken(updatedUser),
      user: this.usersService.toUserResponse(updatedUser),
    };
  }

  async changePassword(
    authUser: AuthenticatedRequestUser,
    dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    const user = await this.usersService.findById(authUser.id);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    await this.validatePasswordChange(user, dto, {
      enforceStudentInitialRestrictions: user.role === UserRole.STUDENT,
    });

    const updatedUser = await this.usersService.changeOwnPassword(
      user.id,
      dto.newPassword,
    );

    return {
      message: 'La contraseña fue actualizada correctamente.',
      accessToken: await this.signAccessToken(updatedUser),
      user: this.usersService.toUserResponse(updatedUser),
    };
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: JwtTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      authVersion: user.authVersion,
    };

    return this.jwtService.signAsync(payload);
  }

  private async saveUser(user: User): Promise<User> {
    return this.usersService.save(user);
  }

  private async validatePasswordChange(
    user: User,
    dto: ChangePasswordDto,
    options: {
      enforceStudentInitialRestrictions: boolean;
    },
  ): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Las nuevas contraseñas no coinciden.');
    }

    const isCurrentPasswordValid = await verifyPassword(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual.',
      );
    }

    if (options.enforceStudentInitialRestrictions) {
      const normalizedUsername = this.usersService.normalizeUsername(
        user.username,
      );

      if (
        await this.institutionService.verifyMatchesInitialStudentPassword(
          dto.newPassword,
        )
      ) {
        throw new BadRequestException(
          'La nueva contraseña no puede ser igual a la contraseña inicial.',
        );
      }

      if (dto.newPassword === normalizedUsername) {
        throw new BadRequestException(
          'La nueva contraseña no puede ser igual al código del estudiante.',
        );
      }
    }
  }
}
