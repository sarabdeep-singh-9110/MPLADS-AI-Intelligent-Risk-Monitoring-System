import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft, 
  ExternalLink, 
  FileText, 
  X, 
  Check, 
  XCircle, 
  Info,
  Landmark,
  UserCheck,
  Eye,
  DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  AreaChart, 
  Area 
} from 'recharts';
import { API_BASE_URL } from '../config';
import GlobalDisclaimer from '../components/GlobalDisclaimer';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';
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

export default function FinancialPage({ onOpenProjectDetail }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, vendors, payments, review, explorer

  // Tab 1: Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Tab 2: Vendor Intelligence State
  const [vendors, setVendors] = useState([]);
  const [vendorPagination, setVendorPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorSort, setVendorSort] = useState('total_spent');
  const [vendorLoading, setVendorLoading] = useState(false);
  const [selectedVendorDossier, setSelectedVendorDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  // Tab 3: Payments Monitoring State
  const [paymentFilter, setPaymentFilter] = useState('Payment In-Progress');
  const [paymentVouchers, setPaymentVouchers] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Tab 4: Explorer State
  const [vouchers, setVouchers] = useState([]);
  const [voucherPagination, setVoucherPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0, filtered_total_spent: 0 });
  const [expSearch, setExpSearch] = useState('');
  const [expState, setExpState] = useState('');
  const [expStatus, setExpStatus] = useState('');
  const [expConfidence, setExpConfidence] = useState('');
  const [expMinAmount, setExpMinAmount] = useState('');
  const [expMaxAmount, setExpMaxAmount] = useState('');
  const [expLoading, setExpLoading] = useState(false);
  const [selectedVoucherDetail, setSelectedVoucherDetail] = useState(null);

  // Tab 5: Match Review State
  const [reviewQueue, setReviewQueue] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviewPagination, setReviewPagination] = useState({ page: 1, limit: 15, total: 0, total_pages: 0 });
  const [reviewConfidence, setReviewConfidence] = useState('ALL');
  const [reviewStatus, setReviewStatus] = useState('PENDING_REVIEW');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewActionMessage, setReviewActionMessage] = useState(null);

  // Fetch Analytics on mount
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Fetch Tab data when changing tabs
  useEffect(() => {
    if (activeTab === 'vendors') fetchVendors(1);
    if (activeTab === 'payments') fetchPaymentMonitoring();
    if (activeTab === 'explorer') fetchExplorer(1);
    if (activeTab === 'review') fetchReviewQueue(1);
  }, [activeTab]);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/expenditures/analytics`);
      const json = await res.json();
      if (json.data) setAnalytics(json.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchVendors = async (page = 1, sortOverride = null, searchOverride = null) => {
    setVendorLoading(true);
    try {
      const activeSort = sortOverride !== null ? sortOverride : vendorSort;
      const activeSearch = searchOverride !== null ? searchOverride : vendorSearch;
      const query = new URLSearchParams({
        page,
        limit: 20,
        sortBy: activeSort,
        sortOrder: 'DESC'
      });
      if (activeSearch && activeSearch.trim()) query.append('search', activeSearch.trim());
      const res = await fetch(`${API_BASE_URL}/api/expenditures/vendors?${query.toString()}`);
      const json = await res.json();
      if (json && json.data) {
        setVendors(json.data);
        setVendorPagination(json.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 });
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setVendorLoading(false);
    }
  };

  const fetchVendorDossier = async (vendorName) => {
    setDossierLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/expenditures/vendor/${encodeURIComponent(vendorName)}`);
      const json = await res.json();
      if (json.summary) {
        setSelectedVendorDossier(json);
      }
    } catch (err) {
      console.error('Failed to load vendor dossier:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  const fetchPaymentMonitoring = async (statusOverride) => {
    setPaymentLoading(true);
    try {
      const statusToUse = statusOverride !== undefined ? statusOverride : paymentFilter;
      const query = new URLSearchParams({
        payment_status: statusToUse,
        limit: 30,
        sortBy: 'expenditure_amount',
        sortOrder: 'DESC'
      });
      const res = await fetch(`${API_BASE_URL}/api/expenditures?${query.toString()}`);
      const json = await res.json();
      if (json.data) {
        setPaymentVouchers(json.data);
      }
    } catch (err) {
      console.error('Failed to load payment monitoring vouchers:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchExplorer = async (page = 1) => {
    setExpLoading(true);
    try {
      const query = new URLSearchParams({ page, limit: 20 });
      if (expSearch) query.append('search', expSearch);
      if (expState) query.append('state', expState);
      if (expStatus) query.append('payment_status', expStatus);
      if (expConfidence) query.append('match_confidence', expConfidence);
      if (expMinAmount) query.append('min_amount', expMinAmount);
      if (expMaxAmount) query.append('max_amount', expMaxAmount);

      const res = await fetch(`${API_BASE_URL}/api/expenditures?${query.toString()}`);
      const json = await res.json();
      if (json.data) {
        setVouchers(json.data);
        setVoucherPagination(json.pagination);
      }
    } catch (err) {
      console.error('Failed to load vouchers:', err);
    } finally {
      setExpLoading(false);
    }
  };

  const fetchReviewQueue = async (page = 1) => {
    setReviewLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit: 15,
        status: reviewStatus
      });
      if (reviewConfidence !== 'ALL') query.append('confidence', reviewConfidence);

      const res = await fetch(`${API_BASE_URL}/api/matches/review?${query.toString()}`);
      const json = await res.json();
      if (json.data) {
        setReviewQueue(json.data);
        setReviewPagination(json.pagination);
        setReviewSummary(json.queue_summary);
      }
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReviewAction = async (matchId, action, projectId = null, notes = '') => {
    try {
      const body = { action, project_id: projectId, review_notes: notes, reviewed_by: 'Administrator' };
      const res = await fetch(`${API_BASE_URL}/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (res.ok) {
        setReviewActionMessage(`Match #${matchId} ${action === 'approve' ? 'approved' : 'rejected'}`);
        setTimeout(() => setReviewActionMessage(null), 4000);
        fetchReviewQueue(reviewPagination.page);
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Review action failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <PageHeader
        title="Financial Intelligence"
        subtitle="18th Lok Sabha expenditure analytics • Dataful Dataset 22565 (MoSPI)"
        badge="Dataset 22565"
        badgeType="neutral"
        actions={
          analytics && (
            <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs shadow-sm">
              <span className="text-slate-500">Auto-Linked:</span>
              <span className="font-semibold text-slate-900">
                {analytics.linked_summary ? `${analytics.linked_summary.linked_vouchers.toLocaleString()} (${((analytics.linked_summary.linked_vouchers / analytics.total_vouchers) * 100).toFixed(2)}%)` : '6,995 (4.88%)'}
              </span>
            </div>
          )
        }
      />

      {/* Mandatory Statutory Financial Disclaimer */}
      <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-amber-950 mr-1">Statutory Notice:</span>
          <span>Financial risk signals identify unusual expenditure, payment, or vendor patterns for administrative verification. They are not proof of fraud, corruption, or wrongdoing.</span>
        </div>
      </div>

      <GlobalDisclaimer />

      {/* 8 Compact KPI Cards Row */}
      {analyticsLoading ? (
        <SkeletonMetricsRow count={8} />
      ) : analytics ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          
          <MetricCard
            label="Total Expenditure"
            value={formatINR(analytics.total_expenditure)}
            subtext="100% 18th LS tracked"
          />

          <MetricCard
            label="Vouchers"
            value={analytics.total_vouchers.toLocaleString()}
            subtext="Transaction records"
          />

          <MetricCard
            label="Vendors"
            value={analytics.total_vendors.toLocaleString()}
            subtext="Commercial entities"
          />

          <MetricCard
            label="Agencies"
            value={analytics.total_agencies.toLocaleString()}
            subtext="Implementing bodies"
          />

          <MetricCard
            label="Payment Success"
            value={`${(100 - (analytics.in_progress_count / analytics.total_vouchers) * 100).toFixed(2)}%`}
            subtext={formatINR(analytics.total_expenditure - analytics.in_progress_amount)}
          />

          <MetricCard
            label="In Progress"
            value={formatINR(analytics.in_progress_amount)}
            subtext={`${analytics.in_progress_count.toLocaleString()} vouchers`}
          />

          <MetricCard
            label="Linked Projects"
            value={analytics.linked_summary ? analytics.linked_summary.unique_linked_projects.toLocaleString() : '243'}
            subtext={analytics.linked_summary ? formatINR(analytics.linked_summary.linked_expenditure) : '₹330.66 Cr'}
          />

          <MetricCard
            label="Linked Vouchers"
            value={analytics.linked_summary ? analytics.linked_summary.linked_vouchers.toLocaleString() : '6,995'}
            subtext="4.88% of vouchers"
          />

        </div>
      ) : null}

      {/* Modern Tabs Navigation Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Expenditure Overview' },
          { id: 'vendors', label: 'Vendor Intelligence', count: analytics ? analytics.total_vendors.toLocaleString() : null },
          { id: 'payments', label: 'Payment Monitoring', count: analytics ? `${((analytics.in_progress_count / analytics.total_vouchers) * 100).toFixed(1)}%` : null },
          { id: 'review', label: 'Match Review Queue', count: reviewSummary ? reviewSummary.total_pending.toLocaleString() : '32,863' },
          { id: 'explorer', label: 'Voucher Explorer' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXPENDITURE OVERVIEW & CHARTS                                      */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-6">
          
          {/* Expenditure Overview Large Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">National Expenditure Trends</h3>
                <p className="text-xs text-slate-500">Monthly disbursed amounts across 18th Lok Sabha transactions</p>
              </div>
              <span className="text-xs font-semibold text-slate-800 self-start sm:self-auto">
                Total: {formatINR(analytics.total_expenditure)}
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeline || analytics.monthly_trend || []} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 11 }} 
                    tickFormatter={(v) => `₹${(v / 10000000).toFixed(0)}Cr`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val) => [formatINR(val), 'Disbursed']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total_spent" 
                    stroke="#2563eb" 
                    fill="#3b82f6" 
                    fillOpacity={0.15} 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two-Column Section: Expenditure by State + Top Vendors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Expenditure by State */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Expenditure by State</h3>
                  <p className="text-xs text-slate-500">Top states by total disbursed amount</p>
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.top_states ? analytics.top_states.slice(0, 8) : (analytics.state_breakdown ? analytics.state_breakdown.slice(0, 8) : [])} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <XAxis dataKey="state" stroke="#94a3b8" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 10000000).toFixed(0)}Cr`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val) => [formatINR(val), 'Expenditure']}
                    />
                    <Bar dataKey="total_spent" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Vendors */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Top Commercial Vendors</h3>
                  <p className="text-xs text-slate-500">Vendors with highest cumulative payment disbursement</p>
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.top_vendors ? analytics.top_vendors.slice(0, 8) : []} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 10 }}>
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 10000000).toFixed(0)}Cr`} />
                    <YAxis type="category" dataKey="vendor_name" stroke="#94a3b8" tick={{ fontSize: 10 }} width={80} tickFormatter={(name) => name.length > 10 ? `${name.substring(0, 10)}...` : name} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val) => [formatINR(val), 'Disbursed']}
                    />
                    <Bar dataKey="total_spent" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VENDOR INTELLIGENCE                                                */}
      {/* ========================================================================= */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          
          {/* Vendor Search Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search vendor name..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchVendors(1, null, vendorSearch)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-8 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                />
                {vendorSearch && (
                  <button
                    onClick={() => {
                      setVendorSearch('');
                      fetchVendors(1, null, '');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => fetchVendors(1, null, vendorSearch)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm whitespace-nowrap"
              >
                Search
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Sort:</span>
              <select
                value={vendorSort}
                onChange={(e) => {
                  const newSort = e.target.value;
                  setVendorSort(newSort);
                  fetchVendors(1, newSort);
                }}
                className="bg-white border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
              >
                <option value="total_spent">Total Expenditure</option>
                <option value="voucher_count">Transactions Count</option>
                <option value="mp_count">MPs Count</option>
                <option value="vendor_name">Vendor Name</option>
              </select>
            </div>
          </div>

          {/* Vendors Table */}
          {vendorLoading ? (
            <SkeletonTable rows={8} cols={6} />
          ) : vendors.length === 0 ? (
            <EmptyState
              title="No vendors found"
              description="No commercial vendor names matched your search term."
              actionLabel="Reset Search"
              onAction={() => {
                setVendorSearch('');
                fetchVendors(1, null, '');
              }}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3.5">Vendor</th>
                      <th className="py-2.5 px-3.5">Expenditure</th>
                      <th className="py-2.5 px-3.5">Transactions</th>
                      <th className="py-2.5 px-3.5">MPs</th>
                      <th className="py-2.5 px-3.5">Concentration</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendors.map((v, idx) => {
                      const voucherCount = v.voucher_count ?? v.transaction_count ?? 0;
                      const mpCount = v.mp_count ?? v.unique_mps ?? 1;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-slate-900 max-w-xs truncate" title={v.vendor_name}>
                            {v.vendor_name}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                            {formatINR(v.total_spent)}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 whitespace-nowrap">
                            {Number(voucherCount).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 whitespace-nowrap">
                            {mpCount} MP(s)
                          </td>
                          <td className="py-2.5 px-3.5">
                            {v.risk_flags && v.risk_flags.length > 0 ? (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                {v.risk_flags[0]}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Normal</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => fetchVendorDossier(v.vendor_name)}
                              disabled={dossierLoading}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              View Dossier →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Page {vendorPagination.page} of {vendorPagination.total_pages || 1} ({(vendorPagination.total || 0).toLocaleString()} vendors)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={vendorPagination.page <= 1}
                    onClick={() => fetchVendors(vendorPagination.page - 1)}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    disabled={vendorPagination.page >= (vendorPagination.total_pages || 1)}
                    onClick={() => fetchVendors(vendorPagination.page + 1)}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PAYMENT MONITORING                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && analytics && (
        <div className="space-y-4">
          
          {/* Simple Horizontal Stacked Visualization */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Pending Disbursement Watchlist ({formatINR(analytics.in_progress_amount)} In-Progress)
                </h3>
                <p className="text-xs text-slate-500">
                  Transactions with pending or in-progress banking settlement
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPaymentFilter('Payment In-Progress');
                    fetchPaymentMonitoring('Payment In-Progress');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    paymentFilter === 'Payment In-Progress'
                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  In-Progress ({analytics.total_vouchers ? (((analytics.in_progress_count / analytics.total_vouchers) * 100).toFixed(2)) : '3.67'}%)
                </button>
                <button
                  onClick={() => {
                    setPaymentFilter('Payment Success');
                    fetchPaymentMonitoring('Payment Success');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    paymentFilter === 'Payment Success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Success ({analytics.total_vouchers ? ((100 - (analytics.in_progress_count / analytics.total_vouchers) * 100).toFixed(2)) : '96.33'}%)
                </button>
              </div>
            </div>

            {/* Clean Progress Stack */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full transition-all" 
                style={{ width: `${(100 - (analytics.in_progress_count / analytics.total_vouchers) * 100).toFixed(2)}%` }} 
                title="Cleared"
              />
              <div 
                className="bg-amber-400 h-full transition-all" 
                style={{ width: `${((analytics.in_progress_count / analytics.total_vouchers) * 100).toFixed(2)}%` }} 
                title="In Progress"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Cleared: {formatINR(analytics.total_expenditure - analytics.in_progress_amount)} ({analytics.total_vouchers ? ((100 - (analytics.in_progress_count / analytics.total_vouchers) * 100).toFixed(2)) : '0.00'}%)</span>
              <span>In-Progress: {formatINR(analytics.in_progress_amount)} ({analytics.total_vouchers ? (((analytics.in_progress_count / analytics.total_vouchers) * 100).toFixed(2)) : '0.00'}%)</span>
            </div>
          </div>

          {/* Vouchers Table */}
          {paymentLoading ? (
            <SkeletonTable rows={8} cols={6} />
          ) : paymentVouchers.length === 0 ? (
            <EmptyState
              title="No vouchers in this status"
              description="No disbursement records match the selected payment status filter."
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3.5">Date</th>
                      <th className="py-2.5 px-3.5">Work Title</th>
                      <th className="py-2.5 px-3.5">Amount</th>
                      <th className="py-2.5 px-3.5">Vendor</th>
                      <th className="py-2.5 px-3.5">State & MP</th>
                      <th className="py-2.5 px-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentVouchers.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5 text-slate-500 font-mono whitespace-nowrap">{v.expenditure_date}</td>
                        <td className="py-2.5 px-3.5 font-medium text-slate-900 max-w-sm truncate" title={v.work}>{v.work}</td>
                        <td className="py-2.5 px-3.5 font-semibold text-slate-900 whitespace-nowrap">{formatINR(v.expenditure_amount)}</td>
                        <td className="py-2.5 px-3.5 text-slate-700 max-w-xs truncate" title={v.vendor_name}>{v.vendor_name}</td>
                        <td className="py-2.5 px-3.5">
                          <div className="text-slate-800">{v.state}</div>
                          <div className="text-[10px] text-slate-400">{v.loksabha_MP_name}</div>
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <StatusBadge status={v.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MATCH REVIEW QUEUE                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          
          {/* Review Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-medium">Confidence:</span>
              {['ALL', 'MEDIUM', 'LOW'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setReviewConfidence(lvl);
                    fetchReviewQueue(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    reviewConfidence === lvl
                      ? 'bg-slate-900 text-white font-medium'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={reviewStatus}
                onChange={(e) => {
                  setReviewStatus(e.target.value);
                  fetchReviewQueue(1);
                }}
                className="bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-medium focus:outline-none shadow-sm cursor-pointer"
              >
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved Links</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {reviewActionMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
              {reviewActionMessage}
            </div>
          )}

          {/* Candidate Review Table */}
          {reviewLoading ? (
            <SkeletonTable rows={6} cols={7} />
          ) : reviewQueue.length === 0 ? (
            <EmptyState
              title="Review queue empty"
              description="No candidate matches currently pending review under this filter."
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3.5">Expenditure</th>
                      <th className="py-2.5 px-3.5">Candidate Project</th>
                      <th className="py-2.5 px-3.5">MP</th>
                      <th className="py-2.5 px-3.5">Constituency</th>
                      <th className="py-2.5 px-3.5">Similarity</th>
                      <th className="py-2.5 px-3.5">Confidence</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviewQueue.map((item, idx) => {
                      const cand = item.candidate_projects && item.candidate_projects[0];
                      const simPct = Math.round(item.similarity_score * 100);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3.5 max-w-xs">
                            <div className="font-medium text-slate-900 truncate" title={item.expenditure_work}>
                              {item.expenditure_work}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {formatINR(item.expenditure_amount)} • {item.vendor_name}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 max-w-xs">
                            {cand ? (
                              <div>
                                <div className="font-medium text-slate-800 truncate" title={cand.work}>
                                  {cand.work}
                                </div>
                                <div className="text-[10px] text-blue-600 font-mono">
                                  #{cand.project_id} ({formatINR(cand.allocation_amount)})
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No direct title candidate</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 font-medium text-slate-800">
                            {item.loksabha_MP_name || 'N/A'}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600">
                            {item.implementing_district_per_source}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="font-semibold text-slate-800">{simPct}%</span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                              item.match_confidence === 'MEDIUM' 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {item.match_confidence}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleReviewAction(item.match_id, 'reject')}
                                className="px-2 py-1 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 rounded text-xs transition-colors"
                              >
                                Reject
                              </button>
                              {cand && (
                                <button
                                  onClick={() => handleReviewAction(item.match_id, 'approve', cand.project_id, 'Approved by Administrative Auditor')}
                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs transition-colors"
                                >
                                  Review →
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Review Pagination */}
              <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Page {reviewPagination.page} of {reviewPagination.total_pages} ({reviewPagination.total.toLocaleString()} candidate matches)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={reviewPagination.page <= 1}
                    onClick={() => fetchReviewQueue(reviewPagination.page - 1)}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    disabled={reviewPagination.page >= reviewPagination.total_pages}
                    onClick={() => fetchReviewQueue(reviewPagination.page + 1)}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: VOUCHER EXPLORER                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'explorer' && (
        <div className="space-y-4">
          
          {/* Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search voucher work, MP, vendor..."
                value={expSearch}
                onChange={(e) => setExpSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchExplorer(1)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={() => fetchExplorer(1)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm self-start sm:self-auto"
            >
              Apply Filter
            </button>
          </div>

          {expLoading ? (
            <SkeletonTable rows={8} cols={6} />
          ) : vouchers.length === 0 ? (
            <EmptyState
              title="No vouchers found"
              description="No expenditure vouchers match your search criteria."
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3.5">Date</th>
                      <th className="py-2.5 px-3.5">Work Description</th>
                      <th className="py-2.5 px-3.5">Amount</th>
                      <th className="py-2.5 px-3.5">Vendor</th>
                      <th className="py-2.5 px-3.5">State</th>
                      <th className="py-2.5 px-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vouchers.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5 text-slate-500 font-mono whitespace-nowrap">{v.expenditure_date}</td>
                        <td className="py-2.5 px-3.5 font-medium text-slate-900 max-w-sm truncate" title={v.work}>{v.work}</td>
                        <td className="py-2.5 px-3.5 font-semibold text-slate-900 whitespace-nowrap">{formatINR(v.expenditure_amount)}</td>
                        <td className="py-2.5 px-3.5 text-slate-700 max-w-xs truncate" title={v.vendor_name}>{v.vendor_name}</td>
                        <td className="py-2.5 px-3.5 text-slate-600">{v.state}</td>
                        <td className="py-2.5 px-3.5 text-right">
                          <StatusBadge status={v.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Page {voucherPagination.page} of {voucherPagination.total_pages} ({voucherPagination.total.toLocaleString()} records)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={voucherPagination.page <= 1}
                    onClick={() => fetchExplorer(voucherPagination.page - 1)}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    disabled={voucherPagination.page >= voucherPagination.total_pages}
                    onClick={() => fetchExplorer(voucherPagination.page + 1)}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VENDOR DOSSIER                                                     */}
      {/* ========================================================================= */}
      {selectedVendorDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-3xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Vendor Profile</span>
                <h3 className="text-base font-semibold text-slate-900">
                  {selectedVendorDossier.summary?.vendor_name || selectedVendorDossier.vendor_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVendorDossier(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Total Received</span>
                <span className="text-sm font-semibold text-slate-900 mt-0.5 block">{formatINR(selectedVendorDossier.summary?.total_spent)}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Vouchers</span>
                <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                  {Number(selectedVendorDossier.summary?.voucher_count ?? selectedVendorDossier.summary?.transaction_count ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">MPs Connected</span>
                <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                  {selectedVendorDossier.summary?.mp_count ?? selectedVendorDossier.summary?.unique_mps ?? 1}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Active States</span>
                <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                  {selectedVendorDossier.summary?.state_count ?? selectedVendorDossier.summary?.unique_districts ?? 1}
                </span>
              </div>
            </div>

            {/* MPs Served Breakdown */}
            {selectedVendorDossier.mps_served && selectedVendorDossier.mps_served.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-800 mb-2">MPs Engaged</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">MP Name</th>
                        <th className="py-2 px-3">Constituency & State</th>
                        <th className="py-2 px-3">Vouchers</th>
                        <th className="py-2 px-3">Total Spend</th>
                        <th className="py-2 px-3">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedVendorDossier.mps_served.map((mp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium text-slate-900">{mp.mp_name}</td>
                          <td className="py-2 px-3 text-slate-600">{mp.constituency ? `${mp.constituency}, ` : ''}{mp.state}</td>
                          <td className="py-2 px-3 text-slate-600">{mp.vouchers_with_mp}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{formatINR(mp.spend_with_mp)}</td>
                          <td className="py-2 px-3 text-slate-600">{mp.spend_percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Vouchers list */}
            <div>
              <h4 className="text-xs font-semibold text-slate-800 mb-2">Recent Disbursed Vouchers</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs max-h-56 overflow-y-auto">
                <table className="w-full text-left text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Work Title</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedVendorDossier.recent_vouchers || selectedVendorDossier.vouchers || []).slice(0, 15).map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500 font-mono whitespace-nowrap">{v.expenditure_date}</td>
                        <td className="py-2 px-3 text-slate-900 max-w-xs truncate" title={v.work}>{v.work}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{formatINR(v.expenditure_amount)}</td>
                        <td className="py-2 px-3"><StatusBadge status={v.payment_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedVendorDossier(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
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
