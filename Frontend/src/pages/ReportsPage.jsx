import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  FileText, 
  Printer, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import GlobalDisclaimer from '../components/GlobalDisclaimer';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import { SkeletonMetricsRow } from '../components/ui/SkeletonLoader';

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [highRiskWorks, setHighRiskWorks] = useState([]);
  const [gisStates, setGisStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingType, setExportingType] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, highRiskRes, gisRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/analytics/national`),
        fetch(`${API_BASE_URL}/api/projects/high-risk?limit=50`),
        fetch(`${API_BASE_URL}/api/gis/map-data`)
      ]);

      if (!analyticsRes.ok || !highRiskRes.ok || !gisRes.ok) {
        throw new Error('Failed to fetch backend data for reports');
      }

      const analyticsJson = await analyticsRes.json();
      const highRiskJson = await highRiskRes.json();
      const gisJson = await gisRes.json();

      setSummary(analyticsJson.data);
      setHighRiskWorks(highRiskJson.data || []);
      setGisStates(gisJson.states || []);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Backend service unavailable. Please ensure the Express API is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const [exportNotification, setExportNotification] = useState(null);

  const handleExportCSV = async (type = 'projects') => {
    setExportingType(type);
    setExportNotification(null);
    try {
      // 1. Primary: Direct high-performance server stream with UTF-8 BOM
      const serverExportUrl = `${API_BASE_URL}/api/reports/export/${type}?limit=500`;
      const res = await fetch(serverExportUrl);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `MPLADS_${type.toUpperCase()}_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 150);

        setExportNotification({
          type: 'success',
          message: `Successfully downloaded ${filename}`
        });
        setTimeout(() => setExportNotification(null), 5000);
        return;
      }

      // 2. Fallback: Client-side compilation if endpoint is unreachable
      let endpoint = `${API_BASE_URL}/api/projects?limit=100`;
      let filename = `MPLADS_Project_Risk_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      let headers = ['Project_ID', 'MP_Name', 'Work_Description', 'State', 'Constituency', 'Allocation_Amount', 'Rule_Risk_Score', 'ML_Anomaly_Score', 'Hybrid_Risk_Score', 'Hybrid_Risk_Level', 'Status'];

      if (type === 'financial') {
        endpoint = `${API_BASE_URL}/api/expenditures?limit=100`;
        filename = `MPLADS_Financial_Intelligence_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ['Expenditure_ID', 'Date', 'Work_Title', 'Amount', 'Vendor_Name', 'Implementing_Agency', 'State', 'Payment_Status'];
      } else if (type === 'vendors') {
        endpoint = `${API_BASE_URL}/api/expenditures/vendors?limit=100&sortBy=total_spent&sortOrder=DESC`;
        filename = `MPLADS_Vendor_Intelligence_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ['Vendor_Name', 'Total_Spent', 'Transaction_Count', 'Unique_MPs'];
      } else if (type === 'investigations') {
        endpoint = `${API_BASE_URL}/api/investigations?limit=100`;
        filename = `MPLADS_Investigation_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ['Project_ID', 'Work', 'MP_Name', 'State', 'Status', 'Priority', 'Officer_Notes'];
      }

      const fallbackRes = await fetch(endpoint);
      const json = await fallbackRes.json();
      const records = json.data || [];

      if (records.length === 0) {
        setExportNotification({ type: 'warning', message: 'No records available to export for this query.' });
        return;
      }

      const csvRows = ['\uFEFF' + headers.join(',')];

      records.forEach((r) => {
        let row = [];
        if (type === 'financial') {
          row = [
            `"${r.expenditure_id || ''}"`,
            `"${r.expenditure_date || ''}"`,
            `"${String(r.work || '').replace(/"/g, '""')}"`,
            r.expenditure_amount || 0,
            `"${String(r.vendor_name || '').replace(/"/g, '""')}"`,
            `"${String(r.implementing_agency_name || '').replace(/"/g, '""')}"`,
            `"${r.state || ''}"`,
            `"${r.payment_status || ''}"`
          ];
        } else if (type === 'vendors') {
          row = [
            `"${String(r.vendor_name || '').replace(/"/g, '""')}"`,
            r.total_spent || 0,
            r.voucher_count || r.transaction_count || 0,
            r.mp_count || r.unique_mps || 0
          ];
        } else if (type === 'investigations') {
          row = [
            `"${r.project_id || ''}"`,
            `"${String(r.work || '').replace(/"/g, '""')}"`,
            `"${String(r.mp_name || '').replace(/"/g, '""')}"`,
            `"${r.state || ''}"`,
            `"${r.status || 'NEW'}"`,
            `"${r.priority || 'MEDIUM'}"`,
            `"${String(r.officer_notes || '').replace(/"/g, '""')}"`
          ];
        } else {
          row = [
            `"${r.project_id || ''}"`,
            `"${String(r.mp_name || '').replace(/"/g, '""')}"`,
            `"${String(r.work || '').replace(/"/g, '""')}"`,
            `"${r.state || ''}"`,
            `"${r.constituency || ''}"`,
            r.allocation_amount || 0,
            r.rule_risk_score || r.risk_score || 0,
            r.ml_anomaly_score || 0,
            r.hybrid_risk_score || r.risk_score || 0,
            `"${r.hybrid_risk_level || r.risk_level || 'Low'}"`,
            `"${r.status || 'Recommended'}"`
          ];
        }
        csvRows.push(row.join(','));
      });

      const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 150);

      setExportNotification({
        type: 'success',
        message: `Successfully downloaded ${filename}`
      });
      setTimeout(() => setExportNotification(null), 5000);

    } catch (err) {
      console.error('Export error:', err);
      setExportNotification({
        type: 'error',
        message: 'Failed to generate export file. Please check backend connection.'
      });
    } finally {
      setExportingType(null);
    }
  };

  const reportItems = [
    {
      id: 'projects',
      title: 'Project Risk Report',
      description: 'Prioritized works requiring administrative verification based on combined Rule and Isolation Forest ML scoring.',
      lastGenerated: 'Live / Updated on demand (Top 500 priority records)'
    },
    {
      id: 'financial',
      title: 'Financial Intelligence Report',
      description: '18th Lok Sabha expenditure summary, vendor payment vouchers, and auto-linked records from Dataful Dataset 22565.',
      lastGenerated: 'Live database sync (Top 500 voucher sample)'
    },
    {
      id: 'vendors',
      title: 'Vendor Report',
      description: 'Commercial entity expenditure concentration, unique MP linkages, and flagged transaction counts.',
      lastGenerated: 'Active vendors index (Top 500 commercial entities)'
    },
    {
      id: 'investigations',
      title: 'Investigation Report',
      description: 'Administrative verification queue status, audit priorities, and human inspection remarks.',
      lastGenerated: 'Live workflow registry (Active audit tickets)'
    },
    {
      id: 'similar-works',
      title: 'Similar Works Report',
      description: 'Potentially duplicate works identified across identical jurisdiction, MP, description, and allocation proximity.',
      lastGenerated: 'Live duplicate triage (Top 500 candidate pairs)'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <PageHeader
        title="Reports"
        subtitle="Executive administrative reports and exportable audit datasets"
        badge="Export Center"
        badgeType="neutral"
        actions={
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Dossier</span>
          </button>
        }
      />

      {/* Export Status Notification Banner */}
      {exportNotification && (
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
          exportNotification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : exportNotification.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {exportNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{exportNotification.message}</span>
          </div>
          <button 
            onClick={() => setExportNotification(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <GlobalDisclaimer />

      {/* 4 Report Center Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportItems.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  CSV Export
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                {item.lastGenerated}
              </span>
              <button
                onClick={() => handleExportCSV(item.id)}
                disabled={exportingType === item.id}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>{exportingType === item.id ? 'Generating...' : 'Export →'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Export Limitations Notice */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs leading-relaxed">
        <span className="font-semibold text-slate-800 mr-1">Data Export Notice:</span>
        <span>
          Exports retrieve a representative sample of records (up to 100 rows per query) formatted for administrative scrutiny. For full national batch extractions, contact the MoSPI MPLADS administration nodal unit.
        </span>
      </div>

      {/* Summary KPI Cards */}
      {loading ? (
        <SkeletonMetricsRow count={4} />
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Scored Works"
            value={summary.total_projects.toLocaleString()}
            subtext="100% database indexed"
          />
          <MetricCard
            label="Critical Priority Flags"
            value={summary.critical_count.toLocaleString()}
            subtext="Requires priority verification"
            badge="Critical"
            badgeType="danger"
          />
          <MetricCard
            label="High Priority Flags"
            value={summary.high_count.toLocaleString()}
            subtext="Administrative audit required"
            badge="High"
            badgeType="warning"
          />
          <MetricCard
            label="Avg Priority Risk"
            value={`${summary.average_hybrid_risk} / 100`}
            subtext="Rule + ML composite score"
          />
        </div>
      ) : null}

      {/* Preview Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Flagged Works Preview */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-0">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Top Priority Audit Works Preview</h3>
            <span className="text-[11px] text-slate-500">{highRiskWorks.length} Records</span>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-white text-slate-500 text-[10px] uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Project ID</th>
                  <th className="py-2 px-3">State</th>
                  <th className="py-2 px-3">Allocation</th>
                  <th className="py-2 px-3 text-right">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {highRiskWorks.slice(0, 6).map((w) => (
                  <tr key={w.project_id || w.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-medium text-blue-600">#{w.project_id || w.id}</td>
                    <td className="py-2 px-3">{w.state}</td>
                    <td className="py-2 px-3 font-medium">₹{(w.allocation_amount / 100000).toFixed(2)} L</td>
                    <td className="py-2 px-3 text-right font-semibold text-red-600">{w.hybrid_risk_score || w.risk_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* State Summary Preview */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-0">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">State Concentration Summary</h3>
            <span className="text-[11px] text-slate-500">{gisStates.length} States</span>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-white text-slate-500 text-[10px] uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">State</th>
                  <th className="py-2 px-3">Works</th>
                  <th className="py-2 px-3">Critical</th>
                  <th className="py-2 px-3 text-right">Avg Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gisStates.slice(0, 6).map((st) => (
                  <tr key={st.state} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-800">{st.state}</td>
                    <td className="py-2 px-3 text-slate-600">{st.total_projects}</td>
                    <td className="py-2 px-3 text-red-600 font-semibold">{st.critical_count}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-800">{Math.round(st.avg_risk_score * 10) / 10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
