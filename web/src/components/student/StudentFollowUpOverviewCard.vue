<template>
  <q-card flat bordered class="admin-card">
    <q-card-section class="ui-card-body">
      <div class="row items-start justify-between q-col-gutter-lg">
        <div class="col-12 col-lg">
          <div class="ui-eyebrow">{{ eyebrow }}</div>
          <div class="text-subtitle1 text-weight-bold q-mt-sm">
            {{ title }}
          </div>
          <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
            {{ description }}
          </p>
        </div>
        <div class="col-12 col-lg-auto">
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="fact_check">
            {{ response.total }} registros
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

      <q-form class="admin-form-stack q-mt-lg" @submit.prevent="emit('submit')">
        <div class="row q-col-gutter-lg admin-form-row">
          <div class="col-12 col-md-4 col-lg-3">
            <q-input
              :model-value="search"
              label="Buscar por estudiante o registro"
              outlined
              maxlength="120"
              @update:model-value="emit('update:search', String($event ?? ''))"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-6 col-lg-2">
            <q-select
              :model-value="recordType"
              label="Tipo"
              outlined
              clearable
              emit-value
              map-options
              :options="recordTypeOptions"
              @update:model-value="emit('update:recordType', $event ?? null)"
            />
          </div>
          <div class="col-12 col-sm-6 col-lg-2">
            <q-select
              :model-value="status"
              label="Estado"
              outlined
              clearable
              emit-value
              map-options
              :options="statusOptions"
              @update:model-value="emit('update:status', $event ?? null)"
            />
          </div>
          <div class="col-12 col-sm-6 col-lg-2">
            <q-select
              :model-value="grade"
              label="Grado"
              outlined
              clearable
              emit-value
              map-options
              :options="gradeOptions"
              @update:model-value="emit('update:grade', $event ?? null)"
            />
          </div>
          <div class="col-12 col-sm-6 col-lg-2">
            <q-select
              :model-value="section"
              label="Sección"
              outlined
              clearable
              emit-value
              map-options
              :options="sectionOptions"
              :disable="!grade"
              @update:model-value="emit('update:section', $event ?? null)"
            />
          </div>
          <div class="col-12 col-sm-6 col-lg-1">
            <q-select
              :model-value="shift"
              label="Turno"
              outlined
              clearable
              emit-value
              map-options
              :options="shiftOptions"
              @update:model-value="emit('update:shift', $event ?? null)"
            />
          </div>
        </div>

        <div class="row items-center justify-between q-gutter-sm q-mt-md">
          <div class="row q-gutter-sm">
            <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9">
              {{ incidentCount }} incidencias
            </q-chip>
            <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9">
              {{ tutorialCount }} observaciones
            </q-chip>
          </div>
          <div class="row q-gutter-sm">
            <q-btn flat color="primary" label="Limpiar" no-caps @click="emit('reset')" />
            <q-btn color="primary" label="Actualizar" no-caps type="submit" :loading="loading" />
          </div>
        </div>
      </q-form>

      <div v-if="loading" class="ui-loading-state q-py-xl">
        <q-spinner color="primary" size="32px" />
        <span class="text-body2 text-grey-7">Cargando seguimiento...</span>
      </div>

      <div v-else-if="response.items.length === 0" class="student-follow-up-manager__empty q-mt-lg">
        <q-icon name="fact_check" size="24px" color="grey-6" />
        <span>No hay registros que coincidan con esos filtros.</span>
      </div>

      <div v-else>
        <q-list v-if="isMobile" bordered separator class="rounded-borders q-mt-lg support-list">
          <q-item v-for="item in response.items" :key="item.id" class="q-py-md">
            <q-item-section>
              <q-item-label class="text-weight-medium">
                {{ item.studentFullName }}
              </q-item-label>
              <q-item-label caption>
                {{ item.studentCode }} · {{ formatClassroom(item) }}
              </q-item-label>
              <div class="row q-gutter-sm q-mt-sm">
                <q-chip dense class="ui-stat-chip" color="grey-2" text-color="grey-9">
                  {{ getRecordTypeLabel(item.recordType) }}
                </q-chip>
                <q-chip dense class="ui-stat-chip" color="grey-2" text-color="grey-9">
                  {{ getStatusLabel(item.status) }}
                </q-chip>
              </div>
              <q-item-label class="q-mt-sm text-body2">
                {{ item.note }}
              </q-item-label>
              <q-item-label caption class="q-mt-xs">
                {{ formatRecordedAt(item.recordedAt) }} · {{ item.authorDisplayName }}
              </q-item-label>
            </q-item-section>
            <q-item-section side top>
              <q-btn
                flat
                color="secondary"
                class="support-action-btn"
                label="Abrir ficha"
                no-caps
                @click="emit('openStudent', item.studentId)"
              />
            </q-item-section>
          </q-item>
        </q-list>

        <div v-else class="table-wrap q-mt-lg">
          <q-markup-table flat separator="cell">
            <thead>
              <tr>
                <th class="text-left">Estudiante</th>
                <th class="text-left">Tipo</th>
                <th class="text-left">Estado</th>
                <th class="text-left">Fecha</th>
                <th class="text-left">Responsable</th>
                <th class="text-left">Detalle</th>
                <th class="text-left">Ficha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in response.items" :key="item.id">
                <td>
                  <div class="text-weight-medium">{{ item.studentFullName }}</div>
                  <div class="text-caption text-grey-7">
                    {{ item.studentCode }} · {{ formatClassroom(item) }}
                  </div>
                </td>
                <td>{{ getRecordTypeLabel(item.recordType) }}</td>
                <td>{{ getStatusLabel(item.status) }}</td>
                <td>{{ formatRecordedAt(item.recordedAt) }}</td>
                <td>{{ item.authorDisplayName }}</td>
                <td class="text-body2">{{ item.note }}</td>
                <td>
                  <q-btn
                    flat
                    color="secondary"
                    class="support-action-btn"
                    label="Abrir ficha"
                    no-caps
                    @click="emit('openStudent', item.studentId)"
                  />
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </div>

        <div v-if="response.total > response.limit" class="row justify-center q-mt-lg">
          <q-pagination
            :model-value="response.page"
            color="primary"
            :max="Math.max(1, Math.ceil(response.total / response.limit))"
            max-pages="7"
            boundary-links
            @update:model-value="emit('update:page', $event)"
          />
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import type { StudentShift } from 'src/types/attendance';
import type {
  StudentFollowUpOverviewItem,
  StudentFollowUpOverviewResponse,
  StudentFollowUpRecordType,
  StudentFollowUpStatus,
} from 'src/types/students';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

