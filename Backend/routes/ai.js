const express = require('express');
const router = express.Router();
const { dbGet } = require('../db/database');

const DISCLAIMER = "AI-generated explanation is decision support only. Human verification is required.";

// POST /api/ai/explain
router.post('/explain', async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const sql = `
      SELECT w.*, i.status as investigation_status, i.officer_notes
      FROM works w
      LEFT JOIN investigations i ON w.project_id = i.project_id
      WHERE w.project_id = ?
    `;

    const project = await dbGet(sql, [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const amountLakhs = (project.allocation_amount / 100000).toFixed(2);

    // Fetch benchmark metrics for this category
    const catStats = await dbGet(`
      SELECT AVG(allocation_amount) as avg_amount, COUNT(*) as total_in_cat
      FROM works
      WHERE category = ?
    `, [project.category]);

    const catAvg = catStats && catStats.avg_amount ? catStats.avg_amount : (project.allocation_amount || 1);
    const amountVsMedian = project.allocation_amount > 0 && catAvg > 0
      ? Math.round((project.allocation_amount / catAvg) * 10) / 10
      : 1.0;

    const lowerCountRow = await dbGet(`
      SELECT COUNT(*) as lower_count
      FROM works
      WHERE category = ? AND allocation_amount < ?
    `, [project.category, project.allocation_amount]);

    const catTotal = catStats && catStats.total_in_cat ? catStats.total_in_cat : 1;
    const lowerCount = lowerCountRow ? lowerCountRow.lower_count : 0;
    const amountPercentile = Math.round((lowerCount / catTotal) * 100);

    // Use correct DB column names: rule_risk_reasons (not risk_reasons), rule_risk_level (not risk_level)
    const ruleIndicators = project.rule_risk_reasons ? project.rule_risk_reasons.split(' | ') : [];
    
    // IsolationForest semantics: -1 = anomaly, +1 = normal (scikit-learn convention)
    const evidencePoints = [
      `Allocation Amount: ₹${amountLakhs} Lakhs (${amountVsMedian}x category average, ${amountPercentile}th percentile)`,
      `Rule Risk Score: ${project.rule_risk_score || 0}/100 (${project.rule_risk_level || 'Low'})`,
      `ML Anomaly Score: ${project.ml_anomaly_score || 0} (${project.ml_anomaly_flag === -1 ? 'Anomalous multivariate pattern detected by Isolation Forest' : 'Normal pattern'})`,
      `Constituency: ${project.mp_name || 'MP'} at ${project.block !== 'Unknown' ? project.block : project.constituency}`
    ];

    const recommendedSteps = [
      '1. Verify recommendation letter and administrative approval records.',
      '2. Cross-check financial allocation against implementing agency estimates.',
      '3. Conduct physical site inspection via District Nodal Officer to confirm work progress.'
    ];

    const explanation = {
      project_id: project.project_id,
      work: project.work,
      mp_name: project.mp_name,
      state: project.state,
      constituency: project.constituency,
      category: project.category,
      allocation_amount: project.allocation_amount,
      hybrid_risk_score: project.hybrid_risk_score,
      hybrid_risk_level: project.hybrid_risk_level,
      rule_risk_score: project.rule_risk_score,
      rule_risk_level: project.rule_risk_level,
      ml_anomaly_score: project.ml_anomaly_score,
      ml_anomaly_flag: project.ml_anomaly_flag,
      risk_summary: `Work #${project.project_id} in ${project.constituency}, ${project.state} has a Hybrid Priority Risk Score of ${project.hybrid_risk_score}/100 (${project.hybrid_risk_level} Priority). This score combines a Rule-based risk score of ${project.rule_risk_score}/100 (60% weight) and an ML Anomaly score of ${project.ml_anomaly_score} (40% weight).`,
      reason_for_flag: project.hybrid_risk_reasons || 'Financial and administrative indicators flagged for verification.',
      rule_indicators: ruleIndicators,
      ml_indicators: [
        `Isolation Forest Multivariate Score: ${project.ml_anomaly_score}`,
        `Feature space anomaly classification: ${project.ml_anomaly_flag === -1 ? 'Anomalous (Flagged by Isolation Forest)' : 'Normal (Inlier)'}`
      ],
      evidence_points: evidencePoints,
      numerical_evidence: {
        allocation_amount: project.allocation_amount,
        rule_risk_score: project.rule_risk_score,
        ml_anomaly_score: project.ml_anomaly_score,
        hybrid_risk_score: project.hybrid_risk_score,
        amount_vs_work_median: amountVsMedian,
        amount_percentile: amountPercentile
      },
      why_it_matters: `The project allocation (₹${amountLakhs} Lakhs) has been flagged by the hybrid risk engine combining rule-based criteria and unsupervised ML anomaly detection for the ${project.category} category, requiring verification before final fund disbursement.`,
      recommended_verification: recommendedSteps,
      disclaimer: DISCLAIMER,
      limitations: "Risk scores indicate statistical unusualness and administrative criteria. They are not proof of fraud, corruption, or wrongdoing. Human administrative verification is required."
    };

    // Attach demo discrepancy scenario if exists
    const demoVerif = await dbGet('SELECT * FROM project_verifications WHERE project_id = ? AND is_demo = 1', [project.project_id]);
    if (demoVerif) {
      explanation.demo_discrepancy = {
        is_demo: true,
        discrepancy_score: demoVerif.discrepancy_score,
        progress_diff_pct: demoVerif.progress_diff_pct,
        expenditure_diff: demoVerif.expenditure_diff,
        completion_mismatch: demoVerif.completion_mismatch === 1,
        vendor_progress_pct: demoVerif.vendor_progress_pct,
        field_progress_pct: demoVerif.field_progress_pct,
        vendor_expenditure: demoVerif.vendor_expenditure,
        field_expenditure: demoVerif.field_expenditure,
        discrepancy_reasons: JSON.parse(demoVerif.discrepancy_reasons || '[]'),
        ai_demo_explanation: demoVerif.ai_demo_explanation
      };
      explanation.evidence_points.push(`Field Verification Discrepancy (Demo): ${demoVerif.discrepancy_score} priority variance (${demoVerif.progress_diff_pct}% progress diff)`);
    }

    res.json({
      disclaimer: DISCLAIMER,
      project_id: project.project_id,
      explanation
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
