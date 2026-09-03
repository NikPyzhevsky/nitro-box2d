import { afterEach, beforeEach, describe, expect, test } from 'react-native-harness'

import { BodyType, ShapeType, box2d, type World } from 'nitro-box2d'

let world: World

beforeEach(() => {
  world = box2d.createWorld({ gravity: { x: 0, y: -10 } })
})

afterEach(() => {
  if (world.isValid) {
    world.destroy()
  }
})

describe('Body', () => {
  test('defaults to static, as Box2D does', () => {
    const body = world.createBody({})
    expect(body.type).toBe(BodyType.Static)
  })

  test('carries the definition it was created with', () => {
    const body = world.createBody({
      type: BodyType.Dynamic,
      position: { x: 1.5, y: -2.25 },
      angle: Math.PI / 4,
      linearVelocity: { x: 3, y: 0 },
      angularVelocity: 1.5,
      gravityScale: 0.5,
      fixedRotation: true,
      userData: 7,
    })

    expect(body.position.x).toBeCloseTo(1.5, 5)
    expect(body.position.y).toBeCloseTo(-2.25, 5)
    // Box2D stores a rotation as a cos/sin pair built by a fast approximation,
    // so an angle survives a round trip to about a tenth of a degree, not to
    // float precision.
    expect(body.angle).toBeCloseTo(Math.PI / 4, 2)
    expect(body.linearVelocity.x).toBeCloseTo(3, 5)
    expect(body.gravityScale).toBeCloseTo(0.5, 5)
    expect(body.fixedRotation).toBe(true)
    expect(body.userData).toBe(7)
    expect(body.angularVelocity).toBeCloseTo(1.5, 5)
  })

  test('fixed rotation gives a body no rotational inertia to act on', () => {
    const body = world.createBody({ type: BodyType.Dynamic, fixedRotation: true })
    body.createBoxShape({ density: 1 }, 0.5, 0.2, { x: 0, y: 0 }, 0)

    expect(body.rotationalInertia).toBe(0)

    // Torque and angular impulse both divide by inertia, so neither does
    // anything here. Setting `angularVelocity` directly still would — fixed
    // rotation stops the *solver* spinning the body, not the caller.
    body.applyAngularImpulse(100, true)
    body.applyTorque(500, true)
    for (let i = 0; i < 60; i++) {
      world.step(1 / 60, 4)
    }

    expect(body.angularVelocity).toBe(0)
    expect(body.angle).toBeCloseTo(0, 6)
  })

  test('has no mass until it has a shape', () => {
    const body = world.createBody({ type: BodyType.Dynamic })
    expect(body.mass).toBe(0)
    expect(body.shapeCount).toBe(0)

    body.createBoxShape({ density: 2 }, 0.5, 0.5, { x: 0, y: 0 }, 0)

    // 1m x 1m at 2 kg/m².
    expect(body.mass).toBeCloseTo(2, 3)
    expect(body.shapeCount).toBe(1)
  })

  test('an impulse changes velocity in one go', () => {
    const body = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 0 } })
    body.createBoxShape({ density: 1 }, 0.5, 0.5, { x: 0, y: 0 }, 0)

    body.applyLinearImpulseToCenter({ x: 4, y: 0 }, true)

    // 4 N·s on a 1 kg body is 4 m/s, before the world has even stepped.
    expect(body.linearVelocity.x).toBeCloseTo(4, 3)
  })

  test('local and world coordinates round-trip through the body transform', () => {
    const body = world.createBody({
      position: { x: 2, y: 3 },
      angle: Math.PI / 2,
    })

    const world1 = body.getWorldPoint({ x: 1, y: 0 })
    expect(world1.x).toBeCloseTo(2, 4)
    expect(world1.y).toBeCloseTo(4, 4)

    const back = body.getLocalPoint(world1)
    expect(back.x).toBeCloseTo(1, 4)
    expect(back.y).toBeCloseTo(0, 4)
  })

  test('setTransform teleports without leaving velocity behind', () => {
    const body = world.createBody({ type: BodyType.Dynamic, linearVelocity: { x: 5, y: 0 } })
    body.createCircleShape({ density: 1 }, { center: { x: 0, y: 0 }, radius: 0.5 })

    body.setTransform({ x: -3, y: 8 }, 1)

    expect(body.position.x).toBeCloseTo(-3, 5)
    expect(body.position.y).toBeCloseTo(8, 5)
    expect(body.angle).toBeCloseTo(1, 2)
    expect(body.linearVelocity.x).toBeCloseTo(5, 5)
  })

  test('a disabled body stops taking part in the simulation', () => {
    const body = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 10 } })
    body.createCircleShape({ density: 1 }, { center: { x: 0, y: 0 }, radius: 0.5 })

    body.enabled = false
    for (let i = 0; i < 60; i++) {
      world.step(1 / 60, 4)
    }

    expect(body.enabled).toBe(false)
    expect(body.position.y).toBeCloseTo(10, 3)
  })

  test('a destroyed body refuses every read', () => {
    const body = world.createBody({ type: BodyType.Dynamic })
    expect(body.isValid).toBe(true)

    body.destroy()

    expect(body.isValid).toBe(false)
    expect(() => body.position).toThrow()
    expect(() => body.destroy()).toThrow()
  })

  test('destroyed bodies drop out of getBodyStates', () => {
    const keep = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 1 } })
    const drop = world.createBody({ type: BodyType.Dynamic, position: { x: 1, y: 1 } })

    expect(world.getBodyStates()).toHaveLength(2)

    drop.destroy()

    const states = world.getBodyStates()
    expect(states).toHaveLength(1)
    expect(states[0]!.id).toBe(keep.id)
  })
})

