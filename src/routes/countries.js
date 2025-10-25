const express = require('express');
const router = express.Router();
const controller = require('../controllers/countriesController');
const { body } = require('express-validator');

// Refresh
router.post('/refresh', controller.refresh);

// List with filters
router.get('/', controller.listCountries);

// Single by name
router.get('/:name', controller.getCountry);

// Delete
router.delete('/:name', controller.deleteCountry);

// Image
router.get('/image', controller.serveImage);

// Status endpoint (root path /status will be set in app)
module.exports = router;
