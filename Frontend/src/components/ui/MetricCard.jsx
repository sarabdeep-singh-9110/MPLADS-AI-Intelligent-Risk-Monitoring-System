import React from 'react';

export default function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  badge,
  badgeType = 'neutral', // 'neutral', 'success', 'warning', 'danger', 'info'
  trend,
  className = ''
}) {
  const badgeColors = {
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm transition-all hover:border-slate-300 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 tracking-wide">{label}</span>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColors[badgeType] || badgeColors.neutral}`}>
            {badge}
          </span>
        )}
        {Icon && !badge && (
          <div className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-100">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-medium text-emerald-600">{trend}</span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-slate-500 mt-1.5 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
}
