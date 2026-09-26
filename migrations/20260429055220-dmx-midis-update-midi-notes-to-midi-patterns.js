'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn('dmx_midis', 'midi_notes', 'midi_patterns');
    await queryInterface.sequelize.query(
      "UPDATE dmx_midis SET midi_patterns = json_array(json_object('ticks', 0, 'midi_notes', midi_patterns, 'durationTicks', 480*120*5))"
    );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn('dmx_midis', 'midi_patterns', 'midi_notes'); 
  }
};
