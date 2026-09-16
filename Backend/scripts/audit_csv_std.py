import csv

hybrid_csv = r"d:\SIH_2026\MPLADS-AI-Intelligent-Risk-Monitoring-System\data\processed\works_hybrid_risk_scored.csv"

with open(hybrid_csv, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    print("CSV Header:", reader.fieldnames)
    
    total = 0
    sum_alloc = 0
    sum_ml = 0
    sum_rule = 0
    sum_hybrid = 0
    
    risk_levels = {}
    
    for row in reader:
        total += 1
        sum_alloc += float(row['allocation_amount']) if row['allocation_amount'] else 0
        sum_ml += float(row['ml_anomaly_score']) if row['ml_anomaly_score'] else 0
        sum_rule += float(row['rule_risk_score']) if row['rule_risk_score'] else 0
        sum_hybrid += float(row['hybrid_risk_score']) if row['hybrid_risk_score'] else 0
        
        lvl = row.get('hybrid_risk_level', 'Unknown')
        risk_levels[lvl] = risk_levels.get(lvl, 0) + 1

print(f"Total Rows: {total}")
print(f"SUM(allocation_amount): {sum_alloc:,.2f} INR (Rs {sum_alloc / 1e7:,.2f} Cr)")
print(f"AVG(ml_anomaly_score): {sum_ml / total:.2f}")
print(f"AVG(rule_risk_score): {sum_rule / total:.2f}")
print(f"AVG(hybrid_risk_score): {sum_hybrid / total:.2f}")
print("Hybrid Risk Level Counts:", risk_levels)
