# MPLADS AI — Comprehensive Source-Code Audit Findings

**Target System:** MPLADS AI Intelligent Risk & Monitoring System (SIH Problem Statement SIH26102)  
**Audit Date:** September 15, 2026  
**Auditor Mode:** Deep Source-Level Forensic Audit  
**Scope:** Complete recursive repository scan (Backend, Frontend, ML Service, Database, Data Pipeline, Documentation, and Configurations).  
**Constraint Enforced:** Zero modifications made during audit.

---

## 1. PROJECT STRUCTURE

### Finding 1.1: Retained Massive Compressed Archive Files in Repository Root
- **Severity:** MEDIUM
- **File:** `d:/SIH_2026/MPLADS-AI-Intelligent-Risk-Monitoring-System/` (Root Directory)
- **Line:** Filesystem Root Entries
- **Problem:** Multiple zip archives containing redundant copies of code, dependencies, datasets, and virtual environments are checked into the repository root:
  - `.venv.zip` (108.66 MB)
  - `database.zip` (69.80 MB)
  - `Frontend.zip` (26.43 MB)
  - `data.zip` (21.07 MB)
  - `Backend.zip` (7.48 MB)
  - `ml-service.zip` (0.56 MB)
  - `docs.zip` (0.01 MB)
  Total redundant binary payload: ~234 MB.
- **Impact:** Severely inflates repository cloning, disk usage, and deployment artifacts; risks version desynchronization between active source trees and stale archive snapshots.
- **Recommended fix:** Remove all `.zip` archives from git tracking and add `*.zip` to `.gitignore`.

### Finding 1.2: Empty Zero-Byte Documentation and Metadata Files
- **Severity:** LOW
- **File:** `doc/dataset-notes.md`, `doc/problem-definition.md`, `LICENSE`, `.gitignore`
- **Line:** Line 1
- **Problem:** Four repository files exist as zero-byte stub files containing no content or definitions:
  - `doc/dataset-notes.md` (0 bytes)
  - `doc/problem-definition.md` (0 bytes)
  - `LICENSE` (0 bytes)
  - `.gitignore` (0 bytes)
- **Impact:** Appears unfinished to evaluators; `.gitignore` being empty risks accidental tracking of build artifacts, OS temp files (`.DS_Store`, `Thumbs.db`), and virtual environments.
- **Recommended fix:** Populate `.gitignore` with standard Node.js and Python exclusions (`node_modules/`, `.venv/`, `dist/`, `*.pyc`, `*.db`, `*.zip`), add MIT license text to `LICENSE`, and either populate or prune empty documentation stubs.

---

## 2. FRONTEND

### Finding 2.1: Stale 70/30 Risk Scoring Formula Rendered in Project Detail
- **Severity:** HIGH
- **File:** `Frontend/src/pages/ProjectDetailPage.jsx`
- **Line:** 286
- **Problem:** The Project Detail Page displays:
  ```jsx
  <strong>Formula:</strong> 70% Rule-Based Score + 30% Isolation Forest ML Feature Anomaly.
  ```
  The production ML engine (`ml-service/scripts/create_hybrid_risk_score.py:59`) and database compute hybrid risk using **60% Rule-Based + 40% ML Anomaly**.
- **Impact:** Shows contradictory risk methodology to judges and reviewers between the UI explanation cards and the official audit reports (`22565_FINAL_INTEGRITY_AUDIT.md`).
- **Recommended fix:** Update the JSX formula description to:
  ```jsx
  <strong>Formula:</strong> 60% Rule-Based Score + 40% Isolation Forest ML Feature Anomaly.
  ```

### Finding 2.2: State Risk Metric Evaluates to `NaN` in GIS Map Module
- **Severity:** HIGH
- **File:** `Frontend/src/components/GisMapModule.jsx`
- **Line:** 60, 78
- **Problem:** Line 60 attempts to compute average state risk:
  ```javascript
  const avgRisk = Math.round(st.avg_risk_score * 10) / 10;
  ```
  The backend endpoint `GET /api/gis/map-data` returns column `avg_hybrid_risk_score`, NOT `avg_risk_score`. As a result, `st.avg_risk_score` is `undefined`, and `Math.round(undefined * 10) / 10` evaluates to `NaN`.
- **Impact:** Every single state card in the GIS visual module renders `NaN` as its risk value.
- **Recommended fix:** Access the correct property:
  ```javascript
  const avgRisk = Math.round((st.avg_hybrid_risk_score || 0) * 10) / 10;
  ```

