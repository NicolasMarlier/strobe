//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App'
import { DmxButtonsContextProvider } from './contexts/DmxButtonsContext'
import { RealTimeContextProvider } from './contexts/RealTimeContext'
import { DmxMidiContextProvider } from './contexts/DmxMidiContext'
import Welcome from './components/Welcome/Welcome'
import { getShowState } from './ApiClient'

const root = createRoot(document.body)

// Without an open show there is nothing to edit: show the welcome screen instead of the app.
// Opening a show reloads the window, so this only needs checking once.
getShowState().then(({ isOpen, recentShows }) => root.render(
  isOpen
    //<StrictMode>
    ? <DmxButtonsContextProvider>
        <DmxMidiContextProvider>
          <RealTimeContextProvider>
            <App /> 
            YO 
          </RealTimeContextProvider>
        </DmxMidiContextProvider>
      </DmxButtonsContextProvider>
    //</StrictMode>,
    : <Welcome recentShows={recentShows} />
))
