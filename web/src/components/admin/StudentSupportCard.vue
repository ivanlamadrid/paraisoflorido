<template>
  <div v-if="student" class="support-student-card">
    <header class="support-student-card__header">
      <div>
        <div class="ui-eyebrow">Ficha administrativa</div>
        <div class="support-student-card__title">{{ student.fullName }}</div>
        <div class="support-student-card__caption">
          {{ student.code }}<span v-if="student.document"> · {{ student.document }}</span> · Año {{ activeSchoolYear }}
        </div>
      </div>
      <div class="support-student-card__chips">
        <q-chip class="ui-stat-chip" :color="student.isActive ? 'red-1' : 'grey-3'" :text-color="student.isActive ? 'red-10' : 'grey-8'">
          {{ student.isActive ? 'Activo' : 'Inactivo' }}
        </q-chip>
        <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="school">{{ classroomLabel }}</q-chip>
      </div>
    </header>

    <StatusBanner v-if="feedback" class="q-mt-lg" :variant="feedback.type" :title="feedback.title" :message="feedback.message" />

    <q-tabs v-model="activeTab" class="support-student-card__tabs q-mt-lg" active-color="primary" indicator-color="primary" align="left" no-caps inline-label mobile-arrows>
      <q-tab name="summary" icon="dashboard" label="Resumen" />
      <q-tab name="management" icon="edit_note" label="Gestión" />
      <q-tab name="contacts" icon="groups" label="Contactos" />
      <q-tab name="attendance" icon="fact_check" label="Asistencia" />
      <q-tab name="followUps" icon="flag" label="Seguimiento" />
      <q-tab name="history" icon="history" label="Historial" />
    </q-tabs>

    <q-separator class="q-my-lg" />

    <q-tab-panels v-model="activeTab" animated keep-alive class="bg-transparent">
      <q-tab-panel name="summary" class="q-pa-none">
        <div class="support-student-card__grid">
          <q-card flat bordered class="support-student-card__panel">
            <q-card-section>
              <div class="ui-eyebrow">Resumen institucional</div>
              <div class="support-student-card__stats q-mt-md">
                <div v-for="item in summaryItems" :key="item.label" class="support-student-card__stat">
                  <span class="support-student-card__label">{{ item.label }}</span>
                  <span class="support-student-card__value">{{ item.value }}</span>
                </div>
              </div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="support-student-card__panel">
            <q-card-section>
              <div class="ui-eyebrow">Asistencia reciente</div>
              <div class="support-student-card__stats q-mt-md">
                <div v-for="item in attendanceSummaryItems" :key="item.label" class="support-student-card__stat">
                  <span class="support-student-card__label">{{ item.label }}</span>
                  <span class="support-student-card__value">{{ item.value }}</span>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>

      <q-tab-panel name="management" class="q-pa-none">
        <div class="support-student-card__grid">
          <q-card flat bordered class="support-student-card__panel">
            <q-card-section>
              <div class="ui-eyebrow">Datos y matrícula</div>
              <q-form class="q-gutter-md q-mt-lg" @submit.prevent="handleSave">
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-lg-6"><q-input v-model="editForm.firstName" label="Nombres" outlined maxlength="80" /></div>
                  <div class="col-12 col-lg-6"><q-input v-model="editForm.lastName" label="Apellidos" outlined maxlength="120" /></div>
                </div>
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-lg-4"><q-input v-model="editForm.document" label="Documento" outlined maxlength="20" /></div>
                  <div class="col-12 col-lg-4"><q-select v-model="editForm.grade" label="Grado" outlined emit-value map-options :options="gradeOptions" @update:model-value="handleGradeChange" /></div>
                  <div class="col-12 col-lg-4"><q-select v-model="editForm.section" label="Sección" outlined emit-value map-options :options="sectionOptions" /></div>
                </div>
                <div class="row q-col-gutter-md items-center">
                  <div class="col-12 col-lg-6"><q-select v-model="editForm.shift" label="Turno" outlined emit-value map-options :options="shiftOptions" /></div>
                  <div class="col-12 col-lg-6"><q-toggle v-model="editForm.isActive" color="primary" keep-color label="Estudiante activo en el sistema" /></div>
                </div>
                <div class="row items-center justify-between q-gutter-sm">
                  <div class="text-caption text-grey-7">La corrección solo afecta el año {{ activeSchoolYear }}.</div>
                  <q-btn color="primary" label="Guardar corrección" no-caps type="submit" :loading="saveLoading" />
                </div>
              </q-form>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="support-student-card__panel">
            <q-card-section>
              <div class="ui-eyebrow">Situación y acceso</div>
              <StatusBanner v-if="situationFeedback" class="q-mt-lg" :variant="situationFeedback.type" :title="situationFeedback.title" :message="situationFeedback.message" />
              <q-form class="q-gutter-md q-mt-lg" @submit.prevent="handleSaveSituation">
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-lg-6"><q-select v-model="situationForm.status" label="Estado" outlined emit-value map-options :options="statusOptions" /></div>
                  <div class="col-12 col-lg-6"><q-select v-model="situationForm.movementType" label="Movimiento" outlined emit-value map-options :options="movementOptions" /></div>
                </div>
                <q-input v-model="situationForm.administrativeDetail" type="textarea" autogrow outlined maxlength="255" label="Motivo o detalle administrativo" />
                <q-btn color="primary" label="Actualizar situación" no-caps type="submit" :loading="situationSaveLoading" />
              </q-form>

              <q-separator class="q-my-lg" />

              <StatusBanner v-if="consentFeedback" class="q-mb-lg" :variant="consentFeedback.type" :title="consentFeedback.title" :message="consentFeedback.message" />
              <q-form class="q-gutter-md" @submit.prevent="handleSaveConsent">
                <q-select v-model="consentForm.imageConsentGranted" label="Consentimiento de imagen" outlined emit-value map-options :options="consentOptions" />
                <q-input v-model="consentForm.observation" type="textarea" autogrow outlined maxlength="255" label="Observación" />
                <q-btn color="primary" label="Guardar consentimiento" no-caps type="submit" :loading="consentSaveLoading" />
              </q-form>

              <q-separator class="q-my-lg" />

              <q-form class="q-gutter-md" @submit.prevent="handleReset">
                <div class="row q-col-gutter-md">
                  <div class="col-12"><q-input v-model="resetForm.reason" label="Motivo del restablecimiento" outlined maxlength="255" :rules="[(value) => Boolean(value?.trim()) || 'Ingresa el motivo del restablecimiento']" /></div>
                  <div class="col-12 col-lg-6"><q-input v-model="resetForm.newPassword" label="Contraseña temporal" outlined maxlength="128" :type="showResetPassword ? 'text' : 'password'" :rules="[(value) => Boolean(value) || 'Ingresa la contraseña temporal', (value) => value.length >= 8 || 'La contraseña temporal debe tener al menos 8 caracteres']"><template #append><q-btn flat round dense type="button" :icon="showResetPassword ? 'visibility_off' : 'visibility'" @click="showResetPassword = !showResetPassword" /></template></q-input></div>
                  <div class="col-12 col-lg-6"><q-input v-model="resetForm.confirmPassword" label="Confirmar contraseña" outlined maxlength="128" :type="showResetConfirmPassword ? 'text' : 'password'" :rules="[(value) => Boolean(value) || 'Confirma la contraseña temporal', (value) => value === resetForm.newPassword || 'Las contraseñas no coinciden']"><template #append><q-btn flat round dense type="button" :icon="showResetConfirmPassword ? 'visibility_off' : 'visibility'" @click="showResetConfirmPassword = !showResetConfirmPassword" /></template></q-input></div>
                </div>
                <q-btn color="secondary" label="Restablecer contraseña" no-caps type="submit" :loading="resetLoading" />
              </q-form>
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>

      <q-tab-panel name="contacts" class="q-pa-none">
        <StudentContactsManager :contacts="student.contacts" :feedback="contactsFeedback" :save-loading="contactsSaveLoading" :deleting-contact-id="deletingContactId" @create="handleCreateContact" @update="handleUpdateContact" @remove="handleRemoveContact" />
      </q-tab-panel>

      <q-tab-panel name="attendance" class="q-pa-none">
        <q-card flat bordered class="support-student-card__panel">
          <q-card-section>
            <div class="ui-eyebrow">Estado del día</div>
            <div class="support-student-card__stats q-mt-md">
              <div v-for="item in todayItems" :key="item.label" class="support-student-card__stat">
                <span class="support-student-card__label">{{ item.label }}</span>
                <span class="support-student-card__value">{{ item.value }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="support-student-card__panel q-mt-lg">
          <q-card-section>
            <div class="ui-eyebrow">Actividad reciente</div>
            <q-list v-if="recentAttendanceItems.length > 0" bordered separator class="rounded-borders q-mt-lg support-list">
              <q-item v-for="item in recentAttendanceItems" :key="`${item.itemType}-${item.attendanceDate}-${item.markedAt ?? item.status}`" class="q-py-md">
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ getRecentItemTitle(item) }}</q-item-label>
                  <q-item-label caption>{{ formatDate(item.attendanceDate) }}</q-item-label>
                  <q-item-label class="q-mt-sm text-body2">{{ getRecentItemStatusLabel(item) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <div v-else class="support-student-card__empty-state q-mt-md">
              <q-icon name="history" size="24px" color="grey-6" />
              <div class="text-subtitle2 text-weight-bold text-grey-8">Sin actividad reciente</div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="followUps" class="q-pa-none">
        <StudentFollowUpManager :follow-ups="student.followUps" :viewer-role="viewerRole" :feedback="followUpsFeedback" :save-loading="followUpsSaveLoading" @create="handleCreateFollowUp" @update="handleUpdateFollowUp" />
      </q-tab-panel>

      <q-tab-panel name="history" class="q-pa-none">
        <div class="support-student-card__grid">
          <q-card flat bordered class="support-student-card__panel">
            <q-card-section>
              <div class="ui-eyebrow">Matrículas registradas</div>
              <div class="row q-gutter-sm q-mt-md">
                <q-chip v-for="enrollment in student.enrollments" :key="enrollment.id" class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="event_note">
                  {{ enrollment.schoolYear }} · {{ enrollment.grade }} {{ enrollment.section }} · {{ enrollment.shift === 'morning' ? 'Mañana' : 'Tarde' }} · {{ getEnrollmentStatusLabel(enrollment.status) }}
                </q-chip>
              </div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="support-student-card__panel">
            <q-card-section>
              <div class="ui-eyebrow">Auditoría reciente</div>
              <q-list v-if="student.changeLogs.length > 0" bordered separator class="rounded-borders q-mt-lg support-list">
                <q-item v-for="changeLog in student.changeLogs" :key="changeLog.id" class="q-py-md">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">{{ getChangeTypeLabel(changeLog.changeType) }}</q-item-label>
                    <q-item-label caption>{{ changeLog.changedByDisplayName }} · {{ formatDateTime(changeLog.changedAt) }}</q-item-label>
                    <q-item-label class="q-mt-sm text-body2">{{ summarizeChangeLog(changeLog) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-else class="support-student-card__empty-state q-mt-md">
                <q-icon name="history" size="24px" color="grey-6" />
                <div class="text-subtitle2 text-weight-bold text-grey-8">Sin auditoría reciente</div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import StudentContactsManager from 'components/admin/StudentContactsManager.vue';
import StudentFollowUpManager from 'components/student/StudentFollowUpManager.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import type { AttendanceDayStatusType, AttendanceHistoryItem, AttendanceRecordStatus, StudentShift } from 'src/types/attendance';
import type { UserRole } from 'src/types/session';
import type { CreateStudentContactPayload, CreateStudentFollowUpPayload, StudentChangeLog, StudentContact, StudentDetail, StudentEnrollmentMovement, StudentEnrollmentStatus, UpdateStudentConsentPayload, UpdateStudentContactPayload, UpdateStudentFollowUpPayload, UpdateStudentPayload, UpdateStudentSituationPayload } from 'src/types/students';
import type { ResetUserPasswordPayload } from 'src/types/users';
import { getAttendanceDayStatusLabel, getAttendanceRecordStatusLabel } from 'src/utils/attendance-status';

type FeedbackState = { type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string };
type SupportStudentTab = 'summary' | 'management' | 'contacts' | 'attendance' | 'followUps' | 'history';

const props = defineProps<{ student: StudentDetail | null; viewerRole: Extract<UserRole, 'director' | 'secretary'>; activeSchoolYear: number; enabledTurns: StudentShift[]; enabledGrades: number[]; sectionsByGrade: Record<string, string[]>; feedback: FeedbackState | null; situationFeedback: FeedbackState | null; consentFeedback: FeedbackState | null; contactsFeedback: FeedbackState | null; followUpsFeedback: FeedbackState | null; resetLoading: boolean; saveLoading: boolean; situationSaveLoading: boolean; consentSaveLoading: boolean; contactsSaveLoading: boolean; followUpsSaveLoading: boolean; deletingContactId: string | null }>();
const emit = defineEmits<{ reset: [payload: ResetUserPasswordPayload]; save: [payload: UpdateStudentPayload]; saveSituation: [payload: UpdateStudentSituationPayload]; saveConsent: [payload: UpdateStudentConsentPayload]; createContact: [payload: CreateStudentContactPayload]; updateContact: [contactId: string, payload: UpdateStudentContactPayload]; removeContact: [contactId: string]; createFollowUp: [payload: CreateStudentFollowUpPayload]; updateFollowUp: [followUpId: string, payload: UpdateStudentFollowUpPayload] }>();

const activeTab = ref<SupportStudentTab>('summary');
const editForm = reactive({ firstName: '', lastName: '', document: '', grade: 1, section: 'A', shift: 'morning' as StudentShift, isActive: true });
const situationForm = reactive({ status: 'active' as StudentEnrollmentStatus, movementType: 'continuity' as StudentEnrollmentMovement, administrativeDetail: '' });
const consentForm = reactive({ imageConsentGranted: true, observation: '' });
const resetForm = reactive({ newPassword: '', confirmPassword: '', reason: '' });
const showResetPassword = ref(false);
const showResetConfirmPassword = ref(false);

const gradeOptions = computed(() => props.enabledGrades.map((grade) => ({ label: `${grade} grado`, value: grade })));
const shiftOptions = computed(() => props.enabledTurns.map((shift) => ({ label: shift === 'morning' ? 'Turno mañana' : 'Turno tarde', value: shift })));
const sectionOptions = computed(() => (props.sectionsByGrade[String(editForm.grade)] ?? ['A']).map((section) => ({ label: section, value: section })));
const statusOptions = [{ label: 'Activo', value: 'active' }, { label: 'Observado', value: 'observed' }, { label: 'Retirado', value: 'withdrawn' }, { label: 'Trasladado', value: 'transferred' }, { label: 'Egresado', value: 'graduated' }];
const movementOptions = [{ label: 'Continuidad', value: 'continuity' }, { label: 'Ingreso nuevo', value: 'new_admission' }, { label: 'Traslado de entrada', value: 'transfer_in' }, { label: 'Traslado de salida', value: 'transfer_out' }, { label: 'Retiro', value: 'withdrawal' }];
const consentOptions = [{ label: 'Consentimiento otorgado', value: true }, { label: 'Consentimiento no otorgado', value: false }];

const classroomLabel = computed(() => props.student && props.student.grade !== null && props.student.section && props.student.shift ? `${props.student.grade} ${props.student.section} · ${props.student.shift === 'morning' ? 'Mañana' : 'Tarde'}` : 'Sin asignación vigente');
const currentSituation = computed(() => props.student?.currentSituation ?? null);
const primaryContact = computed<StudentContact | null>(() => props.student?.contacts.find((contact) => contact.isPrimary && contact.isActive) ?? props.student?.contacts.find((contact) => contact.isActive) ?? null);
const summaryItems = computed(() => props.student ? [{ label: 'Código', value: props.student.code }, { label: 'Documento', value: props.student.document ?? 'Sin documento' }, { label: 'Matrícula vigente', value: classroomLabel.value }, { label: 'Situación actual', value: currentSituation.value ? getMovementLabel(currentSituation.value.movementType) : 'Pendiente de registrar' }, { label: 'Consentimiento', value: props.student.consent?.imageConsentGranted === true ? 'Autorizado' : props.student.consent?.imageConsentGranted === false ? 'No autorizado' : 'Sin registro' }, { label: 'Contacto principal', value: primaryContact.value?.fullName ?? 'Pendiente de registrar' }] : []);
const attendanceSummaryItems = computed(() => props.student ? [{ label: 'Periodo', value: `${formatDate(props.student.recentSummary.periodStart)} - ${formatDate(props.student.recentSummary.periodEnd)}` }, { label: 'Asistencia', value: `${props.student.recentSummary.attendancePercentage.toFixed(1)}%` }, { label: 'Días completos', value: String(props.student.recentSummary.completeDays) }, { label: 'Incompletos', value: String(props.student.recentSummary.incompleteRecords) }] : []);
const todayItems = computed(() => props.student ? [{ label: 'Estado de hoy', value: props.student.todayStatus.operationalStatus }, { label: 'Entrada', value: props.student.todayStatus.entry ? formatDateTime(props.student.todayStatus.entry.markedAt) : 'Pendiente' }, { label: 'Salida', value: props.student.todayStatus.exit ? formatDateTime(props.student.todayStatus.exit.markedAt) : 'Pendiente' }, { label: 'Ausencia', value: props.student.todayStatus.absence ? getAttendanceDayStatusLabel(props.student.todayStatus.absence.statusType) : 'Sin ausencia registrada' }] : []);
const recentAttendanceItems = computed(() => props.student?.recentItems.slice(0, 10) ?? []);

function syncForm(student: StudentDetail | null): void { if (!student) return; editForm.firstName = student.firstName; editForm.lastName = student.lastName; editForm.document = student.document ?? ''; editForm.grade = student.grade ?? props.enabledGrades[0] ?? 1; editForm.shift = student.shift ?? props.enabledTurns[0] ?? 'morning'; editForm.isActive = student.isActive; const availableSections = props.sectionsByGrade[String(editForm.grade)] ?? ['A']; editForm.section = student.section && availableSections.includes(student.section) ? student.section : availableSections[0] ?? 'A'; situationForm.status = student.currentSituation?.status ?? 'active'; situationForm.movementType = student.currentSituation?.movementType ?? 'continuity'; situationForm.administrativeDetail = student.currentSituation?.administrativeDetail ?? ''; consentForm.imageConsentGranted = student.consent?.imageConsentGranted ?? true; consentForm.observation = student.consent?.observation ?? ''; resetForm.newPassword = ''; resetForm.confirmPassword = ''; resetForm.reason = ''; activeTab.value = 'summary'; }
function handleGradeChange(): void { const availableSections = props.sectionsByGrade[String(editForm.grade)] ?? ['A']; if (!availableSections.includes(editForm.section)) editForm.section = availableSections[0] ?? 'A'; }
function handleReset(): void { emit('reset', { newPassword: resetForm.newPassword, reason: resetForm.reason.trim() }); }
function handleSave(): void { emit('save', { firstName: editForm.firstName.trim(), lastName: editForm.lastName.trim(), document: editForm.document.trim() || null, grade: editForm.grade, section: editForm.section, shift: editForm.shift, isActive: editForm.isActive, schoolYear: props.activeSchoolYear }); }
function handleSaveSituation(): void { emit('saveSituation', { status: situationForm.status, movementType: situationForm.movementType, administrativeDetail: situationForm.administrativeDetail.trim() || null, schoolYear: props.activeSchoolYear }); }
function handleSaveConsent(): void { emit('saveConsent', { imageConsentGranted: consentForm.imageConsentGranted, observation: consentForm.observation.trim() || null }); }
function handleCreateContact(payload: CreateStudentContactPayload): void { emit('createContact', payload); }
function handleUpdateContact(contactId: string, payload: UpdateStudentContactPayload): void { emit('updateContact', contactId, payload); }
function handleRemoveContact(contactId: string): void { emit('removeContact', contactId); }
function handleCreateFollowUp(payload: CreateStudentFollowUpPayload): void { emit('createFollowUp', payload); }
function handleUpdateFollowUp(followUpId: string, payload: UpdateStudentFollowUpPayload): void { emit('updateFollowUp', followUpId, payload); }

function getEnrollmentStatusLabel(status: StudentEnrollmentStatus): string { if (status === 'observed') return 'Observado'; if (status === 'withdrawn') return 'Retirado'; if (status === 'transferred') return 'Trasladado'; if (status === 'graduated') return 'Egresado'; if (status === 'promoted') return 'Promovido'; return 'Activo'; }
function getMovementLabel(movementType: StudentEnrollmentMovement): string { if (movementType === 'new_admission') return 'Ingreso nuevo'; if (movementType === 'transfer_in') return 'Traslado de entrada'; if (movementType === 'transfer_out') return 'Traslado de salida'; if (movementType === 'withdrawal') return 'Retiro'; return 'Continuidad'; }
function getChangeTypeLabel(changeType: StudentChangeLog['changeType']): string { if (changeType === 'student_created') return 'Alta manual del estudiante'; if (changeType === 'profile_updated') return 'Corrección de datos personales'; if (changeType === 'enrollment_updated') return 'Cambio de aula o turno'; if (changeType === 'status_updated') return 'Actualización de situación'; if (changeType === 'consent_updated') return 'Actualización de consentimiento'; if (changeType === 'contact_created') return 'Alta de contacto familiar'; if (changeType === 'contact_updated') return 'Actualización de contacto familiar'; return 'Desactivación de contacto familiar'; }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(value)); }
function formatDate(value: string): string { return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' }).format(new Date(`${value}T00:00:00-05:00`)); }
function getRecentItemTitle(item: AttendanceHistoryItem): string { return item.itemType === 'absence' ? 'Registro de ausencia' : item.markType === 'entry' ? 'Registro de entrada' : 'Registro de salida'; }
function getRecentItemStatusLabel(item: AttendanceHistoryItem): string { return item.itemType === 'absence' ? getAttendanceDayStatusLabel(item.status as AttendanceDayStatusType) : getAttendanceRecordStatusLabel(item.status as AttendanceRecordStatus); }
function summarizeChangeLog(changeLog: StudentChangeLog): string { const nextData = changeLog.nextData ?? {}; const previousData = changeLog.previousData ?? {}; if (changeLog.changeType === 'student_created') return `Se creó ${readLogValue(nextData.code)} en ${readLogValue(nextData.grade)} ${readLogValue(nextData.section)}.`; if (changeLog.changeType === 'profile_updated') return `Datos actualizados: ${readLogValue(previousData.firstName)} ${readLogValue(previousData.lastName)} → ${readLogValue(nextData.firstName)} ${readLogValue(nextData.lastName)}.`; if (changeLog.changeType === 'enrollment_updated') return `Aula actual: ${readLogValue(previousData.grade, 'Sin dato')} ${readLogValue(previousData.section)} → ${readLogValue(nextData.grade)} ${readLogValue(nextData.section)}, ${readShiftValue(nextData.shift)}.`; if (changeLog.changeType === 'status_updated') return `Situación: ${readStatusValue(previousData.status)} → ${readStatusValue(nextData.status)} · ${readMovementValue(nextData.movementType)}.`; if (changeLog.changeType === 'consent_updated') return `Consentimiento de imagen: ${readConsentValue(previousData.imageConsentGranted)} → ${readConsentValue(nextData.imageConsentGranted)}.`; if (changeLog.changeType === 'contact_created') return `Se registró a ${readLogValue(nextData.fullName)} como ${readLogValue(nextData.relationship)}.`; if (changeLog.changeType === 'contact_updated') return `Se actualizó el contacto ${readLogValue(previousData.fullName)} → ${readLogValue(nextData.fullName)}.`; return `Se desactivó el contacto ${readLogValue(previousData.fullName)}.`; }
function readLogValue(value: unknown, fallback = ''): string { if (typeof value === 'string' || typeof value === 'number') return String(value); if (typeof value === 'boolean') return value ? 'Sí' : 'No'; return fallback; }
function readShiftValue(value: unknown): string { return value === 'afternoon' ? 'Tarde' : 'Mañana'; }
function readStatusValue(value: unknown): string { return typeof value !== 'string' ? 'Sin dato' : getEnrollmentStatusLabel(value as StudentEnrollmentStatus); }
function readMovementValue(value: unknown): string { return typeof value !== 'string' ? 'Sin movimiento' : getMovementLabel(value as StudentEnrollmentMovement); }
function readConsentValue(value: unknown): string { if (value === true) return 'Autorizado'; if (value === false) return 'No autorizado'; return 'Sin registro'; }

watch(() => props.student, (student) => { syncForm(student); }, { immediate: true });
</script>

<style scoped>
.support-student-card { display: grid; gap: 0; min-width: 0; padding-top: 8px; }
.support-student-card__header { display: grid; gap: 16px; }
.support-student-card__title { font-size: clamp(1.4rem, 1.7vw, 2rem); line-height: 1.08; font-weight: 800; letter-spacing: -0.03em; color: var(--ui-ink); }
.support-student-card__caption { margin-top: 6px; color: var(--ui-text-muted); line-height: 1.55; }
.support-student-card__chips { display: flex; flex-wrap: wrap; gap: 10px; }
.support-student-card__tabs { border-radius: 18px; border: 1px solid var(--ui-border); background: rgba(255, 255, 255, 0.82); padding: 6px; }
.support-student-card__grid { display: grid; gap: 20px; }
.support-student-card__panel { border-radius: 22px; background: rgba(255, 255, 255, 0.92); }
.support-student-card__stats { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.support-student-card__stat { display: grid; gap: 6px; min-width: 0; padding: 14px 16px; border-radius: 18px; border: 1px solid rgba(179, 38, 45, 0.1); background: rgba(248, 250, 252, 0.88); }
.support-student-card__label { font-size: 0.74rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #b3262d; }
.support-student-card__value { font-weight: 700; color: var(--ui-ink); overflow-wrap: anywhere; }
.support-student-card__empty-state { display: grid; justify-items: center; gap: 10px; padding: 24px 20px; border-radius: 18px; border: 1px dashed rgba(179, 38, 45, 0.18); background: rgba(249, 244, 243, 0.72); text-align: center; }
@media (min-width: 1024px) { .support-student-card__header { grid-template-columns: minmax(0, 1fr) auto; align-items: start; } .support-student-card__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; } }
@media (max-width: 767px) { .support-student-card__stats { grid-template-columns: minmax(0, 1fr); } }
</style>
