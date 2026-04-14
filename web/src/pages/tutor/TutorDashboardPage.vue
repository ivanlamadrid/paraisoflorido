<template>
  <q-page class="tutor-page">
    <div class="ui-page-shell">
      <PageIntroCard
        eyebrow="Seguimiento tutorial"
        title="Secciones asignadas"
        description="Revisa asistencia, alertas y fichas de las secciones que tienes a cargo sin salir de tu ámbito tutorial."
      >
        <template #meta>
          <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="school">
            Tutor
          </q-chip>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="groups">
            {{ tutorAssignments.length }} secciones
          </q-chip>
          <q-chip
            v-if="selectedAssignment"
            class="ui-stat-chip"
            color="grey-2"
            text-color="grey-9"
            icon="event_note"
          >
            {{ selectedAssignment.schoolYear }}
          </q-chip>
        </template>

        <template #actions>
          <q-btn
            flat
            color="primary"
            icon="campaign"
            label="Comunicados"
            no-caps
            @click="router.push('/tutor/comunicados')"
          />
        </template>
      </PageIntroCard>

      <ResponsiveSectionNav
        v-model="activeSection"
        class="q-mt-lg"
        :items="sectionItems"
      />

      <StatusBanner
        v-if="pageFeedback"
        class="q-mt-lg"
        :variant="pageFeedback.type"
        :title="pageFeedback.title"
        :message="pageFeedback.message"
      />

      <section v-show="activeSection === 'classrooms'" class="role-section-view q-mt-lg">
        <q-card flat bordered class="admin-card">
          <q-card-section class="ui-card-body">
            <div class="row items-start justify-between q-col-gutter-lg">
              <div class="col-12 col-lg">
                <div class="ui-eyebrow">Aula activa</div>
                <div class="text-subtitle1 text-weight-bold q-mt-sm">
                  Revisión diaria de la sección tutorial
                </div>
                <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                  Cambia entre tus secciones asignadas para revisar el estado del día y abrir la
                  ficha de tus estudiantes.
                </p>
              </div>
              <div class="col-12 col-lg-auto">
                <q-btn
                  flat
                  color="primary"
                  icon="add_comment"
                  label="Nuevo comunicado"
                  no-caps
                  :disable="!selectedAssignment"
                  @click="router.push('/tutor/comunicados/nuevo')"
                />
              </div>
            </div>

            <div v-if="tutorAssignments.length > 0" class="row q-col-gutter-lg q-mt-lg">
              <div class="col-12 col-md-6 col-lg-4">
                <q-select
                  v-model="selectedAssignmentKey"
                  label="Sección asignada"
                  outlined
                  emit-value
                  map-options
                  :options="assignmentOptions"
                >
                  <template #prepend>
                    <q-icon name="groups" />
                  </template>
                </q-select>
              </div>
              <div class="col-12 col-md-6 col-lg-3">
                <q-input v-model="attendanceDate" type="date" label="Fecha" outlined>
                  <template #prepend>
                    <q-icon name="event" />
                  </template>
                </q-input>
              </div>
            </div>

            <div
              v-if="tutorAssignments.length === 0"
              class="student-operational-profile__empty-state q-mt-lg"
            >
              <q-icon name="groups" size="26px" color="grey-6" />
              <div class="text-subtitle2 text-weight-bold text-grey-8">
                Sin secciones asignadas
              </div>
              <p class="text-body2 text-grey-7 q-mb-none">
                Dirección debe asignarte al menos un aula para habilitar esta vista.
              </p>
            </div>

            <template v-else>
              <div class="classroom-stats-grid q-mt-lg">
                <StatSummaryCard
                  label="Estudiantes"
                  :value="dailySummary.totalStudents"
                  icon="groups"
                  tone="dark"
                  caption="Total cargado en la sección seleccionada."
                />
                <StatSummaryCard
                  label="Entradas pendientes"
                  :value="dailySummary.pendingEntries"
                  icon="login"
                  tone="info"
                  caption="Sin entrada registrada en la fecha elegida."
                />
                <StatSummaryCard
                  label="Salidas pendientes"
                  :value="dailySummary.pendingExits"
                  icon="logout"
                  tone="warning"
                  caption="Sin salida registrada todavía."
                />
                <StatSummaryCard
                  label="Alertas activas"
                  :value="alertsSummary.totalAlerts"
                  icon="notifications_active"
                  tone="primary"
                  caption="Señales de seguimiento para tus secciones."
                />
              </div>

              <StatusBanner
                v-if="classroomFeedback"
                class="q-mt-lg"
                :variant="classroomFeedback.type"
                :title="classroomFeedback.title"
                :message="classroomFeedback.message"
              />

              <div v-if="isLoadingClassroom" class="ui-loading-state q-py-xl">
                <q-spinner color="primary" size="32px" />
                <span class="text-body2 text-grey-7">Cargando sección asignada...</span>
              </div>

              <div
                v-else-if="dailyItems.length === 0"
                class="student-history-empty q-mt-lg"
              >
                <q-icon name="school" size="32px" color="grey-6" />
                <div class="text-subtitle2 text-weight-bold">Sin estudiantes para esta sección</div>
                <p class="text-body2 text-grey-7 q-mb-none">
                  Verifica la asignación tutorial o cambia a otra sección a cargo.
                </p>
              </div>

              <q-list
                v-else
                bordered
                separator
                class="rounded-borders q-mt-lg support-list"
              >
                <q-item v-for="item in dailyItems" :key="item.studentId" class="q-py-md">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">{{ item.fullName }}</q-item-label>
                    <q-item-label caption>{{ item.code }}</q-item-label>
                    <div class="row q-gutter-sm q-mt-sm">
                      <q-chip
                        v-if="item.absence"
                        dense
                        :color="getAttendanceDayStatusTone(item.absence.statusType).color"
                        :text-color="getAttendanceDayStatusTone(item.absence.statusType).textColor"
                      >
                        {{ getAttendanceDayStatusLabel(item.absence.statusType) }}
                      </q-chip>
                      <q-chip v-else dense color="grey-2" text-color="grey-8">
                        {{ getOperationalStatusLabel(item) }}
                      </q-chip>
                      <q-chip dense color="grey-2" text-color="grey-8" icon="login">
                        {{ item.entry ? formatMarkedTime(item.entry.markedAt) : 'Sin entrada' }}
                      </q-chip>
                      <q-chip dense color="grey-2" text-color="grey-8" icon="logout">
                        {{ item.exit ? formatMarkedTime(item.exit.markedAt) : 'Sin salida' }}
                      </q-chip>
                    </div>
                  </q-item-section>
                  <q-item-section side top>
                    <q-chip
                      dense
                      :color="item.isActive ? 'grey-2' : 'grey-3'"
                      :text-color="item.isActive ? 'grey-9' : 'grey-8'"
                    >
                      {{ item.isActive ? 'Activo' : 'Inactivo' }}
                    </q-chip>
                    <q-btn
                      flat
                      color="secondary"
                      class="support-action-btn q-mt-sm"
                      label="Ver ficha"
                      no-caps
                      @click="handleOpenStudent(item.studentId)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </template>
          </q-card-section>
        </q-card>
      </section>

      <section v-show="activeSection === 'students'" class="role-section-view q-mt-lg">
        <q-card flat bordered class="admin-card">
          <q-card-section class="ui-card-body">
            <div class="row items-start justify-between q-col-gutter-lg">
              <div class="col-12 col-lg">
                <div class="ui-eyebrow">Estudiantes asignados</div>
                <div class="text-subtitle1 text-weight-bold q-mt-sm">
                  Revisión rápida de tu sección activa
                </div>
                <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                  Filtra por nombre o código y abre la ficha del estudiante sin salir de tu ámbito tutorial.
                </p>
              </div>
              <div class="col-12 col-lg-auto">
                <q-input
                  v-model="studentSearch"
                  outlined
                  dense
                  label="Buscar estudiante"
                  maxlength="120"
                >
                  <template #prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
            </div>

            <div
              v-if="isLoadingClassroom"
              class="ui-loading-state q-py-xl q-mt-lg"
            >
              <q-spinner color="primary" size="32px" />
              <span class="text-body2 text-grey-7">Cargando estudiantes...</span>
            </div>

            <div
              v-else-if="filteredDailyItems.length === 0"
              class="student-history-empty q-mt-lg"
            >
              <q-icon name="groups" size="32px" color="grey-6" />
              <div class="text-subtitle2 text-weight-bold">Sin estudiantes para mostrar</div>
              <p class="text-body2 text-grey-7 q-mb-none">
                Ajusta la búsqueda o cambia de sección asignada para seguir revisando estudiantes.
              </p>
            </div>

            <q-list
              v-else
              bordered
              separator
              class="rounded-borders q-mt-lg support-list"
            >
              <q-item v-for="item in paginatedDailyItems" :key="item.studentId" class="q-py-md">
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ item.fullName }}</q-item-label>
                  <q-item-label caption>{{ item.code }}</q-item-label>
                  <div class="row q-gutter-sm q-mt-sm">
                    <q-chip dense color="grey-2" text-color="grey-8">
                      {{ getOperationalStatusLabel(item) }}
                    </q-chip>
                    <q-chip dense color="grey-2" text-color="grey-8" icon="login">
                      {{ item.entry ? formatMarkedTime(item.entry.markedAt) : 'Sin entrada' }}
                    </q-chip>
                    <q-chip dense color="grey-2" text-color="grey-8" icon="logout">
                      {{ item.exit ? formatMarkedTime(item.exit.markedAt) : 'Sin salida' }}
                    </q-chip>
                  </div>
                </q-item-section>
                <q-item-section side top>
                  <q-btn
                    flat
                    color="secondary"
                    class="support-action-btn"
                    label="Ver ficha"
                    no-caps
                    @click="handleOpenStudent(item.studentId)"
                  />
                </q-item-section>
              </q-item>
            </q-list>

            <div
              v-if="filteredDailyItems.length > rowsPerPage"
              class="row justify-center q-mt-lg"
            >
              <q-pagination
                v-model="studentsPage"
                color="primary"
                :max="Math.max(1, Math.ceil(filteredDailyItems.length / rowsPerPage))"
                max-pages="7"
                boundary-links
              />
            </div>
          </q-card-section>
        </q-card>
      </section>

      <section v-show="activeSection === 'followUps'" class="role-section-view q-mt-lg">
        <StudentFollowUpOverviewCard
          eyebrow="Seguimiento tutorial"
          title="Incidencias y observaciones de tu sección"
          description="Revisa el historial tutorial e institucional dentro de tus secciones asignadas y abre la ficha del estudiante cuando necesites intervenir."
          :loading="isLoadingFollowUpsOverview"
          :feedback="followUpsOverviewFeedback"
          :response="followUpsOverview"
          :search="followUpsSearch"
          :record-type="followUpsRecordType"
          :status="followUpsStatus"
          :grade="selectedAssignment?.grade ?? null"
          :section="selectedAssignment?.section ?? null"
          :shift="selectedAssignment?.shift ?? null"
          :grade-options="tutorGradeOptions"
          :section-options="tutorSectionOptions"
          :shift-options="
            selectedAssignment
              ? [
                  {
                    label: getShiftLabel(selectedAssignment.shift),
                    value: selectedAssignment.shift,
                  },
                ]
              : []
          "
          :is-mobile="$q.screen.lt.md"
          @submit="loadFollowUpsOverview"
          @reset="
            followUpsSearch = '';
            followUpsRecordType = null;
            followUpsStatus = null;
            followUpsOverview.page = 1;
            loadFollowUpsOverview();
          "
          @open-student="handleOpenStudent"
          @update:search="followUpsSearch = $event"
          @update:record-type="followUpsRecordType = $event"
          @update:status="followUpsStatus = $event"
          @update:page="followUpsOverview.page = $event"
        />
      </section>

      <section v-show="activeSection === 'alerts'" class="role-section-view q-mt-lg">
        <q-card flat bordered class="admin-card">
          <q-card-section class="ui-card-body">
            <div class="ui-eyebrow">Alertas tutoriales</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              Seguimiento básico de tus secciones
            </div>
            <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
              Identifica ausencias consecutivas, registros incompletos o tardanzas reiteradas solo
              dentro de tus aulas asignadas.
            </p>

            <StatusBanner
              v-if="alertsFeedback"
              class="q-mt-lg"
              :variant="alertsFeedback.type"
              :title="alertsFeedback.title"
              :message="alertsFeedback.message"
            />

            <div v-if="isLoadingAlerts" class="ui-loading-state q-py-xl">
              <q-spinner color="primary" size="32px" />
              <span class="text-body2 text-grey-7">Cargando alertas...</span>
            </div>

            <div
              v-else-if="alerts.length === 0"
              class="student-history-empty q-mt-lg"
            >
              <q-icon name="notifications_none" size="32px" color="grey-6" />
              <div class="text-subtitle2 text-weight-bold">Sin alertas activas</div>
              <p class="text-body2 text-grey-7 q-mb-none">
                No hay señales de seguimiento pendientes para la sección seleccionada.
              </p>
            </div>

            <q-list
              v-else
              bordered
              separator
              class="rounded-borders q-mt-lg support-list"
            >
              <q-item v-for="alert in alerts" :key="`${alert.alertType}-${alert.studentId}`" class="q-py-md">
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ alert.fullName }}</q-item-label>
                  <q-item-label caption>
                    {{ alert.grade }} {{ alert.section }} · {{ getShiftLabel(alert.shift) }}
                  </q-item-label>
                  <div class="row q-gutter-sm q-mt-sm">
                    <q-chip
                      dense
                      :color="getAttendanceAlertTone(alert.alertType).color"
                      :text-color="getAttendanceAlertTone(alert.alertType).textColor"
                      :icon="getAttendanceAlertTone(alert.alertType).icon"
                    >
                      {{ getAttendanceAlertLabel(alert.alertType) }}
                    </q-chip>
                    <q-chip
                      v-for="date in alert.recentDates"
                      :key="`${alert.studentId}-${date}`"
                      dense
                      color="grey-2"
                      text-color="grey-8"
                      icon="event"
                    >
                      {{ formatAlertDate(date) }}
                    </q-chip>
                  </div>
                  <q-item-label class="q-mt-sm text-body2">
                    {{ alert.description }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-btn
                    flat
                    color="secondary"
                    class="support-action-btn"
                    label="Ver ficha"
                    no-caps
                    @click="handleOpenStudent(alert.studentId)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </section>

      <section v-show="activeSection === 'account'" class="role-section-view q-mt-lg">
        <PasswordChangeCard
          :feedback="passwordFeedback"
          :loading="isChangingPassword"
          title="Cambiar contraseña"
          description="Actualiza tu acceso tutorial con tu contraseña actual."
          submit-label="Guardar contraseña"
          @submit="handleChangeOwnPassword"
        />

        <q-card flat bordered class="admin-card q-mt-lg">
          <q-card-section class="ui-card-body">
            <div class="ui-eyebrow">Asignaciones activas</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              Secciones a tu cargo
            </div>

            <q-list
              v-if="tutorAssignments.length > 0"
              bordered
              separator
              class="rounded-borders q-mt-lg support-list"
            >
              <q-item v-for="assignment in tutorAssignments" :key="getAssignmentKey(assignment)">
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ assignment.grade }} {{ assignment.section }} · {{ getShiftLabel(assignment.shift) }}
                  </q-item-label>
                  <q-item-label caption>Año escolar {{ assignment.schoolYear }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>

            <div
              v-else
              class="student-operational-profile__empty-state q-mt-lg"
            >
              <q-icon name="groups" size="24px" color="grey-6" />
              <div class="text-subtitle2 text-weight-bold text-grey-8">
                Sin asignaciones activas
              </div>
              <p class="text-body2 text-grey-7 q-mb-none">
                Dirección debe registrar tus secciones para habilitar el trabajo tutorial.
              </p>
            </div>
          </q-card-section>
        </q-card>
      </section>
    </div>

    <q-dialog
      v-model="isStudentDialogOpen"
      :maximized="isStudentDialogMaximized"
      :position="isStudentDialogSideSheet ? 'right' : 'standard'"
      :transition-show="isStudentDialogSideSheet ? 'slide-left' : 'scale'"
      :transition-hide="isStudentDialogSideSheet ? 'slide-right' : 'scale'"
    >
      <q-card
        class="admin-card student-profile-dialog-card student-profile-dialog-card--institutional"
        :class="{ 'student-profile-dialog-card--side': isStudentDialogSideSheet }"
      >
        <q-card-section class="ui-card-body">
          <div class="row items-start justify-between q-col-gutter-md">
            <div class="col-12 col-md">
              <div class="ui-eyebrow">Ficha del estudiante</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                Consulta rápida para seguimiento tutorial
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                Revisa matrícula, alertas, asistencia reciente y contacto básico del estudiante.
              </p>
            </div>
            <div class="col-12 col-md-auto">
              <q-btn flat round dense icon="close" @click="isStudentDialogOpen = false" />
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="student-profile-dialog-card__body">
          <StatusBanner
            v-if="studentFeedback"
            :variant="studentFeedback.type"
            :title="studentFeedback.title"
            :message="studentFeedback.message"
          />

          <div v-if="isLoadingStudent" class="ui-loading-state q-py-xl">
            <q-spinner color="primary" size="30px" />
            <span class="text-body2 text-grey-7">Cargando ficha del estudiante...</span>
          </div>

          <template v-else-if="selectedStudentDetail">
            <q-tabs
              v-model="studentDialogTab"
              class="support-student-card__tabs"
              active-color="primary"
              indicator-color="primary"
              align="left"
              no-caps
              inline-label
              mobile-arrows
            >
              <q-tab name="overview" icon="dashboard" label="Resumen" />
              <q-tab name="followUps" icon="flag" label="Seguimiento" />
            </q-tabs>

            <q-separator class="q-my-lg" />

            <q-tab-panels v-model="studentDialogTab" animated class="bg-transparent">
              <q-tab-panel name="overview" class="q-pa-none">
                <StudentOperationalProfilePanel :student="selectedStudentDetail" />
              </q-tab-panel>

              <q-tab-panel name="followUps" class="q-pa-none">
                <StudentFollowUpManager
                  :follow-ups="selectedStudentDetail.followUps"
                  viewer-role="tutor"
                  :viewer-user-id="sessionStore.user?.id ?? null"
                  :feedback="studentFollowUpFeedback"
                  :save-loading="isSavingStudentFollowUp"
                  @create="handleCreateStudentFollowUp"
                  @update="handleUpdateStudentFollowUp"
                />
              </q-tab-panel>
            </q-tab-panels>
          </template>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import PasswordChangeCard from 'components/auth/PasswordChangeCard.vue';
import ResponsiveSectionNav, { type SectionNavItem } from 'components/navigation/ResponsiveSectionNav.vue';
import StudentFollowUpOverviewCard from 'components/student/StudentFollowUpOverviewCard.vue';
import StudentFollowUpManager from 'components/student/StudentFollowUpManager.vue';
import StudentOperationalProfilePanel from 'components/student/StudentOperationalProfilePanel.vue';
import PageIntroCard from 'components/ui/PageIntroCard.vue';
import StatSummaryCard from 'components/ui/StatSummaryCard.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import { getAttendanceAlerts, getDailyAttendance } from 'src/services/api/attendance-api';
import { getApiErrorMessage } from 'src/services/api/api-errors';
import {
  createStudentFollowUp,
  getStudentFollowUpsOverview,
  getStudentInstitutionalProfile,
  updateStudentFollowUp,
} from 'src/services/api/students-api';
import { getMyTutorAssignments } from 'src/services/api/users-api';
import { useInstitutionStore } from 'src/stores/institution-store';
import { useSessionStore } from 'src/stores/session-store';
import type {
  AttendanceAlert,
  AttendanceAlertsSummary,
  DailyAttendanceItem,
  DailyAttendanceSummary,
  StudentShift,
} from 'src/types/attendance';
import type { ChangePasswordPayload } from 'src/types/session';
import type {
  CreateStudentFollowUpPayload,
  StudentDetail,
  StudentFollowUpOverviewResponse,
  StudentFollowUpRecordType,
  StudentFollowUpStatus,
  UpdateStudentFollowUpPayload,
} from 'src/types/students';
import type { TutorAssignmentSummary } from 'src/types/users';
import { getAttendanceAlertLabel, getAttendanceAlertTone } from 'src/utils/attendance-alerts';
import { getAttendanceDayStatusLabel, getAttendanceDayStatusTone } from 'src/utils/attendance-status';

type TutorSection = 'classrooms' | 'students' | 'followUps' | 'alerts' | 'account';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

const defaultSection: TutorSection = 'classrooms';
const sectionItems: SectionNavItem[] = [
  { value: 'classrooms', label: 'Resumen', icon: 'dashboard' },
  { value: 'students', label: 'Estudiantes', icon: 'groups' },
  { value: 'followUps', label: 'Seguimiento', icon: 'fact_check' },
  { value: 'alerts', label: 'Alertas', icon: 'notifications_active' },
  { value: 'account', label: 'Cuenta', icon: 'account_circle' },
];

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const institutionStore = useInstitutionStore();
const sessionStore = useSessionStore();

const activeSection = ref<TutorSection>(defaultSection);
const tutorAssignments = ref<TutorAssignmentSummary[]>([]);
const selectedAssignmentKey = ref('');
const attendanceDate = ref(getTodayInLima());
const studentSearch = ref('');
const studentsPage = ref(1);
const dailyItems = ref<DailyAttendanceItem[]>([]);
const dailySummary = ref<DailyAttendanceSummary>(createEmptyDailySummary());
const alerts = ref<AttendanceAlert[]>([]);
const alertsSummary = ref<AttendanceAlertsSummary>(createEmptyAlertsSummary());
const followUpsOverview = ref<StudentFollowUpOverviewResponse>({
  items: [],
  total: 0,
  page: 1,
  limit: 8,
});
const followUpsSearch = ref('');
const followUpsRecordType = ref<StudentFollowUpRecordType | null>(null);
const followUpsStatus = ref<StudentFollowUpStatus | null>(null);
const isLoadingClassroom = ref(false);
const isLoadingAlerts = ref(false);
const isLoadingFollowUpsOverview = ref(false);
const isChangingPassword = ref(false);
const isStudentDialogOpen = ref(false);
const studentDialogTab = ref<'overview' | 'followUps'>('overview');
const isLoadingStudent = ref(false);
const isSavingStudentFollowUp = ref(false);
const selectedStudentDetail = ref<StudentDetail | null>(null);
const pageFeedback = ref<FeedbackState | null>(null);
const classroomFeedback = ref<FeedbackState | null>(null);
const alertsFeedback = ref<FeedbackState | null>(null);
const followUpsOverviewFeedback = ref<FeedbackState | null>(null);
const passwordFeedback = ref<FeedbackState | null>(null);
const studentFeedback = ref<FeedbackState | null>(null);
const studentFollowUpFeedback = ref<FeedbackState | null>(null);

const isStudentDialogSideSheet = computed(() => $q.screen.gt.md);
const isStudentDialogMaximized = computed(() => $q.screen.width < 768);
const selectedAssignment = computed(
  () =>
    tutorAssignments.value.find((assignment) => getAssignmentKey(assignment) === selectedAssignmentKey.value) ??
    null,
);
const assignmentOptions = computed(() =>
  tutorAssignments.value.map((assignment) => ({
    label: `${assignment.grade} ${assignment.section} · ${getShiftLabel(assignment.shift)} · ${assignment.schoolYear}`,
    value: getAssignmentKey(assignment),
  })),
);
const rowsPerPage = 8;
const filteredDailyItems = computed(() => {
  const normalizedSearch = studentSearch.value.trim().toLowerCase();

  if (!normalizedSearch) {
    return dailyItems.value;
  }

  return dailyItems.value.filter((item) =>
    [item.fullName, item.code].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    ),
  );
});
const paginatedDailyItems = computed(() => {
  const start = (studentsPage.value - 1) * rowsPerPage;
  return filteredDailyItems.value.slice(start, start + rowsPerPage);
});
const tutorGradeOptions = computed(() =>
  Array.from(new Set(tutorAssignments.value.map((assignment) => assignment.grade)))
    .sort((left, right) => left - right)
    .map((grade) => ({
      label: `${grade} grado`,
      value: grade,
    })),
);
const tutorSectionOptions = computed(() =>
  Array.from(
    new Set(
      tutorAssignments.value
        .filter((assignment) =>
          selectedAssignment.value
            ? assignment.grade === selectedAssignment.value.grade
            : true,
        )
        .map((assignment) => assignment.section),
    ),
  ).map((section) => ({
    label: section,
    value: section,
  })),
);

