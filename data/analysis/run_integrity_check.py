import os
import sqlite3
import pandas as pd
import numpy as np
import urllib.request
import json
import hashlib

print("=" * 80)
print("INTEGRITY AUDIT SCRIPT - DATASET 22565")
print("=" * 80)

# Paths
RAW_CSV = 'data/analysis/raw_22565/18th-lok-sabha-mplads-state-lok-sabha-constituency-work-name-vendor-name-wise-amount-spent-by-each-mp-from-mplads.csv'
CLEAN_CSV = 'data/analysis/22565_cleaned_analytical.csv'
DB_PATH = 'database/mplads_risk.db'
BACKUP_DB_PATH = 'database/backups/mplads_risk_before_22565_20260914_190556.db'

# =========================================================================
# SECTION 1: EXPENDITURE TOTAL RECONCILIATION
# =========================================================================
print("\n--- SECTION 1: EXPENDITURE TOTAL RECONCILIATION ---")

# A. Raw Dataset 22565
df_raw = pd.read_csv(RAW_CSV, low_memory=False)
raw_total_rows = len(df_raw)

# Identify aggregate rows in raw
# Row 0 or rows with empty state or summary values
row_0 = df_raw.iloc[0].to_dict()
is_row0_agg = pd.isna(row_0.get('State')) or str(row_0.get('State')).strip() == '' or 'all' in str(row_0.get('State')).lower() or 'total' in str(row_0.get('Work')).lower()

# Check expenditure column in raw
exp_col_raw = [c for c in df_raw.columns if 'expenditure' in c.lower() or 'amount' in c.lower()][0]
df_raw['num_exp'] = pd.to_numeric(df_raw[exp_col_raw], errors='coerce').fillna(0.0)
raw_total_sum = df_raw['num_exp'].sum()

# Row 0 expenditure value:
row0_exp = df_raw['num_exp'].iloc[0]

# If row 0 is excluded:
raw_sum_without_row0 = df_raw['num_exp'].iloc[1:].sum()

print(f"A. Raw Dataset 22565:")
print(f"   - Total rows in raw CSV: {raw_total_rows:,}")
print(f"   - Row 0 details: State={row_0.get('State')}, MP={row_0.get('Lok Sabha MP Name')}, Work={row_0.get('Work')}, Amount={row0_exp}")
print(f"   - Raw total expenditure sum (all {raw_total_rows:,} rows): INR {raw_total_sum:,.2f}")
print(f"   - Raw sum excluding row 0 (143,256 rows): INR {raw_sum_without_row0:,.2f}")

# B. Analytical Dataset
df_clean = pd.read_csv(CLEAN_CSV, low_memory=False)
clean_total_rows = len(df_clean)
clean_exp_col = [c for c in df_clean.columns if 'expenditure_amount' in c.lower()][0]
df_clean['num_exp'] = pd.to_numeric(df_clean[clean_exp_col], errors='coerce').fillna(0.0)
clean_total_sum = df_clean['num_exp'].sum()

print(f"B. Analytical Dataset:")
print(f"   - Total rows in analytical CSV: {clean_total_rows:,}")
print(f"   - Total expenditure sum: INR {clean_total_sum:,.2f}")

# C. SQLite expenditures table
con = sqlite3.connect(DB_PATH)
cur = con.cursor()

cur.execute("SELECT COUNT(*), SUM(expenditure_amount) FROM expenditures")
db_exp_count, db_exp_sum = cur.fetchone()

print(f"C. SQLite expenditures table:")
print(f"   - Row count: {db_exp_count:,}")
print(f"   - Expenditure sum: INR {db_exp_sum:,.2f}")

# D. API: GET /api/expenditures/analytics
api_url = 'http://localhost:5000/api/expenditures/analytics'
try:
    req = urllib.request.urlopen(api_url)
    api_json = json.loads(req.read().decode('utf-8'))
    api_total_vouchers = api_json['data']['total_vouchers']
    api_total_exp = api_json['data']['total_expenditure']
    print(f"D. API GET /api/expenditures/analytics:")
    print(f"   - Total vouchers returned: {api_total_vouchers:,}")
    print(f"   - Total expenditure returned: INR {api_total_exp:,.2f}")
except Exception as e:
    print(f"D. API failed: {e}")

# =========================================================================
# SECTION 2: PAYMENT STATUS RECONCILIATION
# =========================================================================
print("\n--- SECTION 2: PAYMENT STATUS RECONCILIATION ---")

