const express = require('express');
const router = express.Router();
const { dbGet, dbQuery } = require('../db/database');

const DISCLAIMER = "Financial intelligence and expenditure vouchers are derived from Dataful Dataset 22565 (18th Lok Sabha MPLADS). High-confidence matches are programmatically linked for analytical and audit prioritization. Scores and match statuses do not constitute proof of irregularity.";

// ---------------------------------------------------------------------------
// GET /api/expenditures/analytics
// High-level national expenditure KPI aggregations and breakdowns
// ---------------------------------------------------------------------------
router.get('/analytics', async (req, res) => {
  try {
    // Overall totals
    const overview = await dbGet(`
      SELECT 
        COUNT(*) as total_vouchers,
        COALESCE(SUM(expenditure_amount), 0) as total_expenditure,
        COUNT(DISTINCT vendor_name) as total_vendors,
        COUNT(DISTINCT implementing_agency_name) as total_agencies,
        COUNT(DISTINCT loksabha_MP_name) as total_mps,
        COUNT(DISTINCT state) as total_states
      FROM expenditures
    `);

    // Payment status breakdown
    const paymentBreakdown = await dbQuery(`
      SELECT 
        payment_status,
        COUNT(*) as count,
        COALESCE(SUM(expenditure_amount), 0) as total_amount
      FROM expenditures
      GROUP BY payment_status
      ORDER BY count DESC
    `);

    // Matching summary from match_metadata
    const matchSummary = await dbQuery(`
      SELECT 
        match_confidence,
        match_status,
        COUNT(*) as count,
        COUNT(project_id) as linked_count
      FROM match_metadata
      GROUP BY match_confidence, match_status
    `);

    // Top 10 States by Expenditure
    const topStates = await dbQuery(`
      SELECT 
        state,
        COUNT(*) as voucher_count,
        COALESCE(SUM(expenditure_amount), 0) as total_spent,
        COUNT(DISTINCT vendor_name) as vendor_count,
        COUNT(DISTINCT loksabha_MP_name) as mp_count
      FROM expenditures
      GROUP BY state
      ORDER BY total_spent DESC
      LIMIT 10
    `);

    // Top 10 Vendors by Total Spend
    const topVendors = await dbQuery(`
      SELECT 
        vendor_name,
        COUNT(*) as voucher_count,
        COALESCE(SUM(expenditure_amount), 0) as total_spent,
        COUNT(DISTINCT loksabha_MP_name) as mp_count,
        COUNT(DISTINCT state) as state_count
      FROM expenditures
      WHERE vendor_name IS NOT NULL AND vendor_name != ''
      GROUP BY vendor_name
      ORDER BY total_spent DESC
      LIMIT 10
    `);

    // Payment In-Progress exposure
    const inProgressRow = paymentBreakdown.find(p => p.payment_status && p.payment_status.toLowerCase().includes('in-progress'));
    const inProgressAmount = inProgressRow ? inProgressRow.total_amount : 0;
    const inProgressCount = inProgressRow ? inProgressRow.count : 0;

    // Linked project expenditure summary
    const linkedSummary = await dbGet(`
      SELECT 
        COUNT(DISTINCT mm.project_id) as unique_linked_projects,
        COUNT(e.expenditure_id) as linked_vouchers,
        COALESCE(SUM(e.expenditure_amount), 0) as linked_expenditure
      FROM match_metadata mm
      JOIN expenditures e ON mm.expenditure_id = e.expenditure_id
      WHERE mm.project_id IS NOT NULL
    `);

    // Monthly disbursement timeline trend
    const timeline = await dbQuery(`
      SELECT 
        SUBSTR(expenditure_date, 7, 4) || '-' || SUBSTR(expenditure_date, 4, 2) as month,
        COUNT(*) as voucher_count,
        COALESCE(SUM(expenditure_amount), 0) as total_spent
      FROM expenditures
      WHERE expenditure_date IS NOT NULL AND LENGTH(expenditure_date) = 10
      GROUP BY month
      ORDER BY month ASC
      LIMIT 24
    `);

    // Format timeline to include amount alias
    const formattedTimeline = timeline.map(t => ({
      ...t,
      amount: t.total_spent
    }));

    res.json({
      disclaimer: DISCLAIMER,
      source: "Dataful Dataset 22565 — 18th Lok Sabha MPLADS",
      data: {
        total_vouchers: overview ? overview.total_vouchers : 0,
        total_expenditure: overview ? overview.total_expenditure : 0,
        total_vendors: overview ? overview.total_vendors : 0,
        total_agencies: overview ? overview.total_agencies : 0,
        total_mps: overview ? overview.total_mps : 0,
        total_states: overview ? overview.total_states : 0,
        payment_breakdown: paymentBreakdown,
        in_progress_amount: inProgressAmount,
        in_progress_count: inProgressCount,
        match_summary: matchSummary,
        linked_summary: linkedSummary,
        top_states: topStates,
        state_breakdown: topStates,
        top_vendors: topVendors,
        timeline: formattedTimeline,
        monthly_trend: formattedTimeline
      }
    });
  } catch (err) {
    console.error('Error in /api/expenditures/analytics:', err);
    res.status(500).json({ error: 'Failed to retrieve expenditure analytics', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/expenditures/vendors
// Vendor intelligence table with pagination, spend rankings, and concentration
// ---------------------------------------------------------------------------
router.get('/vendors', async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 25;
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;
    const offset = (page - 1) * limit;

    const { search, state, min_spend, sortBy = 'total_spent', sortOrder = 'DESC' } = req.query;

    let whereClauses = ["vendor_name IS NOT NULL AND vendor_name != ''"];
    let params = [];

    if (search) {
      whereClauses.push("vendor_name LIKE ?");
      params.push(`%${search.trim()}%`);
    }

    if (state) {
      whereClauses.push("state = ?");
      params.push(state.trim());
    }

    let havingClause = "";
    let havingParams = [];
    if (min_spend) {
      havingClause = "HAVING total_spent >= ?";
      havingParams.push(parseFloat(min_spend));
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total distinct vendors count
    const countSql = `
      SELECT COUNT(*) as total FROM (
        SELECT vendor_name, SUM(expenditure_amount) as total_spent
        FROM expenditures
        ${whereStr}
        GROUP BY vendor_name
        ${havingClause}
      )
    `;
    const countRow = await dbGet(countSql, [...params, ...havingParams]);

    // Sorting whitelist with aliases
    const sortAliases = {
      'transaction_count': 'voucher_count',
      'unique_mps': 'mp_count'
    };
    const mappedSort = sortAliases[sortBy] || sortBy;
    const allowedSort = ['total_spent', 'voucher_count', 'mp_count', 'state_count', 'vendor_name'];
    const safeSort = allowedSort.includes(mappedSort) ? mappedSort : 'total_spent';
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataSql = `
      SELECT 
        vendor_name,
        COUNT(*) as voucher_count,
        COALESCE(SUM(expenditure_amount), 0) as total_spent,
        COUNT(DISTINCT loksabha_MP_name) as mp_count,
        COUNT(DISTINCT state) as state_count,
        COUNT(DISTINCT implementing_agency_name) as agency_count,
        SUM(CASE WHEN payment_status LIKE '%In-Progress%' THEN 1 ELSE 0 END) as in_progress_vouchers,
        SUM(CASE WHEN payment_status LIKE '%In-Progress%' THEN expenditure_amount ELSE 0 END) as in_progress_amount,
        GROUP_CONCAT(DISTINCT state) as active_states
      FROM expenditures
      ${whereStr}
      GROUP BY vendor_name
      ${havingClause}
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT ? OFFSET ?
    `;

    const vendorRows = await dbQuery(dataSql, [...params, ...havingParams, limit, offset]);

    // Calculate vendor risk signal
    const enriched = vendorRows.map(v => {
      let riskSignal = 'LOW';
      let flags = [];

      // High spend single MP concentration
      if (v.total_spent > 5000000 && v.mp_count === 1) {
        riskSignal = 'HIGH';
        flags.push('Sole MP concentration with >₹50L spend');
      } else if (v.total_spent > 20000000 && v.mp_count <= 2) {
        riskSignal = 'HIGH';
        flags.push('Concentrated high-value vendor (>₹2 Cr across ≤2 MPs)');
      } else if (v.in_progress_vouchers > 5 && (v.in_progress_vouchers / v.voucher_count) > 0.4) {
        riskSignal = 'MEDIUM';
        flags.push('High pending disbursement ratio (>40% in-progress)');
      }

      return {
        ...v,
        transaction_count: v.voucher_count,
        unique_mps: v.mp_count,
        unique_districts: v.state_count,
        risk_signal: riskSignal,
        risk_flags: flags
      };
    });

    res.json({
      disclaimer: DISCLAIMER,
      pagination: {
        total: countRow ? countRow.total : 0,
        page,
        limit,
        total_pages: countRow ? Math.ceil(countRow.total / limit) : 0
      },
      data: enriched
    });
  } catch (err) {
    console.error('Error in /api/expenditures/vendors:', err);
    res.status(500).json({ error: 'Failed to retrieve vendor intelligence', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/expenditures/vendor/:vendor
// Specific vendor dossier: comprehensive history, MP connections, and vouchers
// ---------------------------------------------------------------------------
router.get('/vendor/:vendor', async (req, res) => {
  try {
    const vendorName = decodeURIComponent(req.params.vendor);

    // Vendor profile summary
    const summary = await dbGet(`
      SELECT 
        vendor_name,
        COUNT(*) as voucher_count,
        COALESCE(SUM(expenditure_amount), 0) as total_spent,
        COALESCE(AVG(expenditure_amount), 0) as avg_voucher_amount,
        COALESCE(MAX(expenditure_amount), 0) as max_voucher_amount,
        COUNT(DISTINCT loksabha_MP_name) as mp_count,
        COUNT(DISTINCT state) as state_count,
        COUNT(DISTINCT implementing_agency_name) as agency_count,
        MIN(expenditure_date) as first_recorded_date,
        MAX(expenditure_date) as latest_recorded_date
      FROM expenditures
      WHERE vendor_name = ?
    `, [vendorName]);

    if (!summary || !summary.vendor_name || summary.voucher_count === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // MPs engaged by this vendor
    const mpBreakdown = await dbQuery(`
      SELECT 
        loksabha_MP_name as mp_name,
        state,
        loksabha_constituency as constituency,
        COUNT(*) as vouchers_with_mp,
        COALESCE(SUM(expenditure_amount), 0) as spend_with_mp,
        ROUND((SUM(expenditure_amount) * 100.0 / ?), 2) as spend_percentage
      FROM expenditures
      WHERE vendor_name = ?
      GROUP BY loksabha_MP_name, state, loksabha_constituency
      ORDER BY spend_with_mp DESC
    `, [summary.total_spent || 1, vendorName]);

    // Payment status breakdown for vendor
    const paymentStatus = await dbQuery(`
      SELECT payment_status, COUNT(*) as count, SUM(expenditure_amount) as total_amount
      FROM expenditures
      WHERE vendor_name = ?
      GROUP BY payment_status
    `, [vendorName]);

    // Recent 50 transactions
    const recentVouchers = await dbQuery(`
      SELECT 
        e.*,
        mm.match_confidence,
        mm.match_status,
        mm.project_id
      FROM expenditures e
      LEFT JOIN match_metadata mm ON e.expenditure_id = mm.expenditure_id
      WHERE e.vendor_name = ?
      ORDER BY e.expenditure_date DESC, e.expenditure_amount DESC
      LIMIT 50
    `, [vendorName]);

    // Linked Projects for this vendor
    const linkedProjects = await dbQuery(`
      SELECT DISTINCT
        w.project_id,
        w.work,
        w.category,
        w.state,
        w.constituency,
        w.allocation_amount,
        w.status as project_status,
        w.hybrid_risk_score,
        w.hybrid_risk_level,
        w.mp_name,
        COUNT(e.expenditure_id) as voucher_count_with_project,
        SUM(e.expenditure_amount) as total_disbursed_to_project,
        mm.match_confidence
      FROM expenditures e
      JOIN match_metadata mm ON e.expenditure_id = mm.expenditure_id
      JOIN works w ON mm.project_id = w.project_id
      WHERE e.vendor_name = ?
      GROUP BY w.project_id
      ORDER BY total_disbursed_to_project DESC
    `, [vendorName]);

    // Top MP concentration metric
    const topMpShare = mpBreakdown.length > 0 ? mpBreakdown[0].spend_percentage : 0;
    let concentrationLevel = 'LOW';
    if (topMpShare > 80 && summary.total_spent > 1000000) {
      concentrationLevel = 'CRITICAL';
    } else if (topMpShare > 60) {
      concentrationLevel = 'HIGH';
    } else if (topMpShare > 40) {
      concentrationLevel = 'MEDIUM';
    }

    // Vendor Risk Indicators
    const riskIndicators = [];
    if (topMpShare > 80 && summary.total_spent > 1000000) {
      riskIndicators.push({ type: 'SOLE_MP_CONCENTRATION', severity: 'HIGH', message: `Sole MP Concentration: ${topMpShare}% of disbursements directed from ${mpBreakdown[0].mp_name}` });
    } else if (topMpShare > 60) {
      riskIndicators.push({ type: 'MP_CONCENTRATION', severity: 'MEDIUM', message: `High MP Concentration: ${topMpShare}% of disbursements directed from ${mpBreakdown[0].mp_name}` });
    }
    const inProgRow = paymentStatus.find(p => p.payment_status && p.payment_status.toLowerCase().includes('in-progress'));
    if (inProgRow && (inProgRow.count / summary.voucher_count) > 0.4) {
      riskIndicators.push({ type: 'HIGH_IN_PROGRESS_RATIO', severity: 'MEDIUM', message: `Disbursement Latency: ${inProgRow.count} vouchers (${Math.round((inProgRow.count / summary.voucher_count) * 100)}%) currently marked In-Progress` });
    }
    const highRiskProjectsLinked = linkedProjects.filter(p => p.hybrid_risk_level === 'Critical' || p.hybrid_risk_level === 'High');
    if (highRiskProjectsLinked.length > 0) {
      riskIndicators.push({ type: 'HIGH_RISK_WORK_ENGAGEMENT', severity: 'HIGH', message: `Engaged with ${highRiskProjectsLinked.length} Critical/High priority MPLADS works requiring administrative verification` });
    }

    res.json({
      disclaimer: DISCLAIMER,
      vendor_name: vendorName,
      summary: {
        ...summary,
        transaction_count: summary.voucher_count,
        unique_mps: summary.mp_count,
        unique_districts: summary.state_count,
        linked_projects_count: linkedProjects.length,
        top_mp_share_percentage: topMpShare,
        concentration_level: concentrationLevel
      },
      mps_served: mpBreakdown,
      payment_breakdown: paymentStatus,
      linked_projects: linkedProjects,
      risk_indicators: riskIndicators,
      recent_vouchers: recentVouchers,
      vouchers: recentVouchers
    });
  } catch (err) {
    console.error('Error in /api/expenditures/vendor/:vendor:', err);
    res.status(500).json({ error: 'Failed to retrieve vendor dossier', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/expenditures
// Paginated live search & filter across all 143,256 vouchers
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 25;
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;
    const offset = (page - 1) * limit;

    const {
      state, constituency, mp, district, vendor, payment_status,
      search, match_confidence, match_status, min_amount, max_amount,
      date_from, date_to, sortBy = 'expenditure_date', sortOrder = 'DESC'
    } = req.query;

    let whereClauses = [];
    let params = [];

    if (state) {
      whereClauses.push("e.state = ?");
      params.push(state.trim());
    }

    if (constituency) {
      whereClauses.push("e.loksabha_constituency LIKE ?");
      params.push(`%${constituency.trim()}%`);
    }

    if (mp) {
      whereClauses.push("e.loksabha_MP_name LIKE ?");
      params.push(`%${mp.trim()}%`);
    }

    if (district) {
      whereClauses.push("(e.implementing_district_per_source LIKE ? OR e.implementing_district_per_lgd LIKE ?)");
      params.push(`%${district.trim()}%`, `%${district.trim()}%`);
    }

    if (vendor) {
      whereClauses.push("e.vendor_name LIKE ?");
      params.push(`%${vendor.trim()}%`);
    }

    if (payment_status) {
      whereClauses.push("e.payment_status = ?");
      params.push(payment_status.trim());
    }

    if (search) {
      whereClauses.push("(e.work LIKE ? OR e.vendor_name LIKE ? OR e.implementing_agency_name LIKE ? OR e.loksabha_MP_name LIKE ?)");
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (match_confidence) {
      whereClauses.push("mm.match_confidence = ?");
      params.push(match_confidence.trim());
    }

    if (match_status) {
      whereClauses.push("mm.match_status = ?");
      params.push(match_status.trim());
    }

    if (min_amount) {
      whereClauses.push("e.expenditure_amount >= ?");
      params.push(parseFloat(min_amount));
    }

    if (max_amount) {
      whereClauses.push("e.expenditure_amount <= ?");
      params.push(parseFloat(max_amount));
    }

    if (date_from) {
      whereClauses.push("e.expenditure_date >= ?");
      params.push(date_from.trim());
    }

    if (date_to) {
      whereClauses.push("e.expenditure_date <= ?");
      params.push(date_to.trim());
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count & total spent query
    const countSql = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(e.expenditure_amount), 0) as filtered_total_spent
      FROM expenditures e
      LEFT JOIN match_metadata mm ON e.expenditure_id = mm.expenditure_id
      ${whereStr}
    `;
    const countRow = await dbGet(countSql, params);

    // Whitelist sort fields
    const allowedSort = ['expenditure_date', 'expenditure_amount', 'loksabha_MP_name', 'state', 'vendor_name', 'similarity_score'];
    const safeSort = allowedSort.includes(sortBy) ? (sortBy === 'similarity_score' ? 'mm.similarity_score' : `e.${sortBy}`) : 'e.expenditure_date';
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataSql = `
      SELECT 
        e.*,
        mm.match_id,
        mm.match_confidence,
        mm.match_method,
        mm.similarity_score,
        mm.match_status,
        mm.project_id,
        mm.review_notes,
        w.work as linked_work_title,
        w.allocation_amount as linked_allocation_amount,
        w.hybrid_risk_score as linked_hybrid_score,
        w.hybrid_risk_level as linked_hybrid_level
      FROM expenditures e
      LEFT JOIN match_metadata mm ON e.expenditure_id = mm.expenditure_id
      LEFT JOIN works w ON mm.project_id = w.project_id
      ${whereStr}
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT ? OFFSET ?
    `;

    const records = await dbQuery(dataSql, [...params, limit, offset]);

    res.json({
      disclaimer: DISCLAIMER,
      pagination: {
        total: countRow ? countRow.total : 0,
        filtered_total_spent: countRow ? countRow.filtered_total_spent : 0,
        page,
        limit,
        total_pages: countRow ? Math.ceil(countRow.total / limit) : 0
      },
      data: records
    });
  } catch (err) {
    console.error('Error in /api/expenditures:', err);
    res.status(500).json({ error: 'Failed to retrieve expenditure vouchers', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/expenditures/:id
// Detailed single voucher view with linked project info
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const expId = req.params.id;

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
        mm.review_notes,
        mm.candidate_project_ids,
        w.project_id as linked_project_id,
        w.work as linked_work_title,
        w.category as linked_category,
        w.allocation_amount as linked_allocation_amount,
        w.hybrid_risk_score as linked_hybrid_score,
        w.hybrid_risk_level as linked_hybrid_level,
        w.rule_risk_score as linked_rule_score,
        w.ml_anomaly_score as linked_ml_score,
        w.rule_risk_reasons as linked_rule_reasons
      FROM expenditures e
      LEFT JOIN match_metadata mm ON e.expenditure_id = mm.expenditure_id
      LEFT JOIN works w ON mm.project_id = w.project_id
      WHERE e.expenditure_id = ?
    `;

    const record = await dbGet(sql, [expId]);
    if (!record) {
      return res.status(404).json({ error: 'Expenditure voucher not found' });
    }

    res.json({
      disclaimer: DISCLAIMER,
      data: record
    });
  } catch (err) {
    console.error('Error in /api/expenditures/:id:', err);
    res.status(500).json({ error: 'Failed to retrieve voucher details', message: err.message });
  }
});

module.exports = router;
