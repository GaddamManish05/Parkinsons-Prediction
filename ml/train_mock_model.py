import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os

def train_mock_model():
    print("Generating synthetic data for model training...")
    np.random.seed(42)
    
    # 22 features matching standard voice acoustic metrics
    feature_names = [
        "fo", "fhi", "flo",
        "jitter_local", "jitter_abs", "jitter_rap", "jitter_ppq5", "jitter_ddp",
        "shimmer_local", "shimmer_db", "shimmer_apq3", "shimmer_apq5", "shimmer_apq11", "shimmer_dda",
        "nhr", "hnr",
        "dfa", "rpde", "ppe", "spread1", "spread2", "d2"
    ]
    
    n_samples = 200
    X = np.random.randn(n_samples, len(feature_names))
    y = (X[:, 0] * 1.5 - X[:, 3] * 1.2 + X[:, 14] * 0.8 + np.random.randn(n_samples) > 0.5).astype(int)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X_scaled, y)
    
    # Save directly to the directory containing this script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "model.pkl")
    scaler_path = os.path.join(base_dir, "scaler.pkl")
    features_path = os.path.join(base_dir, "features.pkl")
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    joblib.dump(feature_names, features_path)
    
    print(f"Mock model and scaler saved successfully to {base_dir}!")

if __name__ == "__main__":
    train_mock_model()
