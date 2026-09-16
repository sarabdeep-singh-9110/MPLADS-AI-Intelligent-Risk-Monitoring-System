import pandas as pd
from pathlib import Path

# Project root
BASE_DIR = Path(__file__).resolve().parents[2]

# Raw dataset
DATA_FILE = BASE_DIR / "data" / "raw" / "external" / "mplads-works" / "MPLADS.csv"

print("=" * 60)
print("MPLADS DATASET INSPECTION")
print("=" * 60)

print(f"\nReading file:")
print(DATA_FILE)

df = pd.read_csv(DATA_FILE, sep=None, engine="python")

print("\nDataset Shape:")
print(f"Rows    : {df.shape[0]:,}")
print(f"Columns : {df.shape[1]}")

print("\nColumns:")
for i, column in enumerate(df.columns, 1):
    print(f"{i}. {column}")

print("\nFirst 5 Records:")
print(df.head().to_string())

print("\nMissing Values:")
print(df.isnull().sum())

print("\nData Types:")
print(df.dtypes)

print("\nDuplicate Rows:")
print(df.duplicated().sum())

print("\nStatus Distribution:")
if "STATUS" in df.columns:
    print(df["STATUS"].value_counts(dropna=False))

print("\nState Distribution:")
if "STATE" in df.columns:
    print(df["STATE"].value_counts().head(10))

print("\nInspection completed.")