import urllib.request
import json

def test_api(url, name):
    try:
        req = urllib.request.urlopen(url)
        data = json.loads(req.read().decode('utf-8'))
        print(f"=== {name} [STATUS 200 OK] ===")
        if 'data' in data:
            d = data['data']
            if isinstance(d, dict):
                print("Keys:", list(d.keys()))
                if 'total_vouchers' in d:
                    print(f"Total Vouchers: {d['total_vouchers']:,}, Total Spent: ₹{d['total_expenditure']/1e7:,.2f} Cr, Vendors: {d['total_vendors']:,}")
            elif isinstance(d, list):
                print(f"List items returned: {len(d)}")
                if len(d) > 0:
                    print("Sample item keys:", list(d[0].keys())[:8])
                    if 'vendor_name' in d[0]:
                        print("Sample vendor:", d[0]['vendor_name'], "Spend:", d[0].get('total_spent'))
        if 'queue_summary' in data:
            print("Queue summary:", data['queue_summary'])
        if 'has_linked_expenditures' in data:
            print(f"Has linked expenditures: {data['has_linked_expenditures']}, Vouchers: {len(data['vouchers'])}")
            if data.get('financial_summary'):
                print("Financial Summary:", data['financial_summary'])
            if data.get('financial_risk'):
                print("Financial Risk:", data['financial_risk'])
        return True
    except Exception as e:
        print(f"=== {name} [FAILED] ===", e)
        return False

print("Testing Backend Endpoints...")
test_api('http://localhost:5000/api/expenditures/analytics', 'Analytics API')
test_api('http://localhost:5000/api/expenditures/vendors?limit=3', 'Top Vendors API')
test_api('http://localhost:5000/api/expenditures?limit=3', 'Expenditures List API')
test_api('http://localhost:5000/api/matches/review?limit=3', 'Match Review Queue API')
test_api('http://localhost:5000/api/projects/PRJ_7119C15E1AB6/expenditures', 'Linked Project Expenditures')
test_api('http://localhost:5000/api/projects/PRJ_NONEXISTENT_TEST/expenditures', 'Nonexistent Project')
