<template>
  <q-page
    class="student-history-page"
    :class="{ 'student-history-page--compact-tablet': isCompactTablet }"
  >
    <div class="ui-page-shell">
      <PageIntroCard
        eyebrow="Área del estudiante"
        :title="studentProfile?.firstName ? 'Hola, ' + studentProfile.firstName : 'Mi asistencia'"
        description="Consulta tu estado del día, revisa tu historial de asistencia y ten tu credencial digital lista para registrar entradas y salidas."
      >
        <template #meta>
          <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="badge">
            {{ studentProfile?.code || sessionStore.user?.username || 'Sin código' }}
          </q-chip>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="school">
            {{ classroomLabel }}
          </q-chip>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="calendar_month">
            {{ monthRangeLabel }}
          </q-chip>
        </template>
      </PageIntroCard>

      <ResponsiveSectionNav
        v-model="activeSection"
        class="q-mt-lg"
        :items="sectionItems"
        :show-desktop-tabs="false"
      />

      <div v-if="isInitialLoading" class="ui-loading-state">
        <q-spinner color="primary" size="34px" />
        <span class="text-body2 text-grey-7">Cargando tu información de asistencia...</span>
      </div>

      <template v-else>
        <section v-show="activeSection === 'today'" class="role-section-view q-mt-lg">
          <StatusBanner
            v-if="profileFeedback"
            :variant="profileFeedback.type"
            :title="profileFeedback.title"
            :message="profileFeedback.message"
          />

          <StatusBanner
            v-if="todayFeedback"
            class="q-mt-md"
            :variant="todayFeedback.type"
            :title="todayFeedback.title"
            :message="todayFeedback.message"
          />

          <q-card
            v-if="studentNotificationsStore.hasUnreadAnnouncements"
            flat
            bordered
            class="history-card student-announcements-panel q-mt-lg"
          >
            <q-card-section class="ui-card-body">
              <div class="student-announcements-panel__header">
                <div class="student-announcements-panel__heading">
                  <div class="ui-eyebrow">Comunicados</div>
                  <div class="text-subtitle1 text-weight-bold q-mt-sm">
                    Tienes comunicados nuevos
                  </div>
                  <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                    Revisa los avisos pendientes y prioriza los mensajes destacados del colegio.
                  </p>
                </div>

                <div class="student-announcements-panel__actions">
                  <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="mail">
                    {{ studentNotificationsStore.unreadCount }} sin leer
                  </q-chip>
                  <q-btn
                    flat
                    color="primary"
                    icon="arrow_forward"
                    label="Ir a comunicados"
                    no-caps
                    @click="router.push('/comunicados')"
                  />
                </div>
              </div>

              <div
                v-if="studentNotificationsStore.highlightedAnnouncement"
                class="student-announcements-panel__featured q-mt-lg"
              >
                <div class="student-announcements-panel__featured-copy">
                  <div class="row items-center q-gutter-sm">
                    <q-chip
                      dense
                      class="ui-stat-chip"
                      :color="getAnnouncementPriorityTone(studentNotificationsStore.highlightedAnnouncement.priority).color"
                      :text-color="getAnnouncementPriorityTone(studentNotificationsStore.highlightedAnnouncement.priority).textColor"
                      :icon="getAnnouncementPriorityTone(studentNotificationsStore.highlightedAnnouncement.priority).icon"
                    >
                      {{ getAnnouncementPriorityLabel(studentNotificationsStore.highlightedAnnouncement.priority) }}
                    </q-chip>
                    <q-chip
                      v-if="studentNotificationsStore.highlightedAnnouncement.isPinned"
                      dense
                      class="ui-stat-chip"
                      color="amber-1"
                      text-color="amber-10"
                      icon="push_pin"
                    >
                      Fijado
                    </q-chip>
                  </div>
                  <div class="text-subtitle2 text-weight-bold q-mt-md">
                    {{ studentNotificationsStore.highlightedAnnouncement.title }}
                  </div>
                  <p class="text-body2 text-grey-7 q-mt-sm q-mb-none">
                    {{ studentNotificationsStore.highlightedAnnouncement.summary }}
                  </p>
                </div>

                <q-btn
                  flat
                  color="primary"
                  icon="visibility"
                  label="Abrir"
                  no-caps
                  @click="router.push(`/comunicados/${studentNotificationsStore.highlightedAnnouncement?.id}`)"
                />
              </div>

              <div
                v-if="studentNotificationsStore.homeAnnouncements.length > 0"
                class="student-announcements-panel__list q-mt-lg"
              >
                <article
                  v-for="item in studentNotificationsStore.homeAnnouncements"
                  :key="item.id"
                  class="student-announcements-panel__item"
                >
                  <div class="student-announcements-panel__item-copy">
                    <div class="row items-center q-gutter-sm">
                      <q-chip
                        dense
                        class="ui-stat-chip"
                        :color="getAnnouncementTypeTone(item.type).color"
                        :text-color="getAnnouncementTypeTone(item.type).textColor"
                        :icon="getAnnouncementTypeTone(item.type).icon"
                      >
                        {{ getAnnouncementTypeLabel(item.type) }}
                      </q-chip>
                      <q-chip
                        v-if="item.isPinned"
                        dense
                        class="ui-stat-chip"
                        color="amber-1"
                        text-color="amber-10"
                        icon="push_pin"
                      >
                        Fijado
                      </q-chip>
                    </div>
                    <div class="text-body1 text-weight-medium q-mt-sm">{{ item.title }}</div>
                    <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">{{ item.summary }}</p>
                  </div>

                  <div class="student-announcements-panel__item-meta">
                    <span>{{ formatAnnouncementDate(item.publishedAt) }}</span>
                    <q-btn
                      flat
                      color="primary"
                      label="Ver"
                      no-caps
                      @click="router.push(`/comunicados/${item.id}`)"
                    />
                  </div>
                </article>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="history-card student-today-panel q-mt-lg">
            <q-card-section class="ui-card-body">
              <div class="ui-eyebrow">Hoy</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                Estado diario y registro personal
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                Consulta tu situación del día y revisa si tu asistencia de hoy ya está completa.
              </p>

              <StatusBanner
                class="q-mt-lg"
                :variant="todayOverviewBanner.type"
                :title="todayOverviewBanner.title"
                :message="todayOverviewBanner.message"
              />

              <div class="student-today-stats-grid q-mt-lg">
                <StatSummaryCard
                  label="Entrada de hoy"
                  :value="todayEntryLabel"
                  caption="Hora registrada para la entrada del día actual."
                  icon="login"
                  tone="positive"
                />
                <StatSummaryCard
                  label="Salida de hoy"
                  :value="todayExitLabel"
                  caption="Hora registrada para la salida del día actual."
                  icon="logout"
                  tone="warning"
                />
                <StatSummaryCard
                  label="Estado operativo"
                  :value="todayOperationalShortLabel"
                  :caption="todayOperationalCaption"
                  icon="fact_check"
                  tone="dark"
                />
              </div>
            </q-card-section>
          </q-card>
        </section>

        <section v-show="activeSection === 'history'" class="role-section-view q-mt-lg">
          <StatusBanner
            v-if="historyFeedback"
            :variant="historyFeedback.type"
            :title="historyFeedback.title"
            :message="historyFeedback.message"
          />

          <q-card flat bordered class="history-card q-mt-lg">
            <q-card-section class="ui-card-body">
              <div class="row items-start justify-between q-col-gutter-md">
                <div class="col-12 col-lg">
                  <div class="ui-eyebrow">Historial</div>
                  <div class="text-subtitle1 text-weight-bold q-mt-sm">
                    Asistencia del rango seleccionado
                  </div>
                  <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                    Filtra por fecha y revisa el resumen del periodo con una lectura clara para móvil y escritorio.
                  </p>
                </div>
                <div class="col-12 col-lg-auto">
                  <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="history">
                    {{ historySummary.totalRecords }} registros
                  </q-chip>
                </div>
              </div>

              <q-form class="history-filter-grid q-mt-lg" @submit="handleApplyHistoryFilters">
                <q-input v-model="historyFilters.from" type="date" label="Desde" outlined>
                  <template #prepend>
                    <q-icon name="calendar_month" />
                  </template>
                </q-input>

                <q-input v-model="historyFilters.to" type="date" label="Hasta" outlined>
                  <template #prepend>
                    <q-icon name="calendar_month" />
                  </template>
                </q-input>

                <div class="student-history-filter-actions">
                  <q-btn flat color="primary" label="Mes actual" no-caps @click="resetHistoryFilters" />
                  <q-btn
                    color="primary"
                    label="Actualizar historial"
                    no-caps
                    type="submit"
                    :loading="isLoadingHistory"
                  />
                </div>
              </q-form>

              <div class="student-history-summary-grid q-mt-lg">
                <StatSummaryCard label="Entradas" :value="historySummary.entries" caption="Marcas de entrada en el rango." icon="login" tone="positive" />
                <StatSummaryCard label="Salidas" :value="historySummary.exits" caption="Marcas de salida en el rango." icon="logout" tone="warning" />
                <StatSummaryCard label="Ausencias" :value="historySummary.absences" caption="Ausencias justificadas y no justificadas." icon="event_busy" tone="dark" />
                <StatSummaryCard label="Incompletos" :value="historySummary.incompleteDays" caption="Días con solo entrada o solo salida." icon="warning" tone="info" />
              </div>

              <div v-if="isLoadingHistory" class="ui-loading-state q-mt-lg">
                <q-spinner color="primary" size="30px" />
                <span class="text-body2 text-grey-7">Actualizando historial...</span>
              </div>

              <div v-else-if="paginatedHistoryItems.length === 0" class="student-history-empty q-mt-lg">
                <q-icon name="event_note" size="32px" color="grey-6" />
                <div class="text-subtitle2 text-weight-bold">Sin registros en ese rango</div>
                <p class="text-body2 text-grey-7 q-mb-none">
                  Prueba un rango de fechas más amplio para revisar asistencias anteriores.
                </p>
              </div>

              <div v-else class="history-list q-mt-lg">
                <article
                  v-for="item in paginatedHistoryItems"
                  :key="item.itemType + '-' + item.attendanceDate + '-' + (item.markType || item.status)"
                  class="history-entry"
                >
                  <q-avatar
                    class="history-entry__icon"
                    :color="getHistoryTone(item).color"
                    :text-color="getHistoryTone(item).textColor"
                    :icon="getHistoryTone(item).icon"
                  />

                  <div>
                    <div class="history-entry__title">{{ getHistoryTitle(item) }}</div>
                    <div class="history-entry__meta">
                      {{ formatLongDate(item.attendanceDate) }}
                      <span v-if="item.markedAt"> - {{ formatTime(item.markedAt) }}</span>
                    </div>
                    <div v-if="item.observation" class="history-entry__note">
                      {{ item.observation }}
                    </div>
                  </div>

                  <div class="history-entry__aside">
                    <q-chip
                      class="ui-stat-chip"
                      :color="getHistoryTone(item).chipColor"
                      :text-color="getHistoryTone(item).chipTextColor"
                      :icon="getHistoryTone(item).chipIcon"
                    >
                      {{ getHistoryChipLabel(item) }}
                    </q-chip>
                  </div>
                </article>
              </div>

              <div v-if="historyTotalPages > 1" class="row justify-center q-mt-lg">
                <q-pagination
                  v-model="historyPagination.page"
                  color="primary"
                  :max="historyTotalPages"
                  max-pages="6"
                  boundary-links
                />
              </div>
            </q-card-section>
          </q-card>
        </section>

        <section v-show="activeSection === 'qr'" class="role-section-view q-mt-lg">
          <StatusBanner
            v-if="profileFeedback"
            :variant="profileFeedback.type"
            :title="profileFeedback.title"
            :message="profileFeedback.message"
          />

          <div class="student-overview-grid q-mt-lg">
            <div class="student-overview-grid__main">
              <StudentQrCredentialCard v-if="studentProfile" :student="studentProfile" />
            </div>

            <div class="student-overview-grid__side">
              <q-card flat bordered class="history-card">
                <q-card-section class="ui-card-body">
                  <div class="ui-eyebrow">Mi QR</div>
                  <div class="text-subtitle1 text-weight-bold q-mt-sm">
                    Credencial lista para registrar asistencia
                  </div>
                  <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                    Muestra este código cuando necesites registrar tu entrada o salida con el auxiliar.
                  </p>

                  <div class="student-account-details q-mt-lg">
                    <div class="student-account-item">
                      <span class="student-account-item__label">Código</span>
                      <span class="student-account-item__value">{{ studentProfile?.code || '-' }}</span>
                    </div>
                    <div class="student-account-item">
                      <span class="student-account-item__label">Aula actual</span>
                      <span class="student-account-item__value">{{ classroomLabel }}</span>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </section>

        <section v-show="activeSection === 'account'" class="role-section-view q-mt-lg">
          <StatusBanner
            v-if="profileFeedback"
            :variant="profileFeedback.type"
            :title="profileFeedback.title"
            :message="profileFeedback.message"
          />

          <div class="student-account-grid q-mt-lg">
            <StudentInstitutionalProfileView v-if="studentProfile" :student="studentProfile" />

            <PasswordChangeCard
              class="q-mt-lg"
              :feedback="passwordFeedback"
              :loading="isChangingPassword"
              title="Cambiar contraseña"
              description="Actualiza tu clave personal si ya conoces tu contraseña actual."
              submit-label="Guardar contraseña"
              @submit="handleChangePassword"
            />
          </div>
        </section>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ResponsiveSectionNav, { type SectionNavItem } from 'components/navigation/ResponsiveSectionNav.vue';
