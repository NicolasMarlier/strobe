import { app, BrowserWindow } from 'electron';

// The splash stays at least this long, so it doesn't just flash when the app starts quickly
const MIN_SPLASH_MS = 1000
// The app didn't say it rendered (e.g. it failed to): show its window anyway rather than nothing
const REVEAL_TIMEOUT_MS = 10000

// The loader's look (src/index.html): the wordmark with a faint light sweeping across it
const splashHtml = (version: string) => `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      html, body {
        margin: 0;
        height: 100%;
        background-color: #222;
        overflow: hidden;
        user-select: none;
        cursor: default;
        -webkit-app-region: drag;
      }

      .splash {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
      }

      .wordmark {
        font-size: 28px;
        letter-spacing: 10px;
        /* The letter spacing also follows the last letter: offset it so the word itself is centered */
        text-indent: 10px;
        background: linear-gradient(90deg, #444 35%, #999 50%, #444 65%) 0 0 / 250% 100% no-repeat;
        background-color: #444;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: sweep 2s ease-in-out infinite;
      }

      .version {
        font-size: 10px;
        letter-spacing: 2px;
        color: #444;
      }

      @keyframes sweep {
        from {
          background-position: 100% 0;
        }
        70%, to {
          background-position: 0% 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .wordmark {
          animation: none;
          color: #888;
        }
      }
    </style>
  </head>
  <body>
    <div class="splash">
      <div class="wordmark">STROBE</div>
      <div class="version">${version}</div>
    </div>
  </body>
</html>`

let splash: BrowserWindow | undefined
let splashShownAt = 0

// A small frameless window with the app's name, while the main window loads (hidden, see revealWindow)
export const showSplash = () => {
    splash = new BrowserWindow({
        width: 360,
        height: 220,
        frame: false,
        resizable: false,
        movable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        show: false,
        center: true,
        backgroundColor: '#222',
    })
    splash.once('ready-to-show', () => {
        splashShownAt = Date.now()
        splash?.show()
    })
    splash.on('closed', () => { splash = undefined })
    splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml(`v${app.getVersion()}`))}`)
}

// Shows a window created hidden once its app has rendered, closing the splash (after its minimum time)
export const revealWindow = async (win: BrowserWindow) => {
    if (win.isDestroyed() || win.isVisible()) return
    if (splash) {
        const remaining = splashShownAt ? MIN_SPLASH_MS - (Date.now() - splashShownAt) : 0
        if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining))
    }
    if (win.isDestroyed()) return
    win.show()
    splash?.close()
}

// In case the app never says it rendered
export const revealWindowEventually = (win: BrowserWindow) => {
    setTimeout(() => revealWindow(win), REVEAL_TIMEOUT_MS)
}
