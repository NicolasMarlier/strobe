import { describe, it, expect } from 'vitest'
import { doRectanglesIntersect } from './utils'

const rect = (x0: number, y0: number, x1: number, y1: number) => ({ x0, y0, x1, y1 })

describe('doRectanglesIntersect', () => {
    it('returns true for identical rectangles', () => {
        expect(doRectanglesIntersect(rect(0, 0, 10, 10), rect(0, 0, 10, 10))).toBe(true)
    })

    it('returns true for partial overlap', () => {
        expect(doRectanglesIntersect(rect(0, 0, 5, 5), rect(3, 3, 8, 8))).toBe(true)
    })

    it('returns true when one rectangle is fully inside the other', () => {
        expect(doRectanglesIntersect(rect(0, 0, 10, 10), rect(2, 2, 4, 4))).toBe(true)
    })

    it('returns true when only x-axis overlaps but y does not', () => {
        // x overlaps [0,5] ∩ [3,8], y does not overlap [0,5] ∩ [6,10]
        expect(doRectanglesIntersect(rect(0, 0, 5, 5), rect(3, 6, 8, 10))).toBe(false)
    })

    it('returns true when only y-axis overlaps but x does not', () => {
        // y overlaps [0,5] ∩ [3,8], x does not overlap [0,5] ∩ [6,10]
        expect(doRectanglesIntersect(rect(0, 0, 5, 5), rect(6, 3, 10, 8))).toBe(false)
    })

    it('returns false when rectangles are completely apart (B to the right of A)', () => {
        expect(doRectanglesIntersect(rect(0, 0, 5, 5), rect(10, 0, 15, 5))).toBe(false)
    })

    it('returns false when rectangles are completely apart (B below A)', () => {
        expect(doRectanglesIntersect(rect(0, 0, 5, 5), rect(0, 10, 5, 15))).toBe(false)
    })

    it('returns false when rectangles are completely apart (B to the left of A)', () => {
        expect(doRectanglesIntersect(rect(10, 0, 15, 5), rect(0, 0, 5, 5))).toBe(false)
    })

    it('returns false when rectangles are completely apart (B above A)', () => {
        expect(doRectanglesIntersect(rect(0, 10, 5, 15), rect(0, 0, 5, 5))).toBe(false)
    })

    it('handles rectangles defined with swapped corners (x1 < x0)', () => {
        // user may drag selection right-to-left
        expect(doRectanglesIntersect(rect(5, 5, 0, 0), rect(3, 3, 8, 8))).toBe(true)
    })

    it('handles edge-touching rectangles (shared border)', () => {
        // touching but not overlapping — x segments touch at x=5
        expect(doRectanglesIntersect(rect(0, 0, 5, 5), rect(5, 0, 10, 5))).toBe(false)
    })
})
