/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import { init as initCrashReports } from '@sentry/electron/renderer';

// The window's crashes, sent through the main process, which sorts and sends them (see src/main/crash_reports.ts).
// Only when it reports them: then it has given the window a way to pass them on
if ((window as { __SENTRY_IPC__?: unknown }).__SENTRY_IPC__) initCrashReports();

// A file dropped where nothing takes it would replace the whole window with it: refused instead.
// The track's audio lane takes audio files (see TrackEditor)
window.addEventListener('dragover', (e) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'
})
window.addEventListener('drop', (e) => e.preventDefault())

import './renderer/root';