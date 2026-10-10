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
