<template>
  <q-page class="admin-page">
    <div class="ui-page-shell">
      <PageIntroCard
        eyebrow="Portal administrativo"
        title="Operación institucional"
        description="Organiza estudiantes, asistencia, personal y configuración básica del colegio desde una superficie administrativa más clara."
      >
        <template #meta>
          <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="admin_panel_settings">
            Director y secretaría
          </q-chip>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="event_note">
            Año activo {{ institutionStore.settings?.activeSchoolYear ?? studentsFilters.schoolYear }}
          </q-chip>
        </template>
      </PageIntroCard>

      <ResponsiveSectionNav
        v-model="activeSection"
        class="q-mt-lg"
        :items="adminSectionItems"
        :show-desktop-tabs="false"
      />

      <section v-show="activeSection === 'settings'" class="role-section-view q-mt-lg">
        <q-card flat bordered class="admin-card q-mb-lg">
          <q-card-section class="ui-card-body">
            <div class="ui-eyebrow">Configuración</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              Parámetros institucionales y cuenta administrativa
            </div>
            <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
              Ajusta los datos base del colegio y mantén tu acceso administrativo al día sin mezclar esta superficie con reportes u operación de asistencia.
            </p>
          </q-card-section>
        </q-card>

        <InstitutionSettingsCard
          :settings="institutionStore.settings"
          :loading="isSavingSettings"
          :feedback="settingsFeedback"
          @save="handleSaveSettings"
        />

        <SchoolYearPreparationCard
          v-if="isDirector"
          class="q-mt-lg"
          :settings="institutionStore.settings"
          @prepared="handleSchoolYearPrepared"
        />

        <PasswordChangeCard
          class="q-mt-lg"
          :feedback="accountPasswordFeedback"
          :loading="isChangingOwnPassword"
          title="Cambiar contraseña"
          description="Actualiza tu acceso administrativo con tu contraseña actual."
          submit-label="Guardar contraseña"
          @submit="handleChangeOwnPassword"
        />
      </section>

      <section v-show="activeSection === 'support'" class="role-section-view q-mt-lg">
        <q-card flat bordered class="admin-card">
        <q-card-section class="ui-card-body">
          <div class="row items-start justify-between q-col-gutter-lg">
            <div class="col-12 col-lg">
              <div class="ui-eyebrow">Soporte operativo</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                Alertas y búsqueda rápida del año activo
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                Revisa riesgos de asistencia y abre la ficha administrativa cuando necesites intervenir sobre un caso puntual.
              </p>
            </div>
            <div class="col-12 col-lg-auto">
              <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="priority_high">
                Riesgos del año activo
              </q-chip>
            </div>
          </div>

          <StatusBanner
            v-if="attendanceAlertsFeedback"
            class="q-mt-lg"
            :variant="attendanceAlertsFeedback.type"
            :title="attendanceAlertsFeedback.title"
            :message="attendanceAlertsFeedback.message"
          />

          <q-form class="admin-form-stack q-mt-lg" @submit="handleLoadAttendanceAlerts">
            <div class="row q-col-gutter-lg admin-form-row">
              <div class="col-12 col-sm-6 col-lg-2">
                <q-input
                  v-model.number="attendanceAlertsFilters.schoolYear"
                  type="number"
                  label="Año escolar"
                  outlined
                  min="2000"
                  max="2100"
                >
                  <template #prepend>
                    <q-icon name="calendar_month" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6 col-lg-2">
                <q-select
                  v-model="attendanceAlertsFilters.grade"
                  label="Grado"
                  outlined
                  clearable
                  emit-value
                  map-options
                  :options="enabledGradeOptions"
                  @update:model-value="handleAttendanceAlertsGradeChange"
                >
                  <template #prepend>
                    <q-icon name="school" />
                  </template>
                </q-select>
              </div>
              <div class="col-12 col-sm-6 col-lg-2">
                <q-select
                  v-model="attendanceAlertsFilters.section"
                  label="Sección"
                  outlined
                  clearable
                  emit-value
                  map-options
                  :options="attendanceAlertsSectionOptions"
                  :disable="!attendanceAlertsFilters.grade"
                >
                  <template #prepend>
                    <q-icon name="groups" />
                  </template>
                </q-select>
              </div>
              <div class="col-12 col-sm-6 col-lg-2">
                <q-select
                  v-model="attendanceAlertsFilters.shift"
                  label="Turno"
                  outlined
                  clearable
                  emit-value
                  map-options
                  :options="enabledShiftOptions"
                >
                  <template #prepend>
                    <q-icon name="schedule" />
                  </template>
                </q-select>
              </div>
              <div class="col-12 col-lg-4">
                <q-input
                  v-model="attendanceAlertsFilters.search"
                  label="Buscar por código o estudiante"
                  outlined
                  maxlength="120"
                >
                  <template #prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
            </div>

            <div class="row items-center justify-between q-gutter-sm">
              <div class="alerts-summary-grid">
                <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="event_busy">
                  {{ attendanceAlertsSummary.consecutiveAbsenceAlerts }} ausencias consecutivas
                </q-chip>
                <q-chip class="ui-stat-chip" color="amber-1" text-color="amber-10" icon="rule">
                  {{ attendanceAlertsSummary.repeatedIncompleteRecordAlerts }} incompletos
                </q-chip>
                <q-chip class="ui-stat-chip" color="orange-1" text-color="orange-10" icon="schedule">
                  {{ attendanceAlertsSummary.repeatedLateEntryAlerts }} tardanzas
                </q-chip>
              </div>
              <div class="row q-gutter-sm">
                <q-btn
                  flat
                  color="primary"
                  label="Limpiar"
                  no-caps
                  @click="resetAttendanceAlertsFilters"
                />
                <q-btn
                  color="primary"
                  label="Buscar alertas"
                  no-caps
                  type="submit"
                  :loading="isLoadingAttendanceAlerts"
                />
              </div>
            </div>
          </q-form>

          <div v-if="isLoadingAttendanceAlerts" class="column items-center q-py-xl q-gutter-md">
            <q-spinner color="primary" size="34px" />
            <span class="text-body2 text-grey-7">Cargando alertas internas...</span>
          </div>

          <div v-else-if="attendanceAlerts.length === 0" class="text-center q-py-xl text-grey-7">
            No hay alertas activas con esos filtros.
          </div>

          <q-list
            v-else
            bordered
            separator
            class="rounded-borders q-mt-lg alerts-list"
          >
            <q-item v-for="alert in attendanceAlerts" :key="`${alert.alertType}-${alert.studentId}`">
              <q-item-section avatar top>
                <q-chip
                  square
                  dense
                  :color="getAttendanceAlertTone(alert.alertType).color"
                  :text-color="getAttendanceAlertTone(alert.alertType).textColor"
                  :icon="getAttendanceAlertTone(alert.alertType).icon"
                >
                  {{ getAttendanceAlertLabel(alert.alertType) }}
                </q-chip>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ alert.fullName }}
                </q-item-label>
                <q-item-label caption>
                  {{ alert.studentCode }} - {{ alert.grade }} {{ alert.section }} -
                  {{ alert.shift === 'morning' ? 'Mañana' : 'Tarde' }}
                </q-item-label>
                <q-item-label class="q-mt-sm text-body2">
                  {{ alert.description }}
                </q-item-label>
                <div class="alert-date-row q-mt-sm">
                  <q-chip
                    v-for="date in alert.recentDates"
                    :key="`${alert.studentId}-${alert.alertType}-${date}`"
                    dense
                    color="grey-2"
                    text-color="grey-8"
                  >
                    {{ formatAlertDate(date) }}
                  </q-chip>
                </div>
              </q-item-section>
              <q-item-section side top>
                <div class="alert-count-badge q-mb-sm">
                  {{ alert.count }}
                </div>
                <q-btn
                  flat
                  color="secondary"
                  class="support-action-btn"
                  label="Abrir ficha"
                  no-caps
                  @click="handleOpenAlertStudent(alert.studentId, alert.studentCode, alert.fullName)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="admin-card q-mt-lg">
        <q-card-section class="ui-card-body">
          <div class="row items-start justify-between q-col-gutter-lg">
            <div class="col-12 col-lg">
              <div class="ui-eyebrow">Búsqueda rápida</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                Buscar estudiante por código
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                Ubica un estudiante por su código y salta directamente a la ficha administrativa dentro de Estudiantes.
              </p>
            </div>
            <div class="col-12 col-lg-auto">
              <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="badge">
                Código único del estudiante
              </q-chip>
            </div>
          </div>

          <StatusBanner
            v-if="lookupFeedback"
            class="q-mt-lg"
            :variant="lookupFeedback.type"
            :title="lookupFeedback.title"
            :message="lookupFeedback.message"
          />

          <q-form class="support-filter-grid q-mt-lg" @submit="handleLookupStudent">
            <div class="col-12 col-lg-7">
              <q-input
                v-model="studentLookupCode"
                ref="studentLookupInputRef"
                label="Código del estudiante"
                outlined
                maxlength="32"
                :rules="[(value) => Boolean(value) || 'Ingresa el código del estudiante']"
                @update:model-value="lookupFeedback = null"
              >
                <template #prepend>
                  <q-icon name="badge" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-lg-5">
              <q-btn
                class="full-width"
                color="primary"
                label="Abrir ficha"
                no-caps
                type="submit"
                :loading="isLookingUpStudent"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
      </section>

      <section v-show="activeSection === 'attendance'" class="role-section-view q-mt-lg">
        <q-card flat bordered class="admin-card">
          <q-card-section class="ui-card-body">
            <div class="ui-eyebrow">Asistencia</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              Regularización, correcciones y reportes
            </div>
            <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
              Reúne la operación administrativa de asistencia sin mezclarla con la ficha institucional del estudiante.
            </p>
          </q-card-section>
        </q-card>

        <AttendanceRegularizationCard
          class="q-mt-lg"
          :active-school-year="institutionStore.settings?.activeSchoolYear ?? studentsFilters.schoolYear"
          :enabled-turns="institutionStore.settings?.enabledTurns ?? ['morning', 'afternoon']"
          :enabled-grades="institutionStore.settings?.enabledGrades ?? [1, 2, 3, 4, 5]"
          :sections-by-grade="institutionStore.settings?.sectionsByGrade ?? defaultSectionsByGrade"
          @open-student="handleOpenAlertStudent"
        />

        <AttendanceCorrectionCard
          class="q-mt-lg"
          :active-school-year="institutionStore.settings?.activeSchoolYear ?? studentsFilters.schoolYear"
          :enabled-turns="institutionStore.settings?.enabledTurns ?? ['morning', 'afternoon']"
          :enabled-grades="institutionStore.settings?.enabledGrades ?? [1, 2, 3, 4, 5]"
          :sections-by-grade="institutionStore.settings?.sectionsByGrade ?? defaultSectionsByGrade"
        />

        <q-card flat bordered class="admin-card q-mt-lg">
          <q-card-section class="ui-card-body">
            <div class="row items-start justify-between q-col-gutter-lg">
              <div class="col-12 col-lg">
                <div class="ui-eyebrow">Exportación de asistencia</div>
                <div class="text-subtitle1 text-weight-bold q-mt-sm">
                  Descargar CSV o Excel para revisión administrativa
                </div>
                <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                  Exporta una fecha o un rango corto del año escolar. Si dejas grado, sección o turno vacíos, la descarga incluirá todo lo que coincida con el rango seleccionado.
                </p>
              </div>
              <div class="col-12 col-lg-auto">
                <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="download">
                  CSV y Excel
                </q-chip>
              </div>
            </div>

            <StatusBanner
              v-if="attendanceExportFeedback"
              class="q-mt-lg"
              :variant="attendanceExportFeedback.type"
              :title="attendanceExportFeedback.title"
              :message="attendanceExportFeedback.message"
            />

            <q-form class="admin-form-stack q-mt-lg" @submit.prevent>
              <div class="row q-col-gutter-lg admin-form-row">
                <div class="col-12 col-sm-6 col-lg-3">
                  <q-input
                    v-model="attendanceExportFilters.from"
                    type="date"
                    label="Desde"
                    outlined
                  >
                    <template #prepend>
                      <q-icon name="event" />
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6 col-lg-3">
                  <q-input
                    v-model="attendanceExportFilters.to"
                    type="date"
                    label="Hasta"
                    outlined
                  >
                    <template #prepend>
                      <q-icon name="event" />
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6 col-lg-3">
                  <q-input
                    v-model.number="attendanceExportFilters.schoolYear"
                    type="number"
                    label="Año escolar"
                    outlined
                    min="2000"
                    max="2100"
                  >
                    <template #prepend>
                      <q-icon name="calendar_month" />
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6 col-lg-3">
                  <q-select
                    v-model="attendanceExportFilters.grade"
                    label="Grado"
                    outlined
                    clearable
                    emit-value
                    map-options
                    :options="enabledGradeOptions"
                    @update:model-value="handleAttendanceExportGradeChange"
                  >
                    <template #prepend>
                      <q-icon name="school" />
                    </template>
                  </q-select>
                </div>
              </div>

              <div class="row q-col-gutter-lg admin-form-row">
                <div class="col-12 col-sm-6 col-lg-4">
                  <q-select
                    v-model="attendanceExportFilters.section"
                    label="Sección"
                    outlined
                    clearable
                    emit-value
                    map-options
                    :options="attendanceExportSectionOptions"
                    :disable="!attendanceExportFilters.grade"
                  >
                    <template #prepend>
                      <q-icon name="groups" />
                    </template>
                  </q-select>
                </div>
                <div class="col-12 col-sm-6 col-lg-4">
                  <q-select
                    v-model="attendanceExportFilters.shift"
                    label="Turno"
                    outlined
                    clearable
                    emit-value
                    map-options
                    :options="enabledShiftOptions"
                  >
                    <template #prepend>
                      <q-icon name="schedule" />
                    </template>
                  </q-select>
                </div>
                <div class="col-12 col-lg-4">
                  <div class="export-actions">
                    <q-btn
                      outline
                      color="primary"
                      icon="download"
                      label="Exportar CSV"
                      no-caps
                      :loading="exportingAttendanceFormat === 'csv'"
                      @click="handleExportAttendance('csv')"
                    />
                    <q-btn
                      color="secondary"
                      icon="table_view"
                      label="Exportar Excel"
                      no-caps
                      :loading="exportingAttendanceFormat === 'xlsx'"
                      @click="handleExportAttendance('xlsx')"
                    />
                  </div>
                </div>
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <AttendanceMonthlyReportsCard
          class="q-mt-lg"
          :active-school-year="institutionStore.settings?.activeSchoolYear ?? studentsFilters.schoolYear"
          :enabled-turns="institutionStore.settings?.enabledTurns ?? ['morning', 'afternoon']"
          :enabled-grades="institutionStore.settings?.enabledGrades ?? [1, 2, 3, 4, 5]"
          :sections-by-grade="institutionStore.settings?.sectionsByGrade ?? defaultSectionsByGrade"
        />
      </section>

      <section v-show="activeSection === 'personal'" class="role-section-view q-mt-lg">
        <q-card flat bordered class="admin-card admin-users-card">
          <q-card-section class="ui-card-body">
            <div class="row items-start justify-between q-col-gutter-lg">
              <div class="col-12 col-lg">
                <div class="ui-eyebrow">Personal del colegio</div>
                <div class="text-subtitle1 text-weight-bold q-mt-sm">
                  Cuentas internas separadas del soporte estudiantil
                </div>
                <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                  Gestiona secretaría, auxiliares y tutores sin mezclar esta operación con
                  estudiantes, matrícula o soporte del alumnado.
                </p>
              </div>
              <div class="col-12 col-lg-auto">
                <q-btn
                  color="primary"
                  icon="person_add"
                  label="Registrar personal"
                  no-caps
                  @click="openCreatePersonnelDialog"
                />
              </div>
            </div>

            <div class="users-support-card__grid q-mt-lg">
              <div class="users-support-card__filters">
                <q-form class="admin-form-stack" @submit.prevent="loadUsers">
                  <q-input
                    v-model="usersFilters.search"
                    label="Buscar por nombre o usuario"
                    outlined
                    maxlength="120"
                  >
                    <template #prepend>
                      <q-icon name="search" />
                    </template>
                  </q-input>

                  <div class="row q-col-gutter-lg admin-form-row">
                    <div class="col-12 col-sm-6">
                      <q-select
                        v-model="usersFilters.role"
                        label="Rol"
                        outlined
                        clearable
                        emit-value
                        map-options
                        :options="personnelRoleOptions"
                      >
                        <template #prepend>
                          <q-icon name="group" />
                        </template>
                      </q-select>
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-select
                        v-model="usersFilters.activeStatus"
                        label="Estado"
                        outlined
                        clearable
                        emit-value
                        map-options
                        :options="activeStatusOptions"
                      >
                        <template #prepend>
                          <q-icon name="toggle_on" />
                        </template>
                      </q-select>
                    </div>
                  </div>

                  <div class="admin-form-actions__buttons-row">
                    <div class="admin-form-actions__buttons">
                      <q-btn flat color="primary" label="Limpiar" no-caps @click="resetUsersFilters" />
                      <q-btn
                        color="primary"
                        label="Buscar personal"
                        no-caps
                        type="submit"
                        :loading="isLoadingUsers"
                      />
                    </div>
                  </div>
                </q-form>
              </div>

              <div class="users-support-card__results">
                <StatusBanner
                  v-if="usersFeedback"
                  :variant="usersFeedback.type"
                  :title="usersFeedback.title"
                  :message="usersFeedback.message"
                />

                <div v-if="isLoadingUsers" class="column items-center q-py-xl q-gutter-md">
                  <q-spinner color="primary" size="34px" />
                  <span class="text-body2 text-grey-7">Cargando personal...</span>
                </div>

                <q-list
                  v-else-if="users.length > 0"
                  bordered
                  separator
                  class="rounded-borders support-list"
                >
                  <q-item v-for="user in users" :key="user.id" class="q-py-md">
                    <q-item-section>
                      <q-item-label class="text-weight-medium">{{ user.displayName }}</q-item-label>
                      <q-item-label caption>
                        {{ user.username }} - {{ roleLabels[user.role] }}
                      </q-item-label>
                      <q-item-label
                        v-if="user.role === 'tutor'"
                        caption
                        class="q-mt-xs"
                      >
                        {{ formatPersonnelAssignments(user) }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side top>
                      <q-chip
                        dense
                        :color="user.isActive ? 'red-1' : 'grey-3'"
                        :text-color="user.isActive ? 'red-10' : 'grey-8'"
                      >
                        {{ user.isActive ? 'Activo' : 'Inactivo' }}
                      </q-chip>
                      <q-chip
                        v-if="user.mustChangePassword"
                        dense
                        color="amber-1"
                        text-color="amber-10"
                      >
                        Cambio pendiente
                      </q-chip>
                      <div class="row q-gutter-sm q-mt-sm justify-end">
                        <q-btn
                          flat
                          color="primary"
                          label="Editar"
                          no-caps
                          @click="openEditPersonnelDialog(user)"
                        />
                        <q-btn
                          flat
                          color="secondary"
                          :label="user.isActive ? 'Desactivar' : 'Activar'"
                          no-caps
                          :loading="savingPersonnelUserId === user.id"
                          @click="handleTogglePersonnelStatus(user)"
                        />
                        <q-btn
                          v-if="canResetUser(user)"
                          flat
                          color="secondary"
                          label="Restablecer"
                          no-caps
                          @click="openUserResetDialog(user)"
                        />
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>

                <div
                  v-if="users.length > 0 && usersTotal > 20"
                  class="row justify-center q-mt-lg"
                >
                  <q-pagination
                    v-model="usersPage"
                    color="primary"
                    :max="Math.max(1, Math.ceil(usersTotal / 20))"
                    max-pages="7"
                    boundary-links
                  />
                </div>

                <div v-else-if="users.length === 0" class="text-center q-py-xl text-grey-7">
                  Todavía no hay cuentas internas con esos filtros.
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </section>

      <section v-show="activeSection === 'students'" class="role-section-view q-mt-lg">
        <StudentCreateCard
          :active-school-year="institutionStore.settings?.activeSchoolYear ?? studentsFilters.schoolYear"
          :enabled-turns="institutionStore.settings?.enabledTurns ?? ['morning', 'afternoon']"
          :enabled-grades="institutionStore.settings?.enabledGrades ?? [1, 2, 3, 4, 5]"
          :sections-by-grade="institutionStore.settings?.sectionsByGrade ?? defaultSectionsByGrade"
          :loading="isCreatingStudent"
          :feedback="studentCreateFeedback"
          @save="handleCreateStudent"
        />

        <q-card flat bordered class="admin-card q-mt-lg">
          <q-card-section class="ui-card-body">
            <div class="ui-eyebrow">Gestión de estudiantes</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              Listado, búsqueda y ficha administrativa
            </div>
            <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
              Filtra por código, nombre, grado, sección y turno. Desde aquí se abre la ficha institucional completa para corregir el año activo.
            </p>

            <q-form class="admin-form-stack q-mt-lg" @submit="loadStudents">
              <q-input
                v-model="studentsFilters.search"
                label="Buscar por nombre, código o documento"
                outlined
                maxlength="120"
              >
                <template #prepend>
                  <q-icon name="search" />
                </template>
              </q-input>

              <div class="row q-col-gutter-lg admin-form-row">
                <div class="col-12 col-sm-4">
                  <q-input
                    v-model.number="studentsFilters.schoolYear"
                    label="Año escolar"
                    outlined
                    type="number"
                    min="2000"
                    max="2100"
                  >
                    <template #prepend>
                      <q-icon name="calendar_month" />
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-4">
                  <q-select
                    v-model="studentsFilters.grade"
                    label="Grado"
                    outlined
                    clearable
                    emit-value
                    map-options
                    :options="enabledGradeOptions"
                    @update:model-value="handleStudentFilterGradeChange"
                  >
                    <template #prepend>
                      <q-icon name="school" />
                    </template>
                  </q-select>
                </div>
                <div class="col-12 col-sm-4">
                  <q-select
                    v-model="studentsFilters.section"
                    label="Sección"
                    outlined
                    clearable
                    emit-value
                    map-options
                    :options="studentFilterSectionOptions"
                  >
                    <template #prepend>
                      <q-icon name="groups" />
                    </template>
                  </q-select>
                </div>
              </div>

              <div class="row q-col-gutter-lg items-end admin-form-row">
                <div class="col-12 col-sm-6">
                  <q-select
                    v-model="studentsFilters.shift"
                    label="Turno"
                    outlined
                    clearable
                    emit-value
                    map-options
                    :options="enabledShiftOptions"
                  >
                    <template #prepend>
                      <q-icon name="schedule" />
                    </template>
                  </q-select>
                </div>
                <div class="col-12 col-sm-6 row items-center justify-between q-gutter-sm">
                  <q-btn
                    flat
                    color="primary"
                    label="Limpiar"
                    no-caps
                    @click="resetStudentsFilters"
                  />
                  <q-btn
                    color="primary"
                    label="Buscar estudiantes"
                    no-caps
                    type="submit"
                    :loading="isLoadingStudents"
                  />
                </div>
              </div>
            </q-form>

            <StatusBanner
              v-if="studentsFeedback"
              class="q-mt-lg"
              :variant="studentsFeedback.type"
              :title="studentsFeedback.title"
              :message="studentsFeedback.message"
            />

            <div v-if="isLoadingStudents" class="column items-center q-py-xl q-gutter-md">
              <q-spinner color="primary" size="34px" />
              <span class="text-body2 text-grey-7">Cargando estudiantes...</span>
            </div>

            <q-list
              v-else-if="students.length > 0 && isMobile"
              bordered
              separator
              class="rounded-borders q-mt-lg support-list"
            >
              <q-item v-for="student in students" :key="student.id" class="q-py-md">
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ student.fullName }}</q-item-label>
                  <q-item-label caption>
                    {{ student.code }} - {{ student.document || 'Sin documento' }}
                  </q-item-label>
                  <q-item-label class="q-mt-sm text-body2">
                    {{ formatStudentClassroom(student) }} - {{ student.isActive ? 'Activo' : 'Inactivo' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-btn
                    flat
                    color="secondary"
                    class="support-action-btn"
                    label="Abrir ficha"
                    no-caps
                    :loading="isLoadingStudentDetail && selectedStudent?.id === student.id"
                    @click="prefillStudentSupport(student)"
                  />
                </q-item-section>
              </q-item>
            </q-list>

            <div v-else-if="students.length > 0" class="table-wrap q-mt-lg">
              <q-markup-table flat separator="cell">
                <thead>
                  <tr>
                    <th class="text-left">Código</th>
                    <th class="text-left">Estudiante</th>
                    <th class="text-left">Documento</th>
                    <th class="text-left">Aula</th>
                    <th class="text-left">Estado</th>
                    <th class="text-left">Ficha</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="student in students" :key="student.id">
                    <td>{{ student.code }}</td>
                    <td>{{ student.fullName }}</td>
                    <td>{{ student.document || 'Sin documento' }}</td>
                    <td>{{ formatStudentClassroom(student) }}</td>
                    <td>{{ student.isActive ? 'Activo' : 'Inactivo' }}</td>
                    <td>
                      <q-btn
                        flat
                        color="secondary"
                        class="support-action-btn"
                        label="Abrir ficha"
                        no-caps
                        :loading="isLoadingStudentDetail && selectedStudent?.id === student.id"
                        @click="prefillStudentSupport(student)"
                      />
                    </td>
                  </tr>
                </tbody>
              </q-markup-table>
            </div>

            <div
              v-if="students.length > 0 && studentsTotal > 20"
              class="row justify-center q-mt-lg"
            >
              <q-pagination
                v-model="studentsPage"
                color="primary"
                :max="Math.max(1, Math.ceil(studentsTotal / 20))"
                max-pages="7"
                boundary-links
              />
            </div>

            <div v-else-if="students.length === 0" class="text-center q-py-xl text-grey-7">
              No se encontraron estudiantes con esos filtros.
            </div>
          </q-card-section>
        </q-card>

        <StudentFollowUpOverviewCard
          class="q-mt-lg"
          eyebrow="Seguimiento institucional"
          title="Incidencias y observaciones del alumnado"
          description="Supervisa el seguimiento tutorial e institucional del año activo y abre la ficha administrativa cuando necesites continuar un caso."
          :loading="isLoadingFollowUpsOverview"
          :feedback="followUpsOverviewFeedback"
          :response="followUpsOverview"
          :search="followUpsOverviewFilters.search"
          :record-type="followUpsOverviewFilters.recordType"
          :status="followUpsOverviewFilters.status"
          :grade="followUpsOverviewFilters.grade"
          :section="followUpsOverviewFilters.section"
          :shift="followUpsOverviewFilters.shift"
          :grade-options="enabledGradeOptions"
          :section-options="followUpsOverviewSectionOptions"
          :shift-options="enabledShiftOptions"
          :is-mobile="isMobile"
          @submit="loadFollowUpsOverview"
          @reset="resetFollowUpsOverviewFilters"
          @open-student="handleOpenStudentFromFollowUpOverview"
          @update:search="followUpsOverviewFilters.search = $event"
          @update:record-type="followUpsOverviewFilters.recordType = $event"
          @update:status="followUpsOverviewFilters.status = $event"
          @update:grade="followUpsOverviewFilters.grade = $event; handleFollowUpsOverviewGradeChange()"
          @update:section="followUpsOverviewFilters.section = $event"
          @update:shift="followUpsOverviewFilters.shift = $event"
          @update:page="followUpsOverview.page = $event"
        />
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
                Gestión administrativa integral
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                Revisa identidad, situación, contactos, consentimiento y seguimiento sin perder el contexto de la página administrativa.
              </p>
            </div>
            <div class="col-12 col-md-auto">
              <q-btn flat round dense icon="close" @click="closeStudentDialog" />
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="student-profile-dialog-card__body">
          <StatusBanner
            v-if="studentDetailFeedback"
            :variant="studentDetailFeedback.type"
            :title="studentDetailFeedback.title"
            :message="studentDetailFeedback.message"
          />

          <div v-if="isLoadingStudentDetail" class="ui-loading-state q-py-xl">
            <q-spinner color="primary" size="30px" />
            <span class="text-body2 text-grey-7">Cargando ficha del estudiante...</span>
          </div>

          <StudentSupportCard
            v-else-if="selectedStudent"
            :student="selectedStudent"
            :viewer-role="sessionStore.user?.role === 'secretary' ? 'secretary' : 'director'"
            :active-school-year="institutionStore.settings?.activeSchoolYear ?? studentsFilters.schoolYear"
            :enabled-turns="institutionStore.settings?.enabledTurns ?? ['morning', 'afternoon']"
            :enabled-grades="institutionStore.settings?.enabledGrades ?? [1, 2, 3, 4, 5]"
            :sections-by-grade="institutionStore.settings?.sectionsByGrade ?? defaultSectionsByGrade"
            :feedback="studentDetailFeedback"
            :situation-feedback="studentSituationFeedback"
            :consent-feedback="studentConsentFeedback"
            :contacts-feedback="studentContactsFeedback"
            :follow-ups-feedback="studentFollowUpsFeedback"
            :reset-loading="isResettingSelectedStudent"
            :save-loading="isSavingStudent"
            :situation-save-loading="isSavingStudentSituation"
            :consent-save-loading="isSavingStudentConsent"
            :contacts-save-loading="isSavingStudentContact"
            :follow-ups-save-loading="isSavingStudentFollowUp"
            :deleting-contact-id="deletingStudentContactId"
            @reset="handleResetSelectedStudent"
            @save="handleSaveStudent"
            @save-situation="handleSaveStudentSituation"
            @save-consent="handleSaveStudentConsent"
            @create-contact="handleCreateStudentContact"
            @update-contact="handleUpdateStudentContact"
            @remove-contact="handleDeleteStudentContact"
            @create-follow-up="handleCreateStudentFollowUp"
            @update-follow-up="handleUpdateStudentFollowUp"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="isPersonnelDialogOpen" persistent>
      <q-card class="admin-card" style="width: min(640px, 96vw)">
        <q-card-section class="ui-card-body">
          <div class="row items-start justify-between q-col-gutter-md">
            <div class="col">
              <div class="ui-eyebrow">Personal del colegio</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                {{ personnelDialogMode === 'create' ? 'Registrar cuenta interna' : 'Editar cuenta interna' }}
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                Mantén esta gestión separada de estudiantes y deja el cambio obligatorio activo
                cuando la cuenta use una contraseña temporal.
              </p>
            </div>
            <div class="col-auto">
              <q-btn flat round dense icon="close" @click="closePersonnelDialog" />
            </div>
          </div>

          <StatusBanner
            v-if="personnelDialogFeedback"
            class="q-mt-lg"
            :variant="personnelDialogFeedback.type"
            :title="personnelDialogFeedback.title"
            :message="personnelDialogFeedback.message"
          />

          <q-form class="q-gutter-md q-mt-lg" @submit.prevent="handleSavePersonnel">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  v-model="personnelForm.firstName"
                  label="Nombres"
                  outlined
                  maxlength="80"
                  :rules="[(value) => Boolean(value?.trim()) || 'Ingresa los nombres']"
                >
                  <template #prepend>
                    <q-icon name="person" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model="personnelForm.lastName"
                  label="Apellidos"
                  outlined
                  maxlength="120"
                  :rules="[(value) => Boolean(value?.trim()) || 'Ingresa los apellidos']"
                >
                  <template #prepend>
                    <q-icon name="badge" />
                  </template>
                </q-input>
              </div>
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  v-model="personnelForm.username"
                  label="Usuario"
                  outlined
                  maxlength="32"
                  :rules="[(value) => Boolean(value?.trim()) || 'Ingresa el usuario']"
                >
                  <template #prepend>
                    <q-icon name="alternate_email" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-6">
                <q-select
                  v-model="personnelForm.role"
                  label="Rol"
                  outlined
                  emit-value
                  map-options
                  :options="personnelRoleOptions"
                >
                  <template #prepend>
                    <q-icon name="manage_accounts" />
                  </template>
                </q-select>
              </div>
            </div>

            <div v-if="personnelForm.role === 'tutor'" class="q-gutter-md">
              <div class="row items-start justify-between q-col-gutter-md">
                <div class="col">
                  <div class="ui-eyebrow">Secciones asignadas</div>
                  <div class="text-subtitle2 text-weight-bold q-mt-sm">
                    Aulas a cargo del tutor
                  </div>
                  <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                    Define una o más secciones para limitar asistencia, alertas, fichas y comunicados.
                  </p>
                </div>
                <div class="col-auto">
                  <q-btn
                    flat
                    color="primary"
                    icon="add"
                    label="Agregar sección"
                    no-caps
                    @click="addTutorAssignmentRow()"
                  />
                </div>
              </div>

              <div
                v-if="tutorAssignmentRows.length === 0"
                class="student-operational-profile__empty-state"
              >
                <q-icon name="groups" size="22px" color="grey-6" />
                <div class="text-subtitle2 text-weight-bold text-grey-8">
                  Sin secciones asignadas
                </div>
                <p class="text-body2 text-grey-7 q-mb-none">
                  Puedes registrar la cuenta ahora o agregar sus aulas antes de guardar.
                </p>
              </div>

              <q-card
                v-for="row in tutorAssignmentRows"
                :key="row.id"
                flat
                bordered
                class="announcement-audience-row"
              >
                <q-card-section class="ui-card-body">
                  <div class="row q-col-gutter-md items-start">
                    <div class="col-12 col-md-3">
                      <q-input
                        v-model.number="row.schoolYear"
                        type="number"
                        label="Año escolar"
                        outlined
                        min="2000"
                        max="2100"
                      />
                    </div>
                    <div class="col-12 col-md-3">
                      <q-select
                        v-model="row.grade"
                        label="Grado"
                        outlined
                        emit-value
                        map-options
                        :options="enabledGradeOptions"
                        @update:model-value="handleTutorAssignmentGradeChange(row.id)"
                      />
                    </div>
                    <div class="col-12 col-md-3">
                      <q-select
                        v-model="row.section"
                        label="Sección"
                        outlined
                        emit-value
                        map-options
                        :options="getTutorAssignmentSectionOptions(row.grade)"
                        :disable="!row.grade"
                      />
                    </div>
                    <div class="col-12 col-md-2">
                      <q-select
                        v-model="row.shift"
                        label="Turno"
                        outlined
                        emit-value
                        map-options
                        :options="enabledShiftOptions"
                      />
                    </div>
                    <div class="col-12 col-md-1 row justify-end">
                      <q-btn
                        flat
                        round
                        color="negative"
                        icon="close"
                        @click="removeTutorAssignmentRow(row.id)"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div v-if="personnelDialogMode === 'create'" class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  v-model="personnelForm.temporaryPassword"
                  label="Contraseña temporal"
                  outlined
                  maxlength="128"
                  :type="showPersonnelTemporaryPassword ? 'text' : 'password'"
                  :rules="[
                    (value) => Boolean(value) || 'Ingresa la contraseña temporal',
                    (value) => value.length >= 8 || 'La contraseña debe tener al menos 8 caracteres',
                  ]"
                >
                  <template #prepend>
                    <q-icon name="lock_reset" />
                  </template>
                  <template #append>
                    <q-btn
                      flat
                      round
                      dense
                      type="button"
                      :icon="showPersonnelTemporaryPassword ? 'visibility_off' : 'visibility'"
                      @click="showPersonnelTemporaryPassword = !showPersonnelTemporaryPassword"
                    />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model="personnelForm.confirmTemporaryPassword"
                  label="Confirmar temporal"
                  outlined
                  maxlength="128"
                  :type="showPersonnelTemporaryConfirmPassword ? 'text' : 'password'"
                  :rules="[
                    (value) => Boolean(value) || 'Confirma la contraseña temporal',
                    (value) =>
                      value === personnelForm.temporaryPassword || 'Las contraseñas no coinciden',
                  ]"
                >
                  <template #prepend>
                    <q-icon name="verified_user" />
                  </template>
                  <template #append>
                    <q-btn
                      flat
                      round
                      dense
                      type="button"
                      :icon="showPersonnelTemporaryConfirmPassword ? 'visibility_off' : 'visibility'"
                      @click="showPersonnelTemporaryConfirmPassword = !showPersonnelTemporaryConfirmPassword"
                    />
                  </template>
                </q-input>
              </div>
            </div>

            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-md-6">
                <q-toggle
                  v-model="personnelForm.isActive"
                  color="primary"
                  keep-color
                  label="Cuenta activa"
                />
              </div>
              <div v-if="personnelDialogMode === 'create'" class="col-12 col-md-6">
                <q-toggle
                  v-model="personnelForm.mustChangePassword"
                  color="primary"
                  keep-color
                  label="Forzar cambio en el siguiente ingreso"
                />
              </div>
            </div>

            <div class="row justify-end q-gutter-sm">
              <q-btn flat color="primary" label="Cancelar" no-caps @click="closePersonnelDialog" />
              <q-btn
                color="primary"
                :label="personnelDialogMode === 'create' ? 'Registrar personal' : 'Guardar cambios'"
                no-caps
                type="submit"
                :loading="isSavingPersonnel"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="isUserResetDialogOpen" persistent>
      <q-card class="admin-card" style="width: min(560px, 96vw)">
        <q-card-section class="ui-card-body">
          <div class="row items-start justify-between q-col-gutter-md">
            <div class="col">
              <div class="ui-eyebrow">Restablecimiento administrativo</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                Contraseña temporal para {{ selectedUserForReset?.displayName ?? 'usuario' }}
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                El usuario quedará obligado a cambiar esta contraseña en su siguiente ingreso.
              </p>
            </div>
            <div class="col-auto">
              <q-btn flat round dense icon="close" @click="closeUserResetDialog" />
            </div>
          </div>

          <StatusBanner
            v-if="userResetFeedback"
            class="q-mt-lg"
            :variant="userResetFeedback.type"
            :title="userResetFeedback.title"
            :message="userResetFeedback.message"
          />

          <q-form class="q-gutter-md q-mt-lg" @submit.prevent="handleResetUserFromDialog">
            <q-input
              v-model="userResetForm.newPassword"
              label="Contraseña temporal"
              outlined
              maxlength="128"
              :type="showUserResetPassword ? 'text' : 'password'"
              :rules="[
                (value) => Boolean(value) || 'Ingresa la contraseña temporal',
                (value) => value.length >= 8 || 'La contraseña debe tener al menos 8 caracteres',
              ]"
            >
              <template #prepend>
                <q-icon name="lock_reset" />
              </template>
              <template #append>
                <q-btn
                  flat
                  round
                  dense
                  type="button"
                  :icon="showUserResetPassword ? 'visibility_off' : 'visibility'"
                  @click="showUserResetPassword = !showUserResetPassword"
                />
              </template>
            </q-input>

            <q-input
              v-model="userResetForm.confirmPassword"
              label="Confirmar temporal"
              outlined
              maxlength="128"
              :type="showUserResetConfirmPassword ? 'text' : 'password'"
              :rules="[
                (value) => Boolean(value) || 'Confirma la contraseña temporal',
                (value) => value === userResetForm.newPassword || 'Las contraseñas no coinciden',
              ]"
            >
              <template #prepend>
                <q-icon name="verified_user" />
              </template>
              <template #append>
                <q-btn
                  flat
                  round
                  dense
                  type="button"
                  :icon="showUserResetConfirmPassword ? 'visibility_off' : 'visibility'"
                  @click="showUserResetConfirmPassword = !showUserResetConfirmPassword"
                />
              </template>
            </q-input>

            <q-input
              v-model="userResetForm.reason"
              label="Motivo del restablecimiento"
              outlined
              maxlength="255"
              :rules="[(value) => Boolean(value?.trim()) || 'Ingresa el motivo del restablecimiento']"
            >
              <template #prepend>
                <q-icon name="edit_note" />
              </template>
            </q-input>

            <div class="row justify-end q-gutter-sm">
              <q-btn flat color="primary" label="Cancelar" no-caps @click="closeUserResetDialog" />
              <q-btn
                color="secondary"
                label="Restablecer contraseña"
                no-caps
                type="submit"
                :loading="isResettingUser"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import AttendanceCorrectionCard from 'components/admin/AttendanceCorrectionCard.vue';
