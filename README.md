# MPLADS AI

## Intelligent Risk & Monitoring System

An AI-powered platform for monitoring MPLADS projects,
detecting potential irregularities, predicting project risks,
and providing explainable risk-based alerts.

## Problem Statement

SIH26102

Development of an AI-powered system to detect anomalies,
fraud, and inefficiencies in MPLAD Scheme implementation.

## Core Capabilities

- Cost anomaly detection
- Expenditure vs progress analysis
- Project delay prediction
- Potential duplicate work detection
- Payment pattern analysis
- Risk scoring
- Explainable alerts
- Geographic monitoring
- AI-assisted analysis

## Technology Stack

### Frontend
Vite + React 18 SPA

### Backend
Node.js / Express REST API

### ML & AI
- Unsupervised Anomaly Detection: Python / Scikit-learn Isolation Forest
- Explainable Decision Support: Algorithmic Rule Engine + Multivariate Feature Attribution

### Database
SQLite 3

### GIS & Spatial Analytics
- Spatial Hierarchy: State → Parliamentary Constituency → Block → Village
- Visualization: Leaflet + Responsive Regional Heatmaps

## Validation & Consistency Status

✅ **100% Data Consistency Verified** across SQLite Database (`database/mplads_risk.db`), Express Backend REST API, and React Frontend.

For full audit statistics, KPI consistency validation table, and test cases:
- See the [Final Data Consistency & SIH Validation Audit Report](file:///d:/SIH_2026/MPLADS-AI-Intelligent-Risk-Monitoring-System/doc/sih_validation_audit_report.md)

## Status

🚀 Ready for SIH Evaluation / Production Deployment