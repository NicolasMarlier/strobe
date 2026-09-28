import { useRef } from 'react'

// Class of a details panel's content transition (see DetailsPanel.scss): 'push' when something is opened
// in it (its settings come in from the right), 'pop' when going back (from the left).
// None on the panel's first appearance. Kept until the next change, so a re-render doesn't cut the animation
export const usePanelTransition = (open: boolean) => {
    const wasOpenRef = useRef(open)
    const transitionRef = useRef('')
    if (wasOpenRef.current != open) {
        transitionRef.current = open ? 'push' : 'pop'
        wasOpenRef.current = open
    }
    return transitionRef.current
}
