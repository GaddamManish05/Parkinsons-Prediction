import os
import shutil
import tempfile
import time
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from extract_features import extract_voice_features
from predict import predict_parkinsons

app = FastAPI(title="Parkinson's Risk Prediction ML Service", version="1.0.0")

# Enable CORS for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "healthy", "service": "parkinson-ml-service"}

@app.post("/predict")
async def predict_voice(file: UploadFile = File(...)):
    start_time = time.time()
    
    # Check file extensions
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".wav", ".mp3", ".webm", ".ogg"]:
        raise HTTPException(status_code=400, detail="Invalid audio format. Only WAV, MP3, WEBM, and OGG are supported.")
        
    # Save the uploaded file to a collision-free temporary file
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, f"upload_{int(time.time())}_{uuid.uuid4().hex}{ext}")
    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract features
        features = extract_voice_features(temp_file_path)
        
        # Run prediction
        result = predict_parkinsons(features)
        
        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return {
            "features": features,
            "label": result["label"],
            "probability": result["probability"],
            "confidence": result["confidence"],
            "riskLevel": result["riskLevel"],
            "modelVersion": result["modelVersion"],
            "globalFeatureImportances": result.get("globalFeatureImportances", {}),
            "featureDeviations": result.get("featureDeviations", {}),
            "timeMs": processing_time_ms
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

        
    finally:
        # Cleanup temporary files
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/extract_features")
async def extract_features_only(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".wav", ".mp3", ".webm", ".ogg"]:
        raise HTTPException(status_code=400, detail="Invalid audio format. Only WAV and MP3 are supported.")
        
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, f"extract_{int(time.time())}_{uuid.uuid4().hex}{ext}")
    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        features = extract_voice_features(temp_file_path)
        return {"features": features}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature extraction error: {str(e)}")
        
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
