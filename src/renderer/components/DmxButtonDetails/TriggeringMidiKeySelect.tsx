import { useRealTimeContext } from "../../contexts/RealTimeContext"
import { humanizeMidiKey } from "../../utils"
import './TriggeringMidiKeySelect.scss'

interface Props {
    value: MidiKey | null
    onChange: (value: MidiKey | null) => void
}
// Same frame as the SegmentedControl: the bound key shows as the active segment, "×" as an option next to it
const TriggeringMidiKeySelect = (props: Props) => {
    const { value, onChange } = props
    const { lastReceivedMidiKey: lastReceived } = useRealTimeContext()
    // Only a key played on a MIDI device is worth attaching: a clicked button already has its own key
    const lastReceivedMidiKey = lastReceived && !lastReceived.mock ? lastReceived : undefined

    return <div className="midi-key-select">
        { !value && !lastReceivedMidiKey && <div className="midi-key-select-option empty">
            No signal
        </div> }
        { !value && !!lastReceivedMidiKey && <div
            className="midi-key-select-option attach"
            onClick={() => onChange(lastReceivedMidiKey.midi)}>
            Attach {humanizeMidiKey(lastReceivedMidiKey.midi)}
        </div> }
        { value && <>
            <div className="midi-key-select-option active">
                { humanizeMidiKey(value) }
            </div>
            <div
                className="midi-key-select-option unbind"
                title="Unbind"
                onClick={() => onChange(null)}>×</div>
        </> }
    </div>
}
export default TriggeringMidiKeySelect