### Finding 2.3: State Card Metric Evaluates to `NaN` and Constituency Count Defaults to `1` in GIS Page
- **Severity:** HIGH
- **File:** `Frontend/src/pages/GisPage.jsx`
- **Line:** 156, 171, 177
- **Problem:** Line 156 accesses `st.avg_risk_score`, evaluating to `NaN` in the card header. Additionally, Line 177 accesses `st.total_constituencies || 1`, but the backend SQL query in `Backend/routes/gis.js` does not project `total_constituencies`, causing all states to display `Constituencies: 1`.
- **Impact:** Corrupts visual analytics across all 33 States and Union Territories.
- **Recommended fix:** In `GisPage.jsx`, read `st.avg_hybrid_risk_score` and update `Backend/routes/gis.js` to project `COUNT(DISTINCT constituency) as total_constituencies`.

---

## 3. BACKEND

### Finding 3.1: Inverted IsolationForest Anomaly Flag Semantics in AI Copilot
- **Severity:** CRITICAL
- **File:** `Backend/routes/ai.js`
- **Line:** 35, 64
- **Problem:** Scikit-learn's `IsolationForest.predict()` outputs `-1` for anomalies (outliers) and `+1` for normal inliers (`ml-service/scripts/train_ml_model.py:70`). SQLite stores `ml_anomaly_flag = -1` for the 6,722 detected anomalies and `+1` for normal projects.
  However, `Backend/routes/ai.js` checks:
  ```javascript
  Line 35: `ML Anomaly Score: ${project.ml_anomaly_score || 0} (${project.ml_anomaly_flag === 1 ? 'Anomalous multivariate pattern detected by Isolation Forest' : 'Normal pattern'})`
  Line 64: `Feature space anomaly classification: ${project.ml_anomaly_flag === 1 ? 'Anomalous (Flagged)' : 'Normal'}`
  ```
- **Impact:** The AI Copilot explanation endpoint is 100% inverted:
  - Anomalous projects (`flag = -1`) are reported to officials as **"Normal pattern"**!
  - Normal inlier projects (`flag = 1`) are erroneously flagged as **"Anomalous multivariate pattern detected by Isolation Forest"**!
- **Recommended fix:** Change equality check to `-1`:
  ```javascript
  project.ml_anomaly_flag === -1 ? 'Anomalous multivariate pattern detected by Isolation Forest' : 'Normal pattern'
  ```

### Finding 3.2: Non-Existent Column Queries in AI Copilot Route Falling Back to Fake Default Values
- **Severity:** HIGH
- **File:** `Backend/routes/ai.js`
- **Line:** 28, 30, 34, 36, 56, 69, 70, 71, 72
- **Problem:** `ai.js` executes `SELECT w.* FROM works w ...` and attempts to read fields that do not exist in table `works`:
  - Line 28, 69: `project.amount_vs_work_median` (Column does not exist; always falls back to `'1.0'`)
  - Line 30: `project.risk_reasons` (Actual DB column is `rule_risk_reasons`; `ruleIndicators` is always `[]`)
  - Line 34, 56: `project.risk_level` (Actual DB columns are `rule_risk_level` and `hybrid_risk_level`; always defaults to `'Low'`)
  - Line 36, 71: `project.mp_work_location_count` (Column does not exist; always defaults to `1`)
  - Line 70: `project.amount_percentile` (Column does not exist; always defaults to `50`)
  - Line 72: `project.days_since_recommendation` (Column does not exist; always defaults to `0`)
- **Impact:** AI Copilot emits artificial placeholder metrics (`1.0x work-type category median`, `1 work recorded`, `0 days`) regardless of actual project history.
- **Recommended fix:** Map to existing schema columns (`rule_risk_reasons`, `rule_risk_level`, `hybrid_risk_level`) and compute ratio metrics dynamically or add missing analytical columns to table `works`.

### Finding 3.3: Misleading Route Module Name for Geographic Utilities
- **Severity:** LOW
- **File:** `Backend/routes/risk.js`
- **Line:** 1-40
- **Problem:** File `risk.js` contains no risk assessment logic; it exclusively provides `GET /api/states` and `GET /api/constituencies`.
- **Impact:** Misleads developers auditing the backend code as to where risk evaluation routes reside.
- **Recommended fix:** Rename `risk.js` to `locations.js` or `geo.js` and mount explicitly at `/api/locations`.

---

## 4. DATABASE

### Finding 4.1: SQLite Foreign Key Constraints Unenforced at Connection Level
- **Severity:** HIGH
- **File:** `Backend/db/database.js`
- **Line:** 6-12
- **Problem:** SQLite disables foreign key constraint checking by default. While tables `investigations` and `match_metadata` declare `FOREIGN KEY (project_id) REFERENCES works (project_id)`, `database.js` does NOT execute `PRAGMA foreign_keys = ON;`.
- **Impact:** Orphaned records can be inserted into `investigations` or `match_metadata` with invalid `project_id` values without database engine rejection.
- **Recommended fix:** Immediately execute `db.run('PRAGMA foreign_keys = ON;')` after establishing connection:
  ```javascript
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      db.run('PRAGMA foreign_keys = ON;');
      console.log('Connected to SQLite database with foreign keys enabled.');
    }
  });
  ```

