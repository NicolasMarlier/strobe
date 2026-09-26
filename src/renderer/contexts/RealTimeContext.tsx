import { createContext, useContext, useEffect, useRef, useState, type RefObject } from "react"
import { useDmxButtonsContext } from "./DmxButtonsContext"

interface RealTimeContextType {
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

    window.dmxControl.api.onMessage('midi:note_on', params => {
      const {
        midi
      } = params
      setLastReceivedMidiKey({
        midi: midi,
        at: Date.now()
      })
    })

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
            enttecOpenUSBState,
            
            debug,
            debugIncomingWsPayloads,
            debugOutgoingWsPayloads,
            } }>
            {children}
        </RealTimeContext.Provider>
    )
}
