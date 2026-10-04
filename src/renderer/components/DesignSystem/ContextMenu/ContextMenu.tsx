import './ContextMenu.scss'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export type ContextMenuItem = { label: string, action: () => void, danger?: boolean } | 'separator'

interface Props {
    x: number
    y: number
    items: ContextMenuItem[]
    onClose: () => void
}

// A right-click menu at x, y. Closes on Escape, a click anywhere else, or once an item is chosen
const ContextMenu = ({ x, y, items, onClose }: Props) => {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key == 'Escape') onClose()
            e.stopPropagation()
        }
        window.addEventListener('keydown', onKeyDown, true)
        window.addEventListener('mousedown', onClose)
        window.addEventListener('blur', onClose)
        return () => {
            window.removeEventListener('keydown', onKeyDown, true)
            window.removeEventListener('mousedown', onClose)
            window.removeEventListener('blur', onClose)
        }
    }, [onClose])

    // Out of the sections, which clip their content
    return createPortal(
        <div className='context-menu' style={{ left: x, top: y }} onMouseDown={(e) => e.stopPropagation()}>
            { items.map((item, i) => item == 'separator'
                ? <div key={i} className='context-menu-separator'/>
                : <div
                    key={i}
                    className={`context-menu-item ${item.danger ? 'danger' : ''}`}
                    onClick={() => { onClose(); item.action() }}>{item.label}</div>) }
        </div>,
        document.body,
    )
}

export default ContextMenu
