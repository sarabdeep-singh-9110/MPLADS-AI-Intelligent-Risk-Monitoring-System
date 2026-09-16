const express = require('express');
const router = express.Router();
const { dbGet, dbQuery } = require('../db/database');

const DISCLAIMER = "Risk scores indicate potential statistical and administrative anomalies to prioritize works for human verification. They are not proof of fraud, corruption, or wrongdoing.";

router.get('/national', async (req, res) => {
  try {
    const summaryRow = await dbGet(`
      SELECT COUNT(*) as total_projects,
             SUM(allocation_amount) as total_allocation_amount,
             AVG(hybrid_risk_score) as avg_hybrid_risk,
             AVG(ml_anomaly_score) as avg_ml_anomaly,
             AVG(rule_risk_score) as avg_rule_risk,
             COUNT(DISTINCT state) as total_states
      FROM works
    `);

    const riskLevels = await dbQuery('SELECT hybrid_risk_level, COUNT(*) as count FROM works GROUP BY hybrid_risk_level');
    const riskMap = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    riskLevels.forEach(r => { riskMap[r.hybrid_risk_level] = r.count; });

    const topStates = await dbQuery(`
      SELECT state, COUNT(*) as total_works,
             SUM(CASE WHEN hybrid_risk_level IN ('Critical', 'High') THEN 1 ELSE 0 END) as high_risk_count,
             AVG(hybrid_risk_score) as avg_hybrid_score,
             SUM(allocation_amount) as total_allocation_amount
      FROM works
      WHERE state IS NOT NULL AND state != 'Unknown'
      GROUP BY state
      ORDER BY high_risk_count DESC, avg_hybrid_score DESC
      LIMIT 10
    `);

    const categoryBreakdown = await dbQuery(`
      SELECT category, COUNT(*) as count, AVG(hybrid_risk_score) as avg_hybrid_risk, SUM(allocation_amount) as total_allocation_amount
      FROM works
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      disclaimer: DISCLAIMER,
      data: {
        total_projects: summaryRow.total_projects || 0,
        critical_count: riskMap.Critical || 0,
        high_count: riskMap.High || 0,
        medium_count: riskMap.Medium || 0,
        low_count: riskMap.Low || 0,
        total_allocation_amount: summaryRow.total_allocation_amount || 0,
        average_hybrid_risk: summaryRow.avg_hybrid_risk ? Math.round(summaryRow.avg_hybrid_risk * 100) / 100 : 0,
        average_ml_anomaly_score: summaryRow.avg_ml_anomaly ? Math.round(summaryRow.avg_ml_anomaly * 100) / 100 : 0,
        average_rule_risk_score: summaryRow.avg_rule_risk ? Math.round(summaryRow.avg_rule_risk * 100) / 100 : 0,
        total_states: summaryRow.total_states || 0,
        risk_levels: riskMap,
        top_states: topStates,
        category_breakdown: categoryBreakdown
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/state?state=... (State Authority Persona)
router.get('/state', async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) {
      return res.status(400).json({ error: 'Query parameter "state" is required' });
    }

    const summaryRow = await dbGet(`
      SELECT COUNT(*) as total_projects,
             SUM(allocation_amount) as total_allocation_amount,
             AVG(hybrid_risk_score) as avg_hybrid_risk,
             AVG(ml_anomaly_score) as avg_ml_anomaly,
             AVG(rule_risk_score) as avg_rule_risk,
             COUNT(DISTINCT constituency) as total_constituencies
      FROM works
      WHERE state = ?
    `, [state]);

    const riskLevels = await dbQuery(
      'SELECT hybrid_risk_level, COUNT(*) as count FROM works WHERE state = ? GROUP BY hybrid_risk_level',
      [state]
    );
    const riskMap = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    riskLevels.forEach(r => { riskMap[r.hybrid_risk_level] = r.count; });

    const topConstituencies = await dbQuery(`
      SELECT constituency, COUNT(*) as total_works,
             SUM(CASE WHEN hybrid_risk_level IN ('Critical', 'High') THEN 1 ELSE 0 END) as high_risk_count,
             AVG(hybrid_risk_score) as avg_hybrid_score,
             SUM(allocation_amount) as total_allocation_amount
      FROM works
      WHERE state = ? AND constituency IS NOT NULL AND constituency != ''
      GROUP BY constituency
      ORDER BY high_risk_count DESC, avg_hybrid_score DESC
      LIMIT 10
    `, [state]);

    const categoryBreakdown = await dbQuery(`
      SELECT category, COUNT(*) as count, AVG(hybrid_risk_score) as avg_hybrid_risk, SUM(allocation_amount) as total_allocation_amount
      FROM works
      WHERE state = ?
      GROUP BY category
      ORDER BY count DESC
    `, [state]);

    res.json({
      disclaimer: DISCLAIMER,
      state,
      data: {
        total_projects: summaryRow.total_projects || 0,
        critical_count: riskMap.Critical || 0,
        high_count: riskMap.High || 0,
        medium_count: riskMap.Medium || 0,
        low_count: riskMap.Low || 0,
        total_allocation_amount: summaryRow.total_allocation_amount || 0,
        average_hybrid_risk: summaryRow.avg_hybrid_risk ? Math.round(summaryRow.avg_hybrid_risk * 100) / 100 : 0,
        average_ml_anomaly_score: summaryRow.avg_ml_anomaly ? Math.round(summaryRow.avg_ml_anomaly * 100) / 100 : 0,
        average_rule_risk_score: summaryRow.avg_rule_risk ? Math.round(summaryRow.avg_rule_risk * 100) / 100 : 0,
        total_constituencies: summaryRow.total_constituencies || 0,
        risk_levels: riskMap,
        top_constituencies: topConstituencies,
        category_breakdown: categoryBreakdown
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/audit (CAG / Field Auditor Persona)
router.get('/audit', async (req, res) => {
  try {
    const summaryRow = await dbGet(`
      SELECT COUNT(*) as total_works,
             SUM(CASE WHEN ml_anomaly_flag = -1 THEN 1 ELSE 0 END) as total_anomalies,
             SUM(CASE WHEN hybrid_risk_level = 'Critical' THEN 1 ELSE 0 END) as critical_count,
             SUM(CASE WHEN hybrid_risk_level = 'High' THEN 1 ELSE 0 END) as high_count,
             SUM(CASE WHEN hybrid_risk_level IN ('Critical', 'High') THEN allocation_amount ELSE 0 END) as high_risk_allocation,
             SUM(allocation_amount) as total_allocation,
             AVG(ml_anomaly_score) as avg_anomaly_score,
             AVG(rule_risk_score) as avg_rule_score
      FROM works
    `);

    // Top Critical Works requiring immediate audit
    const priorityAudits = await dbQuery(`
      SELECT project_id, mp_name, work, state, constituency, allocation_amount,
             rule_risk_score, ml_anomaly_score, hybrid_risk_score, hybrid_risk_level, hybrid_risk_reasons
      FROM works
      WHERE hybrid_risk_level IN ('Critical', 'High')
      ORDER BY hybrid_risk_score DESC, allocation_amount DESC
      LIMIT 10
    `);

    // Top Cost Outliers
    const costOutliers = await dbQuery(`
      SELECT project_id, mp_name, work, state, allocation_amount, hybrid_risk_score
      FROM works
      ORDER BY allocation_amount DESC
      LIMIT 5
    `);

    // Audit State Leaderboard
    const auditByState = await dbQuery(`
      SELECT state,
             SUM(CASE WHEN hybrid_risk_level IN ('Critical', 'High') THEN 1 ELSE 0 END) as high_risk_flags,
             SUM(CASE WHEN ml_anomaly_flag = -1 THEN 1 ELSE 0 END) as ml_anomalies,
             COUNT(*) as total_works
      FROM works
      WHERE state IS NOT NULL AND state != 'Unknown'
      GROUP BY state
      ORDER BY high_risk_flags DESC
      LIMIT 8
    `);

    res.json({
      disclaimer: DISCLAIMER,
      data: {
        total_works: summaryRow.total_works || 0,
        total_anomalies: summaryRow.total_anomalies || 0,
        anomaly_rate_pct: summaryRow.total_works ? Math.round((summaryRow.total_anomalies / summaryRow.total_works) * 10000) / 100 : 0,
        critical_count: summaryRow.critical_count || 0,
        high_count: summaryRow.high_count || 0,
        high_risk_allocation: summaryRow.high_risk_allocation || 0,
        total_allocation: summaryRow.total_allocation || 0,
        avg_anomaly_score: summaryRow.avg_anomaly_score ? Math.round(summaryRow.avg_anomaly_score * 100) / 100 : 0,
        priority_audits: priorityAudits,
        cost_outliers: costOutliers,
        audit_by_state: auditByState
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
