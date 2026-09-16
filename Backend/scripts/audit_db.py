import sqlite3
import os

db_path = r"d:\SIH_2026\MPLADS-AI-Intelligent-Risk-Monitoring-System\database\mplads_risk.db"

if not os.path.exists(db_path):
    print("Database path does not exist:", db_path)
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get table info
cursor.execute("PRAGMA table_info(works)")
columns = [row[1] for row in cursor.fetchall()]
print("Columns in 'works':", columns)

# Total count
cursor.execute("SELECT COUNT(*) FROM works")
total_count = cursor.fetchone()[0]
print("Total count in works:", total_count)

# SUM(allocation_amount)
cursor.execute("SELECT SUM(allocation_amount), AVG(allocation_amount) FROM works")
sum_alloc, avg_alloc = cursor.fetchone()
print(f"SUM(allocation_amount): {sum_alloc:,.2f} INR (approx {sum_alloc / 1e7:,.2f} Cr)")
print(f"AVG(allocation_amount): {avg_alloc:,.2f} INR")

# ML Anomaly Score stats
if 'ml_anomaly_score' in columns:
    cursor.execute("SELECT MIN(ml_anomaly_score), MAX(ml_anomaly_score), AVG(ml_anomaly_score) FROM works")
    min_ml, max_ml, avg_ml = cursor.fetchone()
    print(f"ml_anomaly_score: MIN={min_ml}, MAX={max_ml}, AVG={avg_ml}")

# Rule Risk Score stats
if 'rule_risk_score' in columns:
    cursor.execute("SELECT MIN(rule_risk_score), MAX(rule_risk_score), AVG(rule_risk_score) FROM works")
    min_rule, max_rule, avg_rule = cursor.fetchone()
    print(f"rule_risk_score: MIN={min_rule}, MAX={max_rule}, AVG={avg_rule}")

# Hybrid Risk Score stats
if 'hybrid_risk_score' in columns:
    cursor.execute("SELECT MIN(hybrid_risk_score), MAX(hybrid_risk_score), AVG(hybrid_risk_score) FROM works")
    min_hybrid, max_hybrid, avg_hybrid = cursor.fetchone()
    print(f"hybrid_risk_score: MIN={min_hybrid}, MAX={max_hybrid}, AVG={avg_hybrid}")

# Risk Level Distribution
if 'hybrid_risk_level' in columns:
    cursor.execute("SELECT hybrid_risk_level, COUNT(*) FROM works GROUP BY hybrid_risk_level")
    print("Hybrid Risk Level counts:", cursor.fetchall())

if 'risk_level' in columns:
    cursor.execute("SELECT risk_level, COUNT(*) FROM works GROUP BY risk_level")
    print("Risk Level counts:", cursor.fetchall())

if 'ml_anomaly_flag' in columns:
    cursor.execute("SELECT ml_anomaly_flag, COUNT(*) FROM works GROUP BY ml_anomaly_flag")
    print("ml_anomaly_flag counts:", cursor.fetchall())

conn.close()
