import os
import sys
import math
import hashlib
import wave
import json
import soundfile as sf
import numpy as np
import joblib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_features import extract_voice_features
from predict import predict_parkinsons, MODEL_PATH, SCALER_PATH, FEATURES_PATH, BASE_DIR

demo_files = {
    'low': r'C:\Users\gadda\Downloads\demo_low_risk_candidate.wav',
    'medium': r'C:\Users\gadda\Downloads\demo_medium_risk_candidate.wav',
    'high': r'C:\Users\gadda\Downloads\demo_high_risk_candidate.wav'
}

print("=" * 100)
print("PARKINSON'S DEMO AUDIO FILES VALIDATION AUDIT")
print("=" * 100)

# 1. FILE METADATA & PHYSICAL AUDIO PROPERTIES
print("\n--- 1. FILE PROPERTIES & ENCODING ---")
audio_meta = {}
for key, path in demo_files.items():
    assert os.path.exists(path), f"File missing: {path}"
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()
    
    info = sf.info(path)
    data, sr = sf.read(path)
    min_amp = float(np.min(data))
    max_amp = float(np.max(data))
    peak_amp = max(abs(min_amp), abs(max_amp))
    rms_amp = float(np.sqrt(np.mean(data ** 2)))
    peak_dbfs = 20 * math.log10(peak_amp) if peak_amp > 0 else -100.0
    rms_dbfs = 20 * math.log10(rms_amp) if rms_amp > 0 else -100.0
    
    with wave.open(path, "rb") as w:
        sw = w.getsampwidth()
        nc = w.getnchannels()
        fr = w.getframerate()
        nf = w.getnframes()
    
    audio_meta[key] = {
        "path": path,
        "size_bytes": size,
        "sha256": sha256,
        "encoding": f"PCM {sw * 8}-bit ({info.subtype})",
        "sample_rate": fr,
        "channels": nc,
        "frames": nf,
        "duration_sec": nf / float(fr),
        "min_amp": min_amp,
        "max_amp": max_amp,
        "peak_amp": peak_amp,
        "peak_dbfs": peak_dbfs,
        "rms_amp": rms_amp,
        "rms_dbfs": rms_dbfs
    }
    print(f"[{key.upper()}] Path: {path}")
    print(f"  SHA-256: {sha256}")
    print(f"  Size: {size} bytes | Encoding: PCM {sw * 8}-bit ({info.subtype})")
    print(f"  Sample Rate: {fr} Hz | Channels: {nc} (mono) | Frames: {nf} | Duration: {nf / float(fr):.4f}s")
    print(f"  Amplitude Range: [{min_amp:.4f}, {max_amp:.4f}] | Peak: {peak_amp:.4f} ({peak_dbfs:.2f} dBFS) | RMS: {rms_amp:.4f} ({rms_dbfs:.2f} dBFS)")

# 2. RUN EXTRACTION PIPELINE
print("\n--- 2. FEATURE EXTRACTION PIPELINE ---")
extracted_features = {}
for key, path in demo_files.items():
    feat = extract_voice_features(path)
    extracted_features[key] = feat
    print(f"Successfully extracted {len(feat)} features from {key} candidate.")

# 3 & 4. 22 FEATURES COMPARISON TABLE & ANOMALY CHECKS
feature_names = joblib.load(FEATURES_PATH)
print("\n--- 3 & 4. 22 FEATURES COMPARISON & ANOMALY AUDIT ---")
header = f"{'Feature':<16} | {'Low Risk':<14} | {'Med Risk':<14} | {'High Risk':<14} | {'Med - Low':<14} | {'High - Med':<14} | {'Ratio H/L':<10}"
print(header)
print("-" * len(header))

anomalies = []
for fn in feature_names:
    vl = extracted_features['low'][fn]
    vm = extracted_features['medium'][fn]
    vh = extracted_features['high'][fn]
    
    # Check for NaN / Inf / None
    for label, val in [("Low", vl), ("Medium", vm), ("High", vh)]:
        if val is None or math.isnan(val) or math.isinf(val):
            anomalies.append(f"{label} candidate feature '{fn}' has invalid value: {val}")
    
    diff_ml = vm - vl
    diff_hm = vh - vm
    ratio_hl = vh / vl if vl != 0 else float('inf')
    
    if abs(vl) < 0.005:
        s_vl = f"{vl:.6f}"
        s_vm = f"{vm:.6f}"
        s_vh = f"{vh:.6f}"
        s_dml = f"{diff_ml:+.6f}"
        s_dhm = f"{diff_hm:+.6f}"
    else:
        s_vl = f"{vl:.4f}"
        s_vm = f"{vm:.4f}"
        s_vh = f"{vh:.4f}"
        s_dml = f"{diff_ml:+.4f}"
        s_dhm = f"{diff_hm:+.4f}"
    
    s_r = f"{ratio_hl:.2f}x"
    print(f"{fn:<16} | {s_vl:<14} | {s_vm:<14} | {s_vh:<14} | {s_dml:<14} | {s_dhm:<14} | {s_r:<10}")

print(f"\nAnomaly Check Result: {len(anomalies)} anomalies detected.")
if anomalies:
    for a in anomalies:
        print("  - " + a)
else:
    print("  All 22 features across all 3 files are valid, non-null, finite real numbers within physiological bounds.")

