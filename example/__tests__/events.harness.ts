import { afterEach, beforeEach, describe, expect, test } from 'react-native-harness'

import { BodyType, box2d, type World } from 'nitro-box2d'

let world: World

beforeEach(() => {
  world = box2d.createWorld({ gravity: { x: 0, y: -10 } })
})

afterEach(() => {
  if (world.isValid) {
    world.destroy()
  }
})

/** Steps the world, collecting every event across the run. */
const runAndCollect = (steps: number) => {
  const collected = {
    beginContacts: [] as ReturnType<World['getEvents']>['beginContacts'],
    endContacts: [] as ReturnType<World['getEvents']>['endContacts'],
    hits: [] as ReturnType<World['getEvents']>['hits'],
    beginSensors: [] as ReturnType<World['getEvents']>['beginSensors'],
    endSensors: [] as ReturnType<World['getEvents']>['endSensors'],
  }

  for (let i = 0; i < steps; i++) {
    world.step(1 / 60, 4)
    const events = world.getEvents()
    collected.beginContacts.push(...events.beginContacts)
    collected.endContacts.push(...events.endContacts)
    collected.hits.push(...events.hits)
    collected.beginSensors.push(...events.beginSensors)
    collected.endSensors.push(...events.endSensors)
  }

  return collected
}

describe('contact events', () => {
  test('are silent unless the shape opts in', () => {
    const ground = world.createBody({ type: BodyType.Static })
    ground.createSegmentShape({}, { point1: { x: -10, y: 0 }, point2: { x: 10, y: 0 } })

    const box = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 2 } })
    box.createBoxShape({ density: 1 }, 0.5, 0.5, { x: 0, y: 0 }, 0)

    expect(runAndCollect(120).beginContacts).toHaveLength(0)
  })

  test('report both shapes and both bodies when a box lands', () => {
    const ground = world.createBody({ type: BodyType.Static })
    const groundShape = ground.createSegmentShape(
      { enableContactEvents: true },
      { point1: { x: -10, y: 0 }, point2: { x: 10, y: 0 } }
    )

    const box = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 2 } })
    const boxShape = box.createBoxShape(
      { density: 1, enableContactEvents: true },
      0.5,
      0.5,
      { x: 0, y: 0 },
      0
    )

    const events = runAndCollect(120)
    expect(events.beginContacts.length).toBeGreaterThanOrEqual(1)

    const [contact] = events.beginContacts
    const shapeIds = [contact!.shapeIdA, contact!.shapeIdB].sort()
    expect(shapeIds).toEqual([groundShape.id, boxShape.id].sort())

    const bodyIds = [contact!.bodyIdA, contact!.bodyIdB].sort()
    expect(bodyIds).toEqual([ground.id, box.id].sort())
  })

  test('an end-touch event follows when the bodies separate', () => {
    const ground = world.createBody({ type: BodyType.Static })
    ground.createSegmentShape(
      { enableContactEvents: true },
      { point1: { x: -10, y: 0 }, point2: { x: 10, y: 0 } }
    )

    const ball = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 3 } })
    ball.createCircleShape(
      { density: 1, restitution: 0.8, enableContactEvents: true },
      { center: { x: 0, y: 0 }, radius: 0.3 }
    )

    const events = runAndCollect(180)
    expect(events.beginContacts.length).toBeGreaterThanOrEqual(1)
    expect(events.endContacts.length).toBeGreaterThanOrEqual(1)
  })

  test('hit events carry the impact point and closing speed', () => {
    const ground = world.createBody({ type: BodyType.Static })
    ground.createSegmentShape(
      { enableHitEvents: true },
      { point1: { x: -10, y: 0 }, point2: { x: 10, y: 0 } }
    )

    const ball = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 6 } })
    ball.createCircleShape(
      { density: 1, enableHitEvents: true },
      { center: { x: 0, y: 0 }, radius: 0.3 }
    )

    const events = runAndCollect(180)
    expect(events.hits.length).toBeGreaterThanOrEqual(1)

    const [hit] = events.hits
    // Falling from six metres arrives well above the 1 m/s hit threshold.
    expect(hit!.approachSpeed).toBeGreaterThan(1)
    expect(hit!.point.y).toBeCloseTo(0, 1)
  })
})

