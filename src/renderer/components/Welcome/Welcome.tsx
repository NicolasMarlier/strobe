import './Welcome.scss'

import { useState } from 'react'
import { newShow, openRecentShow, openShow, removeRecentShow } from '../../ApiClient'
import icon from '../../../../assets/icon-256.png'

interface Props {
    recentShows: RecentShow[]
}

// Shown when no show is open. Opening or creating a show reloads the window into the app.
const Welcome = (props: Props) => {
    const [recentShows, setRecentShows] = useState(props.recentShows)

    const onRemove = (e: React.MouseEvent, dir: string) => {
        // Don't open the show
        e.stopPropagation()
        removeRecentShow(dir).then(setRecentShows)
    }

    return <div className="welcome">
        <div className="welcome-panel">
            <img className="welcome-icon" src={icon} alt=""/>
            <div className="welcome-title">STROBE</div>

            { recentShows.length > 0 && <>
                <div className="welcome-section-title">Recent shows</div>
                <div className="welcome-recent-shows">
                    { recentShows.map(({ dir, name, folder }) =>
                        <div key={dir} className="welcome-recent-show" onClick={() => openRecentShow(dir)}>
                            <div className="details">
                                <div className="name">{name}</div>
                                <div className="folder">{folder}</div>
                            </div>
                            <div className="remove" title="Remove from recent shows" onClick={(e) => onRemove(e, dir)}>×</div>
                        </div>
                    )}
                </div>
            </>}

            <div className="welcome-actions">
                <div className="welcome-button primary" onClick={() => newShow()}>New Show</div>
                <div className="welcome-button" onClick={() => openShow()}>Open Other Show…</div>
            </div>
        </div>
    </div>
}

export default Welcome
