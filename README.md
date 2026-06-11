# MonitoringPlatform

Plataforma SaaS de monitoreo de servicios en tiempo real. Permite a los usuarios registrar endpoints HTTP y feeds RSS, monitorear su disponibilidad con intervalos configurables, recibir actualizaciones en vivo mediante SignalR, consultar información WHOIS y certificados SSL de dominios, y visualizar todo desde un dashboard moderno con tema oscuro.

---

## ¿Qué hace esta plataforma?

- **Monitoreo de servicios:** Registra URLs (HTTP/HTTPS) y feeds RSS. La plataforma verifica periódicamente si responden correctamente.
- **Dashboard en tiempo real:** Usa SignalR para enviar actualizaciones instantáneas del estado de cada monitor sin necesidad de refrescar la página.
- **Información de red:** Consulta WHOIS y certificados SSL de los dominios agregados para tener contexto completo de cada servicio.
- **Aislamiento multi-usuario:** Cada usuario registrado tiene su propio *tenant*, por lo que sus monitores y datos son completamente privados y aislados de otros usuarios.
- **Base de datos flexible:** Intenta conectarse a PostgreSQL local; si no está disponible, crea automáticamente una base de datos SQLite local para desarrollo inmediato.

---

## Arquitectura

El proyecto sigue **Clean Architecture** con separación en 4 capas:

| Capa | Responsabilidad |
|------|-----------------|
| **Domain** | Entidades puras, reglas de negocio, sin dependencias externas. |
| **Application** | Casos de uso, lógica de aplicación, DTOs, interfaces de repositorios y servicios. |
| **Infrastructure** | Implementación de acceso a datos (EF Core), repositorios concretos, servicios externos. |
| **API** | Controladores HTTP, configuración DI, middlewares, SignalR Hubs. |

Esta separación garantiza que el dominio y la lógica de aplicación no dependan de frameworks ni de tecnologías de infraestructura.

---

## Stack Tecnológico

- **Backend:** .NET 8, ASP.NET Core Web API, Entity Framework Core, SignalR, JWT Authentication
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Axios
- **Base de datos:** PostgreSQL (Npgsql) / SQLite (fallback automático para desarrollo local)
- **Testing:** xUnit (unit tests e integration tests)

---

## Estructura de Carpetas

```
/
├── src/
│   ├── MonitoringPlatform.API/                # Controladores, Hubs, DI, Program.cs
│   ├── MonitoringPlatform.Application/          # DTOs, interfaces, servicios de aplicación
│   ├── MonitoringPlatform.Domain/               # Entidades de dominio puro
│   └── MonitoringPlatform.Infrastructure/       # EF Core, repositorios, DbContext
├── frontend/                                    # React SPA (Vite + TypeScript)
├── tests/
│   ├── MonitoringPlatform.UnitTests/
│   └── MonitoringPlatform.IntegrationTests/
├── MonitoringPlatform.sln
└── README.md
```

---

## Requisitos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)
- (Opcional) PostgreSQL local

---

## Instalación de Dependencias

### Backend (.NET)

Las dependencias se gestionan automáticamente con NuGet. Al compilar se restauran solas:

```bash
dotnet restore MonitoringPlatform.sln
```

O directamente al compilar:

```bash
dotnet build MonitoringPlatform.sln
```

Los paquetes principales están definidos en los archivos `.csproj` de cada proyecto:

- `MonitoringPlatform.API.csproj` — ASP.NET Core, SignalR, Swagger, JWT
- `MonitoringPlatform.Application.csproj` — AutoMapper, FluentValidation
- `MonitoringPlatform.Infrastructure.csproj` — EF Core (PostgreSQL + SQLite)

### Frontend (Node.js)

```bash
cd frontend
npm install
```

Las dependencias principales están en `frontend/package.json`:

- **Framework:** React 19 + TypeScript
- **Build tool:** Vite
- **Styling:** Tailwind CSS
- **HTTP client:** Axios
- **Real-time:** @microsoft/signalr
- **Icons:** lucide-react
- **Routing:** react-router-dom

---

## Configuración Rápida

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd MonitoringPlatform
```

### 2. Configurar el backend

Copia el archivo de ejemplo y completa tus credenciales locales:

```bash
cp src/MonitoringPlatform.API/appsettings.Development.json.example src/MonitoringPlatform.API/appsettings.Development.json
```

Edita `src/MonitoringPlatform.API/appsettings.Development.json` con tu cadena de conexión. Si no tienes PostgreSQL instalado, la aplicación creará automáticamente una base de datos SQLite local.

### 3. Levantar el backend

```bash
cd src/MonitoringPlatform.API
dotnet run
```

La API estará disponible en `http://localhost:5000`.

### 4. Levantar el frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

---

## Fallback Automático a SQLite

Si la conexión a PostgreSQL falla al iniciar, la aplicación detecta la ausencia de conexión y crea automáticamente una base de datos SQLite local (`monitoringplatform.db`), permitiendo que la plataforma funcione sin configurar una base de datos externa.

---

## Configuración de Entornos

| Archivo | Propósito |
|---------|-----------|
| `appsettings.json` | Configuración por defecto (compartida, versionada) |
| `appsettings.Development.json` | Configuración local de desarrollo (ignorada por Git) |
| `appsettings.Development.json.example` | Plantilla para nuevos desarrolladores |

### Variables de autenticación

El backend usa JWT + refresh tokens.

- `Jwt:Secret`: clave secreta larga para firmar access tokens.
- `Jwt:Issuer`: issuer del token.
- `Jwt:Audience`: audience esperado por la API.
- `Jwt:ExpirationMinutes`: expiración del access token en minutos.
- `Jwt:RefreshTokenExpirationDays`: expiración del refresh token en días.

---

## Buenas Prácticas

- No mezclar lógica de negocio en la capa API.
- Usar DTOs y servicios de aplicación para exponer datos.
- Mantener las entidades de dominio puras y sin dependencias externas.
- Usar Dependency Injection para todos los servicios y repositorios.

---

**Listo para escalar y agregar funcionalidades!**
