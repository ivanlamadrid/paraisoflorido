<template>
  <q-card flat bordered class="auth-institution-panel" :class="panelClass">
    <q-card-section class="auth-institution-panel__body">
      <div class="auth-institution-panel__header">
        <SchoolMark
          class="auth-institution-panel__mark"
          :school-name="institutionStore.schoolName"
          :show-text="false"
          size="lg"
        />

        <div class="auth-institution-panel__identity">
          <div class="auth-institution-panel__eyebrow">Institución educativa pública</div>
          <div class="auth-institution-panel__school">{{ institutionStore.schoolName }}</div>
          <div class="auth-institution-panel__system">Sistema institucional escolar</div>
        </div>
      </div>

      <div class="auth-institution-panel__title">
        Acceso para estudiantes y personal del colegio
      </div>

      <p class="auth-institution-panel__copy q-mb-none">
        Ingresa para registrar asistencia, revisar la ficha institucional,
        consultar comunicados y dar seguimiento operativo del colegio.
      </p>

      <div class="auth-institution-panel__info-list">
        <div class="auth-institution-panel__info-item">
          <div class="auth-institution-panel__info-title">Uso institucional</div>
          <div class="auth-institution-panel__info-copy">
            Plataforma interna para dirección, secretaría, tutoría, auxiliares y estudiantes.
          </div>
        </div>
        <div class="auth-institution-panel__info-item">
          <div class="auth-institution-panel__info-title">Acceso del estudiante</div>
          <div class="auth-institution-panel__info-copy">
            El usuario del estudiante corresponde a su código personal.
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SchoolMark from 'components/ui/SchoolMark.vue';
import { useInstitutionStore } from 'src/stores/institution-store';

const props = withDefaults(
  defineProps<{
    embedded?: boolean;
  }>(),
  {
    embedded: false,
  },
);

const panelClass = computed(() => ({
  'auth-institution-panel--embedded': props.embedded,
}));

const institutionStore = useInstitutionStore();
</script>
