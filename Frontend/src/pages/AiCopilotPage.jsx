import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  CheckCircle2, 
  FileText, 
  Info, 
  ShieldAlert, 
  Cpu, 
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import GlobalDisclaimer from '../components/GlobalDisclaimer';
import PageHeader from '../components/ui/PageHeader';
import RiskBadge from '../components/ui/RiskBadge';
import { SkeletonCard } from '../components/ui/SkeletonLoader';

export default function AiCopilotPage({ initialProjectId }) {
  const [projectId, setProjectId] = useState(initialProjectId || '');
  const [highRiskProjects, setHighRiskProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // Suggested Prompts
  const suggestedPrompts = [
    "Why is this project high risk?",
    "Explain the risk signals",
    "Explain verification discrepancy",
    "Show linked financial activity",
    "Why should this project be reviewed?"
  ];

  // Fetch top high-risk projects for selector
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/projects/high-risk?limit=15`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.data || [];
        setHighRiskProjects(list);
        if (!initialProjectId && list.length > 0) {
          const defaultId = list[0].project_id || list[0].id;
          setProjectId(defaultId);
          fetchExplanation(defaultId);
        }
      })
      .catch((err) => console.error('Error fetching projects for copilot:', err));
  }, []);

  useEffect(() => {
    if (initialProjectId) {
      setProjectId(initialProjectId);
      fetchExplanation(initialProjectId);
    }
  }, [initialProjectId]);

  const fetchExplanation = async (id) => {
    if (!id) return;
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
        setChatHistory([]);
      } else {
        setError(json.error || 'Failed to fetch explanation');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (id) => {
    setProjectId(id);
    fetchExplanation(id);
  };

  const handleExecutePrompt = (text) => {
    if (!explanation) return;
    const newMsg = { sender: 'user', text };
    setChatHistory((prev) => [...prev, newMsg]);

    const q = text.toLowerCase();
    let reply = `Work #${explanation.project_id} has a Hybrid Priority Risk Score of ${explanation.hybrid_risk_score}/100 based on recorded database indicators.`;

    if (q.includes('discrepancy') || q.includes('field') || q.includes('vendor') || q.includes('verification')) {
      if (explanation.demo_discrepancy) {
        reply = `DEMO ANALYSIS — Field Verification Discrepancy:\n"${explanation.demo_discrepancy.ai_demo_explanation}"\n\n• Progress Variance: ${explanation.demo_discrepancy.progress_diff_pct} percentage points (Vendor: ${explanation.demo_discrepancy.vendor_progress_pct}% vs Field Verified: ${explanation.demo_discrepancy.field_progress_pct}%)\n• Expenditure Variance: ₹${(explanation.demo_discrepancy.expenditure_diff / 100000).toFixed(2)} Lakhs (Vendor: ₹${(explanation.demo_discrepancy.vendor_expenditure / 100000).toFixed(2)}L vs Field: ₹${(explanation.demo_discrepancy.field_expenditure / 100000).toFixed(2)}L)\n• Status Mismatch: ${explanation.demo_discrepancy.completion_mismatch ? 'Yes (Vendor claimed Complete vs Field recorded Partial)' : 'No'}\n• Discrepancy Score: ${explanation.demo_discrepancy.discrepancy_score} Priority\n\nNotice: This is a synthetic sample demonstration scenario excluded from official production analytics.`;
      } else {
        reply = `Field Verification Status: No execution discrepancy recorded for this project in the database. Physical and administrative parameters remain standard.`;
      }
    } else if (q.includes('why') || q.includes('evidence') || q.includes('review')) {
      reply = `Evidence-Based Decision Support:\n• ${explanation.evidence_points.join('\n• ')}`;
    } else if (q.includes('signal') || q.includes('rule') || q.includes('indicator')) {
      reply = `Evaluated Risk Signals:\n• ${explanation.rule_indicators.join('\n• ')}\n\nML Feature Signals:\n• ${explanation.ml_indicators.join('\n• ')}`;
    } else if (q.includes('financial') || q.includes('activity')) {
      const amt = explanation.numerical_evidence?.allocation_amount ? (explanation.numerical_evidence.allocation_amount / 100000).toFixed(2) : '0';
      const medRatio = explanation.numerical_evidence?.amount_vs_work_median ?? '1.0';
      const pctile = explanation.numerical_evidence?.amount_percentile ?? '50';
      reply = `Financial & Allocation Evidence:\n• Allocation: ₹${amt} Lakhs\n• Category Benchmark Ratio: ${medRatio}x\n• Amount Percentile: ${pctile}th percentile within category`;
    } else if (q.includes('action') || q.includes('verify')) {
      reply = `Recommended Verification Steps:\n• ${explanation.recommended_verification.join('\n• ')}`;
    }

    setTimeout(() => {
      setChatHistory((prev) => [...prev, { sender: 'ai', text: reply }]);
    }, 250);
  };

  const handleSendQuery = (e) => {
    e.preventDefault();
    if (!userQuery.trim() || !explanation) return;
    const q = userQuery;
    setUserQuery('');
    handleExecutePrompt(q);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <PageHeader
        title="AI Copilot"
        subtitle="Evidence-based decision support and grounded project audit explanation"
        badge="Decision Support"
        badgeType="neutral"
        actions={
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Select Project:</span>
            <select
              value={projectId}
              onChange={(e) => handleSelectProject(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer max-w-xs truncate"
            >
              {highRiskProjects.map((p) => (
                <option key={p.project_id || p.id} value={p.project_id || p.id}>
                  #{p.project_id || p.id} - {p.work.substring(0, 30)}... ({p.hybrid_risk_score || p.risk_score})
                </option>
              ))}
            </select>
          </div>
        }
      />

      <GlobalDisclaimer />

      {/* Query Bar & Suggested Prompts */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <form onSubmit={handleSendQuery} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask about a project, risk signal, or financial pattern..."
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>

        {/* Suggested Prompts Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 mr-1">Suggested inquiries:</span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleExecutePrompt(prompt)}
              className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs transition-colors text-left"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout: Structured Decision Panels + Interactive Output */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: 4 Structured Decision Support Panels */}
        <div className="lg:col-span-2 space-y-4">
          
          {loading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : error ? (
            <div className="bg-white border border-red-200 rounded-xl p-6 text-center space-y-2 shadow-sm">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          ) : explanation ? (
            <>
              {/* Project Card Header */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono text-slate-400">PROJECT #{explanation.project_id}</div>
                  <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{explanation.work}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    MP: {explanation.mp_name} • {explanation.constituency}, {explanation.state}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <RiskBadge 
                    level={explanation.hybrid_risk_level} 
                    score={explanation.hybrid_risk_score} 
                  />
                </div>
              </div>

              {/* Panel 1: Evidence */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    1. Grounded Database Evidence
                  </h4>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {explanation.risk_summary}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 block">Allocation Amount</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      ₹{(explanation.numerical_evidence.allocation_amount / 100000).toFixed(2)} L
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 block">Work Median Ratio</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {explanation.numerical_evidence.amount_vs_work_median}x
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 block">Amount Percentile</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {explanation.numerical_evidence.amount_percentile}th
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 block">Hybrid Risk Score</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {explanation.hybrid_risk_score} / 100
                    </span>
                  </div>
                </div>
              </div>

              {/* Demo Discrepancy Analysis Panel (When Demo Data Attached) */}
              {explanation.demo_discrepancy && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        Field Verification Discrepancy (Demo Scenario)
                      </h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-white font-bold font-mono">
                      DEMO ANALYSIS
                    </span>
                  </div>

                  <p className="text-xs text-amber-950 font-medium leading-relaxed">
                    "{explanation.demo_discrepancy.ai_demo_explanation}"
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">Progress Variance</span>
                      <span className="font-bold text-slate-900 block mt-0.5">
                        {explanation.demo_discrepancy.progress_diff_pct} percentage points
                      </span>
                    </div>

                    <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">Expenditure Variance</span>
                      <span className="font-bold text-slate-900 block mt-0.5">
                        ₹{(explanation.demo_discrepancy.expenditure_diff / 100000).toFixed(2)} Lakhs
                      </span>
                    </div>

                    <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">Verification Priority</span>
                      <span className="font-bold text-red-600 block mt-0.5">
                        {explanation.demo_discrepancy.discrepancy_score} Priority
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-amber-800 italic pt-1 border-t border-amber-200/60">
                    Sample demonstration scenario strictly excluded from official production analytics.
                  </div>
                </div>
              )}

              {/* Panel 2 & 3: Risk Signals + ML Signals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Risk Signals */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2.5">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      2. Evaluated Risk Signals
                    </h4>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {explanation.rule_indicators.map((ind, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span>{ind}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ML Signals */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2.5">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Cpu className="w-3.5 h-3.5 text-blue-600" />
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      3. Multivariate ML Signals
                    </h4>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {explanation.ml_indicators.map((ind, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                        <span>{ind}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Panel 4: Recommended Verification */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2.5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    4. Recommended Administrative Verification
                  </h4>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  {explanation.recommended_verification.map((v, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statutory Limitations */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs leading-relaxed">
                <span className="font-semibold text-slate-800 mr-1">Analytical Framework Notice:</span>
                <span>{explanation.limitations}</span>
              </div>
            </>
          ) : null}

        </div>

        {/* Right Column: Interactive Evidence-Based Query Thread */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 flex flex-col h-[520px]">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-semibold text-slate-900">Decision Support Thread</h3>
            </div>
            <span className="text-[10px] text-slate-400">Deterministic</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
            {chatHistory.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <Bot className="w-8 h-8 mx-auto text-slate-300" />
                <p>Click a suggested prompt above or type an inquiry to review grounded evidence.</p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg text-xs leading-relaxed whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-white ml-6'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 mr-6'
                  }`}
                >
                  {msg.text}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