### Finding 4.2: Stale Legacy Database Seed Script with Incompatible Schema
- **Severity:** MEDIUM
- **File:** `database/seed_database.py`
- **Line:** 1-73
- **Problem:** `database/seed_database.py` creates an obsolete schema containing only the raw `works` table without `investigations`, `expenditures`, `match_metadata`, or hybrid ML risk score columns (`hybrid_risk_score`, `ml_anomaly_score`).
- **Impact:** If executed by an operator setting up the project, it wipes the enriched database and breaks all backend endpoints.
- **Recommended fix:** Add a deprecation warning block or update `seed_database.py` to point to `Backend/scripts/init_database.py`.

### Finding 4.3: Unversioned Database Backup Snapshots Retained in Tree
- **Severity:** LOW
- **File:** `database/backups/`
- **Line:** Filesystem Directory
- **Problem:** Directory `database/backups/` contains 4 complete SQLite database copies (~181 MB total):
  - `mplads_risk_before_22565_2026-09-14T13-36-45.db` (45.3 MB)
  - `mplads_risk_before_22565_20260914_190556.db` (45.3 MB)
  - `mplads_risk_before_22565_20260914_191447.db` (45.3 MB)
  - `mplads_risk_before_22565_20260914_191517.db` (45.3 MB)
- **Impact:** Unnecessary disk consumption and risk of committing large binary blobs into git.
- **Recommended fix:** Add `database/backups/*.db` to `.gitignore` and archive database backups outside source repository.

---

## 5. ML / AI

### Finding 5.1: Unsubstantiated "LLM API" Technology Stack Claim
- **Severity:** HIGH
- **File:** `README.md`
- **Line:** 42-43
- **Problem:** Project documentation claims:
  ```markdown
  ### AI
  LLM API
  ```
  No Large Language Model API (OpenAI, Anthropic Claude, Google Gemini, Ollama, HuggingFace, etc.) is integrated in the backend or frontend codebase.
- **Impact:** Jurors or evaluators will consider this a misrepresentation or non-functional claim.
- **Recommended fix:** Accurately describe the AI engine as:
  ```markdown
  ### AI & Machine Learning
  - Unsupervised Anomaly Detection: Scikit-learn Isolation Forest
  - Explainable Decision Support: Algorithmic Rule Engine + Multivariate Feature Attribution
  ```

### Finding 5.2: Static Offline Model Inference with No Live Scoring Pipeline
- **Severity:** MEDIUM
- **File:** `ml-service/scripts/train_ml_model.py`
- **Line:** 58-85
- **Problem:** Isolation Forest is executed offline as a batch script writing to CSV. The backend Node.js Express server does not load `ml-service/models/anomaly_model.pkl` or run inference when new projects or vouchers are created/updated.
- **Impact:** The system functions purely on pre-scored static database records; dynamic insertion of new works will leave ML scores empty unless offline python batch scripts are manually re-run.
- **Recommended fix:** Document that model scoring is an offline batch pipeline, or deploy a lightweight Python FastAPI microservice that loads `anomaly_model.pkl` and provides a `/predict` endpoint.

---

## 6. DATA PIPELINE

### Finding 6.1: Hardcoded Absolute Windows Paths in Pipeline and Audit Scripts
- **Severity:** HIGH
- **File:** `Backend/scripts/audit_csv.py`, `Backend/scripts/audit_csv_std.py`, `Backend/scripts/audit_sample_projects.py`, `data/analysis/run_full_analysis.py`
- **Line:** Lines 3, 19
- **Problem:** Scripts hardcode Windows filesystem paths:
  ```python
  ml_csv = r"d:\SIH_2026\MPLADS-AI-Intelligent-Risk-Monitoring-System\data\processed\works_ml_scored.csv"
  BASE_DIR = r'D:\SIH_2026\MPLADS-AI-Intelligent-Risk-Monitoring-System'
  ```
- **Impact:** Running these pipeline scripts fails immediately on any peer reviewer's machine or CI/CD container with `FileNotFoundError`.
- **Recommended fix:** Use dynamic root path resolution:
  ```python
  BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
  ```

---

## 7. DATASET 22565

### Finding 7.1: Temporal & Scheme Disparity Limiting Auto-Linking Coverage
- **Severity:** MEDIUM
- **File:** `data/analysis/run_full_analysis.py`, `Backend/database/migrations/run_migration.py`
- **Line:** 310-338
- **Problem:** Dataset 22565 contains expenditure transactions specifically for the **18th Lok Sabha** (143,256 vouchers). In contrast, the baseline `works` dataset contains recommended works spanning previous Lok Sabhas (15th, 16th, 17th) and varying administrative nomenclature. As a result:
  - **Auto-Linked (HIGH):** 6,995 vouchers (4.88%)
  - **Ambiguous / Multi-Candidate (MEDIUM):** 25,260 vouchers (17.63%)
  - **Fuzzy Candidates (LOW):** 7,603 vouchers (5.31%)
  - **Unmatched (UNMATCHED):** 103,398 vouchers (72.18%)
