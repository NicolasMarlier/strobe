import { useEffect, useState } from 'react'
import SmallButton from '../DesignSystem/SmallButton/SmallButton'
import { SaveIcon } from '../DesignSystem/Icons'
import { getShowState, saveShow } from '../../ApiClient'

// Saves the open show, same as File > Save. Disabled until the show has unsaved changes
const SaveButton = () => {
    const [isDirty, setIsDirty] = useState(false)

    useEffect(() => {
        getShowState().then(({ isDirty }) => setIsDirty(isDirty))
        return window.strobe.api.onMessage('show:dirty', setIsDirty)
    }, [])

    return <SmallButton disabled={!isDirty} onClick={saveShow}>
        <SaveIcon/>
    </SmallButton>
}

export default SaveButton
