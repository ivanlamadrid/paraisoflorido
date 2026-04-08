# AGENTS.md

## Alcance del backend

Este backend soporta el sistema institucional actual del colegio, no solo el MVP minimo de asistencia.

Los dominios reales activos son:

- `auth`
- `users`
- `students`
- `attendance`
- `announcements`
- `institution`
- `health`

## Roles reales del backend

Trabajar con estos roles:

- `director`
- `secretary`
- `auxiliary`
- `tutor`
- `student`

No asumir `teacher`, `professor`, `parent` o equivalentes si no existen realmente.

## Responsabilidades actuales del backend

### Auth

- login
- cambio obligatorio de contrasena cuando aplique
- cambio propio de contrasena
- reseteo administrativo
- trazabilidad basica de cambios y reseteos

### Users

- cuentas internas del colegio
- personal separado de estudiantes
- gestion de secretaria, auxiliar y tutor
- activacion / desactivacion
- asignaciones del tutor por seccion

### Students

- identidad del estudiante
- matricula anual
- ficha institucional
- contactos familiares como dato asociado
- resumen de asistencia y alertas

### Attendance

- entrada y salida
- registro por QR y manual
- revision diaria por aula
- alertas
- correcciones auditadas

### Announcements

- feed
- detalle
- lectura
- gestion administrativa
- audiencias por rol y por seccion
- restricciones de alcance para tutor

## Reglas de implementacion

1. Mantener controllers delgados y services con logica clara.
2. Reutilizar modulos y servicios existentes antes de abrir otros.
3. No duplicar logica entre roles cuando el dominio ya la soporta.
4. Resolver permisos en backend, no solo en frontend.
5. Tratar relaciones opcionales con cuidado para no romper runtime si faltan datos.

## Restricciones de producto que el backend debe respetar

No abrir por defecto:

- notas
- cursos
- evaluacion
- docente general
- apoderado como usuario
- recuperacion por correo o SMS
- integraciones externas
- RRHH

## Guias de dominio

### Estudiantes

- `Student` y `StudentEnrollment` siguen siendo el eje
- los contactos familiares se modelan como datos asociados, no como usuarios
- la ficha institucional no debe crecer a expediente gigante

### Tutor

- el tutor no es docente general
- el tutor trabaja solo sobre sus secciones asignadas
- sus permisos deben limitarse a ese alcance
- si no tiene asignaciones, eso debe manejarse de forma clara, no como permiso global roto

### Asistencia

- asistencia sigue siendo un dominio central
- el auxiliar puede corregir dentro de limites operativos
- direccion y secretaria mantienen mayor alcance
- toda correccion exige motivo y auditoria

### Comunicados

- el tutor solo puede operar comunicados para sus secciones
- no puede publicar mensajes globales

## Base de datos y migraciones

- usar PostgreSQL
- no depender de `synchronize`
- mantener migraciones alineadas al estado real del dominio
- no asumir que una relacion nueva existe en runtime si la migracion no fue aplicada

## Seguridad

- hash de contrasenas siempre
- no exponer datos sensibles
- mantener autorizacion simple pero correcta por rol y alcance
- validar entradas con DTOs y `ValidationPipe`

## Que no hacer sin instruccion explicita

- no abrir dominio academico completo
- no crear modulos de notas o cursos
- no crear usuario apoderado
- no integrar correo, SMS, OTP o proveedores externos
- no introducir CQRS, event sourcing o microservicios

## Regla final

El backend debe reflejar el sistema real que ya existe en el repo:

- institucional
- modular
- claro
- sin complejidad innecesaria

Cuando haya dudas, favorecer el cambio minimo coherente con el dominio actual.