import PasswordChangeCard from 'components/auth/PasswordChangeCard.vue';
import StudentInstitutionalProfileView from 'components/student/StudentInstitutionalProfileView.vue';
import StudentQrCredentialCard from 'components/student/StudentQrCredentialCard.vue';
import PageIntroCard from 'components/ui/PageIntroCard.vue';
import StatSummaryCard from 'components/ui/StatSummaryCard.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import { useResponsiveDevice } from 'src/composables/use-responsive-device';
import { getMyAttendanceHistory } from 'src/services/api/attendance-api';
import { getApiErrorMessage } from 'src/services/api/api-errors';
import { getMyStudentInstitutionalProfile } from 'src/services/api/students-api';
import { useSessionStore } from 'src/stores/session-store';
import { useStudentNotificationsStore } from 'src/stores/student-notifications-store';
import type { AttendanceHistoryItem } from 'src/types/attendance';
import type { ChangePasswordPayload } from 'src/types/session';
import type { StudentDetail } from 'src/types/students';
import {
  formatAnnouncementDate,
  getAnnouncementPriorityLabel,
  getAnnouncementPriorityTone,
  getAnnouncementTypeLabel,
  getAnnouncementTypeTone,
} from 'src/utils/announcements';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

type HistoryTone = {
  color: string;
  textColor: string;
  icon: string;
  chipColor: string;
  chipTextColor: string;
  chipIcon: string;
};

