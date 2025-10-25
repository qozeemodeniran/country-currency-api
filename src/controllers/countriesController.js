const db = require('../models');
const { runRefresh } = require('../services/refreshService');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

async function refresh(req, res) {
  try {
    const result = await runRefresh();
    return res.json({ total_countries: result.total, last_refreshed_at: result.last_refreshed_at });
  } catch (err) {
    if (err.kind === 'external' || (err.message && (err.message.includes('Countries API') || err.message.includes('Exchange API')))) {
      return res.status(503).json({ error: 'External data source unavailable', details: err.message || err });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function listCountries(req, res) {
  try {
    const where = {};
    const { region, currency, sort } = req.query;
    if (region) where.region = region;
    if (currency) where.currency_code = currency;

    const order = [];
    if (sort === 'gdp_desc') order.push(['estimated_gdp', 'DESC']);
    else if (sort === 'gdp_asc') order.push(['estimated_gdp', 'ASC']);

    const countries = await db.Country.findAll({ where, order });
    return res.json(countries);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCountry(req, res) {
  try {
    const name = req.params.name;
    const c = await db.Country.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('lower', db.sequelize.col('name')),
        db.sequelize.fn('lower', name)
      )
    });
    if (!c) return res.status(404).json({ error: 'Country not found' });
    return res.json(c);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteCountry(req, res) {
  try {
    const name = req.params.name;
    const c = await db.Country.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('lower', db.sequelize.col('name')),
        db.sequelize.fn('lower', name)
      )
    });
    if (!c) return res.status(404).json({ error: 'Country not found' });
    await c.destroy();
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function status(req, res) {
  try {
    const total = await db.Country.count();
    const meta = await db.Meta.findByPk('last_refreshed_at');
    return res.json({
      total_countries: total,
      last_refreshed_at: meta ? meta.value : null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function serveImage(req, res) {
  try {
    const imagePath = path.join(__dirname, '..', 'cache', 'summary.png');
    if (!fs.existsSync(imagePath)) return res.status(404).json({ error: 'Summary image not found' });
    res.sendFile(imagePath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { refresh, listCountries, getCountry, deleteCountry, status, serveImage };