import AttendanceRegularizationCard from 'components/admin/AttendanceRegularizationCard.vue';
import InstitutionSettingsCard from 'components/admin/InstitutionSettingsCard.vue';
import SchoolYearPreparationCard from 'components/admin/SchoolYearPreparationCard.vue';
import AttendanceMonthlyReportsCard from 'components/admin/AttendanceMonthlyReportsCard.vue';
import PasswordChangeCard from 'components/auth/PasswordChangeCard.vue';
import ResponsiveSectionNav, {
  type SectionNavItem,
} from 'components/navigation/ResponsiveSectionNav.vue';
import StudentCreateCard from 'components/admin/StudentCreateCard.vue';
import StudentSupportCard from 'components/admin/StudentSupportCard.vue';
import StudentFollowUpOverviewCard from 'components/student/StudentFollowUpOverviewCard.vue';
import PageIntroCard from 'components/ui/PageIntroCard.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import {
  exportAttendance,
  getAttendanceAlerts,
} from 'src/services/api/attendance-api';
import { getApiErrorMessage, getApiErrorStatus } from 'src/services/api/api-errors';
import { updateInstitutionSettings } from 'src/services/api/institution-api';
import {
  createStudent,
  createStudentContact,
  createStudentFollowUp,
  deleteStudentContact,
  getStudentByCode,
  getStudentFollowUpsOverview,
  getStudentInstitutionalProfile,
  getStudents,
  updateStudentConsent,
  updateStudentContact,
  updateStudentFollowUp,
  updateStudentSituation,
  updateStudentProfile,
} from 'src/services/api/students-api';
import {
  createPersonnelUser,
  getPersonnelUsers,
  resetUserPassword,
  updatePersonnelUser,
} from 'src/services/api/users-api';
import { useInstitutionStore } from 'src/stores/institution-store';
import { useSessionStore } from 'src/stores/session-store';
import type {
  AttendanceAlert,
  AttendanceAlertsSummary,
  AttendanceExportFormat,
  StudentShift,
} from 'src/types/attendance';
import type {
  ExecuteSchoolYearPreparationResponse,
  UpdateInstitutionSettingsPayload,
} from 'src/types/institution';
import type { ChangePasswordPayload, UserRole } from 'src/types/session';
import type {
  CreateStudentContactPayload,
  CreateStudentFollowUpPayload,
  CreateStudentPayload,
  StudentDetail,
  StudentFollowUpOverviewResponse,
  StudentFollowUpRecordType,
  StudentFollowUpStatus,
  StudentSummary,
  StudentsQuery,
  UpdateStudentConsentPayload,
  UpdateStudentContactPayload,
  UpdateStudentFollowUpPayload,
  UpdateStudentPayload,
  UpdateStudentSituationPayload,
} from 'src/types/students';
import type {
  CreatePersonnelUserPayload,
  ResetUserPasswordPayload,
  TutorAssignmentInput,
  TutorAssignmentSummary,
  UpdatePersonnelUserPayload,
  UserSummary,
  UsersQuery,
} from 'src/types/users';
import {
  getAttendanceAlertLabel,
  getAttendanceAlertTone,
} from 'src/utils/attendance-alerts';
import { downloadBlobFile } from 'src/utils/download-file';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

