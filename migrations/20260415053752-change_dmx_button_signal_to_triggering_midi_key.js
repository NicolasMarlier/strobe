'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('dmx_buttons', 'triggering_midi_key', {
      type: Sequelize.INTEGER,
      allowNull: true,
    })
    await queryInterface.removeColumn('dmx_buttons', 'signal')
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('dmx_buttons', 'signal', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.removeColumn('dmx_buttons', 'triggering_midi_key')
  }
};
