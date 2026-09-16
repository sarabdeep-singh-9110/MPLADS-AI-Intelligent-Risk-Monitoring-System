import sqlite3

db_path = r"d:\SIH_2026\MPLADS-AI-Intelligent-Risk-Monitoring-System\database\mplads_risk.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
    SELECT project_id, mp_name, work, state, allocation_amount, rule_risk_score, ml_anomaly_score, hybrid_risk_score, hybrid_risk_level, status
    FROM works
    ORDER BY hybrid_risk_score DESC
    LIMIT 5
""")

rows = cursor.fetchall()
print("Top 5 High Risk Projects in DB:")
for r in rows:
    print(f"ID: {r[0]} | MP: {r[1]} | State: {r[3]} | Alloc: Rs {r[4]:,} | Rule: {r[5]} | ML: {r[6]} | Hybrid: {r[7]} | Level: {r[8]}")

conn.close()