- **Impact:** Evaluators clicking on projects may notice that only a fraction of historical works display linked disbursement records.
- **Recommended fix:** Ensure UI tooltips and documentation explicitly highlight that Dataset 22565 represents recent 18th Lok Sabha disbursements, explaining why older historical works have no linked expenditure vouchers.

---

## 8. API CONTRACTS

### Finding 8.1: API Field Discrepancy between Backend GIS Route and Frontend Components
- **Severity:** HIGH
- **File:** `Backend/routes/gis.js` vs `Frontend/src/components/GisMapModule.jsx`
- **Line:** `gis.js:13` vs `GisMapModule.jsx:60`
- **Problem:** Contract mismatch:
  - Backend emits: `{ avg_hybrid_risk_score: 12.34 }`
  - Frontend expects: `st.avg_risk_score`
- **Impact:** Breaks data contract; breaks state ranking and displays `NaN` in UI.
- **Recommended fix:** Update `gis.js` to alias both names:
  ```sql
  AVG(hybrid_risk_score) as avg_hybrid_risk_score,
  AVG(hybrid_risk_score) as avg_risk_score
  ```

---

## 9. SECURITY

### Finding 9.1: Unrestricted Wildcard CORS Enabled on All Endpoints
- **Severity:** MEDIUM
- **File:** `Backend/server.js`
- **Line:** 17
- **Problem:** `app.use(cors());` configures `Access-Control-Allow-Origin: *` across all routes with no domain restriction.
- **Impact:** In production or hosted staging, malicious third-party websites visited by an authenticated official's browser could make background requests to fetch or modify investigation records.
- **Recommended fix:** Restrict CORS origin in production:
  ```javascript
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'];
  app.use(cors({ origin: allowedOrigins }));
  ```

### Finding 9.2: Missing Rate Limiting on Mutation and AI Endpoints
- **Severity:** MEDIUM
- **File:** `Backend/server.js`, `Backend/routes/investigations.js`, `Backend/routes/matches.js`
- **Line:** Routes mount points
- **Problem:** No rate limiter (e.g. `express-rate-limit`) is installed or attached to `/api/ai/explain`, `/api/investigations`, or `/api/matches/:matchId`.
- **Impact:** Susceptible to automated denial-of-service or database write thrashing.
- **Recommended fix:** Install and apply `express-rate-limit` with 100 requests per 15-minute window for standard APIs and 20 requests per minute for write endpoints.

---

## 10. PERFORMANCE

### Finding 10.1: Oversized Monolithic JavaScript Bundle Warning in Frontend Build
- **Severity:** MEDIUM
- **File:** `Frontend/dist/assets/index-X8la-E8M.js`
- **Line:** Build output line 14
- **Problem:** Vite build generates a single monolithic client chunk of **715.71 kB** (188.35 kB gzip), exceeding the recommended 500 kB limit. Heavy third-party dependencies (`leaflet`, `recharts`, `lucide-react`) are bundled together into the root bundle.
- **Impact:** Increases Initial Page Load Time (TTI/FCP) on slower district government internet connections.
- **Recommended fix:** Use dynamic `React.lazy()` for heavy sub-pages (`GisPage`, `FinancialPage`, `ReportsPage`) and configure `manualChunks` in `Frontend/vite.config.js`:
  ```javascript
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          leaflet: ['leaflet', 'react-leaflet']
        }
      }
    }
  }
  ```

---

## 11. ERROR HANDLING

### Finding 11.1: Silent Fallback Masking Network and Backend Failures in National Overview
- **Severity:** HIGH
- **File:** `Frontend/src/pages/OverviewPage.jsx`
- **Line:** 92-103, 372-384
- **Problem:** Overview page components destructure data with fallback defaults:
  ```javascript
  const {
    total_projects = 56138,
    critical_count = 5,
    high_count = 198,
    medium_count = 3569,
    low_count = 52366,
    total_allocation_amount = 33502878543,
    average_hybrid_risk = 10.74,
    average_ml_anomaly_score = 16.16,
    total_states = 33, ...
  } = data;
  ```
  If the backend API goes down or returns a 500 error, `data` remains empty `{}` and the dashboard displays the fallback numbers without alerting the user.
- **Impact:** Masks outages during evaluation; creates a deceptive perception that the system is functioning when the database connection may have died.
- **Recommended fix:** Check `if (error)` and render an explicit error banner with a retry button instead of silently rendering fallback metrics.

