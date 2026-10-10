FROM python:3.10-slim

WORKDIR /app

# Install system dependencies needed for audio processing and librosa/soundfile/parselmouth
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1 \
    libasound2 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run model mock training script to generate model.pkl & scaler.pkl if they do not exist
RUN python train_mock_model.py

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
