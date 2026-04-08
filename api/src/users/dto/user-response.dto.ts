import { UserRole } from '../../common/enums/user-role.enum';
import { TutorAssignmentResponseDto } from './tutor-assignment.dto';

export class UserResponseDto {
  id: string;
  username: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  assignments?: TutorAssignmentResponseDto[];
}
