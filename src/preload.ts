import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { ApiContract, Channel } from './shared/ipc-contract';
import { ApiReverseContract, ReverseChannel } from './shared/ipc-reverse-contract';


const invoke = <C extends Channel>(channel: C, ...args: ApiContract[C]['args']) =>
  ipcRenderer.invoke(channel, ...args) as Promise<ApiContract[C]['result']>;

// Returns a function that removes the listener
const onMessage = <C extends ReverseChannel>(channel: C, callback: (params: ApiReverseContract[C]['params']) => void) => {
  const listener = (_event: Electron.IpcRendererEvent, args: ApiReverseContract[C]['params']) => callback(args);
  ipcRenderer.on(channel, listener);
  return () => { ipcRenderer.removeListener(channel, listener) };
};

contextBridge.exposeInMainWorld('strobe', {
  appName: 'STROBE',
  version: process.versions.electron,
  // A dropped file's path on disk, which the window can't read by itself
  pathForFile: (file: File) => webUtils.getPathForFile(file),
  api: {
    invoke,
    onMessage
  }
});

declare global {
  interface Window {
    strobe: {
      pathForFile: (file: File) => string
      api: {
        invoke: typeof invoke
        onMessage: typeof onMessage
      }
    }
  }
}