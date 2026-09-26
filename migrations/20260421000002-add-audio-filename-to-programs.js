'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('programs', 'audio_filename', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn('programs', 'audio_filename');
  }
};
