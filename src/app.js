// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import configs to initialize them
require('./config/database');
require('./config/cloudinary');

const countryRoutes = require('./routes/countries');
const statusRoutes = require('./routes/status');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/countries', countryRoutes);
app.use('/status', statusRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Country Currency & Exchange API', 
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      refresh: 'POST /countries/refresh',
      get_countries: 'GET /countries',
      get_country: 'GET /countries/:name',
      delete_country: 'DELETE /countries/:name',
      get_image: 'GET /countries/image/generate',
      get_status: 'GET /status',
      test_cloudinary: 'GET /countries/test/cloudinary'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;