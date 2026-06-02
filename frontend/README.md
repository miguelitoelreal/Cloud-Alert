# Cloud Alert Hub Frontend

Frontend SPA de Cloud Alert Hub construido con React, TypeScript y Vite.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- Axios
- SignalR
- Tailwind CSS v4

## Desarrollo

Desde la carpeta `frontend`:

```bash
npm install
npm run dev
```

La aplicación arranca por defecto en `http://localhost:5173`.

## Variables de entorno

Crear `frontend/.env.local` si necesitas apuntar REST y SignalR a un backend distinto:

```env
VITE_API_BASE_URL=http://localhost:5242
```

Si `VITE_API_BASE_URL` no está definido, en desarrollo Vite usa el proxy configurado en `vite.config.ts` para `/api` y `/hubs`.

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```
