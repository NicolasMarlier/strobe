import EventEmitter from "events"
import fs from "fs"
import path from "path"
import { BUILT_IN_FIXTURES, fixtureLookup, fixtureProfileErrors, FixtureLookup } from "../shared/fixtures"

export const FIXTURE_LIBRARY_EVENTS = {
    CHANGED: 'changed',
}

// Reads the fixture files of `dir` (*.json, one fixture each). A file that isn't a valid fixture is skipped,
// and so is one reusing a fixture id already taken: each comes with a problem to show
export const readFixtureFiles = (dir: string, taken: string[]): FixtureLibraryContents => {
    const fixtures: FixtureProfile[] = []
    const problems: string[] = []
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort() : []

    files.forEach(file => {
        let json: unknown
        try {
            json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
        } catch (e) {
            problems.push(`${file}: not valid JSON (${(e as Error).message})`)
            return
        }
        const errors = fixtureProfileErrors(json)
        if (errors.length > 0) {
            problems.push(`${file}: ${errors.join(', ')}`)
            return
        }
        const fixture = json as FixtureProfile
        if ([...taken, ...fixtures.map(({ id }) => id)].includes(fixture.id)) {
            problems.push(`${file}: the id "${fixture.id}" is already used by another fixture`)
            return
        }
        fixtures.push(fixture)
    })
    return { fixtures, problems }
}

// The fixtures elements can be made of: the built-in ones, then the files of the Fixtures folder.
// Changing the folder's files reloads them
export class FixtureLibrary extends EventEmitter {
    private static instance: FixtureLibrary

    private dir: string | undefined
    private contents: FixtureLibraryContents = { fixtures: BUILT_IN_FIXTURES, problems: [] }
    private lookup: FixtureLookup = fixtureLookup(BUILT_IN_FIXTURES)

    static getInstance(): FixtureLibrary {
        if (!FixtureLibrary.instance) {
            FixtureLibrary.instance = new FixtureLibrary()
        }
        return FixtureLibrary.instance
    }

    // Loads the files of `dir`, and watches it from then on
    watch = (dir: string) => {
        this.dir = dir
        fs.mkdirSync(dir, { recursive: true })
        this.reload()
        // Editors save in several steps: reload once they're done
        let timeout: NodeJS.Timeout | undefined
        fs.watch(dir, () => {
            clearTimeout(timeout)
            timeout = setTimeout(this.reload, 200)
        })
    }

    folder = () => this.dir

    reload = () => {
        const files = this.dir
            ? readFixtureFiles(this.dir, BUILT_IN_FIXTURES.map(({ id }) => id))
            : { fixtures: [], problems: [] }
        this.contents = { fixtures: [...BUILT_IN_FIXTURES, ...files.fixtures], problems: files.problems }
        this.lookup = fixtureLookup(this.contents.fixtures)
        files.problems.forEach(problem => console.warn(`Fixture skipped: ${problem}`))
        this.emit(FIXTURE_LIBRARY_EVENTS.CHANGED)
    }

    list = (): FixtureLibraryContents => structuredClone(this.contents)

    fixtureOf: FixtureLookup = (id) => this.lookup(id)
}
