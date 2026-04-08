# AGENTS.md

## Alcance del frontend

Este frontend ya soporta mas que el MVP minimo original de asistencia. El estado real del producto incluye:

- login
- cambio obligatorio de contrasena
- cambio propio de contrasena
- historial del estudiante
- panel del auxiliar
- portal administrativo
- ficha institucional del estudiante
- comunicados
- gestion de personal
- panel del tutor

## Stack obligatorio

- Quasar
- Vue 3
- TypeScript

Mantener la aplicacion clara, institucional y practica.

## Roles que la UI debe atender hoy

- `student`
- `auxiliary`
- `tutor`
- `secretary`
- `director`

No abrir interfaces para roles que aun no existen realmente.

## Flujos reales del frontend

### Estudiante

- login
- cambio obligatorio de contrasena cuando corresponda
- historial de asistencia
- ficha institucional propia
- cuenta
- feed y detalle de comunicados

### Auxiliar

- modo Puerta
- modo Aula
- alertas
- correcciones operativas restringidas
- ficha operativa del estudiante
- cuenta
- feed y detalle de comunicados

### Director y secretaria

- soporte
- estudiantes
- personal del colegio
- configuracion
- cambio de contrasena
- gestion administrativa de comunicados

### Tutor

- panel de secciones asignadas
- asistencia y alertas de sus secciones
- ficha de estudiantes de sus secciones
- cuenta
- gestion de comunicados de sus secciones

## Principios de UI

1. Simplicidad primero.
2. Flujo rapido y entendible.
3. Jerarquia visual clara.
4. Nada de pantallas infladas por defecto.
5. Shell institucional coherente.
6. Separacion clara entre vistas de estudiante, auxiliar, tutor y portal administrativo.

## Estructura actual que debe respetarse

- sidebar izquierda como navegacion global principal en desktop
- top bar compacta
- page header dentro del contenido

No reabrir esa arquitectura salvo instruccion explicita.

## Modulos de interfaz realmente existentes

- auth
- asistencia
- ficha institucional del estudiante
- comunicados
- gestion de personal
- configuracion institucional
- panel tutorial

## Lo que sigue fuera de alcance por defecto

No abrir sin instruccion explicita:

- notas
- cursos
- evaluacion
- docente general
- apoderado como cuenta
- correo
- SMS
- OTP
- push notifications
- dashboards pesados

## Reglas de producto para frontend

### Estudiante

- solo ve su propia informacion
- no ve herramientas administrativas

### Auxiliar

- flujo principal rapido y operativo
- no cargarlo con UI administrativa global

### Tutor

- alcance limitado a sus secciones
- no mezclarlo con secretaria ni con auxiliar
- si no tiene asignaciones, mostrar estado vacio claro

### Director y secretaria

- mantener separacion entre estudiantes, personal, configuracion y comunicados
- no mezclar personal con estudiantes

## Reglas para componentes y pantallas

- reutilizar solo cuando la reutilizacion no degrade el resultado
- separar variantes reales cuando un rol necesite otra composicion
- evitar microcards innecesarias
- resolver estados vacios, carga y error de forma clara

## Lenguaje y copy

Usar terminos claros y consistentes:

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
- ficha institucional
- comunicado
- cambiar contrasena
- restablecer contrasena

## Regla final

El frontend debe trabajar con el estado real del sistema, no con el alcance historico antiguo.

Eso implica:

- no negar modulos que ya existen
- no inventar modulos nuevos fuera de alcance
- no forzar reutilizaciones daninas
- mantener el sistema institucional, liviano y mantenible
