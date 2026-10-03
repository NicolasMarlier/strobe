import { createContext, useContext, useEffect, useRef, useState, type RefObject } from "react"
import { useDmxButtonsContext } from "./DmxButtonsContext"

interface RealTimeContextType {
    midiCurrentTickRef: RefObject<number>,
    lastReceivedMidiKey: ReceivedMidiKey | undefined
    setLastReceivedMidiKey: (received_midi_key: ReceivedMidiKey | undefined) => void

    sendCurrentTickToServer: (tick: number) => void  

    dmxHexSignal: DmxHexSignal
    activeDmxButtonIds: string[]
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
    const { setCurrentTrackId, syncTracks, tracks } = useDmxButtonsContext()

    const midiCurrentTickRef = useRef(0)
    const [lastReceivedMidiKey, setLastReceivedMidiKey] = useState(
        undefined as ReceivedMidiKey | undefined
    )

    const [enttecOpenUSBState, setEnttecOpenUSBState] = useState('Not connected' as USBDeviceState)
    const [dmxHexSignal, setDmxHexSignal] = useState("" as DmxHexSignal);
    const [activeDmxButtonIds, setActiveDmxButtonIds] = useState<string[]>([])

    const [debugIncomingWsPayloads, setDebugIncomingWsPayloads] = useState<IncomingWsPayload[]>([])
    const [debugOutgoingWsPayloads, setDebugOutgoingWsPayloads] = useState<OutgoingWsPayload[]>([])
    

    const debug = false
    
    const readyState: ReadyState = "open"


    useEffect(() => {
      if(lastReceivedMidiKey) {
        const intervalId = setTimeout(() => setLastReceivedMidiKey(undefined), 3000)
        return () => clearInterval(intervalId)
      }
    }, [lastReceivedMidiKey])

    // Keep the latest syncTracks for the listener below, which is registered only once
    const syncTracksRef = useRef(syncTracks)
    syncTracksRef.current = syncTracks

    // Subscribe once: subscribing on every render would pile up listeners,
    // each of them running on every 'dmx' message (50 per second)
    useEffect(() => {
      const unsubscribes = [
        window.strobe.api.onMessage('dmx', (data) => {
          const {
                enttecOpenDMXUSB: {
                  state: state
                },
                dmxHexSignal: dmxHexSignal,
                midiCurrentTick: midiCurrentTick,
                activeDmxButtonIds: activeDmxButtonIds
          } = data
          setEnttecOpenUSBState(state)
          setDmxHexSignal(dmxHexSignal)
          // A new array comes 50 times per second: keep the previous one while the ids are the same
          setActiveDmxButtonIds(previous => previous.join() == activeDmxButtonIds.join() ? previous : activeDmxButtonIds)
          midiCurrentTickRef.current = midiCurrentTick
        }),

        window.strobe.api.onMessage('track:change', trackId => {
          setCurrentTrackId(trackId)
          syncTracksRef.current()
        }),

        window.strobe.api.onMessage('midi:note_on', params => {
          const {
            midi,
            mock
          } = params
          setLastReceivedMidiKey({
            midi: midi,
            mock: mock,
            at: Date.now()
          })
        }),
      ]
      return () => unsubscribes.forEach(unsubscribe => unsubscribe())
    }, [])

    const sendCurrentTickToServer = (midiCurrentTick: number) => {
      window.strobe.api.invoke('main_loop:update_current_tick', midiCurrentTick)
    }
    
    return (
        <RealTimeContext.Provider value={ {
            lastReceivedMidiKey,
            setLastReceivedMidiKey,
            
            midiCurrentTickRef,

            sendCurrentTickToServer,

            dmxHexSignal,
            activeDmxButtonIds,
            enttecOpenUSBState,
            
            debug,
            debugIncomingWsPayloads,
            debugOutgoingWsPayloads,
            } }>
            {children}
        </RealTimeContext.Provider>
    )
}
