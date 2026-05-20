import { Router } from 'express';
import multer from 'multer';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths relativos al backend (vive en <repo>/backend)
const BACKEND_ROOT = path.resolve(__dirname, '..');
const PYTHON_SCRIPT =
  process.env.ASINT_PYTHON_SCRIPT ||
  path.join(BACKEND_ROOT, 'scripts', 'heuristica_POs_USs_2026.py');
const RUNS_ROOT = path.join(BACKEND_ROOT, 'runs', 'heuristic');

// Comando Python configurable por env.
//  - Linux / Docker: python3
//  - Windows local con Anaconda: %USERPROFILE%\anaconda3\python.exe (default si no hay env var)
const PYTHON_CMD =
  process.env.ASINT_PYTHON_CMD ||
  (process.platform === 'win32'
    ? path.join(process.env.USERPROFILE || '', 'anaconda3', 'python.exe')
    : 'python3');

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        const runId = randomUUID();
        const runDir = path.join(RUNS_ROOT, runId);
        await mkdir(path.join(runDir, 'input'), { recursive: true });
        await mkdir(path.join(runDir, 'output'), { recursive: true });
        _req.runId = runId;
        _req.runDir = runDir;
        cb(null, path.join(runDir, 'input'));
      } catch (err) {
        cb(err, '');
      }
    },
    filename: (_req, file, cb) => {
      // Conservamos el nombre original (el script Python lo lee igual)
      cb(null, file.originalname);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const router = Router();

router.get('/status', (_req, res) => {
  res.json({
    pythonCmd: PYTHON_CMD,
    pythonScript: PYTHON_SCRIPT,
    runsRoot: RUNS_ROOT,
  });
});

router.post('/run', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Falta el archivo (campo "file").' });
  }

  const runId = req.runId;
  const runDir = req.runDir;
  const inputFile = req.file.path;
  const outputDir = path.join(runDir, 'output');

  const startedAt = Date.now();
  const env = {
    ...process.env,
    ASINT_HEADLESS: '1',
    ASINT_INPUT_FILE: inputFile,
    ASINT_OUTPUT_DIR: outputDir,
    PYTHONIOENCODING: 'utf-8',
  };

  const child = spawn(PYTHON_CMD, ['-X', 'utf8', PYTHON_SCRIPT], {
    cwd: path.dirname(PYTHON_SCRIPT),
    env,
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

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
      const files = await listOutputFiles(outputDir);
      res.json({
        runId,
        success: true,
        exitCode: code,
        durationMs,
        inputFile: path.basename(inputFile),
        files,
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

export default router;
