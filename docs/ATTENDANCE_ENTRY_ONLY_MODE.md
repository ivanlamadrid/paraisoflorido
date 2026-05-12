# Modo Solo Entrada De Asistencia

## Resumen

El sistema esta configurado para operar en modo solo entrada. La marcacion de salida queda desactivada por configuracion, pero la logica historica no se elimina para que pueda reactivarse en el futuro si el colegio cambia el flujo operativo.

Variables:

```env
ATTENDANCE_EXIT_ENABLED=false
VITE_ATTENDANCE_EXIT_ENABLED=false
```

Con estas variables en `false`:

- No se registra salida.
- No se muestra salida en pantallas, reportes ni exportaciones.
- No se genera pendiente por salida.
- No se marca asistencia incompleta por falta de salida.
- La regularizacion permite corregir entradas, pero bloquea correcciones de salida.
- Las colas offline antiguas con salida se rechazan limpiamente con `reason: exit_disabled`.

## Notificaciones FCM

La notificacion push se envia cuando se registra una entrada. No se envia push por salida mientras `ATTENDANCE_EXIT_ENABLED=false`.

El destinatario actual es el usuario `student` asociado al estudiante. En este colegio, el padre o apoderado recibe la notificacion porque normalmente usa la cuenta del estudiante. No existe todavia un rol `parent` o `guardian`; si en el futuro se crea esa relacion, el resolver de destinatarios puede ampliarse sin cambiar el flujo principal.

Contenido esperado:

```json
{
  "type": "attendance_entry_marked",
  "studentId": "...",
  "attendanceRecordId": "...",
  "markedAt": "...",
  "route": "/mi-asistencia"
}
```

Titulo: `Entrada registrada`

Mensaje: `{NOMBRE_ESTUDIANTE} registró entrada el {FECHA} a las {HORA}.`

El push no tiene entrega 100% garantizada porque depende de permisos, navegador, sistema operativo, ahorro de bateria y conexion. La garantia operativa es que la notificacion interna queda guardada en base de datos y visible en `/notificaciones`.

## Como Activar Salida En El Futuro

1. Cambiar `ATTENDANCE_EXIT_ENABLED=true` en el backend.
2. Cambiar `VITE_ATTENDANCE_EXIT_ENABLED=true` en el frontend.
3. Reiniciar la API.
4. Reconstruir y desplegar la web/PWA.
5. Probar scan, manual, offline sync, regularizacion, reportes y exportacion con entrada y salida.

## Como Probar

1. Iniciar sesion como estudiante y activar notificaciones en `/notificaciones`.
2. Iniciar sesion como auxiliar.
3. Registrar entrada por escaneo, marcacion manual u offline sync.
4. Verificar foreground push con la app abierta.
5. Verificar background push con la PWA en segundo plano o cerrada, si el navegador lo permite.
6. Revisar `/notificaciones` y confirmar el tipo `attendance_entry_marked`.
7. Revisar `/mi-asistencia` y confirmar que solo aparece la entrada.
8. Revisar paneles de auxiliar, tutor, director/secretaria, reportes y exportacion para confirmar que no aparece salida ni pendiente por salida.

