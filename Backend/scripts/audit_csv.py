import pandas as pd

ml_csv = r"d:\SIH_2026\MPLADS-AI-Intelligent-Risk-Monitoring-System\data\processed\works_ml_scored.csv"
hybrid_csv = r"d:\SIH_2026\MPLADS-AI-Intelligent-Risk-Monitoring-System\data\processed\works_hybrid_risk_scored.csv"

df_ml = pd.read_csv(ml_csv)
print("works_ml_scored.csv columns:", df_ml.columns.tolist())
if 'ml_anomaly_score' in df_ml.columns:
    print("ml_anomaly_score stats in ML csv:")
    print(df_ml['ml_anomaly_score'].describe())
if 'raw_anomaly_score' in df_ml.columns:
    print("raw_anomaly_score stats in ML csv:")
    print(df_ml['raw_anomaly_score'].describe())

df_hy = pd.read_csv(hybrid_csv)
print("\nworks_hybrid_risk_scored.csv columns:", df_hy.columns.tolist())
print("ml_anomaly_score stats in Hybrid csv:")
print(df_hy['ml_anomaly_score'].describe())
print("rule_risk_score stats in Hybrid csv:")
print(df_hy['rule_risk_score'].describe())
print("hybrid_risk_score stats in Hybrid csv:")
print(df_hy['hybrid_risk_score'].describe())
