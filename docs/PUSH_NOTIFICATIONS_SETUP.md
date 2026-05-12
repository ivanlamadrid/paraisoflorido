# Push Notifications PWA con Web Push directo

## Resumen

La PWA usa Web Push directo como canal principal para notificaciones reales del sistema. El flujo estándar es:

- Frontend: `navigator.serviceWorker.ready` y `registration.pushManager.subscribe(...)`.
- Backend: `web-push.sendNotification(subscription, payload)`.
- Service worker: evento `push` y `self.registration.showNotification(...)`.

Firebase Cloud Messaging puede quedar como diagnóstico o canal secundario, pero la PWA no depende de FCM para mostrar notificaciones reales. La notificación interna en PostgreSQL sigue siendo el respaldo confiable: el push no es 100% garantizado porque depende de permisos, navegador, sistema operativo, ahorro de batería y conexión.

La asistencia no depende del push. Si Web Push o FCM fallan, la entrada queda registrada.

## Configuración Web Push

Generar un par VAPID propio para Web Push directo:

```bash
npx web-push generate-vapid-keys
```

No usar solo la VAPID pública de Firebase: `web-push` necesita clave pública y privada del mismo par.

Backend `api/.env`:

```env
WEB_PUSH_ENABLED=true
WEB_PUSH_VAPID_SUBJECT=mailto:admin@tudominio.com
WEB_PUSH_VAPID_PUBLIC_KEY=REEMPLAZAR_AQUI
WEB_PUSH_VAPID_PRIVATE_KEY=REEMPLAZAR_AQUI
```

Frontend `web/.env`:

```env
VITE_WEB_PUSH_PUBLIC_KEY=REEMPLAZAR_AQUI
```

`VITE_WEB_PUSH_PUBLIC_KEY` debe ser exactamente la clave pública del mismo par VAPID usado por la API.

## Migración

Ejecutar migraciones antes de probar:

```bash
npm run migration:run --workspace api
```

Esto agrega `web_push_subscriptions` y permite registrar intentos con proveedor `web_push`.

## Prueba por niveles

Abrir sesión como estudiante y entrar a:

```txt
/mi-asistencia?debugPush=1
```

La tarjeta temporal no aparece en el menú ni en navegación normal.

1. `Probar notificación local`: usa `new Notification(...)` sin backend. Si falla, el problema es permiso, navegador o sistema operativo.
2. `Probar notificación con service worker`: usa `registration.showNotification(...)`. Si falla, el problema está en el service worker/PWA.
3. `Registrar Web Push`: crea o actualiza la suscripción Push API en el backend para el usuario actual.
4. `Ver diagnóstico backend`: confirma `WEB_PUSH_ENABLED`, VAPID configurado y cantidad de suscripciones activas.
5. `Enviar prueba Web Push a mi usuario`: llama `POST /notifications/web-push/debug/send-to-me` y envía una notificación real al usuario autenticado.

## Asistencia

Con `ATTENDANCE_EXIT_ENABLED=false`, el sistema opera en modo solo entrada.

Cuando el auxiliar registra una entrada:

- se crea la notificación interna `attendance_entry_marked`;
- se resuelve el usuario `student` asociado al estudiante;
- se envía Web Push directo solo a ese usuario;
- no se envía al auxiliar, director ni a todos;
- no se envía salida.

El padre o apoderado recibe la notificación porque usa la cuenta del estudiante. No existe aún un rol `parent` o `guardian` real.

Payload esperado:

```json
{
  "title": "Entrada registrada",
  "body": "Juan Pérez registró entrada el 17/05/2026 a las 07:42.",
  "route": "/mi-asistencia",
  "type": "attendance_entry_marked"
}
```

## PWA vieja o service worker cacheado

Si el diagnóstico muestra un service worker viejo:

1. cerrar la PWA;
2. abrir el sitio desde el navegador;
3. recargar;
4. si sigue viejo, borrar datos del sitio;
5. volver a activar notificaciones.

La versión del service worker se imprime en consola como `[SW] version`.

## Archivos sensibles

No subir:

- `api/.secrets/`
- `**/*firebase-adminsdk*.json`
- `**/*service-account*.json`
- `.env`
- `.env.*`

Solo los `.env.example` deben quedar versionados con placeholders.
