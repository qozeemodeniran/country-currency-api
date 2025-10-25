const express = require('express');
const countryController = require('../controllers/countryController');
const router = express.Router();

router.post('/refresh', countryController.refreshCountries);
router.get('/image', countryController.getSummaryImage);
router.get('/:name', countryController.getCountryByName);
router.delete('/:name', countryController.deleteCountry);
router.get('/', countryController.getCountries);

module.exports = router;