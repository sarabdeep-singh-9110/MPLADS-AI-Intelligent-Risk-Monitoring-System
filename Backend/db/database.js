const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

// Potential database locations
const possibleDbPaths = [
  path.resolve(__dirname, '../../database/mplads_risk.db'),
  path.join(process.cwd(), 'database', 'mplads_risk.db'),
  path.join(process.env.TEMP || process.env.TMPDIR || '/tmp', 'mplads_risk.db')
];

let dbPath = possibleDbPaths.find(p => fs.existsSync(p));

// If not extracted yet, extract from .gz archive (Vercel Serverless environment)
if (!dbPath) {
  const tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
  const tmpPath = path.join(tmpDir, 'mplads_risk.db');

  const possibleGzPaths = [
    path.resolve(__dirname, '../../database/mplads_risk.db.gz'),
    path.join(process.cwd(), 'database', 'mplads_risk.db.gz'),
    path.resolve(__dirname, '../database/mplads_risk.db.gz')
  ];

  const gzPath = possibleGzPaths.find(p => fs.existsSync(p));

  if (fs.existsSync(tmpPath)) {
    dbPath = tmpPath;
  } else if (gzPath) {
    console.log('Extracting database from', gzPath, 'to', tmpPath, '...');
    try {
      const compressed = fs.readFileSync(gzPath);
      const decompressed = zlib.gunzipSync(compressed);
      fs.writeFileSync(tmpPath, decompressed);
      dbPath = tmpPath;
      console.log('Database successfully extracted to /tmp (size:', (decompressed.length / (1024 * 1024)).toFixed(2), 'MB)');
    } catch (e) {
      console.error('Failed to extract compressed database:', e);
    }
  }
}

if (!dbPath) {
  // Fallback to default path
  dbPath = path.resolve(__dirname, '../../database/mplads_risk.db');
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database at', dbPath, ':', err.message);
  } else {
    db.run('PRAGMA foreign_keys = ON;');
    console.log('Connected to SQLite database with foreign keys enabled at:', dbPath);
  }
});

const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
};

module.exports = {
  db,
  dbQuery,
  dbGet,
  dbRun
};