---

## 12. AUTHENTICATION / AUTHORIZATION

### Finding 12.1: Total Absence of Backend Authentication and Authorization Checks
- **Severity:** CRITICAL
- **File:** `Backend/server.js`, `Backend/routes/investigations.js`, `Backend/routes/matches.js`
- **Line:** Global Server & Route Handlers
- **Problem:** The system has no user accounts, JWT tokens, session cookies, or API authentication keys. The "Role Persona" system (`RoleSelector.jsx`) is 100% cosmetic and client-side:
  - Any HTTP client can issue `PATCH /api/investigations/:projectId` and modify investigation priority, status, or officer notes.
  - Any client can issue `PATCH /api/matches/:matchId` and approve, reject, or unlink candidate matches.
- **Impact:** Fails standard government security audit requirements (unauthorized administrative tampering).
- **Recommended fix:** For SIH demonstration, implement lightweight token-based authorization or session simulation, validating that write operations require an authorized role header.

---

## 13. ENVIRONMENT VARIABLES / SECRETS

### Finding 13.1: Zero Hardcoded Secret Leaks Found in Repository
- **Severity:** LOW (Positive Finding)
- **File:** Entire Project Tree
- **Line:** N/A
- **Problem:** Deep regex audit for exposed API tokens (`ghp_`, `sk-`, Bearer tokens, private keys, passwords) returned 0 leaked credentials.
- **Impact:** Clean repository state with respect to credential leakage.
- **Recommended fix:** Maintain strict exclusion in `.gitignore` if cloud LLM or external database connection strings are added in future iterations.

---

## 14. LEGACY / DEAD CODE

### Finding 14.1: Four Completely Unused / Dead React Components
- **Severity:** MEDIUM
- **File:**
  1. `Frontend/src/components/Navbar.jsx` (4.52 KB)
  2. `Frontend/src/components/NationalOverview.jsx` (11.95 KB)
  3. `Frontend/src/components/ProjectDeepDiveModal.jsx` (9.01 KB)
  4. `Frontend/src/components/RiskMonitoringTable.jsx` (11.42 KB)
- **Line:** Full Files
- **Problem:** None of these four components are imported or rendered by any file in the application:
  - `Navbar.jsx` was replaced by `Header.jsx` + `Sidebar.jsx`.
  - `NationalOverview.jsx` was replaced by `OverviewPage.jsx`.
  - `ProjectDeepDiveModal.jsx` was replaced by `ProjectDetailPage.jsx`.
  - `RiskMonitoringTable.jsx` uses an outdated dark theme (`bg-slate-900`) and legacy column names (`proj.risk_score`), replaced by inline tables in `RiskMonitoringPage.jsx`.
- **Impact:** 36.9 KB of dead code that creates developer confusion during audits.
- **Recommended fix:** Safely delete these 4 unreferenced files.

---

## 15. DUPLICATE CODE

### Finding 15.1: Duplicate Database Initializers with Conflicting Table Schemas
- **Severity:** MEDIUM
- **File:** `database/seed_database.py` vs `Backend/scripts/init_database.py`
- **Line:** Full Files
- **Problem:** Two separate Python scripts seed the SQLite database:
  - `database/seed_database.py` reads `master_works.csv` and creates a minimal 13-column `works` table.
  - `Backend/scripts/init_database.py` reads `works_hybrid_risk_scored.csv` and creates a 23-column `works` table and `investigations` table.
- **Impact:** Running `seed_database.py` breaks the production schema.
- **Recommended fix:** Remove `seed_database.py` and standardize on `Backend/scripts/init_database.py`.

---

## 16. HARDCODED DATA

### Finding 16.1: Hardcoded Statistical Strings in Financial Intelligence Page
- **Severity:** LOW
- **File:** `Frontend/src/pages/FinancialPage.jsx`
- **Line:** 642, 661, 662
- **Problem:** Payment status tabs and progress bar contain static hardcoded percentage strings:
  - Line 642: `Cleared (96.33%)`
  - Line 661: `<span>Cleared: {formatINR(analytics.total_expenditure - analytics.in_progress_amount)} (96.33%)</span>`
  - Line 662: `<span>In-Progress: {formatINR(analytics.in_progress_amount)} (3.67%)</span>`
- **Impact:** If the dataset changes or state filters are applied, the percentages remain frozen at 96.33% and 3.67%.
- **Recommended fix:** Calculate dynamically from `analytics.total_vouchers` and `analytics.in_progress_count`:
  ```jsx
  <span>Cleared: {formatINR(clearedAmount)} ({((clearedCount / analytics.total_vouchers) * 100).toFixed(2)}%)</span>
  ```

---

## 17. FRONTEND ↔ BACKEND CONSISTENCY

