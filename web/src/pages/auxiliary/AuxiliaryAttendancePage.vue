<template>
  <q-page class="auxiliary-page">
    <div class="ui-page-shell">
      <PageIntroCard
        eyebrow="Operación diaria"
        title="Asistencia del auxiliar"
        description="Usa Puerta para registrar rápido por QR y cambia a Aula solo cuando necesites revisar un salón específico."
      >
        <template #meta>
          <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" icon="badge">
            Auxiliar
          </q-chip>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="calendar_today">
            {{ formattedGateDate }}
          </q-chip>
          <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="swap_horiz">
            {{ activeSectionLabel }}
          </q-chip>
          <q-chip
            class="ui-stat-chip"
            :color="connectivityTone.color"
            :text-color="connectivityTone.textColor"
            :icon="connectivityTone.icon"
          >
            {{ isOnline ? 'En línea' : 'Sin conexión' }}
          </q-chip>
          <q-chip
            v-if="pendingQueueCount > 0"
            class="ui-stat-chip"
            color="amber-1"
            text-color="amber-10"
            icon="sync_problem"
          >
            {{ pendingQueueCount }} pendiente(s)
          </q-chip>
        </template>
      </PageIntroCard>

      <ResponsiveSectionNav
        v-model="activeSection"
        class="q-mt-lg"
        :items="auxiliarySectionItems"
        :show-desktop-tabs="false"
      />

      <section v-show="activeSection === 'gate'" class="role-section-view q-mt-lg">
        <q-card flat bordered class="scan-card auxiliary-scan-card">
          <q-card-section class="ui-card-body">
            <div class="row items-start justify-between q-col-gutter-md">
              <div class="col-12 col-md">
                <div class="ui-eyebrow">Puerta</div>
                <div class="text-subtitle1 text-weight-bold q-mt-sm">
                  Escaneo continuo de entrada o salida
                </div>
                <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                  El sistema ubica automáticamente aula y turno desde la matrícula activa del
                  estudiante. Aquí solo defines si estás registrando entradas o salidas.
                </p>
              </div>
              <div class="col-12 col-md-auto">
                <div class="auxiliary-gate-meta">
                  <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="calendar_today">
                    {{ formattedGateDate }}
                  </q-chip>
                  <q-chip
                    class="ui-stat-chip"
                    :color="scannerModeEnabled ? 'red-1' : 'grey-3'"
                    :text-color="scannerModeEnabled ? 'red-10' : 'grey-8'"
                    icon="qr_code_scanner"
                  >
                    {{ scannerModeEnabled ? 'Lector listo' : 'Lector pausado' }}
                  </q-chip>
                </div>
              </div>
            </div>

            <StatusBanner
              class="q-mt-lg"
              :variant="isOnline ? 'info' : 'warning'"
              :title="isOnline ? 'Puerta lista para operar' : 'Puerta en modo offline'"
              :message="
                isOnline
                  ? 'Escanea el QR o escribe el código del estudiante. No necesitas seleccionar grado, sección ni turno para cada registro.'
                  : 'Si el estudiante ya está en el snapshot local, la marca se guardará en el celular y se sincronizará cuando vuelva la conexión.'
              "
            />

            <StatusBanner
              v-if="offlineSyncFeedback"
              class="q-mt-lg"
              :variant="offlineSyncFeedback.type"
              :title="offlineSyncFeedback.title"
              :message="offlineSyncFeedback.message"
            />

            <div class="auxiliary-gate-mode q-mt-lg">
              <span class="auxiliary-gate-mode__label">Modo operativo</span>
              <q-btn-toggle
                v-model="gateMarkType"
                unelevated
                no-caps
                color="white"
                text-color="primary"
                toggle-color="primary"
                toggle-text-color="white"
                class="auxiliary-gate-mode__toggle"
                :options="gateModeOptions"
              />
            </div>

            <div class="scan-toolbar q-mt-lg">
              <q-toggle
                v-model="scannerModeEnabled"
                color="primary"
                keep-color
                label="Mantener el lector listo"
              />

              <q-btn
                flat
                color="primary"
                icon="qr_code_scanner"
                label="Enfocar lector"
                no-caps
                @click="focusScannerInput"
              />
            </div>

            <StatusBanner
              v-if="scanFeedback"
              class="q-mt-lg"
              :variant="scanFeedback.type"
              :title="scanFeedback.title"
              :message="scanFeedback.message"
            />

            <q-form class="auxiliary-gate-form q-mt-lg" @submit="handleScanSubmit">
              <q-input
                ref="scanInputRef"
                v-model="scanForm.studentCode"
                label="Código del estudiante"
                outlined
                maxlength="32"
                autocomplete="off"
                :rules="[(value) => Boolean(value) || 'Ingresa el código']"
                @update:model-value="scanFeedback = null"
              >
                <template #prepend>
                  <q-icon name="badge" />
                </template>
              </q-input>

              <q-btn
                color="primary"
                :label="gateMarkType === 'entry' ? 'Registrar entrada' : 'Registrar salida'"
                no-caps
                type="submit"
                :loading="isSubmittingScan"
              />
            </q-form>

            <div class="scan-helper q-mt-md">
              <q-icon name="keyboard" size="18px" />
              <span>
                Si el lector externo envía el código y luego Enter, el registro se procesa de
                inmediato y el campo queda listo para el siguiente estudiante.
              </span>
            </div>
          </q-card-section>
        </q-card>
      </section>

      <section v-show="activeSection === 'classroom'" class="role-section-view q-mt-lg">
        <div class="auxiliary-context-bar">
          <div class="auxiliary-context-bar__main">
            <div class="auxiliary-context-bar__status">
              <span class="auxiliary-context-bar__label">Aula activa</span>
              <span class="auxiliary-context-bar__caption">
                Contexto manual para revisar pendientes, registrar apoyo manual y abrir fichas.
              </span>
            </div>

            <div class="auxiliary-context-bar__summary">
              <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="calendar_today">
                {{ formattedContextDate }}
              </q-chip>
              <q-chip class="ui-stat-chip" color="grey-2" text-color="grey-9" icon="groups">
                {{ context.grade }} {{ context.section }}
              </q-chip>
              <q-chip class="ui-stat-chip" color="orange-1" text-color="orange-10" icon="schedule">
                {{ getShiftLabel(context.shift) }}
              </q-chip>
              <q-chip class="ui-stat-chip" color="red-1" text-color="red-10" :icon="currentMarkIcon">
                {{ context.markType === 'entry' ? 'Entrada' : 'Salida' }}
              </q-chip>
              <q-chip
                class="ui-stat-chip"
                :color="currentStatusTone.color"
                :text-color="currentStatusTone.textColor"
                icon="fact_check"
              >
                {{ currentStatusLabel }}
              </q-chip>
            </div>
          </div>

          <q-btn
            flat
            dense
            color="grey-7"
            icon="tune"
            label="Cambiar contexto"
            no-caps
            class="auxiliary-context-bar__action"
            @click="handleContextBarAction"
          />
        </div>

        <q-card flat bordered class="admin-card auxiliary-context-editor">
          <q-expansion-item
            v-model="isContextEditorOpen"
            switch-toggle-side
            expand-separator
            header-class="auxiliary-context-editor__header"
            class="auxiliary-context-editor__expansion"
            icon="tune"
            label="Editar contexto del aula"
            caption="Úsalo cuando cambies de aula, fecha, turno o tipo de marca manual"
          >
            <q-card-section class="ui-card-body">
              <div class="ui-eyebrow">Aula</div>
              <div class="text-subtitle2 text-weight-bold q-mt-sm">
                Configura solo el salón que quieres revisar
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                Este contexto se usa para cargar el listado, las alertas y el registro manual del
                aula activa.
              </p>

              <q-form class="auxiliary-context-form q-mt-lg" @submit="handleContextSubmit">
                <div class="auxiliary-context-form__primary">
                  <q-input
                    v-model="context.attendanceDate"
                    type="date"
                    label="Fecha"
                    outlined
                    :rules="[(value) => Boolean(value) || 'Selecciona la fecha']"
                  >
                    <template #prepend>
                      <q-icon name="event" />
                    </template>
                  </q-input>

                  <q-select
                    v-model="context.shift"
                    label="Turno"
                    outlined
                    emit-value
                    map-options
                    :options="shiftOptions"
                  >
                    <template #prepend>
                      <q-icon name="schedule" />
                    </template>
                  </q-select>

                  <q-select
                    v-model="context.grade"
                    label="Grado"
                    outlined
                    emit-value
                    map-options
                    :options="gradeOptions"
                    @update:model-value="handleContextGradeChange"
                  >
                    <template #prepend>
                      <q-icon name="school" />
                    </template>
                  </q-select>

                  <q-select
                    v-model="context.section"
                    label="Sección"
                    outlined
                    emit-value
                    map-options
                    :options="sectionOptions"
                    :rules="[(value) => Boolean(value) || 'Selecciona la sección']"
                  >
                    <template #prepend>
                      <q-icon name="groups" />
                    </template>
                  </q-select>

                  <q-select
                    v-model="context.markType"
                    label="Tipo de marca"
                    outlined
                    emit-value
                    map-options
                    :options="markTypeOptions"
                  >
                    <template #prepend>
                      <q-icon :name="currentMarkIcon" />
                    </template>
                  </q-select>
                </div>

                <div class="auxiliary-context-form__secondary">
                  <q-select
                    v-model="context.status"
                    label="Condición de la marca"
                    outlined
                    emit-value
                    map-options
                    :options="statusOptions"
                    class="auxiliary-context-form__status"
                  >
                    <template #prepend>
                      <q-icon name="fact_check" />
                    </template>
                  </q-select>

                  <div class="auxiliary-context-form__helper text-caption text-grey-7">
                    Año escolar activo: {{ context.schoolYear }}. Ajusta este bloque solo cuando
                    realmente cambies de aula o de fecha de trabajo.
                  </div>

                  <div class="auxiliary-context-form__actions">
                    <q-btn
                      flat
                      color="primary"
                      label="Cancelar"
                      no-caps
                      @click="isContextEditorOpen = false"
                    />
                    <q-btn
                      color="primary"
                      label="Guardar contexto"
                      no-caps
                      type="submit"
                      :loading="isLoadingDaily || isLoadingAttendanceAlerts"
                    />
                  </div>
                </div>
              </q-form>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <StatusBanner
          v-if="dailyFeedback"
          :variant="dailyFeedback.type"
          :title="dailyFeedback.title"
          :message="dailyFeedback.message"
        />

        <StatusBanner
          :variant="dailyFocusFeedback.type"
          :title="dailyFocusFeedback.title"
          :message="dailyFocusFeedback.message"
        />

        <StatusBanner
          v-if="!canCorrectCurrentClassroom"
          variant="warning"
          title="Correcciones limitadas al día actual"
          message="El auxiliar solo puede corregir marcas de la fecha de hoy dentro del aula activa."
        />

        <q-card
          v-if="!isOnline && offlineContextAvailable"
          flat
          bordered
          class="daily-card q-mt-lg"
        >
          <q-card-section class="ui-card-body">
            <div class="ui-eyebrow">Aula offline</div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              Snapshot local del aula activa
            </div>
            <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
              Puedes seguir registrando marcas manuales con la lista descargada. La sincronización
              se hará después.
            </p>

            <div class="student-history-empty q-mt-lg" v-if="offlineClassroomStudents.length === 0">
              <q-icon name="download_for_offline" size="30px" color="grey-6" />
              <div class="text-subtitle2 text-weight-bold">Sin snapshot para esta aula</div>
              <p class="text-body2 text-grey-7 q-mb-none">
                Actualiza el contexto cuando tengas internet para dejar esta aula lista offline.
              </p>
            </div>

            <q-list v-else bordered separator class="rounded-borders q-mt-lg alerts-list">
              <q-item
                v-for="student in offlineClassroomStudents"
                :key="student.studentId"
              >
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ student.fullName }}</q-item-label>
                  <q-item-label caption>
                    {{ student.code }} - {{ student.grade }} {{ student.section }} -
                    {{ getShiftLabel(student.shift) }}
                  </q-item-label>
                  <q-item-label class="q-mt-sm text-body2">
                    {{
                      student.queuedEntry && student.queuedExit
                        ? 'Entrada y salida pendientes de sincronizar.'
                        : student.queuedEntry
                          ? 'Entrada pendiente de sincronizar.'
                          : student.queuedExit
                            ? 'Salida pendiente de sincronizar.'
                            : 'Sin marca offline pendiente.'
                    }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    color="primary"
                    :label="context.markType === 'entry' ? 'Guardar entrada' : 'Guardar salida'"
                    no-caps
                    @click="handleOfflineManualRegister(student)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="daily-card">
          <q-card-section class="ui-card-body">
            <div class="row items-start justify-between q-col-gutter-lg">
              <div class="col-12 col-lg">
                <div class="ui-eyebrow">Aula</div>
                <div class="text-subtitle1 text-weight-bold q-mt-sm">
                  Revisión operativa del aula activa
                </div>
                <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                  Revisa pendientes, registra apoyo manual y abre la ficha del estudiante sin salir
                  del contexto del salón.
                </p>
              </div>

              <div class="col-12 col-lg-auto">
                <div class="daily-actions">
                  <q-btn
                    outline
                    color="primary"
                    icon="download"
                    label="Exportar CSV"
                    no-caps
                    :loading="exportingFormat === 'csv'"
                    :disable="isLoadingDaily"
                    @click="handleExportAttendance('csv')"
                  />
                  <q-btn
                    flat
                    color="secondary"
                    icon="table_view"
                    label="Exportar Excel"
                    no-caps
                    :loading="exportingFormat === 'xlsx'"
                    :disable="isLoadingDaily"
                    @click="handleExportAttendance('xlsx')"
                  />
                </div>
              </div>
            </div>

            <div class="classroom-stats-grid q-mt-lg">
              <StatSummaryCard
                label="En aula"
                :value="dailySummary.totalStudents"
                icon="groups"
                tone="dark"
                caption="Estudiantes cargados en el contexto actual."
              />
              <StatSummaryCard
                label="Pendientes de entrada"
                :value="dailySummary.pendingEntries"
                icon="login"
                tone="info"
                caption="Estudiantes sin entrada registrada en la fecha seleccionada."
              />
              <StatSummaryCard
                label="Pendientes de salida"
                :value="dailySummary.pendingExits"
                icon="logout"
                tone="warning"
                  caption="Estudiantes con salida aún pendiente en esta revisión."
              />
              <StatSummaryCard
                label="Incidencias"
                :value="classroomIncidents"
                icon="priority_high"
                tone="primary"
                caption="Tardanzas, salidas anticipadas, ausencias o registros incompletos."
              />
            </div>

            <div v-if="isLoadingDaily" class="ui-loading-state q-py-xl">
              <q-spinner color="primary" size="32px" />
              <span class="text-body2 text-grey-7">Cargando el aula seleccionada...</span>
            </div>

            <div v-else-if="dailyItems.length === 0" class="student-history-empty q-mt-lg">
              <q-icon name="groups" size="32px" color="grey-6" />
              <div class="text-subtitle2 text-weight-bold">Sin estudiantes para este contexto</div>
              <p class="text-body2 text-grey-7 q-mb-none">
                Ajusta el aula activa si necesitas revisar otro grupo.
              </p>
            </div>

            <template v-else>
              <div class="gt-sm table-wrap q-mt-lg">
                <q-markup-table flat separator="cell">
                  <thead>
                    <tr>
                  <th class="text-left">Código</th>
                      <th class="text-left">Estudiante</th>
                      <th class="text-left">Estado diario</th>
                      <th class="text-left">Entrada</th>
                      <th class="text-left">Salida</th>
                      <th class="text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in dailyItems" :key="item.studentId">
                      <td>{{ item.code }}</td>
                      <td>
                        <div class="text-weight-medium">{{ item.fullName }}</div>
                        <div class="text-caption text-grey-7">
                          {{ item.isActive ? 'Activo' : 'Inactivo' }}
                        </div>
                      </td>
                      <td>
                        <div class="attendance-correction-cell">
                          <q-chip
                            v-if="item.absence"
                            dense
                            square
                            :color="getAttendanceDayStatusTone(item.absence?.statusType ?? 'justified_absence').color"
                            :text-color="getAttendanceDayStatusTone(item.absence?.statusType ?? 'justified_absence').textColor"
                          >
                            {{ getAttendanceDayStatusLabel(item.absence?.statusType ?? 'justified_absence') }}
                          </q-chip>
                          <template v-else>
                            <q-chip dense square color="grey-2" text-color="grey-8">
                              {{ getOperationalStatusLabel(item) }}
                            </q-chip>
                          </template>
                          <div
                            v-if="item.absence?.observation"
                            class="attendance-mark-badge__note"
                          >
                            {{ item.absence?.observation }}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="attendance-correction-cell">
                          <AttendanceMarkBadge :mark="item.entry" empty-label="Sin entrada" />
                          <q-btn
                            v-if="item.entry"
                            flat
                            color="secondary"
                            class="support-action-btn"
                            icon="edit"
                            label="Corregir entrada"
                            no-caps
                            :disable="isCorrectionActionDisabled(item, 'entry')"
                            @click="openCorrectionDialog(item, 'entry')"
                          />
                        </div>
                      </td>
                      <td>
                        <div class="attendance-correction-cell">
                          <AttendanceMarkBadge :mark="item.exit" empty-label="Sin salida" />
                          <q-btn
                            v-if="item.exit"
                            flat
                            color="secondary"
                            class="support-action-btn"
                            icon="edit"
                            label="Corregir salida"
                            no-caps
                            :disable="isCorrectionActionDisabled(item, 'exit')"
                            @click="openCorrectionDialog(item, 'exit')"
                          />
                        </div>
                      </td>
                      <td>
                        <div class="student-action-stack">
                          <q-btn
                            flat
                            color="primary"
                            class="auxiliary-action-btn"
                            :icon="context.markType === 'entry' ? 'login' : 'logout'"
                            :label="context.markType === 'entry' ? 'Marcar entrada' : 'Marcar salida'"
                            no-caps
                            :disable="isManualActionDisabled(item)"
                            :loading="manualSubmittingStudentId === item.studentId"
                            @click="handleManualRegister(item)"
                          />
                          <q-btn
                            flat
                            color="secondary"
                            class="auxiliary-action-btn"
                            icon="badge"
                            label="Ver ficha"
                            no-caps
                            @click="handleOpenStudent(item.studentId)"
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </div>

              <div class="lt-md q-mt-lg">
                <div class="role-section-view">
                  <article
                    v-for="item in dailyItems"
                    :key="`${item.studentId}-mobile`"
                    class="student-daily-mobile-card"
                  >
                    <div class="student-daily-mobile-card__row">
                      <div>
                        <span class="student-daily-mobile-card__label">Estudiante</span>
                        <div class="text-weight-medium q-mt-xs">{{ item.fullName }}</div>
                        <div class="text-caption text-grey-7">{{ item.code }}</div>
                      </div>
                      <q-chip
                        dense
                        square
                        :color="item.isActive ? 'grey-2' : 'grey-3'"
                        :text-color="item.isActive ? 'grey-9' : 'grey-8'"
                      >
                        {{ item.isActive ? 'Activo' : 'Inactivo' }}
                      </q-chip>
                    </div>

                    <div class="student-daily-mobile-card__marks">
                      <div>
                        <span class="student-daily-mobile-card__label">Estado diario</span>
                        <div class="q-mt-xs">
                          <q-chip
                            v-if="item.absence"
                            dense
                            square
                            :color="getAttendanceDayStatusTone(item.absence.statusType).color"
                            :text-color="getAttendanceDayStatusTone(item.absence.statusType).textColor"
                          >
                            {{ getAttendanceDayStatusLabel(item.absence.statusType) }}
                          </q-chip>
                          <q-chip v-else dense square color="grey-2" text-color="grey-8">
                            {{ getOperationalStatusLabel(item) }}
                          </q-chip>
                        </div>
                      </div>

                      <div>
                        <span class="student-daily-mobile-card__label">Entrada</span>
                        <div class="q-mt-xs">
                          <AttendanceMarkBadge :mark="item.entry" empty-label="Sin entrada" />
                        </div>
                        <q-btn
                          v-if="item.entry"
                          flat
                          color="secondary"
                          class="support-action-btn q-mt-sm"
                          icon="edit"
                          label="Corregir entrada"
                          no-caps
                          :disable="isCorrectionActionDisabled(item, 'entry')"
                          @click="openCorrectionDialog(item, 'entry')"
                        />
                      </div>

                      <div>
                        <span class="student-daily-mobile-card__label">Salida</span>
                        <div class="q-mt-xs">
                          <AttendanceMarkBadge :mark="item.exit" empty-label="Sin salida" />
                        </div>
                        <q-btn
                          v-if="item.exit"
                          flat
                          color="secondary"
                          class="support-action-btn q-mt-sm"
                          icon="edit"
                          label="Corregir salida"
                          no-caps
                          :disable="isCorrectionActionDisabled(item, 'exit')"
                          @click="openCorrectionDialog(item, 'exit')"
                        />
                      </div>
                    </div>

                    <div class="student-action-stack student-action-stack--mobile">
                      <q-btn
                        flat
                        color="primary"
                        class="auxiliary-action-btn"
                        :icon="context.markType === 'entry' ? 'login' : 'logout'"
                        :label="context.markType === 'entry' ? 'Marcar entrada' : 'Marcar salida'"
                        no-caps
                        :disable="isManualActionDisabled(item)"
                        :loading="manualSubmittingStudentId === item.studentId"
                        @click="handleManualRegister(item)"
                      />
                      <q-btn
                        flat
                        color="secondary"
                        class="auxiliary-action-btn"
                        icon="badge"
                        label="Ver ficha"
                        no-caps
                        @click="handleOpenStudent(item.studentId)"
                      />
                    </div>
                  </article>
                </div>
              </div>
            </template>
          </q-card-section>
        </q-card>

      </section>

      <section v-show="activeSection === 'pending'" class="role-section-view q-mt-lg">
        <q-card flat bordered class="admin-card">
          <q-card-section class="ui-card-body">
            <div class="row items-start justify-between q-col-gutter-lg">
              <div class="col-12 col-lg">
                <div class="ui-eyebrow">Pendientes y alertas</div>
                <div class="text-subtitle1 text-weight-bold q-mt-sm">
                  Sincronización offline y riesgos del aula activa
                </div>
                <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                  Revisa qué quedó pendiente de subir y consulta las alertas del aula cuando
                  tengas conexión.
                </p>
              </div>
              <div class="col-12 col-lg-auto">
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
              </div>
            </div>

            <q-card flat bordered class="auxiliary-offline-card q-mt-lg">
              <q-card-section class="ui-card-body">
                <div class="row items-start justify-between q-col-gutter-lg">
                  <div class="col-12 col-lg">
                    <div class="ui-eyebrow">Cola offline</div>
                    <div class="text-subtitle2 text-weight-bold q-mt-sm">
                      Marcas guardadas localmente
                    </div>
                    <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                      Usa este bloque para revisar pendientes, confirmar el último contexto
                      descargado y sincronizar cuando vuelva internet.
                    </p>
                  </div>
                  <div class="col-12 col-lg-auto">
                    <div class="alerts-summary-grid">
                      <q-chip
                        class="ui-stat-chip"
                        :color="connectivityTone.color"
                        :text-color="connectivityTone.textColor"
                        :icon="connectivityTone.icon"
                      >
                        {{ isOnline ? 'En línea' : 'Sin conexión' }}
                      </q-chip>
                      <q-chip
                        class="ui-stat-chip"
                        color="amber-1"
                        text-color="amber-10"
                        icon="sync_problem"
                      >
                        {{ pendingQueueCount }} pendiente(s)
                      </q-chip>
                    </div>
                  </div>
                </div>

                <StatusBanner
                  v-if="offlineSyncFeedback"
                  class="q-mt-lg"
                  :variant="offlineSyncFeedback.type"
                  :title="offlineSyncFeedback.title"
                  :message="offlineSyncFeedback.message"
                />

                <div class="q-mt-lg row q-col-gutter-lg">
                  <div class="col-12 col-lg-7">
                    <div v-if="pendingQueueCount === 0" class="student-history-empty">
                      <q-icon name="task_alt" size="30px" color="grey-6" />
                      <div class="text-subtitle2 text-weight-bold">Sin pendientes offline</div>
                      <p class="text-body2 text-grey-7 q-mb-none">
                        Las marcas guardadas sin conexión aparecerán aquí hasta sincronizarse.
                      </p>
                    </div>

                    <q-list
                      v-else
                      bordered
                      separator
                      class="rounded-borders alerts-list"
                    >
                      <q-item
                        v-for="item in offlineQueue.slice(0, 8)"
                        :key="item.clientId"
                      >
                        <q-item-section avatar top>
                          <q-chip
                            square
                            dense
                            color="amber-1"
                            text-color="amber-10"
                            :icon="item.markType === 'entry' ? 'login' : 'logout'"
                          >
                            {{ item.markType === 'entry' ? 'Entrada' : 'Salida' }}
                          </q-chip>
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-weight-medium">{{ item.fullName }}</q-item-label>
                          <q-item-label caption>
                            {{ item.grade }} {{ item.section }} - {{ getShiftLabel(item.shift) }}
                          </q-item-label>
                          <q-item-label class="q-mt-sm text-body2">
                            {{ formatDateLong(item.attendanceDate) }} - {{ formatMarkedTime(item.markedAt) }}
                          </q-item-label>
                          <q-item-label v-if="item.syncError" class="q-mt-xs text-negative">
                            {{ item.syncError }}
                          </q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </div>

                  <div class="col-12 col-lg-5">
                    <div class="student-account-details">
                      <div class="student-account-item">
                        <span class="student-account-item__label">Última sincronización</span>
                        <span class="student-account-item__value">{{ lastOfflineSyncLabel }}</span>
                      </div>
                      <div class="student-account-item">
                        <span class="student-account-item__label">Contexto offline</span>
                        <span class="student-account-item__value">
                          {{ offlineContextAvailable ? 'Disponible' : 'Pendiente de descarga' }}
                        </span>
                      </div>
                      <div class="student-account-item">
                        <span class="student-account-item__label">Aulas en snapshot</span>
                        <span class="student-account-item__value">
                          {{ offlineSnapshot?.classrooms.length ?? 0 }}
                        </span>
                      </div>
                    </div>

                    <div class="daily-actions q-mt-lg">
                      <q-btn
                        flat
                        color="primary"
                        icon="download"
                        label="Actualizar contexto"
                        no-caps
                        :disable="!isOnline"
                        :loading="isLoadingOfflineContext"
                        @click="loadOfflineContext"
                      />
                      <q-btn
                        color="primary"
                        icon="sync"
                        label="Sincronizar pendientes"
                        no-caps
                        :disable="pendingQueueCount === 0 || !isOnline"
                        :loading="isSyncingOfflineQueue"
                        @click="syncPendingOfflineQueue"
                      />
                    </div>

                    <div
                      v-if="offlineQueueClassrooms.length > 0"
                      class="text-caption text-grey-7 q-mt-md"
                    >
                      Pendientes actuales: {{ offlineQueueClassrooms.join(' | ') }}
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <StatusBanner
              v-if="attendanceAlertsFeedback"
              class="q-mt-lg"
              :variant="attendanceAlertsFeedback.type"
              :title="attendanceAlertsFeedback.title"
              :message="attendanceAlertsFeedback.message"
            />

            <q-form class="support-filter-grid q-mt-lg" @submit="handleLoadAttendanceAlerts">
              <div class="col-12 col-lg-8">
                <q-input
                  v-model="attendanceAlertsSearch"
                  label="Buscar por código o estudiante"
                  outlined
                  maxlength="120"
                  @update:model-value="attendanceAlertsFeedback = null"
                >
                  <template #prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-lg-4">
                <div class="daily-actions">
                  <q-btn
                    flat
                    color="primary"
                    label="Limpiar"
                    no-caps
                    @click="resetAttendanceAlertsSearch"
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

            <div v-if="isLoadingAttendanceAlerts" class="ui-loading-state q-py-xl">
              <q-spinner color="primary" size="30px" />
              <span class="text-body2 text-grey-7">Cargando alertas del aula...</span>
            </div>

            <div v-else-if="attendanceAlerts.length === 0" class="student-history-empty q-mt-lg">
              <q-icon name="task_alt" size="30px" color="grey-6" />
              <div class="text-subtitle2 text-weight-bold">Sin alertas activas</div>
              <p class="text-body2 text-grey-7 q-mb-none">
                El aula actual no tiene alertas con los filtros aplicados.
              </p>
            </div>

            <q-list
              v-else
              bordered
              separator
              class="rounded-borders q-mt-lg alerts-list"
            >
              <q-item
                v-for="alert in attendanceAlerts"
                :key="`${alert.alertType}-${alert.studentId}`"
              >
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
                  <q-item-label class="text-weight-medium">{{ alert.fullName }}</q-item-label>
                  <q-item-label caption>
                    {{ alert.studentCode }} - {{ alert.grade }} {{ alert.section }} -
                    {{ getShiftLabel(alert.shift) }}
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
                    @click="handleOpenStudent(alert.studentId)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </section>

      <section v-show="activeSection === 'account'" class="role-section-view q-mt-lg">
        <div class="student-account-grid">
          <q-card flat bordered class="admin-card">
            <q-card-section class="ui-card-body">
              <div class="ui-eyebrow">Cuenta</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                Sesión activa del auxiliar
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                Revisa tus datos de acceso y el estado operativo actual sin salir del modulo de
                asistencia.
              </p>

              <div class="context-summary q-mt-lg">
                <div class="context-summary__item">
                  <span class="context-summary__label">Usuario</span>
                  <span class="context-summary__value">
                    {{ sessionStore.user?.username ?? 'Sin usuario' }}
                  </span>
                </div>
                <div class="context-summary__item">
                  <span class="context-summary__label">Nombre</span>
                  <span class="context-summary__value">
                    {{ sessionStore.user?.displayName ?? 'Sin nombre' }}
                  </span>
                </div>
                <div class="context-summary__item">
                  <span class="context-summary__label">Rol</span>
                  <span class="context-summary__value">Auxiliar</span>
                </div>
              </div>

              <StatusBanner
                class="q-mt-lg"
                variant="info"
                title="Operación diaria"
                message="Usa Puerta para el escaneo continuo y cambia a Aula solo cuando necesites revisar un salón específico."
              />
            </q-card-section>
          </q-card>

          <PasswordChangeCard
            :feedback="accountPasswordFeedback"
            :loading="isChangingOwnPassword"
            title="Cambiar contraseña"
            description="Actualiza tu acceso con tu contraseña actual sin salir del módulo operativo."
            submit-label="Guardar contraseña"
            @submit="handleChangeOwnPassword"
          />

          <q-card flat bordered class="admin-card">
            <q-card-section class="ui-card-body">
              <div class="ui-eyebrow">Resumen operativo</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                Referencias rápidas del trabajo actual
              </div>

              <div class="context-summary q-mt-lg">
                <div class="context-summary__item">
                  <span class="context-summary__label">Modo Puerta</span>
                  <span class="context-summary__value">
                    {{ gateMarkType === 'entry' ? 'Entrada' : 'Salida' }}
                  </span>
                </div>
                <div class="context-summary__item">
                  <span class="context-summary__label">Fecha de aula</span>
                  <span class="context-summary__value">{{ formattedContextDate }}</span>
                </div>
                <div class="context-summary__item">
                  <span class="context-summary__label">Aula activa</span>
                  <span class="context-summary__value">{{ context.grade }} {{ context.section }}</span>
                </div>
                <div class="context-summary__item">
                  <span class="context-summary__label">Turno</span>
                  <span class="context-summary__value">{{ getShiftLabel(context.shift) }}</span>
                </div>
                <div class="context-summary__item">
                  <span class="context-summary__label">Marca manual</span>
                  <span class="context-summary__value">
                    {{ context.markType === 'entry' ? 'Entrada' : 'Salida' }}
                  </span>
                </div>
                <div class="context-summary__item">
                  <span class="context-summary__label">Condición</span>
                  <span class="context-summary__value">{{ currentStatusLabel }}</span>
                </div>
              </div>

              <div class="student-account-help-list q-mt-lg">
                <div class="student-account-help-item">
                  <q-icon name="qr_code_scanner" size="20px" color="primary" />
                  <div>
                    <div class="text-weight-medium">Puerta como flujo principal</div>
                    <div class="text-body2 text-grey-7">
                      Escanea uno a uno y deja que el sistema derive aula y turno del estudiante.
                    </div>
                  </div>
                </div>
                <div class="student-account-help-item">
                  <q-icon name="groups" size="20px" color="primary" />
                  <div>
                    <div class="text-weight-medium">Aula para revisión puntual</div>
                    <div class="text-body2 text-grey-7">
                      Usa el contexto manual solo cuando necesites revisar pendientes, alertas o
                      registrar apoyo manual.
                    </div>
                  </div>
                </div>
                <div class="student-account-help-item">
                  <q-icon name="support_agent" size="20px" color="primary" />
                  <div>
                    <div class="text-weight-medium">Soporte operativo</div>
                    <div class="text-body2 text-grey-7">
                      Si detectas un caso excepcional, abre la ficha del estudiante desde Aula o
                      Alertas para revisar el detalle.
                    </div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </section>
    </div>

    <q-dialog v-model="isCorrectionDialogOpen">
      <q-card class="admin-card correction-dialog-card">
        <q-card-section class="ui-card-body">
          <div class="row items-start justify-between q-col-gutter-md">
            <div class="col-12 col-md">
              <div class="ui-eyebrow">Corrección operativa</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                {{ selectedCorrectionTarget?.markType === 'entry' ? 'Corregir entrada' : 'Corregir salida' }}
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                Ajusta la marca del día actual con motivo obligatorio. La corrección queda auditada
                y no reemplaza el historial original.
              </p>
            </div>
            <div class="col-12 col-md-auto">
              <q-btn flat round dense icon="close" @click="closeCorrectionDialog" />
            </div>
          </div>

          <div v-if="selectedCorrectionTarget" class="correction-dialog-summary q-mt-lg">
            <div class="context-summary__item">
              <span class="context-summary__label">Estudiante</span>
              <span class="context-summary__value">{{ selectedCorrectionTarget.fullName }}</span>
            </div>
            <div class="context-summary__item">
              <span class="context-summary__label">Código</span>
              <span class="context-summary__value">{{ selectedCorrectionTarget.code }}</span>
            </div>
            <div class="context-summary__item">
              <span class="context-summary__label">Aula activa</span>
              <span class="context-summary__value">
                {{ context.grade }} {{ context.section }} · {{ getShiftLabel(context.shift) }}
              </span>
            </div>
            <div class="context-summary__item">
              <span class="context-summary__label">Marca actual</span>
              <span class="context-summary__value">
                {{ formatMarkedTime(selectedCorrectionTarget.mark.markedAt) }}
              </span>
            </div>
          </div>

          <StatusBanner
            v-if="correctionFeedback"
            class="q-mt-lg"
            :variant="correctionFeedback.type"
            :title="correctionFeedback.title"
            :message="correctionFeedback.message"
          />

          <q-form class="q-gutter-md q-mt-lg" @submit.prevent="handleSubmitCorrection">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-input
                  v-model="correctionForm.markedTime"
                  type="time"
                  label="Hora corregida"
                  outlined
                  :rules="[(value) => Boolean(value) || 'Ingresa la hora corregida']"
                >
                  <template #prepend>
                    <q-icon name="schedule" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <q-select
                  v-model="correctionForm.status"
                  label="Estado de la marca"
                  outlined
                  emit-value
                  map-options
                  :options="correctionStatusOptions"
                >
                  <template #prepend>
                    <q-icon name="fact_check" />
                  </template>
                </q-select>
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  v-model="correctionForm.observation"
                  label="Observación"
                  outlined
                  maxlength="255"
                >
                  <template #prepend>
                    <q-icon name="edit_note" />
                  </template>
                </q-input>
              </div>
            </div>

            <q-input
              v-model="correctionForm.reason"
              type="textarea"
              autogrow
              label="Motivo de la corrección"
              outlined
              maxlength="255"
              :rules="[(value) => Boolean(value.trim()) || 'Ingresa el motivo de la corrección']"
            >
              <template #prepend>
                <q-icon name="history_toggle_off" />
              </template>
            </q-input>

            <div class="row items-center justify-between q-gutter-sm">
              <div class="text-caption text-grey-7">
                El historial original se conserva y la auditoría queda asociada a esta marca.
              </div>
              <div class="correction-action-group">
                <q-btn flat color="grey-8" label="Cerrar" no-caps @click="closeCorrectionDialog" />
                <q-btn
                  color="primary"
                  label="Guardar corrección"
                  no-caps
                  type="submit"
                  :loading="isSavingCorrection"
                />
              </div>
            </div>
          </q-form>

          <q-separator class="q-my-lg" />

          <div class="ui-eyebrow">Historial de correcciones</div>
          <div class="text-subtitle2 text-weight-bold q-mt-sm">
            Cambios previos de esta marca
          </div>

          <div v-if="isLoadingCorrectionHistory" class="ui-loading-state q-py-lg">
            <q-spinner color="primary" size="28px" />
            <span class="text-body2 text-grey-7">Cargando historial...</span>
          </div>

          <div v-else-if="correctionHistory.length === 0" class="text-body2 text-grey-7 q-pt-md">
            Esta marca todavía no tiene correcciones registradas.
          </div>

          <q-list v-else bordered separator class="rounded-borders q-mt-md correction-history-list">
            <q-item v-for="item in correctionHistory" :key="item.id" class="q-py-md">
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ formatCorrectionHeadline(item) }}
                </q-item-label>
                <q-item-label caption>
                  {{ formatCorrectionSubline(item) }}
                </q-item-label>
                <q-item-label class="q-mt-sm text-body2">
                  Motivo: {{ item.reason }}
                </q-item-label>
                <q-item-label class="q-mt-sm text-caption text-grey-7">
                  Observación: {{ item.previousData.observation || 'Sin observación' }} ->
                  {{ item.nextData.observation || 'Sin observación' }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog
      v-model="isStudentDialogOpen"
      :maximized="isStudentDialogMaximized"
      :position="isStudentDialogSideSheet ? 'right' : 'standard'"
      :transition-show="isStudentDialogSideSheet ? 'slide-left' : 'scale'"
      :transition-hide="isStudentDialogSideSheet ? 'slide-right' : 'scale'"
    >
      <q-card
        class="admin-card student-profile-dialog-card student-profile-dialog-card--auxiliary"
        :class="{ 'student-profile-dialog-card--side': isStudentDialogSideSheet }"
      >
        <q-card-section class="ui-card-body">
          <div class="row items-start justify-between q-col-gutter-md">
            <div class="col-12 col-md">
              <div class="ui-eyebrow">Ficha del estudiante</div>
              <div class="text-subtitle1 text-weight-bold q-mt-sm">
                Consulta rápida para apoyo del auxiliar
              </div>
              <p class="text-body2 text-grey-7 q-mt-xs q-mb-none">
                Verifica datos, asistencia reciente y alertas sin salir del flujo del aula.
              </p>
            </div>
            <div class="col-12 col-md-auto">
              <q-btn flat round dense icon="close" @click="isStudentDialogOpen = false" />
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

          <StudentOperationalProfilePanel
            v-else-if="selectedStudentDetail"
            :student="selectedStudentDetail"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import AttendanceMarkBadge from 'components/attendance/AttendanceMarkBadge.vue';
import PasswordChangeCard from 'components/auth/PasswordChangeCard.vue';
import ResponsiveSectionNav, {
  type SectionNavItem,
} from 'components/navigation/ResponsiveSectionNav.vue';
import StudentOperationalProfilePanel from 'components/student/StudentOperationalProfilePanel.vue';
import PageIntroCard from 'components/ui/PageIntroCard.vue';
import StatSummaryCard from 'components/ui/StatSummaryCard.vue';
import StatusBanner from 'components/ui/StatusBanner.vue';
import {
  correctAttendanceRecord,
  exportAttendance,
  getAttendanceAlerts,
  getAttendanceCorrectionHistory,
  getDailyAttendance,
  getAttendanceOfflineContext,
  registerAttendanceByScan,
  registerAttendanceManual,
  syncOfflineAttendanceBatch,
} from 'src/services/api/attendance-api';
import { getApiErrorMessage, getApiErrorStatus, isApiNetworkError } from 'src/services/api/api-errors';
import { getHealthStatus } from 'src/services/api/health-api';
import {
  applyAuxiliaryOfflineSyncResult,
  findOfflineStudentByCode,
  getAuxiliaryOfflineContextSnapshot,
  getAuxiliaryOfflineQueue,
  getAuxiliaryOfflineSyncMeta,
  getOfflineStudentsForClassroom,
  markAuxiliaryOfflineSyncAttempt,
  queueOfflineManualAttendance,
  queueOfflineScanAttendance,
  storeAuxiliaryOfflineContextSnapshot,
  type AuxiliaryOfflineQueueItem,
} from 'src/services/offline/auxiliary-attendance-offline';
import { getStudentDetail } from 'src/services/api/students-api';
import { useInstitutionStore } from 'src/stores/institution-store';
import { useSessionStore } from 'src/stores/session-store';
import type {
  AttendanceAlert,
  AttendanceAlertsSummary,
  AttendanceCorrectionLog,
  AttendanceOfflineContextStudent,
  AttendanceExportFormat,
  AttendanceMarkType,
  AttendanceRecordStatus,
  DailyAttendanceItem,
  DailyAttendanceMark,
  DailyAttendanceSummary,
  RegisterAttendanceByScanPayload,
  RegisterAttendanceManualPayload,
  StudentShift,
} from 'src/types/attendance';
import type { InstitutionSettings } from 'src/types/institution';
import type { ChangePasswordPayload } from 'src/types/session';
import type { StudentDetail } from 'src/types/students';
import {
  getAttendanceAlertLabel,
  getAttendanceAlertTone,
} from 'src/utils/attendance-alerts';
import {
  getAttendanceDayStatusLabel,
  getAttendanceDayStatusTone,
  getAttendanceRecordStatusLabel,
  getAttendanceRecordStatusTone,
} from 'src/utils/attendance-status';
import { downloadBlobFile } from 'src/utils/download-file';

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

type InputFocusHandle = {
  focus: () => void;
};

type CorrectionTarget = {
  recordId: string;
  studentId: string;
  code: string;
  fullName: string;
  markType: AttendanceMarkType;
  mark: DailyAttendanceMark;
};

const AUXILIARY_CONTEXT_STORAGE_KEY = 'colegio.auxiliary.classroom-context';
const AUXILIARY_GATE_MODE_STORAGE_KEY = 'colegio.auxiliary.gate-mark-type';
type AuxiliarySection = 'gate' | 'classroom' | 'pending' | 'account';
const defaultAuxiliarySection: AuxiliarySection = 'gate';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const institutionStore = useInstitutionStore();
const sessionStore = useSessionStore();

const activeSection = ref<AuxiliarySection>(defaultAuxiliarySection);
const gateMarkType = ref<AttendanceMarkType>('entry');
const scannerModeEnabled = ref(true);
const scanInputRef = ref<InputFocusHandle | null>(null);
const isSubmittingScan = ref(false);
const scanFeedback = ref<FeedbackState | null>(null);
const scanForm = reactive({
  studentCode: '',
});

const context = reactive({
  attendanceDate: getTodayInLima(),
  schoolYear: new Date().getFullYear(),
  grade: 1,
  section: 'A',
  shift: 'morning' as StudentShift,
  markType: 'entry' as AttendanceMarkType,
  status: 'regular' as AttendanceRecordStatus,
});

const isContextEditorOpen = ref(false);
const isLoadingDaily = ref(false);
const isLoadingAttendanceAlerts = ref(false);
const manualSubmittingStudentId = ref<string | null>(null);
const exportingFormat = ref<AttendanceExportFormat | null>(null);
const isStudentDialogOpen = ref(false);
const isLoadingStudentDetail = ref(false);
const isChangingOwnPassword = ref(false);
const selectedStudentDetail = ref<StudentDetail | null>(null);
const isCorrectionDialogOpen = ref(false);
const isLoadingCorrectionHistory = ref(false);
const isSavingCorrection = ref(false);
const selectedCorrectionTarget = ref<CorrectionTarget | null>(null);
const correctionHistory = ref<AttendanceCorrectionLog[]>([]);

const dailyItems = ref<DailyAttendanceItem[]>([]);
const dailySummary = ref<DailyAttendanceSummary>(createEmptyDailySummary());
const attendanceAlerts = ref<AttendanceAlert[]>([]);
const attendanceAlertsSummary = ref<AttendanceAlertsSummary>(
  createEmptyAlertsSummary(),
);
const attendanceAlertsSearch = ref('');
const browserOnline = ref(
  typeof navigator === 'undefined' ? true : navigator.onLine,
);
const backendReachable = ref<boolean | null>(
  browserOnline.value ? null : false,
);
const isLoadingOfflineContext = ref(false);
const isSyncingOfflineQueue = ref(false);
const offlineContextSnapshot = ref(getAuxiliaryOfflineContextSnapshot());
const offlineQueue = ref<AuxiliaryOfflineQueueItem[]>(getAuxiliaryOfflineQueue());
const offlineSyncMeta = ref(getAuxiliaryOfflineSyncMeta());

const dailyFeedback = ref<FeedbackState | null>(null);
const attendanceAlertsFeedback = ref<FeedbackState | null>(null);
const studentDetailFeedback = ref<FeedbackState | null>(null);
const accountPasswordFeedback = ref<FeedbackState | null>(null);
const correctionFeedback = ref<FeedbackState | null>(null);
const offlineSyncFeedback = ref<FeedbackState | null>(null);

const correctionForm = reactive({
  markedTime: '',
  status: 'regular' as AttendanceRecordStatus,
  observation: '',
  reason: '',
});

const auxiliarySectionItems: SectionNavItem[] = [
  { value: 'gate', label: 'Puerta', icon: 'qr_code_scanner' },
  { value: 'classroom', label: 'Aula', icon: 'groups' },
  { value: 'pending', label: 'Pendientes', icon: 'sync_problem' },
  { value: 'account', label: 'Cuenta', icon: 'account_circle' },
];

const gateModeOptions: Array<{ label: string; value: AttendanceMarkType }> = [
  { label: 'Entrada', value: 'entry' },
  { label: 'Salida', value: 'exit' },
];
const enabledTurns = computed<StudentShift[]>(() =>
  institutionStore.settings?.enabledTurns ??
  (['morning', 'afternoon'] satisfies StudentShift[]),
);

const enabledGrades = computed<number[]>(() =>
  institutionStore.settings?.enabledGrades ?? [1, 2, 3, 4, 5],
);



const shiftOptions = computed(() =>
  enabledTurns.value.map((shift) => ({
    label: getShiftLabel(shift),
    value: shift,
  })),
);

const gradeOptions = computed(() =>
  enabledGrades.value.map((grade) => ({
    label: `${grade} grado`,
    value: grade,
  })),
);

const sectionOptions = computed(() => {
  const settings = institutionStore.settings;
  const sections = settings?.sectionsByGrade[String(context.grade)] ?? ['A'];

  return sections.map((section) => ({
    label: section,
    value: section,
  }));
});

const markTypeOptions = computed(() =>
  gateModeOptions.map((option) => ({
    label: option.label,
    value: option.value,
  })),
);

const statusOptions = computed<Array<{ label: string; value: AttendanceRecordStatus }>>(() => {
  if (context.markType === 'entry') {
    return [
      { label: 'Regular', value: 'regular' },
      { label: 'Tardanza', value: 'late' },
    ];
  }

  return [
    { label: 'Regular', value: 'regular' },
    { label: 'Salida anticipada', value: 'early_departure' },
  ];
});

const formattedGateDate = computed(() => formatDateLong(getTodayInLima()));
const formattedContextDate = computed(() => formatDateLong(context.attendanceDate));
const currentMarkIcon = computed(() =>
  context.markType === 'entry' ? 'login' : 'logout',
);
const currentStatusLabel = computed(() =>
  getAttendanceRecordStatusLabel(context.status),
);
const currentStatusTone = computed(() =>
  getAttendanceRecordStatusTone(context.status),
);
const activeSectionLabel = computed(() => {
  if (activeSection.value === 'classroom') {
    return 'Modo Aula';
  }

  if (activeSection.value === 'pending') {
    return 'Pendientes';
  }

  if (activeSection.value === 'account') {
    return 'Cuenta';
  }

  return 'Modo Puerta';
});
const pendingQueueCount = computed(() => offlineQueue.value.length);
const connectivityTone = computed(() =>
  isOnline.value
    ? { color: 'positive', textColor: 'white', icon: 'cloud_done' }
    : { color: 'orange-1', textColor: 'orange-10', icon: 'cloud_off' },
);
const offlineSnapshot = computed(() => offlineContextSnapshot.value);
const offlineContextAvailable = computed(() => Boolean(offlineSnapshot.value));
const offlineClassroomStudents = computed(() => {
  const snapshotStudents = getOfflineStudentsForClassroom({
    grade: context.grade,
    section: context.section,
    shift: context.shift,
  });

  return snapshotStudents.map((student) => {
    const queuedEntry =
      offlineQueue.value.find(
        (item) =>
          item.attendanceDate === context.attendanceDate &&
          item.markType === 'entry' &&
          ((item.studentId && item.studentId === student.studentId) ||
            (item.studentCode && item.studentCode === student.code)),
      ) ?? null;
    const queuedExit =
      offlineQueue.value.find(
        (item) =>
          item.attendanceDate === context.attendanceDate &&
          item.markType === 'exit' &&
          ((item.studentId && item.studentId === student.studentId) ||
            (item.studentCode && item.studentCode === student.code)),
      ) ?? null;

    return {
      ...student,
      queuedEntry,
      queuedExit,
    };
  });
});
const offlineQueueClassrooms = computed(() => {
  const labels = new Set(
    offlineQueue.value.map(
      (item) =>
        `${item.grade} ${item.section} - ${getShiftLabel(item.shift)}`,
    ),
  );

  return Array.from(labels);
});
const lastOfflineSyncLabel = computed(() => {
  const value = offlineSyncMeta.value.lastSuccessfulSyncAt;

  if (!value) {
    return 'Sin sincronización reciente';
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(value));
});
const isOnline = computed(
  () => browserOnline.value && backendReachable.value !== false,
);
const classroomIncidents = computed(
  () =>
    dailySummary.value.lateEntries +
    dailySummary.value.earlyDepartures +
    dailySummary.value.absences +
    dailySummary.value.incompleteRecords,
);
const isStudentDialogSideSheet = computed(() => $q.screen.gt.md);
const isStudentDialogMaximized = computed(() => $q.screen.width < 768);
const canCorrectCurrentClassroom = computed(
  () => context.attendanceDate === getTodayInLima(),
);
const correctionStatusOptions = computed<
  Array<{ label: string; value: AttendanceRecordStatus }>
>(() => {
  if (selectedCorrectionTarget.value?.markType === 'entry') {
    return [
      { label: 'Regular', value: 'regular' },
      { label: 'Tardanza', value: 'late' },
    ];
  }

  return [
    { label: 'Regular', value: 'regular' },
    { label: 'Salida anticipada', value: 'early_departure' },
  ];
});

const dailyFocusFeedback = computed<FeedbackState>(() => {
  if (dailySummary.value.totalStudents === 0) {
    return {
      type: 'info',
      title: 'Contexto listo para revisión',
      message:
        'Carga un aula válida para revisar pendientes, registrar apoyo manual y abrir fichas de estudiantes.',
    };
  }

  if (context.markType === 'entry') {
    if (dailySummary.value.pendingEntries === 0) {
      return {
        type: 'success',
        title: 'Entradas completas',
        message:
          'Todos los estudiantes activos del aula ya tienen una entrada registrada para la fecha seleccionada.',
      };
    }

    return {
      type: 'info',
      title: 'Entradas pendientes por revisar',
      message: `Todavía hay ${dailySummary.value.pendingEntries} estudiante(s) sin entrada registrada en este contexto.`,
    };
  }

  if (dailySummary.value.pendingExits === 0) {
    return {
      type: 'success',
      title: 'Salidas completas',
      message:
        'Todos los estudiantes activos del aula ya tienen una salida registrada para la fecha seleccionada.',
    };
  }

  return {
    type: 'warning',
    title: 'Salidas pendientes por revisar',
    message: `Todavía hay ${dailySummary.value.pendingExits} estudiante(s) sin salida registrada en este contexto.`,
  };
});

function createEmptyDailySummary(): DailyAttendanceSummary {
  return {
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    entriesRegistered: 0,
    exitsRegistered: 0,
    lateEntries: 0,
    earlyDepartures: 0,
    justifiedAbsences: 0,
    unjustifiedAbsences: 0,
    absences: 0,
    pendingEntries: 0,
    pendingExits: 0,
    incompleteRecords: 0,
  };
}

function createEmptyAlertsSummary(): AttendanceAlertsSummary {
  return {
    totalAlerts: 0,
    studentsWithAlerts: 0,
    consecutiveAbsenceAlerts: 0,
    repeatedIncompleteRecordAlerts: 0,
    repeatedLateEntryAlerts: 0,
  };
}

function getTodayInLima(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatDateLong(date: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeZone: 'America/Lima',
  }).format(new Date(`${date}T00:00:00-05:00`));
}

