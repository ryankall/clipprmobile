import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock global objects
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Add any additional setup here
beforeAll(() => {
  // Setup global test environment
})

afterAll(() => {
  // Cleanup global test environment
})