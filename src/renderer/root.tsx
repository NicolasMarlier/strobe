//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App'
import { DmxButtonsContextProvider } from './contexts/DmxButtonsContext'
import { RealTimeContextProvider } from './contexts/RealTimeContext'
import { DmxMidiContextProvider } from './contexts/DmxMidiContext'
import Welcome from './components/Welcome/Welcome'
import { DmxSceneContextProvider } from './contexts/DmxSceneContext'
import { getShowState } from './ApiClient'

const root = createRoot(document.body)

// Without an open show there is nothing to edit: show the welcome screen instead of the app.
// Opening a show reloads the window, so this only needs checking once.
getShowState().then(({ isOpen, recentShows }) => root.render(
  isOpen
    //<StrictMode>
    ? <DmxSceneContextProvider>
        <DmxButtonsContextProvider>
          <DmxMidiContextProvider>
            <RealTimeContextProvider>
              <App />
            </RealTimeContextProvider>
          </DmxMidiContextProvider>
        </DmxButtonsContextProvider>
      </DmxSceneContextProvider>
    //</StrictMode>,
    : <Welcome recentShows={recentShows} />
)).then(() =>
  // Once it's painted, the window can be shown (it's hidden until then, the splash showing meanwhile)
  requestAnimationFrame(() => requestAnimationFrame(() => window.strobe.api.invoke('app:rendered')))
)
