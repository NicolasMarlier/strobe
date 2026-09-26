import { Sequelize } from '@sequelize/core';
import { SqliteDialect } from '@sequelize/sqlite3';

import { DmxButton } from "./models/dmx_button";
import { DmxMidi } from "./models/dmx_midi";
import { Program } from "./models/program";


export const initSequelize = () => {
    const sequelize = new Sequelize({
        dialect: SqliteDialect,
        storage: 'main.sqlite'
    });

    Program.initModel(sequelize)
    DmxButton.initModel(sequelize)
    DmxMidi.initModel(sequelize)

    Program.hasMany(DmxButton, { foreignKey: 'program_id' })
    DmxButton.belongsTo(Program, { foreignKey: 'program_id' })

    Program.hasOne(DmxButton, { foreignKey: 'program_id' })
    DmxMidi.belongsTo(Program, { foreignKey: 'program_id' })

    return sequelize;
}
