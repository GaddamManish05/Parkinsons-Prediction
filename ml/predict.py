import joblib
import numpy as np
import os
import time

# Get absolute path to the directory containing this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "features.pkl")

def get_risk_level(prob: float) -> str:
    if prob < 0.35:
        return "Low"
    elif prob < 0.65:
        return "Medium"
    else:
        return "High"

def predict_parkinsons(features_dict: dict):
    """
    Loads classifier model and scaler, scales input features,
    and returns risk prediction results.
    """
    if not (os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH) and os.path.exists(FEATURES_PATH)):
        raise FileNotFoundError("Model, scaler, or feature specification files are missing. Please train a mock model first.")
        
    # Load model artifacts
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    feature_names = joblib.load(FEATURES_PATH)
    
    # Assemble feature vector in the precise order trained
    vector = []
    for name in feature_names:
        if name not in features_dict:
            raise ValueError(f"Required feature '{name}' not found in provided features.")
        vector.append(features_dict[name])
        
    X = np.array([vector])
    
    # Scale features
    X_scaled = scaler.transform(X)
    
    # Predict probabilities
    prob = float(model.predict_proba(X_scaled)[0][1])
    label = int(model.predict(X_scaled)[0])
    
    risk_level = get_risk_level(prob)
    
    # Calculate global Random Forest feature importances if available
    global_importances = {}
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        for idx, name in enumerate(feature_names):
            global_importances[name] = float(importances[idx])

    # Calculate relative deviations strictly using the model's fitted scaler training statistics
    feature_deviations = {}
    if hasattr(scaler, "mean_") and hasattr(scaler, "scale_"):
        for idx, name in enumerate(feature_names):
            val = float(vector[idx])
            mean_val = float(scaler.mean_[idx])
            scale_val = float(scaler.scale_[idx]) if scaler.scale_[idx] > 0 else 1.0
            z_score = (val - mean_val) / scale_val
            feature_deviations[name] = {
                "measured": round(val, 6),
                "scalerMean": round(mean_val, 6),
                "scalerStd": round(scale_val, 6),
                "zScore": round(float(z_score), 4)
            }

    return {
        "label": label,
        "probability": prob,
        "confidence": prob * 100.0,
        "riskLevel": risk_level,
        "modelVersion": "1.0.0",
        "timestamp": float(time.time()),
        "globalFeatureImportances": global_importances,
        "featureDeviations": feature_deviations
    }

