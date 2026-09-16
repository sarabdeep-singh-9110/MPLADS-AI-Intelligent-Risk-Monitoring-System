const express = require('express');
const router = express.Router();
const { dbGet, dbQuery, dbRun } = require('../db/database');

const DISCLAIMER = "Potentially similar works indicate administrative, location, and description commonalities for human verification. They are not proof of duplication, fraud, or wrongdoing.";

const VALID_STATUSES = ['REQUIRES_VERIFICATION', 'UNDER_REVIEW', 'VERIFIED_LEGITIMATE', 'POTENTIALLY_DUPLICATE'];

// ---------------------------------------------------------------------------
// GET /api/similar-works/summary
// Summary KPIs for Similar Works module
// ---------------------------------------------------------------------------
router.get('/summary', async (req, res) => {
  try {
    const summary = await dbGet(`
      SELECT 
        COUNT(*) as total_pairs,
        SUM(CASE WHEN status = 'REQUIRES_VERIFICATION' THEN 1 ELSE 0 END) as requires_verification_count,
        SUM(CASE WHEN status = 'UNDER_REVIEW' THEN 1 ELSE 0 END) as under_review_count,
        SUM(CASE WHEN status = 'VERIFIED_LEGITIMATE' THEN 1 ELSE 0 END) as verified_legitimate_count,
        SUM(CASE WHEN status = 'POTENTIALLY_DUPLICATE' THEN 1 ELSE 0 END) as potentially_duplicate_count,
        COALESCE(SUM(MIN(allocation_a, allocation_b)), 0) as potential_overlap_exposure,
        AVG(similarity_score) as avg_similarity_score
      FROM similar_works
    `);

    res.json({
      disclaimer: DISCLAIMER,
      data: {
        total_pairs: summary ? summary.total_pairs : 0,
        requires_verification_count: summary ? summary.requires_verification_count : 0,
        under_review_count: summary ? summary.under_review_count : 0,
        verified_legitimate_count: summary ? summary.verified_legitimate_count : 0,
        potentially_duplicate_count: summary ? summary.potentially_duplicate_count : 0,
        potential_overlap_exposure: summary ? summary.potential_overlap_exposure : 0,
        avg_similarity_score: summary && summary.avg_similarity_score ? Math.round(summary.avg_similarity_score * 10) / 10 : 0
      }
    });
  } catch (err) {
    console.error('Error in /api/similar-works/summary:', err);
    res.status(500).json({ error: 'Failed to retrieve similar works summary', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/similar-works
// Paginated list of similar work pairs with rich filters
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;
    const offset = (page - 1) * limit;

    const { state, constituency, status, min_score, search, sortBy = 'similarity_score', sortOrder = 'DESC' } = req.query;

    let whereClauses = [];
    let params = [];

    if (state) {
      whereClauses.push("s.state = ?");
      params.push(state.trim());
    }

    if (constituency) {
      whereClauses.push("s.constituency = ?");
      params.push(constituency.trim());
    }

    if (status && status !== 'ALL') {
      whereClauses.push("s.status = ?");
      params.push(status.trim().toUpperCase());
    }

    if (min_score) {
      whereClauses.push("s.similarity_score >= ?");
      params.push(parseFloat(min_score));
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClauses.push("(s.project_a_id LIKE ? OR s.project_b_id LIKE ? OR s.mp_name LIKE ? OR wa.work LIKE ? OR s.location_block LIKE ? OR s.location_village LIKE ?)");
      params.push(q, q, q, q, q, q);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) as total
      FROM similar_works s
      JOIN works wa ON s.project_a_id = wa.project_id
      JOIN works wb ON s.project_b_id = wb.project_id
      ${whereStr}
    `;
    const countRow = await dbGet(countSql, params);

    const safeSort = ['similarity_score', 'allocation_a', 'created_at'].includes(sortBy) ? `s.${sortBy}` : 's.similarity_score';
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataSql = `
      SELECT 
        s.id,
        s.similarity_score,
        s.similarity_reasons,
        s.state,
        s.constituency,
        s.location_block,
        s.location_village,
        s.mp_name,
        s.allocation_a,
        s.allocation_b,
        s.status,
        s.officer_notes,
        s.created_at,
        s.updated_at,
        wa.project_id as a_project_id,
        wa.work as a_work,
        wa.category as a_category,
        wa.allocation_amount as a_allocation,
        wa.status as a_status,
        wa.recommended_date as a_recommended_date,
        wa.mp_name as a_mp_name,
        wa.hybrid_risk_score as a_hybrid_risk_score,
        wa.hybrid_risk_level as a_hybrid_risk_level,
        wa.block as a_block,
        wa.village as a_village,
        wb.project_id as b_project_id,
        wb.work as b_work,
        wb.category as b_category,
        wb.allocation_amount as b_allocation,
        wb.status as b_status,
        wb.recommended_date as b_recommended_date,
        wb.mp_name as b_mp_name,
        wb.hybrid_risk_score as b_hybrid_risk_score,
        wb.hybrid_risk_level as b_hybrid_risk_level,
        wb.block as b_block,
        wb.village as b_village
      FROM similar_works s
      JOIN works wa ON s.project_a_id = wa.project_id
      JOIN works wb ON s.project_b_id = wb.project_id
      ${whereStr}
      ORDER BY ${safeSort} ${safeOrder}, s.id ASC
      LIMIT ? OFFSET ?
    `;

    const records = await dbQuery(dataSql, [...params, limit, offset]);

    const formatted = records.map(r => ({
      id: r.id,
      similarity_score: r.similarity_score,
      similarity_reasons: r.similarity_reasons ? r.similarity_reasons.split(' | ') : [],
      state: r.state,
      constituency: r.constituency,
      location_block: r.location_block,
      location_village: r.location_village,
      mp_name: r.mp_name,
      status: r.status,
      officer_notes: r.officer_notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      project_a: {
        project_id: r.a_project_id,
        work: r.a_work,
        category: r.a_category,
        allocation_amount: r.a_allocation,
        status: r.a_status,
        recommended_date: r.a_recommended_date,
        mp_name: r.a_mp_name,
        hybrid_risk_score: r.a_hybrid_risk_score,
        hybrid_risk_level: r.a_hybrid_risk_level,
        state: r.state,
        constituency: r.constituency,
        block: r.a_block,
        village: r.a_village
      },
      project_b: {
        project_id: r.b_project_id,
        work: r.b_work,
        category: r.b_category,
        allocation_amount: r.b_allocation,
        status: r.b_status,
        recommended_date: r.b_recommended_date,
        mp_name: r.b_mp_name,
        hybrid_risk_score: r.b_hybrid_risk_score,
        hybrid_risk_level: r.b_hybrid_risk_level,
        state: r.state,
        constituency: r.constituency,
        block: r.b_block,
        village: r.b_village
      }
    }));

    res.json({
      disclaimer: DISCLAIMER,
      pagination: {
        total: countRow ? countRow.total : 0,
        page,
        limit,
        total_pages: countRow ? Math.ceil(countRow.total / limit) : 0
      },
      data: formatted
    });
  } catch (err) {
    console.error('Error in /api/similar-works:', err);
    res.status(500).json({ error: 'Failed to retrieve similar works', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/similar-works/:id
// Detailed pair view
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pair = await dbGet(`
      SELECT 
        s.*,
        wa.work as a_work, wa.category as a_category, wa.allocation_amount as a_allocation,
        wa.status as a_status, wa.recommended_date as a_recommended_date, wa.mp_name as a_mp_name,
        wa.hybrid_risk_score as a_hybrid_risk_score, wa.hybrid_risk_level as a_hybrid_risk_level,
        wa.rule_risk_score as a_rule_risk_score, wa.ml_anomaly_score as a_ml_anomaly_score,
        wa.block as a_block, wa.village as a_village, wa.rule_risk_reasons as a_rule_risk_reasons,
        wb.work as b_work, wb.category as b_category, wb.allocation_amount as b_allocation,
        wb.status as b_status, wb.recommended_date as b_recommended_date, wb.mp_name as b_mp_name,
        wb.hybrid_risk_score as b_hybrid_risk_score, wb.hybrid_risk_level as b_hybrid_risk_level,
        wb.rule_risk_score as b_rule_risk_score, wb.ml_anomaly_score as b_ml_anomaly_score,
        wb.block as b_block, wb.village as b_village, wb.rule_risk_reasons as b_rule_risk_reasons
      FROM similar_works s
      JOIN works wa ON s.project_a_id = wa.project_id
      JOIN works wb ON s.project_b_id = wb.project_id
      WHERE s.id = ?
    `, [id]);

    if (!pair) {
      return res.status(404).json({ error: 'Similar work pair not found' });
    }

    res.json({
      disclaimer: DISCLAIMER,
      data: {
        id: pair.id,
        similarity_score: pair.similarity_score,
        similarity_reasons: pair.similarity_reasons ? pair.similarity_reasons.split(' | ') : [],
        state: pair.state,
        constituency: pair.constituency,
        location_block: pair.location_block,
        location_village: pair.location_village,
        mp_name: pair.mp_name,
        status: pair.status,
        officer_notes: pair.officer_notes,
        created_at: pair.created_at,
        updated_at: pair.updated_at,
        project_a: {
          project_id: pair.project_a_id,
          work: pair.a_work,
          category: pair.a_category,
          allocation_amount: pair.a_allocation,
          status: pair.a_status,
          recommended_date: pair.a_recommended_date,
          mp_name: pair.a_mp_name,
          hybrid_risk_score: pair.a_hybrid_risk_score,
          hybrid_risk_level: pair.a_hybrid_risk_level,
          rule_risk_score: pair.a_rule_risk_score,
          ml_anomaly_score: pair.a_ml_anomaly_score,
          rule_risk_reasons: pair.a_rule_risk_reasons,
          state: pair.state,
          constituency: pair.constituency,
          block: pair.a_block,
          village: pair.a_village
        },
        project_b: {
          project_id: pair.project_b_id,
          work: pair.b_work,
          category: pair.b_category,
          allocation_amount: pair.b_allocation,
          status: pair.b_status,
          recommended_date: pair.b_recommended_date,
          mp_name: pair.b_mp_name,
          hybrid_risk_score: pair.b_hybrid_risk_score,
          hybrid_risk_level: pair.b_hybrid_risk_level,
          rule_risk_score: pair.b_rule_risk_score,
          ml_anomaly_score: pair.b_ml_anomaly_score,
          rule_risk_reasons: pair.b_rule_risk_reasons,
          state: pair.state,
          constituency: pair.constituency,
          block: pair.b_block,
          village: pair.b_village
        }
      }
    });
  } catch (err) {
    console.error('Error in /api/similar-works/:id:', err);
    res.status(500).json({ error: 'Failed to retrieve pair details', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/similar-works/:id
// Update verification status & officer notes
// ---------------------------------------------------------------------------
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, officer_notes } = req.body;

    const existing = await dbGet('SELECT * FROM similar_works WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Similar work pair not found' });
    }

    let updates = [];
    let params = [];

    if (status !== undefined) {
      const normStatus = status.trim().toUpperCase();
      if (!VALID_STATUSES.includes(normStatus)) {
        return res.status(400).json({ error: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}` });
      }
      updates.push('status = ?');
      params.push(normStatus);
    }

    if (officer_notes !== undefined) {
      updates.push('officer_notes = ?');
      params.push(officer_notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No update parameters provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await dbRun(`UPDATE similar_works SET ${updates.join(', ')} WHERE id = ?`, params);
    const updated = await dbGet('SELECT * FROM similar_works WHERE id = ?', [id]);

    res.json({
      message: 'Similar work verification status updated successfully',
      data: updated
    });
  } catch (err) {
    console.error('Error in PATCH /api/similar-works/:id:', err);
    res.status(500).json({ error: 'Failed to update similar work status', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/similar-works/:id/send-verification
// Link both projects directly to Field Verification Queue (investigations table)
// ---------------------------------------------------------------------------
router.post('/:id/send-verification', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const pair = await dbGet('SELECT * FROM similar_works WHERE id = ?', [id]);
    if (!pair) {
      return res.status(404).json({ error: 'Similar work pair not found' });
    }

    const noteText = notes || `Flagged for potential work similarity (${pair.similarity_score}% match with #${pair.project_a_id === pair.project_b_id ? pair.project_a_id : (pair.project_a_id + ' / ' + pair.project_b_id)}). Administrative verification required.`;

    // Upsert investigation records for both projects in SQLite
    const upsertSql = `
      INSERT INTO investigations (project_id, status, priority, officer_notes, updated_at)
      VALUES (?, 'UNDER_REVIEW', 'HIGH', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(project_id) DO UPDATE SET
        status = 'UNDER_REVIEW',
        priority = 'HIGH',
        officer_notes = officer_notes || ' | ' || excluded.officer_notes,
        updated_at = CURRENT_TIMESTAMP
    `;

    await dbRun(upsertSql, [pair.project_a_id, noteText]);
    await dbRun(upsertSql, [pair.project_b_id, noteText]);

    // Update pair status in similar_works
    await dbRun(`
      UPDATE similar_works 
      SET status = 'UNDER_REVIEW', 
          officer_notes = COALESCE(officer_notes || ' | ', '') || ?, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [`Sent to Field Verification Queue on ${new Date().toISOString().slice(0, 10)}`, id]);

    res.json({
      message: 'Both projects successfully escalated to Field Verification Queue',
      project_a_id: pair.project_a_id,
      project_b_id: pair.project_b_id,
      queue_status: 'UNDER_REVIEW',
      priority: 'HIGH'
    });
  } catch (err) {
    console.error('Error in send-verification:', err);
    res.status(500).json({ error: 'Failed to escalate to verification queue', message: err.message });
  }
});

module.exports = router;
