import requests
import json

# Test /cities endpoint
print("Testing /cities endpoint...")
r = requests.get("http://localhost:8001/cities")
data = r.json()

print(f"✓ Status: {data['status']}")
print(f"✓ Total cities: {len(data['cities'])}")

# Test /predict with city='Pune' and a valid percentile
print("\n\nTesting /predict with city='Pune' and percentile=95...")
r = requests.get("http://localhost:8001/predict", params={
    "percentile": 95.0,
    "city": "Pune",
    "page": 1,
    "limit": 3
})

print(f"Status code: {r.status_code}")
print(f"Response text: {r.text[:500]}")

if r.status_code == 200:
    data = r.json()
    print(f"✓ Status: {data['status']}")
    print(f"✓ Total colleges in Pune (percentile=95): {data['total_count']}")
    print(f"✓ Returned: {len(data['predictions'])} records")
    if data['predictions']:
        for i, pred in enumerate(data['predictions'][:3], 1):
            print(f"\n  College {i}:")
            print(f"    Name: {pred.get('college_name')}")
            print(f"    City: {pred.get('city')}")
            print(f"    Cutoff: {pred.get('cutoff_percentile')}")
