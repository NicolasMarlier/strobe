import { useEffect, useState } from 'react'
import '../DesignSystem/DetailsPanel/DetailsPanel.scss'
import './DmxButtonDetails.scss' 
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'
import DmxButtonDetailsPlaceholder from './DmxButtonDetailsPlaceholder'
import DmxEffectNaturePicker from './DmxEffectNaturePicker'
import TriggeringMidiKeySelect from './TriggeringMidiKeySelect'
import SegmentedControl from '../DesignSystem/SegmentedControl/SegmentedControl'
import ConfirmModal from '../DesignSystem/ConfirmModal/ConfirmModal'
import { TrashIcon } from '../DesignSystem/Icons'
import { usePanelTransition } from '../DesignSystem/DetailsPanel/usePanelTransition'

// The selected button's settings, or a placeholder. Selecting a button slides its settings in,
// deselecting it slides the placeholder back
const DmxButtonDetails = () => {
    const { dmxButtons, selectedDmxButtonId } = useDmxButtonsContext()
    const dmxButton = dmxButtons.find(({id}) => id == selectedDmxButtonId)
    const transition = usePanelTransition(!!dmxButton)

    if(!dmxButton) return <DmxButtonDetailsPlaceholder className={transition}/>
    // Rebuilt for another button: its settings slide in again
    return <DmxButtonForm key={dmxButton.id} dmxButton={dmxButton} transition={transition}/>
}

const DmxButtonForm = ({ dmxButton, transition }: { dmxButton: DmxButton, transition: string }) => {
    const { updateDmxButtonAndSync, deleteDmxButtonAndSync, currentTrackId } = useDmxButtonsContext()
    // DELETE asks first
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    const [nature, setNature] = useState(dmxButton.nature)
    const [durationMs, setDurationMs] = useState(dmxButton.duration_ms)
    const [color, setColor] = useState(dmxButton.color)
    const [triggeringMidiKey, setTriggeringMidiKey] = useState(dmxButton.triggering_midi_key)
    const [trackId, setTrackId] = useState(dmxButton.track_id)

    useEffect(() => {
        setNature(dmxButton.nature)
        setDurationMs(dmxButton.duration_ms)
        setColor(dmxButton.color)
        setTriggeringMidiKey(dmxButton.triggering_midi_key)
        setTrackId(dmxButton.track_id)
    }, [dmxButton])

    useEffect(() => {
        updateDmxButtonAndSync(dmxButton.id, {
            color,
            duration_ms: durationMs,
            nature,
            triggering_midi_key: triggeringMidiKey,
            track_id: trackId,
        })
    }, [color, durationMs, nature, triggeringMidiKey, trackId])

    return <div className={`details-panel dmx-button-details ${transition}`}>
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
            <label>Scope</label>
            <SegmentedControl
                className="scope"
                options={[{ value: false, label: 'Track' }, { value: true, label: 'Global' }]}
                value={trackId == null}
                onChange={(global) => { setTrackId(global ? null : (currentTrackId || null)) }}/>
            {/* Same wording as the groups' labels in the buttons collection */}
            <div className="hint">{ trackId == null ? 'On every track' : 'This track only' }</div>
        </div>

        <div className="">
            <label>Signal</label>
            <TriggeringMidiKeySelect
                value={triggeringMidiKey}
                onChange={setTriggeringMidiKey}
                />
        </div>

        <div className="delete-icon-btn" title="Delete" onClick={() => setConfirmingDelete(true)}><TrashIcon/></div>

        { confirmingDelete && <ConfirmModal
            title='Delete this button?'
            confirmLabel='Delete'
            onConfirm={() => { setConfirmingDelete(false); deleteDmxButtonAndSync(dmxButton.id) }}
            onCancel={() => setConfirmingDelete(false)}/> }
    </div>
}

export default DmxButtonDetails
