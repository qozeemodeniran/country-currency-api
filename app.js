const express = require('express');
const cors = require('cors');
const countriesRouter = require('./routes/countries');
const statusRouter = require('./routes/status');
const errorHandler = require('./middleware/errorHandler');
const { initDB } = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/countries', countriesRouter);
app.use('/status', statusRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Initialize database
initDB().catch(console.error);

module.exports = app;