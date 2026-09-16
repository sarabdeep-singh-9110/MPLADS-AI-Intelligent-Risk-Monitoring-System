import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Ensure UTF-8 stdout encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parents[2]
ML_FILE = BASE_DIR / "data" / "processed" / "works_ml_scored.csv"
RISK_FILE = BASE_DIR / "data" / "processed" / "works_risk_scored.csv"

def run_analysis():
    print("=" * 70)
    print("MPLADS ISOLATION FOREST ML ANOMALY VALIDATION & DIAGNOSTICS")
    print("=" * 70)

    # Load datasets
    df_ml = pd.read_csv(ML_FILE, low_memory=False)
    if RISK_FILE.exists():
        df_risk = pd.read_csv(RISK_FILE, low_memory=False)
        if "risk_score" in df_risk.columns and "risk_score" not in df_ml.columns:
            df_ml["risk_score"] = df_risk["risk_score"]

    total_works = len(df_ml)
    normal_df = df_ml[df_ml["ml_anomaly_flag"] == 1]
    anom_df = df_ml[df_ml["ml_anomaly_flag"] == -1]

    normal_count = len(normal_df)
    anom_count = len(anom_df)
    anom_pct = round((anom_count / total_works) * 100, 2)

    # 1. ANOMALY RATE
    print("\n1. OVERALL ANOMALY RATE")
    print("-" * 50)
    print(f"Total Works        : {total_works:,}")
    print(f"Normal Works       : {normal_count:,}")
    print(f"Anomalous Works    : {anom_count:,}")
    print(f"Anomaly Percentage : {anom_pct}%")

    # 2. ANOMALIES BY STATE
    print("\n2. ANOMALIES BY STATE")
    print("-" * 50)
    state_stats = df_ml.groupby("state").agg(
        total_works=("work", "count"),
        anomalous_works=("ml_anomaly_flag", lambda x: (x == -1).sum())
    )
    state_stats["anomaly_percentage"] = (state_stats["anomalous_works"] / state_stats["total_works"] * 100).round(2)
    
    sorted_by_pct = state_stats.sort_values("anomaly_percentage", ascending=False)
    sorted_by_count = state_stats.sort_values("anomalous_works", ascending=False)

    print("\nTop 10 States by Anomaly Percentage:")
    print(sorted_by_pct.head(10).to_string())

    print("\nTop 10 States by Absolute Anomaly Count:")
    print(sorted_by_count.head(10).to_string())

    # 3. ANOMALIES BY WORK TYPE
    print("\n3. ANOMALIES BY WORK TYPE (MINIMUM 20 WORKS)")
    print("-" * 50)
    work_stats = df_ml.groupby("work").agg(
        total_works=("state", "count"),
        anomalous_works=("ml_anomaly_flag", lambda x: (x == -1).sum())
    )
    work_stats["anomaly_percentage"] = (work_stats["anomalous_works"] / work_stats["total_works"] * 100).round(2)
    
    relevant_works = work_stats[work_stats["total_works"] >= 20].sort_values("anomaly_percentage", ascending=False)
    print("\nTop 20 Work Descriptions by Anomaly Percentage (min 20 works):")
    print(relevant_works.head(20).to_string())

    # 4. ANOMALIES BY ALLOCATION AMOUNT
    print("\n4. ALLOCATION AMOUNT DISTRIBUTION (NORMAL VS ANOMALOUS)")
    print("-" * 50)
    
    def get_stats(series):
        return {
            "Min": float(series.min()),
            "Median": float(series.median()),
            "Mean": round(float(series.mean()), 2),
            "75th Pct": float(series.quantile(0.75)),
            "95th Pct": float(series.quantile(0.95)),
            "Max": float(series.max())
        }

    norm_amt = get_stats(normal_df["allocation_amount"])
    anom_amt = get_stats(anom_df["allocation_amount"])

    amt_comp = pd.DataFrame([norm_amt, anom_amt], index=["Normal Works", "Anomalous Works"])
    pd.set_option('display.float_format', lambda x: '%.2f' % x)
    print(amt_comp.to_string())

    # 5. FEATURE DISTRIBUTION COMPARISON
    print("\n5. FEATURE DISTRIBUTION COMPARISON (NORMAL VS ANOMALOUS)")
    print("-" * 50)
    features_to_compare = [
        "allocation_amount",
        "amount_vs_work_median",
        "amount_percentile",
        "location_work_count",
        "mp_work_location_count",
        "days_since_recommendation"
    ]

    comp_rows = []
    for feat in features_to_compare:
        norm_med = normal_df[feat].median()
        norm_p95 = normal_df[feat].quantile(0.95)
        anom_med = anom_df[feat].median()
        anom_p95 = anom_df[feat].quantile(0.95)
        
        comp_rows.append({
            "Feature": feat,
            "Normal Median": round(norm_med, 2),
            "Normal 95th Pct": round(norm_p95, 2),
            "Anomalous Median": round(anom_med, 2),
            "Anomalous 95th Pct": round(anom_p95, 2),
        })

    comp_df = pd.DataFrame(comp_rows)
    print(comp_df.to_string(index=False))

    # 6. TOP 50 ML ANOMALIES
    print("\n6. TOP 50 ML ANOMALIES")
    print("-" * 50)
    cols_50 = [
        "mp_name", "work", "state", "constituency", "allocation_amount",
        "location_work_count", "mp_work_location_count", "days_since_recommendation",
        "ml_anomaly_score", "risk_score"
    ]
    
    top50 = df_ml.sort_values("ml_anomaly_score", ascending=False).head(50)[cols_50]
    pd.set_option('display.max_columns', 15)
    pd.set_option('display.width', 1000)
    print(top50.to_string(index=False))

    # 7. CHECK FOR DATA ARTIFACTS
    print("\n7. DIAGNOSTIC DATA ARTIFACT EVALUATION")
    print("-" * 50)
    
    # High allocation impact
    top_5pct_amt = df_ml["allocation_amount"].quantile(0.95)
    high_amt_anom_pct = (anom_df["allocation_amount"] >= top_5pct_amt).mean() * 100
    print(f"Percentage of Anomalous works in Top 5% Allocation Amount (>= Rs.{top_5pct_amt:,.0f}): {high_amt_anom_pct:.2f}%")

    # Rajya Sabha impact
    rs_mask = df_ml["constituency"].astype(str).str.contains("Rajya Sabha", case=False, na=False)
    rs_total = rs_mask.sum()
    rs_anom = (rs_mask & (df_ml["ml_anomaly_flag"] == -1)).sum()
    rs_pct = (rs_anom / rs_total * 100) if rs_total > 0 else 0
    print(f"Rajya Sabha Records: {rs_anom:,} anomalous out of {rs_total:,} ({rs_pct:.2f}% anomaly rate)")

    # Missing/Unknown locations impact
    unk_loc_mask = (df_ml["block"].astype(str).str.lower() == "unknown") & (df_ml["village"].astype(str).str.lower() == "unknown")
    unk_total = unk_loc_mask.sum()
    unk_anom = (unk_loc_mask & (df_ml["ml_anomaly_flag"] == -1)).sum()
    unk_pct = (unk_anom / unk_total * 100) if unk_total > 0 else 0
    print(f"Unknown Location Records: {unk_anom:,} anomalous out of {unk_total:,} ({unk_pct:.2f}% anomaly rate)")

    # High Location Concentration impact
    high_conc_mask = df_ml["location_work_count"] >= 10
    high_conc_total = high_conc_mask.sum()
    high_conc_anom = (high_conc_mask & (df_ml["ml_anomaly_flag"] == -1)).sum()
    high_conc_pct = (high_conc_anom / high_conc_total * 100) if high_conc_total > 0 else 0
    print(f"High Location Concentration (>=10 works): {high_conc_anom:,} anomalous out of {high_conc_total:,} ({high_conc_pct:.2f}% anomaly rate)")

if __name__ == "__main__":
    run_analysis()
