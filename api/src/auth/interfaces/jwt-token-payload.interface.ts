import { UserRole } from '../../common/enums/user-role.enum';

export interface JwtTokenPayload {
  sub: string;
  username: string;
  role: UserRole;
  authVersion: number;
}
