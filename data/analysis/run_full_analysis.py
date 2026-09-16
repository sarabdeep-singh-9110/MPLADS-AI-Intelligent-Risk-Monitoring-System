import os
import sys
import sqlite3
import hashlib
import json
import re
from difflib import SequenceMatcher
import pandas as pd
import numpy as np

# Force UTF-8 stdout on Windows
sys.stdout.reconfigure(encoding='utf-8')

print("=" * 80)
print("STARTING FINAL DATASET MATCHING ANALYSIS — DATASET 22565")
print("=" * 80)

# Paths
BASE_DIR = r'D:\SIH_2026\MPLADS-AI-Intelligent-Risk-Monitoring-System'
DATA_DIR = os.path.join(BASE_DIR, 'data')
ANALYSIS_DIR = os.path.join(DATA_DIR, 'analysis')
RAW_22565_DIR = os.path.join(ANALYSIS_DIR, 'raw_22565')
CSV_22565_PATH = os.path.join(RAW_22565_DIR, '18th-lok-sabha-mplads-state-lok-sabha-constituency-work-name-vendor-name-wise-amount-spent-by-each-mp-from-mplads.csv')
DB_PATH = os.path.join(BASE_DIR, 'database', 'mplads_risk.db')

os.makedirs(ANALYSIS_DIR, exist_ok=True)

# ---------------------------------------------------------
# STEP 1: INSPECT DATASET 22565
# ---------------------------------------------------------
print("\n>>> STEP 1: Inspecting Dataset 22565...")
df_raw = pd.read_csv(CSV_22565_PATH, low_memory=False)
raw_row_count = len(df_raw)
raw_col_count = len(df_raw.columns)
raw_cols = df_raw.columns.tolist()

print(f"Raw File: {os.path.basename(CSV_22565_PATH)}")
print(f"Row count: {raw_row_count:,}")
print(f"Column count: {raw_col_count}")

# Identify aggregate / summary rows
agg_mask = (df_raw['state'] == 'All India') | (df_raw['units'].astype(str).str.contains('crore', case=False, na=False))
agg_rows = df_raw[agg_mask]
print(f"Detected {len(agg_rows)} aggregate/summary row(s):")
for idx, r in agg_rows.iterrows():
    print(f"  Row Index {idx}: state='{r['state']}', amount={r['expenditure_amount']}, units='{r['units']}', MP='{r['loksabha_MP_name']}'")

# Create clean analytical copy excluding aggregate rows
df_clean = df_raw[~agg_mask].copy()
cleaned_analytical_path = os.path.join(ANALYSIS_DIR, '22565_cleaned_analytical.csv')
df_clean.to_csv(cleaned_analytical_path, index=False)
print(f"Saved cleaned analytical copy ({len(df_clean):,} transaction records) to {cleaned_analytical_path}")

# Missing values
missing_dict = df_clean.isna().sum().to_dict()
missing_pct = (df_clean.isna().mean() * 100).round(2).to_dict()

# Parse Dates
df_clean['parsed_exp_date'] = pd.to_datetime(df_clean['expenditure_date'], errors='coerce', dayfirst=True)
min_exp_date = df_clean['parsed_exp_date'].min()
max_exp_date = df_clean['parsed_exp_date'].max()

# Granularity
unique_mps_22565 = df_clean['loksabha_MP_name'].dropna().unique()
unique_states_22565 = df_clean['state'].dropna().unique()
unique_const_22565 = df_clean['loksabha_constituency'].dropna().unique()
unique_dist_source = df_clean['implementing_district_per_source'].dropna().unique()
unique_dist_lgd = df_clean['implementing_district_per_lgd'].dropna().unique()
unique_vendors_22565 = df_clean['vendor_name'].dropna().unique()
unique_agencies_22565 = df_clean['implementing_agency_name'].dropna().unique()
unique_works_22565 = df_clean['work'].dropna().unique()

# Payment status
payment_status_counts = df_clean['payment_status'].value_counts(dropna=False).to_dict()
total_exp_amount = df_clean['expenditure_amount'].sum()

print(f"Transaction rows: {len(df_clean):,}")
print(f"Date range: {min_exp_date.strftime('%Y-%m-%d') if pd.notna(min_exp_date) else 'N/A'} to {max_exp_date.strftime('%Y-%m-%d') if pd.notna(max_exp_date) else 'N/A'}")
print(f"Unique MPs: {len(unique_mps_22565):,}")
print(f"Unique States: {len(unique_states_22565):,}")
print(f"Unique Constituencies: {len(unique_const_22565):,}")
print(f"Unique Districts (source): {len(unique_dist_source):,}")
print(f"Unique Districts (lgd): {len(unique_dist_lgd):,}")
print(f"Unique Works: {len(unique_works_22565):,}")
print(f"Unique Vendors: {len(unique_vendors_22565):,}")
print(f"Unique Implementing Agencies: {len(unique_agencies_22565):,}")
print(f"Total Expenditure: INR {total_exp_amount:,.2f} (approx ₹{total_exp_amount/1e7:,.2f} Cr)")

