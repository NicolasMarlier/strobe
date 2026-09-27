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

    return <div className='dmx-buttons'>
        { dmxButtons.map((dmxButton: DmxButton) => (
            <DmxButton
            key={dmxButton.id}
            onTap={() => {
                selectAndPlayDmxButton(dmxButton.id)
            }}
            selected={selectedDmxButtonId == dmxButton.id}
            isPlaying={activeDmxButtonIds.includes(dmxButton.id)}
            dmxButton={dmxButton}/>
            ))}

            { track && dmxButtons.length < 12 && <div className='empty-btn' onClick={createDmxButtonAndSync}>NEW DMX BUTTON</div>}
            { !track && <div className='empty-btn'></div>}
    </div>
}

export default DmxButtonsCollection