import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, FileText, TrendingUp, DollarSign, Building, AlertCircle, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function NationalOverview({ analyticsData, onSelectState }) {
  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mr-3"></div>
        Loading National Analytics...
      </div>
    );
  }

  const { total_projects, total_allocation_amount, avg_risk_score, total_states, risk_levels, top_high_risk_states, category_breakdown } = analyticsData;

  const riskPieData = [
    { name: 'Critical (80-100)', value: risk_levels.Critical || 0, color: '#ef4444' },
    { name: 'High (60-79)', value: risk_levels.High || 0, color: '#f97316' },
    { name: 'Medium (30-59)', value: risk_levels.Medium || 0, color: '#eab308' },
    { name: 'Low (0-29)', value: risk_levels.Low || 0, color: '#10b981' },
  ];

  const totalAllocationCrores = (total_allocation_amount / 10000000).toFixed(2);

  return (
    <div className="space-y-6">
      
      {/* Risk Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-amber-200">⚠️ Risk Alert — Not a Fraud Verdict:</strong>
          <p className="mt-0.5 text-amber-300/90 leading-relaxed">
            Risk scores represent baseline statistical, financial, spatial, and administrative anomaly indicators. They are <strong>NOT proof of fraud, corruption, or wrongdoing</strong>. Flagged works require human administrative verification.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Works Card */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Scored Works</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{total_projects.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-400 space-x-1">
            <span className="text-cyan-400 font-semibold">100%</span>
            <span>indexed across {total_states || 33} States & UTs</span>
          </div>
        </div>

        {/* Critical Risk Card */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden border-red-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Critical Risk Flags</p>
              <h3 className="text-3xl font-extrabold text-red-400 mt-1">{risk_levels.Critical.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-red-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            <span>Priority Field Verification Recommended</span>
          </div>
        </div>

        {/* High Risk Card */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden border-orange-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">High Risk Flags</p>
              <h3 className="text-3xl font-extrabold text-orange-400 mt-1">{risk_levels.High.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-400">
            <span>Administrative verification recommended</span>
          </div>
        </div>

        {/* Total Allocation Amount Card */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Allocation Amount</p>
              <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">₹{totalAllocationCrores} Cr</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-400">
            <span>Avg Risk Score: <strong className="text-cyan-400 ml-1">{avg_risk_score} / 100</strong></span>
          </div>
        </div>

      </div>

      {/* Analytics Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Risk Level Distribution Chart */}
        <div className="glass-card p-6 rounded-2xl lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              <span>National Risk Pyramid</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Rule-based classification across {total_projects.toLocaleString()} MPLADS works</p>
          </div>

          <div className="h-64 my-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {riskPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-300 font-medium">{item.name.split(' ')[0]}</span>
                </div>
                <span className="font-bold text-slate-100">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* High Risk States Leaderboard */}
        <div className="glass-card p-6 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center space-x-2">
                <Building className="w-5 h-5 text-cyan-400" />
                <span>High-Risk State Leaderboard</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">States ranked by concentration of Critical & High risk baseline indicators</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top_high_risk_states} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="state" stroke="#64748b" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(value, name) => [value, name === 'high_risk_count' ? 'Critical/High Flags' : 'Avg Risk Score']}
                />
                <Bar dataKey="high_risk_count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Critical/High Flags" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Work Category Breakdown */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-base font-semibold text-white mb-1">Sectoral Risk & Allocation Breakdown</h3>
        <p className="text-xs text-slate-400 mb-4">Project counts, average baseline risk score, and total allocation amount by sector</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Category Sector</th>
                <th className="py-3 px-4">Total Works</th>
                <th className="py-3 px-4">Avg Risk Score</th>
                <th className="py-3 px-4">Total Allocation Amount</th>
                <th className="py-3 px-4 text-right">Risk Level Meter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {category_breakdown.map((cat, idx) => {
                const roundedRisk = Math.round(cat.avg_risk * 10) / 10;
                const crVal = ((cat.total_allocation_amount || 0) / 10000000).toFixed(2);
                return (
                  <tr key={cat.category || idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{cat.category || 'General'}</td>
                    <td className="py-3 px-4 text-slate-300">{cat.count.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${roundedRisk > 30 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {roundedRisk} / 100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200">₹{crVal} Cr</td>
                    <td className="py-3 px-4 text-right">
                      <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden inline-block align-middle ml-auto">
                        <div
                          className={`h-full rounded-full ${roundedRisk > 40 ? 'bg-red-500' : roundedRisk > 25 ? 'bg-orange-400' : 'bg-emerald-400'}`}
                          style={{ width: `${Math.min(roundedRisk * 2, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
