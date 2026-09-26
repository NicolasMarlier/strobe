'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('programs', 'midi_filename')
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('programs', 'midi_filename', { type: Sequelize.STRING })
  }
};
