// Strobe run from source (yarn start) in one of its worktrees, each feature having its own (see the
// feature-worktree skill): several can run at once, each with its own ports, and each window shows which
// one it is, in its own color. Never in the released app

// The worktrees are in .claude/worktrees/<name>; the main checkout has none
export const worktreeName = (dir: string): string | null =>
    dir.match(/[/\\]\.claude[/\\]worktrees[/\\]([^/\\]+)/)?.[1] ?? null

// The same number for a name each time
const hash = (name: string) => {
    let h = 0
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return h
}

// The webpack dev server's and its logger's: Forge's defaults (3000, 9000) for the main checkout, others for
// a worktree, the same ones each time. Two worktrees may get the same, rarely: STROBE_DEV_PORT=<port> then
export const devPorts = (worktree: string | null, override = process.env.STROBE_DEV_PORT) => {
    const port = Number(override) || (worktree ? 3001 + hash(worktree) % 997 : 3000)
    return { port, loggerPort: port + 6000 }
}

// Its color, made from the branch's name, the same one each time: one of 12 hues, 30° apart, so that two
// branches have clearly different ones or the same. Mixed first: close names would get close hues
const mix = (h: number) => {
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
    return (h ^ (h >>> 16)) >>> 0
}
export const branchHue = (branch: string) => mix(hash(branch)) % 12 * 30

// What the window shows (see the 'dev:worktree' channel)
export interface DevWorktree {
    branch: string
    // Its folder in .claude/worktrees, or null for the main checkout
    worktree: string | null
    hue: number
}
