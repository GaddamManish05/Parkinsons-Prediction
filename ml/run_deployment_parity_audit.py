import requests
import json
import time

API_URL = "https://parkinsons-api-v757.onrender.com"
ML_URL = "https://parkinsons-ml.onrender.com"

demo_files = {
    'low': r'C:\Users\gadda\Downloads\demo_low_risk_candidate.wav',
    'medium': r'C:\Users\gadda\Downloads\demo_medium_risk_candidate.wav',
    'high': r'C:\Users\gadda\Downloads\demo_high_risk_candidate.wav'
}

user_cred = {
    'name': 'Parity Auditor',
    'email': 'parity.auditor@example.com',
    'password': 'Password123!'
}

print("=" * 80)
print("PARKINSON'S PREDICTION APPLICATION: DEPLOYMENT PARITY AUDIT")
print("=" * 80)

# 1. Authenticate with deployed backend
print("\n--- STEP 1: AUTHENTICATING ON DEPLOYED BACKEND ---")
r_auth = requests.post(f"{API_URL}/api/auth/login", json={"email": user_cred["email"], "password": user_cred["password"]}, timeout=30)
if r_auth.status_code != 200:
    r_auth = requests.post(f"{API_URL}/api/auth/register", json=user_cred, timeout=30)

assert r_auth.status_code in [200, 201], f"Auth failed: {r_auth.status_code} {r_auth.text}"
token = r_auth.json()["token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"Successfully authenticated as {user_cred['email']}. Token received.")

# 2. Upload the three files through deployed Express API (identical to Prediction.jsx)
print("\n--- STEP 2 & 3: UPLOADING DEMO FILES TO DEPLOYED APPLICATION ---")
uploaded_records = {}

for key, path in demo_files.items():
    print(f"\n>> Uploading '{key.upper()}' ({path}) to {API_URL}/api/predictions/upload...")
    with open(path, "rb") as f:
        files = {"file": (f"demo_{key}_risk_candidate.wav", f, "audio/wav")}
        start_time = time.time()
        res_upload = requests.post(f"{API_URL}/api/predictions/upload", headers=headers, files=files, timeout=90)
        elapsed = time.time() - start_time
    
    print(f"Upload response status: {res_upload.status_code} (took {elapsed:.2f}s)")
    if res_upload.status_code == 201:
        data = res_upload.json()
        pred_id = data.get("_id")
        uploaded_records[key] = {
            "upload_response": data,
            "prediction_id": pred_id
        }
        print(f"  Created MongoDB Prediction ID: {pred_id}")
        print(f"  Predicted Label: {data.get('predictedLabel')}")
        print(f"  Confidence Score: {data.get('confidenceScore')}%")
        print(f"  Risk Level: {data.get('riskLevel')}")
        print(f"  Risk Probability: {data.get('riskProbability')}")
        print(f"  Model Version: {data.get('modelVersion')}")
        
        # 3. Fetch from MongoDB via GET /api/predictions/:id (identical to Result.jsx)
        print(f"  Fetching persisted record from GET /api/predictions/{pred_id}...")
        res_get = requests.get(f"{API_URL}/api/predictions/{pred_id}", headers=headers, timeout=30)
        assert res_get.status_code == 200, f"Failed to fetch record {pred_id}: {res_get.status_code}"
        persisted = res_get.json()
        uploaded_records[key]["persisted"] = persisted
        print(f"  Persisted record verified: ID={persisted.get('_id')}, Risk={persisted.get('riskLevel')}, Confidence={persisted.get('confidenceScore')}%")
    else:
        print(f"  UPLOAD FAILED: {res_upload.text}")

# 4. Check distinctness of prediction IDs
print("\n--- STEP 4 & 5: VERIFYING DISTINCT PREDICTION RECORDS ---")
ids = [rec["prediction_id"] for rec in uploaded_records.values() if "prediction_id" in rec]
print(f"Collected Prediction IDs: {ids}")
if len(ids) == len(set(ids)) and len(ids) == 3:
    print("PASS: Each upload created a distinct, unique MongoDB Prediction record.")
else:
    print(f"FAIL: Duplicate IDs found or missing records! {ids}")

# 5. Fetch Prediction History (identical to History.jsx)
print("\n--- STEP 6: VERIFYING PREDICTION HISTORY ENDPOINT ---")
res_hist = requests.get(f"{API_URL}/api/predictions", headers=headers, timeout=30)
assert res_hist.status_code == 200, f"Failed to fetch history: {res_hist.status_code}"
history_data = res_hist.json()
predictions_list = history_data.get("predictions", [])
print(f"Total history entries retrieved: {len(predictions_list)}")
for item in predictions_list[:5]:
    print(f"  History Item: ID={item.get('_id')}, Date={item.get('createdAt')}, Risk={item.get('riskLevel')}, Confidence={item.get('confidenceScore')}%")

# 6. Detailed Parity Comparison: Local vs Deployed
print("\n--- STEP 7: DEPLOYED VS LOCAL ARTIFACT PARITY COMPARISON ---")
print(f"{'Candidate File':<16} | {'Local Model Prob':<18} | {'Local Risk':<12} | {'Deployed Render Prob':<22} | {'Deployed Risk':<14} | {'Parity Match?'}")
print("-" * 105)

# Expected local values from our calibration
local_expected = {
    'low': {'prob': '2.51%', 'risk': 'Low'},
    'medium': {'prob': '43.44%', 'risk': 'Medium'},
    'high': {'prob': '97.86%', 'risk': 'High'}
}

for key in ['low', 'medium', 'high']:
    loc = local_expected[key]
    dep = uploaded_records.get(key, {}).get("upload_response", {})
    dep_prob = f"{dep.get('confidenceScore', 'N/A')}%"
    dep_risk = dep.get('riskLevel', 'N/A')
    match = "YES" if (loc['risk'] == dep_risk) else "NO (DEPLOYED DESYNC)"
    print(f"{key.upper():<16} | {loc['prob']:<18} | {loc['risk']:<12} | {dep_prob:<22} | {dep_risk:<14} | {match}")

print("\n" + "=" * 80)
print("DEPLOYMENT PARITY AUDIT COMPLETE")
print("=" * 80)
