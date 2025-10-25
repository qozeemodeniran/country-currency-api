// src/routes/status.js
const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');

// GET /status - Get API status
router.get('/', statusController.getStatus);

module.exports = router;