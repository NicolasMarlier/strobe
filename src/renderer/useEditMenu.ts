import { useEffect } from 'react'
import type { ReverseChannel } from '../shared/ipc-reverse-contract'

// Where Cmd+Z undoes the typing instead of the show's last change
export const isTextField = (element: Element | null) =>
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'color', 'button'].includes(element.type))

type EditAction = 'copy' | 'paste' | 'selectAll'

// Whether Edit > Copy, Paste or Select All is the page's own (a text field's, or selected text to copy)
// rather than the patterns' or the notes'
export const isPageEdit = (action: EditAction | 'delete') =>
    isTextField(document.activeElement) ||
    (action == 'copy' && !(window.getSelection()?.isCollapsed ?? true))

// A menu item or a key the window doesn't take: registered once, the handler should read refs
export const useMenuMessage = (channel: ReverseChannel, handler: () => void) => {
    useEffect(() => window.strobe.api.onMessage(channel, handler), [])
}

// Edit > Undo (Cmd+Z) and Redo (Cmd+Shift+Z): a text field's typing, or else the show's last change.
// The show then comes back through 'show:restored', which the contexts reload from.
// Edit > Copy, Paste and Select All: the page's own are done here, the others are the timeline's
// patterns (TrackEditor) or the note editor's notes (NoteEditor), which listen to the same messages
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
            ...(['copy', 'paste', 'selectAll'] as const).map(action =>
                window.strobe.api.onMessage(`edit:${action}`, () => {
                    if (isPageEdit(action)) window.strobe.api.invoke('edit:native', action)
                })),
        ]
        return () => unsubscribes.forEach(unsubscribe => unsubscribe())
    }, [])
}
