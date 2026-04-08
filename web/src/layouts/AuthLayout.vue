<template>
  <q-layout view="lHh Lpr lFf" class="auth-layout">
    <div class="auth-layout__shell">
      <div class="auth-layout__aside gt-md">
        <AuthInstitutionPanel />
      </div>

      <div class="auth-layout__main">
        <q-page-container class="auth-layout__page-container">
          <router-view />
        </q-page-container>
      </div>
    </div>
  </q-layout>
</template>

<script setup lang="ts">
import AuthInstitutionPanel from 'components/auth/AuthInstitutionPanel.vue';
</script>
