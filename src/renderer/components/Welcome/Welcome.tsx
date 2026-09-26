import './Welcome.scss'

import { newShow, openRecentShow, openShow } from '../../ApiClient'

interface Props {
    recentShows: RecentShow[]
}

// Shown when no show is open. Opening or creating a show reloads the window into the app.
const Welcome = ({ recentShows }: Props) => (
    <div className="welcome">
        <div className="welcome-panel">
            <div className="welcome-title">DMX CONTROL</div>

            { recentShows.length > 0 && <>
                <div className="welcome-section-title">Recent shows</div>
                <div className="welcome-recent-shows">
                    { recentShows.map(({ dir, name, folder }) =>
                        <div key={dir} className="welcome-recent-show" onClick={() => openRecentShow(dir)}>
                            <div className="name">{name}</div>
                            <div className="folder">{folder}</div>
                        </div>
                    )}
                </div>
            </>}

            <div className="welcome-actions">
                <div className="welcome-button primary" onClick={() => newShow()}>New Show…</div>
                <div className="welcome-button" onClick={() => openShow()}>Open Other Show…</div>
            </div>
        </div>
    </div>
)

export default Welcome