describe('Shape', () => {
  test('reports its own geometry back', () => {
    const body = world.createBody({ type: BodyType.Dynamic })

    const circle = body.createCircleShape({}, { center: { x: 0.25, y: 0 }, radius: 0.75 })
    expect(circle.type).toBe(ShapeType.Circle)
    expect(circle.getCircle().radius).toBeCloseTo(0.75, 5)
    expect(circle.getCircle().center.x).toBeCloseTo(0.25, 5)

    const capsule = body.createCapsuleShape(
      {},
      { center1: { x: -0.5, y: 0 }, center2: { x: 0.5, y: 0 }, radius: 0.2 }
    )
    expect(capsule.type).toBe(ShapeType.Capsule)
    expect(capsule.getCapsule().radius).toBeCloseTo(0.2, 5)

    const boxShape = body.createBoxShape({}, 1, 0.5, { x: 0, y: 0 }, 0)
    expect(boxShape.type).toBe(ShapeType.Polygon)
    expect(boxShape.getPolygonPoints()).toHaveLength(4)
  })

  test('asking a shape for the wrong geometry is an error, not a wrong answer', () => {
    const body = world.createBody({})
    const circle = body.createCircleShape({}, { center: { x: 0, y: 0 }, radius: 1 })

    expect(() => circle.getPolygonPoints()).toThrow()
    expect(() => circle.getCapsule()).toThrow()
  })

  test('a polygon is built from its convex hull', () => {
    const body = world.createBody({})

    // The middle point is inside the triangle and gets dropped.
    const shape = body.createPolygonShape({}, {
      points: [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 0.25 },
      ],
    })

    expect(shape.getPolygonPoints()).toHaveLength(3)
  })

  test('a degenerate outline is rejected instead of silently collapsing', () => {
    const body = world.createBody({})

    expect(() =>
      body.createPolygonShape({}, {
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
        ],
      })
    ).toThrow()

    expect(() => body.createPolygonShape({}, { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] })).toThrow()
  })

  test('material properties are readable and writable', () => {
    const body = world.createBody({ type: BodyType.Dynamic })
    const shape = body.createCircleShape(
      { density: 2, friction: 0.4, restitution: 0.6 },
      { center: { x: 0, y: 0 }, radius: 0.5 }
    )

    expect(shape.density).toBeCloseTo(2, 5)
    expect(shape.friction).toBeCloseTo(0.4, 5)
    expect(shape.restitution).toBeCloseTo(0.6, 5)

    shape.friction = 0.1
    expect(shape.friction).toBeCloseTo(0.1, 5)

    shape.density = 4
    expect(shape.density).toBeCloseTo(4, 5)
    // Changing density updates the owning body's mass straight away.
    expect(body.mass).toBeCloseTo(4 * Math.PI * 0.25, 3)
  })

  test('filters keep two shapes from colliding', () => {
    const ground = world.createBody({ type: BodyType.Static })
    ground.createSegmentShape(
      { filter: { category: 0x0002, mask: 0x0002 } },
      { point1: { x: -10, y: 0 }, point2: { x: 10, y: 0 } }
    )

    const ghost = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 3 } })
    ghost.createBoxShape(
      { density: 1, filter: { category: 0x0004, mask: 0x0004 } },
      0.25,
      0.25,
      { x: 0, y: 0 },
      0
    )

    for (let i = 0; i < 120; i++) {
      world.step(1 / 60, 4)
    }

    expect(ghost.position.y).toBeLessThan(-1)
  })

  test('getShapes returns everything attached to the body', () => {
    const body = world.createBody({ type: BodyType.Dynamic })
    body.createCircleShape({}, { center: { x: -1, y: 0 }, radius: 0.3 })
    body.createCircleShape({}, { center: { x: 1, y: 0 }, radius: 0.3 })

    const shapes = body.getShapes()
    expect(shapes).toHaveLength(2)
    expect(shapes.every((shape) => shape.bodyId === body.id)).toBe(true)
  })

  test('testPoint answers in world coordinates', () => {
    const body = world.createBody({ position: { x: 5, y: 0 } })
    const shape = body.createCircleShape({}, { center: { x: 0, y: 0 }, radius: 1 })

    expect(shape.testPoint({ x: 5, y: 0 })).toBe(true)
    expect(shape.testPoint({ x: 0, y: 0 })).toBe(false)
  })
})