type InputFocusHandle = {
  focus: () => void;
};

const institutionStore = useInstitutionStore();
const sessionStore = useSessionStore();
const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const adminSectionValues = ['support', 'students', 'attendance', 'personal', 'settings'] as const;
type AdminSection = (typeof adminSectionValues)[number];
type PersonnelRole = Extract<UserRole, 'secretary' | 'auxiliary' | 'tutor'>;
type PersonnelDialogMode = 'create' | 'edit';
const defaultAdminSection: AdminSection = 'support';
const activeSection = ref<AdminSection>(defaultAdminSection);
const isMobile = computed(() => $q.screen.lt.md);
const isDirector = computed(() => sessionStore.user?.role === 'director');
const isStudentDialogSideSheet = computed(() => $q.screen.gt.md);
const isStudentDialogMaximized = computed(() => $q.screen.lt.md);

const adminSectionItems = computed<SectionNavItem[]>(() => [
  { value: 'support', label: 'Soporte', icon: 'support_agent' },
  { value: 'students', label: 'Estudiantes', icon: 'groups' },
  { value: 'attendance', label: 'Asistencia', icon: 'fact_check' },
  ...(isDirector.value
    ? ([{ value: 'personal', label: 'Personal', icon: 'badge' }] satisfies SectionNavItem[])
    : []),
  { value: 'settings', label: 'Configuración', icon: 'settings' },
]);