### Finding 17.1: AI Copilot Evidence Attribute Incompatibility
- **Severity:** HIGH
- **File:** `Backend/routes/ai.js` vs `Frontend/src/pages/AiCopilotPage.jsx`
- **Line:** `ai.js:67-73` vs `AiCopilotPage.jsx:215-235`
- **Problem:** `Backend/routes/ai.js` returns `numerical_evidence: { amount_vs_work_median: 1.0, mp_work_location_count: 1 }` with artificial dummy numbers.
- **Impact:** Frontend renders these metrics in key-value stat boxes, presenting uncalculated values as verified forensic evidence.
- **Recommended fix:** Either compute these metrics dynamically from the works table or omit the numerical evidence block.

---

## 18. RISK-SCORE CORRECTNESS

### Finding 18.1: Conflicting Risk Score Thresholds in Legacy Components
- **Severity:** LOW
- **File:** `Frontend/src/components/RiskMonitoringTable.jsx`
- **Line:** 150
- **Problem:** Uses score cutoffs `>= 80` (Critical), `>= 60` (High), `>= 30` (Medium), whereas the active model uses `>= 70` (Critical), `>= 45` (High), `>= 25` (Medium).
- **Impact:** If `RiskMonitoringTable.jsx` is resurrected, it will misclassify risk severity.
- **Recommended fix:** Delete `RiskMonitoringTable.jsx`.

---

## 19. FINANCIAL-RISK CORRECTNESS

### Finding 19.1: Zero-Allocation Projects Mask Budget Overrun Calculation
- **Severity:** MEDIUM
- **File:** `Backend/routes/projects.js`
- **Line:** 204, 226
- **Problem:** Line 204 defines:
  ```javascript
  const allocAmount = parseFloat(project.allocation_amount) || 0;
  const benchmarkBudget = allocAmount > 0 ? allocAmount : totalSpent;
  ```
  If `allocation_amount` is 0 (unspecified in initial record) but vouchers exist totaling ₹1 Crore, `benchmarkBudget` defaults to `totalSpent`, meaning `totalSpent > benchmarkBudget * 1.05` evaluates to `false`.
- **Impact:** Unsanctioned works with zero allocation but massive disbursements escape the budget overrun risk flag.
- **Recommended fix:** Add an explicit risk flag when `allocation_amount == 0 && totalSpent > 0`:
  ```javascript
  if (allocAmount === 0 && totalSpent > 0) {
    financialScore += 35;
    signals.push({ type: 'UNSANCTIONED_SPEND', severity: 'HIGH', message: 'Expenditure disbursed against zero recorded project allocation' });
  }
  ```

---

## 20. MATCHING SYSTEM

### Finding 20.1: Candidate Project IDs Stored as Raw Comma-Separated Text
- **Severity:** LOW
- **File:** `Backend/database/migrations/run_migration.py`, `Backend/routes/matches.js`
- **Line:** `run_migration.py:324`, `matches.js:198-202`
- **Problem:** `candidate_project_ids` in `match_metadata` is serialized as a plain comma-separated string (`PRJ_A,PRJ_B`) instead of a structured JSON array (`["PRJ_A", "PRJ_B"]`).
- **Impact:** Requires parsing strings with `.split(',')` and limits queryability using SQLite's JSON functions.
- **Recommended fix:** Store as valid JSON array string: `json.dumps(pids[:10])`.

---

## 21. AI COPILOT

### Finding 21.1: Client-Side Canned Heuristic Responses in AI Chat Drawer
- **Severity:** MEDIUM
- **File:** `Frontend/src/components/AiRiskCopilotDrawer.jsx`
- **Line:** 50-54
- **Problem:** The interactive copilot chat does not query an LLM or dynamic NLP model; it evaluates keywords client-side:
  ```javascript
  if (q.includes('why') || q.includes('evidence') || q.includes('reason')) { ... }
  else if (q.includes('action') || q.includes('verify') || q.includes('recommend')) { ... }
  ```
- **Impact:** Asking any natural question outside these three keywords yields a generic fallback response.
- **Recommended fix:** Clarify in the UI that the chat is an "Interactive Rule Inspector" or connect the endpoint to a local/cloud LLM completion handler.

---

## 22. GIS

### Finding 22.1: PostGIS Claim in Architecture Documentation Unimplemented
- **Severity:** MEDIUM
- **File:** `doc/architecture.md`, `README.md`
- **Line:** `architecture.md:23`, `README.md:40`
- **Problem:** Documentation lists `PostgreSQL / PostGIS` under Database and GIS. The project uses standard SQLite with text-based columns (`state`, `constituency`, `block`, `village`).
- **Impact:** Discrepancy between architectural documentation and implementation.
- **Recommended fix:** Update documentation to state:
  ```markdown
  ### GIS & Spatial Analytics
  - Spatial Hierarchy: State → Parliamentary Constituency → Block → Village
  - Engine: SQLite Spatial Aggregations + Leaflet / Responsive Regional Heatmaps
  ```