# In clean dataframe
clean_pay = df_clean.groupby('payment_status')['num_exp'].agg(['count', 'sum'])
print("Clean Analytical CSV Payment Breakdown:")
for pstatus, row in clean_pay.iterrows():
    pct_count = (row['count'] / clean_total_rows) * 100
    pct_amount = (row['sum'] / clean_total_sum) * 100
    print(f"   - {pstatus}: Count={row['count']:,} ({pct_count:.2f}%), Amount=INR {row['sum']:,.2f} ({pct_amount:.2f}%)")

# In SQLite
cur.execute("""
    SELECT payment_status, COUNT(*), SUM(expenditure_amount)
    FROM expenditures
    GROUP BY payment_status
""")
db_pay = cur.fetchall()
print("\nSQLite expenditures Payment Breakdown:")
for pstatus, pcount, pamount in db_pay:
    pct_count = (pcount / db_exp_count) * 100
    pct_amount = (pamount / db_exp_sum) * 100
    print(f"   - {pstatus}: Count={pcount:,} ({pct_count:.2f}%), Amount=INR {pamount:,.2f} ({pct_amount:.2f}%)")

# In API
if 'api_json' in locals() and api_json:
    print("\nAPI Payment Breakdown:")
    for p in api_json['data']['payment_breakdown']:
        pcount = p['count']
        pamount = p['total_amount']
        pct_count = (pcount / api_total_vouchers) * 100
        pct_amount = (pamount / api_total_exp) * 100
        print(f"   - {p['payment_status']}: Count={pcount:,} ({pct_count:.2f}%), Amount=INR {pamount:,.2f} ({pct_amount:.2f}%)")

# =========================================================================
# SECTION 3: DUPLICATE HANDLING AUDIT
# =========================================================================
print("\n--- SECTION 3: DUPLICATE HANDLING AUDIT ---")

# Check raw duplicates (ignoring row 0)
df_raw_tx = df_raw.iloc[1:].copy()
raw_cols = [c for c in df_raw_tx.columns if c != 'num_exp']
exact_raw_dups = df_raw_tx.duplicated(subset=raw_cols, keep=False).sum()
exact_raw_unique_rows = len(df_raw_tx.drop_duplicates(subset=raw_cols))

clean_cols = [c for c in df_clean.columns if c != 'num_exp']
exact_clean_dups = df_clean.duplicated(subset=clean_cols, keep=False).sum()

cur.execute("SELECT COUNT(DISTINCT expenditure_id) FROM expenditures")
db_unique_exp_ids = cur.fetchone()[0]

print(f"Raw rows (including row 0): {raw_total_rows:,}")
print(f"Raw transaction rows (excluding row 0): {len(df_raw_tx):,}")
print(f"Exact identical duplicate rows in raw transactions: {exact_raw_dups:,}")
print(f"Distinct unique transaction combinations: {exact_raw_unique_rows:,}")
print(f"Analytical dataset rows: {clean_total_rows:,}")
print(f"SQLite expenditures table rows: {db_exp_count:,}")
print(f"SQLite unique expenditure_id count: {db_unique_exp_ids:,}")

# =========================================================================
# SECTION 4: MATCH RECONCILIATION
# =========================================================================
print("\n--- SECTION 4: MATCH RECONCILIATION ---")

cur.execute("""
    SELECT match_confidence, match_status, 
           COUNT(*) as total_count,
           SUM(CASE WHEN project_id IS NOT NULL THEN 1 ELSE 0 END) as non_null_pids,
           SUM(CASE WHEN project_id IS NULL THEN 1 ELSE 0 END) as null_pids
    FROM match_metadata
    GROUP BY match_confidence, match_status
    ORDER BY total_count DESC
""")
mm_breakdown = cur.fetchall()

print(f"{'Confidence':<15} {'Status':<15} {'Total':<10} {'project_id!=NULL':<18} {'project_id==NULL':<18}")
print("-" * 76)
total_mm = 0
for conf, status, cnt, non_null, is_null in mm_breakdown:
    print(f"{conf:<15} {status:<15} {cnt:<10,} {non_null:<18,} {is_null:<18,}")
    total_mm += cnt
print("-" * 76)
print(f"Total match_metadata records: {total_mm:,}")

# Summary checks
cur.execute("SELECT COUNT(*) FROM match_metadata WHERE match_confidence = 'HIGH'")
c_high = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM match_metadata WHERE match_confidence = 'MEDIUM'")
c_med = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM match_metadata WHERE match_confidence = 'LOW'")
c_low = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM match_metadata WHERE match_confidence = 'UNMATCHED'")
c_unm = cur.fetchone()[0]

