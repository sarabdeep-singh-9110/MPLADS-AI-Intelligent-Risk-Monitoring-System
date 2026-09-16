import urllib.request
import json
import sqlite3

api_url = "http://localhost:5000/api/investigations/PRJ_B6FC3012D149"
payload = {
    "status": "UNDER_REVIEW",
    "priority": "CRITICAL",
    "officer_notes": "Ground verification in progress by Goa IDA officer"
}

req = urllib.request.Request(api_url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='PATCH')

with urllib.request.urlopen(req) as res:
    patch_resp = json.loads(res.read().decode('utf-8'))
    print("PATCH Response:", patch_resp)

# Verify GET /api/projects/PRJ_B6FC3012D149
with urllib.request.urlopen("http://localhost:5000/api/projects/PRJ_B6FC3012D149") as res:
    proj_resp = json.loads(res.read().decode('utf-8'))
    print("GET Project Response investigation_status:", proj_resp['data']['investigation_status'])
    print("GET Project Response officer_notes:", proj_resp['data']['officer_notes'])

# Verify SQLite directly
db_path = r"d:\SIH_2026\MPLADS-AI-Intelligent-Risk-Monitoring-System\database\mplads_risk.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT project_id, status, priority, officer_notes, updated_at FROM investigations WHERE project_id = 'PRJ_B6FC3012D149'")
row = cursor.fetchone()
print("Direct SQLite Investigations row:", row)
conn.close()
