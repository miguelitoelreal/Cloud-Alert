# Troubleshooting - Errores Comunes al Correr Localmente

## 1. Error: `concurrently` no encontrado al correr `npm run dev` desde la raíz

**Síntoma:**
```
'concurrently' no se reconoce como un comando interno o externo...
```

**Causa:**
No se instalaron las dependencias de Node en la raíz del proyecto. Solo existe `node_modules` dentro de `frontend/`, pero el script `dev` de la raíz necesita `concurrently` para levantar backend y frontend al mismo tiempo.

**Solución:**
```powershell
# Desde la raíz del proyecto
npm install
```

---

## 2. Error: El frontend no se comunica con el backend (404 en `/api` o `/hubs`)

**Síntoma:**
Las peticiones del frontend al backend fallan con 404 o `ECONNREFUSED`.

**Causa:**
El proxy de Vite en `frontend/vite.config.ts` apuntaba al puerto `5000`, pero el backend ASP.NET Core corre por defecto en `http://localhost:5242` según `launchSettings.json`.

**Solución:**
Editar `frontend/vite.config.ts` y cambiar el `target` del proxy de `5000` a `5242`:

```ts
server: {
  proxy: {
    '/api': 'http://localhost:5242',
    '/hubs': {
      target: 'http://localhost:5242',
      ws: true,
    },
  },
}
```

---

## 3. Error: `Failed to bind to address http://127.0.0.1:5242: address already in use`

**Síntoma:**
El backend (.NET) falla al iniciar con el error:
```
System.IO.IOException: Failed to bind to address http://127.0.0.1:5242: address already in use.
```

**Causa:**
Una instancia anterior del backend (`MonitoringPlatform.API.exe`) quedó corriendo en segundo plano y mantiene ocupado el puerto `5242`.

**Solución:**
1. Identificar el proceso que ocupa el puerto:
   ```powershell
   Get-NetTCPConnection -LocalPort 5242 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess, @{Name="ProcessName";Expression={(Get-Process -Id $_.OwningProcess).ProcessName}}
   ```

2. Matar el proceso:
   ```powershell
   $procIds = (Get-NetTCPConnection -LocalPort 5242 -ErrorAction SilentlyContinue).OwningProcess
   if ($procIds) { Stop-Process -Id $procIds -Force }
   ```

3. Verificar que el puerto quedó libre (no debe devolver nada):
   ```powershell
   Get-NetTCPConnection -LocalPort 5242 -ErrorAction SilentlyContinue
   ```

4. Volver a correr el proyecto:
   ```powershell
   npm run dev
   ```

---

## 4. Error: "Microsoft 365: No se pudieron cargar las incidencias" o 401 al probar integración

**Síntoma:**
En el Centro de Estado Cloud aparece el banner amarillo:
```
Microsoft 365: No se pudieron cargar las incidencias de Microsoft 365.
```
Al hacer clic en **Probar conexión** en Integraciones, sale:
```
Request failed with status code 401
```

**Causa:**
El error 401 suele venir de **Microsoft Graph** (no del backend de la plataforma). Ocurre cuando:
- El `TenantId`, `ClientId` o `ClientSecret` de Microsoft son incorrectos.
- La aplicación registrada en Azure AD no tiene el permiso `ServiceHealth.Read.All`.
- El permiso no tiene **consentimiento de administrador** (Admin Consent).
- La sesión del usuario en la plataforma expiró (entonces el 401 viene del backend).

**Solución:**

1. **Verificar que estás logueado** en la plataforma. Si la sesión expiró, vuelve a iniciar sesión.

2. **Verificar las credenciales en Azure AD:**
   - Ve a [portal.azure.com](https://portal.azure.com) → Azure Active Directory → App registrations.
   - Verifica que el `TenantId`, `ClientId` y `ClientSecret` sean correctos.
   - En **API permissions**, asegúrate de tener `ServiceHealth.Read.All` (Application permission, no Delegated).
   - Haz clic en **Grant admin consent** para el tenant.

3. **Volver a guardar la integración** en la plataforma con los datos correctos y probar de nuevo.

---

## Resumen de comandos para levantar el proyecto desde cero

```powershell
# Desde la raíz del proyecto:

# 1. Instalar dependencias de la raíz (si no existen)
npm install

# 2. Verificar que el puerto 5242 esté libre (opcional, solo si falló antes)
Get-NetTCPConnection -LocalPort 5242 -ErrorAction SilentlyContinue
# Si devuelve algo, matar el proceso con los comandos del punto 3 arriba.

# 3. Levantar backend + frontend
npm run dev
```

El frontend quedará en `http://localhost:5173` (o el siguiente puerto libre) y el backend en `http://localhost:5242`.
