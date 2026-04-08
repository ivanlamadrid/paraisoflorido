import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequestUser } from '../../auth/interfaces/authenticated-request-user.interface';

export const AuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedRequestUser => {
    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedRequestUser;
    }>();

    return request.user;
  },
);
