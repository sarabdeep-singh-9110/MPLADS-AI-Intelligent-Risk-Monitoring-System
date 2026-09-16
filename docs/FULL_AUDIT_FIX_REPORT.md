# MPLADS AI — Audit Fix Report

**Date:** September 15, 2026  
**Scope:** Targeted remediation of verified audit findings from `docs/FULL_AUDIT_FINDINGS.md`  
**Constraint:** No UI redesign, no schema changes, no ML retraining, no new features.

---

## Fixes Applied

### ✅ Fix 1: CRITICAL — AI Copilot Inverted Anomaly Flag Semantics
**File:** `Backend/routes/ai.js` (Lines 35, 64)  
**Finding:** 3.1 — IsolationForest flag check `=== 1` was inverted. Anomalous projects (-1) displayed "Normal pattern"; normal projects (+1) displayed "Anomalous".

**Changes:**
- Changed `project.ml_anomaly_flag === 1` → `project.ml_anomaly_flag === -1` at both occurrence points
- Fixed `project.risk_reasons` → `project.rule_risk_reasons` (correct DB column)
- Fixed `project.risk_level` → `project.rule_risk_level` (correct DB column)
- Removed fake fallback metrics for non-existent columns (`amount_vs_work_median`, `amount_percentile`, `mp_work_location_count`, `days_since_recommendation`)
- Replaced with actual DB values (`rule_risk_score`, `ml_anomaly_score`, `hybrid_risk_score`)
- Updated risk_summary text to mention 60/40 weighting

**Verification:** `POST /api/ai/explain` with project `PRJ_B6FC3012D149` (ml_anomaly_flag=-1) returns:
```
"Feature space anomaly classification: Anomalous (Flagged by Isolation Forest)"
"rule_risk_level": "Critical"
```

---

### ✅ Fix 2: HIGH — GIS State Card NaN Values
**Files:** `Backend/routes/gis.js`, `Frontend/src/components/GisMapModule.jsx` (Line 60), `Frontend/src/pages/GisPage.jsx` (Line 156)  
**Findings:** 2.2, 2.3, 8.1 — Backend returned `avg_hybrid_risk_score` but frontend read `avg_risk_score`, causing NaN.

**Changes:**
- Added `AVG(hybrid_risk_score) as avg_risk_score` SQL alias in `gis.js` (backward compatible)
- Added `COUNT(DISTINCT constituency) as total_constituencies` to SQL query
- Updated both `GisMapModule.jsx` and `GisPage.jsx` to use defensive fallback: `st.avg_hybrid_risk_score || st.avg_risk_score || 0`

**Verification:** `GET /api/gis/map-data` returns both field names with real numeric values and `total_constituencies` count for all 33 states.

---

### ✅ Fix 3: HIGH — Stale 70/30 Risk Formula Text
**File:** `Frontend/src/pages/ProjectDetailPage.jsx` (Line 286)  
**Finding:** 2.1 — UI displayed "70% Rule-Based + 30% ML" while production uses 60/40.

**Change:** Updated formula text to `60% Rule-Based Score + 40% Isolation Forest ML Feature Anomaly.`

**Verification:** `grep "70%" Frontend/src/` returns 0 matches in source files.

---

### ✅ Fix 4: HIGH — 100-Record CSV Export Truncation
**File:** `Frontend/src/pages/ReportsPage.jsx` (Lines 60, 65, 69, 73)  
**Finding:** 24.1, 24.2 — All CSV exports hardcoded `limit=100`, silently truncating 56,138 records to 100.

**Changes:**
- Changed all `limit=100` → `limit=99999` across all 4 export endpoints (projects, financial, vendors, investigations)
- Replaced native browser `alert()` with `console.warn()` + proper state cleanup

**Verification:** `grep "limit=100" Frontend/src/` returns 0 matches.

---

### ✅ Fix 5: HIGH — Stale Technology Stack Claims in Documentation
**Files:** `README.md`, `doc/architecture.md`, `doc/team.md`  
**Findings:** 5.1, 22.1, 27.1 — Docs claimed Next.js, PostgreSQL/PostGIS, LLM API.

**Changes:**
- `README.md`: Frontend → "Vite + React 18 SPA", Database → "SQLite 3", AI → "Unsupervised Anomaly Detection: Scikit-learn Isolation Forest + Algorithmic Rule Engine"
- `doc/architecture.md`: Corrected all component descriptions, pipeline flow, and framework references
- `doc/team.md`: Fixed "PostgreSQL" → "SQLite", "Next.js" → "Vite + React"

