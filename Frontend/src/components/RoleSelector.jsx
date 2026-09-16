import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Check, 
  Building2
} from 'lucide-react';
import { useRole, ROLES, ROLE_CONFIGS } from '../context/RoleContext';

export default function RoleSelector() {
  const { userRole, setUserRole, currentConfig } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectRole = (roleKey) => {
    setUserRole(roleKey);
    setIsOpen(false);
  };

  const IconComponent = currentConfig.icon || Building2;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <div className="flex items-center gap-1.5">
          <IconComponent className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-800">{currentConfig.title}</span>
        </div>
        
        {/* Scope Pill */}
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
          {currentConfig.scope}
        </span>

        {/* Chevron */}
        <ChevronDown 
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-slate-600' : ''
          }`} 
        />
      </button>

      {/* Clean White Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-200 shadow-xl z-[100] p-1.5 divide-y divide-slate-100 animate-in fade-in duration-100">
          
          {/* Menu Header */}
          <div className="px-2.5 py-2 text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span className="uppercase tracking-wider">Administrative Purview</span>
            <span className="text-[10px] text-blue-600 font-mono">RBAC</span>
          </div>

          {/* Role Options */}
          <div className="pt-1.5 space-y-1" role="listbox">
            {Object.values(ROLES).map((role) => {
              const config = ROLE_CONFIGS[role];
              const isSelected = userRole === role;
              const RoleIcon = config.icon;

              return (
                <button
                  key={role}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectRole(role)}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2.5 group ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                      : 'border-transparent hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {/* Icon Container */}
                  <div className={`p-1.5 rounded-md shrink-0 transition-colors ${
                    isSelected 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                  }`}>
                    <RoleIcon className="w-4 h-4" />
                  </div>

                  {/* Role Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-blue-950' : 'text-slate-800'
                      }`}>
                        {config.title}
                      </span>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                        {config.scope}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                      {config.description}
                    </p>
                  </div>

                  {/* Active Indicator Checkmark */}
                  {isSelected && (
                    <div className="shrink-0 pt-0.5">
                      <Check className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer explanation */}
          <div className="pt-2 mt-1 px-2.5 py-1 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Switches dashboard role & scope</span>
            <span className="text-emerald-600 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live Synced
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
