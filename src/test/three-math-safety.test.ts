import { describe, it, expect } from 'vitest'

/**
 * Tests for math safety functions used in 3D components.
 * These test the patterns we use to prevent NaN values in Three.js geometries.
 */
describe('Three.js Math Safety', () => {
  describe('sqrt safety', () => {
    it('should clamp negative values before sqrt', () => {
      // Pattern used in QuantumField (EnhancedBlochSphere.tsx)
      const testCases = [
        { r: 1, y: 2 }, // Would produce negative: 1 - 4*0.95 = -2.8
        { r: 1, y: 1.1 }, // Would produce negative: 1 - 1.21*0.95 = -0.15
        { r: 0.5, y: 0.6 }, // Would produce negative
      ]

      for (const { r, y } of testCases) {
        // Without clamping, r*r - y*y*0.95 would be negative, causing NaN
        const safeValue = Math.max(0.0001, r * r - y * y * 0.95)
        const result = Math.sqrt(safeValue)

        expect(Number.isNaN(result)).toBe(false)
        expect(Number.isFinite(result)).toBe(true)
        expect(result).toBeGreaterThanOrEqual(0)
      }
    })

    it('should handle zero radius in sqrt', () => {
      const r = 0
      const y = 0
      const safeValue = Math.max(0.0001, r * r - y * y * 0.95)
      const result = Math.sqrt(safeValue)

      expect(Number.isNaN(result)).toBe(false)
      expect(Number.isFinite(result)).toBe(true)
    })
  })

  describe('division safety', () => {
    it('should prevent division by zero in height/radius', () => {
      // Pattern used in Sparkles (EnhancedParticles.tsx)
      const testCases = [
        { height: 10, radius: 0 },
        { height: 10, radius: 0.0001 },
        { height: 10, radius: -1 },
      ]

      for (const { height, radius } of testCases) {
        const safeRadius = Math.max(0.1, radius)
        const heightScale = height / safeRadius

        expect(Number.isNaN(heightScale)).toBe(false)
        expect(Number.isFinite(heightScale)).toBe(true)
      }
    })

    it('should prevent division by zero in normalization', () => {
      // Pattern used in QuantumField particle normalization
      const testCases = [
        { dist: 0 },
        { dist: 0.00001 },
        { dist: -0.1 },
      ]

      const radius = 1.5

      for (const { dist } of testCases) {
        const safeDist = Math.max(0.0001, dist)
        const normalize = radius / safeDist

        expect(Number.isNaN(normalize)).toBe(false)
        expect(Number.isFinite(normalize)).toBe(true)
      }
    })
  })

  describe('radius range safety', () => {
    it('should ensure inner radius is less than outer radius', () => {
      // Pattern used in VortexParticles (QuantumEffects.tsx)
      const testCases = [
        { inner: 0, outer: 0 },
        { inner: 5, outer: 3 }, // inner > outer
        { inner: -1, outer: 2 },
        { inner: 0, outer: 0.05 },
      ]

      for (const { inner, outer } of testCases) {
        const safeInner = Math.max(0.1, inner)
        const safeOuter = Math.max(safeInner + 0.1, outer)

        expect(safeInner).toBeGreaterThanOrEqual(0.1)
        expect(safeOuter).toBeGreaterThan(safeInner)

        // Generate a random radius in range
        const radius = safeInner + Math.random() * (safeOuter - safeInner)
        expect(Number.isNaN(radius)).toBe(false)
        expect(Number.isFinite(radius)).toBe(true)
        expect(radius).toBeGreaterThanOrEqual(safeInner)
        expect(radius).toBeLessThanOrEqual(safeOuter)
      }
    })
  })

  describe('particle position generation', () => {
    it('should generate valid spherical coordinates', () => {
      const count = 100
      const radius = 10
      const height = 8

      const safeRadius = Math.max(0.1, radius)
      const heightScale = height / safeRadius

      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const r = Math.pow(Math.random(), 0.5) * safeRadius

        const x = r * Math.sin(phi) * Math.cos(theta)
        const y = (r * Math.cos(phi)) * heightScale
        const z = r * Math.sin(phi) * Math.sin(theta)

        expect(Number.isNaN(x)).toBe(false)
        expect(Number.isNaN(y)).toBe(false)
        expect(Number.isNaN(z)).toBe(false)
        expect(Number.isFinite(x)).toBe(true)
        expect(Number.isFinite(y)).toBe(true)
        expect(Number.isFinite(z)).toBe(true)
      }
    })
  })
})
