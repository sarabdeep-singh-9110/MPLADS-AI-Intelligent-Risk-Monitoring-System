import urllib.request
import json
import re

req = urllib.request.urlopen('http://localhost:5000/api/expenditures/analytics')
data = json.loads(req.read().decode('utf-8'))['data']

print("=== BACKEND API (DATABASE GROUND TRUTH) ===")
total_vouchers = data['total_vouchers']
total_exp = data['total_expenditure']
total_vendors = data['total_vendors']
total_agencies = data['total_agencies']
in_prog_amount = data['in_progress_amount']
in_prog_count = data['in_progress_count']
success_amount = 0
success_count = 0
for p in data['payment_breakdown']:
    if 'Success' in p['payment_status']:
        success_amount = p['total_amount']
        success_count = p['count']

ls = data['linked_summary']
unique_linked_projects = ls['unique_linked_projects']
linked_vouchers = ls['linked_vouchers']
linked_exp = ls['linked_expenditure']

print(f"1. Total Expenditure:  INR {total_exp:,.2f} (INR {total_exp/1e7:.2f} Cr)")
print(f"2. Total Vouchers:     {total_vouchers:,}")
print(f"3. Total Vendors:      {total_vendors:,}")
print(f"4. Total Agencies:     {total_agencies:,}")
print(f"5. Payment Success:    {success_count:,} ({success_count/total_vouchers*100:.2f}%), INR {success_amount:,.2f} ({success_amount/1e7:.2f} Cr)")
print(f"6. Payment In-Prog:    {in_prog_count:,} ({in_prog_count/total_vouchers*100:.2f}%), INR {in_prog_amount:,.2f} ({in_prog_amount/1e7:.2f} Cr)")
print(f"7. Linked Projects:    {unique_linked_projects:,} projects ({linked_vouchers:,} vouchers, INR {linked_exp/1e7:.2f} Cr)")

print("\n=== SCANNING FRONTEND UI CODE (FinancialPage.jsx) ===")
with open('Frontend/src/pages/FinancialPage.jsx', 'r', encoding='utf-8') as f:
    ui_code = f.read()

# Look for hardcoded numbers or strings in FinancialPage.jsx
hardcoded_finds = []
if '5,108.87' in ui_code:
    hardcoded_finds.append(('Total Disbursed Header Badge', 'INR 5,108.87 Cr', f"INR {total_exp/1e7:.2f} Cr"))
if '196.1' in ui_code or '196' in ui_code:
    hardcoded_finds.append(('Payment In-Progress Tab Header', 'INR 196.1 Cr', f"INR {in_prog_amount/1e7:.2f} Cr"))
if '278.4' in ui_code:
    hardcoded_finds.append(('Linked Expenditure Text', 'INR 278.4 Cr', f"INR {linked_exp/1e7:.2f} Cr"))
if '96.3%' in ui_code:
    hardcoded_finds.append(('Payment Success Hardcoded String', '96.3%', f"{success_count/total_vouchers*100:.2f}%"))
if '3.7%' in ui_code:
    hardcoded_finds.append(('Payment In-Progress Hardcoded String', '3.7%', f"{in_prog_count/total_vouchers*100:.2f}%"))

print(f"Discrepancies / Hardcoded strings found in FinancialPage.jsx: {len(hardcoded_finds)}")
for name, ui_val, api_val in hardcoded_finds:
    print(f"   - {name}: UI displays '{ui_val}' vs API/DB actual '{api_val}'")
