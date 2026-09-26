import {
  Model,
  DataTypes,
  Sequelize,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from "@sequelize/core"

export class DmxMidi extends Model<InferAttributes<DmxMidi>, InferCreationAttributes<DmxMidi>> {
  declare id: CreationOptional<string>
  declare program_id: number
  declare midi_patterns: MidiPattern[]
  
  static initModel(sequelize: Sequelize): typeof DmxMidi {
    DmxMidi.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
        },

        program_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },

        midi_patterns: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
        },
      },
      {
        sequelize,
        tableName: "dmx_midis",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      }
    );

    return DmxMidi;
  }   
}