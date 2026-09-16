import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  Cpu, 
  Building,
  Scale,
  MapPin,
  Eye
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { API_BASE_URL } from '../config';
import GlobalDisclaimer from '../components/GlobalDisclaimer';
import { useRole, ROLES } from '../context/RoleContext';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import RiskBadge from '../components/ui/RiskBadge';
import { SkeletonMetricsRow, SkeletonTable } from '../components/ui/SkeletonLoader';

export default function OverviewPage({ onSelectState, onOpenProjectDetail }) {
  const { userRole, selectedState } = useRole();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOverview();
  }, [userRole, selectedState]);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = `${API_BASE_URL}/api/analytics/national`;
      if (userRole === ROLES.STATE && selectedState) {
        endpoint = `${API_BASE_URL}/api/analytics/state?state=${encodeURIComponent(selectedState)}`;
      } else if (userRole === ROLES.CAG) {
        endpoint = `${API_BASE_URL}/api/analytics/audit`;
      }

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Backend service unavailable. Please ensure the Express API is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="MPLADS Overview" 
          subtitle="National project risk and implementation intelligence" 
        />
        <SkeletonMetricsRow count={4} />
        <SkeletonMetricsRow count={4} />
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3 shadow-sm">
        <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-sm font-semibold text-slate-800">Analytics Service Unavailable</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error || 'Unable to load analytics data.'}</p>
        <button
          onClick={fetchOverview}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // ==========================================
  // RENDER: CAG / FIELD AUDITOR PERSONA VIEW
  // ==========================================
  if (userRole === ROLES.CAG) {
    const {
      total_works = 56138,
      total_anomalies = 6722,
      anomaly_rate_pct = 11.97,
      critical_count = 5,
      high_count = 198,
      high_risk_allocation = 0,
      total_allocation = 33502878543,
      avg_anomaly_score = 16.16,
      priority_audits = [],
      audit_by_state = []
    } = data;

    const highRiskExposureCr = (high_risk_allocation / 10000000).toFixed(2);
    const totalAllocCr = (total_allocation / 10000000).toFixed(2);

    return (
      <div className="space-y-6">
        <PageHeader
          title="CAG Forensic Audit Overview"
          subtitle="Priority triage across ML anomalies, cost inflation benchmarks, and duplicate works"
          badge={`${critical_count + high_count} Flagged For Audit`}
          badgeType="red"
        />

        <GlobalDisclaimer />

        {/* 4 Primary Audit KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Critical Priority Audits"
            value={critical_count}
            subtext="Immediate physical inspection required"
            badge="Score ≥ 80"
            badgeType="danger"
          />
          <MetricCard
            label="High Risk Work Flags"
            value={high_count}
            subtext="Verification required"
            badge="Score 60–79"
            badgeType="warning"
          />
          <MetricCard
            label="ML Anomaly Outliers"
            value={total_anomalies.toLocaleString()}
            subtext={`${anomaly_rate_pct}% outlier rate (Isolation Forest)`}
            badge="Feature Space"
            badgeType="info"
          />
          <MetricCard
            label="High-Risk Fund Exposure"
            value={`₹${highRiskExposureCr} Cr`}
            subtext="Across Critical & High risk works"
            badge="Tracked Disbursals"
            badgeType="neutral"
          />
        </div>

        {/* Secondary Audit KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label="Total Indexed Scheme Funds"
            value={`₹${totalAllocCr} Cr`}
            subtext={`Across ${total_works.toLocaleString()} scored works`}
          />
          <MetricCard
            label="Avg Anomaly Distance"
            value={avg_anomaly_score}
            subtext="Normalized anomaly score (0–100)"
          />
          <MetricCard
            label="Standard Compliance Flow"
            value="52,366"
            subtext="93.28% low risk baseline"
            badge="Compliant"
            badgeType="success"
          />
        </div>

        {/* Priority Audit Queue Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Priority Audit Triage Queue</h3>
              <p className="text-xs text-slate-500">Top prioritized works requiring immediate forensic scrutiny & inspection</p>
            </div>
            <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md">
              Top Flagged Works
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Project ID</th>
                  <th className="py-2.5 px-3.5">State / MP</th>
                  <th className="py-2.5 px-3.5">Work Description</th>
                  <th className="py-2.5 px-3.5">Allocation</th>
                  <th className="py-2.5 px-3.5">Rule Score</th>
                  <th className="py-2.5 px-3.5">ML Score</th>
                  <th className="py-2.5 px-3.5">Hybrid Risk</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priority_audits.map((proj) => (
                  <tr key={proj.project_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-medium text-blue-600">{proj.project_id}</td>
                    <td className="py-2.5 px-3.5">
                      <div className="font-medium text-slate-900">{proj.state}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{proj.mp_name}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 max-w-xs truncate" title={proj.work}>
                      {proj.work}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-900">
                      ₹{(proj.allocation_amount / 100000).toFixed(2)} L
                    </td>
                    <td className="py-2.5 px-3.5 text-amber-700 font-semibold">{proj.rule_risk_score}</td>
                    <td className="py-2.5 px-3.5 text-blue-700 font-semibold">{proj.ml_anomaly_score}</td>
                    <td className="py-2.5 px-3.5">
                      <RiskBadge level={proj.hybrid_risk_level} score={proj.hybrid_risk_score} />
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <button
                        onClick={() => onOpenProjectDetail && onOpenProjectDetail(proj.project_id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Audit Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* State Audit Leaderboard Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">State-Wise Audit Scrutiny Leaderboard</h3>
          <p className="text-xs text-slate-500 mb-4">States with the highest concentration of Critical & High risk work flags</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={audit_by_state} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="state" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px' }}
                />
                <Bar dataKey="high_risk_flags" fill="#ef4444" radius={[4, 4, 0, 0]} name="Critical/High Flags" />
                <Bar dataKey="ml_anomalies" fill="#3b82f6" radius={[4, 4, 0, 0]} name="ML Outliers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    );
  }

  // ==========================================
  // RENDER: STATE AUTHORITY PERSONA VIEW
  // ==========================================
  if (userRole === ROLES.STATE) {
    const {
      total_projects = 0,
      critical_count = 0,
      high_count = 0,
      medium_count = 0,
      low_count = 0,
      total_allocation_amount = 0,
      average_hybrid_risk = 0,
      average_ml_anomaly_score = 0,
      total_constituencies = 0,
      top_constituencies = []
    } = data;

    const stateAllocCr = (total_allocation_amount / 10000000).toFixed(2);

    const stateRiskPie = [
      { name: 'Critical', value: critical_count, color: '#ef4444' },
      { name: 'High', value: high_count, color: '#f97316' },
      { name: 'Medium', value: medium_count, color: '#f59e0b' },
      { name: 'Low', value: low_count, color: '#10b981' },
    ];

    return (
      <div className="space-y-6">
        <PageHeader
          title={`${selectedState} Overview`}
          subtitle={`State administrative purview across ${total_constituencies} constituencies and ${total_projects.toLocaleString()} works`}
          badge="State Purview"
          badgeType="blue"
        />

        <GlobalDisclaimer />

        {/* 4 Primary State KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label={`Works in ${selectedState}`}
            value={total_projects.toLocaleString()}
            subtext={`Across ${total_constituencies} active constituencies`}
          />
          <MetricCard
            label="Total Allocation"
            value={`₹${stateAllocCr} Cr`}
            subtext="Cumulative sanctioned funds"
          />
          <MetricCard
            label="Flagged Works"
            value={critical_count + high_count}
            subtext={`${critical_count} critical, ${high_count} high priority`}
            badge="Action Required"
            badgeType={critical_count > 0 ? 'danger' : 'warning'}
          />
          <MetricCard
            label="Average Priority Risk"
            value={average_hybrid_risk}
            subtext="Combined Rule + ML score / 100"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-1">
            <h3 className="text-sm font-semibold text-slate-900">Risk Distribution</h3>
            <p className="text-xs text-slate-500 mb-4">{total_projects.toLocaleString()} works in {selectedState}</p>
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stateRiskPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {stateRiskPie.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              {stateRiskPie.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">Top Constituencies in {selectedState}</h3>
            <p className="text-xs text-slate-500 mb-4">Ranked by count of High & Critical risk flags</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top_constituencies} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis dataKey="constituency" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="high_risk_count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="High/Critical Flags" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    );
  }

  // ==========================================
  // RENDER: NATIONAL PURVIEW (MINISTRY NODAL OFFICER)
  // ==========================================
  const {
    total_projects = 56138,
    critical_count = 5,
    high_count = 198,
    medium_count = 3569,
    low_count = 52366,
    total_allocation_amount = 33502878543,
    average_hybrid_risk = 10.74,
    average_ml_anomaly_score = 16.16,
    total_states = 33,
    top_states = [],
    category_breakdown = []
  } = data;

  const totalAllocationCrores = (total_allocation_amount / 10000000).toFixed(2);

  const riskPieData = [
    { name: 'Critical', value: critical_count, color: '#ef4444' },
    { name: 'High', value: high_count, color: '#f97316' },
    { name: 'Medium', value: medium_count, color: '#f59e0b' },
    { name: 'Low', value: low_count, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <PageHeader
        title="MPLADS Overview"
        subtitle="National project risk and implementation intelligence"
        badge="National Purview"
        badgeType="neutral"
      />

      {/* Global Disclaimer */}
      <GlobalDisclaimer />

      {/* 4 Primary KPI Cards per row on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <MetricCard
          label="Projects Monitored"
          value={total_projects.toLocaleString()}
          subtext={`Across ${total_states} States & UTs`}
        />

        <MetricCard
          label="Total Allocation"
          value={`₹${totalAllocationCrores} Cr`}
          subtext="Cumulative sanctioned funds"
        />

        <MetricCard
          label="Average Risk"
          value={average_hybrid_risk}
          subtext="Combined Rule + ML score / 100"
        />

        <MetricCard
          label="States Covered"
          value={total_states}
          subtext="Pan-India administrative scope"
        />

      </div>

      {/* Secondary Row: Risk Triage Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500">Critical Risk</div>
          <div className="text-xl font-semibold text-red-600 mt-0.5">{critical_count.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Immediate inspection</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500">High Risk</div>
          <div className="text-xl font-semibold text-orange-600 mt-0.5">{high_count.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Verification pending</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500">Medium Risk</div>
          <div className="text-xl font-semibold text-amber-600 mt-0.5">{medium_count.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Routine compliance</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500">Low Risk</div>
          <div className="text-xl font-semibold text-emerald-600 mt-0.5">{low_count.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Standard execution</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Risk Level Distribution Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">National Risk Distribution</h3>
            <p className="text-xs text-slate-500 mt-0.5">Classification across 56,138 works</p>
          </div>

          <div className="h-56 my-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {riskPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-900">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* High Risk States Leaderboard */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">State Risk Concentration Leaderboard</h3>
              <p className="text-xs text-slate-500">States ranked by count of Critical & High risk flagged works</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top_states || []} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="state" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px' }}
                  formatter={(value, name) => [value, name === 'high_risk_count' ? 'Critical/High Flags' : 'Avg Score']}
                />
                <Bar dataKey="high_risk_count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Critical/High Flags" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Sectoral Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Sectoral Work Breakdown & Risk Metrics</h3>
          <p className="text-xs text-slate-500">Project counts, average risk score, and total allocation by sector</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Category Sector</th>
                <th className="py-2.5 px-4">Total Works</th>
                <th className="py-2.5 px-4">Avg Priority Risk</th>
                <th className="py-2.5 px-4">Total Allocation</th>
                <th className="py-2.5 px-4 text-right">Risk Level Gauge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {category_breakdown && category_breakdown.map((cat, idx) => {
                const roundedRisk = Math.round((cat.avg_hybrid_risk || cat.avg_risk || 0) * 10) / 10;
                const crVal = ((cat.total_allocation_amount || 0) / 10000000).toFixed(2);
                return (
                  <tr key={cat.category || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-900">{cat.category || 'General'}</td>
                    <td className="py-2.5 px-4 text-slate-600">{cat.count.toLocaleString()}</td>
                    <td className="py-2.5 px-4">
                      <span className={`font-semibold ${roundedRisk >= 60 ? 'text-red-600' : roundedRisk >= 40 ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {roundedRisk} / 100
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">₹{crVal} Cr</td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden inline-block align-middle ml-auto">
                        <div
                          className={`h-full rounded-full ${roundedRisk >= 60 ? 'bg-red-500' : roundedRisk >= 40 ? 'bg-orange-500' : roundedRisk >= 25 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(roundedRisk * 1.5, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
