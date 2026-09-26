'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('programs', 'bpm', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn('programs', 'bpm');
  }
};
