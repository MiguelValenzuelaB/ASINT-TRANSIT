# Backend central

Este backend vive en la raiz del proyecto para servir a todas las paginas y aplicaciones.

## Servicios actuales

- `GET /health`
- `GET /api`
- `GET /api/vanguard-transit/dashboard/kpis`
- `GET /api/vanguard-transit/dashboard/activity`
- `GET /api/vanguard-transit/analytics/metrics`
- `GET /api/vanguard-transit/analytics/costs`
- `GET /api/vanguard-transit/deadhead/routes`
- `GET /api/vanguard-transit/routes/lines`

### Heuristica (ejecucion de script Python)

- `GET /api/heuristic/status` — info del binario Python y rutas
- `POST /api/heuristic/run` — `multipart/form-data` con campo `file` (xlsx). Ejecuta `Codigo/heuristica_POs_USs_2026.py` en modo headless y devuelve el listado de archivos generados.
- `GET /api/heuristic/runs/:runId/files` — listado de archivos de un run
- `GET /api/heuristic/runs/:runId/file?path=<relPath>` — descarga un archivo del run

Variables de entorno relevantes:

- `ASINT_PYTHON_CMD` — ruta del interprete (default: `%USERPROFILE%\anaconda3\python.exe` en Windows, `python3` en otros).
- El script Python recibe `ASINT_HEADLESS=1`, `ASINT_INPUT_FILE`, `ASINT_OUTPUT_DIR` y parametros opcionales `ASINT_HORAS_BLOQUE`, `ASINT_HORA_INICIO_BLOQUE`, `ASINT_LIMITE_EXPEDICION`, `ASINT_PASO_MINUTOS`.

Los runs se persisten en `backend/runs/heuristic/<uuid>/output/`.

Para agregar nuevas secciones, crea un router en `backend/routes/` y montalo en `server.js` con un namespace propio.
