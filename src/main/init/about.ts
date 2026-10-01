import { app } from "electron"

// The About Strobe panel of the app menu: the version, and the commit it was built from,
// so that feedback tells exactly which build it's about
export const initAboutPanel = () => {
    app.setAboutPanelOptions({
        applicationName: app.getName(),
        applicationVersion: app.getVersion(),
        // Shown in parentheses after the version
        version: app.isPackaged ? STROBE_COMMIT : `${STROBE_COMMIT}, dev`,
        copyright: '© 2026 Nicolas Marlier',
        credits: 'A DMX show runner on your MacBook',
    })
}
