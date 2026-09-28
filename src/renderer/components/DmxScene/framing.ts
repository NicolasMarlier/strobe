// The scene is drawn under the whole section, but framed on the part the details panel leaves free:
// the section's padding, and the panel on the right with the gap before it (see .section.scene in App.scss)
const SECTION_PADDING = 20
const DETAILS_PANEL_SPACE = 160 + 20

export interface FramedArea {
    left: number
    top: number
    width: number
    height: number
}

// The visible part of the scene, in the canvas' pixels
export const framedArea = (canvasWidth: number, canvasHeight: number): FramedArea => ({
    left: SECTION_PADDING,
    top: SECTION_PADDING,
    width: Math.max(1, canvasWidth - 2 * SECTION_PADDING - DETAILS_PANEL_SPACE),
    height: Math.max(1, canvasHeight - 2 * SECTION_PADDING),
})
