import { useEffect, useState } from 'react'
import './DmxButtonDetails.scss' 
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'
import DmxButtonDetailsPlaceholder from './DmxButtonDetailsPlaceholder'
import DmxEffectNaturePicker from './DmxEffectNaturePicker'
import TriggeringMidiKeySelect from './TriggeringMidiKeySelect'

const DmxButtonDetails = () => {
    const { dmxButtons, selectedDmxButtonId, updateDmxButtonAndSync, deleteDmxButtonAndSync, currentProgramId } = useDmxButtonsContext()
    
    const dmxButton = dmxButtons.find(({id}) => id == selectedDmxButtonId)
    if(!dmxButton) return <DmxButtonDetailsPlaceholder/>

    const [nature, setNature] = useState(dmxButton.nature)
    const [durationMs, setDurationMs] = useState(dmxButton.duration_ms)
    const [color, setColor] = useState(dmxButton.color)
    const [triggeringMidiKey, setTriggeringMidiKey] = useState(dmxButton.triggering_midi_key)
    const [programId, setProgramId] = useState(dmxButton.program_id)

    useEffect(() => {
        setNature(dmxButton.nature)
        setDurationMs(dmxButton.duration_ms)
        setColor(dmxButton.color)
        setTriggeringMidiKey(dmxButton.triggering_midi_key)
        setProgramId(dmxButton.program_id)
    }, [dmxButton])

    useEffect(() => {
        updateDmxButtonAndSync(dmxButton.id, {
            color,
            duration_ms: durationMs,
            nature,
            triggering_midi_key: triggeringMidiKey,
            program_id: programId,
        })
    }, [color, durationMs, nature, triggeringMidiKey, programId])

    return <div className="dmx-button-details">
        <div>
            <label>Function</label>
            <DmxEffectNaturePicker
                value={nature}
                onChange={setNature}/>
        </div>
        <div>
            <label>Color</label>
            <label className="color" style={{background: color}}>
                <input name="color"
                    value={color}
                    type="color"
                    onChange={(e: any) => { setColor(e.target.value) }}
                    />
            </label>
        </div>
        <div>
            <label>Duration</label>
            <input name="durationMs"
                value={durationMs}
                onChange={(e: any) => { setDurationMs(parseInt(e.target.value, 10)) }}
                />
        </div>
        
        <div className="">
            <label>Global</label>
            <input
                name="global"
                type="checkbox"
                checked={programId == null}
                onChange={(e: any) => { setProgramId(e.target.checked ? null : (currentProgramId || null)) }}/>
        </div>

        <div className="">
            <label>Signal</label>
            <TriggeringMidiKeySelect
                value={triggeringMidiKey}
                onChange={setTriggeringMidiKey}
                />
        </div>

        <div className="delete-btn btn" onClick={() => deleteDmxButtonAndSync(dmxButton.id)}>DELETE</div>
    </div>
}

export default DmxButtonDetails
