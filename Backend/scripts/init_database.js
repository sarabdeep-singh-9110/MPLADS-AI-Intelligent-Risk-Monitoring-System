const { execSync } = require('child_process');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../../');
const pythonScript = path.join(BASE_DIR, 'Backend/scripts/init_database.py');
const pythonExec = path.join(BASE_DIR, '.venv/Scripts/python.exe');

console.log("Running SQLite Database Seeder...");
try {
  const output = execSync(`"${pythonExec}" "${pythonScript}"`, { cwd: BASE_DIR, encoding: 'utf-8' });
  console.log(output);
} catch (err) {
  console.error("Error executing database initialization:", err.message);
  process.exit(1);
}
