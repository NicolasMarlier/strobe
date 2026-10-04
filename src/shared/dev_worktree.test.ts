import { describe, expect, it } from 'vitest'
import { branchHue, devPorts, worktreeName } from './dev_worktree'

describe('worktreeName', () => {
    it('is the folder in .claude/worktrees', () => {
        expect(worktreeName('/Users/n/strobe/.claude/worktrees/crash-monitoring')).toBe('crash-monitoring')
    })

    it('is null for the main checkout', () => {
        expect(worktreeName('/Users/n/strobe')).toBeNull()
    })
})

describe('devPorts', () => {
    it("keeps Forge's defaults for the main checkout", () => {
        expect(devPorts(null)).toEqual({ port: 3000, loggerPort: 9000 })
    })

    it('gives a worktree others, the same ones each time', () => {
        const ports = devPorts('crash-monitoring')
        expect(ports).toEqual(devPorts('crash-monitoring'))
        expect(ports.port).toBeGreaterThan(3000)
        expect(ports.port).toBeLessThan(4000)
        expect(ports.loggerPort).toBe(ports.port + 6000)
    })

    it('gives different worktrees different ones', () => {
        expect(devPorts('crash-monitoring').port).not.toBe(devPorts('dev-worktrees').port)
    })

    it('takes STROBE_DEV_PORT over them', () => {
        expect(devPorts('crash-monitoring', '3500')).toEqual({ port: 3500, loggerPort: 9500 })
    })
})

describe('branchHue', () => {
    it('is a hue, the same one each time', () => {
        expect(branchHue('main')).toBe(branchHue('main'))
        expect(branchHue('main')).toBeGreaterThanOrEqual(0)
        expect(branchHue('main')).toBeLessThan(360)
    })
})
