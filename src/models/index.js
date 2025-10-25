'use strict';
const { Sequelize } = require('sequelize');
const config = require('../config/config.js');

const sequelize = new Sequelize(config.url, {
  dialect: 'mysql',
  logging: false,
  dialectOptions: config.dialectOptions || {}
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Country = require('./country')(sequelize, Sequelize);
db.Meta = require('./meta')(sequelize, Sequelize);

module.exports = db;
