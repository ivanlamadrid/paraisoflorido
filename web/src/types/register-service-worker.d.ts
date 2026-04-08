declare module 'register-service-worker' {
  type RegisterHooks = {
    ready?: () => void;
    registered?: (registration?: ServiceWorkerRegistration) => void;
    cached?: (registration?: ServiceWorkerRegistration) => void;
    updatefound?: (registration?: ServiceWorkerRegistration) => void;
    updated?: (registration?: ServiceWorkerRegistration) => void;
    offline?: () => void;
    error?: (error: unknown) => void;
  };

  export function register(swUrl: string, hooks?: RegisterHooks): void;
}
