import { app } from "electron"
import os from "os"
import * as Sentry from "@sentry/electron/main"
import type { Breadcrumb, ErrorEvent } from "@sentry/electron/main"
import { isTelemetryEnabled } from "./telemetry"

// Crash reports, sent to Sentry: the errors nobody caught, in the main process and in the window, and the
// native crashes (a crash dump, sent at the next launch). Turned off with the anonymous usage statistics, in
// Strobe › Share Anonymous Usage Statistics and Crash Reports (the README's Privacy section lists what is sent)

// The Strobe project of Sentry (its Client Keys): public, it only lets send events to the project
const SENTRY_DSN = 'https://6eb2d2ee078bbfd79f73ea72851502d0@o4512196976377856.ingest.de.sentry.io/4512196981227600'

// Only the released app sends them; from source (yarn start), only with STROBE_CRASH_REPORTS=1, to check them
const sends = () => app.isPackaged || process.env.STROBE_CRASH_REPORTS == '1'

// What could tell about a show: a file's path (the show's folder, its audio), from the home folder or the
// show-audio:// protocol. Paths in quotes first, as Node's errors write them. Out of quotes, a path may have
// spaces: it's hidden up to the end of the line (the URLs of show-audio:// have none, they're encoded)
const QUOTED_PATH = /(['`])(?:\/|~\/|show-audio:)[^'`]*\1/g
const PATH = /(?:~\/|\/Users\/|\/Volumes\/)[^"'`\\\n]*/g
const AUDIO_URL = /show-audio:\/\/[^\s"'`\\]*/g
const HOME = os.homedir()

const scrub = (text: string) => text
    .split(HOME).join('~')
    .replace(QUOTED_PATH, '$1<path>$1')
    .replace(PATH, '<path>')
    .replace(AUDIO_URL, '<path>')

// What the console prints may name a show, and the requests carry the audio's path: neither is kept. A click
// tells the element clicked, with its title and aria-label (a track's name, maybe): only its tag and classes
const sortBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb | null => {
    if (['console', 'fetch', 'xhr', 'navigation'].includes(breadcrumb.category ?? '')) return null
    if (breadcrumb.category?.startsWith('ui.')) {
        return { ...breadcrumb, message: breadcrumb.message?.replace(/\[[^\]]*\]/g, '') }
    }
    return breadcrumb
}

// The whole event goes through it: messages, values of the exceptions, breadcrumbs, contexts. The window's
// breadcrumbs come with its events, without going through beforeBreadcrumb: they are sorted here
const scrubEvent = (event: ErrorEvent): ErrorEvent => {
    const breadcrumbs = event.breadcrumbs?.map(sortBreadcrumb).filter(b => b != null)
    return JSON.parse(scrub(JSON.stringify({ ...event, breadcrumbs })))
}

// On import, the first one of src/index.ts: before the rest of the main process loads, the native modules
// (USB, MIDI) too, so that their crashes are reported
if (sends()) {
    Sentry.init({
        dsn: SENTRY_DSN,
        // Neither the IP address nor anything else about the person, nor the values of the variables where it
        // happened, which could hold a show's content
        dataCollection: { userInfo: false, stackFrameVariables: false },
        // Off too: it would read them
        integrations: (defaults) => defaults.filter(i => i.name != 'LocalVariables'),
        beforeBreadcrumb: sortBreadcrumb,
        // Read for each one: turning the setting off in the menu stops them right away
        beforeSend: (event) => isTelemetryEnabled() ? scrubEvent(event) : null,
    })
}
