import React from 'react';
import { ShieldAlert, Activity, Search, Building2, MapPin, UserCheck, Layers } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, userRole, setUserRole, searchQuery, setSearchQuery }) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Brand Title */}
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white">MPLADS AI Risk Monitoring Engine</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
                SIH26102
              </span>
            </div>
            <p className="text-xs text-slate-400">Baseline Rule-Based Risk Engine • Ministry of Statistics & Programme Implementation (MoSPI)</p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search works by MP, location, constituency, work description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
        </div>

        {/* Navigation Tabs & Role Switcher */}
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 ${
                activeTab === 'overview' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>National Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 ${
                activeTab === 'table' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Risk Audit Table</span>
            </button>

            <button
              onClick={() => setActiveTab('gis')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 ${
                activeTab === 'gis' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>State GIS Heatmap</span>
            </button>
          </div>

          {/* User Role Switcher */}
          <div className="hidden lg:flex items-center bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400 mr-2" />
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="Ministry Officer" className="bg-slate-900">Ministry Nodal Officer</option>
              <option value="State Authority" className="bg-slate-900">State Authority</option>
              <option value="District Authority" className="bg-slate-900">District Authority (IDA)</option>
              <option value="Audit Representative" className="bg-slate-900">CAG / Field Auditor</option>
            </select>
          </div>

        </div>

      </div>
    </header>
  );
}
