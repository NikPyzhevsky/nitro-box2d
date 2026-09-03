import { describe, expect, test } from 'react-native-harness'

import { box2d, degToRad, radToDeg } from 'nitro-box2d'

describe('nitro-box2d module', () => {
  test('the Hybrid Object is registered and reachable', () => {
    expect(box2d).toBeDefined()
    expect(typeof box2d.createWorld).toBe('function')
  })

  test('reports the vendored Box2D version', () => {
    expect(box2d.version).toMatch(/^\d+\.\d+\.\d+$/)
    // Everything in this suite is written against the v3 C API.
    expect(box2d.version.startsWith('3.')).toBe(true)
  })

  test('length units default to metres', () => {
    expect(box2d.getLengthUnitsPerMeter()).toBe(1)
  })

  test('rejects a length unit scale of zero', () => {
    expect(() => box2d.setLengthUnitsPerMeter(0)).toThrow()
    expect(box2d.getLengthUnitsPerMeter()).toBe(1)
  })

  test('angle helpers round-trip', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 6)
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 6)
  })
})
