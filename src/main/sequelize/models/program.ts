import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes, Sequelize, NonAttribute, HasOneGetAssociationMixin, HasOneSetAssociationMixin } from '@sequelize/core';
import { DmxMidi } from './dmx_midi';

export class Program extends Model<InferAttributes<Program>, InferCreationAttributes<Program>> {
  declare id: CreationOptional<number>
  declare name: string
  declare bpm: CreationOptional<number>
  declare audio_filename: CreationOptional<string | null>

  async getOrInitDmxMidi() {
    return await DmxMidi.findOne({
      where: {program_id: this.id}
    }) || await DmxMidi.create({
      program_id: this.id,
      midi_patterns: []
    })
  }

  static initModel(sequelize: Sequelize): typeof Program {
    Program.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: new DataTypes.STRING(128),
          allowNull: false,
        },
        bpm: {
          type: DataTypes.INTEGER.UNSIGNED,
          defaultValue: 85,
          allowNull: false,
        },
        audio_filename: {
          type: new DataTypes.STRING(256),
          allowNull: true,
        }
      },
      {
        tableName: 'programs',
        sequelize,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    )

    return Program
  }
}