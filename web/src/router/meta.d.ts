import 'vue-router';
import type { UserRole } from 'src/types/session';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    guestOnly?: boolean;
    roles?: UserRole[];
    allowPasswordChangeRequired?: boolean;
  }
}