const props = defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  loading: boolean;
  feedback: FeedbackState | null;
  response: StudentFollowUpOverviewResponse;
  search: string;
  recordType: StudentFollowUpRecordType | null;
  status: StudentFollowUpStatus | null;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
  gradeOptions: { label: string; value: number }[];
  sectionOptions: { label: string; value: string }[];
  shiftOptions: { label: string; value: StudentShift }[];
  isMobile?: boolean;
}>();

const emit = defineEmits<{
  submit: [];
  reset: [];
  openStudent: [studentId: string];
  'update:search': [value: string];
  'update:recordType': [value: StudentFollowUpRecordType | null];
  'update:status': [value: StudentFollowUpStatus | null];
  'update:grade': [value: number | null];
  'update:section': [value: string | null];
  'update:shift': [value: StudentShift | null];
  'update:page': [value: number];
}>();

const recordTypeOptions = [
  { label: 'Observación tutorial', value: 'tutorial_note' },
  { label: 'Incidencia interna', value: 'incident' },
] as const;

const statusOptions = [
  { label: 'Abierto', value: 'open' },
  { label: 'En seguimiento', value: 'in_progress' },
  { label: 'Cerrado', value: 'closed' },
] as const;

const tutorialCount = computed(
  () => props.response.items.filter((item) => item.recordType === 'tutorial_note').length,
);
const incidentCount = computed(
  () => props.response.items.filter((item) => item.recordType === 'incident').length,
);

function getRecordTypeLabel(recordType: StudentFollowUpOverviewItem['recordType']): string {
  return recordType === 'incident' ? 'Incidencia interna' : 'Observación tutorial';
}

function getStatusLabel(status: StudentFollowUpStatus): string {
  if (status === 'in_progress') {
    return 'En seguimiento';
  }

  if (status === 'closed') {
    return 'Cerrado';
  }

  return 'Abierto';
}

function formatRecordedAt(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeZone: 'America/Lima',
  }).format(new Date(`${value}T00:00:00-05:00`));
}

function formatClassroom(item: StudentFollowUpOverviewItem): string {
  if (!item.grade || !item.section || !item.shift) {
    return 'Sin aula vigente';
  }

  return `${item.grade} ${item.section} · ${item.shift === 'morning' ? 'Mañana' : 'Tarde'}`;
}
</script>
