const { db, dbRun, dbGet, dbQuery } = require('../../db/database');

async function migrateDemoEvidence() {
  console.log('--- Initializing Demo Execution & Evidence Schema ---');

  // 1. Create execution_evidence table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS execution_evidence (
      evidence_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      evidence_source TEXT NOT NULL DEFAULT 'DEMO',
      is_demo INTEGER NOT NULL DEFAULT 1,
      stage TEXT NOT NULL,
      image_url TEXT NOT NULL,
      caption TEXT,
      official_location TEXT,
      demo_gps_lat REAL,
      demo_gps_lng REAL,
      gps_label TEXT DEFAULT 'Demo GPS',
      distance_meters REAL,
      timestamp TEXT,
      captured_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES works(project_id)
    )
  `);

  // Index for rapid lookup by project and demo status
  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_evidence_project_demo 
    ON execution_evidence (project_id, is_demo, stage)
  `);

  // 2. Create project_verifications table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS project_verifications (
      verification_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE,
      evidence_source TEXT NOT NULL DEFAULT 'DEMO',
      is_demo INTEGER NOT NULL DEFAULT 1,
      vendor_progress_pct REAL,
      vendor_expenditure REAL,
      vendor_completion_status TEXT,
      vendor_photos_count INTEGER,
      vendor_report_date TEXT,
      field_progress_pct REAL,
      field_expenditure REAL,
      field_completion_status TEXT,
      field_photos_count INTEGER,
      field_verification_date TEXT,
      progress_diff_pct REAL,
      expenditure_diff REAL,
      completion_mismatch INTEGER,
      location_consistency TEXT,
      discrepancy_score TEXT,
      discrepancy_reasons TEXT,
      ai_demo_explanation TEXT,
      timeline_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES works(project_id)
    )
  `);

  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_verification_project_demo 
    ON project_verifications (project_id, is_demo)
  `);

  console.log('Tables created or verified successfully.');

  // 3. Clear existing demo data before reseeding
  await dbRun(`DELETE FROM execution_evidence WHERE is_demo = 1`);
  await dbRun(`DELETE FROM project_verifications WHERE is_demo = 1`);

  // 4. Seed Verifications Data
  const demoVerifications = [
    // Project 1: Anomaly Scenario (PRJ_298A9603D74B)
    {
      verification_id: 'VERIF_DEMO_298A9603D74B',
      project_id: 'PRJ_298A9603D74B',
      evidence_source: 'DEMO',
      is_demo: 1,
      vendor_progress_pct: 90.0,
      vendor_expenditure: 920000.0,
      vendor_completion_status: 'Complete',
      vendor_photos_count: 6,
      vendor_report_date: '2026-08-27',
      field_progress_pct: 55.0,
      field_expenditure: 610000.0,
      field_completion_status: 'Partial',
      field_photos_count: 4,
      field_verification_date: '2026-09-08',
      progress_diff_pct: 35.0,
      expenditure_diff: 310000.0,
      completion_mismatch: 1,
      location_consistency: 'Consistent (42m variance)',
      discrepancy_score: 'High',
      discrepancy_reasons: JSON.stringify([
        'Progress difference of 35 percentage points between vendor submission (90%) and field inspection (55%)',
        'Expenditure reporting variance of ₹3.10 Lakhs (Vendor: ₹9.20L vs Field Verified: ₹6.10L)',
        'Completion status mismatch: Vendor reported "Complete" while Field Officer recorded "Partial"'
      ]),
      ai_demo_explanation: 'Sample demonstration scenario: the vendor-reported progress is substantially higher than the field verification observation. The expenditure reports also differ. This creates a potential verification discrepancy and would warrant administrative review.',
      timeline_json: JSON.stringify([
        { date: '2026-08-10', type: 'Vendor Milestone', progress: 20, expenditure: 200000, status: 'In-Progress', description: 'Earthwork and site clearing completed', photos: 2 },
        { date: '2026-08-18', type: 'Vendor Milestone', progress: 40, expenditure: 410000, status: 'In-Progress', description: 'Aggregate stone sub-base laid and compacted', photos: 2 },
        { date: '2026-08-27', type: 'Vendor Final Report', progress: 90, expenditure: 920000, status: 'Complete', description: 'Bitumen surface layer completed, requesting final clearance', photos: 2 },
        { date: '2026-09-08', type: 'Field Officer Verification', progress: 55, expenditure: 610000, status: 'Partial', officer: 'Executive Engineer PWD', description: 'Physical inspection revealed aggregate base course completed, but final bitumen carpet and shoulder drainage incomplete. Recommended progress 55%.', photos: 4 }
      ])
    },

    // Project 2: Normal Compliant Demo (PRJ_615A0D94E08E)
    {
      verification_id: 'VERIF_DEMO_615A0D94E08E',
      project_id: 'PRJ_615A0D94E08E',
      evidence_source: 'DEMO',
      is_demo: 1,
      vendor_progress_pct: 100.0,
      vendor_expenditure: 195000.0,
      vendor_completion_status: 'Complete',
      vendor_photos_count: 5,
      vendor_report_date: '2026-08-15',
      field_progress_pct: 100.0,
      field_expenditure: 195000.0,
      field_completion_status: 'Complete',
      field_photos_count: 5,
      field_verification_date: '2026-08-22',
      progress_diff_pct: 0.0,
      expenditure_diff: 0.0,
      completion_mismatch: 0,
      location_consistency: 'Consistent (12m variance)',
      discrepancy_score: 'Low',
      discrepancy_reasons: JSON.stringify([
        'All physical assets, installation parameters, and financial expenditures verified consistent with sanction'
      ]),
      ai_demo_explanation: 'Sample demonstration scenario: Vendor-reported completion and field verification physical inspection are completely aligned. Disbursed expenditure matches on-site installation of borewell unit with functional water outlet.',
      timeline_json: JSON.stringify([
        { date: '2026-07-12', type: 'Vendor Milestone', progress: 25, expenditure: 50000, status: 'In-Progress', description: 'Hydro-geological survey and site pegging completed', photos: 1 },
        { date: '2026-07-26', type: 'Vendor Milestone', progress: 70, expenditure: 140000, status: 'In-Progress', description: 'Deep bore drilling and PVC casing inserted', photos: 2 },
        { date: '2026-08-15', type: 'Vendor Final Report', progress: 100, expenditure: 195000, status: 'Complete', description: 'Submersible pump, platform and tap connection installed and operational', photos: 2 },
        { date: '2026-08-22', type: 'Field Officer Verification', progress: 100, expenditure: 195000, status: 'Complete', officer: 'Mandal Development Officer', description: 'Water yield and electrical connection tested. Project functional and handed over to Gram Panchayat.', photos: 3 }
      ])
    },

    // Project 3: In-Progress Construction Demo (PRJ_B6FC3012D149)
    {
      verification_id: 'VERIF_DEMO_B6FC3012D149',
      project_id: 'PRJ_B6FC3012D149',
      evidence_source: 'DEMO',
      is_demo: 1,
      vendor_progress_pct: 45.0,
      vendor_expenditure: 1850000.0,
      vendor_completion_status: 'In-Progress',
      vendor_photos_count: 4,
      vendor_report_date: '2026-08-14',
      field_progress_pct: 40.0,
      field_expenditure: 1780000.0,
      field_completion_status: 'In-Progress',
      field_photos_count: 4,
      field_verification_date: '2026-08-20',
      progress_diff_pct: 5.0,
      expenditure_diff: 70000.0,
      completion_mismatch: 0,
      location_consistency: 'Consistent (28m variance)',
      discrepancy_score: 'Low',
      discrepancy_reasons: JSON.stringify([
        'Minor variance of 5 percentage points within standard engineering estimation tolerance'
      ]),
      ai_demo_explanation: 'Sample demonstration scenario: Progress and expenditure reports show minor acceptable variance (5 percentage points) consistent with ongoing stage-gate construction work.',
      timeline_json: JSON.stringify([
        { date: '2026-06-05', type: 'Vendor Milestone', progress: 15, expenditure: 600000, status: 'In-Progress', description: 'Foundation excavation and footing concrete poured', photos: 1 },
        { date: '2026-07-02', type: 'Vendor Milestone', progress: 30, expenditure: 1200000, status: 'In-Progress', description: 'RCC column raising completed up to roof level', photos: 1 },
        { date: '2026-08-14', type: 'Vendor Milestone Report', progress: 45, expenditure: 1850000, status: 'In-Progress', description: 'Steel roof truss erected and brick infill walls underway', photos: 2 },
        { date: '2026-08-20', type: 'Field Officer Verification', progress: 40, expenditure: 1780000, status: 'In-Progress', officer: 'Assistant Engineer Goa PWD', description: 'Truss erection verified. Brick masonry approx 80% of milestone scope. Milestone approved with minor retention.', photos: 2 }
      ])
    },

    // Project 4: Large Infrastructure Demo (PRJ_C936F1824A2B)
    {
      verification_id: 'VERIF_DEMO_C936F1824A2B',
      project_id: 'PRJ_C936F1824A2B',
      evidence_source: 'DEMO',
      is_demo: 1,
      vendor_progress_pct: 75.0,
      vendor_expenditure: 21000000.0,
      vendor_completion_status: 'In-Progress',
      vendor_photos_count: 8,
      vendor_report_date: '2026-08-28',
      field_progress_pct: 70.0,
      field_expenditure: 19850000.0,
      field_completion_status: 'In-Progress',
      field_photos_count: 6,
      field_verification_date: '2026-09-05',
      progress_diff_pct: 5.0,
      expenditure_diff: 1150000.0,
      completion_mismatch: 0,
      location_consistency: 'Consistent (35m variance)',
      discrepancy_score: 'Moderate',
      discrepancy_reasons: JSON.stringify([
        'Major structural elements placed; non-structural fixtures and electrical fittings pending verification'
      ]),
      ai_demo_explanation: 'Sample demonstration scenario: Large infrastructure work with multi-stage certification. Vendor claim includes procurement of canopy sheets; physical inspection certifies placed structural components with 5% pending installation.',
      timeline_json: JSON.stringify([
        { date: '2026-01-15', type: 'Vendor Milestone', progress: 20, expenditure: 5500000, status: 'In-Progress', description: 'Piling work and deep foundation tests certified', photos: 2 },
        { date: '2026-04-10', type: 'Vendor Milestone', progress: 45, expenditure: 12500000, status: 'In-Progress', description: 'RCC pier construction completed on both sides of transit corridor', photos: 2 },
        { date: '2026-07-12', type: 'Vendor Milestone', progress: 65, expenditure: 18000000, status: 'In-Progress', description: 'Heavy steel girder main span launched during rail block', photos: 2 },
        { date: '2026-08-28', type: 'Vendor Milestone Report', progress: 75, expenditure: 21000000, status: 'In-Progress', description: 'Deck slab concrete and staircase flights completed, roofing in progress', photos: 2 },
        { date: '2026-09-05', type: 'Field Officer Verification', progress: 70, expenditure: 19850000, status: 'In-Progress', officer: 'Divisional Railway / PWD Bridge Engineer', description: 'Structural stability verified satisfactory. Anti-skid flooring and lighting cables pending. Progress certified at 70%.', photos: 3 }
      ])
    }
  ];

  for (const v of demoVerifications) {
    await dbRun(`
      INSERT INTO project_verifications (
        verification_id, project_id, evidence_source, is_demo,
        vendor_progress_pct, vendor_expenditure, vendor_completion_status, vendor_photos_count, vendor_report_date,
        field_progress_pct, field_expenditure, field_completion_status, field_photos_count, field_verification_date,
        progress_diff_pct, expenditure_diff, completion_mismatch, location_consistency,
        discrepancy_score, discrepancy_reasons, ai_demo_explanation, timeline_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      v.verification_id, v.project_id, v.evidence_source, v.is_demo,
      v.vendor_progress_pct, v.vendor_expenditure, v.vendor_completion_status, v.vendor_photos_count, v.vendor_report_date,
      v.field_progress_pct, v.field_expenditure, v.field_completion_status, v.field_photos_count, v.field_verification_date,
      v.progress_diff_pct, v.expenditure_diff, v.completion_mismatch, v.location_consistency,
      v.discrepancy_score, v.discrepancy_reasons, v.ai_demo_explanation, v.timeline_json
    ]);
  }

  console.log(`Inserted ${demoVerifications.length} demo verification records.`);

  // 5. Seed Execution Evidence Photos (Before / During / After)
  const demoPhotos = [
    // PRJ_298A9603D74B - Road
    {
      evidence_id: 'EVD_DEMO_298A_BEFORE',
      project_id: 'PRJ_298A9603D74B',
      stage: 'BEFORE',
      image_url: '/demo-evidence/road_before.svg',
      caption: 'Pre-construction dirt path, overgrown road margins and uneven earthen gradient',
      official_location: 'Lucknow - Sitapur Road Sector 4, Uttar Pradesh',
      demo_gps_lat: 26.8467,
      demo_gps_lng: 80.9462,
      gps_label: 'Demo GPS',
      distance_meters: 42.0,
      timestamp: '2026-07-28 09:42:15 IST',
      captured_by: 'Vendor Baseline Survey'
    },
    {
      evidence_id: 'EVD_DEMO_298A_DURING',
      project_id: 'PRJ_298A9603D74B',
      stage: 'DURING',
      image_url: '/demo-evidence/road_during.svg',
      caption: 'Water Bound Macadam (WBM) sub-base compaction with vibratory roller',
      official_location: 'Lucknow - Sitapur Road Sector 4, Uttar Pradesh',
      demo_gps_lat: 26.8468,
      demo_gps_lng: 80.9464,
      gps_label: 'Demo GPS',
      distance_meters: 46.0,
      timestamp: '2026-08-18 14:15:30 IST',
      captured_by: 'Vendor Milestone 2 Submission'
    },
    {
      evidence_id: 'EVD_DEMO_298A_AFTER',
      project_id: 'PRJ_298A9603D74B',
      stage: 'AFTER',
      image_url: '/demo-evidence/road_after.svg',
      caption: 'Vendor claimed 90% completion; field inspection found bitumen layer partially laid',
      official_location: 'Lucknow - Sitapur Road Sector 4, Uttar Pradesh',
      demo_gps_lat: 26.8467,
      demo_gps_lng: 80.9463,
      gps_label: 'Demo GPS',
      distance_meters: 42.0,
      timestamp: '2026-08-27 17:30:00 IST',
      captured_by: 'Vendor Final Report'
    },

    // PRJ_615A0D94E08E - Borewell
    {
      evidence_id: 'EVD_DEMO_615A_BEFORE',
      project_id: 'PRJ_615A0D94E08E',
      stage: 'BEFORE',
      image_url: '/demo-evidence/borewell_before.svg',
      caption: 'Demarcated dry ground site for public drinking water tube-well installation',
      official_location: 'Karimnagar, Telangana',
      demo_gps_lat: 18.4386,
      demo_gps_lng: 79.1288,
      gps_label: 'Demo GPS',
      distance_meters: 10.0,
      timestamp: '2026-07-10 11:10:00 IST',
      captured_by: 'Mandal Surveyor (Baseline)'
    },
    {
      evidence_id: 'EVD_DEMO_615A_DURING',
      project_id: 'PRJ_615A0D94E08E',
      stage: 'DURING',
      image_url: '/demo-evidence/borewell_during.svg',
      caption: 'Deep bore drilling rig in operation with casing pipe deployment',
      official_location: 'Karimnagar, Telangana',
      demo_gps_lat: 18.4386,
      demo_gps_lng: 79.1287,
      gps_label: 'Demo GPS',
      distance_meters: 14.0,
      timestamp: '2026-07-26 15:40:00 IST',
      captured_by: 'Vendor Field Team'
    },
    {
      evidence_id: 'EVD_DEMO_615A_AFTER',
      project_id: 'PRJ_615A0D94E08E',
      stage: 'AFTER',
      image_url: '/demo-evidence/borewell_after.svg',
      caption: 'Fully operational borewell unit with concrete apron, tap stand, and scheme board',
      official_location: 'Karimnagar, Telangana',
      demo_gps_lat: 18.4385,
      demo_gps_lng: 79.1288,
      gps_label: 'Demo GPS',
      distance_meters: 12.0,
      timestamp: '2026-08-15 10:00:00 IST',
      captured_by: 'Field Officer Joint Inspection'
    },

    // PRJ_B6FC3012D149 - Public Convenience / Crematorium
    {
      evidence_id: 'EVD_DEMO_B6FC_BEFORE',
      project_id: 'PRJ_B6FC3012D149',
      stage: 'BEFORE',
      image_url: '/demo-evidence/crematorium_before.svg',
      caption: 'Initial plot survey and land leveling at designated public facility grounds',
      official_location: 'South Goa, Goa',
      demo_gps_lat: 15.2832,
      demo_gps_lng: 73.9862,
      gps_label: 'Demo GPS',
      distance_meters: 25.0,
      timestamp: '2026-06-02 08:30:00 IST',
      captured_by: 'Goa PWD Junior Engineer'
    },
    {
      evidence_id: 'EVD_DEMO_B6FC_DURING',
      project_id: 'PRJ_B6FC3012D149',
      stage: 'DURING',
      image_url: '/demo-evidence/crematorium_during.svg',
      caption: 'RCC columns and structural steel roof truss erection in progress',
      official_location: 'South Goa, Goa',
      demo_gps_lat: 15.2831,
      demo_gps_lng: 73.9863,
      gps_label: 'Demo GPS',
      distance_meters: 28.0,
      timestamp: '2026-08-02 11:20:00 IST',
      captured_by: 'Contractor Site Engineer'
    },
    {
      evidence_id: 'EVD_DEMO_B6FC_AFTER',
      project_id: 'PRJ_B6FC3012D149',
      stage: 'AFTER',
      image_url: '/demo-evidence/crematorium_after.svg',
      caption: 'Completed covered community public shelter with paved flooring and boundary lights',
      official_location: 'South Goa, Goa',
      demo_gps_lat: 15.2832,
      demo_gps_lng: 73.9862,
      gps_label: 'Demo GPS',
      distance_meters: 26.0,
      timestamp: '2026-08-20 16:45:00 IST',
      captured_by: 'Assistant Engineer Goa PWD'
    },

    // PRJ_C936F1824A2B - Foot Over Bridge (FOB)
    {
      evidence_id: 'EVD_DEMO_C936_BEFORE',
      project_id: 'PRJ_C936F1824A2B',
      stage: 'BEFORE',
      image_url: '/demo-evidence/fob_before.svg',
      caption: 'High-risk pedestrian crossing corridor before foot over bridge installation',
      official_location: 'Anakapalle, Andhra Pradesh',
      demo_gps_lat: 17.6896,
      demo_gps_lng: 83.0034,
      gps_label: 'Demo GPS',
      distance_meters: 30.0,
      timestamp: '2026-01-12 10:00:00 IST',
      captured_by: 'Railway Joint Safety Cell'
    },
    {
      evidence_id: 'EVD_DEMO_C936_DURING',
      project_id: 'PRJ_C936F1824A2B',
      stage: 'DURING',
      image_url: '/demo-evidence/fob_during.svg',
      caption: 'Erection of main steel truss span across tracks during authorized night block',
      official_location: 'Anakapalle, Andhra Pradesh',
      demo_gps_lat: 17.6897,
      demo_gps_lng: 83.0035,
      gps_label: 'Demo GPS',
      distance_meters: 35.0,
      timestamp: '2026-07-12 14:30:00 IST',
      captured_by: 'Structural EPC Contractor'
    },
    {
      evidence_id: 'EVD_DEMO_C936_AFTER',
      project_id: 'PRJ_C936F1824A2B',
      stage: 'AFTER',
      image_url: '/demo-evidence/fob_after.svg',
      caption: 'Pedestrian bridge open for commuter transit with overhead safety canopy and railings',
      official_location: 'Anakapalle, Andhra Pradesh',
      demo_gps_lat: 17.6896,
      demo_gps_lng: 83.0034,
      gps_label: 'Demo GPS',
      distance_meters: 32.0,
      timestamp: '2026-08-28 16:15:00 IST',
      captured_by: 'Joint Inspection Team'
    }
  ];

  for (const p of demoPhotos) {
    await dbRun(`
      INSERT INTO execution_evidence (
        evidence_id, project_id, evidence_source, is_demo, stage,
        image_url, caption, official_location, demo_gps_lat, demo_gps_lng,
        gps_label, distance_meters, timestamp, captured_by
      ) VALUES (?, ?, 'DEMO', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      p.evidence_id, p.project_id, p.stage,
      p.image_url, p.caption, p.official_location, p.demo_gps_lat, p.demo_gps_lng,
      p.gps_label, p.distance_meters, p.timestamp, p.captured_by
    ]);
  }

  console.log(`Inserted ${demoPhotos.length} demo evidence photos.`);

  // 6. Integrity check: Verify that production tables (works, expenditures) were NOT modified
  const worksCount = await dbGet('SELECT COUNT(*) as count FROM works');
  const expCount = await dbGet('SELECT COUNT(*) as count FROM expenditures');
  console.log(`Verification: works count = ${worksCount.count} (Must be 56,138)`);
  console.log(`Verification: expenditures count = ${expCount.count} (Must be 143,256)`);

  console.log('--- Demo Execution & Evidence Migration Completed Successfully ---');
}

migrateDemoEvidence().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
