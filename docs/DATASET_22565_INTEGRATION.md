# Dataful Dataset 22565 Integration — Technical & Architecture Guide
**System:** MPLADS AI Intelligent Risk Monitoring System  
**Dataset:** Dataful Dataset 22565 (*"18th Lok Sabha MPLADS — State / Lok Sabha Constituency / Work Name / Vendor Name-wise Amount Spent by Each MP"*)  
**Architecture Pattern:** Option B — Safe Two-Tier Relational Integration  
**Date of Integration:** September 2026  

---

## 1. Executive Summary & Core Constraints

Dataful Dataset 22565 contains **143,256 analytical expenditure transaction records** representing commercial disbursals, vendor allocations, and implementing agency transactions under the **18th Lok Sabha**.

To preserve the absolute analytical integrity of the existing production system (56,138 work recommendation records), the **Option B: Safe Two-Tier Relational Integration** architecture was implemented:

1. **Zero Mutation to Works Table:** The existing `works` table remains completely untouched in count (exactly 56,138 rows), schema meaning, risk formulas, and SHA-256 data hash (`cc48238e2a6537807add0a614ec8e90abcb1a3e1876fa77cc587de1008f11997`).
2. **Untouched Production ML & Hybrid Scores:** The Isolation Forest machine learning model and existing 60% Rule + 40% ML Hybrid Risk Score formulas were preserved with 0 modifications.
3. **Dedicated Financial Intelligence Layer:** Created an independent `expenditures` table (143,256 vouchers) and a `match_metadata` bridge table (143,256 records).
4. **Conservative Algorithmic Matching Thresholds:**
   - **HIGH Confidence (6,995 vouchers / 4.88%):** Programmatically linked with `project_id` in `match_metadata` and flagged as `AUTO_LINKED`.
   - **MEDIUM Confidence (25,260 vouchers / 17.63%):** Kept with `project_id = NULL` and quarantined in the human administrative queue as `PENDING_REVIEW`.
   - **LOW Confidence (7,603 vouchers / 5.31%):** Kept with `project_id = NULL` and quarantined as `PENDING_REVIEW`.
   - **UNMATCHED (103,398 vouchers / 72.18%):** Kept with `project_id = NULL` as `UNMATCHED`.
5. **Independent Financial Risk Scoring:** Project financial risk (`financial_risk_score` 0–100, `financial_risk_level`) is computed exclusively from financial disbursement signals (budget overrun, vendor concentration, in-progress payment exposure, same-day split transactions) completely independent of the hybrid risk score.

---

## 2. Database Schema Specifications

### 2.1 Table: `expenditures`
Stores all 143,256 analytical transaction vouchers from Dataset 22565.

```sql
CREATE TABLE expenditures (
    expenditure_id TEXT PRIMARY KEY,                       -- Format: EXP_<12-char SHA-256 hash>
    data_as_on TEXT,
    state TEXT,
    implementing_district_per_source TEXT,
    implementing_district_per_lgd TEXT,
    implementing_district_lgd_code TEXT,
    loksabha_constituency TEXT,
    loksabha_MP_name TEXT,
    work TEXT,
    implementing_agency_name TEXT,
    vendor_name TEXT,
    expenditure_date TEXT,
    payment_status TEXT,                                   -- 'Payment Success' or 'Payment In-Progress'
    expenditure_amount REAL,                               -- Amount in INR
    units TEXT,                                            -- 'INR'
    notes TEXT,
    source_dataset TEXT DEFAULT 'Dataful Dataset 22565',
    created_at TEXT
);

-- High-performance query indexes
CREATE INDEX idx_exp_vendor ON expenditures(vendor_name);
CREATE INDEX idx_exp_mp ON expenditures(loksabha_MP_name);
CREATE INDEX idx_exp_state ON expenditures(state);
CREATE INDEX idx_exp_const ON expenditures(loksabha_constituency);
CREATE INDEX idx_exp_status ON expenditures(payment_status);
CREATE INDEX idx_exp_date ON expenditures(expenditure_date);
CREATE INDEX idx_exp_amount ON expenditures(expenditure_amount);
```

### 2.2 Table: `match_metadata`
Bridge table linking expenditures to production works without altering the `works` table.

```sql
CREATE TABLE match_metadata (
    match_id TEXT PRIMARY KEY,                             -- Format: MAT_<12-char SHA-256 hash>
    expenditure_id TEXT NOT NULL,                          -- Foreign key to expenditures(expenditure_id)
    project_id TEXT,                                       -- Nullable foreign key to works(project_id)
    match_confidence TEXT NOT NULL,                        -- 'HIGH', 'MEDIUM', 'LOW', 'UNMATCHED'
    match_method TEXT,                                     -- 'exact_normalized_l1', 'exact_normalized_ambiguous', 'scoped_fuzzy_SequenceMatcher', 'none'
    similarity_score REAL,                                 -- Normalized string similarity ratio (0.0 to 1.0)
    match_status TEXT NOT NULL,                            -- 'AUTO_LINKED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'UNMATCHED'
    matched_at TEXT,
    reviewed_by TEXT,                                      -- Name/Role of administrative reviewer
    reviewed_at TEXT,                                      -- Timestamp of review action
    review_notes TEXT,                                     -- Auditor inspection notes
    candidate_project_ids TEXT,                            -- Comma-separated candidate project IDs for human review
    FOREIGN KEY (expenditure_id) REFERENCES expenditures(expenditure_id),
    FOREIGN KEY (project_id) REFERENCES works(project_id)
);

-- Indexes
CREATE INDEX idx_mm_exp_id ON match_metadata(expenditure_id);
CREATE INDEX idx_mm_proj_id ON match_metadata(project_id);
CREATE INDEX idx_mm_confidence ON match_metadata(match_confidence);
CREATE INDEX idx_mm_status ON match_metadata(match_status);
```

