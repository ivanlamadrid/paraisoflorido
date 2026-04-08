<template>
  <q-card flat bordered class="admin-card">
    <q-card-section class="ui-card-body">
      <div class="row items-start justify-between q-col-gutter-lg">
        <div class="col-12 col-lg">
          <div class="ui-eyebrow">Nuevo año escolar</div>
          <div class="text-subtitle1 text-weight-bold q-mt-sm">
            Preparar continuidad sin borrar historial
          </div>
          <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
            Esta herramienta crea la base del siguiente año, conserva la
            trazabilidad institucional y evita cambios manuales riesgosos sobre
            el año activo.
          </p>
        </div>
        <div class="col-12 col-lg-auto row q-gutter-sm">
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="event_note">
            Año actual {{ currentSchoolYear }}
          </q-chip>
          <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="calendar_month">
            Propuesta {{ form.targetSchoolYear }}
          </q-chip>
        </div>
      </div>

      <StatusBanner
        v-if="feedback"
        class="q-mt-lg"
        :variant="feedback.type"
        :title="feedback.title"
        :message="feedback.message"
      />

      <q-form class="q-gutter-md q-mt-lg" @submit.prevent="handlePreview">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-lg-4">
            <q-input
              v-model.number="form.targetSchoolYear"
              type="number"
              min="2000"
              max="2100"
              label="Nuevo año escolar"
              outlined
            >
              <template #prepend>
                <q-icon name="calendar_month" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-lg-8">
            <q-card flat bordered class="school-year-preparation-card__summary">
              <q-card-section class="school-year-preparation-card__summary-body">
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
                  Alcance previsto
                </div>
                <div class="text-body2 text-grey-8 q-mt-sm">
                  Se conservarán estudiantes, historial, incidencias, comunicados
                  y cuentas internas. Solo se preparará la continuidad del nuevo
                  año escolar.
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <q-toggle
          v-model="form.resetStudentPasswords"
          color="primary"
          keep-color
          label="Restablecer contraseñas de estudiantes continuantes y exigir cambio en el siguiente ingreso"
        />

        <div class="row items-center justify-between q-gutter-sm">
          <div class="text-caption text-grey-7">
            Primero revisa el impacto. La ejecución requiere contraseña actual y
            confirmación explícita.
          </div>
          <q-btn
            color="primary"
            label="Revisar impacto"
            no-caps
            type="submit"
            :loading="isPreviewLoading"
          />
        </div>
      </q-form>

      <template v-if="preview">
        <q-separator class="q-my-lg" />

        <div class="school-year-preparation-card__metrics">
          <q-card flat bordered class="school-year-preparation-card__metric">
            <q-card-section>
              <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
                Continuidad
              </div>
              <div class="text-h5 text-weight-bold q-mt-sm">
                {{ preview.continuedStudentsCount }}
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="school-year-preparation-card__metric">
            <q-card-section>
              <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
                Egresados
              </div>
              <div class="text-h5 text-weight-bold q-mt-sm">
                {{ preview.graduatedStudentsCount }}
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="school-year-preparation-card__metric">
            <q-card-section>
              <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
                Casos por revisar
              </div>
              <div class="text-h5 text-weight-bold q-mt-sm">
                {{ preview.skippedStudentsCount }}
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="school-year-preparation-card__metric">
            <q-card-section>
              <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
                Contraseñas
              </div>
              <div class="text-h5 text-weight-bold q-mt-sm">
                {{ preview.passwordsResetCount }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="row q-col-gutter-lg q-mt-lg">
          <div class="col-12 col-lg-6">
            <q-card flat bordered class="school-year-preparation-card__detail-card">
              <q-card-section>
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
                  Notas operativas
                </div>
                <q-list
                  v-if="preview.notes.length > 0"
                  dense
                  separator
                  class="q-mt-sm"
                >
                  <q-item v-for="note in preview.notes" :key="note" class="q-px-none">
                    <q-item-section>
                      <q-item-label class="text-body2">{{ note }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="text-body2 text-grey-7 q-mt-sm">
                  No hay observaciones adicionales para esta preparación.
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-lg-6">
            <q-card flat bordered class="school-year-preparation-card__detail-card">
              <q-card-section>
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
                  Bloqueos detectados
                </div>
                <q-list
                  v-if="preview.blockers.length > 0"
                  dense
                  separator
                  class="q-mt-sm"
                >
                  <q-item v-for="blocker in preview.blockers" :key="blocker" class="q-px-none">
                    <q-item-section>
                      <q-item-label class="text-body2">{{ blocker }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="text-body2 text-positive q-mt-sm">
                  No hay bloqueos para preparar el nuevo año escolar.
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <q-form
          v-if="preview.canPrepare"
          class="q-gutter-md q-mt-lg"
          @submit.prevent="handleExecute"
        >
          <div class="row q-col-gutter-md">
            <div class="col-12 col-lg-6">
              <q-input
                v-model="form.currentPassword"
                label="Contraseña actual del director"
                outlined
                :type="showPassword ? 'text' : 'password'"
                maxlength="128"
              >
                <template #prepend>
                  <q-icon name="lock" />
                </template>
                <template #append>
                  <q-btn
                    flat
                    round
                    dense
                    type="button"
                    :icon="showPassword ? 'visibility_off' : 'visibility'"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>
            </div>

            <div class="col-12 col-lg-6">
              <q-input
                v-model="form.confirmationText"
                label='Escribe "PREPARAR NUEVO AÑO"'
                outlined
                maxlength="64"
              >
                <template #prepend>
                  <q-icon name="verified_user" />
                </template>
              </q-input>
            </div>
          </div>

          <div class="row items-center justify-between q-gutter-sm">
            <div class="text-caption text-grey-7">
              Esta acción registrará auditoría, cambiará el año activo y no
              borrará información histórica.
            </div>
            <q-btn
              color="secondary"
              label="Preparar nuevo año escolar"
              no-caps
              type="submit"
              :loading="isExecuteLoading"
            />
          </div>
        </q-form>
      </template>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import {
  executeSchoolYearPreparation,
  previewSchoolYearPreparation,
} from 'src/services/api/institution-api';
import { getApiErrorMessage } from 'src/services/api/api-errors';
import type {
  ExecuteSchoolYearPreparationResponse,
  InstitutionSettings,
  SchoolYearPreparationPreview,
} from 'src/types/institution';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

const props = defineProps<{
  settings: InstitutionSettings | null;
}>();

const emit = defineEmits<{
  prepared: [response: ExecuteSchoolYearPreparationResponse];
}>();

const feedback = ref<FeedbackState | null>(null);
const preview = ref<SchoolYearPreparationPreview | null>(null);
const isPreviewLoading = ref(false);
const isExecuteLoading = ref(false);
const showPassword = ref(false);

const form = reactive({
  targetSchoolYear: new Date().getFullYear() + 1,
  resetStudentPasswords: false,
  currentPassword: '',
  confirmationText: '',
});

const currentSchoolYear = computed(
  () => props.settings?.activeSchoolYear ?? new Date().getFullYear(),
);

function resetExecutionInputs(): void {
  form.currentPassword = '';
  form.confirmationText = '';
  showPassword.value = false;
}

async function handlePreview(): Promise<void> {
  feedback.value = null;
  isPreviewLoading.value = true;

  try {
    preview.value = await previewSchoolYearPreparation({
      targetSchoolYear: form.targetSchoolYear,
      resetStudentPasswords: form.resetStudentPasswords,
    });

    resetExecutionInputs();
    feedback.value = preview.value.canPrepare
      ? {
          type: 'info',
          title: 'Revisión lista',
          message:
            'Verifica el impacto antes de ejecutar la preparación del nuevo año escolar.',
        }
      : {
          type: 'warning',
          title: 'Se detectaron bloqueos',
          message:
            'Corrige los puntos observados antes de preparar el nuevo año escolar.',
        };
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo revisar el impacto',
      message: getApiErrorMessage(error),
    };
  } finally {
    isPreviewLoading.value = false;
  }
}

async function handleExecute(): Promise<void> {
  feedback.value = null;

  if (!preview.value) {
    feedback.value = {
      type: 'warning',
      title: 'Revisión pendiente',
      message: 'Primero revisa el impacto antes de ejecutar la preparación.',
    };
    return;
  }

  isExecuteLoading.value = true;

  try {
    const response = await executeSchoolYearPreparation({
      targetSchoolYear: form.targetSchoolYear,
      resetStudentPasswords: form.resetStudentPasswords,
      currentPassword: form.currentPassword,
      confirmationText: form.confirmationText.trim(),
    });

    preview.value = response.preview;
    feedback.value = {
      type: 'success',
      title: 'Nuevo año preparado',
      message: response.message,
    };
    resetExecutionInputs();
    emit('prepared', response);
  } catch (error) {
    feedback.value = {
      type: 'error',
      title: 'No se pudo preparar el nuevo año',
      message: getApiErrorMessage(error),
    };
  } finally {
    isExecuteLoading.value = false;
  }
}

watch(
  () => props.settings?.activeSchoolYear,
  (activeSchoolYear) => {
    if (!activeSchoolYear) {
      return;
    }

    form.targetSchoolYear = activeSchoolYear + 1;
    form.resetStudentPasswords = false;
    preview.value = null;
    feedback.value = null;
    resetExecutionInputs();
  },
  { immediate: true },
);
</script>

<style scoped>
.school-year-preparation-card__summary,
.school-year-preparation-card__metric,
.school-year-preparation-card__detail-card {
  border-radius: 20px;
  background: #f8fafc;
}

.school-year-preparation-card__summary-body {
  display: grid;
  gap: 2px;
}

.school-year-preparation-card__metrics {
  display: grid;
  gap: 16px;
}

@media (min-width: 1024px) {
  .school-year-preparation-card__metrics {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