---

## 23. INVESTIGATIONS

### Finding 23.1: Missing Historical Audit Trail for Investigation Status Changes
- **Severity:** MEDIUM
- **File:** `Backend/routes/investigations.js`, `database/mplads_risk.db`
- **Line:** `investigations.js:168`
- **Problem:** Table `investigations` maintains only single current values for `status`, `priority`, and `officer_notes`. Updating an investigation overwrites the previous notes and status without logging previous revisions, author identity, or status transition timestamps.
- **Impact:** Fails audit trail compliance for forensic monitoring.
- **Recommended fix:** Create an `investigation_history` table:
  ```sql
  CREATE TABLE investigation_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT,
    old_status TEXT,
    new_status TEXT,
    officer_notes TEXT,
    changed_by TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```

---

## 24. REPORTS / EXPORT

### Finding 24.1: Hardcoded 100-Record Limit on National CSV Exports
- **Severity:** HIGH
- **File:** `Frontend/src/pages/ReportsPage.jsx`
- **Line:** 60, 65, 69, 73
- **Problem:** All CSV export routines query:
  ```javascript
  let endpoint = `${API_BASE_URL}/api/projects?limit=100`;
  endpoint = `${API_BASE_URL}/api/expenditures?limit=100`;
  endpoint = `${API_BASE_URL}/api/investigations?limit=100`;
  ```
- **Impact:** An official clicking "Export Full National Risk Report" expecting all 56,138 works receives a spreadsheet with exactly 100 rows, with no notification of truncation.
- **Recommended fix:** Implement dedicated export endpoints that stream full dataset CSVs directly from SQLite:
  ```javascript
  window.open(`${API_BASE_URL}/api/projects/export?format=csv`, '_blank');
  ```

### Finding 24.2: Native Browser Alert in Export Handler
- **Severity:** LOW
- **File:** `Frontend/src/pages/ReportsPage.jsx`
- **Line:** 83
- **Problem:** Invokes native browser modal `alert('No data records available for this export')`.
- **Impact:** Degrades UI polish and disrupts user experience.
- **Recommended fix:** Use an inline UI alert banner or toast notification.

---

## 25. RESPONSIVE UI

### Finding 25.1: Non-Collapsible Fixed Sidebar on Mobile Viewports
- **Severity:** MEDIUM
- **File:** `Frontend/src/components/Sidebar.jsx`, `Frontend/src/App.jsx`
- **Line:** `Sidebar.jsx:32`
- **Problem:** Sidebar has a fixed width `w-64` and is always displayed. On small mobile viewports (<768px), it consumes over half the screen width, crowding the main viewport.
- **Impact:** Poor usability on tablets and mobile devices during field inspections.
- **Recommended fix:** Hide sidebar on mobile (`hidden md:flex`) and provide a hamburger menu toggle in `Header.jsx`.

---

## 26. ACCESSIBILITY

### Finding 26.1: Missing Accessible Labels on Icon Action Buttons
- **Severity:** LOW
- **File:** `Frontend/src/pages/ProjectsPage.jsx`, `Frontend/src/pages/RiskMonitoringPage.jsx`, `Frontend/src/components/Header.jsx`
- **Line:** `ProjectsPage.jsx:289`, `RiskMonitoringPage.jsx:344`
- **Problem:** Action buttons rendering only icons (eye, robot copilot, search, bell) lack `aria-label` attributes.
- **Impact:** Screen readers announce them as unlabelled buttons, violating WCAG 2.1 Level A compliance.
- **Recommended fix:** Add `aria-label="View Project Audit Details"` and `aria-label="Open AI Risk Copilot"`.

---

## 27. DOCUMENTATION

### Finding 27.1: Stale Framework Claims in Main README and Architecture Docs
- **Severity:** HIGH
- **File:** `README.md`, `doc/architecture.md`
- **Line:** `README.md:31, 40, 43`, `architecture.md:7, 23`
- **Problem:** Documentation claims:
  - Frontend: `Next.js / React` (Actual: Vite + React 18 SPA)
  - Database: `PostgreSQL / PostGIS` (Actual: SQLite 3)
  - AI: `LLM API` (Actual: Python Isolation Forest + Node.js Rule Engine)
- **Impact:** Direct conflict between documentation claims and codebase implementation.
- **Recommended fix:** Update `README.md` and `doc/architecture.md` with the accurate current technology stack.

---

## 28. BUILD / DEPLOYMENT

