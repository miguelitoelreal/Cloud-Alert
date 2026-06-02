# Deploy en Render con Docker

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `Dockerfile` | Multi-stage: builda frontend (Node) + backend (.NET) y el backend sirve todo como un solo servicio |
| `docker-compose.yml` | Para levantar localmente con `docker compose up` |
| `render.yaml` | Configuración de infraestructura como código para Render |
| `.dockerignore` | Excluye archivos innecesarios de la imagen Docker |
| `frontend/.env.production` | `VITE_API_BASE_URL` vacío = requests relativos al mismo dominio |

## Cambios en el código

- `Program.cs`: backend ahora sirve archivos estáticos del frontend en producción + SPA fallback para React Router
- `Program.cs`: SQLite usa el connection string configurado (permite volumen `/app/data`)
- `Program.cs`: migraciones EF Core se aplican automáticamente al iniciar la app

## Deploy paso a paso en Render

### Opción 1: BluePrint (recomendada)

1. Ve a [Render Dashboard](https://dashboard.render.com) → **Blueprints**
2. Conecta tu repo de GitHub/GitLab
3. Render detectará automáticamente `render.yaml` y creará el servicio
4. El deploy comenzará solo

### Opción 2: Manual

1. En Render Dashboard → **New** → **Web Service**
2. Conecta tu repo
3. Selecciona **Runtime: Docker**
4. `Dockerfile Path`: `./Dockerfile`
5. Configura las env vars:
   - `ASPNETCORE_ENVIRONMENT` = `Production`
   - `ASPNETCORE_URLS` = `http://+:8080`
   - `Jwt__Secret` = genera un string largo y aleatorio (32+ chars)
   - `ConnectionStrings__DefaultConnection` = `Data Source=/app/data/monitoringplatform.db`
6. Agrega un **Disk**:
   - Mount path: `/app/data`
   - Size: 1 GB
7. Deploy

## Variables de entorno importantes

| Variable | Valor por defecto | Descripción |
|----------|------------------|-------------|
| `Jwt__Secret` | generado por Render | Secret para firmar tokens JWT. **Cámbialo** en producción |
| `ConnectionStrings__DefaultConnection` | `Data Source=/app/data/monitoringplatform.db` | SQLite (persistido en disco). Si pones una Postgres, se detecta automáticamente |
| `Email__SmtpHost` | `smtp.gmail.com` | Configura SMTP real para que las alertas por email funcionen |
| `Email__SmtpUsername` | vacío | Usuario SMTP |
| `Email__SmtpPassword` | vacío | Contraseña SMTP |
| `Email__SenderEmail` | vacío | Email remitente |

## Levantar localmente con Docker

```bash
# Build y run
docker compose up --build

# Accede en http://localhost:8080
# La DB SQLite se persiste en el volumen docker `sqlite_data`
```

## Notas

- El frontend y backend corren en el **mismo dominio** (puerto 8080). No hay problema de CORS.
- El primer usuario registrado se convierte automáticamente en admin.
- Para Microsoft 365 integration, configura `MicrosoftGraph__TenantId`, `ClientId` y `ClientSecret` después del deploy.
