import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  Filter,
  X,
  RotateCcw,
  ShieldCheck,
  Building2,
  MapPin,
  Sparkles
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useRole, ROLES } from '../context/RoleContext';
import GlobalDisclaimer from '../components/GlobalDisclaimer';
import PageHeader from '../components/ui/PageHeader';
import RiskBadge from '../components/ui/RiskBadge';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/SkeletonLoader';

export default function InvestigationsPage({ onOpenDetail }) {
  const { 
    userRole, 
    selectedState: roleState, 
    setSelectedState: setRoleState, 
    selectedDistrict: roleDistrict, 
    setSelectedDistrict: setRoleDistrict,
    statesList: globalStatesList 
  } = useRole();

  // Local filter states initialized from role context if available
  const [selectedState, setSelectedState] = useState(roleState || '');
  const [selectedConstituency, setSelectedConstituency] = useState(roleDistrict || '');
  const [availableConstituencies, setAvailableConstituencies] = useState([]);
  const [availableStates, setAvailableStates] = useState(globalStatesList || []);

  const [investigations, setInvestigations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Synchronize with role context if user changes role or banner filters
  useEffect(() => {
    if (roleState && roleState !== selectedState) {
      setSelectedState(roleState);
    }
  }, [roleState]);

  useEffect(() => {
    if (roleDistrict !== undefined && roleDistrict !== selectedConstituency) {
      setSelectedConstituency(roleDistrict);
    }
  }, [roleDistrict]);

  // Fetch states if not already populated
  useEffect(() => {
    if (availableStates.length === 0) {
      fetch(`${API_BASE_URL}/api/states`)
        .then(res => res.json())
        .then(data => {
          if (data.states) setAvailableStates(data.states);
        })
        .catch(err => console.error('Error loading states:', err));
    }
  }, [availableStates.length]);

  // Fetch constituencies whenever selectedState changes
  useEffect(() => {
    if (!selectedState) {
      setAvailableConstituencies([]);
      return;
    }
    fetch(`${API_BASE_URL}/api/constituencies?state=${encodeURIComponent(selectedState)}`)
      .then(res => res.json())
      .then(data => {
        const list = data.constituencies || [];
        setAvailableConstituencies(list);
        if (selectedConstituency && !list.includes(selectedConstituency)) {
          setSelectedConstituency('');
        }
      })
      .catch(err => console.error('Error fetching constituencies:', err));
  }, [selectedState]);

  // Fetch investigations data
  useEffect(() => {
    fetchInvestigations();
  }, [page, statusFilter, priorityFilter, selectedState, selectedConstituency, searchQuery]);

  const fetchInvestigations = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/api/investigations?page=${page}&limit=20`;
      if (selectedState) url += `&state=${encodeURIComponent(selectedState)}`;
      if (selectedConstituency) url += `&constituency=${encodeURIComponent(selectedConstituency)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      if (priorityFilter) url += `&priority=${encodeURIComponent(priorityFilter)}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      setInvestigations(json.data || []);
      setPagination(json.pagination || null);
    } catch (err) {
      console.error('Error fetching investigations:', err);
      setError('Backend service unavailable. Please ensure the Express API is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = (newState) => {
    setSelectedState(newState);
    setSelectedConstituency('');
    setPage(1);
    setRoleState(newState);
    setRoleDistrict('');
  };

  const handleConstituencyChange = (newConst) => {
    setSelectedConstituency(newConst);
    setPage(1);
    setRoleDistrict(newConst);
  };

  const handleClearFilters = () => {
    setSelectedState('');
    setSelectedConstituency('');
    setStatusFilter('');
    setPriorityFilter('');
    setSearchQuery('');
    setPage(1);
    setRoleDistrict('');
  };

  const handleQuickStatusUpdate = async (projectId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/investigations/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchInvestigations();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const statusTabs = [
    { id: '', label: 'All' },
    { id: 'NEW', label: 'New' },
    { id: 'UNDER_REVIEW', label: 'Under Review' },
    { id: 'VERIFIED', label: 'Verified' },
    { id: 'CLEARED', label: 'Cleared' },
    { id: 'ESCALATED', label: 'Escalated' }
  ];

  const hasActiveFilters = Boolean(
    selectedState || 
    selectedConstituency || 
    statusFilter || 
    priorityFilter || 
    searchQuery.trim()
  );

  const getEmptyStateMessage = () => {
    if (selectedState && selectedConstituency) {
      return `No works found for ${selectedState} — ${selectedConstituency}.`;
    }
    if (selectedState) {
      return `No works found for ${selectedState}.`;
    }
    return 'No works found matching your filter criteria.';
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <PageHeader
        title="Field Verification Queue"
        subtitle="Works prioritized for administrative scrutiny and on-site field verification based on risk signals"
        badge="Verification Priority"
        badgeType="neutral"
      />

      <GlobalDisclaimer />

      {/* Ticket Status Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        {statusTabs.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Left Controls: Search, State, Constituency, Priority */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, MP, work..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* State Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
              <span className="text-slate-400 font-medium">State:</span>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[160px]"
              >
                <option value="" className="bg-white text-slate-500">All States (National)</option>
                {availableStates.map((st) => (
                  <option key={st} value={st} className="bg-white text-slate-800">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Constituency Selector (Active when State is selected) */}
            {selectedState && (
              <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/80 px-2 py-1 rounded-lg">
                <span className="text-amber-800 font-medium">Constituency:</span>
                <select
                  value={selectedConstituency}
                  onChange={(e) => handleConstituencyChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[160px] truncate"
                >
                  <option value="" className="bg-white text-slate-500">All Constituencies</option>
                  {availableConstituencies.map((c) => (
                    <option key={c} value={c} className="bg-white text-slate-800">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Priority Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
              <span className="text-slate-400 font-medium">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-white text-slate-500">All Priorities</option>
                <option value="CRITICAL" className="bg-white text-slate-800">Critical</option>
                <option value="HIGH" className="bg-white text-slate-800">High</option>
                <option value="MEDIUM" className="bg-white text-slate-800">Medium</option>
                <option value="LOW" className="bg-white text-slate-800">Low</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors"
                title="Reset all filters to national view"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Clear filters</span>
              </button>
            )}

          </div>

          {/* Right Summary Count */}
          <div className="text-xs text-slate-500 shrink-0 self-end sm:self-center font-medium">
            {pagination ? (
              <span>
                Showing <strong className="text-slate-900">{investigations.length}</strong> of <strong className="text-slate-900">{pagination.total.toLocaleString()}</strong> prioritized works
              </span>
            ) : null}
          </div>

        </div>

        {/* Active Scope Summary Banner */}
        {(selectedState || selectedConstituency) && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Active Scope:</span>
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">
                <MapPin className="w-3 h-3" />
                {selectedState || 'All States'}
                {selectedConstituency ? ` • ${selectedConstituency}` : ''}
              </span>
            </div>
            <span className="text-slate-400">
              Sorted by Risk Priority (Critical → High → Medium → Low)
            </span>
          </div>
        )}

      </div>

      {/* Investigations Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-xl p-6 text-center space-y-2 shadow-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      ) : investigations.length === 0 ? (
        <EmptyState
          title="No verification works found"
          description={getEmptyStateMessage()}
          actionLabel="Clear Filters"
          onAction={handleClearFilters}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Work & Project ID</th>
                  <th className="py-2.5 px-3.5">Location & MP</th>
                  <th className="py-2.5 px-3.5">Allocation</th>
                  <th className="py-2.5 px-3.5">Risk Signals</th>
                  <th className="py-2.5 px-3.5">Verification Action</th>
                  <th className="py-2.5 px-3.5">Verification Status</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {investigations.map((inv) => {
                  const riskLvl = inv.hybrid_risk_level || 'Low';
                  const riskScore = inv.hybrid_risk_score ?? 0;
                  const ruleScore = inv.rule_risk_score ?? 0;
                  const mlScore = inv.ml_anomaly_score !== null && inv.ml_anomaly_score !== undefined 
                    ? Number(inv.ml_anomaly_score).toFixed(1) 
                    : '0.0';

                  return (
                    <tr key={inv.project_id || inv.investigation_id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Work & Project ID */}
                      <td className="py-2.5 px-3.5 max-w-xs">
                        <div className="font-medium text-slate-900 truncate" title={inv.work}>
                          {inv.work}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono text-blue-600 font-medium">#{inv.project_id}</span>
                          {inv.project_status && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                              {inv.project_status}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Location & MP */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{inv.state}</div>
                        <div className="text-[11px] text-slate-500">{inv.constituency}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={inv.mp_name}>
                          {inv.mp_name || 'N/A'}
                        </div>
                      </td>

                      {/* Allocation */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-medium text-slate-900">
                        ₹{(Number(inv.allocation_amount || 0) / 100000).toFixed(2)} L
                      </td>

                      {/* Risk Signals */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap space-y-1">
                        <RiskBadge level={riskLvl} score={riskScore} />
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span>Rule: {ruleScore}</span>
                          <span>•</span>
                          <span>ML: {mlScore}</span>
                        </div>
                      </td>

                      {/* Recommended Verification Action */}
                      <td className="py-2.5 px-3.5 max-w-[180px]">
                        <div className="text-[11px] text-slate-700 leading-snug line-clamp-2" title={inv.recommended_action || 'Administrative verification recommended'}>
                          {inv.recommended_action || 'Administrative verification recommended'}
                        </div>
                      </td>

                      {/* Verification Status with inline updater */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <StatusBadge status={inv.status || 'NEW'} />
                          <div className="text-[10px] text-slate-400">
                            {inv.updated_at ? new Date(inv.updated_at).toLocaleDateString() : 'Pending'}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => onOpenDetail && onOpenDetail(inv.project_id, 'investigations')}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm inline-flex items-center gap-1"
                        >
                          <span>Open Investigation →</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          {pagination && (
            <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <div>
                Page <strong className="text-slate-800">{pagination.page}</strong> of <strong className="text-slate-800">{pagination.total_pages || 1}</strong> ({pagination.total.toLocaleString()} total works)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 shadow-sm transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => setPage(prev => Math.min(prev + 1, pagination.total_pages))}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 shadow-sm transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
