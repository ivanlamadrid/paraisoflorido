import { UserRole } from '../../common/enums/user-role.enum';

export interface AuthenticatedRequestUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  mustChangePassword: boolean;
  authVersion: number;
  isActive: boolean;
}
