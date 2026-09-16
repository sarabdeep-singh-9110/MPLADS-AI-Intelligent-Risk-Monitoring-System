import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Cpu, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import GlobalDisclaimer from '../components/GlobalDisclaimer';
import { useRole, ROLES } from '../context/RoleContext';
import PageHeader from '../components/ui/PageHeader';
import RiskBadge from '../components/ui/RiskBadge';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonMetricsRow, SkeletonTable } from '../components/ui/SkeletonLoader';

export default function RiskMonitoringPage({ onOpenDetail, onOpenAiCopilot }) {
  const { userRole, selectedState } = useRole();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchHighRiskProjects();
  }, [limit, userRole, selectedState]);

  const fetchHighRiskProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/api/projects/high-risk?limit=${limit}`;
      if (userRole === ROLES.STATE && selectedState) {
        url += `&state=${encodeURIComponent(selectedState)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      setProjects(json.data || []);
    } catch (err) {
      console.error('Error fetching high-risk projects:', err);
      setError('Backend service unavailable. Please ensure the Express API is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (anomaliesOnly && p.ml_anomaly_flag !== -1) return false;
    if (riskFilter !== 'ALL') {
      const pLvl = p.hybrid_risk_level || p.risk_level || 'Low';
      if (pLvl.toUpperCase() !== riskFilter.toUpperCase()) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = String(p.project_id || p.id).toLowerCase().includes(q);
      const matchWork = (p.work || '').toLowerCase().includes(q);
      const matchMp = (p.mp_name || '').toLowerCase().includes(q);
      const matchState = (p.state || '').toLowerCase().includes(q);
      const matchConst = (p.constituency || '').toLowerCase().includes(q);
      if (!matchId && !matchWork && !matchMp && !matchState && !matchConst) return false;
    }
    return true;
  });

  // Calculate counts
  const criticalCount = projects.filter(p => (p.hybrid_risk_level || p.risk_level) === 'Critical').length;
  const highCount = projects.filter(p => (p.hybrid_risk_level || p.risk_level) === 'High').length;
  const mediumCount = projects.filter(p => (p.hybrid_risk_level || p.risk_level) === 'Medium').length;
  const lowCount = projects.filter(p => (p.hybrid_risk_level || p.risk_level) === 'Low').length;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <PageHeader
        title="Risk Monitoring"
        subtitle="Prioritize projects requiring administrative verification"
        badge={userRole === ROLES.STATE && selectedState ? selectedState : "Live Triage"}
        actions={
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Display Limit:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-white border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
            >
              <option value={20}>Top 20 Works</option>
              <option value={50}>Top 50 Works</option>
              <option value={100}>Top 100 Works</option>
            </select>
          </div>
        }
      />

      <GlobalDisclaimer />

      {/* Summary Cards: Critical, High, Medium, Low */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => setRiskFilter(riskFilter === 'Critical' ? 'ALL' : 'Critical')}
          className={`text-left p-4 rounded-xl border transition-all shadow-sm ${
            riskFilter === 'Critical'
              ? 'bg-red-50/70 border-red-300 ring-1 ring-red-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Critical</span>
            <span className="w-2 h-2 rounded-full bg-red-600" />
          </div>
          <div className="text-2xl font-semibold text-red-600 mt-1">
            {criticalCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Immediate inspection</p>
        </button>

        <button
          onClick={() => setRiskFilter(riskFilter === 'High' ? 'ALL' : 'High')}
          className={`text-left p-4 rounded-xl border transition-all shadow-sm ${
            riskFilter === 'High'
              ? 'bg-orange-50/70 border-orange-300 ring-1 ring-orange-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">High</span>
            <span className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
          <div className="text-2xl font-semibold text-orange-600 mt-1">
            {highCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Verification required</p>
        </button>

        <button
          onClick={() => setRiskFilter(riskFilter === 'Medium' ? 'ALL' : 'Medium')}
          className={`text-left p-4 rounded-xl border transition-all shadow-sm ${
            riskFilter === 'Medium'
              ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Medium</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-semibold text-amber-600 mt-1">
            {mediumCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Routine compliance</p>
        </button>

        <button
          onClick={() => setRiskFilter(riskFilter === 'Low' ? 'ALL' : 'Low')}
          className={`text-left p-4 rounded-xl border transition-all shadow-sm ${
            riskFilter === 'Low'
              ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Low</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-semibold text-emerald-600 mt-1">
            {lowCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Standard flow</p>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects by ID, MP, work, state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Risk Level Pills */}
          <div className="flex items-center gap-1 text-xs">
            {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((lvl) => {
              const isActive = riskFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setRiskFilter(lvl)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {lvl === 'ALL' ? 'All' : lvl}
                </button>
              );
            })}
          </div>

          {/* ML Outliers Toggle */}
          <button
            onClick={() => setAnomaliesOnly(!anomaliesOnly)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              anomaliesOnly
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>ML Outliers</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 shrink-0 self-end sm:self-center">
          Showing <span className="font-semibold text-slate-800">{filteredProjects.length}</span> works
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <SkeletonTable rows={6} cols={9} />
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-xl p-6 text-center space-y-2 shadow-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          title="No flagged works match your filters"
          description="Try broadening your search query or selecting 'All' risk levels."
          actionLabel="Reset Filters"
          onAction={() => {
            setRiskFilter('ALL');
            setSearchQuery('');
            setAnomaliesOnly(false);
          }}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Risk</th>
                  <th className="py-2.5 px-3.5">Project</th>
                  <th className="py-2.5 px-3.5">MP</th>
                  <th className="py-2.5 px-3.5">State & Constituency</th>
                  <th className="py-2.5 px-3.5">Allocation</th>
                  <th className="py-2.5 px-3.5">Rule Score</th>
                  <th className="py-2.5 px-3.5">ML Score</th>
                  <th className="py-2.5 px-3.5">Hybrid Score</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => {
                  const amountLakhs = (p.allocation_amount / 100000).toFixed(2);
                  const riskLvl = p.hybrid_risk_level || p.risk_level || 'Low';

                  return (
                    <tr key={p.project_id || p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3.5">
                        <RiskBadge level={riskLvl} score={p.hybrid_risk_score || p.risk_score} />
                      </td>
                      <td className="py-2.5 px-3.5 max-w-xs">
                        <div className="font-medium text-slate-900 truncate" title={p.work}>
                          {p.work}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          #{p.project_id || p.id} • {p.category}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-slate-800">
                        {p.mp_name || 'N/A'}
                        <div className="text-[10px] text-slate-400 font-normal">{p.house}</div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-medium text-slate-800">{p.constituency}</div>
                        <div className="text-[11px] text-slate-400">{p.state}</div>
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                        ₹{amountLakhs} L
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-amber-700">
                        {p.rule_risk_score || p.risk_score || 0}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-1 font-medium text-blue-700">
                          <span>{p.ml_anomaly_score ? (Math.round(p.ml_anomaly_score * 10) / 10).toFixed(1) : 'N/A'}</span>
                          {p.ml_anomaly_flag === -1 && (
                            <span className="text-[9px] px-1 py-0.2 bg-red-50 text-red-700 rounded border border-red-200">
                              Outlier
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            (p.hybrid_risk_score || p.risk_score) >= 80
                              ? 'text-red-600'
                              : (p.hybrid_risk_score || p.risk_score) >= 60
                              ? 'text-orange-600'
                              : 'text-slate-800'
                          }`}>
                            {p.hybrid_risk_score || p.risk_score}
                          </span>
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                (p.hybrid_risk_score || p.risk_score) >= 80
                                  ? 'bg-red-500'
                                  : (p.hybrid_risk_score || p.risk_score) >= 60
                                  ? 'bg-orange-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${p.hybrid_risk_score || p.risk_score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenDetail && onOpenDetail(p.project_id || p.id)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            View Details →
                          </button>
                          <button
                            onClick={() => onOpenAiCopilot && onOpenAiCopilot(p.project_id || p.id)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Evidence-Based Support"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