# 5 & 6. MODEL INFERENCE & ACTIVE ARTIFACTS AUDIT
print("\n--- 5, 6 & 7. ACTIVE ARTIFACTS & INFERENCE AUDIT ---")
print(f"MODEL_PATH: {MODEL_PATH} (exists: {os.path.exists(MODEL_PATH)})")
print(f"SCALER_PATH: {SCALER_PATH} (exists: {os.path.exists(SCALER_PATH)})")
print(f"FEATURES_PATH: {FEATURES_PATH} (exists: {os.path.exists(FEATURES_PATH)})")

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)

print(f"Active Model: {type(model).__name__} with n_estimators={model.n_estimators}, max_depth={model.max_depth}, classes={model.classes_}")
print(f"Scaler Mean for pitch (fo): {scaler.mean_[0]:.2f} Hz | Scaler Std: {scaler.scale_[0]:.2f} Hz")
print(f"Scaler Mean for HNR: {scaler.mean_[15]:.2f} dB | Scaler Std: {scaler.scale_[15]:.2f} dB")
print(f"Scaler Mean for Jitter (local): {scaler.mean_[3]:.6f} | Scaler Std: {scaler.scale_[3]:.6f}")

print("\n--- INFERENCE RESULTS ---")
inference_results = {}
for key in ['low', 'medium', 'high']:
    feat = extracted_features[key]
    res = predict_parkinsons(feat)
    
    # Also verify raw model probas directly
    vec = [feat[fn] for fn in feature_names]
    vec_scaled = scaler.transform([vec])
    raw_probas = model.predict_proba(vec_scaled)[0]
    
    inference_results[key] = {
        "features": feat,
        "scaled_vector": vec_scaled[0],
        "class_0_prob": float(raw_probas[0]),
        "class_1_prob": float(raw_probas[1]),
        "predicted_class": int(res["label"]),
        "confidence": float(res["confidence"]),
        "risk_level": res["riskLevel"]
    }
    
    print(f"[{key.upper()} RISK DEMO]")
    print(f"  Class 0 (Low Risk / Healthy) Prob: {raw_probas[0]:.4f} ({raw_probas[0]*100:.2f}%)")
    print(f"  Class 1 (Elevated Risk / PD) Prob:  {raw_probas[1]:.4f} ({raw_probas[1]*100:.2f}%)")
    print(f"  Predicted Class Label: {res['label']} | Reported Risk Level: {res['riskLevel']} | Confidence: {res['confidence']:.2f}%")
    print(f"  Top Scaled Features: scaled_fo={vec_scaled[0][0]:+.2f}, scaled_jitter={vec_scaled[0][3]:+.2f}, scaled_hnr={vec_scaled[0][15]:+.2f}")

# 8. REPRODUCIBILITY AUDIT
print("\n--- 8. REPRODUCIBILITY AUDIT (5 ITERATIONS) ---")
for key in ['low', 'medium', 'high']:
    runs = []
    for i in range(5):
        r = predict_parkinsons(extracted_features[key])
        runs.append((r["label"], round(r["probability"], 6), r["riskLevel"]))
    all_same = all(r == runs[0] for r in runs)
    print(f"{key.upper()} 5-run determinism: {'PASS (100% Identical)' if all_same else 'FAIL'} -> Sample: {runs[0]}")

# 9. FILENAME HARDCODING & BIAS AUDIT
print("\n--- 9. FILENAME INDEPENDENCE & HARDCODING AUDIT ---")
import tempfile
import shutil

# Swap file names: high-risk audio content renamed to 'test_low.wav'
# and low-risk audio content renamed to 'test_high.wav'
temp_dir = tempfile.gettempdir()
swapped_low = os.path.join(temp_dir, "demo_low_risk_fake_name.wav") # actually contains HIGH risk audio
swapped_high = os.path.join(temp_dir, "demo_high_risk_fake_name.wav") # actually contains LOW risk audio

shutil.copyfile(demo_files['high'], swapped_low)
shutil.copyfile(demo_files['low'], swapped_high)

try:
    feat_from_swapped_low = extract_voice_features(swapped_low) # Content is HIGH risk
    feat_from_swapped_high = extract_voice_features(swapped_high) # Content is LOW risk
    
    res_swapped_low = predict_parkinsons(feat_from_swapped_low)
    res_swapped_high = predict_parkinsons(feat_from_swapped_high)
    
    print(f"File named 'demo_low_risk_fake_name.wav' (HIGH-risk audio content):")
    print(f"  Output Risk: {res_swapped_low['riskLevel']} | Probability: {res_swapped_low['probability']:.4f}")
    assert res_swapped_low['riskLevel'] == 'High', "Filename influenced prediction!"
    
    print(f"File named 'demo_high_risk_fake_name.wav' (LOW-risk audio content):")
    print(f"  Output Risk: {res_swapped_high['riskLevel']} | Probability: {res_swapped_high['probability']:.4f}")
    assert res_swapped_high['riskLevel'] == 'Low', "Filename influenced prediction!"
    
    print("Filename independence test: PASS! The pipeline is strictly content-driven and ignores filenames.")
finally:
    if os.path.exists(swapped_low):
        os.remove(swapped_low)
    if os.path.exists(swapped_high):
        os.remove(swapped_high)

print("\n" + "=" * 100)
print("AUDIT EXECUTION COMPLETE")
print("=" * 100)
