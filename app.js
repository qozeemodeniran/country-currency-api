const express = require('express');
require('dotenv').config();

const database = require('./config/database');
const countriesRoutes = require('./routes/countries');
const statusRoutes = require('./routes/status');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/countries', countriesRoutes);
app.use('/status', statusRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'JawsDB MySQL'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Country Currency & Exchange API',
    version: '1.0.0',
    endpoints: {
      'POST /countries/refresh': 'Refresh country data from external APIs',
      'GET /countries': 'Get all countries with optional filtering',
      'GET /countries/:name': 'Get specific country by name',
      'DELETE /countries/:name': 'Delete country by name',
      'GET /status': 'Get API status and metadata',
      'GET /countries/image': 'Get summary image',
      'GET /health': 'Health check'
    }
  });
});

// 404 handler - MUST return JSON
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

// Error handler - MUST return JSON
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

module.exports = app;