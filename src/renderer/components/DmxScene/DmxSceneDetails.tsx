import '../DesignSystem/DetailsPanel/DetailsPanel.scss'
import './DmxSceneDetails.scss'
import { useState } from 'react'
import { useDmxSceneContext } from '../../contexts/DmxSceneContext'
import { centerPosition, defaultPosition, DMX_CHANNELS, footprint, type FixtureLookup } from '../../../shared/fixtures'
import ConfirmModal from '../DesignSystem/ConfirmModal/ConfirmModal'
import { TrashIcon } from '../DesignSystem/Icons'
import { usePanelTransition } from '../DesignSystem/DetailsPanel/usePanelTransition'

interface Field {
    key: 'channel' | 'cells'
    label: string
    max: number
}

// The fields of an element: its first channel, and its cell count when its fixture lets it change
const fieldsFor = (fixture: FixtureProfile): Field[] => [
    { key: 'channel', label: 'Channel', max: DMX_CHANNELS },
    ...(fixture.resizable
        ? [{ key: 'cells' as const, label: fixture.cell_label ?? 'Cells', max: Math.floor(DMX_CHANNELS / fixture.cell.length) }]
        : []),
]

// First channel after the last element, so a new one doesn't overlap the others
const nextFreeChannel = (elements: SceneElement[], fixtureOf: FixtureLookup) =>
    Math.max(1, ...elements.map(element => element.channel + footprint(element, fixtureOf(element.fixture))))

// Elements are named after their fixture, numbered among those of the same fixture
const elementName = (elements: SceneElement[], index: number, fixtureOf: FixtureLookup) => {
    const { fixture } = elements[index]
    const number = elements.slice(0, index + 1).filter(element => element.fixture == fixture).length
    return `${fixtureOf(fixture).name}-${number}`
}

// DMX channels an element uses
const channelRange = (element: SceneElement, fixture: FixtureProfile) => {
    const last = element.channel + footprint(element, fixture) - 1
    return last == element.channel ? `${element.channel}` : `${element.channel}–${last}`
}

// Panel on the right of the scene: the elements list, or the selected element's settings
const DmxSceneDetails = () => {
    const { dmxScene, updateDmxScene, placeElement, selectedElementIndex, setSelectedElementIndex, fixtures, fixtureProblems, fixtureOf } = useDmxSceneContext()
    // DELETE asks first
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    // "+ Add an element" lists the fixtures to pick from
    const [picking, setPicking] = useState(false)
    const elements = dmxScene.elements
    const selectedElement = selectedElementIndex == undefined ? undefined : elements[selectedElementIndex]
    const selectedFixture = selectedElement && fixtureOf(selectedElement.fixture)

    // An element's settings come in from the right, over the list; the list comes back from the left
    const transition = usePanelTransition(!!selectedElement)

    const updateElement = (index: number, element: SceneElement) =>
        updateDmxScene({ elements: elements.map((current, i) => i == index ? element : current) })

    // The new element opens right away, like a new DMX button
    const addElement = (fixture: FixtureProfile) => {
        const channels = fixture.cells * fixture.cell.length
        updateDmxScene({ elements: [
            ...elements,
            {
                fixture: fixture.id,
                channel: Math.min(nextFreeChannel(elements, fixtureOf), DMX_CHANNELS - channels + 1),
                cells: fixture.cells,
                // Moved and rotated by dragging it in the scene
                position: defaultPosition(elements.length, fixture),
                rotation: [0, 0, 0],
            },
        ]})
        setPicking(false)
        setSelectedElementIndex(elements.length)
    }

    const deleteElement = (index: number) => {
        updateDmxScene({ elements: elements.filter((_, i) => i != index) })
        setSelectedElementIndex(undefined)
    }

    if (selectedElementIndex == undefined || !selectedElement || !selectedFixture) {
        return <div className={`details-panel dmx-scene-details ${transition}`}>
            <label>Elements</label>
            <div className='elements-list'>
                { elements.map((element, index) => (
                    <div key={index} className='elements-list-item' onClick={() => setSelectedElementIndex(index)}>
                        <span className='name'>{elementName(elements, index, fixtureOf)}</span>
                        <span className='channels'>{ channelRange(element, fixtureOf(element.fixture)) }</span>
                    </div>
                ))}
            </div>

            { picking
                ? <div className='fixture-picker'>
                    { fixtures.map(fixture => (
                        <div key={fixture.id} className='elements-list-item' onClick={() => addElement(fixture)}>
                            <span className='name'>{fixture.name}</span>
                            <span className='channels'>{fixture.cells * fixture.cell.length} ch</span>
                        </div>
                    ))}
                    {/* Fixture files that couldn't be read: say why, so they can be fixed */}
                    { fixtureProblems.map(problem => <div key={problem} className='fixture-problem'>{problem}</div>) }
                    <div className='btn empty add-element' onClick={() => setPicking(false)}>Cancel</div>
                </div>
                : <div className='btn empty add-element' onClick={() => setPicking(true)}>+ Add an element</div>
            }
        </div>
    }

    const onFieldChange = (field: Field, value: string) => {
        const number = parseInt(value, 10)
        // Let the field be empty or incomplete while typing
        if (Number.isNaN(number)) return
        updateElement(selectedElementIndex, { ...selectedElement, [field.key]: Math.min(field.max, Math.max(1, number)) })
    }

    const name = elementName(elements, selectedElementIndex, fixtureOf)

    // The inputs keep what's typed: rebuild them for another element, or when the elements move around,
    // so they never show the values of the element that was selected before
    return <div key={`${selectedElementIndex}-${elements.length}`} className={`details-panel dmx-scene-details ${transition}`}>
        <div className='back-btn btn' onClick={() => setSelectedElementIndex(undefined)}>← All elements</div>

        <div className='details-header'>{name}</div>

        { fieldsFor(selectedFixture).map(field => (
            <div key={field.key}>
                <label>{field.label}</label>
                <input
                    type='number'
                    defaultValue={selectedElement[field.key]}
                    min={1}
                    max={field.max}
                    step={1}
                    onChange={(e) => onFieldChange(field, e.target.value)}
                    // Show the value actually kept (bounded, rounded) once done typing
                    onBlur={(e) => { e.target.value = String(selectedElement[field.key]) }}/>
            </div>
        ))}

        {/* Back to the middle of the stage, facing the audience */}
        <div
            className='reset-btn btn'
            onClick={() => placeElement(selectedElementIndex, { position: centerPosition(selectedFixture), rotation: [0, 0, 0] })}>
            RESET POSITION
        </div>

        <div className='delete-icon-btn' title='Delete' onClick={() => setConfirmingDelete(true)}><TrashIcon/></div>

        { confirmingDelete && <ConfirmModal
            title={`Delete ${name}?`}
            message='It will be removed from the scene. The DMX buttons keep their channels.'
            confirmLabel='Delete'
            onConfirm={() => { setConfirmingDelete(false); deleteElement(selectedElementIndex) }}
            onCancel={() => setConfirmingDelete(false)}/> }
    </div>
}

export default DmxSceneDetails
