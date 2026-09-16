const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const zlib = require('zlib');

let dbPath = path.resolve(__dirname, '../../database/mplads_risk.db');

// In serverless / cloud environment (e.g. Vercel), extract compressed DB to /tmp
if (!fs.existsSync(dbPath)) {
  const tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
  const tmpPath = path.join(tmpDir, 'mplads_risk.db');
  const gzPath = path.resolve(__dirname, '../../database/mplads_risk.db.gz');

  if (fs.existsSync(tmpPath)) {
    dbPath = tmpPath;
  } else if (fs.existsSync(gzPath)) {
    console.log('Extracting database to', tmpPath, 'for cloud runtime...');
    try {
      const compressed = fs.readFileSync(gzPath);
      const decompressed = zlib.gunzipSync(compressed);
      fs.writeFileSync(tmpPath, decompressed);
      dbPath = tmpPath;
      console.log('Database extraction complete.');
    } catch (e) {
      console.error('Failed to extract compressed database:', e);
    }
  }
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
