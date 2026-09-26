import {
  Model,
  DataTypes,
  Sequelize,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from "@sequelize/core"


export class DmxButton extends Model<InferAttributes<DmxButton>, InferCreationAttributes<DmxButton>> {
  declare id: CreationOptional<string>
  declare program_id: number | null
  declare color: string
  declare duration_ms: number
  declare red_channels: number[]
  declare nature: DmxEffectNature
  declare triggering_midi_key: MidiKey | null

  static initModel(sequelize: Sequelize): typeof DmxButton {
    DmxButton.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
        },

        program_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },

        color: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "#ffffff",
        },

        duration_ms: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 500,
        },

        red_channels: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [1, 5, 7],
        },

        nature: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'Set'
        },

        triggering_midi_key: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "dmx_buttons",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      }
    );

    return DmxButton;
  }
}

