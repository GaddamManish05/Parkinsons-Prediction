import pytest
from fastapi.testclient import TestClient
import os
import numpy as np
import soundfile as sf
import tempfile
from app import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "parkinson-ml-service"}

def test_invalid_file_extension():
    files = {"file": ("test.txt", b"invalid content", "text/plain")}
    response = client.post("/predict", files=files)
    assert response.status_code == 400
    assert "Invalid audio format" in response.json()["detail"]

def test_short_audio_rejection():
    # Create a 0.5s audio file
    sample_rate = 16000
    t = np.linspace(0, 0.5, int(sample_rate * 0.5))
    audio_data = 0.5 * np.sin(2 * np.pi * 440 * t)
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, audio_data, sample_rate)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            response = client.post("/predict", files={"file": ("short.wav", f, "audio/wav")})
        assert response.status_code == 400
        assert "too short" in response.json()["detail"].lower()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_valid_audio_prediction_and_xai():
    # Create a valid 3-second synthetic voice wave (440Hz tone with noise)
    sample_rate = 16000
    t = np.linspace(0, 3.0, int(sample_rate * 3.0))
    audio_data = 0.4 * np.sin(2 * np.pi * 220 * t) + 0.05 * np.random.normal(0, 1, len(t))
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, audio_data, sample_rate)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            response = client.post("/predict", files={"file": ("sample.wav", f, "audio/wav")})
        assert response.status_code == 200
        data = response.json()
        assert "label" in data
        assert "riskLevel" in data
        assert "confidence" in data
        assert "features" in data
        assert "globalFeatureImportances" in data
        assert "featureDeviations" in data
        assert "fo" in data["globalFeatureImportances"]
        assert "fo" in data["featureDeviations"]
        assert "zScore" in data["featureDeviations"]["fo"]
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_differentiated_predictions_for_varying_acoustics():
    """
    Verifies that samples with varying degrees of acoustic perturbation
    produce differentiated probability scores and risk levels.
    """
    sample_rate = 16000
    t = np.linspace(0, 3.0, int(sample_rate * 3.0))
    
    # 1. Clean, stable tone with negligible noise (simulating low risk)
    clean_audio = 0.5 * np.sin(2 * np.pi * 150.0 * t)
    
    # 2. Dysphonic, noisy tone with frequency modulation jitter and amplitude flutter (simulating high risk)
    # Pitch flutter: 150Hz modulated by 10Hz tremor
    jitter_phase = 2 * np.pi * 150.0 * t + 0.3 * np.sin(2 * np.pi * 10.0 * t)
    # Amplitude flutter: modulated envelope
    flutter_env = 0.35 + 0.15 * np.sin(2 * np.pi * 8.0 * t)
    noisy_audio = flutter_env * np.sin(jitter_phase) + 0.12 * np.random.normal(0, 1, len(t))
    
    clean_tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    noisy_tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    
    try:
        sf.write(clean_tmp.name, clean_audio, sample_rate)
        clean_tmp.close()
        sf.write(noisy_tmp.name, noisy_audio, sample_rate)
        noisy_tmp.close()
        
        with open(clean_tmp.name, "rb") as f_clean:
            res_clean = client.post("/predict", files={"file": ("clean.wav", f_clean, "audio/wav")})
            
        with open(noisy_tmp.name, "rb") as f_noisy:
            res_noisy = client.post("/predict", files={"file": ("noisy.wav", f_noisy, "audio/wav")})
            
        assert res_clean.status_code == 200
        assert res_noisy.status_code == 200
        
        data_clean = res_clean.json()
        data_noisy = res_noisy.json()
        
        # Verify probabilities are meaningfully different (not frozen or saturated)
        prob_diff = abs(data_noisy["probability"] - data_clean["probability"])
        assert prob_diff > 0.20, f"Expected probability differentiation > 0.20, got {prob_diff}"
        assert data_clean["probability"] < data_noisy["probability"], "Clean audio should have lower risk probability than noisy dysphonic audio"
        
    finally:
        if os.path.exists(clean_tmp.name):
            os.remove(clean_tmp.name)
        if os.path.exists(noisy_tmp.name):
            os.remove(noisy_tmp.name)