function formatMarkedTime(dateTime: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(new Date(dateTime));
}

function formatTimeForInput(dateTime: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(new Date(dateTime));
}

function formatAlertDate(date: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(`${date}T00:00:00-05:00`));
}

function getShiftLabel(shift: StudentShift): string {
  return shift === 'morning' ? 'Turno mañana' : 'Turno tarde';
}

function getOperationalStatusLabel(item: DailyAttendanceItem): string {
  if (item.absence) {
    return getAttendanceDayStatusLabel(item.absence.statusType);
  }

  if (item.entry && item.exit) {
    return 'Completo';
  }

  if (item.entry) {
    return 'Pendiente de salida';
  }

  if (item.exit) {
    return 'Pendiente de entrada';
  }

  return 'Pendiente';
}

function isManualActionDisabled(item: DailyAttendanceItem): boolean {
  if (!item.isActive || Boolean(item.absence) || manualSubmittingStudentId.value !== null) {
    return true;
  }

  if (context.markType === 'entry') {
    return Boolean(item.entry);
  }

  return Boolean(item.exit) || !item.entry;
}

function isCorrectionActionDisabled(
  item: DailyAttendanceItem,
  markType: AttendanceMarkType,
): boolean {
  if (!canCorrectCurrentClassroom.value) {
    return true;
  }

  return markType === 'entry' ? !item.entry : !item.exit;
}

