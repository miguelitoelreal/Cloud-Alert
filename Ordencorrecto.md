# Orden correcto

## Requisitos previos
- Node.js 18+ y npm 8+
- .NET 8+

## Pasos

1. **Instalar dependencias del backend**
   Desde la raíz del proyecto:
   ```bash
   dotnet build MonitoringPlatform.sln
   ```

2. **Instalar dependencias del frontend**
   En una terminal, ve a la carpeta frontend:
   ```bash
   cd frontend
   npm install
   ```

3. **Ejecutar el frontend** (en la misma terminal)
   ```bash
   npm run dev
   ```
   Verás el puerto de acceso (ej: http://localhost:5173). Mantén esta terminal abierta.

4. **Ejecutar el backend** (en otra terminal nueva)
   ```bash
   cd src/MonitoringPlatform.API
   dotnet run
   ```

5. **Acceder a la aplicación**
   En el navegador, Ctrl + Click en el enlace mostrado por npm, o ingresa la URL manualmente.
