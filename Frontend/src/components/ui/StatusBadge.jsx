import React from 'react';

export default function StatusBadge({ status, className = '' }) {
  const norm = (status || 'UNKNOWN').toUpperCase().replace(/\s+/g, '_');

  const config = {
    // Project statuses
    RECOMMENDED: {
      label: 'Recommended',
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    UNSANCTIONED: {
      label: 'Unsanctioned',
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    SANCTIONED: {
      label: 'Sanctioned',
      classes: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    IN_PROGRESS: {
      label: 'In Progress',
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    ONGOING: {
      label: 'Ongoing',
      classes: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    COMPLETED: {
      label: 'Completed',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    // Investigation statuses
    NEW: {
      label: 'New',
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    UNDER_REVIEW: {
      label: 'Under Review',
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    VERIFIED: {
      label: 'Verified',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    CLEARED: {
      label: 'Cleared',
      classes: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    ESCALATED: {
      label: 'Escalated',
      classes: 'bg-red-50 text-red-700 border-red-200',
    },
  }[norm] || {
    label: status || 'Unknown',
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
