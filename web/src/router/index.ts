import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import { setAuthFailureHandler } from 'boot/axios';
import { pinia } from 'stores';
import { getDefaultRouteForUser, useSessionStore } from 'src/stores/session-store';
import routes from './routes';

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  let isHandlingAuthFailure = false;

  setAuthFailureHandler(() => {
    if (isHandlingAuthFailure) {
      return;
    }

    const sessionStore = useSessionStore(pinia);

    if (!sessionStore.isAuthenticated) {
      return;
    }

    isHandlingAuthFailure = true;
    sessionStore.logout();
    void Router.replace('/').finally(() => {
      isHandlingAuthFailure = false;
    });
  });

  Router.beforeEach(async (to) => {
    const sessionStore = useSessionStore(pinia);

    await sessionStore.initializeSession();

    const user = sessionStore.user;
    const isAuthenticated = sessionStore.isAuthenticated;
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
    const guestOnly = to.matched.some((record) => record.meta.guestOnly);
    const allowPasswordChangeRequired = to.matched.some(
      (record) => record.meta.allowPasswordChangeRequired,
    );
    const allowedRoles = to.matched.flatMap((record) => record.meta.roles ?? []);

    if (requiresAuth && !isAuthenticated) {
      return {
        path: '/',
      };
    }

    if (guestOnly && isAuthenticated) {
      return {
        path: getDefaultRouteForUser(user),
      };
    }

    if (isAuthenticated && user?.mustChangePassword && !allowPasswordChangeRequired) {
      return {
        path: '/cambiar-contrasena-inicial',
      };
    }

    if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
      return {
        path: getDefaultRouteForUser(user),
      };
    }

    return true;
  });

  return Router;
});
