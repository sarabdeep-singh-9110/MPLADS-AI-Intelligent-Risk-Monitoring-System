import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Eye, Bot, Filter, Sparkles, UserCheck } from 'lucide-react';

export default function RiskMonitoringTable({ 
  projects, 
  pagination, 
  onPageChange, 
  selectedRiskFilter, 
  setSelectedRiskFilter, 
  selectedState, 
  setSelectedState, 
  statesList,
  onOpenDetail,
  onOpenAiCopilot 
}) {
  return (
    <div className="space-y-4">
      
      {/* Risk Disclaimer Banner */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>⚠️ Risk Alert — Not a Fraud Verdict:</strong> Risk scores indicate baseline statistical/administrative anomaly indicators. Flagged works require human verification.
        </span>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Risk Level Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="text-slate-400 flex items-center mr-1">
            <Filter className="w-3.5 h-3.5 mr-1" /> Risk Filter:
          </span>
          {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((level) => {
            const isActive = selectedRiskFilter === level;
            let activeColor = 'bg-cyan-500 text-slate-950 font-bold';
            if (level === 'Critical') activeColor = 'bg-red-500 text-white font-bold';
            if (level === 'High') activeColor = 'bg-orange-500 text-white font-bold';
            if (level === 'Medium') activeColor = 'bg-yellow-500 text-slate-950 font-bold';
            if (level === 'Low') activeColor = 'bg-emerald-500 text-slate-950 font-bold';

            return (
              <button
                key={level}
                onClick={() => setSelectedRiskFilter(level)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  isActive ? activeColor : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {level === 'ALL' ? 'All Works' : level}
              </button>
            );
          })}
        </div>

        {/* State Filter Dropdown */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">State:</span>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="">All States & UTs</option>
            {statesList.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Main Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Project ID & Work Description</th>
                <th className="py-3.5 px-4">MP Name</th>
                <th className="py-3.5 px-4">State & Constituency</th>
                <th className="py-3.5 px-4">Allocation Amount</th>
                <th className="py-3.5 px-4">Risk Level</th>
                <th className="py-3.5 px-4">Investigation</th>
                <th className="py-3.5 px-4">Risk Score</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projects && projects.length > 0 ? (
                projects.map((proj) => {
                  let badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                  let icon = <CheckCircle className="w-3.5 h-3.5 mr-1" />;
                  if (proj.risk_level === 'Critical') {
                    badgeStyle = 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse';
                    icon = <ShieldAlert className="w-3.5 h-3.5 mr-1" />;
                  } else if (proj.risk_level === 'High') {
                    badgeStyle = 'bg-orange-500/15 text-orange-400 border-orange-500/40';
                    icon = <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
                  } else if (proj.risk_level === 'Medium') {
                    badgeStyle = 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40';
                    icon = <AlertCircle className="w-3.5 h-3.5 mr-1" />;
                  }

                  const amountLakhs = (proj.allocation_amount / 100000).toFixed(2);
                  const invStatus = proj.investigation_status || 'New';

                  let invBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
                  if (invStatus === 'Under Review') invBadgeClass = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
                  if (invStatus === 'Verified') invBadgeClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                  if (invStatus === 'Cleared') invBadgeClass = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
                  if (invStatus === 'Escalated') invBadgeClass = 'bg-red-500/15 text-red-300 border-red-500/30';

                  return (
                    <tr key={proj.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-white truncate" title={proj.work}>{proj.work}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">ID: #{proj.id} • {proj.category}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {proj.mp_name || 'N/A'}
                        <div className="text-[10px] text-slate-500">{proj.house}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-medium">{proj.constituency}</div>
                        <div className="text-[11px] text-slate-400">{proj.state}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">
                        ₹{amountLakhs} Lakhs
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyle}`}>
                          {icon}
                          {proj.risk_level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${invBadgeClass}`}>
                          {invStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className={`font-extrabold text-sm ${proj.risk_score >= 60 ? 'text-red-400' : 'text-slate-200'}`}>
                            {proj.risk_score}
                          </span>
                          <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${proj.risk_score >= 80 ? 'bg-red-500' : proj.risk_score >= 60 ? 'bg-orange-500' : proj.risk_score >= 30 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                              style={{ width: `${proj.risk_score}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onOpenDetail(proj.id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
                            title="View Deep Audit Details & Decision Support"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenAiCopilot(proj.id)}
                            className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors border border-cyan-500/30 flex items-center space-x-1"
                            title="AI Risk Explanation"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    No matching MPLADS works found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination && (
          <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-semibold">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="text-white font-semibold">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="text-cyan-400 font-semibold">{pagination.total.toLocaleString()}</span> works
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(pagination.page - 1)}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-semibold text-white bg-slate-900 border border-slate-800 rounded-lg">
                Page {pagination.page} of {pagination.total_pages}
              </span>

              <button
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => onPageChange(pagination.page + 1)}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
