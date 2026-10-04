import { useEffect, useState } from 'react'

// A narrow window shows one column, without the details panels (see the media query in App.scss)
export const NARROW_WINDOW = '(max-width: 800px)'

export const isNarrowWindow = () => window.matchMedia(NARROW_WINDOW).matches

// Whether the window is narrow, updated when it crosses the width
export const useNarrowWindow = () => {
    const [narrow, setNarrow] = useState(isNarrowWindow)

    useEffect(() => {
        const query = window.matchMedia(NARROW_WINDOW)
        const onChange = () => setNarrow(query.matches)
        query.addEventListener('change', onChange)
        return () => query.removeEventListener('change', onChange)
    }, [])

    return narrow
}
