const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const countryRouter = require('./routes/countries');
const db = require('./models');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// routes
// status
const controllers = require('./controllers/countriesController');

// Serve image route specifically at /countries/image (we add route manually before /countries/:name)
app.get('/countries/image', controllers.serveImage);

// Countries refresh and list and others
app.post('/countries/refresh', controllers.refresh);
app.get('/countries', controllers.listCountries);
app.get('/countries/:name', controllers.getCountry);
app.delete('/countries/:name', controllers.deleteCountry);

// status
app.get('/status', controllers.status);

// health
app.get('/', (req, res) => res.json({ uptime: process.uptime() }));

// error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
