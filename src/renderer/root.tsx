//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App'
import { DmxButtonsContextProvider } from './contexts/DmxButtonsContext'
import { RealTimeContextProvider } from './contexts/RealTimeContext'
import { DmxMidiContextProvider } from './contexts/DmxMidiContext'

createRoot(document.body).render(
  //<StrictMode>
  <DmxButtonsContextProvider>
    <DmxMidiContextProvider>
      <RealTimeContextProvider>
        <App /> 
        YO 
      </RealTimeContextProvider>
    </DmxMidiContextProvider>
  </DmxButtonsContextProvider>
  //</StrictMode>,
)
