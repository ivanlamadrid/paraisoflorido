<template>
  <q-card flat bordered class="student-credential-card">
    <q-card-section class="student-credential-card__top">
      <div class="student-credential-card__brand">
        <SchoolMark compact :show-text="false" :school-name="institutionStore.schoolName" />
        <div class="student-credential-card__brand-copy">
          <div class="student-credential-card__school">{{ institutionStore.schoolName }}</div>
          <div class="student-credential-card__subtitle">Credencial digital del estudiante</div>
        </div>
      </div>

      <q-chip
        class="ui-stat-chip student-credential-card__code-chip"
        color="red-1"
        text-color="red-10"
        icon="badge"
      >
        {{ student.code }}
      </q-chip>
    </q-card-section>

    <q-separator />

    <q-card-section class="student-credential-card__body">
      <div class="student-credential-card__identity">
        <div class="ui-eyebrow">Identificación personal</div>
        <div class="student-credential-card__name">{{ student.fullName }}</div>
        <div class="student-credential-card__meta">
          {{ classroomLabel }}
        </div>
      </div>

      <div class="student-credential-card__details">
        <div class="student-credential-card__detail">
          <span class="student-credential-card__detail-label">Código</span>
          <span class="student-credential-card__detail-value">{{ student.code }}</span>
        </div>
        <div class="student-credential-card__detail">
          <span class="student-credential-card__detail-label">Año escolar</span>
          <span class="student-credential-card__detail-value">{{ student.schoolYear }}</span>
        </div>
      </div>

      <div class="student-credential-card__qr">
        <div class="student-credential-card__qr-frame">
          <q-spinner v-if="isGenerating" color="primary" size="44px" />
          <img
            v-else-if="qrDataUrl"
            class="student-credential-card__qr-image"
            :src="qrDataUrl"
            :alt="`QR del código ${student.code}`"
          >
          <q-icon v-else name="qr_code_scanner" size="42px" color="grey-6" />
        </div>
        <div class="student-credential-card__qr-caption">
          Presenta este código QR al auxiliar para registrar tu asistencia.
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { toDataURL } from 'qrcode';
import { computed, onMounted, ref, watch } from 'vue';
import SchoolMark from 'components/ui/SchoolMark.vue';
import { useInstitutionStore } from 'src/stores/institution-store';
import type { StudentProfile } from 'src/types/students';

const props = defineProps<{
  student: StudentProfile;
}>();

const institutionStore = useInstitutionStore();
const qrDataUrl = ref('');
const isGenerating = ref(false);

const classroomLabel = computed(() => {
  if (
    props.student.grade === null ||
    !props.student.section ||
    !props.student.shift
  ) {
    return 'Sin asignación vigente';
  }

  return `${props.student.grade} grado ${props.student.section} - ${
    props.student.shift === 'morning' ? 'Turno mañana' : 'Turno tarde'
  }`;
});

async function generateQrCode(value: string): Promise<void> {
  isGenerating.value = true;

  try {
    qrDataUrl.value = await toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 280,
      color: {
        dark: '#1d2026',
        light: '#ffffff',
      },
    });
  } catch {
    qrDataUrl.value = '';
  } finally {
    isGenerating.value = false;
  }
}

watch(
  () => props.student.code,
  async (studentCode) => {
    await generateQrCode(studentCode);
  },
  { immediate: true },
);

onMounted(async () => {
  void institutionStore.loadSettings();

  if (!qrDataUrl.value) {
    await generateQrCode(props.student.code);
  }
});
</script>
