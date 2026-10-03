import { defineConfig } from 'vitest/config'

// Only the sources' tests: dist/ holds stale compiled copies of them
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
    },
})