print(f"\nVerification against target:")
print(f"HIGH:      {c_high:,} (Target: 6,995) -> {'MATCH' if c_high == 6995 else 'MISMATCH'}")
print(f"MEDIUM:    {c_med:,} (Target: 25,260) -> {'MATCH' if c_med == 25260 else 'MISMATCH'}")
print(f"LOW:       {c_low:,} (Target: 7,603) -> {'MATCH' if c_low == 7603 else 'MISMATCH'}")
print(f"UNMATCHED: {c_unm:,} (Target: 103,398) -> {'MATCH' if c_unm == 103398 else 'MISMATCH'}")
print(f"Sum:       {c_high + c_med + c_low + c_unm:,} (Target: 143,256)")

# =========================================================================
# SECTION 5: PROJECT LINK INTEGRITY
# =========================================================================
print("\n--- SECTION 5: PROJECT LINK INTEGRITY ---")

# Check every HIGH project_id against works.project_id
cur.execute("""
    SELECT COUNT(*) 
    FROM match_metadata mm
    JOIN works w ON mm.project_id = w.project_id
    WHERE mm.match_confidence = 'HIGH'
""")
valid_high_links = cur.fetchone()[0]

cur.execute("""
    SELECT COUNT(*) 
    FROM match_metadata mm
    LEFT JOIN works w ON mm.project_id = w.project_id
    WHERE mm.match_confidence = 'HIGH' AND w.project_id IS NULL
""")
invalid_high_links = cur.fetchone()[0]

cur.execute("""
    SELECT COUNT(*) 
    FROM match_metadata mm
    LEFT JOIN works w ON mm.project_id = w.project_id
    WHERE mm.project_id IS NOT NULL AND w.project_id IS NULL
""")
orphaned_links = cur.fetchone()[0]

cur.execute("SELECT COUNT(DISTINCT project_id) FROM match_metadata WHERE project_id IS NOT NULL")
unique_linked_projects = cur.fetchone()[0]

print(f"Valid HIGH links (in works table): {valid_high_links:,}")
print(f"Invalid HIGH links:                 {invalid_high_links:,}")
print(f"Orphaned links (all links):         {orphaned_links:,}")
print(f"Unique projects receiving links:    {unique_linked_projects:,}")

# =========================================================================
# SECTION 6: EXISTING PRODUCTION RISK INTEGRITY
# =========================================================================
print("\n--- SECTION 6: EXISTING PRODUCTION RISK INTEGRITY ---")

con_backup = sqlite3.connect(BACKUP_DB_PATH)
cur_backup = con_backup.cursor()

# Works count
cur.execute("SELECT COUNT(*) FROM works")
cur_works_count = cur.fetchone()[0]
cur_backup.execute("SELECT COUNT(*) FROM works")
backup_works_count = cur_backup.fetchone()[0]

print(f"Works Count Current: {cur_works_count:,}")
print(f"Works Count Backup:  {backup_works_count:,}")

# Check SHA-256 of entire works table across all columns
cur.execute("SELECT * FROM works ORDER BY project_id")
cur_rows = cur.fetchall()
cur_hash = hashlib.sha256(str(cur_rows).encode('utf-8')).hexdigest()

cur_backup.execute("SELECT * FROM works ORDER BY project_id")
backup_rows = cur_backup.fetchall()
backup_hash = hashlib.sha256(str(backup_rows).encode('utf-8')).hexdigest()

print(f"Current Works SHA-256: {cur_hash}")
print(f"Backup Works SHA-256:  {backup_hash}")
print(f"Works Table Identical: {cur_hash == backup_hash}")

# Check specific risk columns
cur.execute("""
    SELECT 
        AVG(rule_risk_score), MIN(rule_risk_score), MAX(rule_risk_score),
        AVG(ml_anomaly_score), MIN(ml_anomaly_score), MAX(ml_anomaly_score),
        AVG(hybrid_risk_score), MIN(hybrid_risk_score), MAX(hybrid_risk_score)
    FROM works
""")
cur_stats = cur.fetchone()

cur_backup.execute("""
    SELECT 
        AVG(rule_risk_score), MIN(rule_risk_score), MAX(rule_risk_score),
        AVG(ml_anomaly_score), MIN(ml_anomaly_score), MAX(ml_anomaly_score),
        AVG(hybrid_risk_score), MIN(hybrid_risk_score), MAX(hybrid_risk_score)
    FROM works
""")
backup_stats = cur_backup.fetchone()

print("Risk Score Statistics (Current vs Backup):")
labels = ['Rule Avg', 'Rule Min', 'Rule Max', 'ML Avg', 'ML Min', 'ML Max', 'Hybrid Avg', 'Hybrid Min', 'Hybrid Max']
for lbl, c_val, b_val in zip(labels, cur_stats, backup_stats):
    print(f"   - {lbl:<12}: Current={c_val:.6f}, Backup={b_val:.6f} -> {'MATCH' if abs(c_val - b_val) < 1e-9 else 'DIFF'}")

con_backup.close()
con.close()
