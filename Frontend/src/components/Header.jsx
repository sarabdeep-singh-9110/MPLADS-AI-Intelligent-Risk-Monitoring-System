import React, { useState, useEffect } from 'react';
import { Search, Bell, Server, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import RoleSelector from './RoleSelector';

export default function Header() {
  const [backendStatus, setBackendStatus] = useState('checking'); // 'connected', 'error', 'checking'
  const [indexedCount, setIndexedCount] = useState(null);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = () => {
    fetch(`${API_BASE_URL}/api/health`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Health check failed');
      })
      .then((data) => {
        if (data.status === 'ok' || data.status === 'healthy') {
          setBackendStatus('connected');
          setIndexedCount(data.indexed_works);
        } else {
          setBackendStatus('error');
        }
      })
      .catch(() => {
        setBackendStatus('error');
      });
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between">
      {/* Left: Department & Title */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
              MPLADS AI
            </h1>
            <span className="hidden md:inline-block text-[11px] text-slate-400 font-normal">
              • MoSPI Risk Intelligence Engine
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions, Health, Role, Notifications, Avatar */}
      <div className="flex items-center gap-3">
        {/* Backend Connection Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          {backendStatus === 'connected' ? (
            <span className="flex items-center text-emerald-700 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
              API Connected {indexedCount ? `(${indexedCount.toLocaleString()})` : ''}
            </span>
          ) : backendStatus === 'checking' ? (
            <span className="text-amber-700 text-[11px] font-medium">Connecting...</span>
          ) : (
            <span className="flex items-center text-red-700 text-[11px] font-medium">
              <AlertCircle className="w-3 h-3 mr-1" />
              Offline
            </span>
          )}
        </div>

        {/* Custom Role Selector Dropdown */}
        <RoleSelector />

        {/* Notification Bell */}
        <button
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors relative"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />
        </button>

        {/* User / Admin Avatar */}
        <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-medium text-xs flex items-center justify-center">
            AD
          </div>
        </div>
      </div>
    </header>
  );
}
