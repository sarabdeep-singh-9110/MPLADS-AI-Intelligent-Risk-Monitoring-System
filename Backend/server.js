const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health');
const analyticsRoutes = require('./routes/analytics');
const projectRoutes = require('./routes/projects');
const riskRoutes = require('./routes/risk');
const gisRoutes = require('./routes/gis');
const investigationRoutes = require('./routes/investigations');
const aiRoutes = require('./routes/ai');
const expenditureRoutes = require('./routes/expenditures');
const matchRoutes = require('./routes/matches');
const reportRoutes = require('./routes/reports');
const similarRoutes = require('./routes/similar');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: Restrict to known development origins (configurable via env var)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  PROTOTYPE LIMITATION: No production authentication / authorization.    │
// │  The Role Persona system (RoleSelector.jsx) is cosmetic / client-side.  │
// │  Write endpoints (PATCH /api/investigations, /api/matches) are open.    │
// │  For SIH demo purposes only — production deployment requires JWT/       │
// │  session-based auth before any public-facing release.                   │
// │  For Similar Works, status updates and verification requests are open.   │
// └──────────────────────────────────────────────────────────────────────────┘

// Mount modular API routes
app.use('/api/health', healthRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', riskRoutes); // provides /api/states
app.use('/api/gis', gisRoutes);
app.use('/api/investigations', investigationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/expenditures', expenditureRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/similar-works', similarRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`MPLADS Backend REST API Server running on port ${PORT}`);
});
