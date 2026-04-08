import { register } from 'register-service-worker';

if (process.env.PROD) {
  register(`${process.env.SERVICE_WORKER_FILE}`, {
    ready() {
      console.info(
        'La PWA está lista para funcionar sin conexión en recursos estáticos.',
      );
    },
    registered() {
      console.info('Service worker registrado.');
    },
    cached() {
      console.info('Contenido estático almacenado para uso sin conexión.');
    },
    updatefound() {
      console.info('Hay una nueva versión de la PWA en descarga.');
    },
    updated() {
      console.info(
        'Hay una nueva versión disponible. Recarga la aplicación para usarla.',
      );
    },
    offline() {
      console.info('La aplicación se ejecuta sin conexión de red.');
    },
    error(error: unknown) {
      console.error('Error al registrar el service worker.', error);
    },
  });
}
