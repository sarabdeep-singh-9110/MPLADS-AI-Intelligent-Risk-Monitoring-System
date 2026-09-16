3.3 Six Team Members

Since there are six of you, I'd divide the project like this.

👤 Member 1 — Team Lead / Integration

This should be you, assuming you want to coordinate the project.

Responsibilities:

Overall architecture
Integration
Project coordination
Backend/frontend integration
Testing
Final demo

You should not become the person doing 100% of the work.

Your job is to make sure everyone's work eventually connects.

👤 Member 2 — Data Engineer

Responsible for:

MPLADS dataset
Data cleaning
Data validation
Data transformation
Feature preparation

Main folder:

data/

and:

ml-service/data/

Their primary output:

raw dataset
      ↓
clean dataset
      ↓
ML-ready dataset
👤 Member 3 — ML Engineer

Responsible for:

Anomaly detection
Cost analysis
Delay prediction
Risk calculations
Model evaluation

Main folder:

ml-service/

Models eventually:

ml-service/
│
├── models/
│   ├── anomaly/
│   ├── delay/
│   └── duplicate/
│
├── preprocessing/
├── training/
├── prediction/
└── api/
👤 Member 4 — Backend + Database

Responsible for:

PostgreSQL
Database schema
Backend APIs
Authentication
ML API integration

Main folders:

backend/
database/

Architecture:

Frontend
    ↓
Backend API
    ↓
SQLite
    ↓
ML Service
👤 Member 5 — Frontend

Responsible for:

Vite + React
Dashboard
Project pages
Risk pages
Charts
Tables
UI

Main folder:

frontend/

Eventually:

frontend/
│
├── app/
├── components/
├── lib/
├── hooks/
└── public/
👤 Member 6 — GIS + AI

This person handles two related things.

GIS
India map
State map
District map
Project locations
Geographic duplicate detection
AI
AI assistant
Risk explanation
Natural language queries
Report generation

Main responsibility:

GIS + AI layer