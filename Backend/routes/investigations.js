const express = require('express');
const router = express.Router();
const { dbGet, dbQuery, dbRun } = require('../db/database');

const VALID_STATUSES = ['NEW', 'UNDER_REVIEW', 'VERIFIED', 'CLEARED', 'ESCALATED'];
const VALID_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

// GET /api/investigations
router.get('/', async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;
    const offset = (page - 1) * limit;

    const { status, priority, risk_level, state, constituency, search, sortBy = 'risk', sortOrder = 'DESC' } = req.query;

    let whereClause = [];
    let params = [];

    if (status) {
      if (!VALID_STATUSES.includes(status.toUpperCase())) {
        return res.status(400).json({ error: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}` });
      }
      whereClause.push('i.status = ?');
      params.push(status.toUpperCase());
    }

    if (priority) {
      if (!VALID_PRIORITIES.includes(priority.toUpperCase())) {
        return res.status(400).json({ error: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}` });
      }
      whereClause.push('i.priority = ?');
      params.push(priority.toUpperCase());
    }

    if (risk_level) {
      whereClause.push('LOWER(w.hybrid_risk_level) = LOWER(?)');
      params.push(risk_level);
    }

    if (state) {
      whereClause.push('w.state = ?');
      params.push(state);
    }

    if (constituency) {
      whereClause.push('w.constituency = ?');
      params.push(constituency);
    }

    if (search && search.trim()) {
      whereClause.push('(w.work LIKE ? OR w.mp_name LIKE ? OR w.constituency LIKE ? OR w.project_id LIKE ? OR i.officer_notes LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    const whereSql = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const countRow = await dbGet(`
      SELECT COUNT(*) as total 
      FROM investigations i 
      JOIN works w ON i.project_id = w.project_id 
      ${whereSql}
    `, params);

    let orderSql = `
      ORDER BY 
        CASE w.hybrid_risk_level
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END ASC,
        w.hybrid_risk_score DESC,
        w.allocation_amount DESC,
        i.updated_at DESC
    `;

    if (sortBy === 'updated_at') {
      orderSql = `ORDER BY i.updated_at ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}, w.hybrid_risk_score DESC`;
    } else if (sortBy === 'allocation_amount') {
      orderSql = `ORDER BY w.allocation_amount ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
    }

    const sql = `
      SELECT 
        i.investigation_id,
        i.project_id,
        i.status,
        i.priority,
        i.officer_notes,
        i.created_at,
        i.updated_at,
        w.work,
        w.mp_name,
        w.category,
        w.state,
        w.constituency,
        w.block,
        w.village,
        w.allocation_amount,
        w.status as project_status,
        w.rule_risk_score,
        w.ml_anomaly_score,
        w.hybrid_risk_score,
        w.hybrid_risk_level,
        w.hybrid_risk_reasons,
        w.recommended_action
      FROM investigations i
      JOIN works w ON i.project_id = w.project_id
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `;

    const records = await dbQuery(sql, [...params, limit, offset]);

    res.json({
      pagination: {
        total: countRow ? countRow.total : 0,
        page,
        limit,
        total_pages: countRow ? Math.ceil(countRow.total / limit) : 0
      },
      data: records
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/investigations/:projectId
router.get('/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const sql = `
      SELECT i.*, w.mp_name, w.work, w.state, w.constituency, w.allocation_amount, w.hybrid_risk_score, w.hybrid_risk_level, w.hybrid_risk_reasons, w.recommended_action
      FROM investigations i
      JOIN works w ON i.project_id = w.project_id
      WHERE i.project_id = ?
    `;

    const record = await dbGet(sql, [projectId]);
    if (!record) {
      return res.status(404).json({ error: 'Investigation record not found' });
    }

    res.json({ data: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/investigations (Create / Reset Investigation)
router.post('/', async (req, res) => {
  try {
    const { project_id, status = 'NEW', priority = 'MEDIUM', officer_notes = '' } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    const normStatus = status.toUpperCase();
    const normPriority = priority.toUpperCase();

    if (!VALID_STATUSES.includes(normStatus)) {
      return res.status(400).json({ error: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}` });
    }
    if (!VALID_PRIORITIES.includes(normPriority)) {
      return res.status(400).json({ error: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}` });
    }

    const workExists = await dbGet('SELECT project_id FROM works WHERE project_id = ?', [project_id]);
    if (!workExists) {
      return res.status(404).json({ error: 'Project ID does not exist in works database' });
    }

    await dbRun(`
      INSERT INTO investigations (project_id, status, priority, officer_notes, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(project_id) DO UPDATE SET
        status = excluded.status,
        priority = excluded.priority,
        officer_notes = excluded.officer_notes,
        updated_at = CURRENT_TIMESTAMP
    `, [project_id, normStatus, normPriority, officer_notes]);

    const updated = await dbGet('SELECT * FROM investigations WHERE project_id = ?', [project_id]);
    res.status(201).json({ message: 'Investigation record created/updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/investigations/:projectId (Update Investigation)
router.patch('/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { status, priority, officer_notes } = req.body;

    let updates = [];
    let params = [];

    if (status !== undefined) {
      const normStatus = status.toUpperCase();
      if (!VALID_STATUSES.includes(normStatus)) {
        return res.status(400).json({ error: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}` });
      }
      updates.push('status = ?');
      params.push(normStatus);
    }

    if (priority !== undefined) {
      const normPriority = priority.toUpperCase();
      if (!VALID_PRIORITIES.includes(normPriority)) {
        return res.status(400).json({ error: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}` });
      }
      updates.push('priority = ?');
      params.push(normPriority);
    }

    if (officer_notes !== undefined) {
      updates.push('officer_notes = ?');
      params.push(officer_notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(projectId);

    const result = await dbRun(`UPDATE investigations SET ${updates.join(', ')} WHERE project_id = ?`, params);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Investigation record not found for this project_id' });
    }

    const updated = await dbGet('SELECT * FROM investigations WHERE project_id = ?', [projectId]);
    res.json({ message: 'Investigation updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