const roleLabels: Record<UserRole, string> = {
  director: 'Director',
  secretary: 'Secretaría',
  auxiliary: 'Auxiliar',
  tutor: 'Tutor',
  student: 'Estudiante',
};

const roleFilterOptions: Array<{ label: string; value: UserRole }> = [
  { label: 'Director', value: 'director' },
  { label: 'Secretaría', value: 'secretary' },
  { label: 'Auxiliar', value: 'auxiliary' },
  { label: 'Tutor', value: 'tutor' },
  { label: 'Estudiante', value: 'student' },
];

const personnelRoleOptions = roleFilterOptions.filter(
  (
    option,
  ): option is {
    label: string;
    value: PersonnelRole;
  } =>
    option.value === 'secretary' ||
    option.value === 'auxiliary' ||
    option.value === 'tutor',
);

const activeStatusOptions = [
  { label: 'Activos', value: 'active' },
  { label: 'Inactivos', value: 'inactive' },
] as const;

const defaultSectionsByGrade: Record<string, string[]> = {
  '1': ['A'],
  '2': ['A'],
  '3': ['A'],
  '4': ['A'],
  '5': ['A'],
};

const studentsFilters = reactive({
  search: '',
  schoolYear: new Date().getFullYear(),
  grade: undefined as number | undefined,
  section: undefined as string | undefined,
  shift: undefined as StudentShift | undefined,
});

const attendanceExportFilters = reactive({
  from: new Date().toISOString().slice(0, 10),
  to: new Date().toISOString().slice(0, 10),
  schoolYear: new Date().getFullYear(),
  grade: undefined as number | undefined,
  section: undefined as string | undefined,
  shift: undefined as StudentShift | undefined,
});

const attendanceAlertsFilters = reactive({
  schoolYear: new Date().getFullYear(),
  grade: undefined as number | undefined,
  section: undefined as string | undefined,
  shift: undefined as StudentShift | undefined,
  search: '',
});

const usersFilters = reactive({
  search: '',
  role: undefined as UserRole | undefined,
  activeStatus: undefined as 'active' | 'inactive' | undefined,
});
const followUpsOverviewFilters = reactive<{
  search: string;
  recordType: StudentFollowUpRecordType | null;
  status: StudentFollowUpStatus | null;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
}>({
  search: '',
  recordType: null,
  status: null,
  grade: null,
  section: null,
  shift: null,
});