function createEmptyDailySummary(): DailyAttendanceSummary {
  return {
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    entriesRegistered: 0,
    exitsRegistered: 0,
    lateEntries: 0,
    earlyDepartures: 0,
    justifiedAbsences: 0,
    unjustifiedAbsences: 0,
    absences: 0,
    pendingEntries: 0,
    pendingExits: 0,
    incompleteRecords: 0,
  };
}

function createEmptyAlertsSummary(): AttendanceAlertsSummary {
  return {
    totalAlerts: 0,
    studentsWithAlerts: 0,
    consecutiveAbsenceAlerts: 0,
    repeatedIncompleteRecordAlerts: 0,
    repeatedLateEntryAlerts: 0,
  };
}

function getTodayInLima(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getShiftLabel(shift: StudentShift): string {
  return shift === 'morning' ? 'Turno mañana' : 'Turno tarde';
}

function getAssignmentKey(assignment: TutorAssignmentSummary): string {
  return [assignment.schoolYear, assignment.grade, assignment.section, assignment.shift].join(':');
}

function getOperationalStatusLabel(item: DailyAttendanceItem): string {
  if (item.absence) {
    return getAttendanceDayStatusLabel(item.absence.statusType);
  }

  if (item.entry && item.exit) {
    return 'Completo';
  }

  if (item.entry) {
    return 'Pendiente de salida';
  }

  if (item.exit) {
    return 'Pendiente de entrada';
  }

  return 'Pendiente';
}

function formatMarkedTime(markedAt: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(new Date(markedAt));
}

function formatAlertDate(date: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(`${date}T00:00:00-05:00`));
}