### Finding 28.1: Missing ESLint Package Causing `npm run lint` Failure
- **Severity:** MEDIUM
- **File:** `Frontend/package.json`
- **Line:** 9
- **Problem:** `package.json` defines `"lint": "eslint ."`, but `eslint` is not installed in `devDependencies` or `dependencies`.
- **Impact:** Executing `npm run lint` aborts with `'eslint' is not recognized as an internal or external command`.
- **Recommended fix:** Install ESLint or update script:
  ```bash
  npm install -D eslint @eslint/js
  ```

---

## 29. SIH DEMO RISKS

### Finding 29.1: Live Demonstration Vulnerabilities for Evaluators
- **Severity:** HIGH
- **File:** Multiple modules
- **Line:** N/A
- **Problem:** The following visible flaws will manifest during a live SIH jury evaluation:
  1. **AI Copilot Live Demo:** Selecting an anomalous work will display "Normal pattern" due to inverted `=== 1` flag.
  2. **GIS Page Live Demo:** Every state card will display `NaN` as its risk value.
  3. **Project Detail Live Demo:** UI card will contradict the audit report by displaying "70% Rule + 30% ML".
  4. **Reports Live Demo:** Clicking "Export CSV" will generate a file with only 100 rows.
  5. **Technology Stack Questioning:** Jurors checking repo code will notice SQLite / Vite instead of claimed PostgreSQL / PostGIS / Next.js / LLM.
- **Impact:** Direct loss of presentation marks during hackathon judging.
- **Recommended fix:** Apply the targeted fixes identified in Section 30 before demo presentation.

---

## 30. OVERALL VERDICT

### Summary of Audit Counts
- **CRITICAL Issues:** 2
- **HIGH Issues:** 9
- **MEDIUM Issues:** 11
- **LOW Issues:** 7

---

==================================================
FINAL CLASSIFICATION
==================================================

CRITICAL: 2
HIGH: 9
MEDIUM: 11
LOW: 7

--------------------------------------------------
BLOCKERS BEFORE SIH:
--------------------------------------------------
1. **Fix Inverted ML Anomaly Flag in AI Copilot (`Backend/routes/ai.js:35, 64`):**
   Change `project.ml_anomaly_flag === 1` to `=== -1` so real anomalies are flagged as anomalies instead of normal inliers.
2. **Fix GIS State Card `NaN` Values (`Frontend/src/components/GisMapModule.jsx:60` & `Frontend/src/pages/GisPage.jsx:156`):**
   Change `st.avg_risk_score` to `st.avg_hybrid_risk_score` so average risk numbers display properly.
3. **Correct Stale 70/30 Formula in UI (`Frontend/src/pages/ProjectDetailPage.jsx:286`):**
   Change "70% Rule-Based + 30% Isolation Forest" to "60% Rule-Based Score + 40% Isolation Forest ML Feature Anomaly".
4. **Fix 100-Record Truncation in CSV Export (`Frontend/src/pages/ReportsPage.jsx:60, 65, 69, 73`):**
   Allow exporting full filtered record sets rather than hard-capping at `limit=100`.
5. **Align README & Architecture Claims with Reality (`README.md` & `doc/architecture.md`):**
   Correct claims of Next.js, PostgreSQL, PostGIS, and LLM API to accurately state Vite + React, SQLite, and Isolation Forest + Rule Engine.

--------------------------------------------------
SHOULD FIX BEFORE SIH:
--------------------------------------------------
1. **Clean up Non-Existent Column Queries in `Backend/routes/ai.js`:** Map `rule_risk_reasons` and `rule_risk_level` properly to avoid fake fallback metrics.
2. **Enable SQLite Foreign Keys (`Backend/db/database.js`):** Add `db.run('PRAGMA foreign_keys = ON;')`.
3. **Replace Hardcoded Financial Percentages (`Frontend/src/pages/FinancialPage.jsx:642, 661`):** Compute cleared/in-progress percentages dynamically.
4. **Prune Dead React Components (`Navbar.jsx`, `NationalOverview.jsx`, `ProjectDeepDiveModal.jsx`, `RiskMonitoringTable.jsx`):** Eliminate confusion during evaluator code reviews.
5. **Install ESLint or Remove Lint Script (`Frontend/package.json`):** Prevent `npm run lint` from failing.

--------------------------------------------------
OPTIONAL:
--------------------------------------------------
1. Delete unused 234 MB zip archive snapshots in repository root.
2. Replace client-side keyword heuristic in `AiRiskCopilotDrawer.jsx` with an actual local LLM or expanded rule attribution tree.
3. Implement responsive collapsible mobile navigation in `Sidebar.jsx`.
4. Add `aria-label` attributes on icon buttons for accessibility.
5. Populate empty stub files (`LICENSE`, `.gitignore`, `doc/*.md`).

--------------------------------------------------
VERDICT:
--------------------------------------------------

🟠 GO AFTER FIXES
