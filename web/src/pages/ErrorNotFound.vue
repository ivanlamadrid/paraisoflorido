<template>
  <div class="error-page fullscreen flex flex-center">
    <q-card flat bordered class="error-card q-pa-xl text-center">
      <SchoolMark class="justify-center q-mb-lg" :show-text="false" compact />
      <div class="ui-eyebrow">Ruta no disponible</div>
      <div class="text-h2 text-weight-bold q-mt-sm">404</div>
      <p class="text-body1 text-grey-8 q-mt-md q-mb-lg">
        La ruta que buscas no existe o ya no está disponible.
      </p>
      <q-btn color="primary" label="Ir al inicio de sesión" no-caps to="/login" />
    </q-card>
  </div>
</template>

<script setup lang="ts">
import SchoolMark from 'components/ui/SchoolMark.vue';
</script>
