# ASINT Transit

Plataforma operacional para la planificación y ejecución del servicio de transporte público. Integra un frontend Angular, un backend Express y la ejecución de scripts Python de optimización heurística directamente desde la interfaz web.

## Arquitectura

```
ASINT-TRANSIT/
├── Dockerfile                  # Imagen para Render (Node 20 + Python 3 + libs)
├── netlify.toml                # Deploy del frontend en Netlify
├── backend/                    # API Express (Node 18+, ESM)
│   ├── server.js               # Servidor principal en puerto 3001
│   ├── scripts/
│   │   └── heuristica_POs_USs_2026.py
│   └── routes/
│       ├── vanguardTransit.js  # Endpoints de KPIs, costos, rutas
│       └── heuristic.js        # Ejecuta el script Python por heurística
└── vanguard_transit/
    └── frontend/               # Aplicación Angular 19 (Tailwind + Material)
        └── src/app/features/   # Páginas de la plataforma
```

## Páginas

- **Planificación operacional**
  - **Por optimización** — modelos de programación lineal/entera (placeholder)
  - **Por heurística** — carga un Excel y ejecuta el script Python con outputs descargables
- **Ejecución operacional**
  - **Gestión (Telegram)** — integración con bot de Telegram (placeholder)
  - **Control de gestión (KPI)** — tablero de indicadores (placeholder)
- **Vistas anteriores** (legacy)
  - Panel de control, Movimientos en vacío, Planificación de rutas, Analítica operacional

## Requisitos

| Componente | Versión mínima |
|------------|----------------|
| Node.js    | 18.x           |
| npm        | 9.x            |
| Python     | 3.10+ (probado con 3.14 Anaconda) |
| Paquetes Python | `pandas`, `numpy`, `matplotlib`, `openpyxl` |

En Windows el backend usa por defecto el intérprete `%USERPROFILE%\anaconda3\python.exe`.
Para sobreescribirlo exporta `ASINT_PYTHON_CMD` antes de iniciar el servidor.

## Instalación

Clona el repo y ejecuta el script de instalación de todas las dependencias:

```bash
git clone https://github.com/MiguelValenzuelaB/ASINT-TRANSIT.git
cd ASINT-TRANSIT
npm run install:all
```

Esto instala las dependencias en tres ubicaciones:
- `./` (orquestador con `concurrently`)
- `./backend/` (Express + multer)
- `./vanguard_transit/frontend/` (Angular)

## Uso en desarrollo

### Levantar todo (backend + frontend en paralelo)

```bash
npm run dev
```

- Frontend: <http://localhost:5173>
- Backend:  <http://localhost:3001>

El frontend hace proxy de `/api/*` y `/health` al backend (`vanguard_transit/frontend/proxy.conf.json`).

### Levantar servicios por separado

```bash
npm run backend:dev          # solo backend (autoreload con --watch)
npm run frontend:vanguard:dev  # solo frontend (Angular dev server)
```

## Ejecución del script Python desde la UI

En la página **Planificación → Por heurística**:

1. Haz clic en **Elegir archivo** y selecciona un `.xlsx` (ej. `INPUT_heurística_2026.xlsx`).
2. Haz clic en **Ejecutar**. El backend:
   - Guarda el archivo en `backend/runs/<uuid>/input/`
   - Lanza Python con las variables de entorno `ASINT_HEADLESS=1`, `ASINT_INPUT_FILE`, `ASINT_OUTPUT_DIR`
   - Espera a que termine y devuelve el listado de archivos generados
3. Los outputs aparecen en la página:
   - **Archivos Excel** con botón de descarga
   - **Gráficos** (PNG de matplotlib) con vista previa y descarga

Variables de entorno opcionales del script (con defaults sensatos):

| Variable | Default | Descripción |
|----------|---------|-------------|
| `ASINT_HORAS_BLOQUE` | 18 | duración del bloque horario |
| `ASINT_HORA_INICIO_BLOQUE` | 6 | hora de inicio del bloque |
| `ASINT_LIMITE_EXPEDICION` | 1000 | límite de expediciones por bus |
| `ASINT_PASO_MINUTOS` | 15 | resolución de los gráficos camello |

## Endpoints del backend

### Generales
- `GET /health` — healthcheck
- `GET /api` — lista de servicios

### Vanguard Transit
- `GET /api/vanguard-transit/dashboard/kpis`
- `GET /api/vanguard-transit/dashboard/activity`
- `GET /api/vanguard-transit/analytics/metrics`
- `GET /api/vanguard-transit/analytics/costs`
- `GET /api/vanguard-transit/deadhead/routes`
- `GET /api/vanguard-transit/routes/lines`

### Heurística
- `GET /api/heuristic/status` — info del intérprete Python y rutas configuradas
- `POST /api/heuristic/run` — `multipart/form-data` con campo `file` (xlsx). Ejecuta el script y devuelve el listado de archivos generados
- `GET /api/heuristic/runs/:runId/files` — listado de archivos de un run
- `GET /api/heuristic/runs/:runId/file?path=<relPath>` — descarga un archivo del run

## Build para producción

```bash
npm run build
```

Genera el bundle estático del frontend en `vanguard_transit/frontend/dist/vanguard-transit-frontend/browser/`.

## Deploy

El proyecto se despliega en dos servicios separados:

### Frontend → Netlify (estático)

Configurado en `netlify.toml`:
- `base = "vanguard_transit/frontend"`
- `publish = "dist/vanguard-transit-frontend/browser"`
- Redirect SPA `/*` → `/index.html`

Después del deploy, agrega un redirect adicional en Netlify para que `/api/*` apunte al backend en Render:

```toml
[[redirects]]
  from   = "/api/*"
  to     = "https://<tu-servicio>.onrender.com/api/:splat"
  status = 200
  force  = true
```

### Backend → Render (Web Service tipo Docker)

El `Dockerfile` en la raíz construye una imagen con Node 20, Python 3 y las libs científicas. En Render:

1. **New + Web Service** → conecta el repo `MiguelValenzuelaB/ASINT-TRANSIT`
2. **Environment**: `Docker`
3. **Branch**: `main`
4. **Dockerfile Path**: `Dockerfile`
5. **Variables de entorno** (opcionales):
   - `CORS_ORIGINS` con la URL del Netlify si fueras a llamar desde el navegador en lugar de via redirect
   - Cualquier `ASINT_*` que quieras sobreescribir
6. **Health Check Path**: `/health`

Render asigna automáticamente la variable `PORT`; el servidor Express ya la respeta.

## Diseño

- **Tema**: claro con paleta azul marino (`#1A3A6B` primario)
- **Tipografía**: Rajdhani (headlines) + DM Sans (body) — cargadas desde Google Fonts
- **UI Kit**: Tailwind CSS + Angular Material (overrides en `src/styles.css`)
- **Iconos**: Material Symbols (Outlined)
- **Mapas**: Leaflet (en `Panel de control`)

## Estructura del frontend Angular

```
vanguard_transit/frontend/src/app/
├── app.component.ts        # Shell con sidebar agrupado y top-bar
├── app.routes.ts           # Lazy loading de cada página
├── core/                   # Servicios HTTP por feature (api.models, *-api.service)
├── shared/                 # Componentes reutilizables (status-badge, metric-card)
└── features/
    ├── planning-optimization/
    ├── planning-heuristic/        # Página con upload y ejecución del script Python
    ├── execution-management/
    ├── execution-kpi/
    ├── dashboard/                 # legacy
    ├── deadhead/                  # legacy
    ├── route-planner/             # legacy
    └── analytics/                 # legacy
```

## Licencia

Uso interno. Sin licencia pública.
