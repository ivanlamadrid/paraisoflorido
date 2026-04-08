<template>
  <div class="student-contacts-manager">
    <div class="ui-eyebrow">Contactos familiares</div>
    <div class="text-subtitle1 text-weight-bold q-mt-sm">
      Gestión básica de contactos asociados
    </div>
    <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
      Registra responsables, teléfonos y referencias útiles sin crear cuentas nuevas.
    </p>

    <StatusBanner
      v-if="resolvedFeedback"
      class="q-mt-lg"
      :variant="resolvedFeedback.type"
      :title="resolvedFeedback.title"
      :message="resolvedFeedback.message"
    />

    <StatusBanner
      v-if="contacts.length > 0 && !hasPrimaryContact"
      class="q-mt-lg"
      variant="warning"
      title="Falta contacto principal"
      message="Hay contactos activos, pero ninguno está marcado como principal."
    />

    <div v-if="contacts.length === 0" class="student-contacts-manager__empty q-mt-lg">
      <q-icon name="groups" size="24px" color="grey-6" />
      <span>No hay contactos familiares registrados todavía.</span>
    </div>

    <div v-else class="student-contacts-manager__list q-mt-lg">
      <article
        v-for="contact in contacts"
        :key="contact.id"
        class="student-contact-card"
      >
        <div class="student-contact-card__header">
          <div>
            <div class="student-contact-card__name">{{ contact.fullName }}</div>
            <div class="student-contact-card__relationship">{{ contact.relationship }}</div>
          </div>
          <div class="row q-gutter-xs">
            <q-chip
              v-if="contact.isPrimary"
              dense
              class="ui-stat-chip"
              color="red-1"
              text-color="red-10"
              icon="star"
            >
              Principal
            </q-chip>
            <q-chip
              v-if="contact.isEmergencyContact"
              dense
              class="ui-stat-chip"
              color="orange-1"
              text-color="orange-10"
              icon="call"
            >
              Emergencia
            </q-chip>
          </div>
        </div>

        <div class="student-contact-card__details">
          <div class="student-contact-card__item">
            <span class="student-contact-card__label">Teléfono principal</span>
            <span class="student-contact-card__value">{{ contact.phonePrimary }}</span>
          </div>
          <div v-if="contact.phoneSecondary" class="student-contact-card__item">
            <span class="student-contact-card__label">Teléfono alterno</span>
            <span class="student-contact-card__value">{{ contact.phoneSecondary }}</span>
          </div>
          <div v-if="contact.email" class="student-contact-card__item">
            <span class="student-contact-card__label">Correo</span>
            <span class="student-contact-card__value">{{ contact.email }}</span>
          </div>
          <div
            v-if="contact.address"
            class="student-contact-card__item student-contact-card__item--wide"
          >
            <span class="student-contact-card__label">Dirección</span>
            <span class="student-contact-card__value">{{ contact.address }}</span>
          </div>
          <div
            v-if="contact.isAuthorizedToCoordinate || contact.isAuthorizedToPickUp"
            class="student-contact-card__item student-contact-card__item--wide"
          >
            <span class="student-contact-card__label">Autorizaciones</span>
            <span class="student-contact-card__value">{{ buildAuthorizationLabel(contact) }}</span>
          </div>
          <div
            v-if="contact.notes"
            class="student-contact-card__item student-contact-card__item--wide"
          >
            <span class="student-contact-card__label">Observación</span>
            <span class="student-contact-card__value">{{ contact.notes }}</span>
          </div>
        </div>

        <div class="student-contacts-manager__actions">
          <q-btn
            flat
            color="primary"
            icon="edit"
            label="Editar"
            no-caps
            @click="startEdit(contact)"
          />
          <q-btn
            flat
            color="negative"
            icon="person_remove"
            label="Desactivar"
            no-caps
            :loading="deletingContactId === contact.id"
            @click="handleDelete(contact)"
          />
        </div>
      </article>
    </div>

    <q-separator class="q-my-lg" />

    <div class="text-subtitle2 text-weight-bold">
      {{ editingContactId ? 'Editar contacto' : 'Nuevo contacto' }}
    </div>

    <q-form class="student-contacts-manager__form q-mt-lg" @submit.prevent="handleSubmit">
      <div class="row q-col-gutter-md">
        <div class="col-12 col-lg-6">
          <q-input
            v-model="form.fullName"
            label="Nombre completo"
            outlined
            maxlength="160"
          >
            <template #prepend>
              <q-icon name="person" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-lg-6">
          <q-input
            v-model="form.relationship"
            label="Parentesco o relación"
            outlined
            maxlength="80"
          >
            <template #prepend>
              <q-icon name="badge" />
            </template>
          </q-input>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-4">
          <q-input
            v-model="form.phonePrimary"
            label="Teléfono principal"
            outlined
            maxlength="30"
          >
            <template #prepend>
              <q-icon name="call" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-md-4">
          <q-input
            v-model="form.phoneSecondary"
            label="Teléfono alterno"
            outlined
            maxlength="30"
          >
            <template #prepend>
              <q-icon name="phone_iphone" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-md-4">
          <q-input
            v-model="form.email"
            label="Correo"
            outlined
            maxlength="160"
            type="email"
          >
            <template #prepend>
              <q-icon name="mail" />
            </template>
          </q-input>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <div class="col-12 col-lg-8">
          <q-input
            v-model="form.address"
            label="Dirección"
            outlined
            maxlength="255"
          >
            <template #prepend>
              <q-icon name="home" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-lg-4">
          <q-input
            v-model="form.notes"
            label="Observación breve"
            outlined
            maxlength="255"
          >
            <template #prepend>
              <q-icon name="edit_note" />
            </template>
          </q-input>
        </div>
      </div>

      <div class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-auto">
          <q-toggle
            v-model="form.isPrimary"
            color="primary"
            keep-color
            label="Contacto principal"
          />
        </div>
        <div class="col-12 col-md-auto">
          <q-toggle
            v-model="form.isEmergencyContact"
            color="secondary"
            keep-color
            label="Contacto de emergencia"
          />
        </div>
        <div class="col-12 col-md-auto">
          <q-toggle
            v-model="form.isAuthorizedToCoordinate"
            color="primary"
            keep-color
            label="Autorizado para coordinar"
          />
        </div>
        <div class="col-12 col-md-auto">
          <q-toggle
            v-model="form.isAuthorizedToPickUp"
            color="secondary"
            keep-color
            label="Autorizado para recoger"
          />
        </div>
      </div>

      <div class="row items-center justify-between q-gutter-sm">
        <div class="text-caption text-grey-7">
          Puedes registrar más de un contacto. Marca uno como principal si debe aparecer primero.
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            v-if="editingContactId"
            flat
            color="primary"
            label="Cancelar"
            no-caps
            @click="resetForm"
          />
          <q-btn
            color="primary"
            :label="editingContactId ? 'Guardar cambios' : 'Agregar contacto'"
            no-caps
            type="submit"
            :loading="saveLoading"
          />
        </div>
      </div>
    </q-form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import type {
  CreateStudentContactPayload,
  StudentContact,
  UpdateStudentContactPayload,
} from 'src/types/students';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

