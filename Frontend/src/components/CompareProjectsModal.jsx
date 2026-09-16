import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  FileText, 
  MapPin, 
  User, 
  AlertTriangle,
  ArrowRight,
  Send
} from 'lucide-react';
import RiskBadge from './ui/RiskBadge';
import StatusBadge from './ui/StatusBadge';
import { API_BASE_URL } from '../config';

export default function CompareProjectsModal({ 
  pair, 
  onClose, 
  onOpenProjectDetail,
  onStatusUpdated 
}) {
  if (!pair) return null;

  const { project_a: a, project_b: b } = pair;
  const [status, setStatus] = useState(pair.status || 'REQUIRES_VERIFICATION');
  const [officerNotes, setOfficerNotes] = useState(pair.officer_notes || '');
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);

  const reasons = pair.similarity_reasons || [];

  const handleSaveStatus = async () => {
    setSaving(true);
    setSaveFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/similar-works/${pair.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          officer_notes: officerNotes
        })
      });
      const json = await res.json();
      if (res.ok) {
        setSaveFeedback({ type: 'success', message: 'Review status saved successfully' });
        if (onStatusUpdated) onStatusUpdated(pair.id, status, officerNotes);
        setTimeout(() => setSaveFeedback(null), 3000);
      } else {
        setSaveFeedback({ type: 'error', message: json.error || 'Failed to save' });
      }
    } catch (err) {
      setSaveFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerification = async () => {
    setSaving(true);
    setSaveFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/similar-works/${pair.id}/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: officerNotes })
      });
      const json = await res.json();
      if (res.ok) {
        setStatus('UNDER_REVIEW');
        setSaveFeedback({ type: 'success', message: 'Both projects escalated to Field Verification Queue' });
        if (onStatusUpdated) onStatusUpdated(pair.id, 'UNDER_REVIEW', officerNotes);
        setTimeout(() => setSaveFeedback(null), 3500);
      } else {
        setSaveFeedback({ type: 'error', message: json.error || 'Failed to escalate' });
      }
    } catch (err) {
      setSaveFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const formatAmountLakhs = (val) => {
    const num = Number(val) || 0;
    return `₹${(num / 100000).toFixed(2)} L`;
  };

  const isExactMatch = (valA, valB) => {
    if (!valA || !valB) return false;
    return String(valA).trim().toLowerCase() === String(valB).trim().toLowerCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 modal-backdrop">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Similar Works Analysis
              </span>
              <span className="text-xs font-mono text-slate-400">#PAIR-{pair.id}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                pair.similarity_score >= 90 ? 'bg-red-50 text-red-700 border border-red-200' :
                pair.similarity_score >= 80 ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {pair.similarity_score}% Similarity
              </span>

              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                Potentially Similar Work — Requires Verification
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-700">
          
          {/* Similarity Reason Badges */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Detected Correlation Signals:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {reasons.map((r, idx) => (
                <span 
                  key={idx} 
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* Side-by-side Project Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* PROJECT A */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Project A</span>
                  <div className="text-xs font-mono font-semibold text-slate-900">#{a.project_id}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={a.status} />
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenProjectDetail) onOpenProjectDetail(a.project_id, 'similar');
                    }}
                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Open Project A Detail"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Work Description</span>
                <p className="text-xs font-medium text-slate-900 mt-0.5 leading-relaxed">
                  {a.work}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <span className="text-[11px] text-slate-400 block">Recommending MP</span>
                  <span className="font-semibold text-slate-800 block truncate">
                    {a.mp_name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Category</span>
                  <span className="text-slate-800 block truncate">
                    {a.category || 'General'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">State & Constituency</span>
                  <span className="text-slate-800 block truncate">
                    {a.constituency}, {a.state}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Block / Village</span>
                  <span className="text-slate-800 block truncate">
                    {a.block || 'N/A'} / {a.village || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Allocation Amount</span>
                  <span className="text-sm font-bold text-slate-900 block">
                    {formatAmountLakhs(a.allocation_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Recommendation Date</span>
                  <span className="text-slate-700 block">
                    {a.recommended_date || 'Recorded'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Hybrid Risk:</span>
                <RiskBadge level={a.hybrid_risk_level} score={a.hybrid_risk_score} />
              </div>
            </div>

            {/* PROJECT B */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Project B</span>
                  <div className="text-xs font-mono font-semibold text-slate-900">#{b.project_id}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={b.status} />
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenProjectDetail) onOpenProjectDetail(b.project_id, 'similar');
                    }}
                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Open Project B Detail"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Work Description</span>
                <p className="text-xs font-medium text-slate-900 mt-0.5 leading-relaxed">
                  {b.work}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <span className="text-[11px] text-slate-400 block">Recommending MP</span>
                  <span className="font-semibold text-slate-800 block truncate">
                    {b.mp_name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Category</span>
                  <span className="text-slate-800 block truncate">
                    {b.category || 'General'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">State & Constituency</span>
                  <span className="text-slate-800 block truncate">
                    {b.constituency}, {b.state}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Block / Village</span>
                  <span className="text-slate-800 block truncate">
                    {b.block || 'N/A'} / {b.village || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Allocation Amount</span>
                  <span className="text-sm font-bold text-slate-900 block">
                    {formatAmountLakhs(b.allocation_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Recommendation Date</span>
                  <span className="text-slate-700 block">
                    {b.recommended_date || 'Recorded'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Hybrid Risk:</span>
                <RiskBadge level={b.hybrid_risk_level} score={b.hybrid_risk_score} />
              </div>
            </div>

          </div>

          {/* Administrative Review & Action Section */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                Administrative Verification Decision
              </span>
              {saveFeedback && (
                <span className={`text-[11px] font-medium ${
                  saveFeedback.type === 'success' ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {saveFeedback.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">
                  Verification Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="REQUIRES_VERIFICATION">Requires Verification</option>
                  <option value="UNDER_REVIEW">Under Field Review</option>
                  <option value="VERIFIED_LEGITIMATE">Verified Legitimate (Separate Works)</option>
                  <option value="POTENTIALLY_DUPLICATE">Potentially Duplicate (Overlap Flag)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-500 font-medium block mb-1">
                  Officer Review Notes
                </label>
                <input
                  type="text"
                  placeholder="Record verification findings or site inspection directives..."
                  value={officerNotes}
                  onChange={(e) => setOfficerNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={saving}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium rounded-lg text-xs transition-colors shadow-2xs disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>

              <button
                type="button"
                onClick={handleSendVerification}
                disabled={saving || status === 'UNDER_REVIEW'}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>Send for Verification</span>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 text-right flex items-center justify-between text-[11px] text-slate-500">
          <span>* High similarity flag does not confirm duplication. Administrative verification is mandatory.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
