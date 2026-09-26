'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("dmx_buttons", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
      },

      program_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "programs",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      color: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      offsets: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },

      nature: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      signal: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("dmx_buttons");
  }
};