const users = ref<UserSummary[]>([]);
const students = ref<StudentSummary[]>([]);
const usersTotal = ref(0);
const studentsTotal = ref(0);
const usersPage = ref(1);
const studentsPage = ref(1);
const isStudentDialogOpen = ref(false);
const attendanceAlerts = ref<AttendanceAlert[]>([]);
const attendanceAlertsSummary = ref<AttendanceAlertsSummary>({
  totalAlerts: 0,
  studentsWithAlerts: 0,
  consecutiveAbsenceAlerts: 0,
  repeatedIncompleteRecordAlerts: 0,
  repeatedLateEntryAlerts: 0,
});
const selectedStudent = ref<StudentDetail | null>(null);
const followUpsOverview = ref<StudentFollowUpOverviewResponse>({
  items: [],
  total: 0,
  page: 1,
  limit: 12,
});
const selectedUserForReset = ref<UserSummary | null>(null);
const selectedPersonnelUser = ref<UserSummary | null>(null);
const studentLookupCode = ref('');
const studentLookupInputRef = ref<InputFocusHandle | null>(null);
const isUserResetDialogOpen = ref(false);
const isPersonnelDialogOpen = ref(false);
const personnelDialogMode = ref<PersonnelDialogMode>('create');
const showUserResetPassword = ref(false);
const showUserResetConfirmPassword = ref(false);
const showPersonnelTemporaryPassword = ref(false);
const showPersonnelTemporaryConfirmPassword = ref(false);
const userResetForm = reactive({
  newPassword: '',
  confirmPassword: '',
  reason: '',
});
const personnelForm = reactive({
  firstName: '',
  lastName: '',
  username: '',
  role: 'auxiliary' as PersonnelRole,
  temporaryPassword: '',
  confirmTemporaryPassword: '',
  isActive: true,
  mustChangePassword: true,
});
const tutorAssignmentRows = ref<
  Array<{
    id: string;
    schoolYear: number;
    grade: number | null;
    section: string | null;
    shift: StudentShift | null;
  }>
>([]);

const isSavingSettings = ref(false);
const isLoadingUsers = ref(false);
const isLoadingStudents = ref(false);
const isCreatingStudent = ref(false);
const isLookingUpStudent = ref(false);
const isLoadingStudentDetail = ref(false);
const isSavingStudent = ref(false);
const isSavingStudentSituation = ref(false);
const isSavingStudentConsent = ref(false);
const isSavingStudentContact = ref(false);
const isSavingStudentFollowUp = ref(false);
const isLoadingFollowUpsOverview = ref(false);
const isResettingSelectedStudent = ref(false);
const isChangingOwnPassword = ref(false);
const isResettingUser = ref(false);
const isSavingPersonnel = ref(false);
const savingPersonnelUserId = ref<string | null>(null);
const deletingStudentContactId = ref<string | null>(null);
const exportingAttendanceFormat = ref<AttendanceExportFormat | null>(null);
const isLoadingAttendanceAlerts = ref(false);

const settingsFeedback = ref<FeedbackState | null>(null);
const usersFeedback = ref<FeedbackState | null>(null);
const studentsFeedback = ref<FeedbackState | null>(null);
const studentCreateFeedback = ref<FeedbackState | null>(null);
const lookupFeedback = ref<FeedbackState | null>(null);
const studentDetailFeedback = ref<FeedbackState | null>(null);
const studentSituationFeedback = ref<FeedbackState | null>(null);
const studentConsentFeedback = ref<FeedbackState | null>(null);
const studentContactsFeedback = ref<FeedbackState | null>(null);
const studentFollowUpsFeedback = ref<FeedbackState | null>(null);
const followUpsOverviewFeedback = ref<FeedbackState | null>(null);
const attendanceExportFeedback = ref<FeedbackState | null>(null);
const accountPasswordFeedback = ref<FeedbackState | null>(null);
const userResetFeedback = ref<FeedbackState | null>(null);
const attendanceAlertsFeedback = ref<FeedbackState | null>(null);
const personnelDialogFeedback = ref<FeedbackState | null>(null);

const enabledShiftOptions = computed(() => {
  const enabledTurns =
    institutionStore.settings?.enabledTurns ?? ['morning', 'afternoon'];

  return enabledTurns.map((shift) => ({
    label: shift === 'morning' ? 'Turno mañana' : 'Turno tarde',
    value: shift,
  }));
});

const enabledGradeOptions = computed(() => {
  const enabledGrades = institutionStore.settings?.enabledGrades ?? [1, 2, 3, 4, 5];

  return enabledGrades.map((grade) => ({
    label: `${grade} grado`,
    value: grade,
  }));
});

const studentFilterSectionOptions = computed(() => {
  if (!studentsFilters.grade) {
    return [];
  }

  const availableSections =
    institutionStore.settings?.sectionsByGrade[String(studentsFilters.grade)] ?? [];

  return availableSections.map((section) => ({
    label: section,
    value: section,
  }));
});

const attendanceExportSectionOptions = computed(() => {
  if (!attendanceExportFilters.grade) {
    return [];
  }

  const availableSections =
    institutionStore.settings?.sectionsByGrade[
      String(attendanceExportFilters.grade)
    ] ?? [];

  return availableSections.map((section) => ({
    label: section,
    value: section,
  }));
});

const attendanceAlertsSectionOptions = computed(() => {
  if (!attendanceAlertsFilters.grade) {
    return [];
  }

  const availableSections =
    institutionStore.settings?.sectionsByGrade[
      String(attendanceAlertsFilters.grade)
    ] ?? [];

  return availableSections.map((section) => ({
    label: section,
    value: section,
  }));
});

const followUpsOverviewSectionOptions = computed(() => {
  if (!followUpsOverviewFilters.grade) {
    return [];
  }

  const availableSections =
    institutionStore.settings?.sectionsByGrade[
      String(followUpsOverviewFilters.grade)
    ] ?? [];

  return availableSections.map((section) => ({
    label: section,
    value: section,
  }));
});

function createTutorAssignmentRow(
  assignment?: TutorAssignmentSummary | TutorAssignmentInput,
): {
  id: string;
  schoolYear: number;
  grade: number | null;
  section: string | null;
  shift: StudentShift | null;
} {
  return {
    id: assignment && 'id' in assignment ? assignment.id : Math.random().toString(36).slice(2, 10),
    schoolYear:
      assignment?.schoolYear ??
      (institutionStore.settings?.activeSchoolYear ?? new Date().getFullYear()),
    grade: assignment?.grade ?? null,
    section: assignment?.section ?? null,
    shift: assignment?.shift ?? null,
  };
}

function resetTutorAssignmentRows(): void {
  tutorAssignmentRows.value = [];
}

function addTutorAssignmentRow(
  assignment?: TutorAssignmentSummary | TutorAssignmentInput,
): void {
  tutorAssignmentRows.value.push(createTutorAssignmentRow(assignment));
}

function removeTutorAssignmentRow(rowId: string): void {
  tutorAssignmentRows.value = tutorAssignmentRows.value.filter((row) => row.id !== rowId);
}

function getTutorAssignmentSectionOptions(
  grade: number | null,
): Array<{ label: string; value: string }> {
  if (!grade) {
    return [];
  }

  const sections = institutionStore.settings?.sectionsByGrade[String(grade)] ?? [];

  return sections.map((section) => ({
    label: section,
    value: section,
  }));
}

function handleTutorAssignmentGradeChange(rowId: string): void {
  const row = tutorAssignmentRows.value.find((item) => item.id === rowId);

  if (!row) {
    return;
  }

  const allowedSections = getTutorAssignmentSectionOptions(row.grade).map(
    (option) => option.value,
  );

  if (!row.section || !allowedSections.includes(row.section)) {
    row.section = allowedSections[0] ?? null;
  }
}

function buildTutorAssignmentsPayload(): TutorAssignmentInput[] {
  if (personnelForm.role !== 'tutor') {
    return [];
  }

  if (tutorAssignmentRows.value.length === 0) {
    personnelDialogFeedback.value = {
      type: 'warning',
      title: 'Asignación requerida',
      message: 'Agrega al menos una sección para la cuenta de tutor.',
    };
    return [];
  }

  for (const row of tutorAssignmentRows.value) {
    if (
      typeof row.schoolYear !== 'number' ||
      typeof row.grade !== 'number' ||
      !row.section ||
      !row.shift
    ) {
      personnelDialogFeedback.value = {
        type: 'warning',
        title: 'Asignación incompleta',
        message: 'Completa año escolar, grado, sección y turno en cada asignación del tutor.',
      };
      return [];
    }
  }

  return tutorAssignmentRows.value.map((row) => ({
    schoolYear: row.schoolYear,
    grade: row.grade as number,
    section: row.section as string,
    shift: row.shift as StudentShift,
  }));
}

function resetPersonnelForm(): void {
  personnelForm.firstName = '';
  personnelForm.lastName = '';
  personnelForm.username = '';
  personnelForm.role = 'auxiliary';
  personnelForm.temporaryPassword = '';
  personnelForm.confirmTemporaryPassword = '';
  personnelForm.isActive = true;
  personnelForm.mustChangePassword = true;
  resetTutorAssignmentRows();
  showPersonnelTemporaryPassword.value = false;
  showPersonnelTemporaryConfirmPassword.value = false;
}

function derivePersonnelNameParts(user: UserSummary): {
  firstName: string;
  lastName: string;
} {
  const normalizedFirstName = user.firstName?.trim() ?? '';
  const normalizedLastName = user.lastName?.trim() ?? '';

  if (normalizedFirstName || normalizedLastName) {
    return {
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
    };
  }

  const parts = user.displayName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? user.displayName.trim(),
    lastName: parts.slice(1).join(' '),
  };
}

function toPersonnelRole(role: UserRole): PersonnelRole | null {
  if (role === 'secretary' || role === 'auxiliary' || role === 'tutor') {
    return role;
  }

  return null;
}

function normalizeAdminSection(value: unknown): AdminSection {
  if (
    typeof value === 'string' &&
    adminSectionValues.includes(value as AdminSection)
  ) {
    if (value === 'personal' && !isDirector.value) {
      return defaultAdminSection;
    }

    return value as AdminSection;
  }

  return defaultAdminSection;
}

function syncAdminSectionQuery(section: AdminSection): void {
  const nextQuery = { ...route.query };

  if (section === defaultAdminSection) {
    delete nextQuery.section;
  } else {
    nextQuery.section = section;
  }

  void router.replace({
    query: nextQuery,
  });
}

function goToAdminSection(section: AdminSection): void {
  activeSection.value = section;
  void nextTick(() => {
    window.scrollTo({
      top: 0,
      behavior: isMobile.value ? 'smooth' : 'auto',
    });
  });
}

function closeStudentDialog(): void {
  isStudentDialogOpen.value = false;
  isLoadingStudentDetail.value = false;
  selectedStudent.value = null;
  studentDetailFeedback.value = null;
  studentSituationFeedback.value = null;
  studentConsentFeedback.value = null;
  studentContactsFeedback.value = null;
  studentFollowUpsFeedback.value = null;
}

function buildUsersQuery(): UsersQuery {
  const query: UsersQuery = {
    page: usersPage.value,
    limit: 20,
  };

  if (usersFilters.search.trim()) {
    query.search = usersFilters.search.trim();
  }

  if (usersFilters.role) {
    query.role = usersFilters.role;
  }

  if (usersFilters.activeStatus === 'active') {
    query.isActive = true;
  }

  if (usersFilters.activeStatus === 'inactive') {
    query.isActive = false;
  }

  return query;
}

function buildStudentsQuery(): StudentsQuery {
  const query: StudentsQuery = {
    page: studentsPage.value,
    limit: 20,
    schoolYear: studentsFilters.schoolYear,
  };

  if (studentsFilters.grade) {
    query.grade = studentsFilters.grade;
  }

  if (studentsFilters.section) {
    query.section = studentsFilters.section;
  }

  if (studentsFilters.shift) {
    query.shift = studentsFilters.shift;
  }

  if (studentsFilters.search.trim()) {
    query.search = studentsFilters.search.trim();
  }

  return query;
}

