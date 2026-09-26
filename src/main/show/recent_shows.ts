import { app } from "electron"
import fs from "fs"
import os from "os"
import path from "path"
import { SHOW_EXTENSION } from "./show_file"

const MAX_RECENT_SHOWS = 4

const recentShowsPath = () => path.join(app.getPath('userData'), 'recent-shows.json')

let onChange: () => void = () => undefined

// Called whenever the list changes, so the menu can be rebuilt
export const onRecentShowsChange = (callback: () => void) => { onChange = callback }

// Most recent first
export const listRecentShows = (): string[] => {
    try {
        const dirs = JSON.parse(fs.readFileSync(recentShowsPath(), 'utf8'))
        return Array.isArray(dirs) ? dirs.filter(d => typeof d == 'string').slice(0, MAX_RECENT_SHOWS) : []
    } catch {
        return []
    }
}

const writeRecentShows = (dirs: string[]) => {
    try {
        fs.writeFileSync(recentShowsPath(), JSON.stringify(dirs.slice(0, MAX_RECENT_SHOWS), null, 2))
    } catch (e) {
        console.error('Could not save recent shows', e)
    }
    onChange()
}

const withTilde = (dir: string) => dir.startsWith(os.homedir()) ? `~${dir.slice(os.homedir().length)}` : dir

export const describeRecentShow = (dir: string): RecentShow => ({
    dir,
    name: path.basename(dir, SHOW_EXTENSION),
    folder: withTilde(path.dirname(dir)),
})

export const addRecentShow = (dir: string) => {
    const resolved = path.resolve(dir)
    writeRecentShows([resolved, ...listRecentShows().filter(d => d != resolved)])
}

export const removeRecentShow = (dir: string) =>
    writeRecentShows(listRecentShows().filter(d => d != path.resolve(dir)))

export const clearRecentShows = () => writeRecentShows([])
