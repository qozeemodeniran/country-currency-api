// src/routes/countries.js
const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');

// POST /countries/refresh - Refresh countries data
router.post('/refresh', countryController.refreshCountries);

// GET /countries - Get all countries with filtering and sorting
router.get('/', countryController.getCountries);

// GET /countries/:name - Get single country by name
router.get('/:name', countryController.getCountryByName);

// DELETE /countries/:name - Delete country by name
router.delete('/:name', countryController.deleteCountry);

// GET /countries/image - Get summary image
router.get('/image/generate', countryController.getSummaryImage);

// TEST endpoint for Cloudinary
router.get('/test/cloudinary', countryController.testCloudinary);

module.exports = router;