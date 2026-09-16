import React, { useState } from 'react';
import { X, Sparkles, Save, MapPin, AlertCircle, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../config';
import RiskBadge from './ui/RiskBadge';

export default function ProjectDeepDiveModal({ projectData, onClose, onOpenAiCopilot, onUpdateProject }) {
  if (!projectData) return null;

  const { data: project, benchmark } = projectData;

  const [investigationStatus, setInvestigationStatus] = useState(project.investigation_status || 'New');
  const [officerNotes, setOfficerNotes] = useState(project.officer_notes || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const costRatio = project.amount_vs_work_median ? project.amount_vs_work_median.toFixed(1) : '1.0';
  const workTypeMedianLakhs = project.work_type_median_amount ? (project.work_type_median_amount / 100000).toFixed(2) : (benchmark?.category_median_amount ? (benchmark.category_median_amount / 100000).toFixed(2) : '0');
  const amountLakhs = (project.allocation_amount / 100000).toFixed(2);

  const reasonsList = project.risk_reasons ? project.risk_reasons.split(' | ') : [];

  const handleSaveInvestigation = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const pid = project.project_id || project.id;
      const res = await fetch(`${API_BASE_URL}/api/investigations/${pid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: investigationStatus,
          officer_notes: officerNotes
        })
      });
      if (res.ok) {
        setSaveSuccess(true);
        if (onUpdateProject) onUpdateProject(pid, investigationStatus, officerNotes);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving investigation update:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl p-6 space-y-5 relative border border-slate-200 shadow-xl text-slate-800">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="pr-8 space-y-1">
          <div className="flex items-center gap-2">
            <RiskBadge level={project.risk_level} score={project.risk_score} />
            <span className="text-xs font-mono text-slate-400">Project #{project.id}</span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">{project.work}</h2>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {project.block !== 'Unknown' ? `${project.block}, ` : ''}{project.constituency}, {project.state}
          </p>
        </div>

        {/* Risk Disclaimer */}
        <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-amber-950 mr-1">Administrative Notice:</span>
            <span>Risk scores indicate statistical anomalies for prioritization and are not proof of fraud or wrongdoing.</span>
          </div>
        </div>

        {/* Score & Benchmark Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block">Risk Score</span>
            <span className="text-2xl font-semibold text-slate-900 mt-1 block">{project.risk_score} / 100</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{project.risk_level} Level</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block">Allocation vs Median</span>
            <span className="text-lg font-semibold text-slate-900 mt-1 block">₹{amountLakhs} L</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">{costRatio}x work-type median</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block">Recommending MP</span>
            <span className="text-xs font-semibold text-slate-900 mt-1 truncate block">{project.mp_name}</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">{project.house}</span>
          </div>
        </div>

        {/* Detected Anomaly Indicators */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Evaluated Risk Signals
          </span>
          <div className="space-y-1.5">
            {reasonsList.map((reason, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2 text-xs text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Investigation Form */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Administrative Decision</span>
            {saveSuccess && (
              <span className="text-emerald-700 font-medium text-xs">✓ Status Saved</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Status:</label>
              <select
                value={investigationStatus}
                onChange={(e) => setInvestigationStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
              >
                <option value="New">New</option>
                <option value="Under Review">Under Review</option>
                <option value="Verified">Verified</option>
                <option value="Cleared">Cleared</option>
                <option value="Escalated">Escalated</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Action:</label>
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs">
                {project.recommended_action || 'Administrative verification recommended'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Notes:</label>
            <textarea
              rows="2"
              placeholder="Enter official audit remarks or ground inspection notes..."
              value={officerNotes}
              onChange={(e) => setOfficerNotes(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={handleSaveInvestigation}
              disabled={saving}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Decision'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Need grounded evidence explanation?
          </span>
          <button
            onClick={() => {
              onClose();
              onOpenAiCopilot(project.id);
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch AI Copilot</span>
          </button>
        </div>

      </div>
    </div>
  );
}