function formatCorrectionHeadline(item: AttendanceCorrectionLog): string {
  const label = item.markType === 'entry' ? 'Entrada' : 'Salida';
  const statusSuffix =
    item.previousData.status !== item.nextData.status
      ? ` (${getAttendanceRecordStatusLabel(item.previousData.status)} -> ${getAttendanceRecordStatusLabel(item.nextData.status)})`
      : '';

  return `${label}: ${item.previousData.markedTime} -> ${item.nextData.markedTime}${statusSuffix}`;
}

function formatCorrectionSubline(item: AttendanceCorrectionLog): string {
  const correctedAtLabel = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(item.correctedAt));

  return `${item.correctedByDisplayName} - ${correctedAtLabel}`;
}

function createCorrectionErrorFeedback(error: unknown): FeedbackState {
  const status = getApiErrorStatus(error);
  const message = getApiErrorMessage(error);

  if (status === 404) {
    return {
      type: 'error',
      title: 'Marca no encontrada',
      message,
    };
  }

  if (status === 400 || status === 403 || status === 409 || status === 422) {
    return {
      type: 'warning',
      title: 'Corrección no permitida',
      message,
    };
  }

  return {
    type: 'error',
    title: 'No se pudo guardar la corrección',
    message,
  };
}

async function loadCorrectionHistory(attendanceRecordId: string): Promise<void> {
  isLoadingCorrectionHistory.value = true;

  try {
    correctionHistory.value = await getAttendanceCorrectionHistory(attendanceRecordId);
  } catch (error) {
    correctionHistory.value = [];
    correctionFeedback.value = createCorrectionErrorFeedback(error);
  } finally {
    isLoadingCorrectionHistory.value = false;
  }
}

