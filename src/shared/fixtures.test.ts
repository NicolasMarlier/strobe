import { describe, expect, it } from 'vitest'
import { BUILT_IN_FIXTURES, cellChannels, cellFog, cellLayouts, cellLight, fixtureLookup, fixtureProfileErrors, isCellBlack, setCellColor } from './fixtures'
import { getDmxSignalAt } from './dmx_signal'
import DmxBoom from '../main/dmx/effects/DmxBoom'
import { emptyDmxHexString } from '../main/utils'

const fixtureOf = fixtureLookup(BUILT_IN_FIXTURES)

const element = (fixture: string, channel: number, cells: number): SceneElement =>
    ({ fixture, channel, cells, position: [0, 0, 0], rotation: [0, 0, 0] })

const scene = [element('led-bar', 1, 2), element('fog-machine', 7, 1)]
const layouts = cellLayouts(scene, fixtureOf)

const button: DmxButton = {
    id: 'b', track_id: null, color: '#804020', duration_ms: 1000,
    red_channels: [1, 4, 7], nature: 'Boom', triggering_midi_key: null,
}

describe('fixtures', () => {
    it('lists the cells of an element by their first channel', () => {
        expect(cellChannels(scene[0], fixtureOf('led-bar'))).toEqual([1, 4])
        expect(cellChannels(scene[1], fixtureOf('fog-machine'))).toEqual([7])
    })

    it('knows what each cell does, RGB where no element starts a cell', () => {
        expect(layouts(4)).toEqual(['red', 'green', 'blue'])
        expect(layouts(7)).toEqual(['fog'])
        expect(layouts(100)).toEqual(['red', 'green', 'blue'])
    })

    it('makes fog with the brightness of the color, and no light', () => {
        const signal = setCellColor(emptyDmxHexString(), 7, ['fog'], [128, 64, 32])
        expect(getDmxSignalAt(signal, 7)).toBe(128)
        expect(getDmxSignalAt(signal, 8)).toBe(0)
        expect(cellFog(signal, 7, ['fog'])).toBeCloseTo(128 / 255)
        expect(cellLight(signal, 7, ['fog'])).toEqual([0, 0, 0])
        expect(isCellBlack(signal, 7, ['fog'])).toBe(false)
    })

    it('sets the white of a cell to what the three colors share', () => {
        const signal = setCellColor(emptyDmxHexString(), 1, ['red', 'green', 'blue', 'white'], [200, 100, 50])
        expect([1, 2, 3, 4].map(channel => getDmxSignalAt(signal, channel))).toEqual([200, 100, 50, 50])
    })

    it('runs effects on every kind of cell: a Boom bursts fog and fades it', () => {
        const trigger: DmxButtonTrigger = { at: 0, state: 'up' }
        const signal = DmxBoom.transformDmxHexSignal(emptyDmxHexString(), 0.5, button, trigger, layouts)
        // The bar's dots, at half the color
        expect([1, 2, 3, 4, 5, 6].map(channel => getDmxSignalAt(signal, channel))).toEqual([64, 32, 16, 64, 32, 16])
        // The fog machine, at half the color's brightness, without touching the next channels
        expect(getDmxSignalAt(signal, 7)).toBe(64)
        expect(getDmxSignalAt(signal, 8)).toBe(0)
    })

    it('draws an element of an unknown fixture as RGB cells', () => {
        expect(fixtureOf('mystery')).toMatchObject({ id: 'mystery', cell: ['red', 'green', 'blue'] })
    })

    it('checks fixture files', () => {
        BUILT_IN_FIXTURES.forEach(fixture => expect(fixtureProfileErrors(fixture)).toEqual([]))
        expect(fixtureProfileErrors([])).not.toEqual([])
        expect(fixtureProfileErrors({ ...BUILT_IN_FIXTURES[0], cell: ['red', 'uv'] })).toEqual([
            'cell must list its channels, each one of red, green, blue, white, fog',
        ])
        expect(fixtureProfileErrors({ ...BUILT_IN_FIXTURES[0], size: [1, 0], cells: 0 })).toEqual([
            'size must be [width, height, depth] in meters',
            'cells must be a whole number, at least 1',
        ])
    })
})
