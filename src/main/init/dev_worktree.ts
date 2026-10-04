import { app } from "electron"
import { execFileSync } from "child_process"
import { branchHue, DevWorktree, worktreeName } from "../../shared/dev_worktree"

// Run from source, the worktree and the branch it runs from (see src/shared/dev_worktree.ts); null when released
const read = (): DevWorktree | null => {
    if (app.isPackaged) return null
    // Run from source, the app's path is the checkout's
    const dir = app.getAppPath()
    let branch = '?'
    try {
        branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim()
    } catch {
        // Not a git checkout: the worktree's name is enough
    }
    return { branch, worktree: worktreeName(dir), hue: branchHue(branch) }
}

export const devWorktree = read()

// The Dock icon tells the instances apart too: the branch as its badge
export const initDevWorktree = () => {
    if (devWorktree) app.dock?.setBadge(devWorktree.branch)
}
