import pandas as pd
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parents[2]
ML_FILE = BASE_DIR / "data" / "processed" / "works_ml_scored.csv"
RISK_FILE = BASE_DIR / "data" / "processed" / "works_risk_scored.csv"

df_ml = pd.read_csv(ML_FILE, low_memory=False)
if RISK_FILE.exists():
    df_risk = pd.read_csv(RISK_FILE, low_memory=False)
    if "risk_score" in df_risk.columns and "risk_score" not in df_ml.columns:
        df_ml["risk_score"] = df_risk["risk_score"]

print("=" * 60)
print("OFFICIAL PRODUCTION ML MODEL VALIDATION REPORT")
print("=" * 60)
print(f"Total works                : {len(df_ml):,}")
anomalies_count = (df_ml['ml_anomaly_flag'] == -1).sum()
print(f"Number of anomalies       : {anomalies_count:,}")
print(f"Anomaly percentage        : {round((anomalies_count / len(df_ml)) * 100, 2)}%")
print(f"Mean ML anomaly score     : {round(df_ml['ml_anomaly_score'].mean(), 2)}")
print(f"95th percentile score     : {round(df_ml['ml_anomaly_score'].quantile(0.95), 2)}")

print("\n" + "=" * 60)
print("TOP 20 OFFICIAL PRODUCTION ML ANOMALIES")
print("=" * 60)

cols = [
    'mp_name', 'work', 'state', 'constituency', 'allocation_amount', 
    'mp_work_location_count', 'days_since_recommendation', 
    'ml_anomaly_score', 'risk_score'
]

top20 = df_ml.sort_values('ml_anomaly_score', ascending=False).head(20)[cols]
pd.set_option('display.max_columns', 15)
pd.set_option('display.width', 1000)
print(top20.to_string(index=False))
