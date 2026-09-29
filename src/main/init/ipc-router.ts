import { BrowserWindow, ipcMain } from 'electron';
import type { ApiContract, Channel } from '../../shared/ipc-contract';
import { TracksController } from '../controllers/tracks.controller';
import { TracksAudioController } from '../controllers/tracks_audio.controller';
import { DmxMidiController } from '../controllers/dmx_midi.controller';
import { DmxButtonController } from '../controllers/dmx_buttons.controller';
import { MainLoopController } from '../controllers/main_loop.controller';
import { ApiReverseContract, ReverseChannel } from '../../shared/ipc-reverse-contract';
import { forgetRecentShow, newShow, openRecentShow, openShow, saveShow, showState } from '../show/document';
import { Store, STORE_EVENTS } from '../store/Store';
import { ShowHistory } from '../store/ShowHistory';
import { revealWindow } from './splash';

export function handle<C extends Channel>(
  channel: C,
  fn: (...args: ApiContract[C]['args']) => Promise<ApiContract[C]['result']>,
) {
  ipcMain.handle(channel, async (event, ...args) => {
    // Middleware could go here: logging, checking event.senderFrame.url, etc.
    return fn(...(args as ApiContract[C]['args']));
  });
}

// Same as handle, for actions that need the calling window (e.g. to attach dialogs to it)
function handleWithWindow<C extends Channel>(
  channel: C,
  fn: (win: BrowserWindow, ...args: ApiContract[C]['args']) => Promise<ApiContract[C]['result']>,
) {
  ipcMain.handle(channel, async (event, ...args) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error(`No window for ${channel}`);
    return fn(win, ...(args as ApiContract[C]['args']));
  });
}

// The equivalent of app.get / app.post
handle('tracks:list',   TracksController.list);
handle('tracks:create', TracksController.create)
handle('tracks:update', TracksController.update)
handle('tracks:destroy', TracksController.destroy)
handle('tracks:select',   TracksController.select)

handle('tracks:audio:upload', TracksAudioController.upload)
handle('tracks:audio:reset', TracksAudioController.reset)
handle('tracks:audio:get', TracksAudioController.getAudio)

handle('tracks:dmx_midi:get', DmxMidiController.get)
handle('tracks:dmx_midi:update', DmxMidiController.update)

handle('dmx_buttons:list', DmxButtonController.list)
handle('dmx_buttons:create', DmxButtonController.create)
handle('dmx_buttons:get', DmxButtonController.get)
handle('dmx_buttons:play', DmxButtonController.play)
handle('dmx_buttons:update', DmxButtonController.update)
handle('dmx_buttons:destroy', DmxButtonController.destroy)


handle('main_loop:update_current_tick', MainLoopController.update_current_tick)

handle('dmx_scene:get', async () => Store.getInstance().getDmxScene())
handle('dmx_scene:update', async (dmxScene) => Store.getInstance().updateDmxScene(dmxScene))

handle('show:state', async () => showState())
handleWithWindow('app:rendered', revealWindow)
handleWithWindow('show:new', newShow)
handleWithWindow('show:open', openShow)
handleWithWindow('show:open_recent', openRecentShow)
handle('show:remove_recent', async (dir) => forgetRecentShow(dir))
handleWithWindow('show:save', saveShow)
// Created now, so it records the show's changes from the start
ShowHistory.getInstance()
handle('show:undo', async () => ShowHistory.getInstance().undo())
handle('show:redo', async () => ShowHistory.getInstance().redo())
Store.getInstance().on(STORE_EVENTS.RESTORED, () => sendToAllWindows('show:restored', null))


export function sendToAllWindows<C extends ReverseChannel>(
  channel: C,
  data: ApiReverseContract[C]['params']
) {
  BrowserWindow.getAllWindows().forEach(window => window.webContents.send(channel, data))
}