function buildFollowUpsOverviewQuery() {
  const query: {
    page: number;
    limit: number;
    schoolYear: number;
    search?: string;
    recordType?: StudentFollowUpRecordType;
    status?: StudentFollowUpStatus;
    grade?: number;
    section?: string;
    shift?: StudentShift;
  } = {
    page: followUpsOverview.value.page,
    limit: followUpsOverview.value.limit,
    schoolYear:
      institutionStore.settings?.activeSchoolYear ?? studentsFilters.schoolYear,
  };

  if (followUpsOverviewFilters.search.trim()) {
    query.search = followUpsOverviewFilters.search.trim();
  }

  if (followUpsOverviewFilters.recordType) {
    query.recordType = followUpsOverviewFilters.recordType;
  }

  if (followUpsOverviewFilters.status) {
    query.status = followUpsOverviewFilters.status;
  }

  if (typeof followUpsOverviewFilters.grade === 'number') {
    query.grade = followUpsOverviewFilters.grade;
  }

  if (followUpsOverviewFilters.section) {
    query.section = followUpsOverviewFilters.section;
  }

  if (followUpsOverviewFilters.shift) {
    query.shift = followUpsOverviewFilters.shift;
  }

  return query;
}

function formatStudentClassroom(student: StudentSummary): string {
  if (student.grade === null || !student.section || !student.shift) {
    return 'Sin asignación vigente';
  }

  return `${student.grade} ${student.section} - ${
    student.shift === 'morning' ? 'Mañana' : 'Tarde'
  }`;
}

function formatAlertDate(date: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(`${date}T00:00:00`));
}

function formatPersonnelAssignments(user: UserSummary): string {
  const assignments = user.assignments ?? [];

  if (assignments.length === 0) {
    return 'Sin secciones asignadas todavía.';
  }

  return assignments
    .map(
      (assignment) =>
        `${assignment.schoolYear} · ${assignment.grade} ${assignment.section} · ${
          assignment.shift === 'morning' ? 'Mañana' : 'Tarde'
        }`,
    )
    .join(' | ');
}

function openCreatePersonnelDialog(): void {
  if (!isDirector.value) {
    return;
  }

  personnelDialogMode.value = 'create';
  selectedPersonnelUser.value = null;
  personnelDialogFeedback.value = null;
  resetPersonnelForm();
  isPersonnelDialogOpen.value = true;
}

function openEditPersonnelDialog(user: UserSummary): void {
  if (!isDirector.value) {
    return;
  }

  const role = toPersonnelRole(user.role);

  if (!role) {
    usersFeedback.value = {
      type: 'warning',
      title: 'Rol no disponible',
      message:
        'Solo se pueden editar cuentas internas de secretaría, auxiliares y tutores desde este módulo.',
    };
    return;
  }

  const nameParts = derivePersonnelNameParts(user);

  personnelDialogMode.value = 'edit';
  selectedPersonnelUser.value = user;
  personnelDialogFeedback.value = null;
  resetPersonnelForm();
  personnelForm.firstName = nameParts.firstName;
  personnelForm.lastName = nameParts.lastName;
  personnelForm.username = user.username;
  personnelForm.role = role;
  personnelForm.isActive = user.isActive;
  if (role === 'tutor') {
    resetTutorAssignmentRows();
    const assignments = user.assignments ?? [];

    if (assignments.length === 0) {
      addTutorAssignmentRow();
    } else {
      assignments.forEach((assignment) => addTutorAssignmentRow(assignment));
    }
  }
  isPersonnelDialogOpen.value = true;
}

function closePersonnelDialog(): void {
  isPersonnelDialogOpen.value = false;
  selectedPersonnelUser.value = null;
  personnelDialogFeedback.value = null;
  resetPersonnelForm();
}

async function loadUsers(): Promise<void> {
  if (!isDirector.value) {
    users.value = [];
    usersFeedback.value = null;
    return;
  }

  usersFeedback.value = null;
  isLoadingUsers.value = true;

  try {
    const response = await getPersonnelUsers(buildUsersQuery());
    users.value = response.items;
    usersTotal.value = response.total;
  } catch (error) {
    users.value = [];
    usersTotal.value = 0;
    usersFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar el personal',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingUsers.value = false;
  }
}

async function loadStudents(): Promise<void> {
  studentsFeedback.value = null;
  isLoadingStudents.value = true;

  try {
    const response = await getStudents(buildStudentsQuery());
    students.value = response.items;
    studentsTotal.value = response.total;
  } catch (error) {
    students.value = [];
    studentsTotal.value = 0;
    studentsFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar la lista de estudiantes',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingStudents.value = false;
  }
}

async function loadFollowUpsOverview(): Promise<void> {
  followUpsOverviewFeedback.value = null;
  isLoadingFollowUpsOverview.value = true;

  try {
    followUpsOverview.value = await getStudentFollowUpsOverview(
      buildFollowUpsOverviewQuery(),
    );
  } catch (error) {
    followUpsOverview.value = {
      items: [],
      total: 0,
      page: followUpsOverview.value.page,
      limit: followUpsOverview.value.limit,
    };
    followUpsOverviewFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar el seguimiento institucional',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingFollowUpsOverview.value = false;
  }
}

