import './SelectionLink.scss'
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'

type Link = {
    path: string
    endX: number
    endY: number
}

// Radius of the corner where the line turns from the button toward the details panel
const CORNER_RADIUS = 8

// Half of the row gap between the buttons (see .dmx-buttons): the line runs there, between the rows
const LANE_OFFSET = 12

// The button's color when it's a valid hex bright enough to glow on the dark UI, white otherwise
const linkColor = (color: string | undefined) => {
    if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return '#ffffff'
    const channels = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
    return Math.max(...channels) >= 0x60 ? color : '#ffffff'
}

// Glowing line from the selected DMX button to the details panel.
// Rendered inside the buttons section, which it measures (the section must be `position: relative`)
const SelectionLink = () => {
    const { dmxButtons, selectedDmxButtonId } = useDmxButtonsContext()
    const svgRef = useRef<SVGSVGElement>(null)
    const [link, setLink] = useState<Link | null>(null)

    const color = linkColor(dmxButtons.find(({ id }) => id == selectedDmxButtonId)?.color)

    useLayoutEffect(() => {
        const section = svgRef.current?.parentElement
        if (!section || !selectedDmxButtonId) {
            setLink(null)
            return
        }

        const measure = () => {
            const button = section.querySelector('.dmx-button.selected')
            const panel = section.querySelector('.dmx-button-details')
            if (!button || !panel) return setLink(null)

            // In the section's scrolled content coordinates, so the line scrolls with the buttons
            const sectionRect = section.getBoundingClientRect()
            const x = (clientX: number) => clientX - sectionRect.left + section.scrollLeft
            const y = (clientY: number) => clientY - sectionRect.top + section.scrollTop

            const buttonRect = button.getBoundingClientRect()
            const startX = x(buttonRect.left + buttonRect.width / 2)
            const startY = y(buttonRect.bottom)
            const laneY = startY + LANE_OFFSET
            const endX = x(panel.getBoundingClientRect().left)

            // Down out of the button, then right along the gap below its row, into the panel
            setLink({
                path: `M ${startX} ${startY} V ${laneY - CORNER_RADIUS} Q ${startX} ${laneY} ${startX + CORNER_RADIUS} ${laneY} H ${endX}`,
                endX,
                endY: laneY,
            })
        }

        measure()
        // Buttons wrap to other rows when the section is resized
        const observer = new ResizeObserver(measure)
        observer.observe(section)
        Array.from(section.children).forEach(child => observer.observe(child))
        return () => observer.disconnect()
    }, [selectedDmxButtonId, dmxButtons])

    return <svg ref={svgRef} className='selection-link' style={{ '--link-color': color } as CSSProperties}>
        { link &&
            // Keyed on the selection so the line draws itself again for each newly selected button
            <g key={selectedDmxButtonId}>
                <path className='glow' d={link.path} pathLength={1}/>
                <path className='core' d={link.path} pathLength={1}/>
                <path className='pulses' d={link.path}/>
                <circle className='end' cx={link.endX} cy={link.endY} r={3.5}/>
            </g>
        }
    </svg>
}

export default SelectionLink