async function openCorrectionDialog(
  item: DailyAttendanceItem,
  markType: AttendanceMarkType,
): Promise<void> {
  const mark = markType === 'entry' ? item.entry : item.exit;

  if (!mark || isCorrectionActionDisabled(item, markType)) {
    return;
  }

  selectedCorrectionTarget.value = {
    recordId: mark.id,
    studentId: item.studentId,
    code: item.code,
    fullName: item.fullName,
    markType,
    mark,
  };
  correctionForm.markedTime = formatTimeForInput(mark.markedAt);
  correctionForm.status = mark.status;
  correctionForm.observation = mark.observation ?? '';
  correctionForm.reason = '';
  correctionHistory.value = [];
  correctionFeedback.value = null;
  isCorrectionDialogOpen.value = true;
  await loadCorrectionHistory(mark.id);
}

function closeCorrectionDialog(): void {
  isCorrectionDialogOpen.value = false;
  selectedCorrectionTarget.value = null;
  correctionHistory.value = [];
  correctionFeedback.value = null;
  correctionForm.markedTime = '';
  correctionForm.status = 'regular';
  correctionForm.observation = '';
  correctionForm.reason = '';
}

function normalizeAuxiliarySection(value: unknown): AuxiliarySection {
  if (typeof value !== 'string') {
    return defaultAuxiliarySection;
  }

  if (['gate', 'scan', 'register', 'puerta'].includes(value)) {
    return 'gate';
  }

  if (['classroom', 'aula'].includes(value)) {
    return 'classroom';
  }

  if (['pending', 'pendientes', 'alerts', 'alertas'].includes(value)) {
    return 'pending';
  }

  if (['account', 'profile', 'cuenta'].includes(value)) {
    return 'account';
  }

  return defaultAuxiliarySection;
}