type HistorySummary = {
  totalRecords: number;
  entries: number;
  exits: number;
  absences: number;
  lateEntries: number;
  earlyDepartures: number;
  incompleteDays: number;
};

type StudentSection = 'today' | 'history' | 'qr' | 'account';

const sessionStore = useSessionStore();
const studentNotificationsStore = useStudentNotificationsStore();
const route = useRoute();
const router = useRouter();
const { isCompactTablet } = useResponsiveDevice();
const today = new Date().toISOString().slice(0, 10);
const defaultStudentSection: StudentSection = 'today';

const sectionItems: SectionNavItem[] = [
  { value: 'today', label: 'Hoy', icon: 'today' },
  { value: 'history', label: 'Historial', icon: 'history' },
  { value: 'qr', label: 'Mi QR', icon: 'qr_code_2' },
  { value: 'account', label: 'Mi ficha', icon: 'account_circle' },
];

const activeSection = ref<StudentSection>(defaultStudentSection);
const studentProfile = ref<StudentDetail | null>(null);
const todayItems = ref<AttendanceHistoryItem[]>([]);
const historyItems = ref<AttendanceHistoryItem[]>([]);
const historyFilters = reactive({
  from: getMonthStart(today),
  to: today,
});
const historyPagination = reactive({
  page: 1,
  pageSize: 10,
});

