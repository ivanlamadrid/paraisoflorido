<template>
  <q-layout view="lHh Lpr lFf" class="app-shell">
    <q-drawer
      v-model="isSidebarOpen"
      show-if-above
      bordered
      :breakpoint="1024"
      :mini="isDesktop && isSidebarMini"
      :width="272"
      :mini-width="80"
      class="app-sidebar"
    >
      <div class="app-sidebar__inner">
        <div class="app-sidebar__brand-block">
          <SchoolMark
            class="app-sidebar__brand"
            :school-name="institutionStore.schoolName"
            compact
            subtitle="Sistema institucional escolar"
            :show-text="!isSidebarMini"
          />
        </div>

        <q-separator class="app-sidebar__separator" />

        <q-list class="app-sidebar__nav">
          <q-item-label v-if="!isSidebarMini" header class="app-sidebar__nav-label">
            Navegación
          </q-item-label>

          <q-item
            v-for="item in navigationItems"
            :key="item.key"
            clickable
            v-ripple
            class="app-sidebar__item"
            :class="{ 'app-sidebar__item--active': activeNavigationKey === item.key }"
            @click="handleNavigate(item)"
          >
            <q-item-section avatar class="app-sidebar__item-icon">
              <q-icon :name="item.icon" size="20px" />
            </q-item-section>
            <q-item-section v-if="!isSidebarMini">
              <q-item-label class="app-sidebar__item-label">{{ item.label }}</q-item-label>
              <q-item-label v-if="item.caption" caption class="app-sidebar__item-caption">
                {{ item.caption }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <div class="app-sidebar__footer">
          <q-chip
            v-if="institutionStore.settings && !isSidebarMini"
            class="ui-stat-chip app-sidebar__year-chip"
            color="grey-2"
            text-color="grey-9"
            icon="calendar_month"
          >
            Año activo {{ institutionStore.settings.activeSchoolYear }}
          </q-chip>

          <div v-if="sessionStore.user && !isSidebarMini" class="app-sidebar__role-summary">
            <span class="app-sidebar__role-label">{{ roleLabel }}</span>
            <span class="app-sidebar__role-copy">{{ roleSummary }}</span>
          </div>

          <q-btn
            v-if="isPhone && sessionStore.user && !isSidebarMini"
            flat
            color="primary"
            icon="logout"
            label="Cerrar sesión"
            no-caps
            align="left"
            class="app-sidebar__logout-btn"
            @click="handleLogout"
          />
        </div>
      </div>
    </q-drawer>

    <q-header bordered class="app-header text-grey-10">
      <q-toolbar class="app-toolbar">
        <div class="app-toolbar__content">
          <div class="app-toolbar__main">
            <q-btn
              flat
              round
              dense
              color="primary"
              :icon="sidebarToggleIcon"
              class="app-toolbar__sidebar-toggle"
              @click="toggleSidebar"
            />

            <div class="lt-md app-toolbar__mobile-brand">
              <SchoolMark
                compact
                :school-name="institutionStore.schoolName"
                :show-text="false"
              />
            </div>
          </div>

          <div v-if="sessionStore.user" class="app-toolbar__actions">
            <q-chip
              v-if="institutionStore.settings"
              class="ui-stat-chip app-toolbar__year-chip gt-xs"
              color="grey-2"
              text-color="grey-9"
              icon="calendar_month"
            >
              {{ institutionStore.settings.activeSchoolYear }}
            </q-chip>

            <div class="app-toolbar__account">
              <q-chip
                class="ui-stat-chip app-toolbar__role-chip"
                color="red-1"
                text-color="red-10"
                icon="badge"
              >
                {{ roleLabel }}
              </q-chip>

              <div class="app-toolbar__session-copy gt-xs">
                <span class="app-toolbar__session-name">{{ sessionStore.user.displayName }}</span>
                <span class="app-toolbar__session-id">{{ sessionStore.user.username }}</span>
              </div>
            </div>

            <q-btn
              v-if="!isPhone"
              flat
              color="primary"
              icon="logout"
              :label="$q.screen.gt.xs ? 'Cerrar sesión' : void 0"
              no-caps
              dense
              class="app-toolbar__logout"
              @click="handleLogout"
            />
          </div>
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container class="app-page-container">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import SchoolMark from 'components/ui/SchoolMark.vue';
import { useInstitutionStore } from 'src/stores/institution-store';
import { useSessionStore } from 'src/stores/session-store';
import type { UserRole } from 'src/types/session';

type ShellNavItem = {
  key: string;
  label: string;
  caption: string;
  icon: string;
  path: string;
  query?: Record<string, string>;
};

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const institutionStore = useInstitutionStore();
const sessionStore = useSessionStore();

const isSidebarOpen = ref(false);
const isSidebarMini = ref(false);

const roleLabels: Record<UserRole, string> = {
  director: 'Director',
  secretary: 'Secretaría',
  auxiliary: 'Auxiliar',
  tutor: 'Tutor',
  student: 'Estudiante',
};

const shellIcons = {
  sidebarCompact: 'menu',
  sidebarExpanded: 'menu_open',
  sidebarMobile: 'menu',
} as const;

const isDesktop = computed(() => $q.screen.gt.sm);
const isPhone = computed(() => $q.screen.width < 768);

const roleLabel = computed(() => {
  if (!sessionStore.user) {
    return '';
  }

  return roleLabels[sessionStore.user.role];
});

const roleSummary = computed(() => {
  if (!sessionStore.user) {
    return '';
  }

  if (sessionStore.user.role === 'auxiliary') {
    return 'Operación diaria de asistencia';
  }

  if (sessionStore.user.role === 'student') {
    return 'Consulta personal del historial';
  }

  if (sessionStore.user.role === 'tutor') {
    return 'Seguimiento de secciones asignadas';
  }

  return 'Gestión administrativa institucional';
});

const navigationItems = computed<ShellNavItem[]>(() => {
  if (!sessionStore.user) {
    return [];
  }

  if (sessionStore.user.role === 'auxiliary') {
    return [
      {
        key: 'auxiliary-gate',
        label: 'Puerta',
        caption: 'Escaneo rápido por QR',
        icon: 'qr_code_scanner',
        path: '/auxiliar/asistencia',
      },
      {
        key: 'auxiliary-classroom',
        label: 'Aula',
        caption: 'Revisión por contexto',
        icon: 'groups',
        path: '/auxiliar/asistencia',
        query: { section: 'classroom' },
      },
      {
        key: 'auxiliary-pending',
        label: 'Pendientes',
        caption: 'Offline y alertas del aula',
        icon: 'sync_problem',
        path: '/auxiliar/asistencia',
        query: { section: 'pending' },
      },
      {
        key: 'auxiliary-account',
        label: 'Cuenta',
        caption: 'Sesión y ayuda rápida',
        icon: 'account_circle',
        path: '/auxiliar/asistencia',
        query: { section: 'account' },
      },
      {
        key: 'shared-announcements',
        label: 'Comunicados',
        caption: 'Mensajes institucionales',
        icon: 'campaign',
        path: '/comunicados',
      },
    ];
  }

  if (sessionStore.user.role === 'student') {
    return [
      {
        key: 'student-today',
        label: 'Hoy',
        caption: 'Estado diario',
        icon: 'today',
        path: '/mi-asistencia',
      },
      {
        key: 'student-history',
        label: 'Historial',
        caption: 'Registros por fecha',
        icon: 'history',
        path: '/mi-asistencia',
        query: { section: 'history' },
      },
      {
        key: 'student-qr',
        label: 'Mi QR',
        caption: 'Credencial digital',
        icon: 'qr_code_2',
        path: '/mi-asistencia',
        query: { section: 'qr' },
      },
      {
        key: 'student-account',
        label: 'Mi ficha',
        caption: 'Datos institucionales',
        icon: 'account_circle',
        path: '/mi-asistencia',
        query: { section: 'account' },
      },
      {
        key: 'shared-announcements',
        label: 'Comunicados',
        caption: 'Avisos del colegio',
        icon: 'campaign',
        path: '/comunicados',
      },
    ];
  }

  if (sessionStore.user.role === 'tutor') {
    return [
      {
        key: 'tutor-classrooms',
        label: 'Resumen',
        caption: 'Vista general de tus secciones',
        icon: 'dashboard',
        path: '/tutor',
      },
      {
        key: 'tutor-students',
        label: 'Estudiantes',
        caption: 'Listado de tus secciones',
        icon: 'groups',
        path: '/tutor',
        query: { section: 'students' },
      },
      {
        key: 'tutor-follow-ups',
        label: 'Seguimiento',
        caption: 'Incidencias y observaciones',
        icon: 'fact_check',
        path: '/tutor',
        query: { section: 'followUps' },
      },
      {
        key: 'tutor-alerts',
        label: 'Alertas',
        caption: 'Riesgos por sección',
        icon: 'notifications_active',
        path: '/tutor',
        query: { section: 'alerts' },
      },
      {
        key: 'tutor-announcements',
        label: 'Comunicados',
        caption: 'Mensajes para tus aulas',
        icon: 'campaign',
        path: '/tutor/comunicados',
      },
      {
        key: 'tutor-account',
        label: 'Cuenta',
        caption: 'Acceso y datos básicos',
        icon: 'account_circle',
        path: '/tutor',
        query: { section: 'account' },
      },
    ];
  }

  const adminItems: ShellNavItem[] = [
    {
      key: 'admin-announcements',
      label: 'Comunicados',
      caption: 'Gestión institucional',
      icon: 'campaign',
      path: '/portal/comunicados',
    },
    {
      key: 'admin-support',
      label: 'Soporte',
      caption: 'Alertas y apoyo operativo',
      icon: 'support_agent',
      path: '/portal',
    },
    {
      key: 'admin-students',
      label: 'Estudiantes',
      caption: 'Ficha y gestión del alumnado',
      icon: 'groups',
      path: '/portal',
      query: { section: 'students' },
    },
    {
      key: 'admin-attendance',
      label: 'Asistencia',
      caption: 'Regularización y reportes',
      icon: 'fact_check',
      path: '/portal',
      query: { section: 'attendance' },
    },
    ...(sessionStore.user.role === 'director'
      ? [
          {
            key: 'admin-personnel',
            label: 'Personal',
            caption: 'Secretaría y auxiliares',
            icon: 'badge',
            path: '/portal',
            query: { section: 'personal' },
          },
        ]
      : []),
    {
      key: 'admin-settings',
      label: 'Configuración',
      caption: 'Colegio y cuenta',
      icon: 'settings',
      path: '/portal',
      query: { section: 'settings' },
    },
  ];

  return adminItems;
});

const activeNavigationKey = computed(() => {
  if (route.path.startsWith('/portal/comunicados')) {
    return 'admin-announcements';
  }

  if (route.path.startsWith('/comunicados')) {
    return 'shared-announcements';
  }

  if (route.path.startsWith('/auxiliar/asistencia')) {
    const section =
      typeof route.query.section === 'string' ? route.query.section : 'gate';

    if (section === 'classroom') {
      return 'auxiliary-classroom';
    }

    if (section === 'pending' || section === 'alerts') {
      return 'auxiliary-pending';
    }

    if (section === 'account') {
      return 'auxiliary-account';
    }

    return 'auxiliary-gate';
  }

  if (route.path.startsWith('/tutor/comunicados')) {
    return 'tutor-announcements';
  }

  if (route.path.startsWith('/tutor')) {
    const section =
      typeof route.query.section === 'string' ? route.query.section : 'classrooms';

    if (section === 'students') {
      return 'tutor-students';
    }

    if (section === 'followUps') {
      return 'tutor-follow-ups';
    }

    if (section === 'alerts') {
      return 'tutor-alerts';
    }

    if (section === 'account') {
      return 'tutor-account';
    }

    return 'tutor-classrooms';
  }

  if (route.path.startsWith('/mi-asistencia')) {
    const section =
      typeof route.query.section === 'string' ? route.query.section : 'today';

    if (section === 'history') {
      return 'student-history';
    }

    if (section === 'qr') {
      return 'student-qr';
    }

    if (section === 'account') {
      return 'student-account';
    }

    return 'student-today';
  }

  const section =
    typeof route.query.section === 'string' ? route.query.section : 'support';

  if (section === 'students') {
    return 'admin-students';
  }

  if (section === 'attendance') {
    return 'admin-attendance';
  }

  if (section === 'personal') {
    return 'admin-personnel';
  }

  if (section === 'settings') {
    return 'admin-settings';
  }

  return 'admin-support';
});

const sidebarToggleIcon = computed(() => {
  if (!isDesktop.value) {
    return shellIcons.sidebarMobile;
  }

  return isSidebarMini.value
    ? shellIcons.sidebarCompact
    : shellIcons.sidebarExpanded;
});

function toggleSidebar(): void {
  if (isDesktop.value) {
    isSidebarMini.value = !isSidebarMini.value;
    isSidebarOpen.value = true;
    return;
  }

  isSidebarOpen.value = !isSidebarOpen.value;
}

function handleNavigate(item: ShellNavItem): void {
  void router.push(
    item.query
      ? {
          path: item.path,
          query: item.query,
        }
      : {
          path: item.path,
        },
  );

  if (!isDesktop.value) {
    isSidebarOpen.value = false;
  }
}

function handleLogout(): void {
  sessionStore.logout();
  void router.replace('/login');
}

watch(
  isDesktop,
  (desktop) => {
    if (desktop) {
      isSidebarOpen.value = true;
      return;
    }

    isSidebarMini.value = false;
    isSidebarOpen.value = false;
  },
  { immediate: true },
);

onMounted(() => {
  if (sessionStore.isAuthenticated) {
    void institutionStore.loadSettings().catch(() => {
      // The role pages handle their own offline feedback when needed.
    });
  }
});
</script>
