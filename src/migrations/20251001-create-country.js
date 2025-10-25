'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('countries', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      capital: { type: Sequelize.STRING },
      region: { type: Sequelize.STRING },
      population: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      currency_code: { type: Sequelize.STRING(10) },
      exchange_rate: { type: Sequelize.DOUBLE },
      estimated_gdp: { type: Sequelize.DOUBLE, defaultValue: 0 },
      flag_url: { type: Sequelize.STRING },
      last_refreshed_at: { type: Sequelize.DATE },
    });
    await queryInterface.addIndex('countries', ['name']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('countries');
  }
};
