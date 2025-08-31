// Lightweight Express server scaffold for local API on port 8080
// Run locally (example):
//   npm install express
//   node backend/server_backend.js
//
// This wires up route stubs for each microservice with the same paths
// your frontend expects (see src/services/api_backend.ts).

const express = require('express');

const app = express();

// Basic CORS (match Supabase edge function defaults)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

// Routers (service stubs)
app.use('/auth-service', require('./auth-service_backend'));
app.use('/projects-service', require('./projects-service_backend'));
app.use('/access-service', require('./access-service_backend'));
app.use('/capacity-service', require('./capacity-service_backend'));
app.use('/retro-service', require('./retro-service_backend'));
app.use('/roadmap-service', require('./roadmap-service_backend'));
app.use('/backlog-service', require('./backlog-service_backend'));
app.use('/stakeholder-service', require('./stakeholder-service_backend'));
app.use('/audit-service', require('./audit-service_backend'));
app.use('/workspace-service', require('./workspace-service_backend'));
app.use('/wizard-service', require('./wizard-service_backend'));
app.use('/department-service', require('./department-service_backend'));

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Local API server listening on http://localhost:${PORT}`);
});