const props = defineProps<{
  contacts: StudentContact[];
  feedback: FeedbackState | null;
  saveLoading: boolean;
  deletingContactId: string | null;
}>();

const emit = defineEmits<{
  create: [payload: CreateStudentContactPayload];
  update: [contactId: string, payload: UpdateStudentContactPayload];
  remove: [contactId: string];
}>();

const editingContactId = ref<string | null>(null);
const localFeedback = ref<FeedbackState | null>(null);
const form = reactive({
  fullName: '',
  relationship: '',
  phonePrimary: '',
  phoneSecondary: '',
  email: '',
  address: '',
  isPrimary: false,
  isEmergencyContact: false,
  isAuthorizedToCoordinate: false,
  isAuthorizedToPickUp: false,
  notes: '',
});

const resolvedFeedback = computed(() => localFeedback.value ?? props.feedback);
const hasPrimaryContact = computed(() =>
  props.contacts.some((contact) => contact.isPrimary),
);

function resetForm(): void {
  editingContactId.value = null;
  localFeedback.value = null;
  form.fullName = '';
  form.relationship = '';
  form.phonePrimary = '';
  form.phoneSecondary = '';
  form.email = '';
  form.address = '';
  form.isPrimary = false;
  form.isEmergencyContact = false;
  form.isAuthorizedToCoordinate = false;
  form.isAuthorizedToPickUp = false;
  form.notes = '';
}

function startEdit(contact: StudentContact): void {
  editingContactId.value = contact.id;
  form.fullName = contact.fullName;
  form.relationship = contact.relationship;
  form.phonePrimary = contact.phonePrimary;
  form.phoneSecondary = contact.phoneSecondary ?? '';
  form.email = contact.email ?? '';
  form.address = contact.address ?? '';
  form.isPrimary = contact.isPrimary;
  form.isEmergencyContact = contact.isEmergencyContact;
  form.isAuthorizedToCoordinate = contact.isAuthorizedToCoordinate;
  form.isAuthorizedToPickUp = contact.isAuthorizedToPickUp;
  form.notes = contact.notes ?? '';
}

function buildPayload(): CreateStudentContactPayload {
  return {
    fullName: form.fullName.trim(),
    relationship: form.relationship.trim(),
    phonePrimary: form.phonePrimary.trim(),
    phoneSecondary: form.phoneSecondary.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    isPrimary: form.isPrimary,
    isEmergencyContact: form.isEmergencyContact,
    isAuthorizedToCoordinate: form.isAuthorizedToCoordinate,
    isAuthorizedToPickUp: form.isAuthorizedToPickUp,
    notes: form.notes.trim() || null,
  };
}

function handleSubmit(): void {
  const payload = buildPayload();

  if (!payload.fullName || !payload.relationship || !payload.phonePrimary) {
    localFeedback.value = {
      type: 'warning',
      title: 'Contacto incompleto',
      message: 'Ingresa nombre completo, relación y teléfono principal.',
    };
    return;
  }

  localFeedback.value = null;

  if (editingContactId.value) {
    emit('update', editingContactId.value, payload);
    return;
  }

  emit('create', payload);
}

function handleDelete(contact: StudentContact): void {
  const confirmed = window.confirm(
    `Se desactivará el contacto ${contact.fullName}. ¿Deseas continuar?`,
  );

  if (!confirmed) {
    return;
  }

  emit('remove', contact.id);
}

function buildAuthorizationLabel(contact: StudentContact): string {
  const labels: string[] = [];

  if (contact.isAuthorizedToCoordinate) {
    labels.push('Coordinar');
  }

  if (contact.isAuthorizedToPickUp) {
    labels.push('Recoger');
  }

  return labels.join(' · ');
}

watch(
  () => props.contacts,
  () => {
    if (!props.saveLoading && !props.deletingContactId) {
      resetForm();
    }
  },
);

watch(
  () => props.feedback,
  (feedback) => {
    if (feedback) {
      localFeedback.value = null;
    }
  },
);
</script>
