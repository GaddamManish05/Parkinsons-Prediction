import requests
import json
import os

demo_files = {
    'low': r'C:\Users\gadda\Downloads\demo_low_risk_candidate.wav',
    'medium': r'C:\Users\gadda\Downloads\demo_medium_risk_candidate.wav',
    'high': r'C:\Users\gadda\Downloads\demo_high_risk_candidate.wav'
}

ml_url = 'https://parkinsons-ml.onrender.com/predict'

print("=" * 80)
print("TESTING DEPLOYED RENDER PYTHON ML SERVICE DIRECTLY")
print(f"Endpoint: {ml_url}")
print("=" * 80)

for name, path in demo_files.items():
    print(f"\n--- Uploading {name.upper()} to Render ML Service ---")
    with open(path, 'rb') as f:
        files = {'file': (f'{name}.wav', f, 'audio/wav')}
        r = requests.post(ml_url, files=files, timeout=60)
        print(f"HTTP Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Label: {data.get('label')}")
            print(f"  Probability: {data.get('probability')}")
            print(f"  Confidence: {data.get('confidence')}")
            print(f"  Risk Level: {data.get('riskLevel')}")
            print(f"  Model Version: {data.get('modelVersion')}")
            deviations = data.get('featureDeviations', {})
            if 'fo' in deviations:
                print(f"  Scaler 'fo' parameters: {deviations['fo']}")
            if 'hnr' in deviations:
                print(f"  Scaler 'hnr' parameters: {deviations['hnr']}")
            if 'jitter_local' in deviations:
                print(f"  Scaler 'jitter_local' parameters: {deviations['jitter_local']}")
        else:
            print(f"  Response Error: {r.text}")
