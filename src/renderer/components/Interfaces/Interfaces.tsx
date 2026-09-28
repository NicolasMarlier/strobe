import './Interfaces.scss'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRealTimeContext } from '../../contexts/RealTimeContext'

// The only DMX output Strobe drives (found by its serial number, see enttec_open_dmx_usb.ts)
const DMX_OUTPUT_NAME = 'Enttec Open DMX USB'

type Status = 'on' | 'pending' | 'off'

const DMX_STATE_STATUS: Record<USBDeviceState, Status> = {
    'Connected': 'on',
    'Initializing': 'pending',
    'Identified': 'pending',
    'Not connected': 'off',
}

// macOS' virtual MIDI buses (e.g. MainStage's) are all named after the IAC driver, in the system's language:
// only the bus' name tells them apart
const IAC_PREFIX = /^(Gestionnaire IAC|IAC Driver)\s+/

type Side = 'input' | 'output'

interface DeviceInfo {
    key: string
    name: string
    status: Status
    // Shown on hover: the full name, the state
    title: string
}

// A wire from a device to Strobe, in the section's pixels
interface Wire {
    key: string
    side: Side
    status: Status
    path: string
}

// A smooth S curve between two points, leaving and reaching them horizontally
const wirePath = (x1: number, y1: number, x2: number, y2: number) => {
    const bend = (x2 - x1) / 2
    return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`
}

// Lights travelling along the wires at once, at most (a steady MIDI clock keeps sending)
const MAX_PARTICLES = 30

interface Particle {
    id: number
    // The device's wire it travels along
    wireKey: string
}

let nextParticleId = 0

// The dot tells the state. `flash` counts the device's signals: each one flashes the dot again
const Device = ({ device, flash, deviceRef }: { device: DeviceInfo, flash?: number, deviceRef: (element: HTMLDivElement | null) => void }) =>
    <div ref={deviceRef} className={`interface-device ${device.status}`} title={device.title}>
        <span key={flash} className={`status-dot ${flash ? 'flash' : ''}`}/>
        <span className='name'>{device.name}</span>
    </div>

// What Strobe is connected to: the MIDI inputs it listens to stacked on the left, the DMX outputs it drives
// on the right, each wired to Strobe in the middle
const Interfaces = () => {
    const { enttecOpenUSBState } = useRealTimeContext()
    const [midiInputs, setMidiInputs] = useState<string[]>([])
    // A MIDI input sends something: its dot flashes, and a light travels along its wire to Strobe
    const [flashes, setFlashes] = useState<Record<string, number>>({})
    const [particles, setParticles] = useState<Particle[]>([])

    useEffect(() => {
        window.strobe.api.invoke('interfaces:midi_inputs').then(setMidiInputs)
        const unsubscribes = [
            window.strobe.api.onMessage('interfaces:midi_inputs_changed', setMidiInputs),
            window.strobe.api.onMessage('interfaces:midi_activity', (device) => {
                setFlashes(flashes => ({ ...flashes, [device]: (flashes[device] ?? 0) + 1 }))
                setParticles(particles => [...particles.slice(1 - MAX_PARTICLES), { id: nextParticleId++, wireKey: `input:${device}` }])
            }),
        ]
        return () => unsubscribes.forEach(unsubscribe => unsubscribe())
    }, [])

    const removeParticle = (id: number) => setParticles(particles => particles.filter(particle => particle.id != id))

    const inputs: DeviceInfo[] = midiInputs.length == 0
        ? [{ key: 'none', name: 'No MIDI input', status: 'off', title: 'No MIDI input connected' }]
        : midiInputs.map(name => ({ key: name, name: name.replace(IAC_PREFIX, ''), status: 'on', title: name }))
    const dmxStatus = DMX_STATE_STATUS[enttecOpenUSBState] ?? 'off'
    const outputs: DeviceInfo[] = [
        { key: 'enttec', name: DMX_OUTPUT_NAME, status: dmxStatus, title: `${DMX_OUTPUT_NAME} — ${enttecOpenUSBState}` },
    ]

    // The wires follow the elements' real positions: measured, and again when the section's size changes
    const containerRef = useRef<HTMLDivElement>(null)
    const strobeRef = useRef<HTMLDivElement>(null)
    const deviceRefs = useRef(new Map<string, HTMLDivElement>())
    const [wires, setWires] = useState<Wire[]>([])
    // The content's height, given to the frame around it so a plugged or unplugged device animates it
    const [height, setHeight] = useState<number | undefined>(undefined)

    const devices = [
        ...inputs.map(device => ({ ...device, side: 'input' as Side })),
        ...outputs.map(device => ({ ...device, side: 'output' as Side })),
    ]
    const layoutKey = devices.map(({ side, key, status }) => `${side}:${key}:${status}`).join('|')

    useLayoutEffect(() => {
        const container = containerRef.current
        const strobe = strobeRef.current
        if (!container || !strobe) return

        const measure = () => {
            setHeight(container.offsetHeight)
            const origin = container.getBoundingClientRect()
            const strobeBox = strobe.getBoundingClientRect()
            const strobeY = strobeBox.top + strobeBox.height / 2 - origin.top
            setWires(devices.flatMap(({ key, side, status }) => {
                const element = deviceRefs.current.get(`${side}:${key}`)
                if (!element) return []
                const box = element.getBoundingClientRect()
                const y = box.top + box.height / 2 - origin.top
                const path = side == 'input'
                    ? wirePath(box.right - origin.left, y, strobeBox.left - origin.left, strobeY)
                    : wirePath(strobeBox.right - origin.left, strobeY, box.left - origin.left, y)
                return [{ key: `${side}:${key}`, side, status, path }]
            }))
        }

        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(container)
        return () => observer.disconnect()
    }, [layoutKey])

    const deviceRef = (side: Side, key: string) => (element: HTMLDivElement | null) => {
        if (element) deviceRefs.current.set(`${side}:${key}`, element)
        else deviceRefs.current.delete(`${side}:${key}`)
    }

    return <div className='interfaces-frame' style={{ height }}>
    <div ref={containerRef} className='interfaces'>
        <svg className='interfaces-wires'>
            { wires.map(({ key, status, path }) => <path key={key} className={`wire ${status}`} d={path}/>) }
        </svg>

        {/* Each light follows its wire's path (CSS motion path), then goes away */}
        { particles.map(({ id, wireKey }) => {
            const wire = wires.find(({ key }) => key == wireKey)
            return wire && <span
                key={id}
                className='wire-particle'
                style={{ offsetPath: `path('${wire.path}')` }}
                onAnimationEnd={() => removeParticle(id)}/>
        })}

        <div className='interfaces-side inputs'>
            <span className='side-label'>MIDI in</span>
            { inputs.map(device => <Device key={device.key} device={device} flash={flashes[device.key]} deviceRef={deviceRef('input', device.key)}/>) }
        </div>

        <div ref={strobeRef} className='interfaces-strobe'>Strobe</div>

        <div className='interfaces-side outputs'>
            <span className='side-label'>DMX out</span>
            { outputs.map(device => <Device key={device.key} device={device} deviceRef={deviceRef('output', device.key)}/>) }
        </div>
    </div>
    </div>
}

export default Interfaces
