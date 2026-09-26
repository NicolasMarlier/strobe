import { createContext, useContext, useEffect, useRef, useState, type RefObject } from "react"
//import useWebSocket, { ReadyState } from "react-use-websocket"
import { useDmxButtonsContext } from "./DmxButtonsContext"
import LostConnectionOverlay from "../components/LostConnectionOverlay/LostConnectionOverlay"

interface RealTimeContextType {
    webSocketReadyState: ReadyState
    midiCurrentTickRef: RefObject<number>,
    lastReceivedMidiKey: ReceivedMidiKey | undefined
    setLastReceivedMidiKey: (received_midi_key: ReceivedMidiKey | undefined) => void

    sendCurrentTickToServer: (tick: number) => void  

    dmxHexSignal: DmxHexSignal
    enttecOpenUSBState: USBDeviceState

    debug: boolean
    debugIncomingWsPayloads: IncomingWsPayload[]
    debugOutgoingWsPayloads: OutgoingWsPayload[]
}

//const WS_URL = import.meta.env.VITE_WS_URL || `ws://127.0.0.1:8080`

const RealTimeContext = createContext<RealTimeContextType | null>(null)

export const useRealTimeContext = () => {
  const realTimeContext = useContext(RealTimeContext);

  if (!realTimeContext) {
    throw new Error(
      "useRealTimeContext has to be used within <RealTimeContext.Provider>"
    );
  }
  return realTimeContext
}



export const RealTimeContextProvider = ({ children }: {children: React.ReactNode}) => {
    const { setCurrentProgramId, syncPrograms, programs } = useDmxButtonsContext()

    const midiCurrentTickRef = useRef(0)
    const [lastReceivedMidiKey, setLastReceivedMidiKey] = useState(
        undefined as ReceivedMidiKey | undefined
    )

    const [enttecOpenUSBState, setEnttecOpenUSBState] = useState('Not connected' as USBDeviceState)
    const [dmxHexSignal, setDmxHexSignal] = useState("" as DmxHexSignal);

    const [debugIncomingWsPayloads, setDebugIncomingWsPayloads] = useState<IncomingWsPayload[]>([])
    const [debugOutgoingWsPayloads, setDebugOutgoingWsPayloads] = useState<OutgoingWsPayload[]>([])
    

    const debug = false
    
    const readyState: ReadyState = "open"


    useEffect(() => {
      if(!!lastReceivedMidiKey) {
        const intervalId = setTimeout(() => setLastReceivedMidiKey(undefined), 3000)
        return () => clearInterval(intervalId)
      }
    }, [lastReceivedMidiKey])

    window.dmxControl.api.onMessage('dmx', (data) => {
      const {
            enttecOpenDMXUSB: {
              state: state
            },
            dmxHexSignal: dmxHexSignal,
            midiCurrentTick: midiCurrentTick
      } = data
      setEnttecOpenUSBState(state)
      setDmxHexSignal(dmxHexSignal)
      midiCurrentTickRef.current = midiCurrentTick
    })

    window.dmxControl.api.onMessage('program:change', programId => {
      setCurrentProgramId(programId)
      syncPrograms()
    }) 

    // useEffect(() => {
    //   if(lastMessage !== null) {
    //     const jsonMessage = JSON.parse(lastMessage.data)
    //     if(debug) {
    //       setDebugIncomingWsPayloads(p => [...[jsonMessage], ...p])
    //     }
    //     if(jsonMessage.channel === 'dmx') {
    //       const {
    //         enttecOpenDMXUSB: {
    //           state: state
    //         },
    //         dmxHexSignal: dmxHexSignal,
    //         midiCurrentTick: midiCurrentTick
    //       } = jsonMessage.data
    //       setEnttecOpenUSBState(state)
    //       setDmxHexSignal(dmxHexSignal)
    //       midiCurrentTickRef.current = midiCurrentTick
    //     }
    //     else if(jsonMessage.channel === 'control') {
    //       if(jsonMessage.action == 'change_program') {
    //         setCurrentProgramId(jsonMessage.data.program_id)
    //         syncPrograms()
    //       }
    //     }
    //     else if(jsonMessage.channel === 'midi_input') {
    //       if(jsonMessage.action == 'note_on') {
    //         const message = jsonMessage.data as WSMidiNoteOnMessage
    //         setLastReceivedMidiKey({
    //           midi: message.midi,
    //           at: Date.now()
    //         })
    //       }
    //     }
    //     else {
    //       console.log("Received unknown WS message", jsonMessage)
    //     }
    //   }
    // }, [lastMessage, programs])

    const sendCurrentTickToServer = (midiCurrentTick: number) => {
      window.dmxControl.api.invoke('main_loop:update_current_tick', midiCurrentTick)
    }
    

    return (
        <RealTimeContext.Provider value={ {
            lastReceivedMidiKey,
            setLastReceivedMidiKey,
            
            midiCurrentTickRef,

            sendCurrentTickToServer,

            dmxHexSignal,

            webSocketReadyState: readyState,
            enttecOpenUSBState,
            
            debug,
            debugIncomingWsPayloads,
            debugOutgoingWsPayloads,
            } }>
            { readyState != "open" && <LostConnectionOverlay/> }
            {children}
        </RealTimeContext.Provider>
    )
}
