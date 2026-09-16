import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  X, 
  DollarSign, 
  UserCheck, 
  FileText,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import GlobalDisclaimer from '../components/GlobalDisclaimer';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import StatusBadge from '../components/ui/StatusBadge';
import RiskBadge from '../components/ui/RiskBadge';
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

export default function VendorIntelligencePage({ onOpenProjectDetail }) {
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Vendor Table State
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [sortBy, setSortBy] = useState('total_spent');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);

  // States List
  const [statesList, setStatesList] = useState([]);

  // Vendor Dossier State
  const [selectedVendorDossier, setSelectedVendorDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchStates();
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [page, search, selectedState, minSpend, sortBy, sortOrder]);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/expenditures/analytics`);
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data);
      }
    } catch (err) {
      console.error('Error fetching expenditure analytics:', err);
    } finally {
      setAnalyticsLoading(false);
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
      console.error('Error fetching states:', err);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/api/expenditures/vendors?page=${page}&limit=20&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (selectedState) url += `&state=${encodeURIComponent(selectedState)}`;
      if (minSpend) url += `&min_spend=${encodeURIComponent(minSpend)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      setVendors(json.data || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 });
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Backend service unavailable or error loading vendors.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDossier = async (vendorName) => {
    setDossierLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/expenditures/vendor/${encodeURIComponent(vendorName)}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedVendorDossier(json);
      }
    } catch (err) {
      console.error('Error loading vendor dossier:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedState('');
    setMinSpend('');
    setSortBy('total_spent');
    setSortOrder('DESC');
    setPage(1);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/export/vendors?limit=500`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MPLADS_Vendor_Intelligence_${new Date().toISOString().slice(0, 10)}.csv`;
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

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <PageHeader
        title="Vendor Intelligence"
        subtitle="Dataful expenditure intelligence, vendor concentration, and MPLADS project relationships"
        badge="Dataful 22565"
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
      {analytics ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Total Vendors"
            value={(analytics.total_vendors || 22851).toLocaleString()}
            subtext="Disbursement recipients in Dataful dataset"
            badge="Vendors"
            badgeType="neutral"
          />
          <MetricCard
            label="Recorded Expenditure"
            value={formatINR(analytics.total_expenditure || 51081798583.63)}
            subtext="Across 143,256 verified vouchers"
            badge="18th Lok Sabha"
            badgeType="info"
          />
          <MetricCard
            label="Payment In-Progress"
            value={formatINR(analytics.in_progress_amount || 0)}
            subtext={`${(analytics.in_progress_count || 0).toLocaleString()} vouchers pending clearance`}
            badge="Pending"
            badgeType="warning"
          />
          <MetricCard
            label="Linked MPLADS Works"
            value={(analytics.linked_summary?.unique_linked_projects || 243).toLocaleString()}
            subtext={`${(analytics.linked_summary?.linked_vouchers || 6995).toLocaleString()} high-confidence vouchers linked`}
            badge="Linked"
            badgeType="success"
          />
        </div>
      ) : (
        <SkeletonMetricsRow count={4} />
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor name..."
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

          {/* Min Spend Filter */}
          <div>
            <select
              value={minSpend}
              onChange={(e) => {
                setMinSpend(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Any Spend Amount</option>
              <option value="1000000">≥ ₹10 Lakhs</option>
              <option value="5000000">≥ ₹50 Lakhs</option>
              <option value="10000000">≥ ₹1 Crore</option>
              <option value="50000000">≥ ₹5 Crores</option>
            </select>
          </div>

          {/* Sort Field */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="total_spent">Sort by Total Spend</option>
              <option value="voucher_count">Sort by Voucher Count</option>
              <option value="mp_count">Sort by Active MPs</option>
              <option value="state_count">Sort by Active States</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="DESC">Highest First</option>
              <option value="ASC">Lowest First</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Vendor Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3 shadow-2xs">
          <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">Failed to Load Vendors</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchVendors}
            className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : vendors.length === 0 ? (
        <EmptyState
          title="No vendors found"
          description="Try broadening your search or resetting active filters."
          actionLabel="Reset Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-compact">
              <thead>
                <tr>
                  <th className="min-w-[240px]">Vendor Name</th>
                  <th className="min-w-[130px]">Total Spend</th>
                  <th className="w-24">Vouchers</th>
                  <th className="w-24">MPs</th>
                  <th className="w-28">States</th>
                  <th className="min-w-[120px]">Risk Signal</th>
                  <th className="text-right w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {vendors.map((v) => (
                  <tr key={v.vendor_name} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Vendor Name */}
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <div 
                            onClick={() => handleOpenDossier(v.vendor_name)}
                            className="font-semibold text-slate-900 hover:text-blue-600 cursor-pointer truncate max-w-[280px]"
                            title={v.vendor_name}
                          >
                            {v.vendor_name}
                          </div>
                          {v.in_progress_vouchers > 0 && (
                            <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                              {v.in_progress_vouchers} voucher(s) In-Progress ({formatINR(v.in_progress_amount)})
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Total Spend */}
                    <td className="py-3">
                      <div className="font-bold text-slate-900 text-sm">
                        {formatINR(v.total_spent)}
                      </div>
                    </td>

                    {/* Vouchers */}
                    <td className="py-3">
                      <span className="font-semibold text-slate-700">
                        {v.voucher_count.toLocaleString()}
                      </span>
                    </td>

                    {/* MPs */}
                    <td className="py-3">
                      <span className="font-medium text-slate-700">
                        {v.mp_count} MP{v.mp_count > 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* States */}
                    <td className="py-3">
                      <span className="font-medium text-slate-700 truncate block max-w-[120px]" title={v.active_states}>
                        {v.state_count} State{v.state_count > 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Risk Signal */}
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                        v.risk_signal === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' :
                        v.risk_signal === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {v.risk_signal === 'HIGH' ? 'High Concentration' :
                         v.risk_signal === 'MEDIUM' ? 'Medium Exposure' : 'Low Concentration'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleOpenDossier(v.vendor_name)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-xs font-medium transition-colors shadow-2xs inline-flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3 text-blue-600" />
                        <span>Dossier</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{vendors.length}</span> of{' '}
              <span className="font-semibold text-slate-800">{pagination.total.toLocaleString()}</span> vendors
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

      {/* VENDOR DOSSIER MODAL / DRAWER */}
      {selectedVendorDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 modal-backdrop">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
            
            {/* Top Modal Bar */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  V
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-none">
                    {selectedVendorDossier.vendor_name}
                  </h2>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Vendor Dossier & Linked Project Relationships
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedVendorDossier(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-700">
              
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div>
                  <span className="text-[11px] text-slate-500 block">Total Expenditure</span>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">
                    {formatINR(selectedVendorDossier.summary?.total_spent)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Verified Vouchers</span>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">
                    {selectedVendorDossier.summary?.voucher_count?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Unique MPs Engaged</span>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">
                    {selectedVendorDossier.summary?.unique_mps} MP{selectedVendorDossier.summary?.unique_mps > 1 ? 's' : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Linked MPLADS Works</span>
                  <span className="text-base font-bold text-blue-700 block mt-0.5">
                    {selectedVendorDossier.linked_projects?.length || 0} Projects
                  </span>
                </div>
              </div>

              {/* Vendor Risk Indicators */}
              {selectedVendorDossier.risk_indicators && selectedVendorDossier.risk_indicators.length > 0 && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Vendor Concentration & Risk Signals</span>
                  </div>
                  <div className="space-y-1">
                    {selectedVendorDossier.risk_indicators.map((sig, idx) => (
                      <div key={idx} className="text-xs text-amber-900 flex items-start gap-1.5">
                        <span className="font-semibold text-amber-700">•</span>
                        <span>{sig.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LINKED MPLADS PROJECTS SECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Linked MPLADS Projects ({selectedVendorDossier.linked_projects?.length || 0})</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    High-confidence matches from official works database
                  </span>
                </div>

                {selectedVendorDossier.linked_projects && selectedVendorDossier.linked_projects.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left table-compact">
                      <thead>
                        <tr>
                          <th>Project ID</th>
                          <th>Work Description</th>
                          <th>Jurisdiction</th>
                          <th>Allocation</th>
                          <th>Disbursed</th>
                          <th>Risk</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedVendorDossier.linked_projects.map(p => (
                          <tr key={p.project_id} className="hover:bg-slate-50/70">
                            <td className="font-mono font-semibold text-slate-900">
                              #{p.project_id}
                            </td>
                            <td className="max-w-[260px] truncate font-medium text-slate-800" title={p.work}>
                              {p.work}
                            </td>
                            <td className="truncate text-slate-600">
                              {p.constituency}, {p.state}
                            </td>
                            <td className="font-semibold text-slate-900">
                              {formatINR(p.allocation_amount)}
                            </td>
                            <td className="font-semibold text-blue-700">
                              {formatINR(p.total_disbursed_to_project)}
                            </td>
                            <td>
                              <RiskBadge level={p.hybrid_risk_level} score={p.hybrid_risk_score} />
                            </td>
                            <td className="text-right">
                              <button
                                onClick={() => {
                                  setSelectedVendorDossier(null);
                                  if (onOpenProjectDetail) onOpenProjectDetail(p.project_id, 'vendors');
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
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
                    No high-confidence projects linked to this vendor in the matched subset.
                  </div>
                )}
              </div>

              {/* TWO COLUMN SECTION: MPs Served + Payment Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* MPs Served */}
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    MPs Engaged
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedVendorDossier.mps_served?.map((m, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{m.mp_name}</div>
                          <div className="text-[10px] text-slate-400">{m.constituency}, {m.state}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">{formatINR(m.spend_with_mp)}</div>
                          <div className="text-[10px] text-slate-500">{m.spend_percentage}% share</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Payment Clearance Status
                  </h4>
                  <div className="space-y-1.5">
                    {selectedVendorDossier.payment_breakdown?.map((pb, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            pb.payment_status?.toLowerCase().includes('in-progress') ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className="font-medium text-slate-800">{pb.payment_status || 'Paid'}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">{formatINR(pb.total_amount)}</div>
                          <div className="text-[10px] text-slate-500">{pb.count} voucher(s)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* RECENT VOUCHERS LIST */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recent Expenditure Vouchers ({selectedVendorDossier.recent_vouchers?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left table-compact">
                    <thead>
                      <tr>
                        <th>Voucher ID</th>
                        <th>Work Description</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Payment Status</th>
                        <th>Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedVendorDossier.recent_vouchers?.map(v => (
                        <tr key={v.expenditure_id} className="hover:bg-slate-50/70">
                          <td className="font-mono text-slate-700 text-[11px]">
                            #{v.expenditure_id}
                          </td>
                          <td className="max-w-[240px] truncate font-medium text-slate-800" title={v.work}>
                            {v.work}
                          </td>
                          <td className="font-semibold text-slate-900">
                            {formatINR(v.expenditure_amount)}
                          </td>
                          <td className="text-slate-600">
                            {v.expenditure_date || 'N/A'}
                          </td>
                          <td>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              v.payment_status?.toLowerCase().includes('in-progress') 
                                ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              {v.payment_status || 'Paid'}
                            </span>
                          </td>
                          <td>
                            <span className="text-[10px] font-mono font-semibold text-slate-500">
                              {v.match_confidence || 'UNLINKED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 text-right flex items-center justify-between text-[11px] text-slate-500">
              <span>Source: Dataful Dataset 22565 (18th Lok Sabha MPLADS Expenditures)</span>
              <button
                onClick={() => setSelectedVendorDossier(null)}
                className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