function syncAuxiliarySectionQuery(section: AuxiliarySection): void {
  const nextQuery = { ...route.query };

  if (section === defaultAuxiliarySection) {
    delete nextQuery.section;
  } else {
    nextQuery.section = section;
  }

  void router.replace({
    query: nextQuery,
  });
}

function ensureContextMatchesInstitution(settings: InstitutionSettings): void {
  context.schoolYear = settings.activeSchoolYear;
  context.attendanceDate = context.attendanceDate || getTodayInLima();

  if (!settings.enabledTurns.includes(context.shift)) {
    context.shift = settings.enabledTurns[0] ?? 'morning';
  }

  if (!settings.enabledGrades.includes(context.grade)) {
    context.grade = settings.enabledGrades[0] ?? 1;
  }

  const availableSections = settings.sectionsByGrade[String(context.grade)] ?? ['A'];

  if (!availableSections.includes(context.section)) {
    context.section = availableSections[0] ?? 'A';
  }

  if (
    context.markType === 'entry' &&
    !['regular', 'late'].includes(context.status)
  ) {
    context.status = 'regular';
  }

  if (
    context.markType === 'exit' &&
    !['regular', 'early_departure'].includes(context.status)
  ) {
    context.status = 'regular';
  }
}

function restorePersistedGateMode(): void {
  const stored = localStorage.getItem(AUXILIARY_GATE_MODE_STORAGE_KEY);

  if (stored === 'entry' || stored === 'exit') {
    gateMarkType.value = stored;
  }
}

