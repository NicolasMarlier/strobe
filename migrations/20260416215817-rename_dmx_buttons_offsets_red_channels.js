'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn('dmx_buttons', 'offsets', 'red_channels')
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn('dmx_buttons', 'red_channels', 'offsets')
  }
};
