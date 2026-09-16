const express = require('express');
const router = express.Router();
const { dbGet, dbQuery } = require('../db/database');

const DISCLAIMER = "Risk scores indicate potential statistical and administrative anomalies to prioritize works for human verification. They are not proof of fraud, corruption, or wrongdoing.";

// Helper to escape CSV values
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

// ---------------------------------------------------------------------------
// GET /api/reports/export/:type
// Direct streaming CSV download endpoint with UTF-8 BOM for Excel compatibility
// ---------------------------------------------------------------------------
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 500;
    const today = new Date().toISOString().slice(0, 10);

    let filename = `MPLADS_Report_${today}.csv`;
    let headers = [];
    let rows = [];

    if (type === 'projects' || type === 'risk') {
      filename = `MPLADS_Project_Risk_Report_${today}.csv`;
      headers = [
        'Project_ID',
        'MP_Name',
        'Work_Description',
        'Category',
        'State',
        'Constituency',
        'Block',
        'Village',
        'Allocation_Amount_INR',
        'Status',
        'Rule_Risk_Score',
        'ML_Anomaly_Score',
        'Hybrid_Risk_Score',
        'Hybrid_Risk_Level',
        'Hybrid_Risk_Reasons',
        'Recommended_Action'
      ];

      const data = await dbQuery(`
        SELECT project_id, mp_name, work, category, state, constituency, block, village,
               allocation_amount, status, rule_risk_score, ml_anomaly_score,
               hybrid_risk_score, hybrid_risk_level, hybrid_risk_reasons, recommended_action
        FROM works
        ORDER BY hybrid_risk_score DESC, allocation_amount DESC
        LIMIT ?
      `, [limit]);

      rows = data.map(r => [
        escapeCsv(r.project_id),
        escapeCsv(r.mp_name),
        escapeCsv(r.work),
        escapeCsv(r.category),
        escapeCsv(r.state),
        escapeCsv(r.constituency),
        escapeCsv(r.block),
        escapeCsv(r.village),
        r.allocation_amount || 0,
        escapeCsv(r.status),
        r.rule_risk_score || 0,
        r.ml_anomaly_score || 0,
        r.hybrid_risk_score || 0,
        escapeCsv(r.hybrid_risk_level),
        escapeCsv(r.hybrid_risk_reasons),
        escapeCsv(r.recommended_action)
      ]);

    } else if (type === 'financial' || type === 'expenditures') {
      filename = `MPLADS_Financial_Intelligence_Report_${today}.csv`;
      headers = [
        'Expenditure_ID',
        'Date',
        'Work_Title',
        'Expenditure_Amount_INR',
        'Vendor_Name',
        'Implementing_Agency',
        'State',
        'Constituency',
        'MP_Name',
        'Payment_Status',
        'Match_Confidence',
        'Source_Dataset'
      ];

      const data = await dbQuery(`
        SELECT e.expenditure_id, e.expenditure_date, e.work, e.expenditure_amount,
               e.vendor_name, e.implementing_agency_name, e.state, e.loksabha_constituency,
               e.loksabha_MP_name, e.payment_status, e.source_dataset,
               mm.match_confidence
        FROM expenditures e
        LEFT JOIN match_metadata mm ON e.expenditure_id = mm.expenditure_id
        ORDER BY e.expenditure_amount DESC
        LIMIT ?
      `, [limit]);

      rows = data.map(r => [
        escapeCsv(r.expenditure_id),
        escapeCsv(r.expenditure_date),
        escapeCsv(r.work),
        r.expenditure_amount || 0,
        escapeCsv(r.vendor_name),
        escapeCsv(r.implementing_agency_name),
        escapeCsv(r.state),
        escapeCsv(r.loksabha_constituency),
        escapeCsv(r.loksabha_MP_name),
        escapeCsv(r.payment_status),
        escapeCsv(r.match_confidence || 'UNLINKED'),
        escapeCsv(r.source_dataset)
      ]);

    } else if (type === 'vendors') {
      filename = `MPLADS_Vendor_Intelligence_Report_${today}.csv`;
      headers = [
        'Vendor_Name',
        'Total_Spent_INR',
        'Voucher_Count',
        'MP_Count',
        'State_Count',
        'Agency_Count',
        'Active_States',
        'Risk_Signal'
      ];

      const data = await dbQuery(`
        SELECT vendor_name,
               COUNT(*) as voucher_count,
               COALESCE(SUM(expenditure_amount), 0) as total_spent,
               COUNT(DISTINCT loksabha_MP_name) as mp_count,
               COUNT(DISTINCT state) as state_count,
               COUNT(DISTINCT implementing_agency_name) as agency_count,
               GROUP_CONCAT(DISTINCT state) as active_states
        FROM expenditures
        WHERE vendor_name IS NOT NULL AND vendor_name != ''
        GROUP BY vendor_name
        ORDER BY total_spent DESC
        LIMIT ?
      `, [limit]);

      rows = data.map(v => {
        let riskSignal = 'LOW';
        if (v.total_spent > 5000000 && v.mp_count === 1) riskSignal = 'HIGH';
        else if (v.total_spent > 20000000 && v.mp_count <= 2) riskSignal = 'HIGH';

        return [
          escapeCsv(v.vendor_name),
          v.total_spent || 0,
          v.voucher_count || 0,
          v.mp_count || 0,
          v.state_count || 0,
          v.agency_count || 0,
          escapeCsv(v.active_states),
          escapeCsv(riskSignal)
        ];
      });

    } else if (type === 'investigations' || type === 'audit') {
      filename = `MPLADS_Investigation_Report_${today}.csv`;
      headers = [
        'Investigation_ID',
        'Project_ID',
        'Work_Description',
        'MP_Name',
        'State',
        'Constituency',
        'Allocation_Amount_INR',
        'Investigation_Status',
        'Investigation_Priority',
        'Hybrid_Risk_Score',
        'Hybrid_Risk_Level',
        'Officer_Notes',
        'Created_At',
        'Updated_At'
      ];

      const data = await dbQuery(`
        SELECT i.investigation_id, i.project_id, i.status as investigation_status,
               i.priority as investigation_priority, i.officer_notes, i.created_at, i.updated_at,
               w.work, w.mp_name, w.state, w.constituency, w.allocation_amount,
               w.hybrid_risk_score, w.hybrid_risk_level
        FROM investigations i
        JOIN works w ON i.project_id = w.project_id
        ORDER BY w.hybrid_risk_score DESC, i.updated_at DESC
        LIMIT ?
      `, [limit]);

      rows = data.map(r => [
        escapeCsv(r.investigation_id),
        escapeCsv(r.project_id),
        escapeCsv(r.work),
        escapeCsv(r.mp_name),
        escapeCsv(r.state),
        escapeCsv(r.constituency),
        r.allocation_amount || 0,
        escapeCsv(r.investigation_status),
        escapeCsv(r.investigation_priority),
        r.hybrid_risk_score || 0,
        escapeCsv(r.hybrid_risk_level),
        escapeCsv(r.officer_notes),
        escapeCsv(r.created_at),
        escapeCsv(r.updated_at)
      ]);

    } else if (type === 'similar-works' || type === 'similar') {
      filename = `MPLADS_Similar_Works_Report_${today}.csv`;
      headers = [
        'Pair_ID',
        'Project_A_ID',
        'Project_B_ID',
        'Similarity_Score',
        'Similarity_Reasons',
        'State',
        'Constituency',
        'Location_Block',
        'Location_Village',
        'MP_Name',
        'Allocation_A_INR',
        'Allocation_B_INR',
        'Verification_Status',
        'Officer_Notes',
        'Created_At'
      ];

      const data = await dbQuery(`
        SELECT id, project_a_id, project_b_id, similarity_score, similarity_reasons,
               state, constituency, location_block, location_village, mp_name,
               allocation_a, allocation_b, status, officer_notes, created_at
        FROM similar_works
        ORDER BY similarity_score DESC
        LIMIT ?
      `, [limit]);

      rows = data.map(s => [
        s.id,
        escapeCsv(s.project_a_id),
        escapeCsv(s.project_b_id),
        s.similarity_score || 0,
        escapeCsv(s.similarity_reasons),
        escapeCsv(s.state),
        escapeCsv(s.constituency),
        escapeCsv(s.location_block || 'N/A'),
        escapeCsv(s.location_village || 'N/A'),
        escapeCsv(s.mp_name),
        s.allocation_a || 0,
        s.allocation_b || 0,
        escapeCsv(s.status),
        escapeCsv(s.officer_notes),
        escapeCsv(s.created_at)
      ]);

    } else {
      return res.status(400).json({ error: `Unknown report type: ${type}` });
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.send(csvContent);

  } catch (err) {
    console.error('Error generating CSV export:', err);
    res.status(500).json({ error: 'Failed to generate CSV export', message: err.message });
  }
});

module.exports = router;