function restorePersistedClassroomContext(): void {
  const stored = localStorage.getItem(AUXILIARY_CONTEXT_STORAGE_KEY);

  if (!stored) {
    return;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<typeof context>;

    if (typeof parsed.attendanceDate === 'string') {
      context.attendanceDate = parsed.attendanceDate;
    }

    if (typeof parsed.schoolYear === 'number') {
      context.schoolYear = parsed.schoolYear;
    }

    if (typeof parsed.grade === 'number') {
      context.grade = parsed.grade;
    }

    if (typeof parsed.section === 'string' && parsed.section.trim()) {
      context.section = parsed.section.trim().toUpperCase();
    }

    if (parsed.shift === 'morning' || parsed.shift === 'afternoon') {
      context.shift = parsed.shift;
    }

    if (parsed.markType === 'entry' || parsed.markType === 'exit') {
      context.markType = parsed.markType;
    }

    if (
      parsed.status === 'regular' ||
      parsed.status === 'late' ||
      parsed.status === 'early_departure'
    ) {
      context.status = parsed.status;
    }
  } catch {
    localStorage.removeItem(AUXILIARY_CONTEXT_STORAGE_KEY);
  }
}

function persistClassroomContext(): void {
  localStorage.setItem(
    AUXILIARY_CONTEXT_STORAGE_KEY,
    JSON.stringify({
      attendanceDate: context.attendanceDate,
      schoolYear: context.schoolYear,
      grade: context.grade,
      section: context.section,
      shift: context.shift,
      markType: context.markType,
      status: context.status,
    }),
  );
}

function refreshOfflineState(): void {
  offlineContextSnapshot.value = getAuxiliaryOfflineContextSnapshot();
  offlineQueue.value = getAuxiliaryOfflineQueue();
  offlineSyncMeta.value = getAuxiliaryOfflineSyncMeta();
}

function syncBrowserConnectivity(): void {
  if (typeof navigator === 'undefined') {
    browserOnline.value = true;
    return;
  }

  browserOnline.value = navigator.onLine;

  if (!navigator.onLine) {
    backendReachable.value = false;
  }
}

