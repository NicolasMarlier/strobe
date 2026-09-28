import './ConfirmModal.scss'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
    title: string
    message?: string
    confirmLabel: string
    onConfirm: () => void
    onCancel: () => void
}

// Asks before a destructive action (e.g. a deletion). Over the whole window:
// Enter confirms, Escape or a click outside the card cancels
const ConfirmModal = ({ title, message, confirmLabel, onConfirm, onCancel }: Props) => {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key == 'Escape') onCancel()
            if (e.key == 'Enter') onConfirm()
            // Keeps the shortcuts of the rest of the app (e.g. Space to play) from running meanwhile
            e.stopPropagation()
        }
        window.addEventListener('keydown', onKeyDown, true)
        return () => window.removeEventListener('keydown', onKeyDown, true)
    }, [onConfirm, onCancel])

    // Out of the sections, which clip their content. React still bubbles its clicks up to them:
    // they stop here, so a section doesn't take them for clicks on its empty space (which deselect)
    return createPortal(
        <div className='confirm-modal-background' onClick={(e) => { e.stopPropagation(); onCancel() }}>
            <div className='confirm-modal' onClick={(e) => e.stopPropagation()}>
                <div className='confirm-modal-title'>{title}</div>
                { message && <div className='confirm-modal-message'>{message}</div> }
                <div className='confirm-modal-buttons'>
                    <div className='btn' onClick={onCancel}>Cancel</div>
                    <div className='btn danger' onClick={onConfirm}>{confirmLabel}</div>
                </div>
            </div>
        </div>,
        document.body,
    )
}

export default ConfirmModal
