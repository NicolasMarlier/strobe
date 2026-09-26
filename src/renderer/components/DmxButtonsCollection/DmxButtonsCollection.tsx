import './DmxButtonsCollection.scss'

import DmxButton from "./DmxButton"
import { useDmxButtonsContext } from "../../contexts/DmxButtonsContext"
import { playDmxButton } from "../../ApiClient"

const DmxButtonsCollection = () => {
    const { program, dmxButtons, setSelectedDmxButtonId, selectedDmxButtonId, createDmxButtonAndSync } = useDmxButtonsContext()

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
            isPlaying={false}
            dmxButton={dmxButton}/>
            ))}

            { program && dmxButtons.length < 12 && <div className='empty-btn' onClick={createDmxButtonAndSync}>NEW DMX BUTTON</div>}
            { !program && <div className='empty-btn'></div>}
    </div>
}

export default DmxButtonsCollection