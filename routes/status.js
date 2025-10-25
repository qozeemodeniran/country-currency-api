const express = require('express');
const statusController = require('../controllers/statusController');
const router = express.Router();

router.get('/', statusController.getStatus);

module.exports = router;