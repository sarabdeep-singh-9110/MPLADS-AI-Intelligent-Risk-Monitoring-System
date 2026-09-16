import React from 'react';

export default function RiskBadge({ level, score, showScore = true, className = '' }) {
  const normLevel = (level || 'Low').toUpperCase();

  const config = {
    CRITICAL: {
      label: 'Critical',
      dot: 'bg-red-600',
      pill: 'bg-red-50 text-red-700 border-red-200',
    },
    HIGH: {
      label: 'High',
      dot: 'bg-orange-500',
      pill: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    MEDIUM: {
      label: 'Medium',
      dot: 'bg-amber-500',
      pill: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    LOW: {
      label: 'Low',
      dot: 'bg-emerald-500',
      pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
  }[normLevel] || {
    label: level || 'Low',
    dot: 'bg-slate-400',
    pill: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.pill} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
      {showScore && score !== undefined && score !== null && (
        <span className="font-mono text-[10px] opacity-75">({score})</span>
      )}
    </span>
  );
}