describe('sensor events', () => {
  test('fire when a body passes through, on both the sensor and the visitor', () => {
    const gate = world.createBody({ type: BodyType.Static, position: { x: 0, y: 2 } })
    const sensor = gate.createBoxShape(
      { isSensor: true, enableSensorEvents: true },
      1,
      0.2,
      { x: 0, y: 0 },
      0
    )

    const faller = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 5 } })
    const visitor = faller.createCircleShape(
      { density: 1, enableSensorEvents: true },
      { center: { x: 0, y: 0 }, radius: 0.2 }
    )

    const events = runAndCollect(180)

    expect(events.beginSensors.length).toBeGreaterThanOrEqual(1)
    expect(events.endSensors.length).toBeGreaterThanOrEqual(1)
    expect(events.beginSensors[0]!.sensorShapeId).toBe(sensor.id)
    expect(events.beginSensors[0]!.visitorShapeId).toBe(visitor.id)
    expect(events.beginSensors[0]!.visitorBodyId).toBe(faller.id)

    // A sensor never resists anything, so the body keeps falling past it.
    expect(faller.position.y).toBeLessThan(0)
  })
})

describe('queries', () => {
  test('castRayClosest finds the nearer of two shapes', () => {
    const near = world.createBody({ type: BodyType.Static, position: { x: 0, y: 2 } })
    const nearShape = near.createBoxShape({}, 2, 0.1, { x: 0, y: 0 }, 0)

    const far = world.createBody({ type: BodyType.Static, position: { x: 0, y: 0 } })
    far.createBoxShape({}, 2, 0.1, { x: 0, y: 0 }, 0)

    const hit = world.castRayClosest({ x: 0, y: 5 }, { x: 0, y: -10 })

    expect(hit).toBeDefined()
    expect(hit!.shapeId).toBe(nearShape.id)
    expect(hit!.bodyId).toBe(near.id)
    expect(hit!.point.y).toBeCloseTo(2.1, 2)
    // The normal points back up the ray.
    expect(hit!.normal.y).toBeCloseTo(1, 3)
  })

  test('castRayClosest returns undefined when the ray hits nothing', () => {
    world.createBody({ type: BodyType.Static, position: { x: 50, y: 50 } })

    expect(world.castRayClosest({ x: 0, y: 0 }, { x: 0, y: -1 })).toBeUndefined()
  })

  test('castRay reports every crossing, nearest first', () => {
    for (const y of [0, 1, 2]) {
      const body = world.createBody({ type: BodyType.Static, position: { x: 0, y } })
      body.createBoxShape({}, 2, 0.1, { x: 0, y: 0 }, 0)
    }

    const hits = world.castRay({ x: 0, y: 5 }, { x: 0, y: -10 })

    expect(hits).toHaveLength(3)
    expect(hits[0]!.fraction).toBeLessThan(hits[1]!.fraction)
    expect(hits[1]!.fraction).toBeLessThan(hits[2]!.fraction)
  })

  test('queryPoint only returns shapes that really contain the point', () => {
    const body = world.createBody({ type: BodyType.Static, position: { x: 0, y: 0 } })
    const circle = body.createCircleShape({}, { center: { x: 0, y: 0 }, radius: 1 })

    expect(world.queryPoint({ x: 0, y: 0 })).toEqual([circle.id])
    // Inside the bounding box but outside the circle.
    expect(world.queryPoint({ x: 0.95, y: 0.95 })).toEqual([])
  })

  test('overlapAABB is broad-phase, so it over-reports', () => {
    const body = world.createBody({ type: BodyType.Static })
    const circle = body.createCircleShape({}, { center: { x: 0, y: 0 }, radius: 1 })

    expect(world.overlapAABB({ x: -2, y: -2 }, { x: 2, y: 2 })).toContain(circle.id)
    expect(world.overlapAABB({ x: 10, y: 10 }, { x: 12, y: 12 })).toEqual([])
  })

  test('an inverted AABB is rejected rather than quietly returning nothing', () => {
    expect(() => world.overlapAABB({ x: 2, y: 2 }, { x: -2, y: -2 })).toThrow()
  })
})

describe('explosions', () => {
  test('push nearby dynamic bodies away from the blast', () => {
    world.gravity = { x: 0, y: 0 }

    const piece = world.createBody({
      type: BodyType.Dynamic,
      position: { x: 1, y: 0 },
      gravityScale: 0,
    })
    piece.createCircleShape({ density: 1 }, { center: { x: 0, y: 0 }, radius: 0.2 })
    world.step(1 / 60, 4)

    world.explode({ position: { x: 0, y: 0 }, radius: 3, impulsePerLength: 10 })

    for (let i = 0; i < 30; i++) {
      world.step(1 / 60, 4)
    }

    expect(piece.position.x).toBeGreaterThan(1)
    expect(piece.linearVelocity.x).toBeGreaterThan(0)
  })
})
