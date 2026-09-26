import { contextBridge, ipcRenderer } from 'electron';
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

contextBridge.exposeInMainWorld('dmxControl', {
  appName: 'DMX CONTROL',
  version: process.versions.electron,
  api: {
    invoke,
    onMessage
  }
});

declare global {
  interface Window {
    dmxControl: {
      api: {
        invoke: typeof invoke
        onMessage: typeof onMessage
      }
    }
  }
}