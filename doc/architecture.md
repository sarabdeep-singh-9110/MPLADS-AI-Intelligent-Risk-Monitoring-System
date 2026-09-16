# MPLADS AI — System Architecture

## Architecture

MPLADS Data
→ Data Processing (Python Batch Pipeline)
→ SQLite Database
→ Rule Engine + ML (Isolation Forest) + GIS
→ Hybrid Risk Scoring (60% Rule + 40% ML)
→ Backend REST API (Express)
→ React SPA Frontend (Vite)
→ AI Decision Support (Rule Engine + Feature Attribution)

## Components

### Frontend
Vite, React 18, Vanilla CSS, Recharts, Leaflet

### Backend
Node.js / Express REST API

### Database
SQLite 3 (with spatial text-based hierarchy: State → Constituency → Block → Village)

### ML Service
Python Scikit-learn (Offline Batch Isolation Forest Anomaly Detection)

### Pipeline

Data
→ Cleaning
→ Storage
→ Detection
→ Risk Scoring
→ Explainability
→ Visualization
→ Human Verification

## Design Principle

The system identifies potential risks and irregularities.
It does not automatically declare fraud.
Final verification remains with authorized authorities.