const express = require('express');
const router = express.Router();
const { dbQuery } = require('../db/database');

// GET /api/states (Dynamic State List)
router.get('/states', async (req, res) => {
  try {
    const states = await dbQuery(`SELECT DISTINCT state FROM works WHERE state IS NOT NULL AND state != 'Unknown' ORDER BY state`);
    res.json({
      total: states.length,
      states: states.map(s => s.state)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/constituencies (Dynamic Constituencies for selected state)
router.get('/constituencies', async (req, res) => {
  try {
    const { state } = req.query;
    let sql = `SELECT DISTINCT constituency FROM works WHERE constituency IS NOT NULL AND constituency != ''`;
    const params = [];
    if (state) {
      sql += ` AND state = ?`;
      params.push(state);
    }
    sql += ` ORDER BY constituency`;
    const rows = await dbQuery(sql, params);
    res.json({
      total: rows.length,
      constituencies: rows.map(r => r.constituency)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
