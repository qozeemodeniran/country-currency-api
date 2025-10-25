'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meta', {
      key: { type: Sequelize.STRING, primaryKey: true },
      value: { type: Sequelize.TEXT }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('meta');
  }
};
