const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Service routes
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
app.use('/department-service', require('./department-service_backend_fixed'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});