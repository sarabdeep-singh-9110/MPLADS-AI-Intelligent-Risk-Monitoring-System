import pandas as pd
import numpy as np
import json
import joblib
import sys
from pathlib import Path
from sklearn.ensemble import IsolationForest

# Ensure UTF-8 stdout encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

# ============================================================
# PATHS
# ============================================================
BASE_DIR = Path(__file__).resolve().parents[2]
FEATURES_FILE = BASE_DIR / "data" / "processed" / "works_features.csv"
MODEL_DIR = BASE_DIR / "ml-service" / "models"
MODEL_FILE = MODEL_DIR / "anomaly_model.pkl"
CONFIG_FILE = MODEL_DIR / "model_features.json"
OUTPUT_FILE = BASE_DIR / "data" / "processed" / "works_ml_scored.csv"

def train_production_ml():
    print("=" * 60)
    print("MPLADS PRODUCTION UNSUPERVISED ML MODEL TRAINING (5 FEATURES)")
    print("=" * 60)

    # 1. Load Feature Dataset
    print(f"\nLoading feature dataset: {FEATURES_FILE}")
    df = pd.read_csv(FEATURES_FILE, low_memory=False)
    total_rows = len(df)
    print(f"Calculated Training Rows: {total_rows:,}")

    # 2. Final 5 Production Features (Model B Configuration)
    FINAL_FEATURES = [
        "allocation_amount",
        "amount_vs_work_median",
        "amount_percentile",
        "mp_work_location_count",
        "days_since_recommendation"
    ]

    print("\nFinal Production ML Features (5 Features):")
    for feat in FINAL_FEATURES:
        if feat not in df.columns:
            raise ValueError(f"Required feature '{feat}' is missing from works_features.csv!")
        print(f" - {feat}")

    # 3. Safe Preprocessing
    X_df = df[FINAL_FEATURES].copy()
    X_df = X_df.replace([np.inf, -np.inf], np.nan)
    for col in FINAL_FEATURES:
        X_df[col] = X_df[col].fillna(X_df[col].median())

    X = X_df.values

    # 4. Train Official Isolation Forest
    print("\nFitting official Isolation Forest model (model.fit(X))...")
    model = IsolationForest(
        n_estimators=200,
        contamination="auto",
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X)
    print("Isolation Forest training completed successfully.")

    # 5. Generate Anomaly Scores & Rankings
    print("\nGenerating decision function scores and anomaly predictions...")
    raw_predictions = model.predict(X) # -1 = anomaly, 1 = normal
    decision_scores = model.decision_function(X) # lower score = more anomalous

    # Normalize score between 0 (most normal) and 100 (most anomalous)
    min_dec = decision_scores.min()
    max_dec = decision_scores.max()
    normalized_scores = np.round(((max_dec - decision_scores) / (max_dec - min_dec)) * 100, 2)

    df["ml_anomaly_flag"] = raw_predictions
    df["ml_anomaly_score"] = normalized_scores
    df["ml_anomaly_rank"] = df["ml_anomaly_score"].rank(ascending=False, method="min").astype(int)

    # 6. Save Model Binary & Config Metadata
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_FILE)
    print(f"\nOfficial production model saved to: {MODEL_FILE}")

    config_data = {
        "model_type": "IsolationForest",
        "features": FINAL_FEATURES,
        "feature_order": FINAL_FEATURES,
        "n_estimators": 200,
        "contamination": "auto",
        "random_state": 42,
        "decision_score_min": float(min_dec),
        "decision_score_max": float(max_dec),
        "description": "The fitted Isolation Forest identified observations that were statistically easier to isolate within the supplied feature space. The observed anomaly rate is dataset and model dependent and does not represent fraud probability."
    }
    with open(CONFIG_FILE, "w") as f:
        json.dump(config_data, f, indent=2)
    print(f"Model configuration saved to: {CONFIG_FILE}")

    # 7. Save Official ML Scored Dataset
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"ML scored dataset saved to: {OUTPUT_FILE}")

    # 8. Training Summary Calculations
    anomalies_count = int((raw_predictions == -1).sum())
    anomaly_pct = round((anomalies_count / total_rows) * 100, 2)
    mean_score = round(float(normalized_scores.mean()), 2)
    p95_score = round(float(np.percentile(normalized_scores, 95)), 2)

    print("\n" + "=" * 60)
    print("PRODUCTION ML TRAINING SUMMARY")
    print("=" * 60)
    print(f"Training row count    : {total_rows:,}")
    print("Final ML features     :")
    for f in FINAL_FEATURES:
        print(f"  - {f}")
    print(f"Algorithm             : Isolation Forest (n_estimators=200, random_state=42)")
    print(f"Anomalies detected    : {anomalies_count:,}")
    print(f"Anomaly percentage    : {anomaly_pct}%")
    print(f"Mean anomaly score    : {mean_score}")
    print(f"95th percentile score : {p95_score}")
    print(f"Model file saved      : {MODEL_FILE}")
    print(f"Config file saved     : {CONFIG_FILE}")
    print(f"ML dataset created    : {OUTPUT_FILE}")
    print("=" * 60)

if __name__ == "__main__":
    train_production_ml()
