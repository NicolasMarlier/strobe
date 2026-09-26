import { useRealTimeContext } from "../../contexts/RealTimeContext"
import { humanizeMidiKey } from "../../utils"

interface Props {
    value: MidiKey | null
    onChange: (value: MidiKey | null) => void
}
const TriggeringMidiKeySelect = (props: Props) => {
    const { value, onChange } = props
    const { lastReceivedMidiKey } = useRealTimeContext()
    
    return <>
        { !value && !lastReceivedMidiKey && <input
            value={'No signal'}
            disabled
            /> }
        { !value && !!lastReceivedMidiKey && <div
            className="attaching-signal"
            onClick={() => onChange(lastReceivedMidiKey.midi)}>
            <span className="btn">Attach {humanizeMidiKey(lastReceivedMidiKey.midi)} </span>
        </div> }
        { value && <div className="bound-signal">
            <input
                value={humanizeMidiKey(value)}
                disabled
                />
            <div
                className="unbind-btn"
                title="Unbind"
                onClick={() => onChange(null)}>×</div>
        </div> }
    </>
}
export default TriggeringMidiKeySelect