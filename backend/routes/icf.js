import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPythonRunner } from './lib/pythonRunner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = path.resolve(__dirname, '..', 'scripts', 'icf');

export default createPythonRunner({
  feature: 'icf',
  scriptPath: process.env.ASINT_ICF_SCRIPT || path.join(SCRIPT_DIR, 'main_headless.py'),
  scriptCwd: SCRIPT_DIR,
  fields: [
    { name: 'expediciones', maxCount: 1 },
    { name: 'frecuencias', maxCount: 1 },
  ],
  buildEnv: (req, files) => ({
    ASINT_EXPEDICIONES_FILE: files.expediciones,
    ASINT_FRECUENCIAS_FILE: files.frecuencias,
    ASINT_EMPRESA: req.body?.empresa || 'lider',
  }),
});
