import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthenticatedRequestUser } from '../../auth/interfaces/authenticated-request-user.interface';
import { JwtTokenPayload } from '../../auth/interfaces/jwt-token-payload.interface';
import { UsersService } from '../../users/users.service';
import { ALLOW_PASSWORD_CHANGE_REQUIRED_KEY } from '../decorators/allow-password-change-required.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado.');
    }

    let payload: JwtTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('El usuario está inactivo.');
    }

    if (user.authVersion !== payload.authVersion) {
      throw new UnauthorizedException('La sesión ya no es válida.');
    }

    const canContinueWithoutChangingPassword =
      this.reflector.getAllAndOverride<boolean>(
        ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? false;

    if (user.mustChangePassword && !canContinueWithoutChangingPassword) {
      throw new ForbiddenException(
        'Debes cambiar tu contraseña antes de continuar.',
      );
    }

    const authenticatedUser: AuthenticatedRequestUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      authVersion: user.authVersion,
      isActive: user.isActive,
    };

    (
      request as Request & {
        user: AuthenticatedRequestUser;
      }
    ).user = authenticatedUser;

    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
