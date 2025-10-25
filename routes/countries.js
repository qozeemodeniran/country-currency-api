const express = require('express');
const router = express.Router();
const countriesController = require('../controllers/countries');
const { validateQueryParams } = require('../middleware/validation');

router.post('/refresh', countriesController.refreshCountries);
router.get('/image', countriesController.getCountriesImage);
router.get('/:name', countriesController.getCountryByName);
router.delete('/:name', countriesController.deleteCountry);
router.get('/', validateQueryParams, countriesController.getAllCountries);

module.exports = router;