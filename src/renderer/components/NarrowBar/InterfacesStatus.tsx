import './NarrowBar.scss'
import { useEffect, useState } from 'react'
import { useRealTimeContext } from '../../contexts/RealTimeContext'
import { DMX_STATE_STATUS, type Status } from '../Interfaces/Interfaces'

const Indicator = ({ label, status, flash, title }: { label: string, status: Status, flash?: number, title: string }) =>
    <span className={`interfaces-status-item ${status}`} title={title}>
        <span key={flash} className={`status-dot ${flash ? 'flash' : ''}`}/>
        {label}
    </span>

// In a narrow window, the Interfaces section shrinks to this, in the top bar: one dot for the MIDI inputs,
// flashing on each signal, one for the DMX output. Just information: nothing to click
const InterfacesStatus = () => {
    const { enttecOpenUSBState } = useRealTimeContext()
    const [midiInputs, setMidiInputs] = useState<string[]>([])
    const [flash, setFlash] = useState(0)

    useEffect(() => {
        window.strobe.api.invoke('interfaces:midi_inputs').then(setMidiInputs)
        const unsubscribes = [
            window.strobe.api.onMessage('interfaces:midi_inputs_changed', setMidiInputs),
            window.strobe.api.onMessage('interfaces:midi_activity', () => setFlash(flash => flash + 1)),
        ]
        return () => unsubscribes.forEach(unsubscribe => unsubscribe())
    }, [])

    const midiStatus: Status = midiInputs.length > 0 ? 'on' : 'off'
    const dmxStatus = DMX_STATE_STATUS[enttecOpenUSBState] ?? 'off'

    return <div className='interfaces-status narrow-only'>
        <Indicator
            label='MIDI'
            status={midiStatus}
            flash={flash}
            title={midiInputs.length > 0 ? `MIDI in: ${midiInputs.join(', ')}` : 'No MIDI input connected'}/>
        <Indicator
            label='DMX'
            status={dmxStatus}
            title={`DMX out: ${enttecOpenUSBState}`}/>
    </div>
}

export default InterfacesStatus
