import pandas as pd
import numpy as np
import sys
from pathlib import Path
from sklearn.ensemble import IsolationForest

# Ensure UTF-8 stdout encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parents[2]
FEATURES_FILE = BASE_DIR / "data" / "processed" / "works_features.csv"
RISK_FILE = BASE_DIR / "data" / "processed" / "works_risk_scored.csv"

def run_experiment():
    print("=" * 75)
    print("ISOLATION FOREST CONTROL EXPERIMENT: MODEL A vs. MODEL B")
    print("=" * 75)

    df = pd.read_csv(FEATURES_FILE, low_memory=False)
    if RISK_FILE.exists():
        df_risk = pd.read_csv(RISK_FILE, low_memory=False)
        if "risk_score" in df_risk.columns and "risk_score" not in df.columns:
            df["risk_score"] = df_risk["risk_score"]

    total_rows = len(df)
    print(f"Dataset rows: {total_rows:,}\n")

    # Feature Sets
    features_A = [
        "allocation_amount",
        "amount_vs_work_median",
        "amount_percentile",
        "location_work_count",
        "mp_work_location_count",
        "days_since_recommendation"
    ]

    features_B = [
        "allocation_amount",
        "amount_vs_work_median",
        "amount_percentile",
        "mp_work_location_count",
        "days_since_recommendation"
    ]

    def prep_data(features_list):
        X_df = df[features_list].copy()
        X_df = X_df.replace([np.inf, -np.inf], np.nan)
        for col in features_list:
            X_df[col] = X_df[col].fillna(X_df[col].median())
        return X_df.values

    X_A = prep_data(features_A)
    X_B = prep_data(features_B)

    # 1. Train Model A
    print("Training Model A (Current 6 Features)...")
    clf_A = IsolationForest(n_estimators=200, contamination="auto", random_state=42, n_jobs=-1)
    clf_A.fit(X_A)
    pred_A = clf_A.predict(X_A) # -1 = anomaly, 1 = normal
    dec_A = clf_A.decision_function(X_A)
    score_A = np.round(((dec_A.max() - dec_A) / (dec_A.max() - dec_A.min())) * 100, 2)

    # 2. Train Model B
    print("Training Model B (Reduced Location - 5 Features)...")
    clf_B = IsolationForest(n_estimators=200, contamination="auto", random_state=42, n_jobs=-1)
    clf_B.fit(X_B)
    pred_B = clf_B.predict(X_B)
    dec_B = clf_B.decision_function(X_B)
    score_B = np.round(((dec_B.max() - dec_B) / (dec_B.max() - dec_B.min())) * 100, 2)

    df["model_a_flag"] = pred_A
    df["model_a_score"] = score_A
    df["model_b_flag"] = pred_B
    df["model_b_score"] = score_B

    anom_A_count = int((pred_A == -1).sum())
    anom_B_count = int((pred_B == -1).sum())

    pct_A = round((anom_A_count / total_rows) * 100, 2)
    pct_B = round((anom_B_count / total_rows) * 100, 2)

    # SUMMARY STATS
    print("\n" + "=" * 75)
    print("1. OVERALL METRIC COMPARISON")
    print("=" * 75)
    print(f"{'Metric':<35} | {'Model A (Current)':<18} | {'Model B (Reduced Location)':<18}")
    print("-" * 75)
    print(f"{'Features Count':<35} | {'6 Features':<18} | {'5 Features':<18}")
    print(f"{'Total Anomalies':<35} | {anom_A_count:<18,} | {anom_B_count:<18,}")
    print(f"{'Anomaly Percentage':<35} | {pct_A:<18}% | {pct_B:<18}%")
    print(f"{'Median Anomaly Score':<35} | {score_A.mean():<18.2f} | {score_B.mean():<18.2f}")
    print(f"{'95th Pct Anomaly Score':<35} | {np.percentile(score_A, 95):<18.2f} | {np.percentile(score_B, 95):<18.2f}")

    # 2. ARTIFACT COMPARISON
    print("\n" + "=" * 75)
    print("2. DATA ARTIFACT SENSITIVITY COMPARISON")
    print("=" * 75)

    # Unknown location records
    unk_mask = (df["block"].astype(str).str.lower() == "unknown") & (df["village"].astype(str).str.lower() == "unknown")
    unk_total = unk_mask.sum()
    unk_anom_A = (unk_mask & (pred_A == -1)).sum()
    unk_anom_B = (unk_mask & (pred_B == -1)).sum()

    # High Location Concentration (>=10 location_work_count)
    high_conc_mask = df["location_work_count"] >= 10
    high_conc_total = high_conc_mask.sum()
    high_conc_anom_A = (high_conc_mask & (pred_A == -1)).sum()
    high_conc_anom_B = (high_conc_mask & (pred_B == -1)).sum()

    # Lakshadweep (small UT with high concentration)
    lak_mask = df["state"] == "Lakshadweep"
    lak_total = lak_mask.sum()
    lak_anom_A = (lak_mask & (pred_A == -1)).sum()
    lak_anom_B = (lak_mask & (pred_B == -1)).sum()

    print(f"{'Subgroup':<40} | {'Model A Anomalies':<18} | {'Model B Anomalies':<18}")
    print("-" * 75)
    print(f"{'Unknown Location Records (Total: ' + str(unk_total) + ')':<40} | {unk_anom_A} ({unk_anom_A/unk_total*100:.1f}%) | {unk_anom_B} ({unk_anom_B/unk_total*100:.1f}%)")
    print(f"{'Location Conc >= 10 (Total: ' + str(high_conc_total) + ')':<40} | {high_conc_anom_A} ({high_conc_anom_A/high_conc_total*100:.1f}%) | {high_conc_anom_B} ({high_conc_anom_B/high_conc_total*100:.1f}%)")
    print(f"{'Lakshadweep UT (Total: ' + str(lak_total) + ')':<40} | {lak_anom_A} ({lak_anom_A/lak_total*100:.1f}%) | {lak_anom_B} ({lak_anom_B/lak_total*100:.1f}%)")

    # 3. TOP 20 ANOMALIES COMPARISON
    print("\n" + "=" * 75)
    print("3. TOP 20 ANOMALIES COMPARISON (MODEL A VS MODEL B)")
    print("=" * 75)

    top20_A = df.sort_values("model_a_score", ascending=False).head(20)
    
    cols = [
        "mp_name", "work", "state", "constituency", "allocation_amount",
        "location_work_count", "mp_work_location_count", "days_since_recommendation",
        "model_a_score", "model_b_score"
    ]
    
    print("\nTop 20 Works by Model A Score:")
    pd.set_option('display.max_columns', 15)
    pd.set_option('display.width', 1000)
    print(top20_A[cols].to_string(index=False))

    top20_B = df.sort_values("model_b_score", ascending=False).head(20)
    print("\nTop 20 Works by Model B Score:")
    print(top20_B[cols].to_string(index=False))

if __name__ == "__main__":
    run_experiment()
