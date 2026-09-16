import React from 'react';
import { MapPin, ShieldAlert, Building, Layers, Info } from 'lucide-react';

export default function GisMapModule({ mapData, onSelectState }) {
  if (!mapData || !mapData.states) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span className="text-xs font-medium">Loading State-Level Spatial Data...</span>
      </div>
    );
  }

  const { states } = mapData;

  return (
    <div className="space-y-6">
      
      {/* Geographic Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>State-Level Risk Concentration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated state risk distribution based on recorded geographic fields across 56,138 works
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 rounded-md font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Critical State Risk
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-md font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> High Risk Concentration
          </span>
        </div>
      </div>

      {/* Main Grid: Visual Map View & State Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* State Risk Visualization Grid */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between relative overflow-hidden min-h-[450px]">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>State Regional Layer</span>
            </div>
            <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-md">
              33 States & UTs Indexed
            </span>
          </div>

          {/* India Regional Interactive Map Card View */}
          <div className="my-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {states.map((st) => {
              const avgRisk = Math.round((st.avg_hybrid_risk_score || st.avg_risk_score || 0) * 10) / 10;
              const hasCritical = st.critical_count > 0;
              const hasHigh = st.high_count > 0;

              let cardStyle = 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300';
              if (hasCritical) cardStyle = 'border-red-200 bg-red-50/40 hover:bg-red-50/70';
              else if (hasHigh) cardStyle = 'border-orange-200 bg-orange-50/40 hover:bg-orange-50/70';

              return (
                <div
                  key={st.state}
                  onClick={() => onSelectState(st.state)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${cardStyle}`}
                >
                  <div className="font-semibold text-xs text-slate-900 truncate" title={st.state}>{st.state}</div>
                  <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                    <span>{st.total_projects} works</span>
                    <span className={`font-semibold ${avgRisk > 25 ? 'text-orange-600' : 'text-slate-700'}`}>
                      {avgRisk}
                    </span>
                  </div>

                  {st.critical_count > 0 && (
                    <div className="mt-1.5 text-[10px] font-semibold text-red-700 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-red-600 shrink-0" /> 
                      <span>{st.critical_count} Critical Flag{st.critical_count > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Spatial Disclaimer */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Location Concentration Analysis: Identifies repeated works at identical recorded administrative jurisdictions.</span>
            </span>
          </div>

        </div>

        {/* State Detail Summary Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span>State Regional Ranking</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Top states requiring administrative verification coordination</p>
          </div>

          <div className="space-y-2 my-4 max-h-[350px] overflow-y-auto pr-1">
            {states.slice(0, 8).map((st, idx) => (
              <div key={st.state} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{st.state}</div>
                    <div className="text-[10px] text-slate-500">{st.total_projects} total works</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-red-600">{st.critical_count} Critical</div>
                  <div className="text-[10px] text-slate-400">Avg: {Math.round(st.avg_risk_score)}</div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