function normalizeTutorSection(value: unknown): TutorSection {
  if (value === 'students') {
    return 'students';
  }

  if (value === 'followUps') {
    return 'followUps';
  }

  if (value === 'alerts') {
    return 'alerts';
  }

  if (value === 'account') {
    return 'account';
  }

  return defaultSection;
}

function syncTutorSectionQuery(section: TutorSection): void {
  const nextQuery = { ...route.query };

  if (section === defaultSection) {
    delete nextQuery.section;
  } else {
    nextQuery.section = section;
  }

  void router.replace({ query: nextQuery });
}

async function loadTutorAssignments(): Promise<void> {
  tutorAssignments.value = await getMyTutorAssignments();

  if (tutorAssignments.value.length === 0) {
    selectedAssignmentKey.value = '';
    dailyItems.value = [];
    dailySummary.value = createEmptyDailySummary();
    alerts.value = [];
    alertsSummary.value = createEmptyAlertsSummary();
    pageFeedback.value = {
      type: 'warning',
      title: 'Sin secciones asignadas',
      message: 'Dirección debe asignarte una o más secciones antes de usar el panel tutorial.',
    };
    return;
  }

  if (
    !selectedAssignmentKey.value ||
    !tutorAssignments.value.some((assignment) => getAssignmentKey(assignment) === selectedAssignmentKey.value)
  ) {
    const firstAssignment = tutorAssignments.value[0];

    if (firstAssignment) {
      selectedAssignmentKey.value = getAssignmentKey(firstAssignment);
    }
  }
}

