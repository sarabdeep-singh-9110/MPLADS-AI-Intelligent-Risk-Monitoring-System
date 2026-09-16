import React from 'react';
import { SearchX } from 'lucide-react';

export default function EmptyState({
  icon: Icon = SearchX,
  title = 'No records found',
  description = 'No matching data found for your current filter and search criteria.',
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div className={`py-12 px-4 text-center bg-white border border-slate-200 rounded-xl space-y-3 ${className}`}>
      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-1">
          <button
            onClick={onAction}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 rounded-lg shadow-sm transition-colors"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
