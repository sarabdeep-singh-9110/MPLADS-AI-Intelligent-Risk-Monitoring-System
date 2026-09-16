import pandas as pd
from pathlib import Path


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

INPUT_FILE = (
    BASE_DIR
    / "data"
    / "processed"
    / "works_features.csv"
)

OUTPUT_FILE = (
    BASE_DIR
    / "data"
    / "processed"
    / "works_risk_scored.csv"
)


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 60)
print("MPLADS RISK SCORING ENGINE")
print("=" * 60)

df = pd.read_csv(INPUT_FILE)

print(f"\nInput rows: {len(df):,}")


# ============================================================
# RISK WEIGHTS
# ============================================================

WEIGHTS = {
    "work_amount_anomaly_flag": 25,
    "high_amount_flag": 20,
    "high_location_concentration_flag": 20,
    "repeated_work_pattern_flag": 15,
    "long_pending_flag": 20,
}


# ============================================================
# CALCULATE RISK SCORE
# ============================================================

df["risk_score"] = 0

for feature, weight in WEIGHTS.items():
    df["risk_score"] += (
        df[feature].fillna(0) * weight
    )


# Make sure score stays between 0 and 100

df["risk_score"] = (
    df["risk_score"]
    .clip(0, 100)
    .astype(int)
)


# ============================================================
# RISK LEVEL
# ============================================================

def classify_risk(score):

    if score >= 80:
        return "Critical"

    elif score >= 60:
        return "High"

    elif score >= 30:
        return "Medium"

    else:
        return "Low"


df["risk_level"] = df["risk_score"].apply(
    classify_risk
)


# ============================================================
# RISK REASONS
# ============================================================

def generate_reasons(row):

    reasons = []

    if row["work_amount_anomaly_flag"] == 1:
        reasons.append(
            "Work amount is unusually high for its work type"
        )

    if row["high_amount_flag"] == 1:
        reasons.append(
            "Work has a high allocation amount"
        )

    if row["high_location_concentration_flag"] == 1:
        reasons.append(
            "Multiple works are concentrated at the same location"
        )

    if row["repeated_work_pattern_flag"] == 1:
        reasons.append(
            "MP has an unusually repeated work pattern"
        )

    if row["long_pending_flag"] == 1:
        reasons.append(
            "Work has remained unsanctioned for an unusually long period"
        )

    if not reasons:
        reasons.append(
            "No major anomaly signals detected"
        )

    return " | ".join(reasons)


df["risk_reasons"] = df.apply(
    generate_reasons,
    axis=1
)


# ============================================================
# RECOMMENDED ACTION
# ============================================================

def recommended_action(level):

    if level == "Critical":
        return "Priority field verification recommended"

    elif level == "High":
        return "Detailed administrative verification recommended"

    elif level == "Medium":
        return "Monitor and review supporting records"

    else:
        return "No immediate action required"


df["recommended_action"] = df["risk_level"].apply(
    recommended_action
)


# ============================================================
# SAVE
# ============================================================

df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# SUMMARY
# ============================================================

print("\nRisk scoring completed.")

print("\nRisk level distribution:")

print(
    df["risk_level"]
    .value_counts()
    .reindex(
        ["Critical", "High", "Medium", "Low"],
        fill_value=0
    )
)


print("\nAverage risk score:")

print(
    round(df["risk_score"].mean(), 2)
)


print("\nHighest risk scores:")

print(
    df[
        [
            "mp_name",
            "work",
            "state",
            "constituency",
            "allocation_amount",
            "risk_score",
            "risk_level",
            "risk_reasons",
        ]
    ]
    .sort_values(
        "risk_score",
        ascending=False
    )
    .head(10)
    .to_string(index=False)
)


print("\nSaved to:")

print(OUTPUT_FILE)

print("\nDone.")