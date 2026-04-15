<template>
  <q-card flat bordered class="admin-card q-mt-lg">
    <q-card-section class="ui-card-body">
      <div class="row items-start justify-between q-col-gutter-lg">
        <div class="col-12 col-lg">
          <div class="ui-eyebrow">Importacion de estudiantes</div>
          <div class="text-subtitle1 text-weight-bold q-mt-sm">
            Carga Excel con validacion previa
          </div>
          <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
            Sube un archivo Excel, revisa el preview y confirma solo cuando el resumen este claro.
            Si una fila no trae username o codigo, el sistema generara uno automaticamente al
            continuar.
          </p>
        </div>
        <div class="col-12 col-lg-auto">
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="upload_file">
            Ano {{ activeSchoolYear }}
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

      <div class="admin-form-stack q-mt-lg">
        <q-file
          v-model="selectedFile"
          outlined
          clearable
          use-chips
          accept=".xlsx,.xls"
          label="Archivo Excel de estudiantes"
          :disable="previewLoading || importLoading"
        >
          <template #prepend>
            <q-icon name="table_view" />
          </template>
        </q-file>

        <div class="row items-center justify-between q-gutter-sm">
          <div class="text-caption text-grey-7">
            Columnas esperadas: nombres, apellidos, documento, grado, seccion, turno y
            username/codigo opcional.
          </div>
          <div class="row q-gutter-sm">
            <q-btn
              flat
              color="primary"
              label="Limpiar"
              no-caps
              :disable="previewLoading || importLoading"
              @click="handleClear"
            />
            <q-btn
              color="primary"
              label="Analizar archivo"
              no-caps
              :loading="previewLoading"
              :disable="!selectedFile || importLoading"
              @click="handlePreview"
            />
          </div>
        </div>
      </div>

      <template v-if="preview">
        <div class="alerts-summary-grid q-mt-lg">
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="table_rows">
            {{ preview.summary.totalRows }} filas detectadas
          </q-chip>
          <q-chip class="ui-stat-chip" color="teal-1" text-color="teal-10" icon="alternate_email">
            {{ preview.summary.rowsWithProvidedCode }} con codigo
          </q-chip>
          <q-chip class="ui-stat-chip" color="blue-1" text-color="blue-10" icon="badge">
            {{ preview.summary.rowsWithoutCode }} automaticos
          </q-chip>
          <q-chip class="ui-stat-chip" color="green-1" text-color="green-10" icon="task_alt">
            {{ preview.summary.validRows }} validas
          </q-chip>
          <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="error_outline">
            {{ preview.summary.invalidRows }} con observaciones
          </q-chip>
          <q-chip
            class="ui-stat-chip"
            color="deep-orange-1"
            text-color="deep-orange-10"
            icon="warning"
          >
            {{ preview.summary.rowsWithInvalidCode }} codigo invalido
          </q-chip>
        </div>

        <StatusBanner
          v-if="preview.summary.rowsWithoutCode > 0"
          class="q-mt-lg"
          variant="info"
          title="Codigos automaticos disponibles"
          :message="`${preview.summary.rowsWithoutCode} estudiantes no tienen username o codigo; el sistema lo generara automaticamente al continuar.`"
        />

        <StatusBanner
          v-if="preview.summary.rowsWithInvalidCode > 0"
          class="q-mt-lg"
          variant="warning"
          title="Codigos por revisar"
          message="El preview detecto usernames o codigos invalidos. Corrigelos en el Excel antes de volver a importar."
        />

        <StatusBanner
          v-if="preview.summary.invalidRows > 0"
          class="q-mt-lg"
          variant="warning"
          title="Importacion con observaciones"
          message="Las filas con errores no se importaran. Revisa el detalle antes de continuar."
        />

        <div class="text-caption text-grey-7 q-mt-lg">
          Hoja analizada: {{ preview.sheetName }}. Token vigente hasta
          {{ formatExpiry(preview.expiresAt) }}.
        </div>

        <div class="table-wrap q-mt-md">
          <q-markup-table flat separator="cell">
            <thead>
              <tr>
                <th class="text-left">Fila</th>
                <th class="text-left">Username / codigo</th>
                <th class="text-left">Estudiante</th>
                <th class="text-left">Documento</th>
                <th class="text-left">Aula</th>
                <th class="text-left">Estado</th>
                <th class="text-left">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in previewRows" :key="row.rowNumber">
                <td>{{ row.rowNumber }}</td>
                <td>{{ row.code || 'Automatico' }}</td>
                <td>{{ formatFullName(row) }}</td>
                <td>{{ row.document || 'Sin documento' }}</td>
                <td>{{ formatClassroom(row) }}</td>
                <td>
                  <q-chip
                    dense
                    :color="row.isValid ? 'green-1' : 'red-1'"
                    :text-color="row.isValid ? 'green-10' : 'red-10'"
                  >
                    {{ row.isValid ? 'Lista' : 'Revisar' }}
                  </q-chip>
                </td>
                <td class="text-body2">
                  {{
                    row.issues.length > 0
                      ? row.issues.map((issue) => issue.message).join(' ')
                      : 'Sin observaciones.'
                  }}
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </div>

        <div
          v-if="preview.rows.length > previewRows.length"
          class="text-caption text-grey-7 q-mt-sm"
        >
          Se muestran {{ previewRows.length }} filas del preview. El resumen completo se aplicara a
          todo el archivo.
        </div>

        <div class="row items-center justify-between q-gutter-sm q-mt-lg">
          <div class="text-caption text-grey-7">
            Al confirmar, se importaran las filas validas usando el token del preview. Ya no se
            reenviara todo el dataset analizado.
          </div>
          <q-btn
            color="primary"
            label="Confirmar importacion"
            no-caps
            :loading="importLoading"
            :disable="preview.summary.validRows === 0 || previewLoading"
            @click="handleImport"
          />
        </div>
      </template>

      <template v-if="result">
        <div class="alerts-summary-grid q-mt-lg">
          <q-chip class="ui-stat-chip" color="green-1" text-color="green-10" icon="groups">
            {{ result.summary.importedRows }} importados
          </q-chip>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="rule">
            {{ result.summary.skippedRows }} omitidos
          </q-chip>
          <q-chip class="ui-stat-chip" color="blue-1" text-color="blue-10" icon="badge">
            {{ result.summary.generatedCodes }} codigos generados
          </q-chip>
        </div>

        <div v-if="result.skipped.length > 0" class="q-mt-lg">
          <div class="text-subtitle2 text-weight-bold">Filas omitidas</div>
          <q-list bordered separator class="rounded-borders q-mt-sm">
            <q-item
              v-for="item in result.skipped.slice(0, 10)"
              :key="`${item.rowNumber}-${item.fullName}`"
            >
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  Fila {{ item.rowNumber }} - {{ item.fullName || 'Sin nombre' }}
                </q-item-label>
                <q-item-label caption>{{ item.reason }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </template>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import type {
  StudentImportPreviewResponse,
  StudentImportPreviewRow,
  StudentImportResultResponse,
} from 'src/types/students';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

const props = defineProps<{
  activeSchoolYear: number;
  preview: StudentImportPreviewResponse | null;
  result: StudentImportResultResponse | null;
  feedback: FeedbackState | null;
  previewLoading: boolean;
  importLoading: boolean;
}>();

const emit = defineEmits<{
  preview: [file: File];
  confirm: [payload: { importToken: string }];
  clear: [];
}>();

const selectedFile = ref<File | null>(null);

const previewRows = computed(() => props.preview?.rows.slice(0, 40) ?? []);

function formatFullName(row: StudentImportPreviewRow): string {
  return `${row.lastName} ${row.firstName}`.trim() || 'Fila sin nombre';
}

function formatClassroom(row: StudentImportPreviewRow): string {
  if (!row.grade || !row.section || !row.shift) {
    return 'Pendiente';
  }

  return `${row.grade} ${row.section} - ${row.shift === 'morning' ? 'Manana' : 'Tarde'}`;
}

function formatExpiry(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
}

function handlePreview(): void {
  if (!selectedFile.value) {
    return;
  }

  emit('preview', selectedFile.value);
}

function handleClear(): void {
  selectedFile.value = null;
  emit('clear');
}

function handleImport(): void {
  if (!props.preview) {
    return;
  }

  emit('confirm', {
    importToken: props.preview.importToken,
  });
}

watch(
  () => props.result,
  (result) => {
    if (result) {
      selectedFile.value = null;
    }
  },
);
</script>
