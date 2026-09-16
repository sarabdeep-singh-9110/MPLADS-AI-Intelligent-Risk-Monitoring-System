const express = require('express');
const router = express.Router();
const { dbGet, dbQuery } = require('../db/database');

const DISCLAIMER = "Risk scores indicate potential statistical and administrative anomalies to prioritize works for human verification. They are not proof of fraud, corruption, or wrongdoing.";

// GET /api/projects/high-risk
router.get('/high-risk', async (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 20;
    if (limit > 100) limit = 100;
    const { state } = req.query;

    let sql = `
      SELECT w.*, i.status as investigation_status, i.priority as investigation_priority, i.officer_notes
      FROM works w
      LEFT JOIN investigations i ON w.project_id = i.project_id
    `;
    const params = [];

    if (state) {
      sql += ` WHERE w.state = ?`;
      params.push(state);
    }

    sql += `
      ORDER BY w.hybrid_risk_score DESC, w.allocation_amount DESC
      LIMIT ?
    `;
    params.push(limit);

    const projects = await dbQuery(sql, params);
    res.json({
      disclaimer: DISCLAIMER,
      count: projects.length,
      data: projects
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects (Paginated Search & Filter)
router.get('/', async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;
    const offset = (page - 1) * limit;

    const { state, constituency, risk_level, status, search, sortBy = 'hybrid_risk_score', sortOrder = 'DESC' } = req.query;

    let whereClause = [];
    let params = [];

    if (risk_level) {
      whereClause.push('w.hybrid_risk_level = ?');
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
    if (status) {
      whereClause.push('w.status = ?');
      params.push(status);
    }
    if (search) {
      whereClause.push('(w.work LIKE ? OR w.mp_name LIKE ? OR w.constituency LIKE ? OR w.block LIKE ? OR w.village LIKE ? OR w.project_id LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    const whereSql = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const countRow = await dbGet(`SELECT COUNT(*) as total FROM works w ${whereSql}`, params);
    
    const validCols = ['hybrid_risk_score', 'rule_risk_score', 'ml_anomaly_score', 'allocation_amount', 'recommended_date', 'project_id'];
    const orderCol = validCols.includes(sortBy) ? `w.${sortBy}` : 'w.hybrid_risk_score';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT w.*, i.status as investigation_status, i.priority as investigation_priority, i.officer_notes
      FROM works w
      LEFT JOIN investigations i ON w.project_id = i.project_id
      ${whereSql}
      ORDER BY ${orderCol} ${orderDir}
      LIMIT ? OFFSET ?
    `;

    const projects = await dbQuery(sql, [...params, limit, offset]);

    res.json({
      disclaimer: DISCLAIMER,
      pagination: {
        total: countRow ? countRow.total : 0,
        page,
        limit,
        total_pages: countRow ? Math.ceil(countRow.total / limit) : 0
      },
      data: projects
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/demo/evidence-projects (Demo Projects with Sample Evidence)
router.get('/demo/evidence-projects', async (req, res) => {
  try {
    const sql = `
      SELECT 
        pv.verification_id,
        pv.project_id,
        pv.evidence_source,
        pv.is_demo,
        pv.vendor_progress_pct,
        pv.vendor_expenditure,
        pv.vendor_completion_status,
        pv.field_progress_pct,
        pv.field_expenditure,
        pv.field_completion_status,
        pv.progress_diff_pct,
        pv.expenditure_diff,
        pv.completion_mismatch,
        pv.discrepancy_score,
        pv.discrepancy_reasons,
        pv.ai_demo_explanation,
        w.work,
        w.state,
        w.constituency,
        w.category,
        w.allocation_amount,
        w.hybrid_risk_score,
        w.hybrid_risk_level
      FROM project_verifications pv
      JOIN works w ON pv.project_id = w.project_id
      WHERE pv.is_demo = 1
      ORDER BY pv.progress_diff_pct DESC
    `;
    const rows = await dbQuery(sql);
    const mapped = rows.map(r => ({
      ...r,
      discrepancy_reasons: JSON.parse(r.discrepancy_reasons || '[]'),
      is_anomaly_scenario: r.completion_mismatch === 1 || r.progress_diff_pct >= 20
    }));

    res.json({
      disclaimer: DISCLAIMER,
      notice: "DEMO DATA • Sample Field Evidence Demonstration Projects. Excluded from official production analytics.",
      count: mapped.length,
      data: mapped
    });
  } catch (err) {
    console.error('Error in /api/projects/demo/evidence-projects:', err);
    res.status(500).json({ error: 'Failed to retrieve demo projects', message: err.message });
  }
});

// GET /api/projects/:id (Single Project Record)
router.get('/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const sql = `
      SELECT w.*, i.status as investigation_status, i.priority as investigation_priority, i.officer_notes, i.created_at as investigation_created_at, i.updated_at as investigation_updated_at
      FROM works w
      LEFT JOIN investigations i ON w.project_id = i.project_id
      WHERE w.project_id = ?
    `;

    const project = await dbGet(sql, [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const catStats = await dbGet(
      'SELECT AVG(allocation_amount) as avg_amount, COUNT(*) as cat_total FROM works WHERE category = ?',
      [project.category]
    );

    const mpStats = await dbGet(
      'SELECT COUNT(*) as total_mp_works, AVG(hybrid_risk_score) as avg_mp_hybrid FROM works WHERE mp_name = ?',
      [project.mp_name]
    );

    res.json({
      disclaimer: DISCLAIMER,
      data: project,
      benchmark: {
        category_average_amount: catStats ? Math.round(catStats.avg_amount) : 0,
        category_total_works: catStats ? catStats.cat_total : 0,
        mp_total_works: mpStats ? mpStats.total_mp_works : 0,
        mp_avg_hybrid_score: mpStats ? Math.round(mpStats.avg_mp_hybrid * 10) / 10 : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id/expenditures
// Linked financial expenditure vouchers and independent financial risk signals
// ---------------------------------------------------------------------------
router.get('/:id/expenditures', async (req, res) => {
  try {
    const projectId = req.params.id;

    // Verify project exists
    const project = await dbGet('SELECT * FROM works WHERE project_id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Query linked expenditures
    const sql = `
      SELECT 
        e.*,
        mm.match_id,
        mm.match_confidence,
        mm.match_method,
        mm.similarity_score,
        mm.match_status,
        mm.matched_at,
        mm.reviewed_by,
        mm.reviewed_at,
        mm.review_notes
      FROM match_metadata mm
      JOIN expenditures e ON mm.expenditure_id = e.expenditure_id
      WHERE mm.project_id = ? AND mm.match_status IN ('AUTO_LINKED', 'APPROVED')
      ORDER BY e.expenditure_date DESC, e.expenditure_amount DESC
    `;

    const vouchers = await dbQuery(sql, [projectId]);

    if (!vouchers || vouchers.length === 0) {
      return res.json({
        disclaimer: DISCLAIMER,
        source: "Dataful Dataset 22565 — 18th Lok Sabha MPLADS",
        project_id: projectId,
        has_linked_expenditures: false,
        message: "No verified expenditure records linked to this project",
        vouchers: [],
        financial_summary: null
      });
    }

    // Compute financial analytics
    const totalSpent = vouchers.reduce((acc, v) => acc + (parseFloat(v.expenditure_amount) || 0), 0);
    const allocAmount = parseFloat(project.allocation_amount) || 0;
    const benchmarkBudget = allocAmount > 0 ? allocAmount : totalSpent;

    const vendorMap = {};
    const agencySet = new Set();
    let inProgressCount = 0;
    let inProgressAmount = 0;

    vouchers.forEach(v => {
      const vName = v.vendor_name || 'Unknown';
      vendorMap[vName] = (vendorMap[vName] || 0) + (parseFloat(v.expenditure_amount) || 0);
      if (v.implementing_agency_name) agencySet.add(v.implementing_agency_name);
      if (v.payment_status && v.payment_status.toLowerCase().includes('in-progress')) {
        inProgressCount++;
        inProgressAmount += (parseFloat(v.expenditure_amount) || 0);
      }
    });

    // Financial Risk Assessment (Independent of hybrid score)
    let financialScore = 0;
    const signals = [];

    // 1. Budget overrun
    if (benchmarkBudget > 0 && totalSpent > benchmarkBudget * 1.05) {
      const overrunPct = ((totalSpent - benchmarkBudget) / benchmarkBudget) * 100;
      if (overrunPct > 50) {
        financialScore += 40;
        signals.push({ type: 'BUDGET_OVERRUN', severity: 'HIGH', message: `Expenditure exceeds allocation by ${overrunPct.toFixed(1)}%` });
      } else if (overrunPct > 20) {
        financialScore += 25;
        signals.push({ type: 'BUDGET_OVERRUN', severity: 'MEDIUM', message: `Expenditure exceeds allocation by ${overrunPct.toFixed(1)}%` });
      } else {
        financialScore += 15;
        signals.push({ type: 'BUDGET_OVERRUN', severity: 'LOW', message: `Expenditure slightly exceeds allocation by ${overrunPct.toFixed(1)}%` });
      }
    }

    // 2. In-progress disbursements
    if (inProgressCount > 0) {
      const inProgPct = (inProgressCount / vouchers.length) * 100;
      financialScore += inProgPct > 50 ? 25 : 15;
      signals.push({ type: 'PAYMENT_IN_PROGRESS', severity: inProgPct > 50 ? 'MEDIUM' : 'LOW', message: `${inProgressCount} voucher(s) currently marked Payment In-Progress (₹${(inProgressAmount/100000).toFixed(2)} Lakh)` });
    }

    // 3. Vendor concentration (>85% to single vendor)
    const vendorsList = Object.entries(vendorMap).map(([name, spend]) => ({ name, spend }));
    vendorsList.sort((a, b) => b.spend - a.spend);
    if (vendorsList.length > 0 && totalSpent > 0) {
      const topVendorPct = (vendorsList[0].spend / totalSpent) * 100;
      if (topVendorPct > 85 && vouchers.length > 2) {
        financialScore += 20;
        signals.push({ type: 'VENDOR_CONCENTRATION', severity: 'MEDIUM', message: `High vendor concentration: ${topVendorPct.toFixed(1)}% of disbursements allocated to "${vendorsList[0].name}"` });
      }
    }

    // 4. Same day split vouchers to same vendor
    const dateVendorSet = new Set();
    let hasSplitVouchers = false;
    vouchers.forEach(v => {
      const key = `${v.expenditure_date}|${v.vendor_name}`;
      if (dateVendorSet.has(key)) hasSplitVouchers = true;
      dateVendorSet.add(key);
    });
    if (hasSplitVouchers) {
      financialScore += 15;
      signals.push({ type: 'SPLIT_TRANSACTION', severity: 'MEDIUM', message: `Multiple vouchers disbursed on identical dates to the same vendor` });
    }

    financialScore = Math.min(100, Math.max(0, financialScore));
    let financialLevel = 'LOW';
    if (financialScore >= 75) financialLevel = 'CRITICAL';
    else if (financialScore >= 50) financialLevel = 'HIGH';
    else if (financialScore >= 25) financialLevel = 'MEDIUM';

    res.json({
      disclaimer: DISCLAIMER,
      source: "Dataful Dataset 22565 — 18th Lok Sabha MPLADS",
      project_id: projectId,
      has_linked_expenditures: true,
      financial_summary: {
        total_vouchers: vouchers.length,
        total_spent: totalSpent,
        allocation_amount: allocAmount,
        disbursement_percentage: benchmarkBudget > 0 ? Math.round((totalSpent / benchmarkBudget) * 1000) / 10 : 100,
        in_progress_vouchers: inProgressCount,
        in_progress_amount: inProgressAmount,
        unique_vendors_count: vendorsList.length,
        unique_agencies_count: agencySet.size,
        vendors_breakdown: vendorsList,
        primary_vendor: vendorsList.length > 0 ? vendorsList[0].name : null
      },
      financial_risk: {
        score: financialScore,
        level: financialLevel,
        signals: signals
      },
      vouchers: vouchers
    });
  } catch (err) {
    console.error('Error in /api/projects/:id/expenditures:', err);
    res.status(500).json({ error: 'Failed to retrieve project expenditures', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id/evidence
// Execution & Field Verification Evidence (Images, Geo-tags, Progress Metrics)
// ---------------------------------------------------------------------------
router.get('/:id/evidence', async (req, res) => {
  try {
    const projectId = req.params.id;
    const includeDemo = req.query.include_demo === 'true';

    // Verify project exists
    const project = await dbGet('SELECT project_id, work, state, constituency, allocation_amount FROM works WHERE project_id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if demo data exists for this project
    const demoVerif = await dbGet('SELECT * FROM project_verifications WHERE project_id = ? AND is_demo = 1', [projectId]);
    const demoAvailable = !!demoVerif;

    let photos = [];
    let verif = null;

    if (includeDemo) {
      photos = await dbQuery('SELECT * FROM execution_evidence WHERE project_id = ? ORDER BY stage ASC, created_at ASC', [projectId]);
      verif = await dbGet('SELECT * FROM project_verifications WHERE project_id = ?', [projectId]);
    } else {
      photos = await dbQuery('SELECT * FROM execution_evidence WHERE project_id = ? AND is_demo = 0 ORDER BY stage ASC, created_at ASC', [projectId]);
      verif = await dbGet('SELECT * FROM project_verifications WHERE project_id = ? AND is_demo = 0', [projectId]);
    }

    const hasEvidence = photos.length > 0 || !!verif;
    const isDemoRecord = (photos.length > 0 && photos[0].is_demo === 1) || (verif && verif.is_demo === 1);

    // Group photos by stage
    const stages = {
      BEFORE: photos.filter(p => p.stage === 'BEFORE'),
      DURING: photos.filter(p => p.stage === 'DURING'),
      AFTER: photos.filter(p => p.stage === 'AFTER')
    };

    let timeline = [];
    let discrepancyReasons = [];
    if (verif && verif.timeline_json) {
      try { timeline = JSON.parse(verif.timeline_json); } catch (e) {}
    }
    if (verif && verif.discrepancy_reasons) {
      try { discrepancyReasons = JSON.parse(verif.discrepancy_reasons); } catch (e) {}
    }

    res.json({
      disclaimer: DISCLAIMER,
      project_id: projectId,
      has_evidence: hasEvidence,
      demo_available: demoAvailable,
      evidence_source: isDemoRecord ? 'DEMO' : (hasEvidence ? 'REAL' : 'NONE'),
      is_demo: isDemoRecord,
      demo_notice: isDemoRecord 
        ? "DEMO DATA • Sample Field Evidence — Demonstration Only. Excluded from official production analytics." 
        : null,
      photos: {
        total: photos.length,
        stages: stages,
        all: photos
      },
      verification: verif ? {
        verification_id: verif.verification_id,
        is_demo: verif.is_demo === 1,
        evidence_source: verif.evidence_source,
        vendor: {
          progress_pct: verif.vendor_progress_pct,
          expenditure: verif.vendor_expenditure,
          completion_status: verif.vendor_completion_status,
          photos_count: verif.vendor_photos_count,
          report_date: verif.vendor_report_date
        },
        field: {
          progress_pct: verif.field_progress_pct,
          expenditure: verif.field_expenditure,
          completion_status: verif.field_completion_status,
          photos_count: verif.field_photos_count,
          verification_date: verif.field_verification_date
        },
        discrepancy_analysis: {
          progress_diff_pct: verif.progress_diff_pct,
          expenditure_diff: verif.expenditure_diff,
          completion_mismatch: verif.completion_mismatch === 1,
          location_consistency: verif.location_consistency,
          discrepancy_score: verif.discrepancy_score,
          discrepancy_reasons: discrepancyReasons,
          ai_demo_explanation: verif.ai_demo_explanation
        },
        timeline: timeline
      } : null
    });

  } catch (err) {
    console.error('Error in /api/projects/:id/evidence:', err);
    res.status(500).json({ error: 'Failed to retrieve project evidence', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/evidence
// Upload REAL field evidence (Strictly separated from DEMO data)
// ---------------------------------------------------------------------------
router.post('/:id/evidence', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { stage, image_url, caption, official_location, gps_lat, gps_lng, timestamp, captured_by } = req.body;

    if (!stage || !image_url) {
      return res.status(400).json({ error: 'Missing required fields: stage, image_url' });
    }

    const validStages = ['BEFORE', 'DURING', 'AFTER'];
    if (!validStages.includes(stage.toUpperCase())) {
      return res.status(400).json({ error: `Invalid stage. Allowed: ${validStages.join(', ')}` });
    }

    const evidenceId = `EVD_REAL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await dbRun(`
      INSERT INTO execution_evidence (
        evidence_id, project_id, evidence_source, is_demo, stage,
        image_url, caption, official_location, demo_gps_lat, demo_gps_lng,
        gps_label, distance_meters, timestamp, captured_by
      ) VALUES (?, ?, 'REAL', 0, ?, ?, ?, ?, ?, ?, 'Official GPS', 0, ?, ?)
    `, [
      evidenceId, projectId, stage.toUpperCase(),
      image_url, caption || '', official_location || '',
      parseFloat(gps_lat) || null, parseFloat(gps_lng) || null,
      timestamp || new Date().toISOString(), captured_by || 'Official Inspector'
    ]);

    res.status(201).json({
      message: 'Real field evidence uploaded successfully',
      evidence_id: evidenceId,
      evidence_source: 'REAL',
      is_demo: false
    });
  } catch (err) {
    console.error('Error uploading evidence:', err);
    res.status(500).json({ error: 'Failed to upload evidence', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id/discrepancy-analysis
// Dedicated Discrepancy Evaluation endpoint
// ---------------------------------------------------------------------------
router.get('/:id/discrepancy-analysis', async (req, res) => {
  try {
    const projectId = req.params.id;
    const verif = await dbGet('SELECT * FROM project_verifications WHERE project_id = ?', [projectId]);
    if (!verif) {
      return res.json({ has_analysis: false, message: 'No verification record found for this project.' });
    }

    res.json({
      disclaimer: DISCLAIMER,
      project_id: projectId,
      has_analysis: true,
      is_demo: verif.is_demo === 1,
      evidence_source: verif.evidence_source,
      discrepancy_score: verif.discrepancy_score,
      progress_diff_pct: verif.progress_diff_pct,
      expenditure_diff: verif.expenditure_diff,
      completion_mismatch: verif.completion_mismatch === 1,
      location_consistency: verif.location_consistency,
      discrepancy_reasons: JSON.parse(verif.discrepancy_reasons || '[]'),
      ai_explanation: verif.ai_demo_explanation,
      analysis_badge: verif.is_demo ? 'DEMO ANALYSIS' : 'OFFICIAL ANALYSIS'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

