import { useEffect, useState } from 'react'

// Whether Shift (move vertically) and Alt (rotate) are held, for the scene's LED bars
export const useModifierKeys = () => {
    const [keys, setKeys] = useState({ shift: false, alt: false })

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => setKeys(keys =>
            keys.shift == e.shiftKey && keys.alt == e.altKey ? keys : { shift: e.shiftKey, alt: e.altKey })
        // Released while the window was in the background: no keyup comes
        const onBlur = () => setKeys({ shift: false, alt: false })
        window.addEventListener('keydown', onKey)
        window.addEventListener('keyup', onKey)
        window.addEventListener('blur', onBlur)
        return () => {
            window.removeEventListener('keydown', onKey)
            window.removeEventListener('keyup', onKey)
            window.removeEventListener('blur', onBlur)
        }
    }, [])

    return keys
}
