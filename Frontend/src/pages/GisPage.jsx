import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Building, 
  Layers, 
  ShieldAlert, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  RefreshCw,
  Landmark,
  Eye,
  Info
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import GlobalDisclaimer from '../components/GlobalDisclaimer';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import RiskBadge from '../components/ui/RiskBadge';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonMetricsRow, SkeletonTable } from '../components/ui/SkeletonLoader';

const formatINR = (val) => {
  if (val === null || val === undefined) return '₹0';
  const num = Number(val);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

export default function GisPage({ onOpenProjectDetail }) {
  // Map data & Summary state
  const [mapData, setMapData] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clustersLoading, setClustersLoading] = useState(true);
  const [error, setError] = useState(null);

  // Multi-tier Filters
  const [selectedState, setSelectedState] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown lists
  const [statesList, setStatesList] = useState([]);
  const [constituenciesList, setConstituenciesList] = useState([]);

  // Filtered Works state
  const [filteredWorks, setFilteredWorks] = useState([]);
  const [worksPagination, setWorksPagination] = useState({ page: 1, limit: 15, total: 0, total_pages: 0, total_allocation: 0 });
  const [worksLoading, setWorksLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Active hover state for visual state cards
  const [hoveredState, setHoveredState] = useState(null);

  useEffect(() => {
    fetchMapData();
    fetchStates();
  }, []);

  useEffect(() => {
    if (selectedState) {
      fetchConstituencies(selectedState);
    } else {
      setConstituenciesList([]);
      setSelectedConstituency('');
    }
  }, [selectedState]);

  useEffect(() => {
    fetchClusters();
    fetchFilteredWorks();
  }, [selectedState, selectedConstituency, selectedRisk, selectedStatus, vendorFilter, searchQuery, page]);

  const fetchMapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/gis/map-data`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      setMapData(json);
    } catch (err) {
      console.error('Error fetching GIS data:', err);
      setError('Backend service unavailable or error loading geospatial data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/states`);
      if (res.ok) {
        const json = await res.json();
        setStatesList(json.states || []);
      }
    } catch (err) {
      console.error('Error loading states:', err);
    }
  };

  const fetchConstituencies = async (st) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/constituencies?state=${encodeURIComponent(st)}`);
      if (res.ok) {
        const json = await res.json();
        setConstituenciesList(json.constituencies || []);
      }
    } catch (err) {
      console.error('Error loading constituencies:', err);
    }
  };

  const fetchClusters = async () => {
    setClustersLoading(true);
    try {
      let url = `${API_BASE_URL}/api/gis/clusters?limit=25`;
      if (selectedState) url += `&state=${encodeURIComponent(selectedState)}`;
      if (selectedConstituency) url += `&constituency=${encodeURIComponent(selectedConstituency)}`;
      if (selectedRisk && selectedRisk !== 'ALL') url += `&risk_level=${encodeURIComponent(selectedRisk)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setClusters(json.clusters || []);
      }
    } catch (err) {
      console.error('Error fetching clusters:', err);
    } finally {
      setClustersLoading(false);
    }
  };

  const fetchFilteredWorks = async () => {
    setWorksLoading(true);
    try {
      let url = `${API_BASE_URL}/api/gis/filter?page=${page}&limit=15`;
      if (selectedState) url += `&state=${encodeURIComponent(selectedState)}`;
      if (selectedConstituency) url += `&constituency=${encodeURIComponent(selectedConstituency)}`;
      if (selectedRisk && selectedRisk !== 'ALL') url += `&risk_level=${encodeURIComponent(selectedRisk)}`;
      if (selectedStatus && selectedStatus !== 'ALL') url += `&status=${encodeURIComponent(selectedStatus)}`;
      if (vendorFilter) url += `&vendor=${encodeURIComponent(vendorFilter)}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setFilteredWorks(json.data || []);
        setWorksPagination(json.pagination || { page: 1, limit: 15, total: 0, total_pages: 0, total_allocation: 0 });
      }
    } catch (err) {
      console.error('Error fetching spatial works:', err);
    } finally {
      setWorksLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedState('');
    setSelectedConstituency('');
    setSelectedRisk('ALL');
    setSelectedStatus('ALL');
    setVendorFilter('');
    setSearchQuery('');
    setPage(1);
  };

  const handleSelectStateCard = (stName) => {
    if (selectedState === stName) {
      setSelectedState('');
      setSelectedConstituency('');
    } else {
      setSelectedState(stName);
      setSelectedConstituency('');
    }
    setPage(1);
  };

  const activeStateData = selectedState && mapData?.states 
    ? mapData.states.find(s => s.state.toLowerCase() === selectedState.toLowerCase()) 
    : null;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <PageHeader
        title="Geospatial Monitoring"
        subtitle="Regional risk distribution, administrative jurisdiction clusters, and linked expenditure intelligence"
        badge={selectedState ? selectedState : "National Scope"}
        badgeType={selectedState ? "info" : "neutral"}
        actions={
          <button
            onClick={handleResetFilters}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors shadow-2xs"
          >
            Reset Filters
          </button>
        }
      />

      <GlobalDisclaimer />

      {/* Geospatial KPI Metrics */}
      {mapData ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Total Works in Scope"
            value={(activeStateData ? activeStateData.total_projects : mapData.national_summary?.total_works || 56138).toLocaleString()}
            subtext={activeStateData ? `Across ${activeStateData.total_constituencies} constituencies` : 'Across 33 States & UTs'}
            badge="Works"
            badgeType="neutral"
          />
          <MetricCard
            label="Total Allocation in Scope"
            value={formatINR(activeStateData ? activeStateData.total_allocation_amount : mapData.national_summary?.total_allocation || 33502878543)}
            subtext="Official sanctioned allocation"
            badge="Allocation"
            badgeType="info"
          />
          <MetricCard
            label="Critical & High Risk Works"
            value={((activeStateData ? (activeStateData.critical_count + activeStateData.high_count) : ((mapData.national_summary?.critical_flags || 0) + (mapData.national_summary?.high_flags || 0)))).toLocaleString()}
            subtext="Priority verification queue"
            badge="Severity"
            badgeType="danger"
          />
          <MetricCard
            label="Linked Recorded Spend"
            value={formatINR(activeStateData ? activeStateData.linked_expenditure_amount : 51081798583.63)}
            subtext={activeStateData ? `${activeStateData.linked_voucher_count?.toLocaleString() || 0} Dataful vouchers` : 'Dataful Dataset 22565'}
            badge="Dataful"
            badgeType="success"
          />
        </div>
      ) : (
        <SkeletonMetricsRow count={4} />
      )}

      {/* MULTI-TIER FILTER TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Multi-Tier Spatial Filters</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Real administrative jurisdiction coordinates only
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search MP, block, village, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
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
              {statesList.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Constituency Filter */}
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

          {/* Risk Level Filter */}
          <div>
            <select
              value={selectedRisk}
              onChange={(e) => {
                setSelectedRisk(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          {/* Project Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Sanctioned">Sanctioned</option>
              <option value="Unsanctioned">Unsanctioned</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

        </div>
      </div>

      {/* STATE REGIONAL INTELLIGENCE GRID */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>State Risk Distribution & Regional Intelligence</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any state to focus geospatial analysis, cluster tracking, and linked expenditure
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Critical Risk State
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> High Risk State
            </span>
          </div>
        </div>

        {/* State Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-80 overflow-y-auto pr-1">
          {mapData?.states?.map((st) => {
            const isSelected = selectedState.toLowerCase() === st.state.toLowerCase();
            const hasCritical = st.critical_count > 0;
            const hasHigh = st.high_count > 0;

            let cardBorder = 'border-slate-200 bg-white hover:border-slate-300';
            if (isSelected) cardBorder = 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-400';
            else if (hasCritical) cardBorder = 'border-red-200 bg-red-50/30 hover:bg-red-50/60';
            else if (hasHigh) cardBorder = 'border-orange-200 bg-orange-50/30 hover:bg-orange-50/60';

            return (
              <div
                key={st.state}
                onClick={() => handleSelectStateCard(st.state)}
                onMouseEnter={() => setHoveredState(st)}
                onMouseLeave={() => setHoveredState(null)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer shadow-2xs ${cardBorder}`}
              >
                <div className="font-semibold text-xs text-slate-900 truncate" title={st.state}>
                  {st.state}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>{st.total_projects} works</span>
                  <span className={`font-bold ${st.avg_hybrid_risk_score > 25 ? 'text-orange-600' : 'text-slate-700'}`}>
                    Avg {st.avg_hybrid_risk_score}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium truncate">
                    {formatINR(st.total_allocation_amount)}
                  </span>
                  {st.critical_count > 0 ? (
                    <span className="font-bold text-red-600">
                      {st.critical_count} Crit
                    </span>
                  ) : st.high_count > 0 ? (
                    <span className="font-bold text-orange-600">
                      {st.high_count} High
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* State Status Breakdown Footer Bar */}
        {activeStateData && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{activeStateData.state} Status Breakdown:</span>
              <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Completed: {activeStateData.completed_count || 0}
              </span>
              <span className="text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Ongoing: {activeStateData.ongoing_count || 0}
              </span>
              <span className="text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Sanctioned: {activeStateData.sanctioned_count || 0}
              </span>
              <span className="text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Unsanctioned: {activeStateData.unsanctioned_count || 0}
              </span>
            </div>

            <button
              onClick={() => setSelectedState('')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear State Scope ✕
            </button>
          </div>
        )}
      </div>

      {/* TWO COLUMN SECTION: Recorded Administrative Clusters + Spatial Works */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT: Recorded Administrative Jurisdiction Clusters (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>Recorded Local Clusters ({clusters.length})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Real recorded Block & Village concentration areas
            </p>
          </div>

          {clustersLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading spatial clusters...</div>
          ) : clusters.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No recorded clusters match this filter.</div>
          ) : (
            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {clusters.map((c, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSearchQuery(c.village);
                    setPage(1);
                  }}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900 truncate max-w-[180px]" title={`${c.block} / ${c.village}`}>
                      {c.village}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {c.project_count} works
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center justify-between">
                    <span className="truncate max-w-[140px]">{c.block}, {c.constituency}</span>
                    <span className="font-semibold text-slate-900">{formatINR(c.total_allocation)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400 truncate max-w-[140px]">{c.state}</span>
                    {c.critical_count > 0 ? (
                      <span className="text-red-700 font-bold">{c.critical_count} Critical</span>
                    ) : (
                      <span className="text-slate-500">Avg Score: {c.avg_risk_score}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Filtered Spatial Works Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Geospatially Filtered Works ({worksPagination.total.toLocaleString()})</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Total Allocation in Filter: {formatINR(worksPagination.total_allocation)}
              </p>
            </div>
          </div>

          {worksLoading ? (
            <SkeletonTable rows={6} cols={6} />
          ) : filteredWorks.length === 0 ? (
            <EmptyState
              title="No works found for this spatial scope"
              description="Adjust your State, District, Risk or Status filters to inspect projects."
              actionLabel="Reset Filters"
              onAction={handleResetFilters}
            />
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left table-compact">
                  <thead>
                    <tr>
                      <th className="w-24">Project ID</th>
                      <th className="min-w-[180px]">Work Description</th>
                      <th className="min-w-[140px]">Recorded Jurisdiction</th>
                      <th className="w-24">Allocation</th>
                      <th className="w-24">Status</th>
                      <th className="w-20">Risk</th>
                      <th className="text-right w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredWorks.map(w => (
                      <tr key={w.project_id} className="hover:bg-slate-50/70">
                        <td className="font-mono font-semibold text-slate-900">
                          #{w.project_id}
                        </td>
                        <td className="max-w-[220px] truncate font-medium text-slate-800" title={w.work}>
                          {w.work}
                        </td>
                        <td className="truncate text-slate-600 text-[11px]" title={`${w.village !== 'Unknown' ? w.village : ''} ${w.block !== 'Unknown' ? w.block : ''}, ${w.constituency}`}>
                          {w.village !== 'Unknown' ? w.village : (w.block !== 'Unknown' ? w.block : w.constituency)}, {w.state}
                        </td>
                        <td className="font-semibold text-slate-900">
                          {formatINR(w.allocation_amount)}
                        </td>
                        <td>
                          <StatusBadge status={w.status} />
                        </td>
                        <td>
                          <RiskBadge level={w.hybrid_risk_level} score={w.hybrid_risk_score} />
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => {
                              if (onOpenProjectDetail) onOpenProjectDetail(w.project_id, 'gis');
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Open Project Detail"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Page {page} of {worksPagination.total_pages || 1}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(worksPagination.total_pages || 1, p + 1))}
                    disabled={page >= (worksPagination.total_pages || 1)}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
