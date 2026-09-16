const express = require('express');
const router = express.Router();
const { dbGet } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const row = await dbGet('SELECT COUNT(*) as count FROM works');
    res.json({
      status: 'ok',
      system: 'MPLADS AI Risk Monitoring Engine — Hybrid Risk System (SIH26102)',
      indexed_works: row ? row.count : 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

module.exports = router;
