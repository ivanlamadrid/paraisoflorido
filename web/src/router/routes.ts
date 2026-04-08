import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/auth/LoginPage.vue'),
        meta: {
          guestOnly: true,
        },
      },
    ],
  },
  {
    path: '/cambiar-contrasena-inicial',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/auth/ChangeInitialPasswordPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['director', 'secretary', 'auxiliary', 'tutor', 'student'],
          allowPasswordChangeRequired: true,
        },
      },
    ],
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'comunicados',
        component: () => import('pages/announcements/AnnouncementsFeedPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['director', 'secretary', 'auxiliary', 'tutor', 'student'],
        },
      },
      {
        path: 'comunicados/:id',
        component: () => import('pages/announcements/AnnouncementDetailPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['director', 'secretary', 'auxiliary', 'tutor', 'student'],
        },
      },
      {
        path: 'auxiliar/asistencia',
        component: () => import('pages/auxiliary/AuxiliaryAttendancePage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['auxiliary'],
        },
      },
      {
        path: 'tutor',
        component: () => import('pages/tutor/TutorDashboardPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['tutor'],
        },
      },
      {
        path: 'tutor/comunicados',
        component: () => import('pages/announcements/AnnouncementsAdminPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['tutor'],
        },
      },
      {
        path: 'tutor/comunicados/nuevo',
        component: () => import('pages/announcements/TutorAnnouncementEditorPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['tutor'],
        },
      },
      {
        path: 'tutor/comunicados/:id/editar',
        component: () => import('pages/announcements/TutorAnnouncementEditorPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['tutor'],
        },
      },
      {
        path: 'mi-asistencia',
        component: () => import('pages/student/StudentAttendanceHistoryPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['student'],
        },
      },
      {
        path: 'portal',
        component: () => import('pages/admin/AdminSupportPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['director', 'secretary'],
        },
      },
      {
        path: 'portal/comunicados',
        component: () => import('pages/announcements/AnnouncementsAdminPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['director', 'secretary'],
        },
      },
      {
        path: 'portal/comunicados/nuevo',
        component: () => import('pages/announcements/AnnouncementEditorPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['director', 'secretary'],
        },
      },
      {
        path: 'portal/comunicados/:id/editar',
        component: () => import('pages/announcements/AnnouncementEditorPage.vue'),
        meta: {
          requiresAuth: true,
          roles: ['director', 'secretary'],
        },
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
