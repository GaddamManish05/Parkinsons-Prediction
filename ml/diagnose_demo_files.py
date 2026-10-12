import os
import sys
import json
import joblib
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_features import extract_voice_features
from predict import predict_parkinsons, MODEL_PATH, SCALER_PATH, FEATURES_PATH

demo_files = {
    "Low Risk Demo": r"C:\Users\gadda\Downloads\demo_low_risk_candidate.wav",
    "Medium Risk Demo": r"C:\Users\gadda\Downloads\demo_medium_risk_candidate.wav",
    "High Risk Demo": r"C:\Users\gadda\Downloads\demo_high_risk_candidate.wav"
}

scaler = joblib.load(SCALER_PATH)
model = joblib.load(MODEL_PATH)
feature_names = joblib.load(FEATURES_PATH)

print("=" * 80)
print("AUDIT & DIAGNOSTIC RUN ON DEMO AUDIO FILES")
print("=" * 80)
print(f"Model path: {MODEL_PATH}")
print(f"Scaler path: {SCALER_PATH}")
print(f"Features: {feature_names}")
print()

for name, path in demo_files.items():
    print("-" * 80)
    print(f"FILE: {name} ({path})")
    if not os.path.exists(path):
        print("  FILE NOT FOUND!")
        continue
    
    file_size = os.path.getsize(path)
    print(f"  File Size: {file_size} bytes")
    
    # 1. Feature Extraction
    features = extract_voice_features(path)
    print("  EXTRACTED FEATURES (Raw):")
    for fname in ["fo", "fhi", "flo", "jitter_local", "shimmer_local", "hnr", "nhr", "dfa", "spread1"]:
        print(f"    {fname}: {features[fname]:.6f}")
        
    # 2. Scaling
    vector = [features[fn] for fn in feature_names]
    X = np.array([vector])
    X_scaled = scaler.transform(X)
    
    print("  SCALED FEATURES (First 5 and key indicators):")
    print(f"    scaled_fo: {X_scaled[0][0]:.4f}")
    print(f"    scaled_fhi: {X_scaled[0][1]:.4f}")
    print(f"    scaled_flo: {X_scaled[0][2]:.4f}")
    print(f"    scaled_jitter_local: {X_scaled[0][3]:.4f}")
    print(f"    scaled_hnr: {X_scaled[0][15]:.4f}")
    print(f"    scaled_spread1: {X_scaled[0][19]:.4f}")
    
    # 3. Model Inference
    res = predict_parkinsons(features)
    probas = model.predict_proba(X_scaled)[0]
    
    print(f"  PREDICTION OUTPUT:")
    print(f"    Probabilities: class_0={probas[0]:.4f}, class_1={probas[1]:.4f}")
    print(f"    Label: {res['label']}")
    print(f"    Risk Level: {res['riskLevel']}")
    print(f"    Confidence: {res['confidence']:.2f}%")
print("=" * 80)
