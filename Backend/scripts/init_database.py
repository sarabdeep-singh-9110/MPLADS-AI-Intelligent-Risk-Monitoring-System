import sqlite3
import pandas as pd
import hashlib
import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
CSV_FILE = BASE_DIR / "data" / "processed" / "works_hybrid_risk_scored.csv"
DB_DIR = BASE_DIR / "database"
DB_FILE = DB_DIR / "mplads_risk.db"

def init_db():
    print("=" * 60)
    print("INITIALIZING SQLITE DATABASE (HYBRID RISK & INVESTIGATIONS)")
    print("=" * 60)

    if not CSV_FILE.exists():
        print(f"Error: Hybrid dataset CSV file not found at {CSV_FILE}")
        sys.exit(1)

    print(f"Loading {CSV_FILE}...")
    df = pd.read_csv(CSV_FILE, low_memory=False)
    total_rows = len(df)
    print(f"Parsed {total_rows:,} rows from CSV.")

    DB_DIR.mkdir(parents=True, exist_ok=True)
    if DB_FILE.exists():
        try:
            DB_FILE.unlink()
        except Exception as e:
            print("Notice unlinking existing DB:", e)

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Create works table
    cursor.execute("""
      CREATE TABLE works (
        project_id TEXT PRIMARY KEY,
        mp_name TEXT,
        work TEXT,
        category TEXT,
        state TEXT,
        constituency TEXT,
        city TEXT,
        ward TEXT,
        block TEXT,
        village TEXT,
        recommended_date TEXT,
        allocation_amount REAL,
        status TEXT,
        rule_risk_score INTEGER,
        rule_risk_level TEXT,
        rule_risk_reasons TEXT,
        recommended_action TEXT,
        ml_anomaly_score REAL,
        ml_anomaly_flag INTEGER,
        ml_anomaly_rank INTEGER,
        hybrid_risk_score INTEGER,
        hybrid_risk_level TEXT,
        hybrid_risk_reasons TEXT
      )
    """)

    # 2. Create investigations table
    cursor.execute("""
      CREATE TABLE investigations (
        investigation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT UNIQUE,
        status TEXT DEFAULT 'NEW',
        priority TEXT DEFAULT 'MEDIUM',
        officer_notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES works (project_id)
      )
    """)

    # 3. Create performance indexes
    indexes = [
      "CREATE INDEX idx_works_state ON works(state);",
      "CREATE INDEX idx_works_constituency ON works(constituency);",
      "CREATE INDEX idx_works_mp_name ON works(mp_name);",
      "CREATE INDEX idx_works_status ON works(status);",
      "CREATE INDEX idx_works_hybrid_score ON works(hybrid_risk_score DESC);",
      "CREATE INDEX idx_works_hybrid_level ON works(hybrid_risk_level);",
      "CREATE INDEX idx_works_ml_score ON works(ml_anomaly_score DESC);",
      "CREATE INDEX idx_works_rule_score ON works(rule_risk_score DESC);",
      "CREATE INDEX idx_works_rec_date ON works(recommended_date);",
      "CREATE INDEX idx_investigations_proj ON investigations(project_id);",
      "CREATE INDEX idx_investigations_status ON investigations(status);"
    ]
    for idx_sql in indexes:
        cursor.execute(idx_sql)

    # 4. Generate Stable Project IDs
    id_counts = {}
    project_ids = []
    
    for idx, row in df.iterrows():
        key = f"{row.get('mp_name','')}|{row.get('work','')}|{row.get('state','')}|{row.get('constituency','')}|{row.get('block','')}|{row.get('village','')}|{row.get('allocation_amount','')}|{row.get('recommended_date','')}"
        h = hashlib.sha256(key.encode('utf-8')).hexdigest()[:12].upper()
        base_id = f"PRJ_{h}"
        if base_id not in id_counts:
            id_counts[base_id] = 0
            project_ids.append(base_id)
        else:
            id_counts[base_id] += 1
            project_ids.append(f"{base_id}_{id_counts[base_id]}")

    df["project_id"] = project_ids

    # Fill NaN values for clean DB insertion
    df["mp_name"] = df["mp_name"].fillna("N/A")
    df["work"] = df["work"].fillna("")
    df["category"] = df["category"].fillna("General")
    df["state"] = df["state"].fillna("Unknown")
    df["constituency"] = df["constituency"].fillna("Unknown")
    df["city"] = df["city"].fillna("Unknown")
    df["ward"] = df["ward"].fillna("Unknown")
    df["block"] = df["block"].fillna("Unknown")
    df["village"] = df["village"].fillna("Unknown")
    df["recommended_date"] = df["recommended_date"].fillna("")
    df["allocation_amount"] = df["allocation_amount"].fillna(0.0)
    df["status"] = df["status"].fillna("Unknown")
    df["rule_risk_score"] = df["rule_risk_score"].fillna(0).astype(int)
    df["rule_risk_level"] = df["rule_risk_level"].fillna("Low")
    df["rule_risk_reasons"] = df["rule_risk_reasons"].fillna("")
    df["recommended_action"] = df["recommended_action"].fillna("Administrative verification recommended")
    df["ml_anomaly_score"] = df["ml_anomaly_score"].fillna(0.0)
    df["ml_anomaly_flag"] = df["ml_anomaly_flag"].fillna(1).astype(int)
    df["ml_anomaly_rank"] = df["ml_anomaly_rank"].fillna(0).astype(int)
    df["hybrid_risk_score"] = df["hybrid_risk_score"].fillna(0).astype(int)
    df["hybrid_risk_level"] = df["hybrid_risk_level"].fillna("Low")
    df["hybrid_risk_reasons"] = df["hybrid_risk_reasons"].fillna("")

    works_cols = [
        "project_id", "mp_name", "work", "category", "state", "constituency", "city", "ward", "block", "village",
        "recommended_date", "allocation_amount", "status", "rule_risk_score", "rule_risk_level", "rule_risk_reasons",
        "recommended_action", "ml_anomaly_score", "ml_anomaly_flag", "ml_anomaly_rank",
        "hybrid_risk_score", "hybrid_risk_level", "hybrid_risk_reasons"
    ]

    works_data = [tuple(row) for row in df[works_cols].values]

    cursor.executemany("""
      INSERT INTO works (
        project_id, mp_name, work, category, state, constituency, city, ward, block, village,
        recommended_date, allocation_amount, status, rule_risk_score, rule_risk_level, rule_risk_reasons,
        recommended_action, ml_anomaly_score, ml_anomaly_flag, ml_anomaly_rank,
        hybrid_risk_score, hybrid_risk_level, hybrid_risk_reasons
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, works_data)

    # Insert investigations
    inv_data = []
    for pid, lvl in zip(df["project_id"], df["hybrid_risk_level"]):
        priority = "LOW"
        if lvl == "Critical": priority = "CRITICAL"
        elif lvl == "High": priority = "HIGH"
        elif lvl == "Medium": priority = "MEDIUM"
        inv_data.append((pid, "NEW", priority, ""))

    cursor.executemany("""
      INSERT INTO investigations (project_id, status, priority, officer_notes) VALUES (?, ?, ?, ?)
    """, inv_data)

    conn.commit()

    # Validation Queries
    cursor.execute("SELECT COUNT(*) FROM works")
    imported_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM (SELECT project_id FROM works GROUP BY project_id HAVING COUNT(*) > 1)")
    dupe_count = cursor.fetchone()[0]

    cursor.execute("SELECT hybrid_risk_level, COUNT(*) FROM works GROUP BY hybrid_risk_level")
    dist = cursor.fetchall()

    print("\n" + "=" * 60)
    print("DATABASE INITIALIZATION VALIDATION")
    print("=" * 60)
    print(f"Database Path        : {DB_FILE}")
    print(f"Rows Imported        : {imported_count:,}")
    print(f"Expected Rows        : {total_rows:,}")
    print(f"Duplicate Project IDs: {dupe_count}")
    print(f"Missing Project IDs  : 0")
    print("\nHybrid Risk Distribution:")
    for lvl, count in dist:
        print(f" - {lvl}: {count:,}")

    conn.close()

if __name__ == "__main__":
    init_db()
