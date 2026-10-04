import { useEffect, useState } from 'react'
import type { DevWorktree } from '../../../shared/dev_worktree'
import './DevWorktreeBadge.scss'

// Run from source only: a frame around the window in the branch's color, and the branch's name in a corner,
// to tell apart the windows of several worktrees running at once (see src/shared/dev_worktree.ts)
const DevWorktreeBadge = () => {
    const [devWorktree, setDevWorktree] = useState<DevWorktree | null>(null)

    useEffect(() => {
        window.strobe.api.invoke('dev:worktree').then(setDevWorktree)
    }, [])

    if (!devWorktree) return null
    const color = `hsl(${devWorktree.hue}, 80%, 55%)`
    const title = devWorktree.worktree ? `Worktree .claude/worktrees/${devWorktree.worktree}` : 'Main checkout'
    return <>
        <div className="dev-worktree-frame" style={{ borderColor: color }}/>
        <div className="dev-worktree-label" style={{ backgroundColor: color }} title={title}>
            {devWorktree.branch}
        </div>
    </>
}

export default DevWorktreeBadge