# ---------------------------------------------------------
# STEP 2: DUPLICATE ANALYSIS
# ---------------------------------------------------------
print("\n>>> STEP 2: Duplicate Analysis...")
# Check exact duplicates across all columns
exact_dupes_mask = df_clean.duplicated(keep=False)
exact_dupes_count = df_clean.duplicated().sum()
total_tx_rows = len(df_clean)
unique_rows_count = total_tx_rows - exact_dupes_count
pct_dupes = (exact_dupes_count / total_tx_rows) * 100

print(f"Total transaction rows: {total_tx_rows:,}")
print(f"Exact duplicate rows: {exact_dupes_count:,} ({pct_dupes:.2f}%)")
print(f"Unique rows: {unique_rows_count:,}")

# Transactional key columns
key_cols = [
    'state', 'implementing_district_per_source', 'loksabha_constituency',
    'loksabha_MP_name', 'work', 'implementing_agency_name', 'vendor_name',
    'expenditure_date', 'payment_status', 'expenditure_amount'
]
key_dupes_mask = df_clean.duplicated(subset=key_cols, keep=False)
key_dupes_count = df_clean.duplicated(subset=key_cols).sum()
print(f"Duplicates across 10 core transactional keys: {key_dupes_count:,} ({(key_dupes_count/total_tx_rows)*100:.2f}%)")

# Group duplicates and create sample export
dupe_groups = df_clean[key_dupes_mask].groupby(key_cols).size().reset_index(name='duplicate_count')
dupe_groups = dupe_groups.sort_values(by='duplicate_count', ascending=False)
print(f"Number of distinct duplicate transaction clusters: {len(dupe_groups):,}")
print(f"Max repetitions for a single transaction cluster: {dupe_groups['duplicate_count'].max()}")

duplicate_analysis_csv = os.path.join(ANALYSIS_DIR, '22565_duplicate_analysis.csv')
dupe_groups.head(500).to_csv(duplicate_analysis_csv, index=False)
print(f"Saved duplicate analysis top clusters to {duplicate_analysis_csv}")

# ---------------------------------------------------------
# STEP 3: INSPECT EXISTING PRODUCTION DATA
# ---------------------------------------------------------
print("\n>>> STEP 3: Inspecting Existing Production Data (database/mplads_risk.db)...")
conn = sqlite3.connect(DB_PATH)
df_prod = pd.read_sql('SELECT * FROM works', conn)
conn.close()

prod_row_count = len(df_prod)
prod_col_count = len(df_prod.columns)
prod_cols = df_prod.columns.tolist()

df_prod['parsed_rec_date'] = pd.to_datetime(df_prod['recommended_date'], errors='coerce')
prod_min_date = df_prod['parsed_rec_date'].min()
prod_max_date = df_prod['parsed_rec_date'].max()

unique_mps_prod = df_prod['mp_name'].dropna().unique()
unique_states_prod = df_prod['state'].dropna().unique()
unique_const_prod = df_prod['constituency'].dropna().unique()
unique_works_prod = df_prod['work'].dropna().unique()

print(f"Production Works Count: {prod_row_count:,}")
print(f"Production Columns: {prod_cols}")
print(f"Recommended Date Range: {prod_min_date.strftime('%Y-%m-%d') if pd.notna(prod_min_date) else 'N/A'} to {prod_max_date.strftime('%Y-%m-%d') if pd.notna(prod_max_date) else 'N/A'}")
print(f"Unique MPs in Production: {len(unique_mps_prod):,}")
print(f"Unique States in Production: {len(unique_states_prod):,}")
print(f"Unique Constituencies in Production: {len(unique_const_prod):,}")
print(f"Unique Works in Production: {len(unique_works_prod):,}")
print("Available location fields in Production: state, constituency, city, ward, block, village")

# Breakdown of Lok Sabha vs Rajya Sabha in production
srs_mask = df_prod['mp_name'].str.contains(r'\(SRS\)|Rajya Sabha', case=False, na=False) | df_prod['constituency'].str.contains(r'Rajya Sabha', case=False, na=False)
print(f"Rajya Sabha works in Production: {srs_mask.sum():,} ({(srs_mask.sum()/prod_row_count)*100:.2f}%)")
print(f"Lok Sabha / Other works in Production: {(~srs_mask).sum():,} ({((~srs_mask).sum()/prod_row_count)*100:.2f}%)")

# ---------------------------------------------------------
# STEP 4: NORMALIZATION
# ---------------------------------------------------------
print("\n>>> STEP 4: Normalizing Text Fields for Matching...")

