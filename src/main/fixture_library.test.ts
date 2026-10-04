import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { readFixtureFiles } from './fixture_library'

let tmp: string

const PAR: FixtureProfile = { id: 'par-rgbw', name: 'PAR RGBW', shape: 'box', size: [0.2, 0.2, 0.2], cell: ['red', 'green', 'blue', 'white'], cells: 1 }

const write = (name: string, content: unknown) =>
    fs.writeFileSync(path.join(tmp, name), typeof content == 'string' ? content : JSON.stringify(content))

beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'strobe-fixtures-')) })
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }))

describe('fixture files', () => {
    it('reads the JSON files, and skips the others', () => {
        write('par.json', PAR)
        write('notes.txt', 'not a fixture')
        expect(readFixtureFiles(tmp, [])).toEqual({ fixtures: [PAR], problems: [] })
    })

    it('has no fixtures without a folder', () => {
        expect(readFixtureFiles(path.join(tmp, 'missing'), [])).toEqual({ fixtures: [], problems: [] })
    })

    it('skips invalid files and taken ids, saying why', () => {
        write('a.json', '{ nope')
        write('b.json', { ...PAR, shape: 'sphere' })
        write('c.json', { ...PAR, id: 'led-bar' })
        write('d.json', PAR)
        write('e.json', { ...PAR, name: 'Copy' })

        const { fixtures, problems } = readFixtureFiles(tmp, ['led-bar'])
        expect(fixtures).toEqual([PAR])
        expect(problems).toEqual([
            expect.stringMatching(/^a\.json: not valid JSON/),
            'b.json: shape must be "bar" or "box"',
            'c.json: the id "led-bar" is already used by another fixture',
            'e.json: the id "par-rgbw" is already used by another fixture',
        ])
    })
})