async function loadDailySection(): Promise<void> {
  if (!selectedAssignment.value) {
    dailyItems.value = [];
    dailySummary.value = createEmptyDailySummary();
    return;
  }

  classroomFeedback.value = null;
  isLoadingClassroom.value = true;

  try {
    const response = await getDailyAttendance({
      attendanceDate: attendanceDate.value,
      schoolYear: selectedAssignment.value.schoolYear,
      grade: selectedAssignment.value.grade,
      section: selectedAssignment.value.section,
      shift: selectedAssignment.value.shift,
    });
    dailyItems.value = response.items;
    dailySummary.value = response.summary;
  } catch (error) {
    dailyItems.value = [];
    dailySummary.value = createEmptyDailySummary();
    classroomFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar la sección',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingClassroom.value = false;
  }
}

async function loadSectionAlerts(): Promise<void> {
  if (!selectedAssignment.value) {
    alerts.value = [];
    alertsSummary.value = createEmptyAlertsSummary();
    return;
  }

  alertsFeedback.value = null;
  isLoadingAlerts.value = true;

  try {
    const response = await getAttendanceAlerts({
      schoolYear: selectedAssignment.value.schoolYear,
      grade: selectedAssignment.value.grade,
      section: selectedAssignment.value.section,
      shift: selectedAssignment.value.shift,
      limit: 50,
    });
    alerts.value = response.items;
    alertsSummary.value = response.summary;
  } catch (error) {
    alerts.value = [];
    alertsSummary.value = createEmptyAlertsSummary();
    alertsFeedback.value = {
      type: 'error',
      title: 'No se pudieron cargar las alertas',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingAlerts.value = false;
  }
}

async function loadFollowUpsOverview(): Promise<void> {
  if (!selectedAssignment.value) {
    followUpsOverview.value = {
      items: [],
      total: 0,
      page: 1,
      limit: 8,
    };
    return;
  }

  followUpsOverviewFeedback.value = null;
  isLoadingFollowUpsOverview.value = true;

  try {
    const query: {
      page: number;
      limit: number;
      schoolYear: number;
      grade: number;
      section: string;
      shift: StudentShift;
      search?: string;
      recordType?: StudentFollowUpRecordType;
      status?: StudentFollowUpStatus;
    } = {
      page: followUpsOverview.value.page,
      limit: followUpsOverview.value.limit,
      schoolYear: selectedAssignment.value.schoolYear,
      grade: selectedAssignment.value.grade,
      section: selectedAssignment.value.section,
      shift: selectedAssignment.value.shift,
    };

    if (followUpsSearch.value.trim()) {
      query.search = followUpsSearch.value.trim();
    }

    if (followUpsRecordType.value) {
      query.recordType = followUpsRecordType.value;
    }

    if (followUpsStatus.value) {
      query.status = followUpsStatus.value;
    }

    followUpsOverview.value = await getStudentFollowUpsOverview(query);
  } catch (error) {
    followUpsOverview.value = {
      items: [],
      total: 0,
      page: followUpsOverview.value.page,
      limit: 8,
    };
    followUpsOverviewFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar el seguimiento',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingFollowUpsOverview.value = false;
  }
}

async function handleOpenStudent(studentId: string): Promise<void> {
  studentFeedback.value = null;
  studentFollowUpFeedback.value = null;
  selectedStudentDetail.value = null;
  studentDialogTab.value = 'overview';
  isStudentDialogOpen.value = true;
  isLoadingStudent.value = true;

  try {
    selectedStudentDetail.value = await getStudentInstitutionalProfile(studentId);
  } catch (error) {
    studentFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar la ficha del estudiante',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingStudent.value = false;
  }
}

async function handleCreateStudentFollowUp(
  payload: CreateStudentFollowUpPayload,
): Promise<void> {
  if (!selectedStudentDetail.value) {
    return;
  }

  studentFollowUpFeedback.value = null;
  isSavingStudentFollowUp.value = true;

  try {
    await createStudentFollowUp(selectedStudentDetail.value.id, payload);
    selectedStudentDetail.value = await getStudentInstitutionalProfile(selectedStudentDetail.value.id);
    studentFollowUpFeedback.value = {
      type: 'success',
      title: payload.recordType === 'incident' ? 'Incidencia registrada' : 'Observación registrada',
      message: 'El seguimiento quedó guardado para este estudiante.',
    };
  } catch (error) {
    studentFollowUpFeedback.value = {
      type: 'error',
      title: 'No se pudo registrar el seguimiento',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSavingStudentFollowUp.value = false;
  }
}

async function handleUpdateStudentFollowUp(
  followUpId: string,
  payload: UpdateStudentFollowUpPayload,
): Promise<void> {
  if (!selectedStudentDetail.value) {
    return;
  }

  studentFollowUpFeedback.value = null;
  isSavingStudentFollowUp.value = true;

  try {
    await updateStudentFollowUp(selectedStudentDetail.value.id, followUpId, payload);
    selectedStudentDetail.value = await getStudentInstitutionalProfile(selectedStudentDetail.value.id);
    studentFollowUpFeedback.value = {
      type: 'success',
      title: 'Seguimiento actualizado',
      message: 'El registro tutorial fue actualizado correctamente.',
    };
  } catch (error) {
    studentFollowUpFeedback.value = {
      type: 'error',
      title: 'No se pudo actualizar el seguimiento',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSavingStudentFollowUp.value = false;
  }
}

async function handleChangeOwnPassword(payload: ChangePasswordPayload): Promise<void> {
  passwordFeedback.value = null;
  isChangingPassword.value = true;

  try {
    await sessionStore.changeOwnPassword(payload);
    passwordFeedback.value = {
      type: 'success',
      title: 'Contraseña actualizada',
      message: 'Tu contraseña tutorial fue actualizada correctamente.',
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

watch(activeSection, (section) => {
  syncTutorSectionQuery(section);
});

watch(
  () => route.query.section,
  (section) => {
    const normalized = normalizeTutorSection(section);

    if (normalized !== activeSection.value) {
      activeSection.value = normalized;
    }
  },
);

watch(
  [selectedAssignmentKey, attendanceDate],
  () => {
    if (!selectedAssignment.value) {
      return;
    }

    void Promise.all([loadDailySection(), loadSectionAlerts(), loadFollowUpsOverview()]);
  },
);

watch(studentSearch, () => {
  studentsPage.value = 1;
});

watch(selectedAssignmentKey, () => {
  studentsPage.value = 1;
  followUpsOverview.value.page = 1;
});

watch(
  () => [followUpsSearch.value, followUpsRecordType.value, followUpsStatus.value],
  () => {
    followUpsOverview.value.page = 1;
  },
);

watch(
  () => followUpsOverview.value.page,
  () => {
    if (!selectedAssignment.value) {
      return;
    }

    void loadFollowUpsOverview();
  },
);

onMounted(async () => {
  activeSection.value = normalizeTutorSection(route.query.section);

  try {
    await institutionStore.loadSettings();
    await loadTutorAssignments();
  } catch (error) {
    pageFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar el panel tutorial',
      message: getApiErrorMessage(error),
    };
  }
});
</script>
