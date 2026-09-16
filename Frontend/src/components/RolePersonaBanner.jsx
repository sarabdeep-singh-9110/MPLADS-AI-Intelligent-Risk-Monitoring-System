import React from 'react';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Scale, 
  ShieldAlert, 
  Filter, 
  FileText, 
  ChevronRight
} from 'lucide-react';
import { useRole, ROLES } from '../context/RoleContext';

export default function RolePersonaBanner({ onNavigateToPage }) {
  const { 
    userRole, 
    selectedState, 
    setSelectedState, 
    selectedDistrict, 
    setSelectedDistrict, 
    statesList, 
    districtsList, 
    stateAnalytics, 
    auditAnalytics 
  } = useRole();

  if (userRole === ROLES.MINISTRY) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Purview:</span>
              <h2 className="text-xs sm:text-sm font-semibold text-slate-900">Ministry Nodal Officer (MoSPI National Overview)</h2>
              <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                33 States/UTs
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Oversight across 56,138 works and ₹3,350.29 Cr tracked fund allocations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateToPage && onNavigateToPage('risk')}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>National Risk Triage (203 Flags)</span>
          </button>
          <button
            onClick={() => onNavigateToPage && onNavigateToPage('reports')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>National Reports</span>
          </button>
        </div>
      </div>
    );
  }

  if (userRole === ROLES.STATE) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Purview:</span>
                <h2 className="text-xs sm:text-sm font-semibold text-slate-900">State Authority Purview</h2>
                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-medium">
                  State-Scoped
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring district-level allocations, implementing agencies (IDAs), and compliance milestones.
              </p>
            </div>
          </div>

          {/* Interactive State Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
            <span className="text-slate-500 font-medium flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1 text-purple-600" />
              State Scope:
            </span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {statesList.map((st) => (
                <option key={st} value={st} className="bg-white text-slate-800">
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic State Quick-KPIs */}
        {stateAnalytics && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Works in {selectedState}:</span>
              <span className="font-semibold text-slate-800">{stateAnalytics.total_projects.toLocaleString()}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Allocated Funds:</span>
              <span className="font-semibold text-purple-700">
                ₹{(stateAnalytics.total_allocation_amount / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Flagged Works:</span>
              <span className="font-semibold text-red-600">
                {(stateAnalytics.critical_count + stateAnalytics.high_count)} flagged
              </span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Constituencies:</span>
              <span className="font-semibold text-slate-700">{stateAnalytics.total_constituencies} active</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (userRole === ROLES.DISTRICT) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Purview:</span>
                <h2 className="text-xs sm:text-sm font-semibold text-slate-900">District Authority (IDA) Implementation View</h2>
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                  Ground Execution
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Local field inspection tracking, contractor milestone monitoring, and fund sign-off.
              </p>
            </div>
          </div>

          {/* District & State Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
              <span className="text-slate-400">State:</span>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {statesList.map((st) => (
                  <option key={st} value={st} className="bg-white text-slate-800">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {districtsList.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                <span className="text-amber-700 font-medium">Constituency:</span>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[160px] truncate"
                >
                  <option value="" className="bg-white text-slate-500">All</option>
                  {districtsList.map((d) => (
                    <option key={d} value={d} className="bg-white text-slate-800">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Action Priority: Human administrative inspection required before further fund disbursal.
          </span>
          <button
            onClick={() => onNavigateToPage && onNavigateToPage('investigations')}
            className="text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1 transition-colors"
          >
            <span>Open Field Verification Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ROLES.CAG (CAG / Field Auditor Persona)
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded-lg shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Purview:</span>
              <h2 className="text-xs sm:text-sm font-semibold text-slate-900">Comptroller & Auditor General (CAG) / Field Auditor</h2>
              <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-medium">
                Vigilance Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict audit scrutiny targeting cost outliers, duplicate works within 500m, and anomalous fund-progress gaps.
            </p>
          </div>
        </div>

        {/* Audit Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateToPage && onNavigateToPage('risk')}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>Audit Triage Queue (203 Works)</span>
          </button>
          <button
            onClick={() => onNavigateToPage && onNavigateToPage('reports')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CAG Audit Dossier</span>
          </button>
        </div>
      </div>

      {/* Audit Stats Line */}
      {auditAnalytics && (
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">ML Anomaly Outlier Rate:</span>
            <span className="font-semibold text-red-700">{auditAnalytics.anomaly_rate_pct}%</span>
            <span className="text-[10px] text-slate-400">({auditAnalytics.total_anomalies.toLocaleString()} flagged)</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Immediate Audit Priority:</span>
            <span className="font-semibold text-red-700">{auditAnalytics.critical_count} Critical Works</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">High Risk Fund Exposure:</span>
            <span className="font-semibold text-amber-700">
              ₹{(auditAnalytics.high_risk_allocation / 10000000).toFixed(2)} Cr
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
