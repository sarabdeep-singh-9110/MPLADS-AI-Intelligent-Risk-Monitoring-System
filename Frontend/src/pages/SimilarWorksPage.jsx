import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Send,
  Eye,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import GlobalDisclaimer from '../components/GlobalDisclaimer';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import RiskBadge from '../components/ui/RiskBadge';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonMetricsRow, SkeletonTable } from '../components/ui/SkeletonLoader';
import CompareProjectsModal from '../components/CompareProjectsModal';
import { useRole, ROLES } from '../context/RoleContext';

export default function SimilarWorksPage({ onOpenProjectDetail }) {
  const { userRole, selectedState: roleState } = useRole();

  const [pairs, setPairs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState(userRole === ROLES.STATE ? roleState : '');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [minScore, setMinScore] = useState(80);
  const [page, setPage] = useState(1);

  // States and constituencies lists
  const [statesList, setStatesList] = useState([]);
  const [constituenciesList, setConstituenciesList] = useState([]);

  // Active Comparison Modal
  const [activeComparePair, setActiveComparePair] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch States on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/states`)
      .then(res => res.json())
      .then(data => setStatesList(data.states || []))
      .catch(err => console.error('Error loading states:', err));

    fetchSummary();
  }, []);

  // Fetch Constituencies when State changes
  useEffect(() => {
    if (selectedState) {
      fetch(`${API_BASE_URL}/api/constituencies?state=${encodeURIComponent(selectedState)}`)
        .then(res => res.json())
        .then(data => setConstituenciesList(data.constituencies || []))
        .catch(err => console.error('Error loading constituencies:', err));
    } else {
      setConstituenciesList([]);
      setSelectedConstituency('');
    }
  }, [selectedState]);

  // Fetch Pairs
  useEffect(() => {
    fetchSimilarPairs();
  }, [page, search, selectedState, selectedConstituency, selectedStatus, minScore]);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/similar-works/summary`);
      if (res.ok) {
        const json = await res.json();
        setSummary(json.data);
      }
    } catch (err) {
      console.error('Error loading similar works summary:', err);
    }
  };

  const fetchSimilarPairs = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/api/similar-works?page=${page}&limit=20&min_score=${minScore}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (selectedState) url += `&state=${encodeURIComponent(selectedState)}`;
      if (selectedConstituency) url += `&constituency=${encodeURIComponent(selectedConstituency)}`;
      if (selectedStatus && selectedStatus !== 'ALL') url += `&status=${encodeURIComponent(selectedStatus)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      setPairs(json.data || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 });
    } catch (err) {
      console.error('Error fetching similar works:', err);
      setError('Backend service unavailable or error loading similar works.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedState('');
    setSelectedConstituency('');
    setSelectedStatus('ALL');
    setMinScore(80);
    setPage(1);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/export/similar-works?limit=500`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MPLADS_Similar_Works_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 150);
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleSendVerification = async (pairId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/similar-works/${pairId}/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Escalated from Similar Works detection table' })
      });
      if (res.ok) {
        setActionMessage({ type: 'success', message: `Pair #${pairId} escalated to Field Verification Queue` });
        fetchSimilarPairs();
        fetchSummary();
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch (err) {
      setActionMessage({ type: 'error', message: err.message });
    }
  };

  const handlePairStatusUpdated = (pairId, newStatus, newNotes) => {
    setPairs(prev => prev.map(p => p.id === pairId ? { ...p, status: newStatus, officer_notes: newNotes } : p));
    fetchSummary();
  };

  const formatLakhs = (val) => {
    const num = Number(val) || 0;
    return `₹${(num / 100000).toFixed(1)} L`;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <PageHeader
        title="Similar Works Detection"
        subtitle="Detect and verify potentially duplicate or overlapping projects using multi-signal correlation"
        badge="Duplicate Triage"
        badgeType="neutral"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors shadow-2xs"
            >
              Reset Filters
            </button>
          </div>
        }
      />

      <GlobalDisclaimer />

      {/* KPI Cards */}
      {summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Potentially Similar Works"
            value={summary.total_pairs ? summary.total_pairs.toLocaleString() : '1,500'}
            subtext="Pairs detected via administrative signals"
            badge="Signals"
            badgeType="neutral"
          />
          <MetricCard
            label="Requires Verification"
            value={summary.requires_verification_count ? summary.requires_verification_count.toLocaleString() : '0'}
            subtext="Awaiting initial field triage"
            badge="Pending"
            badgeType="warning"
          />
          <MetricCard
            label="Under Field Review"
            value={summary.under_review_count ? summary.under_review_count.toLocaleString() : '0'}
            subtext="In active investigation queue"
            badge="Active"
            badgeType="info"
          />
          <MetricCard
            label="Potential Overlap Exposure"
            value={`₹${(summary.potential_overlap_exposure / 10000000).toFixed(2)} Cr`}
            subtext="Minimum allocation overlap across pairs"
            badge="Exposure"
            badgeType="danger"
          />
        </div>
      ) : (
        <SkeletonMetricsRow count={4} />
      )}

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between shadow-2xs ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{actionMessage.message}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-500 hover:text-slate-800 text-xs">✕</button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search MP, ID, village..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* State Selector */}
          <div>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedConstituency('');
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">All States & UTs</option>
              {statesList.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Dynamic Constituency Selector */}
          <div>
            <select
              value={selectedConstituency}
              disabled={!selectedState}
              onChange={(e) => {
                setSelectedConstituency(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
            >
              <option value="">{selectedState ? 'All Constituencies' : 'Select State First'}</option>
              {constituenciesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Selector */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="REQUIRES_VERIFICATION">Requires Verification</option>
              <option value="UNDER_REVIEW">Under Field Review</option>
              <option value="VERIFIED_LEGITIMATE">Verified Legitimate</option>
              <option value="POTENTIALLY_DUPLICATE">Potentially Duplicate Flag</option>
            </select>
          </div>

          {/* Minimum Similarity Threshold */}
          <div>
            <select
              value={minScore}
              onChange={(e) => {
                setMinScore(Number(e.target.value));
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={70}>Min Similarity: 70%+</option>
              <option value={80}>Min Similarity: 80%+</option>
              <option value={90}>Min Similarity: 90%+</option>
              <option value={95}>Min Similarity: 95%+ (High Overlap)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3 shadow-2xs">
          <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">Failed to Load Similar Works</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchSimilarPairs}
            className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : pairs.length === 0 ? (
        <EmptyState
          title="No potentially similar works found"
          description="Try clearing your search query or lowering the minimum similarity threshold."
          actionLabel="Reset Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-compact">
              <thead>
                <tr>
                  <th className="w-16">Score</th>
                  <th className="min-w-[220px]">Project A</th>
                  <th className="min-w-[220px]">Project B</th>
                  <th className="min-w-[160px]">Correlation Signals</th>
                  <th className="min-w-[130px]">Jurisdiction</th>
                  <th className="w-32">Status</th>
                  <th className="text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {pairs.map((p) => {
                  const a = p.project_a;
                  const b = p.project_b;

                  let scoreBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (p.similarity_score >= 95) scoreBadgeClass = 'bg-red-50 text-red-700 border-red-200';
                  else if (p.similarity_score >= 85) scoreBadgeClass = 'bg-orange-50 text-orange-700 border-orange-200';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Similarity Score */}
                      <td className="align-top py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${scoreBadgeClass}`}>
                          {p.similarity_score}%
                        </span>
                      </td>

                      {/* Project A */}
                      <td className="align-top py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-slate-900">
                              #{a.project_id}
                            </span>
                            <RiskBadge level={a.hybrid_risk_level} score={a.hybrid_risk_score} />
                          </div>
                          <p className="font-medium text-slate-800 line-clamp-2 leading-relaxed" title={a.work}>
                            {a.work}
                          </p>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{formatLakhs(a.allocation_amount)}</span>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{a.mp_name || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Project B */}
                      <td className="align-top py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-slate-900">
                              #{b.project_id}
                            </span>
                            <RiskBadge level={b.hybrid_risk_level} score={b.hybrid_risk_score} />
                          </div>
                          <p className="font-medium text-slate-800 line-clamp-2 leading-relaxed" title={b.work}>
                            {b.work}
                          </p>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{formatLakhs(b.allocation_amount)}</span>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{b.mp_name || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Detected Correlation Reasons */}
                      <td className="align-top py-3">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          {p.similarity_reasons.slice(0, 3).map((reason, idx) => (
                            <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded truncate" title={reason}>
                              {reason}
                            </span>
                          ))}
                          {p.similarity_reasons.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              +{p.similarity_reasons.length - 3} more signal(s)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Jurisdiction */}
                      <td className="align-top py-3">
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-800 truncate" title={p.constituency}>
                            {p.constituency}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {p.state}
                          </div>
                          {(p.location_block || p.location_village) && (
                            <div className="text-[10px] text-slate-500 truncate" title={`${p.location_block} / ${p.location_village}`}>
                              {p.location_block || p.location_village}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="align-top py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          p.status === 'UNDER_REVIEW' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          p.status === 'VERIFIED_LEGITIMATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          p.status === 'POTENTIALLY_DUPLICATE' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {p.status === 'REQUIRES_VERIFICATION' ? 'Requires Verification' :
                           p.status === 'UNDER_REVIEW' ? 'Under Review' :
                           p.status === 'VERIFIED_LEGITIMATE' ? 'Verified Legitimate' : 'Potentially Duplicate'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="align-top py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveComparePair(p)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-xs font-medium transition-colors shadow-2xs flex items-center gap-1"
                            title="Side-by-side Project Comparison"
                          >
                            <Layers className="w-3 h-3 text-blue-600" />
                            <span>Compare</span>
                          </button>

                          <button
                            onClick={() => handleSendVerification(p.id)}
                            disabled={p.status === 'UNDER_REVIEW'}
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors disabled:opacity-30"
                            title="Send to Field Verification Queue"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{pairs.length}</span> of{' '}
              <span className="font-semibold text-slate-800">{pagination.total.toLocaleString()}</span> pairs
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> <span>Prev</span>
              </button>

              <span className="text-slate-700 font-medium px-2">
                Page {page} of {pagination.total_pages || 1}
              </span>

              <button
                onClick={() => setPage(p => Math.min(pagination.total_pages || 1, p + 1))}
                disabled={page >= (pagination.total_pages || 1)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs flex items-center gap-1"
              >
                <span>Next</span> <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Side-by-side Modal */}
      {activeComparePair && (
        <CompareProjectsModal
          pair={activeComparePair}
          onClose={() => setActiveComparePair(null)}
          onOpenProjectDetail={onOpenProjectDetail}
          onStatusUpdated={handlePairStatusUpdated}
        />
      )}

    </div>
  );
}
