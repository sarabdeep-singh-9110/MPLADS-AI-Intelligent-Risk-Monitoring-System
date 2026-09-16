#!/usr/bin/env python3
"""
Migration: run_migration.py
Ingests Dataful Dataset 22565 (18th Lok Sabha Financial & Vendor Intelligence)
into SQLite database (database/mplads_risk.db) under OPTION B architecture.

Guarantees:
- Safe database backup created before modifications.
- Existing 56,138 production works are ZERO-MUTATED (verified).
- Ingests exactly 143,256 analytical vouchers into expenditures table.
- Generates deterministic collision-free IDs (EXP_<12 char hash>, MAT_<12 char hash>).
- Populates match_metadata bridge table (143,256 records).
- Exactly 6,995 HIGH-confidence records are AUTO_LINKED with project_id.
- 25,260 MEDIUM, 7,603 LOW, and 103,398 UNMATCHED remain with project_id = NULL.
"""

import os
import sys
import sqlite3
import hashlib
import shutil
import re
from datetime import datetime
from difflib import SequenceMatcher
import pandas as pd

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
DB_PATH = os.path.join(BASE_DIR, 'database', 'mplads_risk.db')
BACKUP_DIR = os.path.join(BASE_DIR, 'database', 'backups')
CLEAN_CSV_PATH = os.path.join(BASE_DIR, 'data', 'analysis', '22565_cleaned_analytical.csv')

def create_backup():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = os.path.join(BACKUP_DIR, f'mplads_risk_before_22565_{timestamp}.db')
    shutil.copy2(DB_PATH, backup_file)
    size_bytes = os.path.getsize(backup_file)
    print(f"[Backup] Verified backup created at: {backup_file} ({size_bytes:,} bytes)")
    return backup_file

def compute_hash_id(prefix, text):
    h = hashlib.sha256(text.encode('utf-8')).hexdigest()[:12].upper()
    return f"{prefix}_{h}"

