import pandas as pd
import numpy as np
from pathlib import Path


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

INPUT_FILE = (
    BASE_DIR
    / "data"
    / "processed"
    / "works_deduplicated.csv"
)

OUTPUT_FILE = (
    BASE_DIR
    / "data"
    / "processed"
    / "works_features.csv"
)


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 60)
print("MPLADS ANOMALY FEATURE ENGINEERING")
print("=" * 60)

df = pd.read_csv(INPUT_FILE)

print(f"\nInput rows: {len(df):,}")


# ============================================================
# DATE
# ============================================================

df["recommended_date"] = pd.to_datetime(
    df["recommended_date"],
    errors="coerce"
)


# ============================================================
# 1. AMOUNT ANOMALY
# ============================================================

# Compare each work against all works in the dataset.

median_amount = df["allocation_amount"].median()

df["amount_vs_median"] = (
    df["allocation_amount"] / median_amount
)


# Percentile rank: 0 = low, 1 = high

df["amount_percentile"] = (
    df["allocation_amount"]
    .rank(pct=True)
)


# High amount indicator

df["high_amount_flag"] = (
    df["amount_percentile"] >= 0.95
).astype(int)


# ============================================================
# 2. WORK TYPE AMOUNT ANOMALY
# ============================================================

category_median = (
    df.groupby("work")["allocation_amount"]
    .transform("median")
)

df["work_type_median_amount"] = category_median

df["amount_vs_work_median"] = (
    df["allocation_amount"]
    / df["work_type_median_amount"].replace(0, np.nan)
)


# Flag if amount is more than 2x typical amount
# for that same work type.

df["work_amount_anomaly_flag"] = (
    df["amount_vs_work_median"] >= 2
).astype(int)


# ============================================================
# 3. LOCATION CONCENTRATION
# ============================================================

# A location concentration signal should only use records
# with meaningful block or village information.
#
# We do NOT want "Unknown" locations to form a huge group.

valid_block = (
    df["block"].astype(str).str.strip().str.lower()
    .isin(["unknown", "nan", "", "none"]) == False
)

valid_village = (
    df["village"].astype(str).str.strip().str.lower()
    .isin(["unknown", "nan", "", "none"]) == False
)

valid_location = valid_block | valid_village


# Count works sharing the same meaningful location.

df["location_work_count"] = 0

df.loc[valid_location, "location_work_count"] = (
    df.loc[valid_location]
    .groupby("location_key")["work"]
    .transform("count")
)


# Calculate threshold only from valid locations.

valid_counts = df.loc[
    valid_location,
    "location_work_count"
]

location_threshold = valid_counts.quantile(0.95)


# Flag unusually concentrated locations.

df["high_location_concentration_flag"] = (
    valid_location
    & (
        df["location_work_count"]
        >= location_threshold
    )
).astype(int)


# ============================================================
# 4. REPEATED MP + WORK & MP + LOCATION PATTERN
# ============================================================

mp_work_counts = (
    df.groupby(["mp_name", "work"])["work"]
    .transform("count")
)

df["mp_work_type_count"] = mp_work_counts

df["mp_work_location_count"] = 0
df.loc[valid_location, "mp_work_location_count"] = (
    df.loc[valid_location]
    .groupby(["mp_name", "location_key"])["work"]
    .transform("count")
)


df["repeated_work_pattern_flag"] = (
    df["mp_work_type_count"] >=
    df["mp_work_type_count"].quantile(0.95)
).astype(int)



# ============================================================
# 5. PENDING AGE RISK
# ============================================================

today = pd.Timestamp.today().normalize()

df["days_since_recommendation"] = (
    today - df["recommended_date"]
).dt.days


# Old unsanctioned works
# Use the 90th percentile of age among unsanctioned works
# instead of a fixed 365-day threshold.

unsanctioned_age_threshold = df.loc[
    df["status"] == "Unsanctioned",
    "days_since_recommendation"
].quantile(0.90)

df["long_pending_flag"] = (
    (df["status"] == "Unsanctioned")
    & (
        df["days_since_recommendation"]
        >= unsanctioned_age_threshold
    )
).astype(int)


# ============================================================
# 6. MISSING LOCATION SIGNAL
# ============================================================

location_columns = [
    "city",
    "ward",
    "block",
    "village"
]

missing_count = 0

for column in location_columns:
    if column in df.columns:
        missing_count += (
            df[column].astype(str).str.lower() == "unknown"
        ).astype(int)

df["missing_location_fields"] = missing_count


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

print("\nFeature engineering completed.")

print(f"\nOutput rows: {len(df):,}")
print(f"Output columns: {len(df.columns)}")

print("\nNew anomaly features:")

new_features = [
    "amount_vs_median",
    "amount_percentile",
    "high_amount_flag",
    "work_type_median_amount",
    "amount_vs_work_median",
    "work_amount_anomaly_flag",
    "location_work_count",
    "high_location_concentration_flag",
    "mp_work_type_count",
    "repeated_work_pattern_flag",
    "days_since_recommendation",
    "long_pending_flag",
    "missing_location_fields",
]

for feature in new_features:
    print(f"- {feature}")


print(f"\nSaved to:")
print(OUTPUT_FILE)

print("\nDone.")