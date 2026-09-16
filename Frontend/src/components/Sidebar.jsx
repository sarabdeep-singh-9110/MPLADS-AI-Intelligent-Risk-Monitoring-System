import React from 'react';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  FolderKanban, 
  Copy,
  Map, 
  ClipboardCheck, 
  Landmark, 
  Building2, 
  Bot, 
  FileText
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'risk', label: 'Risk Monitoring', icon: ShieldAlert, badge: 'Flags' },
    { id: 'projects', label: 'Projects', icon: FolderKanban, badge: '56.1k' },
    { id: 'similar', label: 'Similar Works', icon: Copy, badge: 'Detection' },
    { id: 'gis', label: 'Geospatial Monitoring', icon: Map, badge: 'GIS' },
    { id: 'investigations', label: 'Field Verification Queue', icon: ClipboardCheck, badge: 'Queue' },
    { id: 'financial', label: 'Financial Intelligence', icon: Landmark, badge: 'Dataful' },
    { id: 'vendors', label: 'Vendor Intelligence', icon: Building2, badge: '22.8k' },
    { id: 'ai', label: 'AI Copilot', icon: Bot, badge: 'Audit' },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  return (
    <aside className="w-60 lg:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-[calc(100vh-57px)] sticky top-[57px] shadow-2xs">
      <div className="p-3 space-y-3">
        
        {/* Logo / Brand Header */}
        <div className="px-2.5 py-2 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-sm shrink-0">
            MP
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 leading-none">MPLADS AI</div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">Intelligent Risk & Monitoring</div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="space-y-0.5" aria-label="Main Navigation">
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors group relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge ? (
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.badge}
                  </span>
                ) : null}

                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-blue-600 rounded-r" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="px-2 py-1.5 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-medium">System Status</span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Operational
          </span>
        </div>
        <div className="px-2 text-[10px] text-slate-400 truncate">
          56,138 works • 143,256 vouchers
        </div>
      </div>
    </aside>
  );
}