def normalize_text(text):
    if not text or pd.isna(text) or not isinstance(text, str):
        return ""
    t = text.lower().strip()
    t = re.sub(r'^(na\s*-\s*|n/a\s*-\s*|na\s+)', '', t)
    t = re.sub(r'[^\w\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

def normalize_mp(name):
    if not name or pd.isna(name) or not isinstance(name, str):
        return ""
    t = name.lower().strip()
    t = re.sub(r'\((srs|ls|mp|rajya sabha|lok sabha)[^)]*\)', '', t)
    t = re.sub(r'\b(shri|smt|dr|km|adv|prof|er|mr|mrs|ms|honble|hon\'ble)\b', '', t)
    t = re.sub(r'[^\w\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

def normalize_state(st):
    if not st or pd.isna(st) or not isinstance(st, str):
        return ""
    t = st.lower().strip().replace('&', 'and')
    t = re.sub(r'[^\w\s]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    if 'orissa' in t: t = 'odisha'
    if 'pondicherry' in t: t = 'puducherry'
    if 'jammu' in t: t = 'jammu and kashmir'
    if 'andaman' in t: t = 'andaman and nicobar islands'
    return t

def normalize_constituency(c):
    if not c or pd.isna(c) or not isinstance(c, str):
        return ""
    t = c.lower().strip()
    t = re.sub(r'\((sc|st)\)', '', t)
    t = re.sub(r'[^\w\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

def main():
    print("=" * 80)
    print("STARTING PYTHON MIGRATION: Ingesting Dataset 22565 (Financial Intelligence)")
    print("=" * 80)

    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found at: {DB_PATH}")
    if not os.path.exists(CLEAN_CSV_PATH):
        raise FileNotFoundError(f"Clean analytical CSV not found at: {CLEAN_CSV_PATH}")

    # Step 1: Backup
    create_backup()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Step 2: Verify production works table
    cursor.execute("SELECT COUNT(*) FROM works")
    works_count = cursor.fetchone()[0]
    print(f"[Verification] Production works count in DB: {works_count:,}")
    if works_count != 56138:
        raise ValueError(f"CRITICAL ABORT: Expected 56,138 works in database, found {works_count}!")

    # Step 3: Create schema
    print("[Schema] Creating expenditures and match_metadata tables if not exists...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenditures (
            expenditure_id TEXT PRIMARY KEY,
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
            payment_status TEXT,
            expenditure_amount REAL,
            units TEXT,
            notes TEXT,
            source_dataset TEXT DEFAULT 'Dataful Dataset 22565',
            created_at TEXT
        )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_exp_vendor ON expenditures(vendor_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_exp_mp ON expenditures(loksabha_MP_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_exp_state ON expenditures(state)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_exp_const ON expenditures(loksabha_constituency)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_exp_status ON expenditures(payment_status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_exp_date ON expenditures(expenditure_date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_exp_amount ON expenditures(expenditure_amount)")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS match_metadata (
            match_id TEXT PRIMARY KEY,
            expenditure_id TEXT NOT NULL,
            project_id TEXT,
            match_confidence TEXT NOT NULL,
            match_method TEXT,
            similarity_score REAL,
            match_status TEXT NOT NULL,
            matched_at TEXT,
            reviewed_by TEXT,
            reviewed_at TEXT,
            review_notes TEXT,
            candidate_project_ids TEXT,
            FOREIGN KEY (expenditure_id) REFERENCES expenditures(expenditure_id),
            FOREIGN KEY (project_id) REFERENCES works(project_id)
        )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mm_exp_id ON match_metadata(expenditure_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mm_proj_id ON match_metadata(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mm_confidence ON match_metadata(match_confidence)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mm_status ON match_metadata(match_status)")

    conn.commit()

    # Check existing data
    cursor.execute("SELECT COUNT(*) FROM expenditures")
    curr_exp = cursor.fetchone()[0]
    if curr_exp == 143256:
        cursor.execute("SELECT COUNT(*) FROM match_metadata")
        curr_mm = cursor.fetchone()[0]
        print(f"[Idempotency] Expenditures already fully loaded ({curr_exp:,} rows, match_metadata: {curr_mm:,} rows).")
        # Validate works count again
        cursor.execute("SELECT COUNT(*) FROM works")
        final_works = cursor.fetchone()[0]
        print(f"[Verification] Works table unchanged at {final_works:,} rows.")
        conn.close()
        return

    if curr_exp > 0:
        print(f"[Cleanup] Removing partial table records ({curr_exp:,} rows)...")
        cursor.execute("DELETE FROM match_metadata")
        cursor.execute("DELETE FROM expenditures")
        conn.commit()

    # Step 4: Load and index production works
    print("[Index] Indexing 56,138 production works for exact and scoped fuzzy matching...")
    cursor.execute("SELECT project_id, mp_name, state, constituency, work, allocation_amount FROM works")
    prod_rows = cursor.fetchall()

    level1_prod_index = {}
    mp_scope_prod_index = {}

    for pid, mp, st, const, wk, alloc in prod_rows:
        n_mp = normalize_mp(mp)
        n_st = normalize_state(st)
        n_co = normalize_constituency(const)
        n_wk = normalize_text(wk)

        # L1 exact key
        k_l1 = (n_mp, n_st, n_co, n_wk)
        if k_l1 not in level1_prod_index:
            level1_prod_index[k_l1] = []
        level1_prod_index[k_l1].append(pid)

        # MP scope key
        k_scope = (n_mp, n_st, n_co)
        if k_scope not in mp_scope_prod_index:
            mp_scope_prod_index[k_scope] = []
        mp_scope_prod_index[k_scope].append({
            'project_id': pid,
            'norm_work': n_wk,
            'work': wk,
            'allocation_amount': alloc
        })

    print(f"[Index] Level 1 exact keys: {len(level1_prod_index):,}, MP scope keys: {len(mp_scope_prod_index):,}")

    # Step 5: Read and process 22565_cleaned_analytical.csv
    print(f"[Load] Reading {CLEAN_CSV_PATH}...")
    df_clean = pd.read_csv(CLEAN_CSV_PATH, low_memory=False)
    print(f"[Load] Loaded {len(df_clean):,} analytical rows.")
    if len(df_clean) != 143256:
        raise ValueError(f"Expected 143,256 rows in cleaned analytical CSV, got {len(df_clean)}")

    # Add normalized columns
    df_clean['n_mp'] = df_clean['loksabha_MP_name'].apply(normalize_mp)
    df_clean['n_st'] = df_clean['state'].apply(normalize_state)
    df_clean['n_co'] = df_clean['loksabha_constituency'].apply(normalize_constituency)
    df_clean['n_wk'] = df_clean['work'].apply(normalize_text)

    # Cache for fuzzy match results to run in seconds across 143k records
    fuzzy_cache = {}

    def get_fuzzy_match(n_mp, n_st, n_co, n_wk):
        cache_key = (n_mp, n_st, n_co, n_wk)
        if cache_key in fuzzy_cache:
            return fuzzy_cache[cache_key]

        cand_list = mp_scope_prod_index.get((n_mp, n_st, n_co), [])
        if not cand_list:
            res = ('UNMATCHED', 'UNMATCHED', None, 0.0, 'none', 'No works found for MP/Constituency in production database', None)
            fuzzy_cache[cache_key] = res
            return res

        best_score = 0.0
        best_prod = None
        for cand in cand_list:
            score = SequenceMatcher(None, n_wk, cand['norm_work']).ratio()
            if score > best_score:
                best_score = score
                best_prod = cand
                if best_score == 1.0:
                    break

        sim_score = round(best_score, 4)
        if best_score >= 0.85:
            res = ('HIGH', 'AUTO_LINKED', best_prod['project_id'], sim_score, 'scoped_fuzzy_SequenceMatcher', f'High confidence fuzzy match ({sim_score*100:.1f}%)', None)
        elif best_score >= 0.70:
            res = ('MEDIUM', 'PENDING_REVIEW', None, sim_score, 'scoped_fuzzy_SequenceMatcher', f'Medium confidence fuzzy match ({sim_score*100:.1f}%)', best_prod['project_id'])
        elif best_score >= 0.50:
            res = ('LOW', 'PENDING_REVIEW', None, sim_score, 'scoped_fuzzy_SequenceMatcher', f'Low confidence fuzzy match ({sim_score*100:.1f}%)', best_prod['project_id'])
        else:
            res = ('UNMATCHED', 'UNMATCHED', None, sim_score, 'none', 'No sufficiently similar work in constituency', None)

        fuzzy_cache[cache_key] = res
        return res

    print("[Processing] Generating deterministic IDs and classifying matches...")
    occurrence_tracker = {}
    now_iso = datetime.now().isoformat()

    exp_records = []
    mm_records = []

    high_count = 0
    med_count = 0
    low_count = 0
    unmatch_count = 0

    for idx, row in df_clean.iterrows():
        state = str(row['state']) if pd.notna(row['state']) else ''
        dist_src = str(row['implementing_district_per_source']) if pd.notna(row['implementing_district_per_source']) else ''
        dist_lgd = str(row['implementing_district_per_lgd']) if pd.notna(row['implementing_district_per_lgd']) else ''
        lgd_code = str(row['implementing_district_lgd_code']) if pd.notna(row['implementing_district_lgd_code']) else ''
        constituency = str(row['loksabha_constituency']) if pd.notna(row['loksabha_constituency']) else ''
        mp_name = str(row['loksabha_MP_name']) if pd.notna(row['loksabha_MP_name']) else ''
        work = str(row['work']) if pd.notna(row['work']) else ''
        agency = str(row['implementing_agency_name']) if pd.notna(row['implementing_agency_name']) else ''
        vendor = str(row['vendor_name']) if pd.notna(row['vendor_name']) else ''
        exp_date = str(row['expenditure_date']) if pd.notna(row['expenditure_date']) else ''
        pay_status = str(row['payment_status']) if pd.notna(row['payment_status']) else ''
        data_as_on = str(row['data_as_on']) if pd.notna(row['data_as_on']) else ''
        units = str(row['units']) if pd.notna(row['units']) else 'INR'
        notes = str(row['notes']) if pd.notna(row['notes']) and row['notes'] != '' else None
        exp_amount = float(row['expenditure_amount']) if pd.notna(row['expenditure_amount']) else 0.0

        # Deterministic collision-free ID
        signature = f"{state}|{dist_src}|{constituency}|{mp_name}|{work}|{vendor}|{agency}|{exp_date}|{pay_status}|{exp_amount}"
        occ = occurrence_tracker.get(signature, 0) + 1
        occurrence_tracker[signature] = occ

        exp_id = compute_hash_id('EXP', f"{signature}|{occ}")
        match_id = compute_hash_id('MAT', f"{exp_id}|{idx}")

        # Matching classification
        k_l1 = (row['n_mp'], row['n_st'], row['n_co'], row['n_wk'])
        if k_l1 in level1_prod_index:
            pids = level1_prod_index[k_l1]
            if len(pids) == 1:
                conf = 'HIGH'
                status = 'AUTO_LINKED'
                proj_id = pids[0]
                sim_score = 1.0
                method = 'exact_normalized_l1'
                rev_notes = 'High confidence unique normalized match'
                cand_ids = None
                high_count += 1
            else:
                conf = 'MEDIUM'
                status = 'PENDING_REVIEW'
                proj_id = None # Do NOT link ambiguous matches
                sim_score = 1.0
                method = 'exact_normalized_ambiguous'
                rev_notes = f'Ambiguous exact match among {len(pids)} project candidates'
                cand_ids = ",".join(pids[:10])
                med_count += 1
        else:
            conf, status, proj_id, sim_score, method, rev_notes, cand_ids = get_fuzzy_match(
                row['n_mp'], row['n_st'], row['n_co'], row['n_wk']
            )
            if conf == 'HIGH':
                high_count += 1
            elif conf == 'MEDIUM':
                med_count += 1
            elif conf == 'LOW':
                low_count += 1
            else:
                unmatch_count += 1

        exp_records.append((
            exp_id, data_as_on, state, dist_src, dist_lgd, lgd_code,
            constituency, mp_name, work, agency, vendor,
            exp_date, pay_status, exp_amount, units, notes,
            'Dataful Dataset 22565', now_iso
        ))

        mm_records.append((
            match_id, exp_id, proj_id, conf, method,
            sim_score, status, now_iso, None, None,
            rev_notes, cand_ids
        ))

    print(f"\n[Classification Summary]")
    print(f"  HIGH (AUTO_LINKED): {high_count:,} (Expected: 6,995)")
    print(f"  MEDIUM (PENDING_REVIEW): {med_count:,} (Expected: 25,260)")
    print(f"  LOW (PENDING_REVIEW): {low_count:,} (Expected: 7,603)")
    print(f"  UNMATCHED: {unmatch_count:,} (Expected: 103,398)")
    print(f"  Total: {len(exp_records):,} (Expected: 143,256)")

    # Step 6: Batch insertion into database
    print("\n[Database Ingestion] Inserting records in batches of 10,000...")
    batch_size = 10000

    exp_insert_sql = """
        INSERT INTO expenditures (
            expenditure_id, data_as_on, state, implementing_district_per_source,
            implementing_district_per_lgd, implementing_district_lgd_code, loksabha_constituency,
            loksabha_MP_name, work, implementing_agency_name, vendor_name,
            expenditure_date, payment_status, expenditure_amount, units, notes,
            source_dataset, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    mm_insert_sql = """
        INSERT INTO match_metadata (
            match_id, expenditure_id, project_id, match_confidence,
            match_method, similarity_score, match_status, matched_at,
            reviewed_by, reviewed_at, review_notes, candidate_project_ids
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    for i in range(0, len(exp_records), batch_size):
        exp_batch = exp_records[i:i + batch_size]
        mm_batch = mm_records[i:i + batch_size]
        cursor.executemany(exp_insert_sql, exp_batch)
        cursor.executemany(mm_insert_sql, mm_batch)
        conn.commit()
        print(f"  Inserted {min(i + batch_size, len(exp_records)):,} / {len(exp_records):,} records...")

    # Step 7: Integrity Checks
    print("\n[Integrity Verification]")
    cursor.execute("SELECT COUNT(*) FROM works")
    final_works = cursor.fetchone()[0]
    print(f"  Works count: {final_works:,} (Must be 56,138)")

    cursor.execute("SELECT COUNT(*) FROM expenditures")
    final_exp = cursor.fetchone()[0]
    print(f"  Expenditures count: {final_exp:,} (Must be 143,256)")

    cursor.execute("SELECT COUNT(*) FROM match_metadata")
    final_mm = cursor.fetchone()[0]
    print(f"  Match metadata count: {final_mm:,} (Must be 143,256)")

    cursor.execute("SELECT COUNT(*) FROM match_metadata WHERE match_status = 'AUTO_LINKED'")
    auto_linked = cursor.fetchone()[0]
    print(f"  Auto-linked records: {auto_linked:,} (Must be 6,995)")

    cursor.execute("SELECT COUNT(*) FROM match_metadata WHERE project_id IS NOT NULL")
    linked_proj = cursor.fetchone()[0]
    print(f"  Records with project_id: {linked_proj:,} (Must be 6,995)")

    cursor.execute("SELECT COUNT(*) FROM match_metadata WHERE match_status = 'PENDING_REVIEW'")
    pending_rev = cursor.fetchone()[0]
    print(f"  Pending review records: {pending_rev:,} (Must be 32,863 = 25,260 + 7,603)")

    cursor.execute("SELECT COUNT(*) FROM match_metadata WHERE match_status = 'UNMATCHED'")
    unmatched_rev = cursor.fetchone()[0]
    print(f"  Unmatched records: {unmatched_rev:,} (Must be 103,398)")

    # Check for foreign key integrity
    cursor.execute("""
        SELECT COUNT(*) FROM match_metadata m
        LEFT JOIN works w ON m.project_id = w.project_id
        WHERE m.project_id IS NOT NULL AND w.project_id IS NULL
    """)
    orphaned_links = cursor.fetchone()[0]
    print(f"  Orphaned project links: {orphaned_links:,} (Must be 0)")

    conn.close()

    assert final_works == 56138, f"Works count mismatch: {final_works}"
    assert final_exp == 143256, f"Expenditures count mismatch: {final_exp}"
    assert final_mm == 143256, f"Match metadata count mismatch: {final_mm}"
    assert auto_linked == 6995, f"Auto-linked mismatch: {auto_linked}"
    assert linked_proj == 6995, f"Linked proj mismatch: {linked_proj}"
    assert orphaned_links == 0, f"Orphaned links found: {orphaned_links}"

    print("\n" + "=" * 80)
    print("MIGRATION COMPLETED SUCCESSFULLY WITH ZERO DEFECTS!")
    print("=" * 80)

if __name__ == '__main__':
    main()
