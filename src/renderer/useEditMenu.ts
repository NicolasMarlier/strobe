import { useEffect } from 'react'

// Where Cmd+Z undoes the typing instead of the show's last change
const isTextField = (element: Element | null) =>
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'color', 'button'].includes(element.type))

// Edit > Undo (Cmd+Z) and Redo (Cmd+Shift+Z): a text field's typing, or else the show's last change.
// The show then comes back through 'show:restored', which the contexts reload from
export const useEditMenu = () => {
    useEffect(() => {
        const unsubscribes = [
            window.strobe.api.onMessage('edit:undo', () => {
                if (isTextField(document.activeElement)) document.execCommand('undo')
                else window.strobe.api.invoke('show:undo')
            }),
            window.strobe.api.onMessage('edit:redo', () => {
                if (isTextField(document.activeElement)) document.execCommand('redo')
                else window.strobe.api.invoke('show:redo')
            }),
        ]
        return () => unsubscribes.forEach(unsubscribe => unsubscribe())
    }, [])
}
