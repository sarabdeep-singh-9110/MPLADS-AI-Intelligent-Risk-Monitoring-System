# Final Data Consistency & SIH Validation Audit Report

> **Status**: Verified & Consistent (100% Data Alignment)  
> **Date**: September 13, 2026  
> **Target Scope**: SQLite Database (`mplads_risk.db`), Express Backend REST APIs, React Frontend UI (Vite), and ML Isolation Forest Pipeline  

---

## A. Database Statistics (`database/mplads_risk.db`)

| Metric | Recorded Value |
| :--- | :--- |
| **Total Indexed Work Records** | **56,138** |
| **SUM(allocation_amount)** | **33,502,878,543.00 INR** (₹3,350.29 Cr) |
| **AVG(allocation_amount)** | **₹5,96,795.01** |
| **Total Represented States / UTs** | **33** |

### Statistical Distribution of Scores

#### 1. ML Anomaly Score (`ml_anomaly_score`)
- **Minimum**: `0.0`
- **Maximum**: `100.0`
- **Average**: `16.16`

#### 2. Rule Risk Score (`rule_risk_score`)
- **Minimum**: `0`
- **Maximum**: `85`
- **Average**: `7.13`

#### 3. Hybrid Priority Risk Score (`hybrid_risk_score`)
- **Minimum**: `0`
- **Maximum**: `84`
- **Average**: `10.74`

### Hybrid Risk Level Distribution
- **Critical**: `5` (0.01%)
- **High**: `198` (0.35%)
- **Medium**: `3,569` (6.36%)
- **Low**: `52,366` (93.28%)
- **Total**: **56,138** (`5 + 198 + 3,569 + 52,366 = 56,138`)

### ML Isolation Forest Anomaly Flags (`ml_anomaly_flag`)
- **-1 (Anomalous Pattern)**: `6,722` (11.97% anomaly rate)
- **1 (Normal Pattern)**: `49,416` (88.03%)

---

## B. Backend API Statistics (`GET /api/analytics/national`)

```json
{
  "total_projects": 56138,
  "critical_count": 5,
  "high_count": 198,
  "medium_count": 3569,
  "low_count": 52366,
  "total_allocation_amount": 33502878543,
  "average_hybrid_risk": 10.74,
  "average_ml_anomaly_score": 16.16,
  "average_rule_risk_score": 7.13,
  "total_states": 33
}
```

---

## C. National KPI Consistency Validation Table

| Metric | SQLite Value | API Value (`/api/analytics/national`) | Frontend Rendered Value | Match Status |
| :--- | :--- | :--- | :--- | :---: |
| **Total Projects** | 56,138 | 56,138 | 56,138 | **MATCH** |
| **Critical Risk Flags** | 5 | 5 | 5 | **MATCH** |
| **High Risk Flags** | 198 | 198 | 198 | **MATCH** |
| **Medium Risk Flags** | 3,569 | 3,569 | 3,569 | **MATCH** |
| **Low Risk Flags** | 52,366 | 52,366 | 52,366 | **MATCH** |
| **Total Allocation Amount** | ₹3,350.29 Cr | 33,502,878,543 INR | ₹3,350.29 Cr | **MATCH** |
| **Average Priority Risk Score** | 10.74 | 10.74 | 10.74 / 100 | **MATCH** |
| **Average ML Anomaly Score** | 16.16 | 16.16 | 16.16 | **MATCH** |

---

## D. Mismatches Found & Root Cause Analysis

### 1. ML Anomaly Score (-0.08 vs 16.16)
- **Root Cause**: The raw scikit-learn `decision_function` values (ranging from `-0.3` to `+0.3` with dataset mean ~ `-0.08`) were previously referenced before scaling. The production system defines `ml_anomaly_score` as the normalized 0–100 anomaly score.
- **Resolution**: Verified `Backend/routes/analytics.js` computes `AVG(ml_anomaly_score)` directly from the normalized column, returning `16.16`, which React displays as `16.16`.

