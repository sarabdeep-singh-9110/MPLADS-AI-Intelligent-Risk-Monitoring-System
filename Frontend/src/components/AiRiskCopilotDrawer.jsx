import React, { useState, useEffect } from 'react';
import { X, Bot, CheckCircle2, FileText, Send, AlertCircle, RefreshCw, ShieldAlert, Info } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function AiRiskCopilotDrawer({ projectId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    if (projectId) {
      fetchExplanation(projectId);
    }
  }, [projectId]);

  const fetchExplanation = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id })
      });
      const json = await res.json();
      if (res.ok) {
        setExplanation(json.explanation);
      } else {
        setError(json.error || 'Failed to fetch AI explanation');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuery = (e) => {
    e.preventDefault();
    if (!userQuery.trim() || !explanation) return;

    const newMsg = { sender: 'user', text: userQuery };
    setChatHistory((prev) => [...prev, newMsg]);

    const q = userQuery.toLowerCase();
    let reply = `Project #${explanation.project_id} has a priority risk score of ${explanation.hybrid_risk_score || explanation.risk_score}/100 based on recorded database indicators.`;
    
    if (q.includes('why') || q.includes('evidence') || q.includes('reason')) {
      reply = `Extracted Database Evidence:\n• ${explanation.evidence_points.join('\n• ')}`;
    } else if (q.includes('action') || q.includes('verify') || q.includes('recommend')) {
      reply = `Recommended Verification Steps:\n1. Administrative review of project recommendation records.\n2. Verification of financial disbursement vouchers.\n3. Physical inspection by authorized district officials (IDA).`;
    }

    setTimeout(() => {
      setChatHistory((prev) => [...prev, { sender: 'ai', text: reply }]);
    }, 250);

    setUserQuery('');
  };

  if (!projectId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg h-full p-6 flex flex-col justify-between border-l border-slate-200 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">AI Decision Support</h3>
              <p className="text-xs text-slate-500">Evidence-based project explanation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-4 text-xs">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span>Fetching grounded evidence...</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          ) : explanation ? (
            <>
              {/* Risk Summary */}
              <div className="space-y-1">
                <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
                  Summary
                </span>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-slate-800 leading-relaxed">
                  {explanation.risk_summary}
                </div>
              </div>

              {/* Evidence Indicators */}
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
                  Database Evidence Indicators
                </span>
                <div className="space-y-1.5">
                  {explanation.evidence_points.map((ev, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Verification */}
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
                  Recommended Verification
                </span>
                <div className="space-y-1.5">
                  {explanation.recommended_verification.map((item, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-900 flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                {explanation.disclaimer}
              </div>

              {/* Chat Thread */}
              {chatHistory.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                    Query Thread
                  </span>
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg text-xs leading-relaxed whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-slate-900 text-white ml-6'
                          : 'bg-slate-50 border border-slate-200 text-slate-800 mr-6'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Input Box */}
        <form onSubmit={handleSendQuery} className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <input
            type="text"
            placeholder="Ask about this project's evidence..."
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
}
