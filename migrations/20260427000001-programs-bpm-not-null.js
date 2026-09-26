'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'UPDATE programs SET bpm = 85 WHERE bpm IS NULL'
    );
    await queryInterface.changeColumn('programs', 'bpm', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 85,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('programs', 'bpm', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: 85,
    });
  }
};
