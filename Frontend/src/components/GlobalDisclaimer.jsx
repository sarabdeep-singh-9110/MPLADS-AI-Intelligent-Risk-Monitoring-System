import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function GlobalDisclaimer({ className = '' }) {
  return (
    <div className={`p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 ${className}`}>
      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="leading-relaxed">
        <span className="font-semibold text-amber-950 mr-1">Administrative Verification Notice:</span>
        <span className="text-amber-800">
          Risk scores indicate potential statistical and administrative anomalies to prioritize works for human verification. They are not proof of fraud, corruption, or wrongdoing.
        </span>
      </div>
    </div>
  );
}