### 2. Total Allocation Amount (₹2,425.86 Cr vs ₹3,350.29 Cr)
- **Root Cause**: Legacy UI card previously computed a partial sum on a filtered category subset.
- **Resolution**: `Frontend/src/pages/OverviewPage.jsx` calculates `(total_allocation_amount / 10000000).toFixed(2)` directly from the total database sum (`33,502,878,543 INR`), consistently rendering **₹3,350.29 Cr**.

---

## E. Project Detail Consistency Audit (Real Sample Projects)

| Project ID | MP Name | State | Allocation Amount | Rule Score | ML Anomaly Score | Hybrid Risk Score | Risk Level | Investigation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PRJ_B6FC3012D149** | Francisco Cosme Sardinha | Goa | ₹44.00 Lakhs | 85 | 81.36 | 84 | Critical | `UNDER_REVIEW` |
| **PRJ_298A9603D74B** | Harnath Singh Yadav (SRS) | Uttar Pradesh | ₹34.83 Lakhs | 85 | 78.00 | 82 | Critical | `NEW` |
| **PRJ_6A28E1C8D557** | Harnath Singh Yadav (SRS) | Uttar Pradesh | ₹31.27 Lakhs | 85 | 77.52 | 82 | Critical | `NEW` |

> [!NOTE]  
> The React frontend displays the database-stored values directly without client-side recalculation or drifting.

---

## F. Investigation Workflow Persistence Audit

- **Project Tested**: `PRJ_B6FC3012D149`
- **Action**: Sent `PATCH /api/investigations/PRJ_B6FC3012D149` with:
  ```json
  {
    "status": "UNDER_REVIEW",
    "officer_notes": "Ground verification in progress by Goa IDA officer"
  }
  ```
- **API Response**: `200 OK` (investigation updated successfully).
- **Direct SQLite Verification**: Querying `investigations` table returned:
  `('PRJ_B6FC3012D149', 'UNDER_REVIEW', 'CRITICAL', 'Ground verification in progress by Goa IDA officer', '2026-09-13 16:53:08')`.
- **GET Persistence**: `GET /api/projects/PRJ_B6FC3012D149` returns updated status & notes.
- **UI Persistence**: React UI displays updated status badge **UNDER REVIEW** and officer notes upon reload.
- **Wording Standard**: Updated across UI components to standard phrase *"56,138 works available for investigation tracking"*.

---

## G. Files Verified & Updated

- [`Frontend/src/pages/OverviewPage.jsx`](file:///d:/SIH_2026/MPLADS-AI-Intelligent-Risk-Monitoring-System/Frontend/src/pages/OverviewPage.jsx) — Dynamic calculation of total allocation amount (`(total_allocation_amount / 10000000).toFixed(2)`) and national KPI cards.
- [`Frontend/src/pages/ReportsPage.jsx`](file:///d:/SIH_2026/MPLADS-AI-Intelligent-Risk-Monitoring-System/Frontend/src/pages/ReportsPage.jsx) — Cleaned data wording to align with "56,138 indexed MPLADS work records".
- [`Frontend/src/pages/GisPage.jsx`](file:///d:/SIH_2026/MPLADS-AI-Intelligent-Risk-Monitoring-System/Frontend/src/pages/GisPage.jsx) — Aligned terminology with "Recorded Location Data Integrity".
- [`Frontend/src/pages/AiCopilotPage.jsx`](file:///d:/SIH_2026/MPLADS-AI-Intelligent-Risk-Monitoring-System/Frontend/src/pages/AiCopilotPage.jsx) — Aligned prompt metadata to "recorded database indicators".
- [`Backend/routes/analytics.js`](file:///d:/SIH_2026/MPLADS-AI-Intelligent-Risk-Monitoring-System/Backend/routes/analytics.js) — Accurate aggregations for total works, allocation sums, and score averages.

---

## H. Audit Conclusion & System Health

> [!IMPORTANT]
> **Remaining Issues**: None.  
> **Consistency Index**: 100% data consistency verified across SQLite database (`mplads_risk.db`), Express REST APIs, and the React frontend.

---

## I. Service Execution Commands

### 1. Start Express REST API Backend (Port 5000)
```powershell
cd Backend
node server.js
```

### 2. Start React Vite Frontend (Port 3000)
```powershell
cd Frontend
npm run dev
```
