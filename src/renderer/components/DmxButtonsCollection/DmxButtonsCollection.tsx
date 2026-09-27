import './DmxButtonsCollection.scss'

import DmxButton from "./DmxButton"
import { useDmxButtonsContext } from "../../contexts/DmxButtonsContext"
import { playDmxButton } from "../../ApiClient"
import { useRealTimeContext } from "../../contexts/RealTimeContext"

const DmxButtonsCollection = () => {
    const { track, dmxButtons, setSelectedDmxButtonId, selectedDmxButtonId, createDmxButtonAndSync } = useDmxButtonsContext()
    const { activeDmxButtonIds } = useRealTimeContext()

    const selectAndPlayDmxButton = (dmxButtonId: string) => {
        setSelectedDmxButtonId(dmxButtonId)
        playDmxButton(dmxButtonId)
    }

    const globalDmxButtons = dmxButtons.filter(({ track_id }) => track_id == null)
    const trackDmxButtons = dmxButtons.filter(({ track_id }) => track_id != null)

    const renderDmxButton = (dmxButton: DmxButton) => (
        <DmxButton
            key={dmxButton.id}
            onTap={() => {
                selectAndPlayDmxButton(dmxButton.id)
            }}
            selected={selectedDmxButtonId == dmxButton.id}
            isPlaying={activeDmxButtonIds.includes(dmxButton.id)}
            dmxButton={dmxButton}/>
    )

    // Without global buttons there's a single group: no need to label it
    const hasGlobalDmxButtons = globalDmxButtons.length > 0

    return <div className='dmx-buttons-collection'>
        { hasGlobalDmxButtons && <div className='dmx-buttons-group'>
            <div className='dmx-buttons-group-label'>Global <span>· on every track</span></div>
            <div className='dmx-buttons'>
                { globalDmxButtons.map(renderDmxButton) }
            </div>
        </div> }

        <div className='dmx-buttons-group'>
            { hasGlobalDmxButtons && track &&
                <div className='dmx-buttons-group-label'>{ track.name } <span>· this track only</span></div> }
            <div className='dmx-buttons'>
                { trackDmxButtons.map(renderDmxButton) }

                { track && dmxButtons.length < 12 && <div className='btn empty' onClick={createDmxButtonAndSync}>+ Add a button</div>}
                { !track && <div className='btn empty'></div>}
            </div>
        </div>
    </div>
}

export default DmxButtonsCollection