def normalize_text(text):
    if pd.isna(text) or not isinstance(text, str):
        return ""
    t = text.lower().strip()
    # Remove common prefixes like 'na - ', 'na-', 'n/a - ', 'n/a-'
    t = re.sub(r'^(na\s*-\s*|n/a\s*-\s*|na\s+)', '', t)
    # Remove punctuation
    t = re.sub(r'[^\w\s]', ' ', t)
    # Collapse multiple spaces
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def normalize_mp(name):
    if pd.isna(name) or not isinstance(name, str):
        return ""
    t = name.lower().strip()
    # Remove honorifics & suffixes like (SRS), (LS), shri, smt, dr, km, hon'ble, etc.
    t = re.sub(r'\((srs|ls|mp|rajya sabha|lok sabha)[^)]*\)', '', t)
    t = re.sub(r'\b(shri|smt|dr|km|adv|prof|er|mr|mrs|ms|honble|hon\'ble)\b', '', t)
    t = re.sub(r'[^\w\s]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def normalize_state(st):
    if pd.isna(st) or not isinstance(st, str):
        return ""
    t = st.lower().strip()
    t = t.replace('&', 'and')
    t = re.sub(r'[^\w\s]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    # Specific standardizations
    if 'orissa' in t: t = 'odisha'
    if 'pondicherry' in t: t = 'puducherry'
    if 'jammu' in t: t = 'jammu and kashmir'
    if 'andaman' in t: t = 'andaman and nicobar islands'
    return t

def normalize_constituency(c):
    if pd.isna(c) or not isinstance(c, str):
        return ""
    t = c.lower().strip()
    # remove (sc), (st), sc, st suffix
    t = re.sub(r'\((sc|st)\)', '', t)
    t = re.sub(r'[^\w\s]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# Add normalized columns without destroying originals
df_clean['norm_work'] = df_clean['work'].apply(normalize_text)
df_clean['norm_mp'] = df_clean['loksabha_MP_name'].apply(normalize_mp)
df_clean['norm_state'] = df_clean['state'].apply(normalize_state)
df_clean['norm_const'] = df_clean['loksabha_constituency'].apply(normalize_constituency)
df_clean['norm_dist_source'] = df_clean['implementing_district_per_source'].apply(normalize_text)
df_clean['norm_dist_lgd'] = df_clean['implementing_district_per_lgd'].apply(normalize_text)

df_prod['norm_work'] = df_prod['work'].apply(normalize_text)
df_prod['norm_mp'] = df_prod['mp_name'].apply(normalize_mp)
df_prod['norm_state'] = df_prod['state'].apply(normalize_state)
df_prod['norm_const'] = df_prod['constituency'].apply(normalize_constituency)
df_prod['norm_city'] = df_prod['city'].apply(normalize_text)
df_prod['norm_block'] = df_prod['block'].apply(normalize_text)
df_prod['norm_village'] = df_prod['village'].apply(normalize_text)
df_prod['norm_ward'] = df_prod['ward'].apply(normalize_text)

print("Normalization complete. Sample normalized work descriptions:")
print("  22565:", df_clean[['work', 'norm_work']].head(2).to_dict('records'))
print("  Prod :", df_prod[['work', 'norm_work']].head(2).to_dict('records'))

# ---------------------------------------------------------
# STEP 5: MATCHING LEVEL 1
# MP + State + Constituency + normalized Work Description
# ---------------------------------------------------------
print("\n>>> STEP 5: Testing Matching Level 1 (MP + State + Constituency + Norm Work)...")

# Index production by (norm_mp, norm_state, norm_const, norm_work)
level1_prod_index = {}
for idx, row in df_prod.iterrows():
    k = (row['norm_mp'], row['norm_state'], row['norm_const'], row['norm_work'])
    if k not in level1_prod_index:
        level1_prod_index[k] = []
    level1_prod_index[k].append(row['project_id'])

# Check for production duplicates on this key
prod_keys_multi = sum(1 for v in level1_prod_index.values() if len(v) > 1)
print(f"Production keys with multiple project_ids: {prod_keys_multi:,}")

l1_unique_matches = 0
l1_multi_matches = 0
l1_no_matches = 0

# Track mapping for each 22565 record
l1_results = []
for idx, row in df_clean.iterrows():
    k = (row['norm_mp'], row['norm_state'], row['norm_const'], row['norm_work'])
    matches = level1_prod_index.get(k, [])
    if len(matches) == 1:
        l1_unique_matches += 1
        l1_results.append(('UNIQUE', matches[0], matches))
    elif len(matches) > 1:
        l1_multi_matches += 1
        l1_results.append(('AMBIGUOUS', matches[0], matches))
    else:
        l1_no_matches += 1
        l1_results.append(('NO_MATCH', None, []))

print(f"Level 1 Unique matches: {l1_unique_matches:,} ({(l1_unique_matches/total_tx_rows)*100:.2f}%)")
print(f"Level 1 Multiple (Ambiguous) matches: {l1_multi_matches:,} ({(l1_multi_matches/total_tx_rows)*100:.2f}%)")
print(f"Level 1 No matches: {l1_no_matches:,} ({(l1_no_matches/total_tx_rows)*100:.2f}%)")

# ---------------------------------------------------------
# STEP 6: MATCHING LEVEL 2
# MP + State + Constituency + normalized Work Description + District
# ---------------------------------------------------------
print("\n>>> STEP 6: Testing Matching Level 2 (Level 1 + District)...")

# In production, district information might be in block, city, village, or constituency
# Let's inspect where district matches
level2_prod_index = {}
for idx, row in df_prod.iterrows():
    # Candidate location tokens for production work
    loc_tokens = set([row['norm_city'], row['norm_block'], row['norm_village'], row['norm_const']])
    k = (row['norm_mp'], row['norm_state'], row['norm_const'], row['norm_work'])
    if k not in level2_prod_index:
        level2_prod_index[k] = []
    level2_prod_index[k].append((row['project_id'], loc_tokens, row))

l2_unique_matches = 0
l2_multi_matches = 0
l2_no_matches = 0
l2_results = []

for idx, row in df_clean.iterrows():
    k = (row['norm_mp'], row['norm_state'], row['norm_const'], row['norm_work'])
    candidates = level2_prod_index.get(k, [])
    
    if not candidates:
        l2_no_matches += 1
        l2_results.append(('NO_MATCH', None))
        continue
    
    d_src = row['norm_dist_source']
    d_lgd = row['norm_dist_lgd']
    
    # Filter candidates by district alignment
    matched_candidates = []
    for pid, loc_tokens, prod_row in candidates:
        # Check if district matches city, block, village, constituency, or is contained
        if (d_src and any(d_src in tok or tok in d_src for tok in loc_tokens if tok)) or \
           (d_lgd and any(d_lgd in tok or tok in d_lgd for tok in loc_tokens if tok)):
            matched_candidates.append(pid)
        else:
            # Check if production block/village is within district or district matches
            matched_candidates.append(pid) # if no district conflict

    # If district refinement narrowed it down
    # Strict district check:
    strict_district_matches = []
    for pid, loc_tokens, prod_row in candidates:
        if (d_src and any(d_src == tok or d_src in tok for tok in loc_tokens if tok)) or \
           (d_lgd and any(d_lgd == tok or d_lgd in tok for tok in loc_tokens if tok)):
            strict_district_matches.append(pid)

    if len(strict_district_matches) == 1:
        l2_unique_matches += 1
        l2_results.append(('UNIQUE_STRICT', strict_district_matches[0]))
    elif len(strict_district_matches) > 1:
        l2_multi_matches += 1
        l2_results.append(('AMBIGUOUS', strict_district_matches[0]))
    elif len(candidates) == 1:
        # 1 candidate existed at L1 and no strict district contradiction
        l2_unique_matches += 1
        l2_results.append(('UNIQUE_L1', candidates[0][0]))
    else:
        l2_multi_matches += 1
        l2_results.append(('AMBIGUOUS_NO_DIST_RESOLUTION', candidates[0][0]))

print(f"Level 2 Unique matches: {l2_unique_matches:,} ({(l2_unique_matches/total_tx_rows)*100:.2f}%)")
print(f"Level 2 Ambiguous matches: {l2_multi_matches:,} ({(l2_multi_matches/total_tx_rows)*100:.2f}%)")
print(f"Level 2 No matches: {l2_no_matches:,} ({(l2_no_matches/total_tx_rows)*100:.2f}%)")

# ---------------------------------------------------------
# STEP 7: MATCHING LEVEL 3
# Location info: Block, Village, Ward, City in work text
# ---------------------------------------------------------
print("\n>>> STEP 7: Testing Matching Level 3 (Fine-grained Local Text & Sub-district Evidence)...")
l3_unique_matches = 0
l3_multi_matches = 0
l3_no_matches = 0

for idx, row in df_clean.iterrows():
    k = (row['norm_mp'], row['norm_state'], row['norm_const'], row['norm_work'])
    candidates = level2_prod_index.get(k, [])
    
    if not candidates:
        l3_no_matches += 1
        continue
    
    if len(candidates) == 1:
        l3_unique_matches += 1
        continue
        
    # Attempt to disambiguate multiple candidates using block/village in work text
    work_text = row['norm_work']
    scored_candidates = []
    for pid, loc_tokens, prod_row in candidates:
        score = 0
        if prod_row['norm_block'] and prod_row['norm_block'] in work_text:
            score += 2
        if prod_row['norm_village'] and prod_row['norm_village'] in work_text:
            score += 3
        if prod_row['norm_ward'] and prod_row['norm_ward'] in work_text:
            score += 2
        scored_candidates.append((score, pid))
        
    scored_candidates.sort(key=lambda x: x[0], reverse=True)
    if scored_candidates[0][0] > scored_candidates[1][0] and scored_candidates[0][0] > 0:
        l3_unique_matches += 1
    else:
        l3_multi_matches += 1

print(f"Level 3 Unique matches: {l3_unique_matches:,} ({(l3_unique_matches/total_tx_rows)*100:.2f}%)")
print(f"Level 3 Ambiguous matches: {l3_multi_matches:,} ({(l3_multi_matches/total_tx_rows)*100:.2f}%)")
print(f"Level 3 No matches: {l3_no_matches:,} ({(l3_no_matches/total_tx_rows)*100:.2f}%)")

# ---------------------------------------------------------
# STEP 8: FUZZY MATCHING
# For records with NO exact match, fuzzy match within same (MP, State, Const)
# ---------------------------------------------------------
print("\n>>> STEP 8: Fuzzy Matching within Same (MP, State, Constituency)...")

# Build MP+State+Const index for production
mp_scope_prod_index = {}
for idx, row in df_prod.iterrows():
    k = (row['norm_mp'], row['norm_state'], row['norm_const'])
    if k not in mp_scope_prod_index:
        mp_scope_prod_index[k] = []
    mp_scope_prod_index[k].append(row)

# Evaluate unique works in 22565 that did not exact-match
# Since 143k rows have many duplicate works, we group by (norm_mp, norm_state, norm_const, norm_work)
unmatched_22565_groups = {}
matched_22565_groups = {}

for idx, row in df_clean.iterrows():
    k_exact = (row['norm_mp'], row['norm_state'], row['norm_const'], row['norm_work'])
    if k_exact in level1_prod_index:
        if k_exact not in matched_22565_groups:
            matched_22565_groups[k_exact] = []
        matched_22565_groups[k_exact].append(idx)
    else:
        if k_exact not in unmatched_22565_groups:
            unmatched_22565_groups[k_exact] = []
        unmatched_22565_groups[k_exact].append(idx)

print(f"Distinct exact-matched (MP, State, Const, Work) clusters: {len(matched_22565_groups):,}")
print(f"Distinct unmatched (MP, State, Const, Work) clusters for fuzzy search: {len(unmatched_22565_groups):,}")

# Fuzzy matching on distinct unmatched pairs
fuzzy_matches = []
# Pre-define string similarity
def quick_ratio(s1, s2):
    if not s1 or not s2: return 0.0
    return SequenceMatcher(None, s1, s2).ratio()

high_conf_fuzzy = 0
med_conf_fuzzy = 0
low_conf_fuzzy = 0
no_match_fuzzy = 0

fuzzy_sample_records = []

for (n_mp, n_st, n_co, n_wk), row_indices in unmatched_22565_groups.items():
    cand_list = mp_scope_prod_index.get((n_mp, n_st, n_co), [])
    
    if not cand_list:
        no_match_fuzzy += len(row_indices)
        continue
    
    best_score = 0.0
    best_prod = None
    
    for prod_row in cand_list:
        p_wk = prod_row['norm_work']
        # calculate ratio
        score = quick_ratio(n_wk, p_wk)
        if score > best_score:
            best_score = score
            best_prod = prod_row
            if best_score == 1.0:
                break
                
    conf = "NO_MATCH"
    if best_score >= 0.85:
        conf = "HIGH_CONFIDENCE"
        high_conf_fuzzy += len(row_indices)
    elif best_score >= 0.70:
        conf = "MEDIUM_CONFIDENCE"
        med_conf_fuzzy += len(row_indices)
    elif best_score >= 0.50:
        conf = "LOW_CONFIDENCE"
        low_conf_fuzzy += len(row_indices)
    else:
        conf = "NO_MATCH"
        no_match_fuzzy += len(row_indices)
        
    if best_prod is not None and len(fuzzy_sample_records) < 2000 and conf != "NO_MATCH":
        for r_idx in row_indices[:2]: # take up to 2 samples per cluster
            sample_r = df_clean.loc[r_idx]
            fuzzy_sample_records.append({
                'row_id_22565': r_idx,
                'project_id': best_prod['project_id'],
                'mp_name': sample_r['loksabha_MP_name'],
                'state': sample_r['state'],
                'constituency': sample_r['loksabha_constituency'],
                'work_22565': sample_r['work'],
                'work_production': best_prod['work'],
                'similarity_score': round(best_score, 4),
                'district_22565': sample_r['implementing_district_per_source'],
                'expenditure_amount': sample_r['expenditure_amount'],
                'allocation_amount': best_prod['allocation_amount'],
                'matching_method': 'scoped_fuzzy_SequenceMatcher',
                'confidence_category': conf
            })

print(f"Fuzzy Match Results on Unmatched Rows ({sum(len(v) for v in unmatched_22565_groups.values()):,} total):")
print(f"  High Confidence (>= 85%): {high_conf_fuzzy:,}")
print(f"  Medium Confidence (70-84%): {med_conf_fuzzy:,}")
print(f"  Low Confidence (50-69%): {low_conf_fuzzy:,}")
print(f"  No Match (< 50% or no MP scope): {no_match_fuzzy:,}")

# Total Confidence Breakdown across all 143,256 rows
# Exact unique matches = HIGH CONFIDENCE
total_high_conf = l1_unique_matches + high_conf_fuzzy
total_med_conf = l1_multi_matches + med_conf_fuzzy
total_low_conf = low_conf_fuzzy
total_no_match = no_match_fuzzy

print("\n--- OVERALL CONFIDENCE TOTALS (ALL 143,256 ROWS) ---")
print(f"HIGH CONFIDENCE:   {total_high_conf:,} ({(total_high_conf/total_tx_rows)*100:.2f}%) [Unique Exact: {l1_unique_matches:,}, High Fuzzy: {high_conf_fuzzy:,}]")
print(f"MEDIUM CONFIDENCE: {total_med_conf:,} ({(total_med_conf/total_tx_rows)*100:.2f}%) [Ambiguous Exact: {l1_multi_matches:,}, Med Fuzzy: {med_conf_fuzzy:,}]")
print(f"LOW CONFIDENCE:    {total_low_conf:,} ({(total_low_conf/total_tx_rows)*100:.2f}%)")
print(f"NO MATCH:          {total_no_match:,} ({(total_no_match/total_tx_rows)*100:.2f}%)")

# Export candidate matches CSV
# Include high confidence exact matches sample + fuzzy matches
candidate_matches = []
# Add samples of exact matches
for (n_mp, n_st, n_co, n_wk), r_indices in list(matched_22565_groups.items())[:3000]:
    pids = level1_prod_index[(n_mp, n_st, n_co, n_wk)]
    prod_row = df_prod[df_prod['project_id'] == pids[0]].iloc[0]
    sample_r = df_clean.loc[r_indices[0]]
    candidate_matches.append({
        'row_id_22565': r_indices[0],
        'project_id': prod_row['project_id'],
        'mp_name': sample_r['loksabha_MP_name'],
        'state': sample_r['state'],
        'constituency': sample_r['loksabha_constituency'],
        'work_22565': sample_r['work'],
        'work_production': prod_row['work'],
        'similarity_score': 1.0,
        'district_22565': sample_r['implementing_district_per_source'],
        'expenditure_amount': sample_r['expenditure_amount'],
        'allocation_amount': prod_row['allocation_amount'],
        'matching_method': 'exact_normalized_l1',
        'confidence_category': 'HIGH_CONFIDENCE' if len(pids) == 1 else 'MEDIUM_CONFIDENCE'
    })

candidate_matches.extend(fuzzy_sample_records)
df_candidates = pd.DataFrame(candidate_matches)
candidate_csv_path = os.path.join(ANALYSIS_DIR, '22565_candidate_matches.csv')
df_candidates.to_csv(candidate_csv_path, index=False)
print(f"Saved {len(df_candidates):,} sample candidate matches to {candidate_csv_path}")

# ---------------------------------------------------------
# STEP 9: AMOUNT ANALYSIS (High Confidence Matches)
# ---------------------------------------------------------
print("\n>>> STEP 9: Amount Analysis (Allocation vs Expenditure on High Confidence Matches)...")
# Collect high-confidence pairs (Exact Unique Matches)
amount_pairs = []
for (n_mp, n_st, n_co, n_wk), r_indices in matched_22565_groups.items():
    pids = level1_prod_index[(n_mp, n_st, n_co, n_wk)]
    if len(pids) == 1:
        pid = pids[0]
        prod_row = df_prod[df_prod['project_id'] == pid].iloc[0]
        alloc = prod_row['allocation_amount']
        # Sum of expenditures for this work in 22565
        exp_sum = df_clean.loc[r_indices, 'expenditure_amount'].sum()
        exp_count = len(r_indices)
        amount_pairs.append({
            'project_id': pid,
            'allocation_amount': alloc,
            'expenditure_sum': exp_sum,
            'tx_count': exp_count,
            'ratio': (exp_sum / alloc) if alloc > 0 else np.nan
        })

df_amounts = pd.DataFrame(amount_pairs)
print(f"Evaluated {len(df_amounts):,} unique projects with high-confidence matches:")
print(f"  Mean allocation amount: INR {df_amounts['allocation_amount'].mean():,.2f}")
print(f"  Mean total expenditure per work: INR {df_amounts['expenditure_sum'].mean():,.2f}")
valid_ratios = df_amounts['ratio'].dropna()
print(f"  Mean expenditure-to-allocation ratio: {valid_ratios.mean():.4f} ({valid_ratios.mean()*100:.2f}%)")
print(f"  Median expenditure-to-allocation ratio: {valid_ratios.median():.4f} ({valid_ratios.median()*100:.2f}%)")
print(f"  Works where total expenditure <= allocation: {(df_amounts['expenditure_sum'] <= df_amounts['allocation_amount']).sum():,} ({(df_amounts['expenditure_sum'] <= df_amounts['allocation_amount']).mean()*100:.2f}%)")
print(f"  Works where total expenditure > allocation: {(df_amounts['expenditure_sum'] > df_amounts['allocation_amount']).sum():,} ({(df_amounts['expenditure_sum'] > df_amounts['allocation_amount']).mean()*100:.2f}%)")
print(f"  Works with multiple expenditure transactions: {(df_amounts['tx_count'] > 1).sum():,} ({(df_amounts['tx_count'] > 1).mean()*100:.2f}%)")
print(f"  Max expenditure transactions for one project: {df_amounts['tx_count'].max()}")

# ---------------------------------------------------------
# STEP 10: DATE ANALYSIS
# ---------------------------------------------------------
print("\n>>> STEP 10: Date Chronology Analysis (Recommended Date vs Expenditure Date)...")
date_pairs = []
for (n_mp, n_st, n_co, n_wk), r_indices in matched_22565_groups.items():
    pids = level1_prod_index[(n_mp, n_st, n_co, n_wk)]
    if len(pids) == 1:
        pid = pids[0]
        prod_row = df_prod[df_prod['project_id'] == pid].iloc[0]
        rec_date = prod_row['parsed_rec_date']
        for r_idx in r_indices:
            exp_date = df_clean.loc[r_idx, 'parsed_exp_date']
            if pd.notna(rec_date) and pd.notna(exp_date):
                lag_days = (exp_date - rec_date).days
                date_pairs.append({
                    'project_id': pid,
                    'rec_date': rec_date,
                    'exp_date': exp_date,
                    'lag_days': lag_days
                })

df_dates = pd.DataFrame(date_pairs)
print(f"Analyzed {len(df_dates):,} dated transaction-project pairs:")
print(f"  Mean lag from recommendation to expenditure: {df_dates['lag_days'].mean():.1f} days")
print(f"  Median lag: {df_dates['lag_days'].median():.1f} days")
print(f"  Expenditures AFTER recommendation (lag >= 0): {(df_dates['lag_days'] >= 0).sum():,} ({(df_dates['lag_days'] >= 0).mean()*100:.2f}%)")
print(f"  Expenditures BEFORE recommendation (lag < 0): {(df_dates['lag_days'] < 0).sum():,} ({(df_dates['lag_days'] < 0).mean()*100:.2f}%)")

# ---------------------------------------------------------
# STEP 11: VENDOR ANALYSIS
# ---------------------------------------------------------
print("\n>>> STEP 11: Vendor Analysis...")
vendor_agg = df_clean.groupby('vendor_name').agg(
    total_expenditure=('expenditure_amount', 'sum'),
    tx_count=('expenditure_amount', 'count'),
    mp_count=('loksabha_MP_name', 'nunique'),
    constituency_count=('loksabha_constituency', 'nunique'),
    district_count=('implementing_district_per_source', 'nunique')
).reset_index()

vendor_agg = vendor_agg.sort_values(by='total_expenditure', ascending=False)
print("Top 5 Vendors by Expenditure Amount:")
print(vendor_agg.head(5)[['vendor_name', 'total_expenditure', 'tx_count', 'mp_count', 'district_count']].to_string())

# Vendor concentration by MP
mp_vendor_concentration = df_clean.groupby(['loksabha_MP_name', 'vendor_name'])['expenditure_amount'].sum().reset_index()
mp_total_exp = df_clean.groupby('loksabha_MP_name')['expenditure_amount'].sum().reset_index(name='mp_total_exp')
mp_vendor_concentration = mp_vendor_concentration.merge(mp_total_exp, on='loksabha_MP_name')
mp_vendor_concentration['vendor_share_pct'] = (mp_vendor_concentration['expenditure_amount'] / mp_vendor_concentration['mp_total_exp']) * 100

# Top concentrated vendors per MP
top_mp_vendor = mp_vendor_concentration.sort_values(by=['loksabha_MP_name', 'vendor_share_pct'], ascending=[True, False]).groupby('loksabha_MP_name').first().reset_index()
print(f"\nMPs with >= 80% expenditure paid to a single top vendor: {(top_mp_vendor['vendor_share_pct'] >= 80).sum():,} / {len(top_mp_vendor):,} ({(top_mp_vendor['vendor_share_pct'] >= 80).mean()*100:.2f}%)")
print(f"MPs with 100% expenditure paid to a single vendor: {(top_mp_vendor['vendor_share_pct'] >= 99.99).sum():,}")

vendor_summary_csv = os.path.join(ANALYSIS_DIR, '22565_vendor_summary.csv')
vendor_agg.to_csv(vendor_summary_csv, index=False)
print(f"Saved vendor summary to {vendor_summary_csv}")

# ---------------------------------------------------------
# STEP 12: PAYMENT ANALYSIS
# ---------------------------------------------------------
print("\n>>> STEP 12: Payment Analysis...")
payment_summary = df_clean.groupby('payment_status').agg(
    transaction_count=('expenditure_amount', 'count'),
    total_expenditure=('expenditure_amount', 'sum'),
    mean_expenditure=('expenditure_amount', 'mean'),
    min_expenditure=('expenditure_amount', 'min'),
    max_expenditure=('expenditure_amount', 'max')
).reset_index()

payment_summary['tx_share_pct'] = (payment_summary['transaction_count'] / len(df_clean)) * 100
payment_summary['amount_share_pct'] = (payment_summary['total_expenditure'] / df_clean['expenditure_amount'].sum()) * 100
print(payment_summary.to_string())

payment_summary_csv = os.path.join(ANALYSIS_DIR, '22565_payment_summary.csv')
payment_summary.to_csv(payment_summary_csv, index=False)
print(f"Saved payment summary to {payment_summary_csv}")

# ---------------------------------------------------------
# STEP 13 & 14: SAVE METRICS FOR FINAL REPORT
# ---------------------------------------------------------
metrics = {
    'raw_row_count': int(raw_row_count),
    'raw_col_count': int(raw_col_count),
    'agg_rows_count': int(len(agg_rows)),
    'clean_tx_count': int(total_tx_rows),
    'exact_dupes_count': int(exact_dupes_count),
    'exact_dupes_pct': float(round(pct_dupes, 2)),
    'key_dupes_count': int(key_dupes_count),
    'unique_rows_count': int(unique_rows_count),
    'prod_row_count': int(prod_row_count),
    'prod_min_date': str(prod_min_date.date()) if pd.notna(prod_min_date) else 'N/A',
    'prod_max_date': str(prod_max_date.date()) if pd.notna(prod_max_date) else 'N/A',
    'exp_min_date': str(min_exp_date.date()) if pd.notna(min_exp_date) else 'N/A',
    'exp_max_date': str(max_exp_date.date()) if pd.notna(max_exp_date) else 'N/A',
    'unique_mps_22565': int(len(unique_mps_22565)),
    'unique_mps_prod': int(len(unique_mps_prod)),
    'unique_states_22565': int(len(unique_states_22565)),
    'unique_states_prod': int(len(unique_states_prod)),
    'unique_const_22565': int(len(unique_const_22565)),
    'unique_const_prod': int(len(unique_const_prod)),
    'unique_vendors': int(len(unique_vendors_22565)),
    'unique_agencies': int(len(unique_agencies_22565)),
    'total_exp_amount': float(total_exp_amount),
    'l1_unique_matches': int(l1_unique_matches),
    'l1_multi_matches': int(l1_multi_matches),
    'l1_no_matches': int(l1_no_matches),
    'l2_unique_matches': int(l2_unique_matches),
    'l2_multi_matches': int(l2_multi_matches),
    'l2_no_matches': int(l2_no_matches),
    'l3_unique_matches': int(l3_unique_matches),
    'l3_multi_matches': int(l3_multi_matches),
    'l3_no_matches': int(l3_no_matches),
    'high_conf_total': int(total_high_conf),
    'med_conf_total': int(total_med_conf),
    'low_conf_total': int(total_low_conf),
    'no_match_total': int(total_no_match),
    'mean_exp_ratio': float(round(valid_ratios.mean(), 4)),
    'median_exp_ratio': float(round(valid_ratios.median(), 4)),
    'exp_le_alloc_pct': float(round((df_amounts['expenditure_sum'] <= df_amounts['allocation_amount']).mean() * 100, 2)),
    'exp_gt_alloc_pct': float(round((df_amounts['expenditure_sum'] > df_amounts['allocation_amount']).mean() * 100, 2)),
    'multi_tx_per_work_pct': float(round((df_amounts['tx_count'] > 1).mean() * 100, 2)),
    'mean_date_lag_days': float(round(df_dates['lag_days'].mean(), 1)),
    'median_date_lag_days': float(round(df_dates['lag_days'].median(), 1)),
    'after_rec_pct': float(round((df_dates['lag_days'] >= 0).mean() * 100, 2)),
    'top_vendor_80pct_mps': int((top_mp_vendor['vendor_share_pct'] >= 80).sum())
}

with open(os.path.join(ANALYSIS_DIR, 'analysis_metrics.json'), 'w', encoding='utf-8') as f:
    json.dump(metrics, f, indent=2)

print("\nSaved analysis_metrics.json successfully.")
print("=" * 80)
print("ANALYSIS EXECUTION COMPLETE")
print("=" * 80)
