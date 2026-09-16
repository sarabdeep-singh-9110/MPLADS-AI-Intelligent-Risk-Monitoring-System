const express = require('express');
const router = express.Router();
const { dbGet, dbQuery } = require('../db/database');

const DISCLAIMER = "Geospatial intelligence is computed directly from official recorded administrative jurisdiction fields (State, Constituency, Block, Village) in official dataset records. No lat/long coordinates are fabricated.";

// ---------------------------------------------------------------------------
// GET /api/gis/map-data
// National & State-Level Geospatial Aggregations with Linked Expenditure
// ---------------------------------------------------------------------------
router.get('/map-data', async (req, res) => {
  try {
    // 1. Query State works distribution and risk
    const stateAgg = await dbQuery(`
      SELECT 
        w.state,
        COUNT(*) as total_projects,
        COALESCE(SUM(w.allocation_amount), 0) as total_allocation_amount,
        AVG(w.hybrid_risk_score) as avg_hybrid_risk_score,
        AVG(w.hybrid_risk_score) as avg_risk_score,
        COUNT(DISTINCT w.constituency) as total_constituencies,
        SUM(CASE WHEN w.hybrid_risk_level = 'Critical' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN w.hybrid_risk_level = 'High' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN w.hybrid_risk_level = 'Medium' THEN 1 ELSE 0 END) as medium_count,
        SUM(CASE WHEN w.hybrid_risk_level = 'Low' THEN 1 ELSE 0 END) as low_count,
        SUM(CASE WHEN LOWER(w.status) = 'sanctioned' THEN 1 ELSE 0 END) as sanctioned_count,
        SUM(CASE WHEN LOWER(w.status) = 'unsanctioned' THEN 1 ELSE 0 END) as unsanctioned_count,
        SUM(CASE WHEN LOWER(w.status) = 'ongoing' THEN 1 ELSE 0 END) as ongoing_count,
        SUM(CASE WHEN LOWER(w.status) = 'completed' THEN 1 ELSE 0 END) as completed_count
      FROM works w
      WHERE w.state IS NOT NULL AND w.state != 'Unknown' AND w.state != ''
      GROUP BY w.state
      ORDER BY critical_count DESC, high_count DESC, total_projects DESC
    `);

    // 2. Query Linked Dataful expenditure by state
    const expByState = await dbQuery(`
      SELECT 
        state,
        COUNT(*) as voucher_count,
        COALESCE(SUM(expenditure_amount), 0) as total_spent,
        COUNT(DISTINCT vendor_name) as vendor_count
      FROM expenditures
      WHERE state IS NOT NULL AND state != ''
      GROUP BY state
    `);

    const expMap = {};
    expByState.forEach(e => {
      expMap[e.state.toLowerCase()] = e;
    });

    // Merge linked expenditure into states
    const enrichedStates = stateAgg.map(s => {
      const exp = expMap[s.state.toLowerCase()] || {};
      return {
        ...s,
        avg_hybrid_risk_score: s.avg_hybrid_risk_score ? Math.round(s.avg_hybrid_risk_score * 10) / 10 : 0,
        linked_expenditure_amount: exp.total_spent || 0,
        linked_voucher_count: exp.voucher_count || 0,
        linked_vendor_count: exp.vendor_count || 0
      };
    });

    // 3. National totals
    const nationalTotalWorks = enrichedStates.reduce((acc, s) => acc + s.total_projects, 0);
    const nationalTotalAlloc = enrichedStates.reduce((acc, s) => acc + s.total_allocation_amount, 0);
    const nationalTotalCritical = enrichedStates.reduce((acc, s) => acc + s.critical_count, 0);
    const nationalTotalHigh = enrichedStates.reduce((acc, s) => acc + s.high_count, 0);

    res.json({
      disclaimer: DISCLAIMER,
      national_summary: {
        total_states: enrichedStates.length,
        total_works: nationalTotalWorks,
        total_allocation: nationalTotalAlloc,
        critical_flags: nationalTotalCritical,
        high_flags: nationalTotalHigh
      },
      states: enrichedStates
    });
  } catch (err) {
    console.error('Error in /api/gis/map-data:', err);
    res.status(500).json({ error: 'Failed to retrieve geospatial data', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/gis/clusters
// Real recorded administrative jurisdiction clusters (Block & Village level)
// ---------------------------------------------------------------------------
router.get('/clusters', async (req, res) => {
  try {
    const { state, constituency, risk_level, min_count = 3, limit = 50 } = req.query;

    let whereClauses = [
      "w.block IS NOT NULL AND w.block != 'Unknown' AND w.block != ''",
      "w.village IS NOT NULL AND w.village != 'Unknown' AND w.village != ''"
    ];
    let params = [];

    if (state) {
      whereClauses.push("w.state = ?");
      params.push(state.trim());
    }

    if (constituency) {
      whereClauses.push("w.constituency = ?");
      params.push(constituency.trim());
    }

    if (risk_level && risk_level !== 'ALL') {
      whereClauses.push("w.hybrid_risk_level = ?");
      params.push(risk_level.trim());
    }

    const whereStr = whereClauses.join(' AND ');

    const sql = `
      SELECT 
        w.state,
        w.constituency,
        w.block,
        w.village,
        COUNT(*) as project_count,
        COALESCE(SUM(w.allocation_amount), 0) as total_allocation,
        AVG(w.hybrid_risk_score) as avg_risk_score,
        SUM(CASE WHEN w.hybrid_risk_level = 'Critical' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN w.hybrid_risk_level = 'High' THEN 1 ELSE 0 END) as high_count,
        GROUP_CONCAT(DISTINCT w.mp_name) as mps,
        GROUP_CONCAT(DISTINCT w.category) as categories
      FROM works w
      WHERE ${whereStr}
      GROUP BY w.state, w.constituency, w.block, w.village
      HAVING project_count >= ?
      ORDER BY critical_count DESC, high_count DESC, project_count DESC
      LIMIT ?
    `;

    params.push(parseInt(min_count) || 2, parseInt(limit) || 50);

    const clusters = await dbQuery(sql, params);

    const formatted = clusters.map(c => ({
      state: c.state,
      constituency: c.constituency,
      block: c.block,
      village: c.village,
      project_count: c.project_count,
      total_allocation: c.total_allocation,
      avg_risk_score: c.avg_risk_score ? Math.round(c.avg_risk_score * 10) / 10 : 0,
      critical_count: c.critical_count,
      high_count: c.high_count,
      mps: c.mps ? c.mps.split(',').slice(0, 2).join(', ') : '',
      categories: c.categories ? c.categories.split(',').slice(0, 3).join(', ') : ''
    }));

    res.json({
      disclaimer: DISCLAIMER,
      total_clusters: formatted.length,
      clusters: formatted
    });
  } catch (err) {
    console.error('Error in /api/gis/clusters:', err);
    res.status(500).json({ error: 'Failed to retrieve spatial clusters', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/gis/filter
// Multi-tier filtered spatial works & linked vendors
// ---------------------------------------------------------------------------
router.get('/filter', async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    if (limit > 100) limit = 100;
    const offset = (page - 1) * limit;

    const { state, constituency, risk_level, status, vendor, search } = req.query;

    let whereClauses = [];
    let params = [];
    let joinVendor = false;

    if (state) {
      whereClauses.push("w.state = ?");
      params.push(state.trim());
    }

    if (constituency) {
      whereClauses.push("w.constituency = ?");
      params.push(constituency.trim());
    }

    if (risk_level && risk_level !== 'ALL') {
      whereClauses.push("w.hybrid_risk_level = ?");
      params.push(risk_level.trim());
    }

    if (status && status !== 'ALL') {
      whereClauses.push("w.status = ?");
      params.push(status.trim());
    }

    if (vendor && vendor.trim()) {
      joinVendor = true;
      whereClauses.push("e.vendor_name LIKE ?");
      params.push(`%${vendor.trim()}%`);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClauses.push("(w.work LIKE ? OR w.mp_name LIKE ? OR w.block LIKE ? OR w.village LIKE ? OR w.project_id LIKE ?)");
      params.push(q, q, q, q, q);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const fromStr = joinVendor 
      ? `FROM works w JOIN match_metadata mm ON w.project_id = mm.project_id JOIN expenditures e ON mm.expenditure_id = e.expenditure_id`
      : `FROM works w`;

    const countRow = await dbGet(`SELECT COUNT(DISTINCT w.project_id) as total, COALESCE(SUM(w.allocation_amount), 0) as total_alloc ${fromStr} ${whereStr}`, params);

    const dataSql = `
      SELECT DISTINCT
        w.project_id,
        w.work,
        w.category,
        w.state,
        w.constituency,
        w.block,
        w.village,
        w.allocation_amount,
        w.status,
        w.mp_name,
        w.hybrid_risk_score,
        w.hybrid_risk_level,
        w.rule_risk_score,
        w.ml_anomaly_score,
        w.recommended_action
      ${fromStr}
      ${whereStr}
      ORDER BY w.hybrid_risk_score DESC, w.allocation_amount DESC
      LIMIT ? OFFSET ?
    `;

    const projects = await dbQuery(dataSql, [...params, limit, offset]);

    res.json({
      disclaimer: DISCLAIMER,
      pagination: {
        total: countRow ? countRow.total : 0,
        total_allocation: countRow ? countRow.total_alloc : 0,
        page,
        limit,
        total_pages: countRow ? Math.ceil(countRow.total / limit) : 0
      },
      data: projects
    });
  } catch (err) {
    console.error('Error in /api/gis/filter:', err);
    res.status(500).json({ error: 'Failed to filter geospatial works', message: err.message });
  }
});

module.exports = router;
