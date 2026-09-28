import { useState } from 'react'
import Interfaces from './Interfaces'

// Remembered in this window's storage: a display preference, not part of the show
const STORAGE_KEY = 'interfaces-section-open'

const readOpen = () => {
    try { return localStorage.getItem(STORAGE_KEY) != 'false' }
    catch { return true }
}

const saveOpen = (open: boolean) => {
    try { localStorage.setItem(STORAGE_KEY, String(open)) }
    catch { /* Not remembered: it opens again next time */ }
}

// The Interfaces section, collapsed or expanded by clicking its title (a chevron shows on hover)
const InterfacesSection = () => {
    const [open, setOpen] = useState(readOpen)

    const toggle = () => {
        setOpen(!open)
        saveOpen(!open)
    }

    return <div className={`section interfaces-section ${open ? 'open' : 'collapsed'}`}>
        <div className='section-title collapsible' onClick={toggle} title={open ? 'Collapse' : 'Expand'}>
            Interfaces
            <svg className='chevron' viewBox='0 0 10 10' width='8' height='8'>
                <path d='M2 3.5 5 6.5 8 3.5' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round'/>
            </svg>
        </div>
        {/* Its height animates between its content's and none (grid rows from 1fr to 0fr) */}
        <div className='section-body'>
            <div className='collapsible-content'>
                <div className='collapsible-inner'>
                    <Interfaces/>
                </div>
            </div>
        </div>
    </div>
}

export default InterfacesSection