const profileFeedback = ref<FeedbackState | null>(null);
const todayFeedback = ref<FeedbackState | null>(null);
const historyFeedback = ref<FeedbackState | null>(null);
const passwordFeedback = ref<FeedbackState | null>(null);
const isLoadingProfile = ref(false);
const isLoadingToday = ref(false);
const isLoadingHistory = ref(false);
const isChangingPassword = ref(false);

const isInitialLoading = computed(() => isLoadingProfile.value && !studentProfile.value);
const classroomLabel = computed(() => {
  const profile = studentProfile.value;

  if (!profile || profile.grade === null || !profile.section || !profile.shift) {
    return 'Sin asignación vigente';
  }

  return `${profile.grade} ${profile.section} - ${
    profile.shift === 'morning' ? 'Turno mañana' : 'Turno tarde'
  }`;
});
const monthRangeLabel = computed(() => formatMonthRange(historyFilters.from, historyFilters.to));

const todayEntry = computed(() =>
  todayItems.value.find((item) => item.itemType === 'mark' && item.markType === 'entry') ?? null,
);
const todayExit = computed(() =>
  todayItems.value.find((item) => item.itemType === 'mark' && item.markType === 'exit') ?? null,
);
const todayAbsence = computed(() =>
  todayItems.value.find((item) => item.itemType === 'absence') ?? null,
);