**Verification:** `grep -r "PostGIS|Next.js|LLM API"` returns 0 matches in active docs (only in audit findings report).

---

### ✅ Fix 6: HIGH — SQLite Foreign Key Constraints Unenforced
**File:** `Backend/db/database.js` (Line 10)  
**Finding:** 4.1 — Foreign key constraints declared but never enforced at connection level.

**Change:** Added `db.run('PRAGMA foreign_keys = ON;')` after successful connection.

**Verification:** Server log confirms: `Connected to SQLite database with foreign keys enabled at: ...`

---

### ✅ Fix 7: MEDIUM — Unrestricted Wildcard CORS + Auth Documentation
**File:** `Backend/server.js` (Line 17)  
**Findings:** 9.1, 12.1 — `cors()` with no origin restriction; zero authentication.

**Changes:**
- Replaced `app.use(cors())` with origin-restricted CORS using `ALLOWED_ORIGINS` env var (defaults to localhost:3000, localhost:5173)
- Added clearly visible inline documentation block documenting the prototype authentication limitation
- No complex auth system introduced (per user constraint: "do not introduce unnecessarily complex authentication")

---

### ✅ Fix 8: MEDIUM — Empty .gitignore
**File:** `.gitignore`  
**Finding:** 1.2 — Zero-byte `.gitignore` risking accidental tracking of node_modules, .venv, DB binaries, etc.

**Change:** Populated with standard Node.js + Python + project-specific exclusions.

---

### ✅ Fix 9: MEDIUM — Hardcoded Financial Percentages
**File:** `Frontend/src/pages/FinancialPage.jsx` (Lines 642, 661, 662)  
**Finding:** 16.1 — Payment status percentages hardcoded at "96.33%" and "3.67%".

**Change:** Computed dynamically from `analytics.total_vouchers` and `analytics.in_progress_count` with safe division guard.

---

## Build Verification

```
✓ npm run build — Exit code 0
✓ 2326 modules transformed
✓ dist/index-Dg-7CoLF.js   716.00 kB | gzip: 188.38 kB
✓ Backend server restart — port 5000, foreign keys enabled
✓ POST /api/ai/explain — Anomaly flag semantics verified correct
✓ GET /api/gis/map-data — avg_risk_score and total_constituencies present
✓ Keyword searches: 0 residual stale strings (flag===1, 70%, limit=100, PostGIS, Next.js, LLM API)
```

---

## Remaining Known Limitations (NOT Fixed — By Design)

| # | Finding | Severity | Reason Not Fixed |
|---|---------|----------|------------------|
| 1.1 | 234 MB zip archives in repo root | MEDIUM | Requires git history rewrite; safe to exclude via .gitignore |
| 4.2 | Stale `database/seed_database.py` | MEDIUM | Legacy script deletion is a project management decision |
| 5.2 | Static offline ML inference (no live /predict endpoint) | MEDIUM | Per constraint: no new features, no ML changes |
| 10.1 | Monolithic 716 KB JS bundle | MEDIUM | Code-splitting is a performance optimization, not a bug fix |
| 11.1 | Silent fallback defaults in OverviewPage.jsx | HIGH | Changing error handling UI is out of scope for this fix pass |
| 14.1 | 4 dead React components (Navbar, NationalOverview, etc.) | MEDIUM | Deletion is optional cleanup; not functionally broken |
| 19.1 | Zero-allocation budget overrun masking | MEDIUM | Changing risk calculations is explicitly prohibited |
| 21.1 | Client-side keyword heuristic chat | MEDIUM | Connecting to LLM would be a new feature |
| 23.1 | No investigation audit trail | MEDIUM | Requires new DB table (schema change prohibited) |
| 25.1 | Non-collapsible sidebar on mobile | MEDIUM | UI redesign explicitly prohibited |
| 26.1 | Missing aria-labels on icon buttons | LOW | Accessibility enhancement deferred |
| 28.1 | Missing ESLint package | MEDIUM | Adding npm dependencies risks demo stability |

---

## Confirmation

- [x] No UI redesign performed
- [x] No database schema changes
- [x] No ML model retraining
- [x] No risk calculation formula changes (display text corrected only)
- [x] No dataset modifications
- [x] No new features introduced
- [x] Frontend build passes (exit code 0)
- [x] Backend starts successfully with all fixes applied
- [x] All CRITICAL and BLOCKER issues resolved

---

**VERDICT:** 🟢 **GO — All SIH Demo Blockers Resolved**
