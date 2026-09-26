import { BrowserWindow, ipcMain } from 'electron';
import type { ApiContract, Channel } from '../../shared/ipc-contract';
import { ProgramsController } from '../controllers/programs.controller';
import { ProgramsAudioController } from '../controllers/programs_audio.controller';
import { DmxMidiController } from '../controllers/dmx_midi.controller';
import { DmxButtonController } from '../controllers/dmx_buttons.controller';
import { MainLoopController } from '../controllers/main_loop.controller';
import { ApiReverseContract, ReverseChannel } from '../../shared/ipc-reverse-contract';

export function handle<C extends Channel>(
  channel: C,
  fn: (...args: ApiContract[C]['args']) => Promise<ApiContract[C]['result']>,
) {
  ipcMain.handle(channel, async (event, ...args) => {
    // Middleware possible ici : log, vérification de event.senderFrame.url, etc.
    return fn(...(args as ApiContract[C]['args']));
  });
}

// L'équivalent de app.get / app.post
handle('programs:list',   ProgramsController.list);
handle('programs:create', ProgramsController.create)
handle('programs:update', ProgramsController.update)
handle('programs:destroy', ProgramsController.destroy)
handle('programs:select',   ProgramsController.select)

handle('programs:audio:upload', ProgramsAudioController.upload)
handle('programs:audio:reset', ProgramsAudioController.reset)
handle('programs:audio:get', ProgramsAudioController.getAudio)

handle('programs:dmx_midi:get', DmxMidiController.get)
handle('programs:dmx_midi:update', DmxMidiController.update)

handle('dmx_buttons:list', DmxButtonController.list)
handle('dmx_buttons:create', DmxButtonController.create)
handle('dmx_buttons:get', DmxButtonController.get)
handle('dmx_buttons:play', DmxButtonController.play)
handle('dmx_buttons:update', DmxButtonController.update)
handle('dmx_buttons:destroy', DmxButtonController.destroy)


handle('main_loop:update_current_tick', MainLoopController.update_current_tick)


export function sendToAllWindows<C extends ReverseChannel>(
  channel: C,
  data: ApiReverseContract[C]['params']
) {
  BrowserWindow.getAllWindows().forEach(window => window.webContents.send(channel, data))
}