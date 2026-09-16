import pandas as pd
import numpy as np
import os

csv_path = r'D:\SIH_2026\MPLADS-AI-Intelligent-Risk-Monitoring-System\data\analysis\raw_22565\18th-lok-sabha-mplads-state-lok-sabha-constituency-work-name-vendor-name-wise-amount-spent-by-each-mp-from-mplads.csv'

print("Loading Dataset 22565...")
df = pd.read_csv(csv_path, low_memory=False)
print(f"Total raw rows: {len(df):,}")
print(f"Total columns: {len(df.columns)}")

print("\n--- Columns and Data Types ---")
for col in df.columns:
    print(f"  {col}: dtype={df[col].dtype}, nulls={df[col].isna().sum():,} ({df[col].isna().mean()*100:.2f}%)")

print("\n--- Unique values in 'units' ---")
print(df['units'].value_counts(dropna=False))

print("\n--- Checking for Aggregate / Summary rows ---")
agg_rows = df[df['units'].astype(str).str.contains('crore|all india', case=False, na=False) | (df['state'] == 'All India')]
print(f"Found {len(agg_rows)} aggregate rows:")
print(agg_rows[['data_as_on', 'state', 'loksabha_constituency', 'loksabha_MP_name', 'work', 'expenditure_amount', 'units']])

# Non-transaction rows where work is missing or state is All India
summary_mask = (df['state'] == 'All India') | df['work'].isna() | (df['units'] != 'expenditure_amount in rupees')
print(f"\nTotal summary/non-transaction rows detected: {summary_mask.sum()}")
if summary_mask.sum() > 0:
    print(df[summary_mask][['state', 'loksabha_constituency', 'loksabha_MP_name', 'work', 'expenditure_amount', 'units']].to_string())

# Transaction rows
df_tx = df[~summary_mask].copy()
print(f"\nTotal Transaction Rows (excluding aggregate rows): {len(df_tx):,}")

print("\n--- Date Range (expenditure_date) ---")
print("Raw expenditure_date samples:", df_tx['expenditure_date'].dropna().head(5).tolist())
# Parse dates
df_tx['parsed_exp_date'] = pd.to_datetime(df_tx['expenditure_date'], errors='coerce', dayfirst=True)
print(f"Valid parsed dates: {df_tx['parsed_exp_date'].notna().sum():,} / {len(df_tx):,}")
print(f"Min expenditure date: {df_tx['parsed_exp_date'].min()}")
print(f"Max expenditure date: {df_tx['parsed_exp_date'].max()}")

print("\n--- Granularity Counts (Transaction Records) ---")
print(f"Unique States: {df_tx['state'].nunique()}")
print(f"Unique Districts (source): {df_tx['implementing_district_per_source'].nunique()}")
print(f"Unique Districts (lgd): {df_tx['implementing_district_per_lgd'].nunique()}")
print(f"Unique Constituencies: {df_tx['loksabha_constituency'].nunique()}")
print(f"Unique MPs: {df_tx['loksabha_MP_name'].nunique()}")
print(f"Unique Works (raw text): {df_tx['work'].nunique()}")
print(f"Unique Implementing Agencies: {df_tx['implementing_agency_name'].nunique()}")
print(f"Unique Vendors: {df_tx['vendor_name'].nunique()}")

print("\n--- Payment Status Distribution ---")
print(df_tx['payment_status'].value_counts(dropna=False))

print("\n--- Expenditure Amount Summary ---")
print(f"Total expenditure amount (sum in INR): {df_tx['expenditure_amount'].sum():,.2f}")
print(f"Mean expenditure amount: {df_tx['expenditure_amount'].mean():,.2f}")
print(f"Median expenditure amount: {df_tx['expenditure_amount'].median():,.2f}")
print(f"Min expenditure amount: {df_tx['expenditure_amount'].min():,.2f}")
print(f"Max expenditure amount: {df_tx['expenditure_amount'].max():,.2f}")
print(f"Negative expenditure amounts: {(df_tx['expenditure_amount'] < 0).sum()}")
print(f"Zero expenditure amounts: {(df_tx['expenditure_amount'] == 0).sum()}")


