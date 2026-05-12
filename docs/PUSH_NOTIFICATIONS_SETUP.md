# Push Notifications con Firebase Cloud Messaging

## Resumen

El sistema usa Firebase Cloud Messaging como canal push real para la PWA/web. Las notificaciones internas quedan guardadas en PostgreSQL como respaldo y se muestran dentro de la app desde `/notificaciones`.

El push no es una garantia absoluta de entrega: depende del permiso del usuario, soporte del navegador, sistema operativo, ahorro de bateria, conexion y politicas de Web Push. La asistencia no depende de Firebase; si FCM falla, el registro de asistencia se mantiene y el intento queda auditado en `notification_delivery_attempts`.

## Configuracion Firebase

1. Crear o usar el proyecto en Firebase Console.
2. Registrar una Web App y copiar el `firebaseConfig`.
3. Crear una VAPID key en Project settings > Cloud Messaging > Web Push certificates.
4. Descargar el Service Account JSON desde Project settings > Service accounts.
5. Guardar el JSON en:

```txt
api/.secrets/firebase-service-account.json
```

No subir ese archivo al repositorio.

## Variables de entorno

Frontend `web/.env`:

```env
VITE_ATTENDANCE_EXIT_ENABLED=false
VITE_FIREBASE_API_KEY=REEMPLAZAR_AQUI
VITE_FIREBASE_AUTH_DOMAIN=REEMPLAZAR_AQUI
VITE_FIREBASE_PROJECT_ID=REEMPLAZAR_AQUI
VITE_FIREBASE_STORAGE_BUCKET=REEMPLAZAR_AQUI
VITE_FIREBASE_MESSAGING_SENDER_ID=REEMPLAZAR_AQUI
VITE_FIREBASE_APP_ID=REEMPLAZAR_AQUI
VITE_FIREBASE_VAPID_KEY=REEMPLAZAR_AQUI
```

Backend `api/.env`:

```env
ATTENDANCE_EXIT_ENABLED=false
FIREBASE_SERVICE_ACCOUNT_PATH=api/.secrets/firebase-service-account.json
FIREBASE_PROJECT_ID=REEMPLAZAR_AQUI
```

El backend acepta rutas relativas desde la raiz del monorepo o desde `api`.

## Migracion

Ejecutar las migraciones antes de probar:

```bash
npm run migration:run --workspace api
```

Esto crea:

- `notification_tokens`
- `notifications`
- `notification_delivery_attempts`

## Como probar

1. Ejecutar la API.
2. Ejecutar la web en modo PWA, por ejemplo:

```bash
npm run dev:pwa --workspace web
```

3. Iniciar sesion.
4. Abrir `/notificaciones`.
5. Hacer click en `Activar notificaciones`.
6. Aceptar el permiso del navegador.
7. Hacer click en `Probar` o llamar `POST /notifications/test`.
8. Con la app abierta, verificar el toast foreground.
9. Con la PWA en segundo plano o cerrada, verificar que el service worker muestre la notificacion si el navegador lo permite.
10. Hacer click en la notificacion y confirmar que abre o enfoca la app.
11. Registrar entrada por scan, manual u offline sync y verificar:
    - se crea una fila en `notifications`
    - el tipo interno es `attendance_entry_marked`
    - se intenta enviar push FCM al usuario `student` asociado al estudiante
    - el mensaje incluye nombre del estudiante, fecha y hora de entrada
    - se registra el intento en `notification_delivery_attempts`

## Limitaciones

- Si el usuario no acepta el permiso, no hay push.
- Si el navegador no soporta Push API/Service Worker, no hay push.
- Si el sistema operativo bloquea notificaciones, la app no puede forzarlas.
- Si el dispositivo esta sin internet, la notificacion puede llegar tarde o no mostrarse.
- Si el token FCM expira o Firebase lo invalida, el backend lo desactiva y el navegador debe registrarse otra vez.
- En iOS, Web Push requiere que la PWA este instalada en pantalla de inicio y que el sistema lo permita.
- En Android Chrome suele funcionar de forma mas directa.
- No existe rol `parent` o `guardian` real en el sistema. En esta primera version, la asistencia notifica al usuario `student` asociado al estudiante. El resolver `resolveAttendanceNotificationRecipients` queda preparado para ampliar destinatarios si en el futuro se crea una relacion real con apoderados.
- El sistema esta configurado en modo solo entrada con `ATTENDANCE_EXIT_ENABLED=false` y `VITE_ATTENDANCE_EXIT_ENABLED=false`. No se registra salida, no se muestra salida, no se genera pendiente por salida y no se penaliza la falta de salida.
- La notificacion FCM de asistencia se envia cuando se registra entrada. El padre o apoderado la recibe cuando usa la cuenta del estudiante.

## Archivos sensibles

No subir:

- `api/.secrets/`
- `**/*firebase-adminsdk*.json`
- `**/*service-account*.json`
- `.env`
- `.env.*`

Solo los `.env.example` deben quedar versionados con placeholders.