function markBackendReachable(): void {
  syncBrowserConnectivity();
  backendReachable.value = true;
}

function markOfflineMode(): void {
  syncBrowserConnectivity();
  backendReachable.value = false;
  refreshOfflineState();
}

function handleConnectivityFailure(error: unknown): void {
  syncBrowserConnectivity();

  if (!browserOnline.value || isApiNetworkError(error)) {
    markOfflineMode();
  }
}

async function refreshConnectivityStatus(probeBackend = false): Promise<boolean> {
  syncBrowserConnectivity();

  if (!browserOnline.value) {
    markOfflineMode();
    return false;
  }

  if (!probeBackend) {
    if (backendReachable.value === null) {
      backendReachable.value = true;
    }

    return true;
  }

  try {
    await getHealthStatus();
    backendReachable.value = true;
    return true;
  } catch {
    markOfflineMode();
    return false;
  }
}

async function loadOfflineContext(): Promise<void> {
  if (!isOnline.value) {
    refreshOfflineState();
    return;
  }

  isLoadingOfflineContext.value = true;

  try {
    const snapshot = await getAttendanceOfflineContext(context.attendanceDate);
    markBackendReachable();
    storeAuxiliaryOfflineContextSnapshot(snapshot);
    refreshOfflineState();
  } catch (error) {
    handleConnectivityFailure(error);
    offlineSyncFeedback.value = {
      type: 'warning',
      title: 'No se pudo actualizar el contexto offline',
      message: isOnline.value
        ? getApiErrorMessage(error)
        : 'No se pudo alcanzar el servidor. Se mantiene el último contexto guardado en este dispositivo.',
    };
  } finally {
    isLoadingOfflineContext.value = false;
  }
}

function resolveOfflineStudentSnapshot(
  lookup: { studentId: string; studentCode: string },
): AttendanceOfflineContextStudent | null {
  const snapshot = offlineSnapshot.value;

  if (!snapshot) {
    return null;
  }

  return (
    snapshot.students.find(
      (student) =>
        (lookup.studentId && student.studentId === lookup.studentId) ||
        (lookup.studentCode && student.code === lookup.studentCode),
    ) ?? null
  );
}

function buildOfflineQueueSuccessFeedback(
  title: string,
  student: AttendanceOfflineContextStudent,
): FeedbackState {
  return {
    type: 'success',
    title,
    message: `${student.fullName} quedó guardado en el celular y se sincronizará cuando vuelva la conexión.`,
  };
}

async function syncPendingOfflineQueue(): Promise<void> {
  if (!isOnline.value) {
    offlineSyncFeedback.value = {
      type: 'warning',
      title: 'Sin conexión',
      message: 'Necesitas internet para sincronizar las marcas pendientes.',
    };
    return;
  }

  if (offlineQueue.value.length === 0) {
    offlineSyncFeedback.value = {
      type: 'info',
      title: 'Sin pendientes',
      message: 'No hay marcas offline por sincronizar en este momento.',
    };
    return;
  }

  isSyncingOfflineQueue.value = true;
  markAuxiliaryOfflineSyncAttempt();

  try {
    const response = await syncOfflineAttendanceBatch(
      offlineQueue.value.map((item) => ({
        clientId: item.clientId,
        source: item.source,
        ...(item.studentId ? { studentId: item.studentId } : {}),
        ...(item.studentCode ? { studentCode: item.studentCode } : {}),
        attendanceDate: item.attendanceDate,
        markedAt: item.markedAt,
        schoolYear: item.schoolYear,
        grade: item.grade,
        section: item.section,
        shift: item.shift,
        markType: item.markType,
        ...(item.status ? { status: item.status } : {}),
        ...(item.observation ? { observation: item.observation } : {}),
      })),
    );

    markBackendReachable();
    applyAuxiliaryOfflineSyncResult(response);
    refreshOfflineState();

    const rejectedCount = response.summary.rejectedItems;
    offlineSyncFeedback.value = {
      type: rejectedCount > 0 ? 'warning' : 'success',
      title:
        rejectedCount > 0
          ? 'Sincronización parcial'
          : 'Pendientes sincronizados',
      message:
        rejectedCount > 0
          ? `Se sincronizaron ${response.summary.acceptedItems + response.summary.duplicateItems} marca(s) y ${rejectedCount} quedaron pendientes por revisión.`
          : `Se sincronizaron ${response.summary.acceptedItems + response.summary.duplicateItems} marca(s) correctamente.`,
    };

    await Promise.all([
      loadOfflineContext(),
      loadDailyAttendance(),
      loadAttendanceAlerts(),
    ]);
  } catch (error) {
    handleConnectivityFailure(error);
    offlineSyncFeedback.value = {
      type: isOnline.value ? 'error' : 'warning',
      title: 'No se pudieron sincronizar los pendientes',
      message: isOnline.value
        ? getApiErrorMessage(error)
        : 'La conexión se perdió antes de sincronizar. Los pendientes siguen guardados localmente.',
    };
  } finally {
    isSyncingOfflineQueue.value = false;
  }
}

function handleContextGradeChange(): void {
  const settings = institutionStore.settings;
  const availableSections = settings?.sectionsByGrade[String(context.grade)] ?? ['A'];

  if (!availableSections.includes(context.section)) {
    context.section = availableSections[0] ?? 'A';
  }
}

function handleContextBarAction(): void {
  isContextEditorOpen.value = true;
}

function buildDailyQuery() {
  return {
    attendanceDate: context.attendanceDate,
    schoolYear: context.schoolYear,
    grade: context.grade,
    section: context.section,
    shift: context.shift,
  };
}

async function loadDailyAttendance(): Promise<void> {
  if (!isOnline.value) {
    dailyItems.value = [];
    dailySummary.value = createEmptyDailySummary();
    dailyFeedback.value = {
      type: 'info',
      title: 'Modo sin conexión',
      message:
        'El detalle completo del aula se actualizará cuando recuperes internet. Mientras tanto puedes seguir registrando pendientes con el snapshot local.',
    };
    return;
  }

  isLoadingDaily.value = true;

  try {
    const response = await getDailyAttendance(buildDailyQuery());
    markBackendReachable();
    dailyItems.value = response.items;
    dailySummary.value = response.summary;
  } catch (error) {
    handleConnectivityFailure(error);
    dailyItems.value = [];
    dailySummary.value = createEmptyDailySummary();
    dailyFeedback.value = {
      type: isOnline.value ? 'error' : 'info',
      title: isOnline.value ? 'No se pudo cargar el aula' : 'Modo sin conexión',
      message: isOnline.value
        ? getApiErrorMessage(error)
        : 'El detalle completo del aula se actualizará cuando recuperes internet. Mientras tanto puedes seguir registrando pendientes con el snapshot local.',
    };
  } finally {
    isLoadingDaily.value = false;
  }
}

async function loadAttendanceAlerts(): Promise<void> {
  if (!isOnline.value) {
    attendanceAlerts.value = [];
    attendanceAlertsSummary.value = createEmptyAlertsSummary();
    attendanceAlertsFeedback.value = {
      type: 'info',
      title: 'Alertas no disponibles sin conexión',
      message:
        'Las alertas del aula volverán a cargarse cuando recuperes internet.',
    };
    return;
  }

  isLoadingAttendanceAlerts.value = true;

  try {
    const query: {
      schoolYear: number;
      grade: number;
      section: string;
      shift: StudentShift;
      limit: number;
      search?: string;
    } = {
      schoolYear: context.schoolYear,
      grade: context.grade,
      section: context.section,
      shift: context.shift,
      limit: 50,
    };

    if (attendanceAlertsSearch.value.trim()) {
      query.search = attendanceAlertsSearch.value.trim();
    }

    const response = await getAttendanceAlerts(query);

    markBackendReachable();
    attendanceAlerts.value = response.items;
    attendanceAlertsSummary.value = response.summary;
  } catch (error) {
    handleConnectivityFailure(error);
    attendanceAlerts.value = [];
    attendanceAlertsSummary.value = createEmptyAlertsSummary();
    attendanceAlertsFeedback.value = {
      type: isOnline.value ? 'error' : 'info',
      title: isOnline.value ? 'No se pudieron cargar las alertas' : 'Alertas no disponibles sin conexión',
      message: isOnline.value
        ? getApiErrorMessage(error)
        : 'Las alertas del aula volverán a cargarse cuando recuperes internet.',
    };
  } finally {
    isLoadingAttendanceAlerts.value = false;
  }
}

async function handleContextSubmit(): Promise<void> {
  dailyFeedback.value = null;
  attendanceAlertsFeedback.value = null;
  offlineSyncFeedback.value = null;
  if (institutionStore.settings) {
    ensureContextMatchesInstitution(institutionStore.settings);
  }
  persistClassroomContext();
  await Promise.all([
    loadDailyAttendance(),
    loadAttendanceAlerts(),
    loadOfflineContext(),
  ]);
  isContextEditorOpen.value = false;

  if (!dailyFeedback.value) {
    dailyFeedback.value = {
      type: 'success',
      title: 'Contexto actualizado',
      message: 'El aula activa quedó lista para continuar con la revisión manual.',
    };
  }
}

function focusScannerInput(): void {
  void nextTick(() => {
    scanInputRef.value?.focus();
  });
}

async function handleScanSubmit(): Promise<void> {
  scanFeedback.value = null;
  const studentCode = scanForm.studentCode.trim().toLowerCase();

  if (!studentCode) {
    scanFeedback.value = {
      type: 'warning',
      title: 'Código requerido',
      message: 'Ingresa o escanea el código del estudiante para registrar la asistencia.',
    };
    focusScannerInput();
    return;
  }

  isSubmittingScan.value = true;

  try {
    if (!isOnline.value) {
      const student = findOfflineStudentByCode(studentCode);

      if (!student) {
        scanFeedback.value = {
          type: 'warning',
          title: 'Código no disponible offline',
          message:
            'Actualiza el contexto con internet antes de registrar este estudiante sin conexión.',
        };
        return;
      }

      queueOfflineScanAttendance({
        student,
        attendanceDate: getTodayInLima(),
        schoolYear: context.schoolYear,
        markType: gateMarkType.value,
      });
      refreshOfflineState();
      scanFeedback.value = buildOfflineQueueSuccessFeedback(
        gateMarkType.value === 'entry'
          ? 'Entrada guardada sin conexión'
          : 'Salida guardada sin conexión',
        student,
      );
      scanForm.studentCode = '';
      return;
    }

    const scanPayload: RegisterAttendanceByScanPayload = {
      studentCode,
      markType: gateMarkType.value,
    };
    const response = await registerAttendanceByScan(scanPayload);

    markBackendReachable();
    scanFeedback.value = {
      type: 'success',
      title:
        response.markType === 'entry'
          ? 'Entrada registrada'
          : 'Salida registrada',
      message: `${response.fullName} - ${response.grade} ${response.section} - ${getShiftLabel(response.shift)} a las ${formatMarkedTime(response.markedAt)}.`,
    };
    scanForm.studentCode = '';
  } catch (error) {
    handleConnectivityFailure(error);
    const status = getApiErrorStatus(error);
    scanFeedback.value = {
      type: status === 409 || status === 422 ? 'warning' : 'error',
      title:
        status === 404
          ? 'Código no encontrado'
          : status === 409 || status === 422
            ? 'Registro no aplicado'
            : 'No se pudo registrar la asistencia',
      message: getApiErrorMessage(error),
    };
  } finally {
    isSubmittingScan.value = false;

    if (scannerModeEnabled.value) {
      focusScannerInput();
    }
  }
}

