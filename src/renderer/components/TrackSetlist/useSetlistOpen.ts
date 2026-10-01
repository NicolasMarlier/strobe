import { useEffect, useState } from 'react'

// Remembered in this window's storage: a display preference, not part of the show
const STORAGE_KEY = 'setlist-open'

const readOpen = () => {
    try { return localStorage.getItem(STORAGE_KEY) != 'false' }
    catch { return true }
}

const saveOpen = (open: boolean) => {
    try { localStorage.setItem(STORAGE_KEY, String(open)) }
    catch { /* Not remembered: it opens again next time */ }
}

// Whether the setlist sidebar shows. Cmd+\ shows or hides it
export const useSetlistOpen = () => {
    const [open, setOpen] = useState(readOpen)

    const toggle = () => setOpen(open => {
        saveOpen(!open)
        return !open
    })

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key == '\\' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                toggle()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [])

    return { open, toggle }
}
