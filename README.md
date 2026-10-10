# Parkinson's Risk Prediction Portal 🎙️

A production-ready full-stack MERN application integrated with a Python machine learning microservice to evaluate Parkinson's disease risk from automated voice acoustic analysis.

---

## 🛠️ Technology Stack
* **Frontend**: React (Vite), React Router, Axios, Recharts (Modern charts), HTML5 Canvas Visualizer (Web Audio AnalyserNode), Vanilla CSS.
* **Backend**: Node.js, Express, MongoDB, Mongoose, Multer (audio uploads), JWT, Bcrypt, PDFKit.
* **Python ML Microservice**: FastAPI, Uvicorn, Librosa (sound pre-processing), Parselmouth (Praat wrapping), Scikit-Learn, Joblib.

---

## 🚀 Architectural Flow
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant React as React Client (3000)
    participant Express as Express Server (5000)
    participant FastAPI as FastAPI ML Service (8000)
    database DB as MongoDB

    User->>React: Record live voice (or upload wav/mp3)
    React->>Express: POST /api/predictions/upload (multipart form-data + JWT)
    Note over Express: Saves temporary file in server/uploads/
    Express->>FastAPI: POST /predict (file forwarding via HTTP)
    Note over FastAPI: Resamples to 16kHz mono, trims silences<br/>Runs Praat extractors: Jitter, Shimmer, HNR, NHR, F0<br/>Loads model.pkl + scales & classifies risk
    FastAPI-->>Express: Returns JSON (Acoustic Features + Risk Level + Confidence)
    Note over Express: Unlinks local temp uploads, saves Prediction Document to DB
    Express-->>React: Returns saved Prediction record JSON
    React->>User: Displays classification outcome, gauges & recommends clinical follow-up
    User->>React: Click "Download PDF Report"
    React->>Express: GET /api/predictions/:id/report
    Express->>Express: Renders custom PDF (PDFKit)
    Express-->>User: Streams PDF attachment download
```

---

## 📂 Project Directory Structure

```text
parkinson/
├── docker-compose.yml       # Orchestrates multi-container services
├── README.md                # Setup and deployment documentation
├── ml/                      # Python ML Service
│   ├── app.py               # FastAPI router and endpoints
│   ├── extract_features.py  # Librosa & Parselmouth acoustic extractors
│   ├── predict.py           # Classifier loader and scaler predictor
│   ├── train_mock_model.py  # Serializes base classifier and scaler
│   ├── requirements.txt     # Python environment requirements
│   └── Dockerfile
├── server/                  # Node.js Express Backend
│   ├── server.js            # App starter and MongoDB connector
│   ├── package.json
│   ├── .env.example
│   ├── config/              # Server configuration settings
│   ├── models/              # Mongoose schemas (User, Prediction)
│   ├── middleware/          # JWT protection and Multer settings
│   ├── controllers/         # Core API logic
│   ├── routes/              # Express Router mapping
│   ├── utils/               # PDF generator helper
│   ├── uploads/             # Stores uploaded audio files
│   └── Dockerfile
└── client/                  # React Frontend
    ├── index.html
    ├── package.json
    ├── vite.config.js       # Sets up local dev server and proxies
    ├── Dockerfile
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css        # Visual styles, vars, animations
        ├── services/        # Axios API instances
        ├── context/         # AuthProvider and session states
        ├── components/      # Common components (Recorder, Charts, Tables)
        └── pages/           # Page routes (Dashboard, Result, History)
```

---

## ⚡ Quick Start Instructions

### Option A: Run via Docker Compose (Recommended)
Make sure you have Docker Desktop running, then execute the following command in the root folder:

```bash
docker-compose up --build
```

* **Frontend Portal**: `http://localhost:3000`
* **Express Server API**: `http://localhost:5000`
* **FastAPI Docs**: `http://localhost:8000/docs`

---

### Option B: Local Manual Setup (Without Docker)

#### Prerequisites
1. **Node.js** (v18+)
2. **Python** (v3.9 or v3.10)
3. **MongoDB** instance running locally (`mongodb://127.0.0.1:27017/parkinson`)

#### Step 1: Start Python ML Microservice
```bash
cd ml
pip install -r requirements.txt
python train_mock_model.py
python app.py
```
*FastAPI microservice running on `http://localhost:8000`*

#### Step 2: Start Express Backend
1. Copy `.env.example` to `.env` inside the `server/` directory and configure variables.
2. Install packages and boot the server:
```bash
cd server
npm install
npm run dev
```
*Express backend running on `http://localhost:5000`*

#### Step 3: Start React client
```bash
cd client
npm install
npm run dev
```
*React Vite dev server running on `http://localhost:3000`*

---

## 🧪 Automated Testing & Quality Assurance

### Run Machine Learning Microservice Tests (Python / Pytest)
```bash
cd ml
python -m pytest test_ml_service.py
```

### Run Express Backend Tests (Node.js Test Runner)
```bash
cd server
npm test
```

### Build React Frontend Production Bundle
```bash
cd client
npm run build
```

---

## 🧠 Explainable AI (XAI) & Model Metrics

The microservice expects a serialized Random Forest classifier `model.pkl`, feature scaler `scaler.pkl`, and feature name list `features.pkl` in the `ml/` directory.

The system returns two additive Explainable AI structures:
1. **Global Feature Importances (`globalFeatureImportances`)**: Derived directly from `model.feature_importances_`, representing overall feature weights learned during training.
2. **Scaler Baseline Relative Deviations (`featureDeviations`)**: Calculated strictly against `scaler.mean_` and `scaler.scale_` (training statistics) as relative Z-scores `Z = (x - mean) / std`. These are labeled strictly as statistical relative positions against model training statistics, **not causal explanations or clinical diagnoses**.

---

## 🔒 Security & PII Privacy Guidelines

* **Voice Sample Storage**: Stored voice recordings are treated as Personally Identifiable Information (PII). Temporary processing files are unlinked in `finally` blocks on both success and error paths. Recordings retained for user playback are stored securely under `server/uploads/`.
* **Route Authentication & Ownership**: All assessment uploads, statistics queries, profile updates, and PDF report downloads enforce JWT Bearer authentication and strict prediction ownership checks (`prediction.user == req.user.id` or admin role).
* **Experimental Screening Notice**: The system is designed as an experimental research aid based on benchmark acoustic metrics and is **not a certified medical diagnostic tool**.