async function handleManualRegister(item: DailyAttendanceItem): Promise<void> {
  dailyFeedback.value = null;
  manualSubmittingStudentId.value = item.studentId;

  try {
    if (!isOnline.value) {
      const student = resolveOfflineStudentSnapshot({
        studentId: item.studentId,
        studentCode: item.code,
      });

      if (!student) {
        dailyFeedback.value = {
          type: 'warning',
          title: 'Sin snapshot local del estudiante',
          message:
            'Recarga el aula con internet antes de registrar marcas manuales sin conexión.',
        };
        return;
      }

      queueOfflineManualAttendance({
        student,
        attendanceDate: context.attendanceDate,
        schoolYear: context.schoolYear,
        markType: context.markType,
        status: context.status,
      });
      refreshOfflineState();
      dailyFeedback.value = buildOfflineQueueSuccessFeedback(
        context.markType === 'entry'
          ? 'Entrada guardada sin conexión'
          : 'Salida guardada sin conexión',
        student,
      );
      return;
    }

    const payload: RegisterAttendanceManualPayload = {
      studentId: item.studentId,
      attendanceDate: context.attendanceDate,
      schoolYear: context.schoolYear,
      grade: context.grade,
      section: context.section,
      shift: context.shift,
      markType: context.markType,
      status: context.status,
    };

    const response = await registerAttendanceManual(payload);
    markBackendReachable();
    dailyFeedback.value = {
      type: 'success',
      title:
        response.markType === 'entry'
          ? 'Entrada manual registrada'
          : 'Salida manual registrada',
      message: `Se registró ${response.markType === 'entry' ? 'la entrada' : 'la salida'} de ${response.fullName} en el aula activa.`,
    };

    await Promise.all([
      loadDailyAttendance(),
      loadAttendanceAlerts(),
      loadOfflineContext(),
    ]);
  } catch (error) {
    handleConnectivityFailure(error);
    const status = getApiErrorStatus(error);
    dailyFeedback.value = {
      type: status === 409 || status === 422 ? 'warning' : 'error',
      title:
        status === 409 || status === 422
          ? 'Registro manual no aplicado'
          : 'No se pudo registrar la marca manual',
      message: getApiErrorMessage(error),
    };
  } finally {
    manualSubmittingStudentId.value = null;
  }
}

function handleOfflineManualRegister(student: AttendanceOfflineContextStudent): void {
  dailyFeedback.value = null;

  try {
    queueOfflineManualAttendance({
      student,
      attendanceDate: context.attendanceDate,
      schoolYear: context.schoolYear,
      markType: context.markType,
      status: context.status,
    });
    refreshOfflineState();
    dailyFeedback.value = buildOfflineQueueSuccessFeedback(
      context.markType === 'entry'
        ? 'Entrada guardada sin conexión'
        : 'Salida guardada sin conexión',
      student,
    );
  } catch (error) {
    dailyFeedback.value = {
      type: 'warning',
      title: 'No se pudo guardar la marca offline',
      message: error instanceof Error ? error.message : 'Intenta nuevamente.',
    };
  }
}

async function handleSubmitCorrection(): Promise<void> {
  if (!selectedCorrectionTarget.value) {
    return;
  }

  correctionFeedback.value = null;

  if (!correctionForm.markedTime) {
    correctionFeedback.value = {
      type: 'warning',
      title: 'Hora requerida',
      message: 'Ingresa la hora corregida para continuar.',
    };
    return;
  }

  if (!correctionForm.reason.trim()) {
    correctionFeedback.value = {
      type: 'warning',
      title: 'Motivo obligatorio',
      message: 'Describe brevemente por qué estás corrigiendo esta marca.',
    };
    return;
  }

  isSavingCorrection.value = true;

  try {
    await correctAttendanceRecord(selectedCorrectionTarget.value.recordId, {
      markedTime: correctionForm.markedTime,
      status: correctionForm.status,
      observation: correctionForm.observation.trim() || null,
      reason: correctionForm.reason.trim(),
      schoolYear: context.schoolYear,
      grade: context.grade,
      section: context.section,
      shift: context.shift,
    });

    markBackendReachable();
    dailyFeedback.value = {
      type: 'success',
      title:
        selectedCorrectionTarget.value?.markType === 'entry'
          ? 'Entrada corregida'
          : 'Salida corregida',
      message: `La corrección de ${selectedCorrectionTarget.value.fullName} quedó registrada con auditoría.`,
    };

    closeCorrectionDialog();
    await Promise.all([loadDailyAttendance(), loadAttendanceAlerts()]);
  } catch (error) {
    handleConnectivityFailure(error);
    correctionFeedback.value = createCorrectionErrorFeedback(error);
  } finally {
    isSavingCorrection.value = false;
  }
}

async function handleExportAttendance(format: AttendanceExportFormat): Promise<void> {
  dailyFeedback.value = null;
  exportingFormat.value = format;

  try {
    const { blob, fileName } = await exportAttendance({
      attendanceDate: context.attendanceDate,
      schoolYear: context.schoolYear,
      grade: context.grade,
      section: context.section,
      shift: context.shift,
      format,
    });

    markBackendReachable();
    downloadBlobFile(blob, fileName);
    dailyFeedback.value = {
      type: 'success',
      title: format === 'csv' ? 'CSV listo' : 'Excel listo',
      message: `La descarga de ${fileName} comenzó correctamente para el aula activa.`,
    };
  } catch (error) {
    handleConnectivityFailure(error);
    dailyFeedback.value = {
      type: 'error',
      title: 'No se pudo exportar la asistencia',
      message: getApiErrorMessage(error),
    };
  } finally {
    exportingFormat.value = null;
  }
}

async function handleLoadAttendanceAlerts(): Promise<void> {
  attendanceAlertsFeedback.value = null;
  await loadAttendanceAlerts();
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
      message: 'Tu contraseña personal fue actualizada correctamente.',
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

function resetAttendanceAlertsSearch(): void {
  attendanceAlertsSearch.value = '';
  void loadAttendanceAlerts();
}

async function handleReconnect(): Promise<void> {
  const canReachBackend = await refreshConnectivityStatus(true);

  if (!canReachBackend) {
    return;
  }

  await Promise.all([
    loadOfflineContext(),
    loadDailyAttendance(),
    loadAttendanceAlerts(),
  ]);

  if (offlineQueue.value.length > 0) {
    await syncPendingOfflineQueue();
  }
}

function handleDisconnect(): void {
  markOfflineMode();
}

function handleOnlineEvent(): void {
  void handleReconnect();
}

async function handleOpenStudent(studentId: string): Promise<void> {
  studentDetailFeedback.value = null;
  selectedStudentDetail.value = null;
  isStudentDialogOpen.value = true;
  isLoadingStudentDetail.value = true;

  try {
    selectedStudentDetail.value = await getStudentDetail(studentId);
    markBackendReachable();
  } catch (error) {
    handleConnectivityFailure(error);
    studentDetailFeedback.value = {
      type: 'error',
      title: 'No se pudo cargar la ficha del estudiante',
      message: getApiErrorMessage(error),
    };
  } finally {
    isLoadingStudentDetail.value = false;
  }
}

watch(gateMarkType, (markType) => {
  localStorage.setItem(AUXILIARY_GATE_MODE_STORAGE_KEY, markType);
});

watch(
  () => context.markType,
  (markType) => {
    if (markType === 'entry' && context.status === 'early_departure') {
      context.status = 'regular';
    }

    if (markType === 'exit' && context.status === 'late') {
      context.status = 'regular';
    }
  },
);

watch(activeSection, (section) => {
  syncAuxiliarySectionQuery(section);

  if (section === 'gate' && scannerModeEnabled.value) {
    focusScannerInput();
  }
});

watch(
  () => route.query.section,
  (section) => {
    const normalizedSection = normalizeAuxiliarySection(section);

    if (normalizedSection !== activeSection.value) {
      activeSection.value = normalizedSection;
    }
  },
);

watch(scannerModeEnabled, (enabled) => {
  if (enabled && activeSection.value === 'gate') {
    focusScannerInput();
  }
});

watch(
  () => [
    context.attendanceDate,
    context.schoolYear,
    context.grade,
    context.section,
    context.shift,
  ],
  () => {
    refreshOfflineState();
  },
);

onMounted(async () => {
  activeSection.value = normalizeAuxiliarySection(route.query.section);
  restorePersistedClassroomContext();
  restorePersistedGateMode();
  persistClassroomContext();
  refreshOfflineState();
  window.addEventListener('online', handleOnlineEvent);
  window.addEventListener('offline', handleDisconnect);

  const canReachBackend = await refreshConnectivityStatus(true);

  if (canReachBackend) {
    try {
      const settings = await institutionStore.loadSettings();

      if (settings) {
        context.schoolYear = settings.activeSchoolYear;
        ensureContextMatchesInstitution(settings);
      }
    } catch (error) {
      dailyFeedback.value = {
        type: 'error',
        title: 'No se pudo cargar la configuración institucional',
        message: getApiErrorMessage(error),
      };
    }
  }

  await Promise.all([
    loadOfflineContext(),
    loadDailyAttendance(),
    loadAttendanceAlerts(),
  ]);

  if (activeSection.value === 'gate' && scannerModeEnabled.value) {
    focusScannerInput();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnlineEvent);
  window.removeEventListener('offline', handleDisconnect);
});
</script>

