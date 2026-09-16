import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  AlertCircle,
  Download
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import GlobalDisclaimer from '../components/GlobalDisclaimer';
import { useRole, ROLES } from '../context/RoleContext';
import PageHeader from '../components/ui/PageHeader';
import RiskBadge from '../components/ui/RiskBadge';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/SkeletonLoader';

export default function ProjectsPage({ onOpenDetail, onOpenAiCopilot, searchQuery: externalSearchQuery }) {
  const { userRole, selectedState: roleState, selectedDistrict: roleDistrict } = useRole();
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statesList, setStatesList] = useState([]);
  const [constituenciesList, setConstituenciesList] = useState([]);

  // Filters state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState(externalSearchQuery || '');
  const [selectedState, setSelectedState] = useState(userRole === ROLES.STATE ? roleState : '');
  const [selectedConstituency, setSelectedConstituency] = useState(userRole === ROLES.DISTRICT ? roleDistrict : '');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState(userRole === ROLES.CAG ? 'High' : '');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  // Sync with Role changes
  useEffect(() => {
    if (userRole === ROLES.STATE && roleState) {
      setSelectedState(roleState);
    } else if (userRole === ROLES.CAG) {
      setSelectedRiskLevel('High');
    }
  }, [userRole, roleState]);

  // Fetch States list for dropdown
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/states`)
      .then((res) => res.json())
      .then((data) => setStatesList(data.states || []))
      .catch((err) => console.error('Error fetching states:', err));
  }, []);

  // Fetch Constituencies list when State changes
  useEffect(() => {
    if (selectedState) {
      fetch(`${API_BASE_URL}/api/constituencies?state=${encodeURIComponent(selectedState)}`)
        .then((res) => res.json())
        .then((data) => setConstituenciesList(data.constituencies || []))
        .catch((err) => console.error('Error fetching constituencies:', err));
    } else {
      setConstituenciesList([]);
      setSelectedConstituency('');
    }
  }, [selectedState]);

  // Update search when external search query changes
  useEffect(() => {
    if (externalSearchQuery !== undefined && externalSearchQuery !== search) {
      setSearch(externalSearchQuery);
      setPage(1);
    }
  }, [externalSearchQuery]);

  // Fetch Projects Data
  useEffect(() => {
    fetchProjects();
  }, [page, limit, search, selectedState, selectedConstituency, selectedRiskLevel, selectedStatus]);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/api/projects?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (selectedState) url += `&state=${encodeURIComponent(selectedState)}`;
      if (selectedConstituency) url += `&constituency=${encodeURIComponent(selectedConstituency)}`;
      if (selectedRiskLevel) url += `&risk_level=${encodeURIComponent(selectedRiskLevel)}`;
      if (selectedStatus) url += `&status=${encodeURIComponent(selectedStatus)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      setProjects(json.data || []);
      setPagination(json.pagination || null);
    } catch (err) {
      console.error('Error fetching projects list:', err);
      setError('Backend service unavailable. Please ensure the Express API is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedState('');
    setSelectedConstituency('');
    setSelectedRiskLevel('');
    setSelectedStatus('');
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/export/projects?limit=500`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MPLADS_Projects_Export_${new Date().toISOString().slice(0, 10)}.csv`;
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

  const totalCount = pagination ? pagination.total.toLocaleString() : '56,138';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <PageHeader
        title="Projects"
        subtitle={`${totalCount} works indexed across India`}
        badge="Catalog"
        badgeType="neutral"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        }
      />

      <GlobalDisclaimer />

      {/* Modern Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search MP, work, ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* State Filter */}
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
              {statesList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Dynamic Constituency Filter */}
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
              {constituenciesList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <select
              value={selectedRiskLevel}
              onChange={(e) => {
                setSelectedRiskLevel(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">All Priority Risk Levels</option>
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          {/* Work Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Sanctioned">Sanctioned</option>
              <option value="Unsanctioned">Unsanctioned</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Page Limit Selector */}
          <div>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={8} />
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-xl p-6 text-center space-y-2 shadow-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects match your query"
          description="Adjust your search keywords, state, or status filters to view records."
          actionLabel="Clear Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Project ID</th>
                  <th className="py-2.5 px-3.5">MP</th>
                  <th className="py-2.5 px-3.5">Work</th>
                  <th className="py-2.5 px-3.5">State</th>
                  <th className="py-2.5 px-3.5">Allocation</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Risk</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => {
                  const amountLakhs = (p.allocation_amount / 100000).toFixed(2);
                  const riskLvl = p.hybrid_risk_level || p.risk_level || 'Low';
                  const riskScore = p.hybrid_risk_score || p.risk_score;

                  return (
                    <tr key={p.project_id || p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-medium text-blue-600">
                        #{p.project_id || p.id}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-medium text-slate-800">{p.mp_name || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{p.house}</div>
                      </td>
                      <td className="py-2.5 px-3.5 max-w-sm">
                        <div className="font-medium text-slate-900 truncate" title={p.work}>
                          {p.work}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {p.category}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="text-slate-800">{p.state}</div>
                        <div className="text-[10px] text-slate-400">{p.constituency}</div>
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                        ₹{amountLakhs} L
                      </td>
                      <td className="py-2.5 px-3.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-2.5 px-3.5">
                        <RiskBadge level={riskLvl} score={riskScore} />
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
                            title="AI Copilot Explanation"
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

          {/* Clean Pagination Toolbar */}
          {pagination && (
            <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
                <span className="font-semibold text-slate-800">{pagination.totalPages}</span> ({pagination.total.toLocaleString()} total works)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={pagination.page <= 1}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
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
