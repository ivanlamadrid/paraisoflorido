# AGENTS.md

## Proyecto

Sistema escolar institucional liviano para un colegio publico del Peru, enfocado en secundaria EBR.

Stack actual:

- Backend: NestJS + TypeScript + TypeORM + PostgreSQL
- Frontend: Quasar + Vue 3 + TypeScript
- Estructura: monorepo con workspaces

## Estado real del producto

El proyecto ya no es solo el MVP minimo de asistencia. El estado actual del repo incluye:

- asistencia digital
- autenticacion y cambio de contrasena
- gestion de usuarios y personal interno
- ficha estudiantil institucional
- comunicados institucionales
- rol tutor con alcance por secciones asignadas
- configuracion institucional basica

El sistema sigue siendo liviano y operativo. No debe convertirse por defecto en un ERP escolar completo.

## Foco actual del producto

La prioridad sigue estando en los flujos institucionales y operativos que el colegio usa hoy:

- asistencia diaria
- soporte administrativo
- cuenta y credenciales
- ficha del estudiante
- comunicados institucionales
- seguimiento tutorial basico por seccion

## Modulos reales del sistema

Los modulos actualmente activos o claramente soportados son:

- `auth`
- `users`
- `students`
- `attendance`
- `announcements`
- `institution`
- `health`

## Roles actuales

Los roles reales del sistema son:

- `director`
- `secretary`
- `auxiliary`
- `tutor`
- `student`

No asumir por defecto otros roles.

## Reglas de producto que deben mantenerse

1. Mantener el sistema simple, institucional y mantenible.
2. Evitar sobreingenieria y modulos abiertos "por si acaso".
3. Mantener separacion clara entre dominios:
   - estudiantes
   - personal
   - asistencia
   - comunicados
   - seguimiento tutorial basico
4. No abrir todavia dominio academico completo.
5. No convertir tutor en docente general ni en administrador global.
6. No crear cuenta de apoderado ni portal de familia.

## Alcance permitido hoy

### Asistencia

- escaneo QR
- entrada y salida
- revision por aula
- correcciones auditadas
- historial del estudiante
- alertas operativas

### Auth y cuentas

- login
- cambio obligatorio de contrasena cuando corresponda
- cambio propio de contrasena
- reseteo administrativo de contrasena

### Estudiantes

- identidad y matricula anual
- ficha institucional
- contactos familiares como dato asociado
- resumen de asistencia y alertas

### Personal

- gestion separada de estudiantes
- cuentas internas para secretaria, auxiliar y tutor
- activacion, desactivacion y reseteo de credenciales

### Comunicados

- feed
- detalle
- gestion administrativa
- audiencia por rol o seccion
- tutor solo dentro de sus secciones asignadas

### Tutor

- acceso solo a sus secciones asignadas
- revision de asistencia y alertas
- ficha de estudiantes de sus secciones
- comunicados de seccion

## Lo que sigue fuera de alcance por defecto

No implementar sin instruccion explicita:

- notas
- evaluacion
- cursos
- areas academicas
- docente general o profesor por cursos
- apoderado como usuario
- correo
- SMS
- OTP
- push notifications
- integraciones externas
- SIAGIE automatico
- RRHH
- pagos
- microservicios
- permisos granulares empresariales

## Criterio para proponer cambios

Antes de agregar una entidad, endpoint, pantalla o flujo nuevo, verificar:

1. Si sirve a un modulo ya existente en el sistema real.
2. Si lo usan hoy director, secretaria, auxiliar, tutor o estudiante.
3. Si aporta valor operativo o institucional inmediato.
4. Si puede resolverse de forma mas simple.

Si no pasa esas preguntas, debe quedar como backlog y no como implementacion inmediata.

## Convenciones de negocio

Preferir estos terminos:

- estudiante
- auxiliar
- tutor
- director
- secretaria
- personal del colegio
- grado
- seccion
- turno
- asistencia
- entrada
- salida
- historial de asistencia
- ficha institucional
- comunicado
- reseteo de contrasena

## Regla final

Trabajar con el estado real del repo, no con el MVP historico original.

Eso significa:

- respetar lo ya existente
- no reabrir decisiones cerradas
- no inventar modulos nuevos fuera de alcance
- no dejar que AGENTS antiguos empujen implementaciones contradictorias
