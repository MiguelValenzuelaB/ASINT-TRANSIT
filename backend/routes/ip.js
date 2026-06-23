import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPythonRunner } from './lib/pythonRunner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = path.resolve(__dirname, '..', 'scripts', 'ip');

export default createPythonRunner({
  feature: 'ip',
  scriptPath: process.env.ASINT_IP_SCRIPT || path.join(SCRIPT_DIR, 'main_headless.py'),
  scriptCwd: SCRIPT_DIR,
  fields: [
    { name: 'expediciones', maxCount: 1 },
    { name: 'a5', maxCount: 1 },
  ],
  buildEnv: (req, files) => ({
    ASINT_EXPEDICIONES_FILE: files.expediciones,
    ASINT_A5_FILE: files.a5,
    ASINT_EMPRESA: req.body?.empresa || 'lider',
  }),
});
