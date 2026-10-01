import { useState } from 'react'
import Interfaces from './Interfaces'

// Remembered in this window's storage: a display preference, not part of the show
const STORAGE_KEY = 'interfaces-section-open'

// How to set up MainStage to drive Strobe, on the public website (opens in the browser, see setWindowOpenHandler in index.ts)
const MAINSTAGE_HELP_URL = 'https://strobe-website.vercel.app/mainstage'

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
                    <div className='interfaces-footer'>
                        <a href={MAINSTAGE_HELP_URL} target='_blank' rel='noreferrer' title='How to drive Strobe from MainStage'>
                            <svg viewBox='0 0 12 12' width='11' height='11' aria-hidden='true'>
                                <circle cx='6' cy='6' r='5.25' fill='none' stroke='currentColor' strokeWidth='1.2'/>
                                <circle cx='6' cy='3.6' r='0.8' fill='currentColor'/>
                                <path d='M6 5.4v3.4' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round'/>
                            </svg>
                            Connect to MainStage
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

export default InterfacesSection
