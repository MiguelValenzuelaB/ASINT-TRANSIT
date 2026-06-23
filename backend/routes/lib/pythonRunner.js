/**
 * Helper compartido para features que suben archivo(s), ejecutan un script
 * Python headless en un sandbox por ejecución, y exponen los resultados.
 *
 * Cada feature crea su router con createPythonRunner({...}) declarando:
 *   - feature:    nombre corto (carpeta dentro de runs/)
 *   - scriptPath: ruta al .py a ejecutar
 *   - scriptCwd:  cwd del proceso (necesario si el script usa `from src...`)
 *   - fields:     campos multipart esperados, ej. [{name:'expediciones', maxCount:1}]
 *   - buildEnv:   (req, filePaths) => objeto con variables de entorno extra
 *
 * Expone: POST /run, GET /runs/:runId/files, GET /runs/:runId/file?path=
 */
import { Router } from 'express';
import multer from 'multer';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

export const PYTHON_CMD =
  process.env.ASINT_PYTHON_CMD ||
  (process.platform === 'win32'
    ? path.join(process.env.USERPROFILE || '', 'anaconda3', 'python.exe')
    : 'python3');

export function createPythonRunner({ feature, scriptPath, scriptCwd, fields, buildEnv }) {
  const RUNS_ROOT = path.join(BACKEND_ROOT, 'runs', feature);

  const upload = multer({
    storage: multer.diskStorage({
      destination: async (req, _file, cb) => {
        try {
          if (!req.runId) {
            const runId = randomUUID();
            const runDir = path.join(RUNS_ROOT, runId);
            await mkdir(path.join(runDir, 'input'), { recursive: true });
            await mkdir(path.join(runDir, 'output'), { recursive: true });
            req.runId = runId;
            req.runDir = runDir;
          }
          cb(null, path.join(req.runDir, 'input'));
        } catch (err) {
          cb(err, '');
        }
      },
      filename: (_req, file, cb) => cb(null, file.originalname),
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  const router = Router();

  router.get('/status', (_req, res) => {
    res.json({ pythonCmd: PYTHON_CMD, scriptPath, runsRoot: RUNS_ROOT });
  });

  router.post('/run', upload.fields(fields), async (req, res) => {
    const files = req.files || {};
    for (const f of fields) {
      if (!files[f.name]?.length) {
        return res.status(400).json({ error: `Falta el archivo "${f.name}".` });
      }
    }

    const runId = req.runId;
    const outputDir = path.join(req.runDir, 'output');
    const filePaths = {};
    const originalNames = {};
    for (const f of fields) {
      filePaths[f.name] = files[f.name][0].path;
      originalNames[f.name] = files[f.name][0].originalname;
    }

    const startedAt = Date.now();
    const env = {
      ...process.env,
      ASINT_HEADLESS: '1',
      ASINT_OUTPUT_DIR: outputDir,
      PYTHONIOENCODING: 'utf-8',
      ...buildEnv(req, filePaths),
    };

    const child = spawn(PYTHON_CMD, ['-X', 'utf8', scriptPath], {
      cwd: scriptCwd || path.dirname(scriptPath),
      env,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    child.on('error', (err) => {
      res.status(500).json({
        runId,
        error: 'No se pudo iniciar Python.',
        detail: err.message,
        pythonCmd: PYTHON_CMD,
      });
    });

    child.on('close', async (code) => {
      const durationMs = Date.now() - startedAt;
      if (code !== 0) {
        return res.status(500).json({
          runId,
          success: false,
          exitCode: code,
          durationMs,
          stdout: stdout.slice(-4000),
          stderr: stderr.slice(-4000),
        });
      }
      try {
        const outputFiles = await listOutputFiles(outputDir);
        res.json({
          runId,
          success: true,
          exitCode: code,
          durationMs,
          inputs: originalNames,
          files: outputFiles,
          stdoutTail: stdout.slice(-1500),
        });
      } catch (err) {
        res.status(500).json({
          runId,
          success: false,
          error: 'No se pudo leer la carpeta de output.',
          detail: err.message,
        });
      }
    });
  });

  router.get('/runs/:runId/files', async (req, res) => {
    const runId = sanitizeId(req.params.runId);
    if (!runId) return res.status(400).json({ error: 'runId invalido' });
    try {
      const files = await listOutputFiles(path.join(RUNS_ROOT, runId, 'output'));
      res.json({ runId, files });
    } catch (err) {
      res.status(404).json({ error: 'Run no encontrado.', detail: err.message });
    }
  });

  router.get('/runs/:runId/file', (req, res) => {
    const runId = sanitizeId(req.params.runId);
    const relPath = String(req.query.path || '');
    if (!runId || !relPath) return res.status(400).json({ error: 'parametros invalidos' });

    const outputDir = path.join(RUNS_ROOT, runId, 'output');
    const resolved = path.resolve(outputDir, relPath);
    if (!resolved.startsWith(outputDir + path.sep) && resolved !== outputDir) {
      return res.status(400).json({ error: 'ruta fuera del run' });
    }
    res.sendFile(resolved, (err) => {
      if (err) res.status(404).end();
    });
  });

  return router;
}

async function listOutputFiles(dir) {
  const out = [];
  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const s = await stat(full);
        out.push({
          name: path.relative(dir, full).replaceAll('\\', '/'),
          size: s.size,
          modified: s.mtime.toISOString(),
          ext: path.extname(entry.name).toLowerCase(),
        });
      }
    }
  }
  await walk(dir);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function sanitizeId(id) {
  return /^[0-9a-fA-F-]{36}$/.test(id) ? id : null;
}
