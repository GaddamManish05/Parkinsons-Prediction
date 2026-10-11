import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os

def train_mock_model():
    """
    Trains and saves a calibrated mock machine-learning model and scaler
    for Parkinson's Disease risk screening demonstration.
    
    CRITICAL MEDICAL & SCIENTIFIC DISCLAIMER:
    This model is calibrated on synthetic acoustic distributions representative
    of vocal perturbation metrics for demonstration and testing purposes.
    It is NOT a certified medical device and should NOT be used for clinical diagnosis.
    Genuine diagnostic validity requires retraining on validated clinical cohorts
    (such as the Oxford Parkinson's Disease Telemonitoring Dataset / Little et al.,
    mPower, PPMI, or UCI Parkinson's datasets).
    """
    print("Generating calibrated acoustic distribution data for mock model training...")
    np.random.seed(42)
    
    # 22 features matching standard MDVP voice acoustic metrics
    feature_names = [
        "fo", "fhi", "flo",
        "jitter_local", "jitter_abs", "jitter_rap", "jitter_ppq5", "jitter_ddp",
        "shimmer_local", "shimmer_db", "shimmer_apq3", "shimmer_apq5", "shimmer_apq11", "shimmer_dda",
        "nhr", "hnr",
        "dfa", "rpde", "ppe", "spread1", "spread2", "d2"
    ]
    
    n_samples = 3000
    
    # Latent vocal dysphonia / perturbation severity: s in [0, 1]
    # s ~ 0.0 indicates pristine, highly stable vocal tract (healthy)
    # s ~ 0.5 indicates moderate micro-tremor and mild dysphonia
    # s ~ 1.0 indicates elevated vocal perturbation and dysphonia
    s = np.random.uniform(0.0, 1.0, n_samples)
    
    # Fundamental frequency (Hz): healthy and pathological speech exhibit overlapping pitch distributions
    fo = np.random.normal(155.0, 20.0, n_samples)
    fo = np.clip(fo, 95.0, 250.0)
    fhi = fo * (1.0 + np.abs(np.random.normal(0.03, 0.015, n_samples)))
    flo = fo * (1.0 - np.abs(np.random.normal(0.03, 0.015, n_samples)))
    
    # Jitter metrics: pitch period perturbation increases with vocal tremor
    jitter_local = 0.00010 + 0.0031 * (s ** 1.0) + np.random.normal(0.0, 0.00015, n_samples)
    jitter_local = np.clip(jitter_local, 0.00005, 0.020)
    jitter_abs = jitter_local / fo
    jitter_rap = jitter_local * 0.58
    jitter_ppq5 = jitter_local * 0.61
    jitter_ddp = jitter_rap * 3.0
    
    # Shimmer metrics: amplitude perturbation increases with vocal instability
    shimmer_local = 0.0050 + 0.018 * (s ** 1.0) + np.random.normal(0.0, 0.0008, n_samples)
    shimmer_local = np.clip(shimmer_local, 0.002, 0.100)
    shimmer_db = shimmer_local * 9.8
    shimmer_apq3 = shimmer_local * 0.42
    shimmer_apq5 = shimmer_local * 0.48
    shimmer_apq11 = shimmer_local * 0.64
    shimmer_dda = shimmer_apq3 * 3.0
    
    # Harmonics and Noise metrics: healthy voices have high HNR (>30 dB); dysphonia degrades HNR (<20 dB)
    hnr = 43.0 - 25.0 * s + np.random.normal(0.0, 1.2, n_samples)
    hnr = np.clip(hnr, 10.0, 50.0)
    nhr = 10.0 ** (-hnr / 10.0)
    
    # Nonlinear dynamics approximations
    dfa = 0.55 + 0.001 * s + np.random.normal(0.0, 0.0002, n_samples)
    rpde = 0.40 + 0.12 * s + np.random.normal(0.0, 0.01, n_samples)
    ppe = 0.0001 + 0.0030 * (s ** 1.1) + np.abs(np.random.normal(0.0, 0.0002, n_samples))
    spread1 = -6.0 + 0.03 * s + np.random.normal(0.0, 0.005, n_samples)
    spread2 = 0.20 + 0.001 * s + np.random.normal(0.0, 0.0002, n_samples)
    d2 = 2.10 + 0.01 * s + np.random.normal(0.0, 0.002, n_samples)
    
    X = np.column_stack([
        fo, fhi, flo,
        jitter_local, jitter_abs, jitter_rap, jitter_ppq5, jitter_ddp,
        shimmer_local, shimmer_db, shimmer_apq3, shimmer_apq5, shimmer_apq11, shimmer_dda,
        nhr, hnr,
        dfa, rpde, ppe, spread1, spread2, d2
    ])
    
    # Binary target y sampled with P(y=1|s) = s ensures the Random Forest class probability estimates s
    p_y = np.clip(s, 0.02, 0.98)
    y = (np.random.uniform(0.0, 1.0, n_samples) < p_y).astype(int)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train Random Forest ensemble
    model = RandomForestClassifier(n_estimators=100, max_depth=6, min_samples_leaf=20, random_state=42)
    model.fit(X_scaled, y)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "model.pkl")
    scaler_path = os.path.join(base_dir, "scaler.pkl")
    features_path = os.path.join(base_dir, "features.pkl")
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    joblib.dump(feature_names, features_path)
    print(f"Calibrated mock model, scaler, and features saved successfully to {base_dir}!")
    
    # Synchronize duplicate subdirectory if present
    sub_dir = os.path.join(base_dir, "ml")
    if os.path.isdir(sub_dir):
        joblib.dump(model, os.path.join(sub_dir, "model.pkl"))
        joblib.dump(scaler, os.path.join(sub_dir, "scaler.pkl"))
        joblib.dump(feature_names, os.path.join(sub_dir, "features.pkl"))
        print(f"Synchronized artifacts to {sub_dir}!")

if __name__ == "__main__":
    train_mock_model()
