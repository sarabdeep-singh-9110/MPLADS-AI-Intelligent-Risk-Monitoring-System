import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  MapPin, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Sparkles, 
  Upload, 
  Eye, 
  X, 
  Maximize2, 
  Layers, 
  ShieldAlert,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function ExecutionEvidenceSection({ projectId, onOpenAiCopilot, onSelectProject }) {
  const [evidenceData, setEvidenceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDemoEvidence, setShowDemoEvidence] = useState(true);
  const [activeStage, setActiveStage] = useState('BEFORE');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [demoProjectsList, setDemoProjectsList] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Real Upload Form State
  const [uploadForm, setUploadForm] = useState({
    stage: 'BEFORE',
    image_url: '',
    caption: '',
    official_location: '',
    gps_lat: '',
    gps_lng: '',
    captured_by: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  // Fetch demo projects list for quick reference
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/projects/demo/evidence-projects`)
      .then(res => res.json())
      .then(data => {
        if (data.data) setDemoProjectsList(data.data);
      })
      .catch(err => console.error('Failed to load demo projects:', err));
  }, []);

  // Fetch evidence for the active project whenever projectId or showDemoEvidence changes
  useEffect(() => {
    if (projectId) {
      fetchEvidence();
    }
  }, [projectId, showDemoEvidence]);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/evidence?include_demo=${showDemoEvidence}`);
      if (res.ok) {
        const json = await res.json();
        setEvidenceData(json);
        // Default active stage to first stage that has photos
        if (json.photos?.stages) {
          if (json.photos.stages.BEFORE?.length > 0) setActiveStage('BEFORE');
          else if (json.photos.stages.DURING?.length > 0) setActiveStage('DURING');
          else if (json.photos.stages.AFTER?.length > 0) setActiveStage('AFTER');
        }
      }
    } catch (err) {
      console.error('Error fetching evidence:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRealUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadSuccess(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadForm)
      });
      const json = await res.json();
      if (res.ok) {
        setUploadSuccess('✓ Official field evidence recorded (Real source).');
        setUploadForm({
          stage: 'BEFORE',
          image_url: '',
          caption: '',
          official_location: '',
          gps_lat: '',
          gps_lng: '',
          captured_by: ''
        });
        setTimeout(() => {
          setUploadModalOpen(false);
          setUploadSuccess(null);
          fetchEvidence();
        }, 1500);
      } else {
        setUploadSuccess(`Error: ${json.error || 'Failed to upload'}`);
      }
    } catch (err) {
      setUploadSuccess(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const isDemo = evidenceData?.is_demo;
  const verif = evidenceData?.verification;
  const discrepancy = verif?.discrepancy_analysis;
  const currentStagePhotos = evidenceData?.photos?.stages?.[activeStage] || [];
  const hasAnyPhotos = (evidenceData?.photos?.total || 0) > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
      
      {/* SECTION HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Execution &amp; Field Verification Evidence
            </h3>
            {isDemo && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
                DEMO DATA • SAMPLE EVIDENCE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Photographic inspection, vendor self-reports, geotagged validation, and anomaly discrepancy analysis
          </p>
        </div>

        {/* DEMO MODE TOGGLE & ACTIONS */}
        <div className="flex items-center gap-2.5">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
            <input 
              type="checkbox" 
              checked={showDemoEvidence}
              onChange={(e) => setShowDemoEvidence(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-xs font-medium text-slate-700">Show Demo Evidence</span>
          </label>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Real Evidence</span>
          </button>
        </div>
      </div>

      {/* DEMO DATA NOTICE BANNER */}
      {isDemo && (
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">DEMO DATA / SAMPLE EVIDENCE:</span>{' '}
            The photographic records, geotags, and milestone reports displayed below are synthetic sample records created for workflow demonstration. 
            <strong> These demo records are strictly isolated and do not alter official production statistics, national expenditure, or ML risk scores.</strong>
          </div>
        </div>
      )}

      {/* QUICK DEMO PROJECT SELECTOR (For Demo Scenarios Evaluation) */}
      {demoProjectsList.length > 0 && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Demo Evidence Scenarios (Click to inspect):
            </span>
            <span className="text-[10px] text-slate-400">4 Pre-Configured Demonstration Works</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {demoProjectsList.map((dp) => {
              const isCurrent = dp.project_id === projectId;
              return (
                <button
                  key={dp.project_id}
                  onClick={() => onSelectProject && onSelectProject(dp.project_id)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    isCurrent 
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-2xs' 
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400">#{dp.project_id.slice(-6)}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      dp.is_anomaly_scenario ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {dp.is_anomaly_scenario ? '⚠ Anomaly' : '✓ Matched'}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-800 truncate mt-1" title={dp.work}>
                    {dp.work}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {dp.state} • {dp.is_anomaly_scenario ? `${dp.progress_diff_pct}% diff` : 'Consistent'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">
          Loading field execution and photographic evidence...
        </div>
      ) : !hasAnyPhotos && !verif ? (
        <div className="py-8 text-center space-y-2 border border-dashed border-slate-200 rounded-lg p-6">
          <Camera className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-xs font-semibold text-slate-700">No Field Evidence Available</h4>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            {showDemoEvidence 
              ? 'No sample evidence records have been associated with this project ID.' 
              : 'No official verified field inspection photos uploaded for this project yet. You can enable "Show Demo Evidence" above to preview sample field evidence.'}
          </p>
          {!showDemoEvidence && evidenceData?.demo_available && (
            <button
              onClick={() => setShowDemoEvidence(true)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Show sample demo evidence for this project
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">

          {/* 1. PHOTOGRAPHIC EVIDENCE VIEWER */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            {/* Stage Tabs */}
            <div className="flex items-center border-b border-slate-200 bg-white px-4 pt-2 gap-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-2">
                Inspection Stage:
              </span>
              {['BEFORE', 'DURING', 'AFTER'].map((stage) => {
                const count = evidenceData?.photos?.stages?.[stage]?.length || 0;
                const active = activeStage === stage;
                return (
                  <button
                    key={stage}
                    onClick={() => setActiveStage(stage)}
                    className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      active
                        ? 'border-blue-600 text-blue-700 bg-blue-50/30'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{stage === 'BEFORE' ? 'Before Work' : stage === 'DURING' ? 'During Work' : 'After Work'}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${active ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Photos Grid for Active Stage */}
            <div className="p-4">
              {currentStagePhotos.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No photographic records filed for stage: <strong>{activeStage}</strong>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentStagePhotos.map((photo) => (
                    <div 
                      key={photo.evidence_id}
                      className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs hover:shadow-sm transition-all group flex flex-col"
                    >
                      {/* Image Frame with Badge */}
                      <div className="relative aspect-16/10 bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setSelectedPhoto(photo)}>
                        <img 
                          src={photo.image_url} 
                          alt={photo.caption || 'Field inspection'} 
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          {photo.is_demo === 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white shadow-xs">
                              DEMO DATA
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-black/70 text-slate-200 backdrop-blur-xs">
                            {photo.stage}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photo); }}
                          className="absolute bottom-2 right-2 p-1 rounded bg-black/60 hover:bg-black/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Photo Metadata Card */}
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2 text-xs">
                        <div>
                          <p className="font-medium text-slate-900 line-clamp-2 leading-snug">
                            {photo.caption || 'Site inspection photo'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Captured by: <span className="text-slate-700 font-medium">{photo.captured_by || 'Field Team'}</span>
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-500 font-mono">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-slate-400">
                              <MapPin className="w-3 h-3 text-blue-500" /> GPS:
                            </span>
                            <span className="text-slate-700 font-medium">
                              {photo.demo_gps_lat ? `${photo.demo_gps_lat.toFixed(4)}°, ${photo.demo_gps_lng.toFixed(4)}° (${photo.gps_label || 'Demo GPS'})` : 'No GPS'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3 h-3 text-slate-400" /> Time:
                            </span>
                            <span className="text-slate-600">
                              {photo.timestamp || 'Recorded in log'}
                            </span>
                          </div>
                          {photo.distance_meters !== null && photo.distance_meters !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Distance from Official Point:</span>
                              <span className="text-emerald-700 font-medium">
                                {photo.distance_meters}m ({photo.is_demo ? 'Demo Offset' : 'Verified'})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. VENDOR REPORT VS FIELD OFFICER VERIFICATION (SIDE-BY-SIDE) */}
          {verif && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Vendor Progress Claim vs. Field Officer Physical Audit
                </h4>
                {isDemo && (
                  <span className="text-[11px] text-slate-400 italic">
                    Sample data for demonstration only
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Vendor Column */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Party 1</span>
                      <h5 className="text-xs font-bold text-slate-900">Vendor Self-Submission</h5>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                      Date: {verif.vendor.report_date || 'Recent'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Reported Progress</span>
                      <span className="text-lg font-bold text-slate-900 block mt-0.5">
                        {verif.vendor.progress_pct}%
                      </span>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Claimed Expenditure</span>
                      <span className="text-lg font-bold text-slate-900 block mt-0.5">
                        ₹{(verif.vendor.expenditure / 100000).toFixed(2)} L
                      </span>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Completion Status</span>
                      <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                        {verif.vendor.completion_status}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Submitted Photos</span>
                      <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                        {verif.vendor.photos_count} Geo-Photos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Field Officer Column */}
                <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Party 2</span>
                      <h5 className="text-xs font-bold text-blue-950">Field Officer Physical Audit</h5>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                      Date: {verif.field.verification_date || 'Recent'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white border border-blue-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Inspected Progress</span>
                      <span className="text-lg font-bold text-blue-900 block mt-0.5">
                        {verif.field.progress_pct}%
                      </span>
                    </div>

                    <div className="p-2.5 bg-white border border-blue-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Verified Expenditure</span>
                      <span className="text-lg font-bold text-blue-900 block mt-0.5">
                        ₹{(verif.field.expenditure / 100000).toFixed(2)} L
                      </span>
                    </div>

                    <div className="p-2.5 bg-white border border-blue-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Inspected Status</span>
                      <span className="text-xs font-semibold text-blue-900 block mt-0.5">
                        {verif.field.completion_status}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white border border-blue-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Inspected Photos</span>
                      <span className="text-xs font-semibold text-blue-900 block mt-0.5">
                        {verif.field.photos_count} Validated Photos
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 3. AUTOMATED DISCREPANCY ANALYSIS & ANOMALY SCENARIO */}
          {discrepancy && (
            <div className={`border rounded-xl p-5 space-y-4 ${
              discrepancy.discrepancy_score === 'High'
                ? 'bg-red-50/40 border-red-200'
                : discrepancy.discrepancy_score === 'Moderate'
                ? 'bg-amber-50/40 border-amber-200'
                : 'bg-emerald-50/40 border-emerald-200'
            }`}>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-200/60">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${
                    discrepancy.discrepancy_score === 'High' ? 'text-red-600' : 'text-amber-600'
                  }`} />
                  <h4 className="text-xs font-bold text-slate-900">
                    {discrepancy.discrepancy_score === 'High' 
                      ? '⚠ Potential Field Verification Discrepancy' 
                      : 'Field Verification Consistency Assessment'}
                  </h4>
                  {isDemo && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-white font-bold uppercase tracking-wider">
                      DEMO ANALYSIS
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Discrepancy Score:</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                    discrepancy.discrepancy_score === 'High'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : discrepancy.discrepancy_score === 'Moderate'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {discrepancy.discrepancy_score} Priority
                  </span>
                </div>
              </div>

              {/* Metric Variance Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Progress Difference</span>
                  <span className={`text-base font-bold block mt-0.5 ${
                    discrepancy.progress_diff_pct > 10 ? 'text-red-600' : 'text-slate-800'
                  }`}>
                    {discrepancy.progress_diff_pct} percentage points
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Expenditure Difference</span>
                  <span className={`text-base font-bold block mt-0.5 ${
                    discrepancy.expenditure_diff > 100000 ? 'text-red-600' : 'text-slate-800'
                  }`}>
                    ₹{(discrepancy.expenditure_diff / 100000).toFixed(2)} Lakhs
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Completion Status</span>
                  <span className={`text-xs font-bold block mt-1 ${
                    discrepancy.completion_mismatch ? 'text-red-600' : 'text-emerald-700'
                  }`}>
                    {discrepancy.completion_mismatch ? 'Mismatch (Complete vs Partial)' : 'Matched'}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Location Verification</span>
                  <span className="text-xs font-bold text-slate-800 block mt-1">
                    {discrepancy.location_consistency || 'Consistent'}
                  </span>
                </div>
              </div>

              {/* Reasons List */}
              {discrepancy.discrepancy_reasons?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Observed Variance Factors:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {discrepancy.discrepancy_reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Copilot Explanation Card (Strictly Compliant Terminology) */}
              {discrepancy.ai_demo_explanation && (
                <div className="p-3.5 bg-slate-900 text-white rounded-lg text-xs space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Decision-Support Interpretation</span>
                    </div>
                    {isDemo && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                        DEMO ANALYSIS
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 leading-relaxed text-[11px]">
                    "{discrepancy.ai_demo_explanation}"
                  </p>
                  <p className="text-[10px] text-slate-400 italic">
                    Decision-support notice: Potential discrepancies prioritize administrative review. They do not constitute proof of corruption or wrongdoing.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* 4. EXECUTION PROGRESS TIMELINE */}
          {verif?.timeline?.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Execution Milestone Chronology
                </h5>
                {isDemo && (
                  <span className="text-[10px] text-slate-400 italic">Sample progress chronology</span>
                )}
              </div>

              <div className="space-y-3 pt-1">
                {verif.timeline.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs relative pl-1">
                    <div className="flex flex-col items-center">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 ${
                        step.type.includes('Field') ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-400'
                      }`} />
                      {idx < verif.timeline.length - 1 && <span className="w-0.5 h-10 bg-slate-200 my-0.5" />}
                    </div>
                    <div className="flex-1 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{step.type}</span>
                        <span className="text-[10px] font-mono text-slate-500">{step.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">{step.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-medium">
                        <span>Progress: <strong>{step.progress}%</strong></span>
                        {step.expenditure && <span>Expenditure: <strong>₹{(step.expenditure / 100000).toFixed(2)}L</strong></span>}
                        {step.officer && <span>Officer: <strong>{step.officer}</strong></span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* FULLSCREEN PHOTO INSPECTION MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-0 text-white flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  Inspection Evidence Viewer
                </span>
                {selectedPhoto.is_demo === 1 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                    DEMO DATA • SAMPLE EVIDENCE
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                  {selectedPhoto.stage}
                </span>
              </div>
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Image Display */}
            <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden p-2">
              <img 
                src={selectedPhoto.image_url} 
                alt={selectedPhoto.caption}
                className="max-h-[60vh] w-auto object-contain rounded"
              />
            </div>

            {/* Modal Footer Metadata */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2 text-xs">
              <div className="font-medium text-slate-200">
                {selectedPhoto.caption}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-400 font-mono pt-1">
                <div>
                  <span className="block text-slate-500">COORDINATES</span>
                  <span className="text-blue-400">{selectedPhoto.demo_gps_lat?.toFixed(4)}°, {selectedPhoto.demo_gps_lng?.toFixed(4)}° ({selectedPhoto.gps_label})</span>
                </div>
                <div>
                  <span className="block text-slate-500">TIMESTAMP</span>
                  <span className="text-slate-300">{selectedPhoto.timestamp}</span>
                </div>
                <div>
                  <span className="block text-slate-500">DISTANCE</span>
                  <span className="text-emerald-400">{selectedPhoto.distance_meters}m from site</span>
                </div>
                <div>
                  <span className="block text-slate-500">RECORD SOURCE</span>
                  <span className="text-amber-400">{selectedPhoto.evidence_source || 'DEMO'}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900 italic">
                Notice: Demo images are non-copyrighted synthetic illustrations provided for workflow testing. Excluded from official analytics.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* UPLOAD REAL EVIDENCE MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Upload Real Field Evidence</h4>
                <p className="text-xs text-slate-500 mt-0.5">Recorded as REAL source (is_demo = 0)</p>
              </div>
              <button 
                onClick={() => setUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadSuccess && (
              <div className={`p-2.5 rounded-lg text-xs font-medium ${
                uploadSuccess.startsWith('✓') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {uploadSuccess}
              </div>
            )}

            <form onSubmit={handleRealUpload} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Inspection Stage:</label>
                <select
                  value={uploadForm.stage}
                  onChange={(e) => setUploadForm({ ...uploadForm, stage: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-800 font-medium"
                >
                  <option value="BEFORE">Before Work (Baseline / Pre-Construction)</option>
                  <option value="DURING">During Work (Milestone / Physical Progress)</option>
                  <option value="AFTER">After Work (Completion / Handover)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Image URL / Path:</label>
                <input
                  type="text"
                  required
                  placeholder="https://example.gov.in/evidence/site_photo.jpg or local path"
                  value={uploadForm.image_url}
                  onChange={(e) => setUploadForm({ ...uploadForm, image_url: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Caption / Field Remarks:</label>
                <textarea
                  rows="2"
                  placeholder="Physical site observation remarks..."
                  value={uploadForm.caption}
                  onChange={(e) => setUploadForm({ ...uploadForm, caption: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">GPS Latitude:</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 26.8467"
                    value={uploadForm.gps_lat}
                    onChange={(e) => setUploadForm({ ...uploadForm, gps_lat: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">GPS Longitude:</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 80.9462"
                    value={uploadForm.gps_lng}
                    onChange={(e) => setUploadForm({ ...uploadForm, gps_lng: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Reporting Officer Name &amp; Designation:</label>
                <input
                  type="text"
                  placeholder="e.g. Executive Engineer PWD / Nodal Inspector"
                  value={uploadForm.captured_by}
                  onChange={(e) => setUploadForm({ ...uploadForm, captured_by: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm"
                >
                  {uploading ? 'Recording...' : 'Submit Evidence'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
