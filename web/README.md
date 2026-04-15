# Colegio Paraiso Florido (web)

A Quasar Project

## Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
quasar build
```

## Routing and deployment

The frontend now uses Vue Router in `history` mode.

Expected public URLs:

- `/` for login
- `/mi-asistencia`
- `/auxiliar/asistencia`
- `/tutor`
- `/portal`
- `/comunicados`

If you deploy the SPA behind Nginx, direct reloads and deep links need a fallback to
`/index.html`. A minimal config for the dedicated subdomain can look like this:

```nginx
server {
  listen 80;
  server_name aula.paraisoflorido.edu.pe;

  root /var/www/aula.paraisoflorido.edu.pe;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

If you use HTTPS or a different upstream, keep the same `try_files` rule for the SPA
and adapt only the TLS and proxy details.

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
