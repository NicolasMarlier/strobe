import { getDmxSignalAt, setDmxAt } from "./dmx_signal"

export const DMX_CHANNELS = 512

const RGB: FixtureChannelKind[] = ['red', 'green', 'blue']

// Fixtures every show can use. Others are JSON files in the Fixtures folder (see main/fixture_library.ts)
export const BUILT_IN_FIXTURES: FixtureProfile[] = [
    {
        id: 'led-bar',
        name: 'LED bar',
        shape: 'bar',
        // Every bar has the same length, whatever its dot count
        size: [1, 0.1, 0.06],
        cell: RGB,
        cells: 8,
        resizable: true,
        cell_label: 'Dots',
    },
    {
        id: 'fog-machine',
        name: 'Fog machine',
        shape: 'box',
        size: [0.45, 0.22, 0.3],
        cell: ['fog'],
        cells: 1,
    },
]

export const LED_BAR = BUILT_IN_FIXTURES[0]

// An element whose fixture isn't known here (e.g. a show made with a fixture file this computer doesn't have):
// drawn as a box of RGB cells, so its channels can still be seen and linked
export const unknownFixture = (id: string): FixtureProfile => ({
    id,
    name: `Unknown (${id})`,
    shape: 'box',
    size: [0.3, 0.3, 0.3],
    cell: RGB,
    cells: 1,
})

export type FixtureLookup = (id: string) => FixtureProfile

export const fixtureLookup = (fixtures: FixtureProfile[]): FixtureLookup => {
    const byId = new Map(fixtures.map(fixture => [fixture.id, fixture]))
    return (id) => byId.get(id) ?? unknownFixture(id)
}

// Channels an element takes
export const footprint = (element: Pick<SceneElement, 'cells'>, fixture: FixtureProfile) =>
    element.cells * fixture.cell.length

// First channel of each of the element's cells: what DMX buttons link to
export const cellChannels = (element: Pick<SceneElement, 'channel' | 'cells'>, fixture: FixtureProfile) =>
    Array.from({ length: element.cells }, (_, i) => element.channel + i * fixture.cell.length)

// The cells' layouts by first channel, for the effects. Channels no element starts a cell at are RGB dots,
// as they were before fixtures: buttons linked to channels with nothing in the scene keep working
export type CellLayouts = (channel: number) => FixtureChannelKind[]

export const cellLayouts = (elements: SceneElement[], fixtureOf: FixtureLookup): CellLayouts => {
    const layouts = new Map<number, FixtureChannelKind[]>()
    elements.forEach(element => {
        const fixture = fixtureOf(element.fixture)
        cellChannels(element, fixture).forEach(channel => layouts.set(channel, fixture.cell))
    })
    return (channel) => layouts.get(channel) ?? RGB
}

type RGBColor = [number, number, number]

// What a channel gets from a color (0-255 each): fog goes with the color's brightness, so a white Boom is a burst of fog
const channelValue = (kind: FixtureChannelKind, [red, green, blue]: RGBColor) => {
    switch (kind) {
        case 'red': return red
        case 'green': return green
        case 'blue': return blue
        case 'white': return Math.min(red, green, blue)
        case 'fog': return Math.max(red, green, blue)
    }
}

// Sets a cell starting at `channel` to the color
export const setCellColor = (dmxHexSignal: string, channel: number, layout: FixtureChannelKind[], color: RGBColor) =>
    layout.reduce(
        (signal, kind, i) => setDmxAt(signal, channel + i, Math.floor(channelValue(kind, color))),
        dmxHexSignal,
    )

// Whether all the cell's channels are at 0
export const isCellBlack = (dmxHexSignal: string, channel: number, layout: FixtureChannelKind[]) =>
    layout.every((_, i) => getDmxSignalAt(dmxHexSignal, channel + i) == 0)

// The light a cell gives (0-1 each), for the scene: white adds to all three colors. Fog gives no light
export const cellLight = (dmxHexSignal: string, channel: number, layout: FixtureChannelKind[]): RGBColor => {
    const light: RGBColor = [0, 0, 0]
    layout.forEach((kind, i) => {
        const value = getDmxSignalAt(dmxHexSignal, channel + i) / 255
        if (kind == 'red') light[0] += value
        if (kind == 'green') light[1] += value
        if (kind == 'blue') light[2] += value
        if (kind == 'white') light.forEach((_, c) => light[c] += value)
    })
    return light.map(value => Math.min(1, value)) as RGBColor
}

// How much fog a cell makes (0-1)
export const cellFog = (dmxHexSignal: string, channel: number, layout: FixtureChannelKind[]) =>
    Math.max(0, ...layout.map((kind, i) => kind == 'fog' ? getDmxSignalAt(dmxHexSignal, channel + i) / 255 : 0))

// Height of an element's center when it rests on the floor
export const floorHeight = (fixture: FixtureProfile) => fixture.size[1] / 2

// Where the nth element goes by default: rows of 3 on the floor, each row 1 m further upstage
const PER_ROW = 3
export const defaultPosition = (index: number, fixture: FixtureProfile): Vector3Tuple => [
    ((index % PER_ROW) - 1) * 2.5,
    floorHeight(fixture),
    -1 - Math.floor(index / PER_ROW),
]

// Back to the middle of the stage, on the floor
export const centerPosition = (fixture: FixtureProfile): Vector3Tuple => [0, floorHeight(fixture), 0]

// Whether some JSON describes a fixture: checked on the fixture files, which people write by hand
const CHANNEL_KINDS: FixtureChannelKind[] = ['red', 'green', 'blue', 'white', 'fog']
const isPositive = (value: unknown) => typeof value == 'number' && value > 0

export const fixtureProfileErrors = (json: unknown): string[] => {
    if (typeof json != 'object' || json == null) return ['not a JSON object']
    const f = json as Record<string, unknown>
    const errors = []
    if (typeof f.id != 'string' || !f.id) errors.push('id must be a non-empty string')
    if (typeof f.name != 'string' || !f.name) errors.push('name must be a non-empty string')
    if (f.shape != 'bar' && f.shape != 'box') errors.push('shape must be "bar" or "box"')
    if (!Array.isArray(f.size) || f.size.length != 3 || !f.size.every(isPositive)) {
        errors.push('size must be [width, height, depth] in meters')
    }
    if (!Array.isArray(f.cell) || f.cell.length == 0 || !f.cell.every(kind => CHANNEL_KINDS.includes(kind))) {
        errors.push(`cell must list its channels, each one of ${CHANNEL_KINDS.join(', ')}`)
    }
    if (!Number.isInteger(f.cells) || !isPositive(f.cells)) errors.push('cells must be a whole number, at least 1')
    if (f.resizable !== undefined && typeof f.resizable != 'boolean') errors.push('resizable must be true or false')
    if (f.cell_label !== undefined && typeof f.cell_label != 'string') errors.push('cell_label must be a string')
    return errors
}