const todayEntryLabel = computed(() =>
  todayEntry.value?.markedAt ? formatTime(todayEntry.value.markedAt) : 'Pendiente',
);
const todayExitLabel = computed(() =>
  todayExit.value?.markedAt ? formatTime(todayExit.value.markedAt) : 'Pendiente',
);

const todayOperationalShortLabel = computed(() => {
  if (todayAbsence.value?.status === 'justified_absence') return 'Ausencia just.';
  if (todayAbsence.value?.status === 'unjustified_absence') return 'Ausencia no just.';
  if (todayEntry.value?.status === 'late') return 'Tardanza';
  if (todayExit.value?.status === 'early_departure') return 'Salida anticipada';
  if (todayEntry.value && todayExit.value) return 'Completo';
  if (todayEntry.value || todayExit.value) return 'En proceso';
  return 'Sin registro';
});

const todayOperationalCaption = computed(() => {
  if (todayAbsence.value?.observation) return todayAbsence.value.observation;
  if (todayEntry.value?.observation) return todayEntry.value.observation;
  if (todayExit.value?.observation) return todayExit.value.observation;
  if (todayEntry.value && todayExit.value) return 'Tu entrada y tu salida de hoy ya están registradas.';
  if (todayEntry.value || todayExit.value) return 'Todavía queda una marca pendiente por completar en el día.';
  return 'Todavía no hay asistencia registrada para hoy.';
});

const todayOverviewBanner = computed<FeedbackState>(() => {
  if (todayAbsence.value?.status === 'justified_absence') {
    return {
      type: 'info',
      title: 'Ausencia justificada',
      message: todayAbsence.value.observation || 'Hoy tienes una ausencia justificada registrada.',
    };
  }

  if (todayAbsence.value?.status === 'unjustified_absence') {
    return {
      type: 'warning',
      title: 'Ausencia no justificada',
      message: todayAbsence.value.observation || 'Hoy figura una ausencia no justificada en tu registro diario.',
    };
  }

  if (todayEntry.value && todayExit.value) {
    return {
      type: 'success',
      title: 'Día completo',
      message: 'Tus marcas de entrada y salida de hoy ya quedaron registradas.',
    };
  }

  if (todayEntry.value?.status === 'late') {
    return {
      type: 'warning',
      title: 'Entrada con tardanza',
      message: 'Tu entrada de hoy fue registrada como tardanza. Revisa el detalle en el historial si necesitas contexto.',
    };
  }

  if (todayExit.value?.status === 'early_departure') {
    return {
      type: 'warning',
      title: 'Salida anticipada',
      message: 'Tu salida de hoy fue registrada como anticipada. La observación quedó guardada en el sistema.',
    };
  }

  if (todayEntry.value || todayExit.value) {
    return {
      type: 'info',
      title: 'Registro en proceso',
      message: 'Hoy ya tienes una marca registrada, pero el día aún no está completo.',
    };
  }

  return {
    type: 'info',
    title: 'Sin registro todavía',
    message: 'Cuando registres tu asistencia de hoy, aquí verás tu estado actualizado.',
  };
});

