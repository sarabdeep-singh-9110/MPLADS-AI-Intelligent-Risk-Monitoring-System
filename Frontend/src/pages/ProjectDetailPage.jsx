import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Save, 
  Landmark, 
  Info,
  ShieldCheck
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import GlobalDisclaimer from '../components/GlobalDisclaimer';
import RiskBadge from '../components/ui/RiskBadge';
import StatusBadge from '../components/ui/StatusBadge';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import ExecutionEvidenceSection from '../components/ExecutionEvidenceSection';

export default function ProjectDetailPage({ projectId, onBack, onOpenAiCopilot }) {
  const [activeProjectId, setActiveProjectId] = useState(projectId);
  const [projectData, setProjectData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [financialLoading, setFinancialLoading] = useState(true);
  const [error, setError] = useState(null);

  // Investigation form state
  const [status, setStatus] = useState('NEW');
  const [priority, setPriority] = useState('MEDIUM');
  const [officerNotes, setOfficerNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    setActiveProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    if (activeProjectId) fetchProjectDetail(activeProjectId);
  }, [activeProjectId]);

  const fetchProjectDetail = async (targetId = activeProjectId) => {
    setLoading(true);
    setFinancialLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${targetId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      setProjectData(json);
      const project = json.data;
      if (project) {
        setStatus(project.investigation_status || 'NEW');
        setPriority(project.investigation_priority || 'MEDIUM');
        setOfficerNotes(project.officer_notes || '');
      }

      // Fetch linked financial expenditures
      try {
        const finRes = await fetch(`${API_BASE_URL}/api/projects/${targetId}/expenditures`);
        if (finRes.ok) {
          const finJson = await finRes.json();
          setFinancialData(finJson);
        }
      } catch (finErr) {
        console.warn('Could not load financial data:', finErr);
      } finally {
        setFinancialLoading(false);
      }

    } catch (err) {
      console.error('Error fetching project detail:', err);
      setError('Backend service unavailable or project record not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInvestigation = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/investigations/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          priority,
          officer_notes: officerNotes
        })
      });
      const json = await res.json();
      if (res.ok) {
        setSaveMessage('✓ Investigation updated successfully');
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        setSaveMessage(`Error: ${json.error || 'Failed to update'}`);
      }
    } catch (err) {
      setSaveMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-200 rounded w-32 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard className="lg:col-span-2" />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !projectData || !projectData.data) {
    return (
      <div className="space-y-4">
        <button 
          onClick={onBack} 
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> <span>Back</span>
        </button>
        <div className="bg-white border border-red-200 rounded-xl p-6 text-center space-y-2 shadow-sm">
          <p className="text-xs text-red-600">{error || 'Project record not found.'}</p>
        </div>
      </div>
    );
  }

  const { data: project } = projectData;
  const amountLakhs = (project.allocation_amount / 100000).toFixed(2);
  const ruleReasons = project.rule_risk_reasons 
    ? project.rule_risk_reasons.split(' | ') 
    : (project.hybrid_risk_reasons ? project.hybrid_risk_reasons.split(' | ') : ['Standard administrative parameters checked']);

  return (
    <div className="space-y-6">
      
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <StatusBadge status={project.status} />
          <button
            onClick={() => onOpenAiCopilot && onOpenAiCopilot(project.project_id)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Copilot Explanation</span>
          </button>
        </div>
      </div>

      <GlobalDisclaimer />

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Project Information */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono font-medium text-slate-400">PROJECT #{project.project_id}</div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5">
                {project.work}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Recommending MP</span>
              <span className="text-slate-900 font-semibold mt-0.5 block">
                {project.mp_name || 'N/A'} <span className="text-slate-500 font-normal">({project.house || 'Lok Sabha'})</span>
              </span>
            </div>

            <div>
              <span className="text-slate-400 block">Work Category</span>
              <span className="text-slate-800 font-medium mt-0.5 block">
                {project.category || 'General Works'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block">State & Constituency</span>
              <span className="text-slate-800 font-medium mt-0.5 block">
                {project.constituency}, {project.state}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block">Location (Block / Village)</span>
              <span className="text-slate-800 font-medium mt-0.5 block">
                {project.block !== 'Unknown' ? project.block : 'N/A'} / {project.village !== 'Unknown' ? project.village : 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block">Allocation Amount</span>
              <span className="text-slate-900 font-semibold text-sm mt-0.5 block">
                ₹{amountLakhs} Lakhs
              </span>
            </div>

            <div>
              <span className="text-slate-400 block">Recommendation Date</span>
              <span className="text-slate-800 font-medium mt-0.5 block">
                {project.recommended_date || 'Recorded in Database'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block">Administrative Status</span>
              <div className="mt-1">
                <StatusBadge status={project.status} />
              </div>
            </div>

            <div>
              <span className="text-slate-400 block">Investigation Status</span>
              <span className="text-slate-800 font-medium mt-0.5 block">
                {project.investigation_status || 'NEW'}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Risk Summary Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Risk Summary
            </h3>
            <RiskBadge 
              level={project.hybrid_risk_level} 
              score={project.hybrid_risk_score} 
              showScore={false} 
            />
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-semibold text-slate-900">
                {project.hybrid_risk_score}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ 100</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full ${
                  project.hybrid_risk_score >= 80 ? 'bg-red-500' :
                  project.hybrid_risk_score >= 60 ? 'bg-orange-500' :
                  project.hybrid_risk_score >= 40 ? 'bg-amber-400' :
                  'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(project.hybrid_risk_score, 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Rule-Based Score</span>
              <span className="font-semibold text-slate-800">{project.rule_risk_score || project.risk_score} / 100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ML Anomaly Score</span>
              <span className="font-semibold text-slate-800">
                {project.ml_anomaly_score ? (Math.round(project.ml_anomaly_score * 10) / 10).toFixed(1) : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ML Outlier Flag</span>
              <span className={`font-medium ${project.ml_anomaly_flag === -1 ? 'text-red-600' : 'text-slate-600'}`}>
                {project.ml_anomaly_flag === -1 ? 'Outlier (-1)' : 'Normal'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            <strong>Formula:</strong> 60% Rule-Based Score + 40% Isolation Forest ML Feature Anomaly.
          </div>
        </div>

      </div>

      {/* RISK SIGNALS LIST */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Risk Signals & Indicators
        </h3>
        <p className="text-xs text-slate-500">
          Individual indicators evaluated by the rule engine and multivariate isolation model
        </p>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
          {ruleReasons.map((signal, idx) => (
            <div key={idx} className="p-3 bg-slate-50/50 flex items-start gap-2.5 text-xs text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
              <div className="flex-1">
                <span className="font-medium text-slate-900">{signal}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-slate-400 pt-1">
          Recommended verification: <span className="text-slate-700 font-medium">{project.recommended_action || 'Administrative verification recommended'}</span>
        </div>
      </div>

      {/* EXECUTION & FIELD VERIFICATION EVIDENCE */}
      <ExecutionEvidenceSection 
        projectId={project.project_id}
        onOpenAiCopilot={onOpenAiCopilot}
        onSelectProject={setActiveProjectId}
      />

      {/* FINANCIAL ACTIVITY & VENDOR DISBURSEMENTS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Financial Activity & Vendor Disbursements
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              18th Lok Sabha expenditure records • Dataful Dataset 22565
            </p>
          </div>

          {financialData && financialData.has_linked_expenditures && financialData.financial_risk && (
            <span className="text-xs px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Financial Score: {financialData.financial_risk.score}/100 ({financialData.financial_risk.level})
            </span>
          )}
        </div>

        {financialLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Checking linked financial records...
          </div>
        ) : financialData && financialData.has_linked_expenditures ? (
          <div className="space-y-4">
            {/* 4 Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Total Disbursed</span>
                <span className="text-base font-semibold text-slate-900 block mt-0.5">
                  ₹{(financialData.financial_summary.total_spent / 100000).toFixed(2)} Lakhs
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {financialData.financial_summary.disbursement_percentage}% of allocation
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Linked Vouchers</span>
                <span className="text-base font-semibold text-slate-900 block mt-0.5">
                  {financialData.financial_summary.total_vouchers}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  High-confidence matches
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Primary Vendor</span>
                <span className="text-xs font-semibold text-slate-900 truncate block mt-0.5" title={financialData.financial_summary.primary_vendor}>
                  {financialData.financial_summary.primary_vendor || 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {financialData.financial_summary.unique_vendors_count} vendor(s)
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Disbursement Status</span>
                <span className={`text-xs font-semibold block mt-0.5 ${
                  financialData.financial_summary.in_progress_vouchers > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  {financialData.financial_summary.in_progress_vouchers > 0 
                    ? `${financialData.financial_summary.in_progress_vouchers} In-Progress` 
                    : 'All Cleared'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {financialData.financial_summary.unique_agencies_count} agency(ies)
                </span>
              </div>
            </div>

            {/* Vouchers Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <div className="bg-slate-50 px-3.5 py-2 font-medium text-slate-700 border-b border-slate-200 flex items-center justify-between">
                <span>Linked Disbursal Vouchers ({financialData.vouchers.length})</span>
                <span className="text-[10px] text-slate-400">Programmatically matched</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-slate-700">
                  <thead className="bg-white text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Voucher Work Title</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">Vendor</th>
                      <th className="py-2 px-3">Agency</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {financialData.vouchers.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500 font-mono whitespace-nowrap">{v.expenditure_date}</td>
                        <td className="py-2 px-3 text-slate-900 max-w-[240px] truncate" title={v.work}>{v.work}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          ₹{(parseFloat(v.expenditure_amount) / 100000).toFixed(2)} L
                        </td>
                        <td className="py-2 px-3 text-slate-700 max-w-[150px] truncate" title={v.vendor_name}>{v.vendor_name}</td>
                        <td className="py-2 px-3 text-slate-500 max-w-[150px] truncate" title={v.implementing_agency_name}>{v.implementing_agency_name}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <StatusBadge status={v.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3 text-xs">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-800">No verified expenditure records linked to this project.</div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                This project recommendation has not been linked to any 18th Lok Sabha expenditure vouchers under current algorithmic matching thresholds. Candidate matches remain in the review queue to preserve data integrity.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* INVESTIGATION WORKFLOW */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Administrative Investigation Decision
            </h3>
          </div>
          {saveMessage && (
            <span className={`text-xs font-medium ${saveMessage.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          )}
        </div>

        <form onSubmit={handleUpdateInvestigation} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
              >
                <option value="NEW">NEW (Pending Administrative Review)</option>
                <option value="UNDER_REVIEW">UNDER REVIEW (Field Inspection Active)</option>
                <option value="VERIFIED">VERIFIED (Confirmed Valid & Compliant)</option>
                <option value="CLEARED">CLEARED (Audit Discrepancy Resolved)</option>
                <option value="ESCALATED">ESCALATED (High Administrative Flag)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Audit Priority:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Officer Notes:</label>
            <textarea
              rows="2"
              placeholder="Enter official audit remarks or field verification findings..."
              value={officerNotes}
              onChange={(e) => setOfficerNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Updated: {project.investigation_updated_at || 'Never'}
            </span>
            <button
              type="submit"
              disabled={saving}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Decision'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