async function loadAttendanceAlerts(): Promise<void> {
  attendanceAlertsFeedback.value = null;
  isLoadingAttendanceAlerts.value = true;

  try {
    const query: {
      schoolYear: number;
      grade?: number;
      section?: string;
      shift?: StudentShift;
      search?: string;
      limit: number;
    } = {
      schoolYear: attendanceAlertsFilters.schoolYear,
      limit: 50,
    };

    if (typeof attendanceAlertsFilters.grade === 'number') {
      query.grade = attendanceAlertsFilters.grade;
    }

    if (attendanceAlertsFilters.section) {
      query.section = attendanceAlertsFilters.section;
    }

    if (attendanceAlertsFilters.shift) {
      query.shift = attendanceAlertsFilters.shift;
    }

    if (attendanceAlertsFilters.search.trim()) {
      query.search = attendanceAlertsFilters.search.trim();
    }

    const response = await getAttendanceAlerts(query);
    attendanceAlerts.value = response.items;
    attendanceAlertsSummary.value = response.summary;
  } catch (error) {
    attendanceAlerts.value = [];
    attendanceAlertsSummary.value = {
      totalAlerts: 0,
      studentsWithAlerts: 0,
      consecutiveAbsenceAlerts: 0,
      repeatedIncompleteRecordAlerts: 0,
      repeatedLateEntryAlerts: 0,
    };
    attendanceAlertsFeedback.value = {
      type: 'error',
      title: 'No se pudieron cargar las alertas',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingAttendanceAlerts.value = false;
  }
}

async function loadStudentDetail(studentId: string): Promise<void> {
  isStudentDialogOpen.value = true;
  studentDetailFeedback.value = null;
  studentSituationFeedback.value = null;
  studentConsentFeedback.value = null;
  studentContactsFeedback.value = null;
  studentFollowUpsFeedback.value = null;
  selectedStudent.value = null;
  isLoadingStudentDetail.value = true;

  try {
    selectedStudent.value = await getStudentInstitutionalProfile(studentId);
  } catch (error) {
    studentDetailFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar el detalle del estudiante',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingStudentDetail.value = false;
  }
}

async function handleLookupStudent(): Promise<void> {
  lookupFeedback.value = null;
  studentLookupCode.value = studentLookupCode.value.trim().toLowerCase();

  if (!studentLookupCode.value) {
    lookupFeedback.value = {
      type: 'warning',
      title: 'Código requerido',
      message: 'Ingresa un código de estudiante para realizar la búsqueda.',
    };
    void nextTick(() => {
      studentLookupInputRef.value?.focus();
    });
    return;
  }

  isLookingUpStudent.value = true;

  try {
    const student = await getStudentByCode(studentLookupCode.value);
    await loadStudentDetail(student.id);
    goToAdminSection('students');
    lookupFeedback.value = {
      type: 'success',
      title: 'Estudiante encontrado',
      message: `Estudiante encontrado: ${student.fullName}.`,
    };
  } catch (error) {
    const status = getApiErrorStatus(error);
    lookupFeedback.value = {
      type: 'error',
      title: status === 404 ? 'Código no encontrado' : 'No se pudo buscar al estudiante',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLookingUpStudent.value = false;
    void nextTick(() => {
      studentLookupInputRef.value?.focus();
    });
  }
}

async function prefillStudentSupport(student: StudentSummary): Promise<void> {
  goToAdminSection('students');
  studentLookupCode.value = student.code;
  lookupFeedback.value = {
    type: 'info',
    title: 'Ficha preparada',
    message: `Cargando el detalle de ${student.fullName}.`,
  };
  await loadStudentDetail(student.id);
}

async function handleOpenAlertStudent(
  studentId: string,
  code: string,
  fullName: string,
): Promise<void> {
  goToAdminSection('students');
  studentLookupCode.value = code;
  lookupFeedback.value = {
    type: 'info',
    title: 'Ficha preparada',
    message: `Cargando el detalle de ${fullName}.`,
  };
  await loadStudentDetail(studentId);
}

async function handleOpenStudentFromFollowUpOverview(
  studentId: string,
): Promise<void> {
  const item = followUpsOverview.value.items.find(
    (currentItem) => currentItem.studentId === studentId,
  );

  await handleOpenAlertStudent(
    studentId,
    item?.studentCode ?? '',
    item?.studentFullName ?? 'el estudiante seleccionado',
  );
}

async function handleSaveSettings(
  payload: UpdateInstitutionSettingsPayload,
): Promise<void> {
  settingsFeedback.value = null;

  if (!payload.schoolName.trim()) {
    settingsFeedback.value = {
      type: 'warning',
      title: 'Nombre requerido',
      message: 'Ingresa el nombre del colegio.',
    };
    return;
  }

  const hasInvalidSections = payload.enabledGrades.some(
    (grade) => (payload.sectionsByGrade[String(grade)] ?? []).length === 0,
  );

  if (
    payload.enabledTurns.length === 0 ||
    payload.enabledGrades.length === 0 ||
    hasInvalidSections
  ) {
    settingsFeedback.value = {
      type: 'warning',
      title: 'Configuración incompleta',
      message:
        'Debes definir al menos un turno, un grado y una sección por cada grado habilitado.',
    };
    return;
  }

  isSavingSettings.value = true;

  try {
    const response = await updateInstitutionSettings(payload);
    institutionStore.applySettings(response);
    studentsFilters.schoolYear = response.activeSchoolYear;
    attendanceExportFilters.schoolYear = response.activeSchoolYear;
    settingsFeedback.value = {
      type: 'success',
      title: 'Configuración guardada',
      message:
        'La configuración institucional fue actualizada correctamente.',
    };
    await loadStudents();
  } catch (error) {
    settingsFeedback.value = {
      type: 'error',
      title: 'No se pudo guardar la configuración',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSavingSettings.value = false;
  }
}

async function handleSchoolYearPrepared(
  response: ExecuteSchoolYearPreparationResponse,
): Promise<void> {
  institutionStore.applySettings(response.settings);
  studentsFilters.schoolYear = response.settings.activeSchoolYear;
  attendanceExportFilters.schoolYear = response.settings.activeSchoolYear;
  attendanceAlertsFilters.schoolYear = response.settings.activeSchoolYear;
  followUpsOverview.value.page = 1;
  usersPage.value = 1;
  studentsPage.value = 1;

  closeStudentDialog();

  await Promise.allSettled([
    loadStudents(),
    loadAttendanceAlerts(),
    loadFollowUpsOverview(),
  ]);
}

async function handleSaveStudent(payload: UpdateStudentPayload): Promise<void> {
  if (!selectedStudent.value) {
    return;
  }

  studentDetailFeedback.value = null;

  if (!payload.firstName || !payload.lastName) {
    studentDetailFeedback.value = {
      type: 'warning',
      title: 'Datos incompletos',
      message: 'Ingresa nombres y apellidos del estudiante.',
    };
    return;
  }

  isSavingStudent.value = true;

  try {
    selectedStudent.value = await updateStudentProfile(selectedStudent.value.id, payload);
    studentDetailFeedback.value = {
      type: 'success',
      title: 'Datos actualizados',
      message:
        'Los datos del estudiante y su asignación del año activo se actualizaron correctamente.',
    };
    await Promise.all([loadStudents(), loadUsers()]);
  } catch (error) {
    studentDetailFeedback.value = {
      type: 'error',
      title: 'No se pudo guardar la corrección',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSavingStudent.value = false;
  }
}

async function handleSaveStudentSituation(
  payload: UpdateStudentSituationPayload,
): Promise<void> {
  if (!selectedStudent.value) {
    return;
  }

  studentSituationFeedback.value = null;
  isSavingStudentSituation.value = true;

  try {
    await updateStudentSituation(selectedStudent.value.id, payload);
    selectedStudent.value = await getStudentInstitutionalProfile(selectedStudent.value.id);
    studentSituationFeedback.value = {
      type: 'success',
      title: 'Situación actualizada',
      message: 'La situación administrativa del estudiante quedó registrada correctamente.',
    };
    await loadStudents();
  } catch (error) {
    studentSituationFeedback.value = {
      type: 'error',
      title: 'No se pudo actualizar la situación',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSavingStudentSituation.value = false;
  }
}

async function handleSaveStudentConsent(
  payload: UpdateStudentConsentPayload,
): Promise<void> {
  if (!selectedStudent.value) {
    return;
  }

  studentConsentFeedback.value = null;
  isSavingStudentConsent.value = true;

  try {
    await updateStudentConsent(selectedStudent.value.id, payload);
    selectedStudent.value = await getStudentInstitutionalProfile(selectedStudent.value.id);
    studentConsentFeedback.value = {
      type: 'success',
      title: 'Consentimiento actualizado',
      message: 'El registro administrativo de consentimiento quedó actualizado.',
    };
  } catch (error) {
    studentConsentFeedback.value = {
      type: 'error',
      title: 'No se pudo guardar el consentimiento',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSavingStudentConsent.value = false;
  }
}

async function handleCreateStudentContact(
  payload: CreateStudentContactPayload,
): Promise<void> {
  if (!selectedStudent.value) {
    return;
  }

  studentContactsFeedback.value = null;

  if (!payload.fullName || !payload.relationship || !payload.phonePrimary) {
    studentContactsFeedback.value = {
      type: 'warning',
      title: 'Contacto incompleto',
      message: 'Ingresa nombre completo, relación y teléfono principal.',
    };
    return;
  }

  isSavingStudentContact.value = true;

  try {
    await createStudentContact(selectedStudent.value.id, payload);
    selectedStudent.value = await getStudentInstitutionalProfile(selectedStudent.value.id);
    studentContactsFeedback.value = {
      type: 'success',
      title: 'Contacto registrado',
      message: 'El contacto familiar quedó asociado al estudiante.',
    };
  } catch (error) {
    studentContactsFeedback.value = {
      type: 'error',
      title: 'No se pudo registrar el contacto',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSavingStudentContact.value = false;
  }
}

async function handleUpdateStudentContact(
  contactId: string,
  payload: UpdateStudentContactPayload,
): Promise<void> {
  if (!selectedStudent.value) {
    return;
  }

  studentContactsFeedback.value = null;
  isSavingStudentContact.value = true;

  try {
    await updateStudentContact(
      selectedStudent.value.id,
      contactId,
      payload,
    );
    selectedStudent.value = await getStudentInstitutionalProfile(selectedStudent.value.id);
    studentContactsFeedback.value = {
      type: 'success',
      title: 'Contacto actualizado',
      message: 'Los datos del contacto fueron actualizados correctamente.',
    };
  } catch (error) {
    studentContactsFeedback.value = {
      type: 'error',
      title: 'No se pudo actualizar el contacto',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSavingStudentContact.value = false;
  }
}

async function handleDeleteStudentContact(contactId: string): Promise<void> {
  if (!selectedStudent.value) {
    return;
  }

  studentContactsFeedback.value = null;
  deletingStudentContactId.value = contactId;

  try {
    await deleteStudentContact(selectedStudent.value.id, contactId);
    selectedStudent.value = await getStudentInstitutionalProfile(selectedStudent.value.id);
    studentContactsFeedback.value = {
      type: 'success',
      title: 'Contacto desactivado',
      message: 'El contacto dejó de mostrarse en la ficha activa del estudiante.',
    };
  } catch (error) {
    studentContactsFeedback.value = {
      type: 'error',
      title: 'No se pudo desactivar el contacto',
      message: getApiErrorMessage(error),
    };
  } finally {
    deletingStudentContactId.value = null;
  }
}

async function handleCreateStudentFollowUp(
  payload: CreateStudentFollowUpPayload,
): Promise<void> {
  if (!selectedStudent.value) {
    return;
  }

  studentFollowUpsFeedback.value = null;
  isSavingStudentFollowUp.value = true;

  try {
    await createStudentFollowUp(selectedStudent.value.id, payload);
    selectedStudent.value = await getStudentInstitutionalProfile(selectedStudent.value.id);
    studentFollowUpsFeedback.value = {
      type: 'success',
      title: payload.recordType === 'incident' ? 'Incidencia registrada' : 'Observación registrada',
      message: 'El registro quedó guardado en el historial institucional del estudiante.',
    };
  } catch (error) {
    studentFollowUpsFeedback.value = {
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
  if (!selectedStudent.value) {
    return;
  }

  studentFollowUpsFeedback.value = null;
  isSavingStudentFollowUp.value = true;

  try {
    await updateStudentFollowUp(selectedStudent.value.id, followUpId, payload);
    selectedStudent.value = await getStudentInstitutionalProfile(selectedStudent.value.id);
    studentFollowUpsFeedback.value = {
      type: 'success',
      title: 'Seguimiento actualizado',
      message: 'El historial tutorial e institucional fue actualizado correctamente.',
    };
  } catch (error) {
    studentFollowUpsFeedback.value = {
      type: 'error',
      title: 'No se pudo actualizar el seguimiento',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSavingStudentFollowUp.value = false;
  }
}

async function handleCreateStudent(payload: CreateStudentPayload): Promise<void> {
  studentCreateFeedback.value = null;

  if (!payload.code || !payload.firstName || !payload.lastName) {
    studentCreateFeedback.value = {
      type: 'warning',
      title: 'Datos incompletos',
      message: 'Ingresa código, nombres y apellidos para registrar al estudiante.',
    };
    return;
  }

  isCreatingStudent.value = true;

  try {
    const createdStudent = await createStudent(payload);
    goToAdminSection('students');
    selectedStudent.value = createdStudent;
    isStudentDialogOpen.value = true;
    studentLookupCode.value = createdStudent.code;
    studentCreateFeedback.value = {
      type: 'success',
      title: 'Estudiante registrado',
      message:
        'La cuenta se creó correctamente y quedó lista para el cambio inicial de contraseña.',
    };
    studentDetailFeedback.value = {
      type: 'info',
      title: 'Ficha preparada',
      message: `Ya puedes continuar corrigiendo o revisando a ${createdStudent.fullName}.`,
    };
    await Promise.all([loadStudents(), loadUsers()]);
  } catch (error) {
    studentCreateFeedback.value = {
      type: 'error',
      title: 'No se pudo crear al estudiante',
      message: getApiErrorMessage(error),
    };
  } finally {
    isCreatingStudent.value = false;
  }
}

async function handleResetSelectedStudent(
  payload: ResetUserPasswordPayload,
): Promise<void> {
  if (!selectedStudent.value) {
    return;
  }

  if (!payload.reason || !payload.newPassword) {
    lookupFeedback.value = {
      type: 'warning',
      title: 'Datos incompletos',
      message: 'Ingresa una contraseña temporal y el motivo del restablecimiento.',
    };
    return;
  }

  const confirmed = window.confirm(
    `Se restablecerá la contraseña de ${selectedStudent.value.fullName}. ¿Deseas continuar?`,
  );

  if (!confirmed) {
    return;
  }

  isResettingSelectedStudent.value = true;

  try {
    const response = await resetUserPassword(selectedStudent.value.userId, payload);
    lookupFeedback.value = {
      type: 'success',
      title: 'Contraseña restablecida',
      message: `${response.message} El estudiante deberá cambiar su contraseña al ingresar.`,
    };
    await loadUsers();
  } catch (error) {
    lookupFeedback.value = {
      type: 'error',
      title: 'No se pudo restablecer la contraseña',
      message: getApiErrorMessage(error),
    };
  } finally {
    isResettingSelectedStudent.value = false;
  }
}

function canResetUser(user: UserSummary): boolean {
  if (!sessionStore.user || sessionStore.user.id === user.id) {
    return false;
  }

  if (sessionStore.user.role === 'director') {
    return ['student', 'auxiliary', 'secretary', 'tutor'].includes(user.role);
  }

  if (sessionStore.user.role === 'secretary') {
    return ['student', 'auxiliary'].includes(user.role);
  }

  return false;
}

function openUserResetDialog(user: UserSummary): void {
  if (!canResetUser(user)) {
    return;
  }

  selectedUserForReset.value = user;
  userResetForm.newPassword = '';
  userResetForm.confirmPassword = '';
  userResetForm.reason = '';
  userResetFeedback.value = null;
  isUserResetDialogOpen.value = true;
}

function closeUserResetDialog(): void {
  isUserResetDialogOpen.value = false;
  selectedUserForReset.value = null;
  userResetFeedback.value = null;
}

async function handleResetUserFromDialog(): Promise<void> {
  if (!selectedUserForReset.value) {
    return;
  }

  userResetFeedback.value = null;

  if (
    !userResetForm.newPassword ||
    userResetForm.newPassword.length < 8 ||
    !userResetForm.reason.trim()
  ) {
    userResetFeedback.value = {
      type: 'warning',
      title: 'Datos incompletos',
      message: 'Ingresa una contraseña temporal válida y el motivo del restablecimiento.',
    };
    return;
  }

  if (userResetForm.confirmPassword !== userResetForm.newPassword) {
    userResetFeedback.value = {
      type: 'warning',
      title: 'Confirmación requerida',
      message: 'La confirmación de la contraseña temporal no coincide.',
    };
    return;
  }

  isResettingUser.value = true;

  try {
    const response = await resetUserPassword(selectedUserForReset.value.id, {
      newPassword: userResetForm.newPassword,
      reason: userResetForm.reason.trim(),
    });

    usersFeedback.value = {
      type: 'success',
      title: 'Contraseña restablecida',
      message: `${response.message} ${selectedUserForReset.value.displayName} deberá cambiarla al ingresar.`,
    };

    await loadUsers();
    closeUserResetDialog();
  } catch (error) {
    userResetFeedback.value = {
      type: 'error',
      title: 'No se pudo restablecer la contraseña',
      message: getApiErrorMessage(error),
    };
  } finally {
    isResettingUser.value = false;
  }
}

async function handleSavePersonnel(): Promise<void> {
  if (!isDirector.value) {
    return;
  }

  personnelDialogFeedback.value = null;

  const normalizedFirstName = personnelForm.firstName.trim();
  const normalizedLastName = personnelForm.lastName.trim();
  const normalizedUsername = personnelForm.username.trim().toLowerCase();

  if (!normalizedFirstName || !normalizedLastName || !normalizedUsername) {
    personnelDialogFeedback.value = {
      type: 'warning',
      title: 'Datos incompletos',
      message: 'Ingresa nombres, apellidos y usuario para la cuenta interna.',
    };
    return;
  }

  if (personnelDialogMode.value === 'create') {
    if (!personnelForm.temporaryPassword || personnelForm.temporaryPassword.length < 8) {
      personnelDialogFeedback.value = {
        type: 'warning',
        title: 'Contraseña temporal requerida',
        message: 'Ingresa una contraseña temporal de al menos 8 caracteres.',
      };
      return;
    }

    if (personnelForm.confirmTemporaryPassword !== personnelForm.temporaryPassword) {
      personnelDialogFeedback.value = {
        type: 'warning',
        title: 'Confirmación requerida',
        message: 'La confirmación de la contraseña temporal no coincide.',
      };
      return;
    }

    if (personnelForm.temporaryPassword.trim() === normalizedUsername) {
      personnelDialogFeedback.value = {
        type: 'warning',
        title: 'Contraseña no válida',
        message: 'La contraseña temporal no puede ser igual al usuario.',
      };
      return;
    }
  }

  const assignments = buildTutorAssignmentsPayload();

  if (personnelForm.role === 'tutor' && personnelDialogFeedback.value) {
    return;
  }

  isSavingPersonnel.value = true;

  try {
    if (personnelDialogMode.value === 'create') {
      const payload: CreatePersonnelUserPayload = {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        username: normalizedUsername,
        role: personnelForm.role,
        temporaryPassword: personnelForm.temporaryPassword,
        isActive: personnelForm.isActive,
        mustChangePassword: personnelForm.mustChangePassword,
        assignments,
      };

      await createPersonnelUser(payload);
      usersFeedback.value = {
        type: 'success',
        title: 'Cuenta registrada',
        message:
          'La cuenta interna fue creada correctamente y quedó lista para el cambio obligatorio de contraseña.',
      };
    } else {
      if (!selectedPersonnelUser.value) {
        return;
      }

      const payload: UpdatePersonnelUserPayload = {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        username: normalizedUsername,
        role: personnelForm.role,
        isActive: personnelForm.isActive,
        assignments,
      };

      await updatePersonnelUser(selectedPersonnelUser.value.id, payload);
      usersFeedback.value = {
        type: 'success',
        title: 'Cuenta actualizada',
        message: 'Los datos del personal fueron actualizados correctamente.',
      };
    }

    closePersonnelDialog();
    await loadUsers();
  } catch (error) {
    personnelDialogFeedback.value = {
      type: 'error',
      title:
        personnelDialogMode.value === 'create'
          ? 'No se pudo registrar al personal'
          : 'No se pudo actualizar la cuenta',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSavingPersonnel.value = false;
  }
}

async function handleTogglePersonnelStatus(user: UserSummary): Promise<void> {
  if (!isDirector.value) {
    return;
  }

  const role = toPersonnelRole(user.role);

  if (!role) {
    usersFeedback.value = {
      type: 'warning',
      title: 'Rol no disponible',
      message: 'Solo se puede activar o desactivar cuentas internas del colegio.',
    };
    return;
  }

  const confirmed = window.confirm(
    user.isActive
      ? `Se desactivará la cuenta de ${user.displayName}. ¿Deseas continuar?`
      : `Se activará nuevamente la cuenta de ${user.displayName}. ¿Deseas continuar?`,
  );

  if (!confirmed) {
    return;
  }

  const nameParts = derivePersonnelNameParts(user);
  savingPersonnelUserId.value = user.id;
  usersFeedback.value = null;

  try {
    const assignments =
      role === 'tutor'
        ? (user.assignments ?? []).map((assignment) => ({
            schoolYear: assignment.schoolYear,
            grade: assignment.grade,
            section: assignment.section,
            shift: assignment.shift,
          }))
        : [];

    await updatePersonnelUser(user.id, {
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      username: user.username,
      role,
      isActive: !user.isActive,
      assignments,
    });

    usersFeedback.value = {
      type: 'success',
      title: user.isActive ? 'Cuenta desactivada' : 'Cuenta activada',
      message: user.isActive
        ? 'La cuenta interna quedó inactiva y dejó de estar disponible para ingresar.'
        : 'La cuenta interna volvió a estar disponible para ingresar.',
    };

    await loadUsers();
  } catch (error) {
    usersFeedback.value = {
      type: 'error',
      title: user.isActive ? 'No se pudo desactivar la cuenta' : 'No se pudo activar la cuenta',
      message: getApiErrorMessage(error),
    };
  } finally {
    savingPersonnelUserId.value = null;
  }
}

async function handleChangeOwnPassword(
  payload: ChangePasswordPayload,
): Promise<void> {
  accountPasswordFeedback.value = null;
  isChangingOwnPassword.value = true;

  try {
    await sessionStore.changeOwnPassword(payload);
    accountPasswordFeedback.value = {
      type: 'success',
      title: 'Contraseña actualizada',
      message: 'Tu contraseña administrativa fue actualizada correctamente.',
    };
  } catch (error) {
    accountPasswordFeedback.value = {
      type: 'error',
      title: 'No se pudo cambiar la contraseña',
      message: getApiErrorMessage(error),
    };
  } finally {
    isChangingOwnPassword.value = false;
  }
}

function resetUsersFilters(): void {
  usersFilters.search = '';
  usersFilters.role = undefined;
  usersFilters.activeStatus = undefined;
  usersPage.value = 1;
  void loadUsers();
}

function resetStudentsFilters(): void {
  studentsFilters.search = '';
  studentsFilters.schoolYear =
    institutionStore.settings?.activeSchoolYear ?? new Date().getFullYear();
  studentsFilters.grade = undefined;
  studentsFilters.section = undefined;
  studentsFilters.shift = undefined;
  studentsPage.value = 1;
  void loadStudents();
}

function handleStudentFilterGradeChange(): void {
  const availableSections = studentFilterSectionOptions.value.map((option) => option.value);
  if (
    studentsFilters.section &&
    availableSections.length > 0 &&
    !availableSections.includes(studentsFilters.section)
  ) {
    studentsFilters.section = undefined;
  }
}

function handleAttendanceExportGradeChange(): void {
  const availableSections = attendanceExportSectionOptions.value.map(
    (option) => option.value,
  );

  if (
    attendanceExportFilters.section &&
    availableSections.length > 0 &&
    !availableSections.includes(attendanceExportFilters.section)
  ) {
    attendanceExportFilters.section = undefined;
  }

  if (!attendanceExportFilters.grade) {
    attendanceExportFilters.section = undefined;
  }
}

function handleAttendanceAlertsGradeChange(): void {
  const availableSections = attendanceAlertsSectionOptions.value.map(
    (option) => option.value,
  );

  if (
    attendanceAlertsFilters.section &&
    availableSections.length > 0 &&
    !availableSections.includes(attendanceAlertsFilters.section)
  ) {
    attendanceAlertsFilters.section = undefined;
  }

  if (!attendanceAlertsFilters.grade) {
    attendanceAlertsFilters.section = undefined;
  }
}

function handleFollowUpsOverviewGradeChange(): void {
  const availableSections = followUpsOverviewSectionOptions.value.map(
    (option) => option.value,
  );

  if (
    followUpsOverviewFilters.section &&
    availableSections.length > 0 &&
    !availableSections.includes(followUpsOverviewFilters.section)
  ) {
    followUpsOverviewFilters.section = null;
  }

  if (!followUpsOverviewFilters.grade) {
    followUpsOverviewFilters.section = null;
  }
}

function resetFollowUpsOverviewFilters(): void {
  followUpsOverviewFilters.search = '';
  followUpsOverviewFilters.recordType = null;
  followUpsOverviewFilters.status = null;
  followUpsOverviewFilters.grade = null;
  followUpsOverviewFilters.section = null;
  followUpsOverviewFilters.shift = null;
  followUpsOverview.value.page = 1;
  void loadFollowUpsOverview();
}

async function handleExportAttendance(
  format: AttendanceExportFormat,
): Promise<void> {
  attendanceExportFeedback.value = null;

  if (!attendanceExportFilters.from || !attendanceExportFilters.to) {
    attendanceExportFeedback.value = {
      type: 'warning',
      title: 'Rango incompleto',
      message: 'Selecciona la fecha inicial y final para exportar.',
    };
    return;
  }

  if (attendanceExportFilters.from > attendanceExportFilters.to) {
    attendanceExportFeedback.value = {
      type: 'warning',
      title: 'Rango inválido',
      message: 'La fecha inicial no puede ser mayor que la fecha final.',
    };
    return;
  }

  exportingAttendanceFormat.value = format;

  try {
    const exportQuery: {
      from: string;
      to: string;
      schoolYear: number;
      format: AttendanceExportFormat;
      grade?: number;
      section?: string;
      shift?: StudentShift;
    } = {
      from: attendanceExportFilters.from,
      to: attendanceExportFilters.to,
      schoolYear: attendanceExportFilters.schoolYear,
      format,
    };

    if (typeof attendanceExportFilters.grade === 'number') {
      exportQuery.grade = attendanceExportFilters.grade;
    }

    if (attendanceExportFilters.section) {
      exportQuery.section = attendanceExportFilters.section;
    }

    if (attendanceExportFilters.shift) {
      exportQuery.shift = attendanceExportFilters.shift;
    }

    const { blob, fileName } = await exportAttendance(exportQuery);

    downloadBlobFile(blob, fileName);
    attendanceExportFeedback.value = {
      type: 'success',
      title: format === 'csv' ? 'CSV listo' : 'Excel listo',
      message: `La descarga de ${fileName} empezo correctamente.`,
    };
  } catch (error) {
    attendanceExportFeedback.value = {
      type: 'error',
      title: 'No se pudo exportar la asistencia',
      message: getApiErrorMessage(error),
    };
  } finally {
    exportingAttendanceFormat.value = null;
  }
}

async function handleLoadAttendanceAlerts(): Promise<void> {
  await loadAttendanceAlerts();
}

function resetAttendanceAlertsFilters(): void {
  attendanceAlertsFilters.schoolYear =
    institutionStore.settings?.activeSchoolYear ?? new Date().getFullYear();
  attendanceAlertsFilters.grade = undefined;
  attendanceAlertsFilters.section = undefined;
  attendanceAlertsFilters.shift = undefined;
  attendanceAlertsFilters.search = '';
  void loadAttendanceAlerts();
}

watch(activeSection, (section) => {
  syncAdminSectionQuery(section);
});

watch(
  () => route.query.section,
  (section) => {
    const normalizedSection = normalizeAdminSection(section);

    if (normalizedSection !== activeSection.value) {
      activeSection.value = normalizedSection;
    }
  },
);

watch(
  () => personnelForm.role,
  (role) => {
    personnelDialogFeedback.value = null;

    if (role === 'tutor') {
      if (tutorAssignmentRows.value.length === 0) {
        addTutorAssignmentRow();
      }

      return;
    }

    resetTutorAssignmentRows();
  },
);

watch(usersPage, () => {
  void loadUsers();
});

watch(studentsPage, () => {
  void loadStudents();
});

watch(
  () => [
    followUpsOverviewFilters.search,
    followUpsOverviewFilters.recordType,
    followUpsOverviewFilters.status,
    followUpsOverviewFilters.grade,
    followUpsOverviewFilters.section,
    followUpsOverviewFilters.shift,
  ],
  () => {
    followUpsOverview.value.page = 1;
  },
);

watch(
  () => followUpsOverview.value.page,
  () => {
    void loadFollowUpsOverview();
  },
);

onMounted(async () => {
  activeSection.value = normalizeAdminSection(route.query.section);

  try {
    await institutionStore.loadSettings();
    studentsFilters.schoolYear =
      institutionStore.settings?.activeSchoolYear ?? studentsFilters.schoolYear;
    attendanceExportFilters.schoolYear =
      institutionStore.settings?.activeSchoolYear ??
      attendanceExportFilters.schoolYear;
    attendanceAlertsFilters.schoolYear =
      institutionStore.settings?.activeSchoolYear ??
      attendanceAlertsFilters.schoolYear;
  } catch (error) {
    settingsFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar la configuración institucional',
      message: getApiErrorMessage(error),
    };
  }

  await Promise.all([
    loadStudents(),
    loadAttendanceAlerts(),
    loadFollowUpsOverview(),
    isDirector.value ? loadUsers() : Promise.resolve(),
  ]);
  void nextTick(() => {
    studentLookupInputRef.value?.focus();
  });
});
</script>


