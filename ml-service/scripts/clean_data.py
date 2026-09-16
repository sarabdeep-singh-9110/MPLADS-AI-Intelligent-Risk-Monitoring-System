import pandas as pd
from pathlib import Path


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

RAW_FILE = (
    BASE_DIR
    / "data"
    / "raw"
    / "external"
    / "mplads-works"
    / "MPLADS.csv"
)

OUTPUT_DIR = BASE_DIR / "data" / "processed"
OUTPUT_FILE = OUTPUT_DIR / "master_works.csv"


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 60)
print("MPLADS DATA CLEANING")
print("=" * 60)

print("\nLoading dataset...")

df = pd.read_csv(
    RAW_FILE,
    sep=None,
    engine="python"
)

print(f"Original rows: {len(df):,}")
print(f"Original columns: {len(df.columns)}")


# ============================================================
# CLEAN COLUMN NAMES
# ============================================================

df.columns = (
    df.columns
    .str.strip()
    .str.lower()
    .str.replace(" ", "_")
)

print("\nCleaned columns:")
print(df.columns.tolist())


# ============================================================
# CLEAN TEXT COLUMNS
# ============================================================

text_columns = [
    "mp_name",
    "work",
    "category",
    "state",
    "constituency",
    "ida",
    "city",
    "ward",
    "block",
    "village",
    "ida_approval",
    "status",
    "house"
]

for column in text_columns:
    if column in df.columns:
        df[column] = df[column].astype("string").str.strip()


# ============================================================
# HANDLE MISSING TEXT VALUES
# ============================================================

location_columns = [
    "city",
    "ward",
    "block",
    "village"
]

for column in location_columns:
    if column in df.columns:
        df[column] = df[column].fillna("Unknown")


if "status" in df.columns:
    df["status"] = df["status"].fillna("Unknown")


if "constituency" in df.columns:
    df["constituency"] = df["constituency"].fillna("Unknown")


# ============================================================
# CLEAN AMOUNT
# ============================================================

if "allocation_amount" in df.columns:

    df["allocation_amount"] = (
        df["allocation_amount"]
        .astype(str)
        .str.replace(",", "", regex=False)
        .str.replace("₹", "", regex=False)
        .str.strip()
    )

    df["allocation_amount"] = pd.to_numeric(
        df["allocation_amount"],
        errors="coerce"
    )


# ============================================================
# CLEAN DATE
# ============================================================

if "recommended_date" in df.columns:

    df["recommended_date"] = pd.to_datetime(
        df["recommended_date"],
        errors="coerce"
    )


# ============================================================
# CREATE DATE FEATURES
# ============================================================

today = pd.Timestamp.today().normalize()

if "recommended_date" in df.columns:

    df["work_age_days"] = (
        today - df["recommended_date"]
    ).dt.days

    df["recommendation_year"] = (
        df["recommended_date"].dt.year
    )

    df["recommendation_month"] = (
        df["recommended_date"].dt.month
    )


# ============================================================
# CREATE LOCATION KEY
# ============================================================

location_parts = []

for column in ["state", "constituency", "block", "village"]:

    if column in df.columns:
        location_parts.append(
            df[column].fillna("Unknown").astype(str)
        )


if location_parts:

    df["location_key"] = (
        pd.Series(
            ["|".join(values) for values in zip(*location_parts)],
            index=df.index
        )
    )


# ============================================================
# CREATE WORK TEXT KEY
# ============================================================

if "work" in df.columns:

    df["work_normalized"] = (
        df["work"]
        .str.lower()
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )


# ============================================================
# DUPLICATE ANALYSIS
# ============================================================

df["is_exact_duplicate"] = df.duplicated(
    keep=False
)


# ============================================================
# AMOUNT STATISTICS
# ============================================================

if "allocation_amount" in df.columns:

    df["amount_percentile"] = (
        df["allocation_amount"]
        .rank(pct=True)
        .round(4)
    )


# ============================================================
# CREATE OUTPUT DIRECTORY
# ============================================================

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# SAVE PROCESSED DATA
# ============================================================

df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# SUMMARY
# ============================================================

print("\n" + "=" * 60)
print("CLEANING COMPLETED")
print("=" * 60)

print(f"\nProcessed rows : {len(df):,}")
print(f"Processed cols : {len(df.columns)}")

print(f"\nOutput file:")
print(OUTPUT_FILE)

print("\nMissing values after cleaning:")
print(df.isnull().sum())

print("\nStatus:")
if "status" in df.columns:
    print(df["status"].value_counts(dropna=False))

print("\nExact duplicate rows:")
print(df["is_exact_duplicate"].sum())

print("\nDone.")