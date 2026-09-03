import { afterEach, describe, expect, test } from 'react-native-harness'

import { BodyType, box2d, type World } from 'nitro-box2d'

let world: World | null = null

const createWorld = (gravityY = -10) => {
  world = box2d.createWorld({ gravity: { x: 0, y: gravityY } })
  return world
}

afterEach(() => {
  if (world !== null && world.isValid) {
    world.destroy()
  }
  world = null
})

describe('World', () => {
  test('is created with the gravity it was given', () => {
    const created = createWorld(-9.81)

    expect(created.isValid).toBe(true)
    expect(created.gravity.x).toBeCloseTo(0, 5)
    expect(created.gravity.y).toBeCloseTo(-9.81, 4)
  })

  test('gravity can be changed after creation', () => {
    const created = createWorld()

    created.gravity = { x: 3, y: 4 }

    expect(created.gravity.x).toBeCloseTo(3, 5)
    expect(created.gravity.y).toBeCloseTo(4, 5)
  })

  test('a dynamic body falls under gravity', () => {
    const created = createWorld()
    const body = created.createBody({
      type: BodyType.Dynamic,
      position: { x: 0, y: 10 },
    })
    body.createBoxShape({ density: 1 }, 0.5, 0.5, { x: 0, y: 0 }, 0)

    for (let i = 0; i < 60; i++) {
      created.step(1 / 60, 4)
    }

    // A second of free fall under -10 m/s² is about five metres.
    expect(body.position.y).toBeLessThan(6)
    expect(body.position.y).toBeGreaterThan(4)
    expect(body.linearVelocity.y).toBeLessThan(-9)
  })

  test('a static body holds a dynamic one up', () => {
    const created = createWorld()

    const ground = created.createBody({ type: BodyType.Static, position: { x: 0, y: 0 } })
    ground.createSegmentShape({}, { point1: { x: -10, y: 0 }, point2: { x: 10, y: 0 } })

    const box = created.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 3 } })
    box.createBoxShape({ density: 1 }, 0.5, 0.5, { x: 0, y: 0 }, 0)

    for (let i = 0; i < 180; i++) {
      created.step(1 / 60, 4)
    }

    expect(box.position.y).toBeCloseTo(0.5, 1)
  })

  test('bodies fall asleep once they settle', () => {
    const created = createWorld()

    const ground = created.createBody({ type: BodyType.Static })
    ground.createSegmentShape({}, { point1: { x: -10, y: 0 }, point2: { x: 10, y: 0 } })

    const box = created.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 1 } })
    box.createBoxShape({ density: 1 }, 0.5, 0.5, { x: 0, y: 0 }, 0)

    for (let i = 0; i < 300; i++) {
      created.step(1 / 60, 4)
    }

    expect(box.awake).toBe(false)
    expect(created.awakeBodyCount).toBe(0)
  })

  test('getBodyStates covers every body, awake or not', () => {
    const created = createWorld()

    created.createBody({ type: BodyType.Static })
    const falling = created.createBody({ type: BodyType.Dynamic, position: { x: 1, y: 5 } })
    falling.createCircleShape({ density: 1 }, { center: { x: 0, y: 0 }, radius: 0.3 })

    created.step(1 / 60, 4)

    const states = created.getBodyStates()
    expect(states).toHaveLength(2)

    const state = states.find((candidate) => candidate.id === falling.id)
    expect(state).toBeDefined()
    expect(state!.position.x).toBeCloseTo(1, 3)
  })

  test('getAwakeBodyStates only reports what moved', () => {
    const created = createWorld()

    created.createBody({ type: BodyType.Static })
    const falling = created.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 5 } })
    falling.createCircleShape({ density: 1 }, { center: { x: 0, y: 0 }, radius: 0.3 })

    created.step(1 / 60, 4)

    const awake = created.getAwakeBodyStates()
    expect(awake).toHaveLength(1)
    expect(awake[0]!.id).toBe(falling.id)
  })

  test('getAwakeBodyTransforms packs the same data as a Float32Array', () => {
    const created = createWorld()

    const falling = created.createBody({ type: BodyType.Dynamic, position: { x: 2, y: 5 } })
    falling.createCircleShape({ density: 1 }, { center: { x: 0, y: 0 }, radius: 0.3 })

    created.step(1 / 60, 4)

    const transforms = new Float32Array(created.getAwakeBodyTransforms())
    expect(transforms).toHaveLength(4)
    expect(transforms[0]).toBe(falling.id)
    expect(transforms[1]).toBeCloseTo(2, 3)

    const [state] = created.getAwakeBodyStates()
    expect(transforms[2]).toBeCloseTo(state!.position.y, 4)
  })

  test('the same inputs produce the same simulation twice over', () => {
    const run = () => {
      const instance = box2d.createWorld({ gravity: { x: 0, y: -10 } })
      const ground = instance.createBody({ type: BodyType.Static })
      ground.createSegmentShape({}, { point1: { x: -10, y: 0 }, point2: { x: 10, y: 0 } })

      for (let i = 0; i < 8; i++) {
        const body = instance.createBody({
          type: BodyType.Dynamic,
          position: { x: -1 + i * 0.25, y: 2 + i * 0.6 },
          angle: i * 0.3,
        })
        body.createBoxShape({ density: 1, restitution: 0.4 }, 0.2, 0.2, { x: 0, y: 0 }, 0)
      }

      for (let i = 0; i < 240; i++) {
        instance.step(1 / 60, 4)
      }

      const states = instance.getBodyStates().map((state) => [state.position.x, state.position.y])
      instance.destroy()
      return states
    }

    expect(run()).toEqual(run())
  })

  test('a destroyed world rejects any further use', () => {
    const created = createWorld()
    const body = created.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 1 } })

    created.destroy()

    expect(created.isValid).toBe(false)
    expect(body.isValid).toBe(false)
    // Reading through a freed world would be a use-after-free, so every handle
    // into it has to refuse rather than answer.
    expect(() => created.step(1 / 60, 4)).toThrow()
    expect(() => body.position).toThrow()
  })

  test('rejects a step that Box2D cannot make sense of', () => {
    const created = createWorld()

    expect(() => created.step(1 / 60, 0)).toThrow()
    expect(() => created.step(-1, 4)).toThrow()
    expect(() => created.step(Number.NaN, 4)).toThrow()
  })

  test('counters describe what is in the world', () => {
    const created = createWorld()

    const body = created.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 1 } })
    body.createCircleShape({ density: 1 }, { center: { x: 0, y: 0 }, radius: 0.5 })
    created.step(1 / 60, 4)

    const counters = created.getCounters()
    expect(counters.bodyCount).toBe(1)
    expect(counters.shapeCount).toBe(1)
  })
})