const paginatedHistoryItems = computed(() => {
  const start = (historyPagination.page - 1) * historyPagination.pageSize;
  return historyItems.value.slice(start, start + historyPagination.pageSize);
});
const historyTotalPages = computed(() => Math.max(1, Math.ceil(historyItems.value.length / historyPagination.pageSize)));
const historySummary = computed<HistorySummary>(() => {
  const summary: HistorySummary = {
    totalRecords: historyItems.value.length,
    entries: 0,
    exits: 0,
    absences: 0,
    lateEntries: 0,
    earlyDepartures: 0,
    incompleteDays: 0,
  };

  const dayMap = new Map<string, { entry: boolean; exit: boolean; absence: boolean }>();

  for (const item of historyItems.value) {
    const existingDay = dayMap.get(item.attendanceDate) ?? { entry: false, exit: false, absence: false };

    if (item.itemType === 'absence') {
      summary.absences += 1;
      existingDay.absence = true;
    }

    if (item.itemType === 'mark' && item.markType === 'entry') {
      summary.entries += 1;
      existingDay.entry = true;
      if (item.status === 'late') summary.lateEntries += 1;
    }

    if (item.itemType === 'mark' && item.markType === 'exit') {
      summary.exits += 1;
      existingDay.exit = true;
      if (item.status === 'early_departure') summary.earlyDepartures += 1;
    }

    dayMap.set(item.attendanceDate, existingDay);
  }

  summary.incompleteDays = Array.from(dayMap.values()).filter(
    (day) => !day.absence && (day.entry !== day.exit),
  ).length;

  return summary;
});

function normalizeStudentSection(value: unknown): StudentSection {
  return typeof value === 'string' && ['today', 'history', 'qr', 'account'].includes(value)
    ? (value as StudentSection)
    : defaultStudentSection;
}

function syncStudentSectionQuery(section: StudentSection): void {
  const nextQuery = { ...route.query };

  if (section === defaultStudentSection) {
    delete nextQuery.section;
  } else {
    nextQuery.section = section;
  }

  void router.replace({ query: nextQuery });
}

async function loadStudentProfile(): Promise<void> {
  profileFeedback.value = null;
  isLoadingProfile.value = true;

  try {
    studentProfile.value = await getMyStudentInstitutionalProfile();
  } catch (error) {
    profileFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar tu perfil',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingProfile.value = false;
  }
}

async function loadTodayHistory(): Promise<void> {
  todayFeedback.value = null;
  isLoadingToday.value = true;

  try {
    const response = await getMyAttendanceHistory({ from: today, to: today, page: 1, limit: 20 });
    todayItems.value = response.items;
  } catch (error) {
    todayItems.value = [];
    todayFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar el estado de hoy',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingToday.value = false;
  }
}

async function loadHistory(): Promise<void> {
  historyFeedback.value = null;
  isLoadingHistory.value = true;

  if (historyFilters.from && historyFilters.to && historyFilters.from > historyFilters.to) {
    historyItems.value = [];
    historyFeedback.value = {
      type: 'warning',
      title: 'Rango inválido',
      message: 'La fecha inicial no puede ser mayor que la fecha final.',
    };
    isLoadingHistory.value = false;
    return;
  }

  try {
    const limit = 100;
    let page = 1;
    let total = 0;
    const collected: AttendanceHistoryItem[] = [];

    do {
      const historyQuery: { page: number; limit: number; from?: string; to?: string } = {
        page,
        limit,
      };

      if (historyFilters.from) historyQuery.from = historyFilters.from;
      if (historyFilters.to) historyQuery.to = historyFilters.to;

      const response = await getMyAttendanceHistory(historyQuery);
      total = response.total;
      collected.push(...response.items);
      page += 1;
    } while (collected.length < total);

    historyItems.value = collected;
    historyPagination.page = 1;
  } catch (error) {
    historyItems.value = [];
    historyFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar tu historial',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingHistory.value = false;
  }
}

async function handleApplyHistoryFilters(): Promise<void> {
  await loadHistory();
}

