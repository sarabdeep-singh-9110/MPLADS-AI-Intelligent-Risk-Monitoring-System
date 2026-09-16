import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Ensure UTF-8 stdout encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

# ============================================================
# PATHS
# ============================================================
BASE_DIR = Path(__file__).resolve().parents[2]
RISK_FILE = BASE_DIR / "data" / "processed" / "works_risk_scored.csv"
ML_FILE = BASE_DIR / "data" / "processed" / "works_ml_scored.csv"
OUTPUT_FILE = BASE_DIR / "data" / "processed" / "works_hybrid_risk_scored.csv"

def build_hybrid_engine():
    print("=" * 75)
    print("MPLADS HYBRID RISK ENGINE (60% RULE-BASED + 40% ML ANOMALY)")
    print("=" * 75)

    # 1. Load Both Datasets
    print(f"\nLoading Rule-Based Risk dataset: {RISK_FILE}")
    df_risk = pd.read_csv(RISK_FILE, low_memory=False)
    rows_risk = len(df_risk)
    print(f"Rule-Based Dataset rows: {rows_risk:,}")

    print(f"\nLoading ML Anomaly dataset: {ML_FILE}")
    df_ml = pd.read_csv(ML_FILE, low_memory=False)
    rows_ml = len(df_ml)
    print(f"ML Anomaly Dataset rows: {rows_ml:,}")

    # Verify 1-to-1 Row Alignment
    if rows_risk != rows_ml:
        raise ValueError(f"Row count mismatch! Risk dataset ({rows_risk}) != ML dataset ({rows_ml})")

    align_check = (df_risk['work'] == df_ml['work']).all() and (df_risk['allocation_amount'] == df_ml['allocation_amount']).all()
    if not align_check:
        raise ValueError("Row-by-row alignment mismatch between risk and ML datasets!")

    print(f"\nJoin alignment verified: 100% 1-to-1 row correspondence across {rows_risk:,} records.")

    # 2. Combine Datasets
    df_hybrid = df_risk.copy()
    
    # Rename rule score column for explicit clarity
    df_hybrid["rule_risk_score"] = df_risk["risk_score"]
    df_hybrid["rule_risk_level"] = df_risk["risk_level"]
    df_hybrid["rule_risk_reasons"] = df_risk["risk_reasons"]

    # Add ML signals
    df_hybrid["ml_anomaly_score"] = df_ml["ml_anomaly_score"]
    df_hybrid["ml_anomaly_flag"] = df_ml["ml_anomaly_flag"]
    df_hybrid["ml_anomaly_rank"] = df_ml["ml_anomaly_rank"]

    # 3. Calculate Hybrid Risk Score (60% Rule-Based + 40% ML Anomaly)
    # Rationale: Gives greater weight to deterministic domain rules (directly interpretable)
    # while integrating unsupervised ML detection of unusual multivariate behavior.
    raw_hybrid = (df_hybrid["rule_risk_score"] * 0.60) + (df_hybrid["ml_anomaly_score"] * 0.40)
    df_hybrid["hybrid_risk_score"] = np.round(raw_hybrid).clip(0, 100).astype(int)

    # 4. Classify Hybrid Risk Levels (Operational Prioritization Thresholds)
    def classify_hybrid(score):
        if score >= 80:
            return "Critical"
        elif score >= 60:
            return "High"
        elif score >= 30:
            return "Medium"
        else:
            return "Low"

    df_hybrid["hybrid_risk_level"] = df_hybrid["hybrid_risk_score"].apply(classify_hybrid)

    # 5. Generate Dual-Source Explanation Reasons
    def generate_hybrid_reasons(row):
        rule_part = row["rule_risk_reasons"] if pd.notnull(row["rule_risk_reasons"]) and row["rule_risk_reasons"] != "" else "No major rule anomaly"
        
        if row["ml_anomaly_flag"] == -1:
            ml_part = f"ML Anomaly Signal: High behavioral score ({row['ml_anomaly_score']}/100, Rank #{row['ml_anomaly_rank']:,})"
        else:
            ml_part = f"ML Signal: Normal behavioral pattern (Score {row['ml_anomaly_score']}/100)"

        return f"Rule Indicators: [{rule_part}] | {ml_part}"

    df_hybrid["hybrid_risk_reasons"] = df_hybrid.apply(generate_hybrid_reasons, axis=1)

    # 6. Sanity Checks
    print("\n" + "=" * 75)
    print("SANITY CHECKS")
    print("=" * 75)
    print(f"Total Rows Before Join  : {rows_risk:,}")
    print(f"Total Rows After Join   : {len(df_hybrid):,}")
    print(f"Duplicate Count         : {df_hybrid.duplicated(subset=['work', 'mp_name', 'state', 'allocation_amount']).sum()}")
    print(f"Missing Hybrid Scores   : {df_hybrid['hybrid_risk_score'].isnull().sum()}")
    print(f"Min Hybrid Score        : {df_hybrid['hybrid_risk_score'].min()}")
    print(f"Max Hybrid Score        : {df_hybrid['hybrid_risk_score'].max()}")

    # 7. Save Output Dataset
    df_hybrid.to_csv(OUTPUT_FILE, index=False)
    print(f"\nHybrid risk scored dataset successfully saved to: {OUTPUT_FILE}")

    # 8. Risk Distribution Summaries
    print("\n" + "=" * 75)
    print("RISK DISTRIBUTION SUMMARIES")
    print("=" * 75)
    
    print("\n[A] Rule-Based Risk Distribution:")
    print(df_hybrid["rule_risk_level"].value_counts().reindex(["Critical", "High", "Medium", "Low"], fill_value=0).to_string())

    print("\n[B] ML Anomaly Distribution:")
    ml_dist = df_hybrid["ml_anomaly_flag"].map({1: "Normal", -1: "Anomalous"}).value_counts()
    print(ml_dist.to_string())

    print("\n[C] Hybrid Risk Distribution:")
    print(df_hybrid["hybrid_risk_level"].value_counts().reindex(["Critical", "High", "Medium", "Low"], fill_value=0).to_string())

    print("\n" + "=" * 75)
    print("SCORE AVERAGES")
    print("=" * 75)
    print(f"Average Rule-Based Score : {df_hybrid['rule_risk_score'].mean():.2f} / 100")
    print(f"Average ML Anomaly Score : {df_hybrid['ml_anomaly_score'].mean():.2f} / 100")
    print(f"Average Hybrid Risk Score: {df_hybrid['hybrid_risk_score'].mean():.2f} / 100")

    # 9. Top 20 Hybrid Risk Works
    print("\n" + "=" * 75)
    print("TOP 20 HYBRID RISK WORKS")
    print("=" * 75)

    cols = [
        "mp_name", "work", "state", "constituency", "allocation_amount",
        "rule_risk_score", "ml_anomaly_score", "hybrid_risk_score", "hybrid_risk_level"
    ]

    top20 = df_hybrid.sort_values("hybrid_risk_score", ascending=False).head(20)[cols]
    pd.set_option('display.max_columns', 15)
    pd.set_option('display.width', 1000)
    print(top20.to_string(index=False))

    print("\nDisclaimer: Risk scores indicate potential anomalies and prioritize works for human verification. They are NOT proof of fraud, corruption, or wrongdoing.")

if __name__ == "__main__":
    build_hybrid_engine()
