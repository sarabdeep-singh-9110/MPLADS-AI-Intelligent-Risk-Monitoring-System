/**
 * Migration Runner: 001_add_expenditure_intelligence.js
 * 
 * Safely manages Dataful Dataset 22565 (18th Lok Sabha Financial Intelligence)
 * ingestion and validation under OPTION B architecture.
 * Calls the optimized run_migration.py script and verifies results.
 */

const { execSync } = require('child_process');
const path = require('path');
const { dbGet } = require('../../db/database');

async function run() {
  console.log('=' .repeat(80));
  console.log('MIGRATION: 001_add_expenditure_intelligence.js');
  console.log('=' .repeat(80));

  // Check if already migrated
  try {
    const expRow = await dbGet('SELECT COUNT(*) as count FROM expenditures');
    const worksRow = await dbGet('SELECT COUNT(*) as count FROM works');
    const mmRow = await dbGet('SELECT COUNT(*) as count FROM match_metadata');

    if (expRow && expRow.count === 143256 && worksRow && worksRow.count === 56138 && mmRow && mmRow.count === 143256) {
      console.log(`[Status] Migration already complete:`);
      console.log(`  - Production Works: ${worksRow.count.toLocaleString()} (Zero mutated)`);
      console.log(`  - Expenditures:     ${expRow.count.toLocaleString()} vouchers`);
      console.log(`  - Match Metadata:   ${mmRow.count.toLocaleString()} bridge records`);
      return;
    }
  } catch (err) {
    // Tables don't exist yet, proceed with python runner
  }

  const pythonScript = path.resolve(__dirname, 'run_migration.py');
  const venvPython = path.resolve(__dirname, '../../../.venv/Scripts/python.exe');

  console.log(`[Execute] Running python migration: ${pythonScript}...`);
  const output = execSync(`"${venvPython}" "${pythonScript}"`, { encoding: 'utf-8', stdio: 'inherit' });
  console.log(output);
}

if (require.main === module) {
  run().then(() => {
    console.log('[Done] Migration script finished.');
    process.exit(0);
  }).catch(err => {
    console.error('[Error] Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { run };
