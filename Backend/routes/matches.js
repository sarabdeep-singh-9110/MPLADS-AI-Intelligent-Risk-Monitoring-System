const express = require('express');
const router = express.Router();
const { dbGet, dbQuery, dbRun } = require('../db/database');

const DISCLAIMER = "Match reviews allow authorized personnel to link or reject analytical candidate pairs. All administrative review actions are audited in match_metadata. Production works records remain unaltered.";

// ---------------------------------------------------------------------------
// GET /api/matches/review
// Paginated queue of MEDIUM & LOW confidence candidates for administrative review
// ---------------------------------------------------------------------------
router.get('/review', async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;
    const offset = (page - 1) * limit;

    const { confidence, state, mp, search, status = 'PENDING_REVIEW' } = req.query;

    let whereClauses = [];
    let params = [];

    if (status) {
      whereClauses.push("mm.match_status = ?");
      params.push(status);
    }

    if (confidence && confidence !== 'ALL') {
      whereClauses.push("mm.match_confidence = ?");
      params.push(confidence);
    }

    if (state) {
      whereClauses.push("e.state = ?");
      params.push(state.trim());
    }

    if (mp) {
      whereClauses.push("e.loksabha_MP_name LIKE ?");
      params.push(`%${mp.trim()}%`);
    }

    if (search) {
      whereClauses.push("(e.work LIKE ? OR e.vendor_name LIKE ? OR e.loksabha_MP_name LIKE ?)");
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total counts by confidence
    const queueCounts = await dbGet(`
      SELECT 
        COUNT(*) as total_pending,
        SUM(CASE WHEN match_confidence = 'MEDIUM' THEN 1 ELSE 0 END) as medium_pending,
        SUM(CASE WHEN match_confidence = 'LOW' THEN 1 ELSE 0 END) as low_pending,
        SUM(CASE WHEN match_status = 'APPROVED' THEN 1 ELSE 0 END) as total_approved,
        SUM(CASE WHEN match_status = 'REJECTED' THEN 1 ELSE 0 END) as total_rejected
      FROM match_metadata
      WHERE match_status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')
    `);

    // Total in filtered set
    const countSql = `
      SELECT COUNT(*) as total
      FROM match_metadata mm
      JOIN expenditures e ON mm.expenditure_id = e.expenditure_id
      ${whereStr}
    `;
    const countRow = await dbGet(countSql, params);

    // Fetch review candidates
    const dataSql = `
      SELECT 
        mm.match_id,
        mm.expenditure_id,
        mm.project_id,
        mm.match_confidence,
        mm.match_method,
        mm.similarity_score,
        mm.match_status,
        mm.matched_at,
        mm.reviewed_by,
        mm.reviewed_at,
        mm.review_notes,
        mm.candidate_project_ids,
        e.work as expenditure_work,
        e.expenditure_amount,
        e.expenditure_date,
        e.vendor_name,
        e.implementing_agency_name,
        e.loksabha_MP_name,
        e.state,
        e.loksabha_constituency,
        e.implementing_district_per_source,
        e.payment_status
      FROM match_metadata mm
      JOIN expenditures e ON mm.expenditure_id = e.expenditure_id
      ${whereStr}
      ORDER BY mm.similarity_score DESC, e.expenditure_amount DESC
      LIMIT ? OFFSET ?
    `;

    const candidates = await dbQuery(dataSql, [...params, limit, offset]);

    // Gather candidate project IDs to fetch project details in batch
    const allCandidatePids = new Set();
    candidates.forEach(c => {
      if (c.project_id) allCandidatePids.add(c.project_id);
      if (c.candidate_project_ids) {
        c.candidate_project_ids.split(',').forEach(pid => {
          if (pid.trim()) allCandidatePids.add(pid.trim());
        });
      }
    });

    const projectLookup = new Map();
    if (allCandidatePids.size > 0) {
      const pidList = Array.from(allCandidatePids);
      const placeholders = pidList.map(() => '?').join(',');
      const projectRows = await dbQuery(`
        SELECT project_id, work, category, allocation_amount, hybrid_risk_score, hybrid_risk_level, mp_name, constituency
        FROM works
        WHERE project_id IN (${placeholders})
      `, pidList);

      projectRows.forEach(p => projectLookup.set(p.project_id, p));
    }

    // Attach candidate project objects to candidate response
    const enriched = candidates.map(c => {
      let candProjects = [];
      if (c.project_id && projectLookup.has(c.project_id)) {
        candProjects.push(projectLookup.get(c.project_id));
      }
      if (c.candidate_project_ids) {
        c.candidate_project_ids.split(',').forEach(pid => {
          const trimmed = pid.trim();
          if (trimmed && projectLookup.has(trimmed) && !candProjects.some(cp => cp.project_id === trimmed)) {
            candProjects.push(projectLookup.get(trimmed));
          }
        });
      }

      return {
        ...c,
        candidate_projects: candProjects
      };
    });

    res.json({
      disclaimer: DISCLAIMER,
      queue_summary: queueCounts,
      pagination: {
        total: countRow ? countRow.total : 0,
        page,
        limit,
        total_pages: countRow ? Math.ceil(countRow.total / limit) : 0
      },
      data: enriched
    });
  } catch (err) {
    console.error('Error in /api/matches/review:', err);
    res.status(500).json({ error: 'Failed to retrieve match review queue', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/matches/:matchId
// Update match link status, approve/reject candidates, add administrative notes
// ---------------------------------------------------------------------------
router.patch('/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { action, project_id, review_notes, reviewed_by = 'Administrator' } = req.body;

    const existingMatch = await dbGet('SELECT * FROM match_metadata WHERE match_id = ?', [matchId]);
    if (!existingMatch) {
      return res.status(404).json({ error: 'Match record not found' });
    }

    const now = new Date().toISOString();
    let newStatus = existingMatch.match_status;
    let newProjectId = existingMatch.project_id;
    let newNotes = review_notes !== undefined ? review_notes : existingMatch.review_notes;

    switch (action) {
      case 'approve':
        newStatus = 'APPROVED';
        if (project_id) {
          // Verify project exists in works
          const proj = await dbGet('SELECT project_id FROM works WHERE project_id = ?', [project_id]);
          if (!proj) {
            return res.status(400).json({ error: `Project ID ${project_id} not found in works table` });
          }
          newProjectId = project_id;
        } else if (!newProjectId && existingMatch.candidate_project_ids) {
          // Default to first candidate if available
          const firstCand = existingMatch.candidate_project_ids.split(',')[0].trim();
          if (firstCand) newProjectId = firstCand;
        }
        break;

      case 'reject':
        newStatus = 'REJECTED';
        newProjectId = null;
        break;

      case 'unlink':
        newStatus = 'PENDING_REVIEW';
        newProjectId = null;
        break;

      case 'link':
        if (!project_id) {
          return res.status(400).json({ error: 'project_id is required for link action' });
        }
        const projCheck = await dbGet('SELECT project_id FROM works WHERE project_id = ?', [project_id]);
        if (!projCheck) {
          return res.status(400).json({ error: `Project ID ${project_id} not found in works table` });
        }
        newStatus = 'APPROVED';
        newProjectId = project_id;
        break;

      case 'add_notes':
        // Just updating notes
        break;

      default:
        return res.status(400).json({ error: `Invalid action: ${action}. Allowed: approve, reject, unlink, link, add_notes` });
    }

    await dbRun(`
      UPDATE match_metadata
      SET 
        match_status = ?,
        project_id = ?,
        reviewed_by = ?,
        reviewed_at = ?,
        review_notes = ?
      WHERE match_id = ?
    `, [newStatus, newProjectId, reviewed_by, now, newNotes, matchId]);

    const updated = await dbGet(`
      SELECT mm.*, e.work as expenditure_work, e.vendor_name, e.expenditure_amount
      FROM match_metadata mm
      JOIN expenditures e ON mm.expenditure_id = e.expenditure_id
      WHERE mm.match_id = ?
    `, [matchId]);

    res.json({
      message: `Match record successfully updated with action: ${action}`,
      data: updated
    });
  } catch (err) {
    console.error('Error in PATCH /api/matches/:matchId:', err);
    res.status(500).json({ error: 'Failed to update match record', message: err.message });
  }
});

module.exports = router;
