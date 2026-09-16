import React from 'react';

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-pulse space-y-3 ${className}`}>
      <div className="h-3 bg-slate-200 rounded w-1/3" />
      <div className="h-7 bg-slate-200 rounded w-1/2" />
      <div className="h-2.5 bg-slate-100 rounded w-2/3" />
    </div>
  );
}

export function SkeletonMetricsRow({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="h-4 bg-slate-200 rounded w-48" />
        <div className="h-8 bg-slate-200 rounded w-32" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="p-3.5 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className={`h-3.5 bg-slate-100 rounded ${cIdx === 0 ? 'w-28' : cIdx === 1 ? 'w-48' : 'w-20'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