async function handleChangePassword(payload: ChangePasswordPayload): Promise<void> {
  passwordFeedback.value = null;
  isChangingPassword.value = true;

  try {
    await sessionStore.changeOwnPassword(payload);
    passwordFeedback.value = {
      type: 'success',
      title: 'Contraseña actualizada',
      message: 'Tu contraseña personal fue actualizada correctamente.',
    };
  } catch (error) {
    passwordFeedback.value = {
      type: 'error',
      title: 'No se pudo cambiar la contraseña',
      message: getApiErrorMessage(error),
    };
  } finally {
    isChangingPassword.value = false;
  }
}

function resetHistoryFilters(): void {
  historyFilters.from = getMonthStart(today);
  historyFilters.to = today;
  void loadHistory();
}

function getHistoryTone(item: AttendanceHistoryItem): HistoryTone {
  if (item.itemType === 'absence') {
    if (item.status === 'justified_absence') {
      return {
        color: 'blue-1',
        textColor: 'blue-10',
        icon: 'fact_check',
        chipColor: 'blue-1',
        chipTextColor: 'blue-10',
        chipIcon: 'check_circle',
      };
    }

    return {
      color: 'red-1',
      textColor: 'red-10',
      icon: 'event_busy',
      chipColor: 'red-1',
      chipTextColor: 'red-10',
      chipIcon: 'warning',
    };
  }

  if (item.markType === 'entry' && item.status === 'late') {
    return {
      color: 'orange-1',
      textColor: 'orange-10',
      icon: 'schedule',
      chipColor: 'orange-1',
      chipTextColor: 'orange-10',
      chipIcon: 'schedule',
    };
  }

  if (item.markType === 'exit' && item.status === 'early_departure') {
    return {
      color: 'amber-1',
      textColor: 'amber-10',
      icon: 'logout',
      chipColor: 'amber-1',
      chipTextColor: 'amber-10',
      chipIcon: 'north_east',
    };
  }

  return {
    color: item.markType === 'entry' ? 'green-1' : 'purple-1',
    textColor: item.markType === 'entry' ? 'green-10' : 'deep-purple-10',
    icon: item.markType === 'entry' ? 'login' : 'logout',
    chipColor: 'grey-2',
    chipTextColor: 'grey-9',
    chipIcon: item.source === 'qr' ? 'qr_code_2' : 'edit_note',
  };
}

function getHistoryTitle(item: AttendanceHistoryItem): string {
  if (item.itemType === 'absence') {
    return item.status === 'justified_absence' ? 'Ausencia justificada' : 'Ausencia no justificada';
  }

  if (item.markType === 'entry' && item.status === 'late') return 'Entrada con tardanza';
  if (item.markType === 'exit' && item.status === 'early_departure') return 'Salida anticipada';
  return item.markType === 'entry' ? 'Entrada registrada' : 'Salida registrada';
}

function getHistoryChipLabel(item: AttendanceHistoryItem): string {
  if (item.itemType === 'absence') {
    return item.status === 'justified_absence' ? 'Justificada' : 'No justificada';
  }

  if (item.markType === 'entry' && item.status === 'late') return 'Tardanza';
  if (item.markType === 'exit' && item.status === 'early_departure') return 'Salida anticipada';
  return item.source === 'qr' ? 'QR' : 'Manual';
}

function formatTime(dateTime: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(dateTime));
}

function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(new Date(`${date}T00:00:00`));
}

function formatMonthRange(from: string, to: string): string {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);

  return `${new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Lima',
  }).format(start)} - ${new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Lima',
  }).format(end)}`;
}

function getMonthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

watch(
  () => historyPagination.page,
  (page) => {
    if (page > historyTotalPages.value) {
      historyPagination.page = historyTotalPages.value;
    }
  },
);

watch(activeSection, (section) => {
  syncStudentSectionQuery(section);

  if (section === 'history' && historyItems.value.length === 0 && !isLoadingHistory.value) {
    void loadHistory();
  }
});

watch(
  () => route.query.section,
  (section) => {
    const normalizedSection = normalizeStudentSection(section);

    if (normalizedSection !== activeSection.value) {
      activeSection.value = normalizedSection;
    }
  },
);

onMounted(async () => {
  activeSection.value = normalizeStudentSection(route.query.section);
  await Promise.all([loadStudentProfile(), loadTodayHistory(), loadHistory()]);
});
</script>
