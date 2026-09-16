import sqlite3
import pandas as pd
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parents[1]
CSV_FILE = BASE_DIR / "data" / "processed" / "works_risk_scored.csv"
DB_FILE = BASE_DIR / "database" / "mplads_risk.db"

def seed_db():
    print("=" * 60)
    print("SEEDING MPLADS SQLITE DATABASE (RULE-BASED RISK ENGINE)")
    print("=" * 60)
    
    if not CSV_FILE.exists():
        print(f"Error: Scored CSV file not found at {CSV_FILE}")
        sys.exit(1)
        
    print(f"Reading {CSV_FILE}...")
    df = pd.read_csv(CSV_FILE, low_memory=False)
    print(f"Loaded {len(df):,} rows and {len(df.columns)} columns.")

    # Fill NaN values for clean DB storage
    df["city"] = df["city"].fillna("Unknown")
    df["ward"] = df["ward"].fillna("Unknown")
    df["block"] = df["block"].fillna("Unknown")
    df["village"] = df["village"].fillna("Unknown")
    df["status"] = df["status"].fillna("Unknown")
    df["ida"] = df["ida"].fillna("Unknown")
    df["category"] = df["category"].fillna("General")
    df["constituency"] = df["constituency"].fillna("Unknown")
    df["house"] = df["house"].fillna("Unknown")

    # Add decision-support investigation fields
    df["investigation_status"] = "New"
    df["officer_notes"] = ""

    # Connect to SQLite
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    if DB_FILE.exists():
        DB_FILE.unlink()
        
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    print("Writing data to 'projects' table...")
    df.to_sql("projects", conn, if_exists="replace", index=True, index_label="id")

    print("Creating database indexes for optimized query performance...")
    indexes = [
        "CREATE INDEX idx_projects_risk_level ON projects(risk_level);",
        "CREATE INDEX idx_projects_risk_score ON projects(risk_score DESC);",
        "CREATE INDEX idx_projects_state ON projects(state);",
        "CREATE INDEX idx_projects_constituency ON projects(constituency);",
        "CREATE INDEX idx_projects_mp_name ON projects(mp_name);",
        "CREATE INDEX idx_projects_category ON projects(category);",
        "CREATE INDEX idx_projects_status ON projects(status);",
        "CREATE INDEX idx_projects_investigation ON projects(investigation_status);"
    ]
    for idx_sql in indexes:
        cursor.execute(idx_sql)

    conn.commit()
    
    # Verify count
    cursor.execute("SELECT COUNT(*) FROM projects")
    count = cursor.fetchone()[0]
    print(f"Successfully seeded SQLite database at {DB_FILE} with {count:,} projects.")
    
    conn.close()

if __name__ == "__main__":
    seed_db()
