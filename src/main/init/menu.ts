import { BaseWindow, BrowserWindow, Menu, MenuItemConstructorOptions } from "electron"
import { newShow, openRecentShow, openShow, saveShow, saveShowAs } from "../show/document"
import { clearRecentShows, describeRecentShow, listRecentShows, onRecentShowsChange } from "../show/recent_shows"

// Menu callbacks receive the focused window, which is always our BrowserWindow
const onWindow = (action: (win: BrowserWindow) => void) =>
    (_item: unknown, win: BaseWindow | undefined) => {
        if (win instanceof BrowserWindow) action(win)
    }

const openRecentSubmenu = (): MenuItemConstructorOptions[] => {
    const dirs = listRecentShows()
    if (dirs.length == 0) return [{ label: 'No Recent Shows', enabled: false }]

    return [
        ...dirs.map(describeRecentShow).map(({ dir, name, folder }): MenuItemConstructorOptions => ({
            label: name,
            sublabel: folder,
            click: onWindow((win) => openRecentShow(win, dir)),
        })),
        { type: 'separator' },
        { label: 'Clear Menu', click: clearRecentShows },
    ]
}

const buildMenu = () => {
    const template: MenuItemConstructorOptions[] = [
        ...(process.platform == 'darwin' ? [{ role: 'appMenu' } as MenuItemConstructorOptions] : []),
        {
            label: 'File',
            submenu: [
                { label: 'New Show…', accelerator: 'CmdOrCtrl+N', click: onWindow(newShow) },
                { label: 'Open Show…', accelerator: 'CmdOrCtrl+O', click: onWindow(openShow) },
                { label: 'Open Recent', submenu: openRecentSubmenu() },
                { type: 'separator' },
                { label: 'Save', accelerator: 'CmdOrCtrl+S', click: onWindow(saveShow) },
                { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: onWindow(saveShowAs) },
                { type: 'separator' },
                { role: 'close' },
            ],
        },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

export const initMenu = () => {
    buildMenu()
    onRecentShowsChange(buildMenu)
}
