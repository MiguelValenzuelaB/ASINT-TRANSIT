import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPythonRunner } from './lib/pythonRunner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = path.resolve(__dirname, '..', 'scripts', 'ir');

export default createPythonRunner({
  feature: 'ir',
  scriptPath: process.env.ASINT_IR_SCRIPT || path.join(SCRIPT_DIR, 'main_headless.py'),
  scriptCwd: SCRIPT_DIR,
  fields: [
    { name: 'expediciones', maxCount: 1 },
    { name: 'po', maxCount: 1 },
    { name: 'pcir', maxCount: 1 },
  ],
  buildEnv: (_req, files) => ({
    ASINT_EXPEDICIONES_FILE: files.expediciones,
    ASINT_PO_FILE: files.po,
    ASINT_PC_IR_FILE: files.pcir,
  }),
});