---

## 3. Algorithmic Matching Logic & Classification Tiers

1. **Deterministic ID Generation:**
   - `expenditure_id`: `EXP_` + first 12 characters of SHA-256 hash of `(state | district | constituency | mp_name | work | vendor | agency | date | status | amount | occurrence_counter)`.
   - `match_id`: `MAT_` + first 12 characters of SHA-256 hash of `(expenditure_id | row_index)`.

2. **Matching Criteria & Classification:**
   - **Level 1 Exact Normalized Match (`pids == 1`):** High confidence (100% similarity). Linked to `project_id`, flagged `AUTO_LINKED` (4,531 records).
   - **Level 1 Ambiguous Match (`pids > 1`):** Medium confidence (100% similarity but multiple possible production projects). Kept `project_id = NULL`, candidate project IDs recorded, flagged `PENDING_REVIEW` (22,238 records).
   - **Constituency-Scoped Fuzzy Match ($\ge 85\%$):** High confidence. Linked to best matching `project_id`, flagged `AUTO_LINKED` (2,464 records).
   - **Constituency-Scoped Fuzzy Match ($70\% \le \text{score} < 85\%$):** Medium confidence. Kept `project_id = NULL`, candidate recorded, flagged `PENDING_REVIEW` (3,022 records).
   - **Constituency-Scoped Fuzzy Match ($50\% \le \text{score} < 70\%$):** Low confidence. Kept `project_id = NULL`, candidate recorded, flagged `PENDING_REVIEW` (7,603 records).
   - **No Match ($< 50\%$ or no MP scope):** Kept `project_id = NULL`, flagged `UNMATCHED` (103,398 records).

---

## 4. Backend REST API Endpoints

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/expenditures/analytics` | `GET` | High-level national expenditure KPI aggregations, payment breakdowns, top states, top vendors, and disbursement timeline. |
| `/api/expenditures/vendors` | `GET` | Paginated vendor intelligence directory with spend rankings, voucher volumes, and concentration risk flags. |
| `/api/expenditures/vendor/:vendor` | `GET` | Specific commercial vendor dossier with MP connections, % spend share, and transaction history. |
| `/api/expenditures` | `GET` | Live multi-dimensional live search and filtering across all 143,256 vouchers. |
| `/api/expenditures/:id` | `GET` | Single voucher detail view including linked production project details (if linked). |
| `/api/matches/review` | `GET` | Paginated queue of MEDIUM & LOW candidate matches for human administrative review. |
| `/api/matches/:matchId` | `PATCH` | Administrative match review actions (`approve`, `reject`, `link`, `unlink`, `add_notes`). |
| `/api/projects/:id/expenditures` | `GET` | Fetches linked vouchers and independent financial risk scores for a specific project. |

---

## 5. Independent Financial Risk Scoring Formula

Financial risk is calculated independently of the existing hybrid risk score:

$$\text{Financial Risk Score} = \min(100, \sum \text{Risk Penalties})$$

1. **Budget Overrun Penalty:**
   - $> 50\%$ Overrun: $+40$ points (Severity: HIGH)
   - $20\% - 50\%$ Overrun: $+25$ points (Severity: MEDIUM)
   - $5\% - 20\%$ Overrun: $+15$ points (Severity: LOW)
2. **In-Progress Payment Exposure:**
   - $> 50\%$ of vouchers In-Progress: $+25$ points
   - $1 - 50\%$ of vouchers In-Progress: $+15$ points
3. **Vendor Concentration Anomaly:**
   - $> 85\%$ of total disbursed funds paid to a single commercial entity: $+20$ points
4. **Split Transaction Anomaly:**
   - Multiple vouchers disbursed on identical dates to the same vendor: $+15$ points

**Risk Levels:**
- $\ge 75$: **CRITICAL**
- $50 - 74$: **HIGH**
- $25 - 49$: **MEDIUM**
- $< 25$: **LOW**

---

## 6. Zero Mutation & Integrity Verification

Final database audit verification conducted on active `database/mplads_risk.db`:

- **Production Works Count:** Exactly `56,138` (Zero records added, deleted, or mutated).
- **Works Table SHA-256 Hash:** `cc48238e2a6537807add0a614ec8e90abcb1a3e1876fa77cc587de1008f11997`.
- **Expenditures Row Count:** Exactly `143,256`.
- **Match Metadata Row Count:** Exactly `143,256`.
- **Auto-Linked Records (`project_id IS NOT NULL`):** Exactly `6,995`.
- **Pending Review Records (`project_id = NULL`):** Exactly `32,863` (25,260 Medium + 7,603 Low).
- **Unmatched Records (`project_id = NULL`):** Exactly `103,398`.
- **Orphaned Foreign Keys:** `0`.
- **Production ML Model:** Untouched and intact.
