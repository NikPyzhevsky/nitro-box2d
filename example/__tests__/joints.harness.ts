import { afterEach, beforeEach, describe, expect, test } from 'react-native-harness'

import { BodyType, JointType, box2d, type Body, type World } from 'nitro-box2d'

let world: World

beforeEach(() => {
  world = box2d.createWorld({ gravity: { x: 0, y: -10 } })
})

afterEach(() => {
  if (world.isValid) {
    world.destroy()
  }
})

const anchorAt = (x: number, y: number): Body =>
  world.createBody({ type: BodyType.Static, position: { x, y } })

const bobAt = (x: number, y: number): Body => {
  const body = world.createBody({ type: BodyType.Dynamic, position: { x, y } })
  body.createCircleShape({ density: 1 }, { center: { x: 0, y: 0 }, radius: 0.2 })
  return body
}

const settle = (steps = 300) => {
  for (let i = 0; i < steps; i++) {
    world.step(1 / 60, 4)
  }
}

describe('distance joint', () => {
  test('holds a body at a fixed distance from its anchor', () => {
    const anchor = anchorAt(0, 5)
    const bob = bobAt(1, 5)

    const joint = world.createDistanceJoint({
      bodyIdA: anchor.id,
      bodyIdB: bob.id,
      length: 1,
    })

    expect(joint.type).toBe(JointType.Distance)
    expect(joint.getLength()).toBeCloseTo(1, 5)

    let lowestY = bob.position.y
    for (let i = 0; i < 300; i++) {
      world.step(1 / 60, 4)
      lowestY = Math.min(lowestY, bob.position.y)
    }

    // The bob swings, but never leaves the circle of radius 1 around the anchor.
    expect(joint.getCurrentLength()).toBeCloseTo(1, 2)
    expect(lowestY).toBeLessThan(4.5)
    expect(bob.position.y).toBeGreaterThan(3.9)
    expect(bob.position.y).toBeLessThan(5.1)
  })

  test('the rest length can be changed while it runs', () => {
    const anchor = anchorAt(0, 5)
    const bob = bobAt(0, 4)
    const joint = world.createDistanceJoint({ bodyIdA: anchor.id, bodyIdB: bob.id, length: 1 })

    joint.setLength(2)
    settle()

    expect(joint.getLength()).toBeCloseTo(2, 5)
    expect(joint.getCurrentLength()).toBeCloseTo(2, 2)
    expect(bob.position.y).toBeCloseTo(3, 1)
  })

  test('connects the two bodies it was given', () => {
    const anchor = anchorAt(0, 5)
    const bob = bobAt(0, 4)
    const joint = world.createDistanceJoint({ bodyIdA: anchor.id, bodyIdB: bob.id })

    expect(joint.bodyIdA).toBe(anchor.id)
    expect(joint.bodyIdB).toBe(bob.id)
    expect(joint.isValid).toBe(true)
  })
})

describe('revolute joint', () => {
  test('pins two bodies together and lets them rotate', () => {
    const hub = anchorAt(0, 5)
    const arm = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 5 } })
    arm.createBoxShape({ density: 1 }, 0.75, 0.1, { x: 0.75, y: 0 }, 0)

    const joint = world.createRevoluteJoint({
      bodyIdA: hub.id,
      bodyIdB: arm.id,
      localAnchorA: { x: 0, y: 0 },
      localAnchorB: { x: 0, y: 0 },
    })

    expect(joint.type).toBe(JointType.Revolute)
    expect(joint.getAngle()).toBeCloseTo(0, 5)

    let widestSwing = 0
    for (let i = 0; i < 120; i++) {
      world.step(1 / 60, 4)
      widestSwing = Math.max(widestSwing, Math.abs(joint.getAngle()))
    }

    // The arm hangs from its pin instead of falling away, and swings while it does.
    expect(arm.position.x).toBeCloseTo(0, 2)
    expect(arm.position.y).toBeCloseTo(5, 2)
    expect(widestSwing).toBeGreaterThan(0.5)
  })

  test('a limit stops the arm swinging past it', () => {
    const hub = anchorAt(0, 5)
    const arm = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 5 } })
    arm.createBoxShape({ density: 1 }, 0.75, 0.1, { x: 0.75, y: 0 }, 0)

    const joint = world.createRevoluteJoint({
      bodyIdA: hub.id,
      bodyIdB: arm.id,
      enableLimit: true,
      lowerAngle: -0.4,
      upperAngle: 0.4,
    })

    settle(240)

    expect(joint.getAngle()).toBeGreaterThan(-0.45)
    expect(joint.getAngle()).toBeLessThan(0.45)
  })

  test('a motor drives it at the speed it was given', () => {
    const hub = anchorAt(0, 5)
    const arm = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 5 } })
    arm.createBoxShape({ density: 1 }, 0.75, 0.1, { x: 0.75, y: 0 }, 0)

    const joint = world.createRevoluteJoint({
      bodyIdA: hub.id,
      bodyIdB: arm.id,
      enableMotor: true,
      motorSpeed: 2,
      maxMotorTorque: 500,
    })

    settle(60)

    expect(joint.getMotorSpeed()).toBeCloseTo(2, 5)
    // One second at 2 rad/s.
    expect(joint.getAngle()).toBeGreaterThan(1.5)
    expect(Math.abs(joint.getMotorLoad())).toBeGreaterThan(0)
  })
})

describe('prismatic joint', () => {
  test('confines a body to one axis', () => {
    const rail = anchorAt(0, 5)
    const slider = bobAt(0, 5)

    const joint = world.createPrismaticJoint({
      bodyIdA: rail.id,
      bodyIdB: slider.id,
      localAxisA: { x: 1, y: 0 },
      enableLimit: true,
      lowerTranslation: -1,
      upperTranslation: 1,
    })

    expect(joint.type).toBe(JointType.Prismatic)

    // Straight at the far limit, with a downward component the rail has to absorb.
    slider.linearVelocity = { x: 2, y: -5 }
    settle(120)

    // Gravity and the downward impulse are both absorbed by the rail.
    expect(slider.position.y).toBeCloseTo(5, 2)
    expect(joint.getTranslation()).toBeGreaterThan(0.9)
    expect(joint.getTranslation()).toBeLessThanOrEqual(1.05)
  })
})

describe('weld joint', () => {
  test('makes two bodies move as one', () => {
    const left = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 5 } })
    left.createBoxShape({ density: 1 }, 0.25, 0.25, { x: 0, y: 0 }, 0)

    const right = world.createBody({ type: BodyType.Dynamic, position: { x: 1, y: 5 } })
    right.createBoxShape({ density: 1 }, 0.25, 0.25, { x: 0, y: 0 }, 0)

    const joint = world.createWeldJoint({
      bodyIdA: left.id,
      bodyIdB: right.id,
      localAnchorA: { x: 0.5, y: 0 },
      localAnchorB: { x: -0.5, y: 0 },
    })

    expect(joint.type).toBe(JointType.Weld)

    settle(120)

    // Both fell, and stayed exactly one metre apart while doing it.
    expect(left.position.y).toBeLessThan(0)
    expect(right.position.x - left.position.x).toBeCloseTo(1, 2)
    expect(right.position.y - left.position.y).toBeCloseTo(0, 2)
  })
})

describe('mouse joint', () => {
  test('drags a body towards its target', () => {
    const ground = anchorAt(0, 0)
    const dragged = world.createBody({
      type: BodyType.Dynamic,
      position: { x: 0, y: 0 },
      gravityScale: 0,
    })
    dragged.createBoxShape({ density: 1 }, 0.25, 0.25, { x: 0, y: 0 }, 0)

    const joint = world.createMouseJoint({
      bodyIdA: ground.id,
      bodyIdB: dragged.id,
      target: { x: 0, y: 0 },
      hertz: 5,
      dampingRatio: 0.7,
      maxForce: 1000,
    })

    expect(joint.type).toBe(JointType.Mouse)

    joint.setTarget({ x: 3, y: 0 })
    joint.wakeBodies()
    expect(joint.getTarget().x).toBeCloseTo(3, 5)

    settle(120)

    expect(dragged.position.x).toBeCloseTo(3, 1)
  })
})

describe('joint errors', () => {
  test('a type-specific call on the wrong joint throws', () => {
    const anchor = anchorAt(0, 5)
    const bob = bobAt(0, 4)
    const joint = world.createRevoluteJoint({ bodyIdA: anchor.id, bodyIdB: bob.id })

    expect(() => joint.setLength(2)).toThrow()
    expect(() => joint.getTarget()).toThrow()
    expect(() => joint.getTranslation()).toThrow()
  })

  test('an unknown body id is rejected at creation', () => {
    const anchor = anchorAt(0, 5)

    expect(() =>
      world.createDistanceJoint({ bodyIdA: anchor.id, bodyIdB: 99999, length: 1 })
    ).toThrow()
  })

  test('a destroyed body cannot be jointed to', () => {
    const anchor = anchorAt(0, 5)
    const bob = bobAt(0, 4)
    const bobId = bob.id
    bob.destroy()

    expect(() =>
      world.createDistanceJoint({ bodyIdA: anchor.id, bodyIdB: bobId, length: 1 })
    ).toThrow()
  })

  test('a destroyed joint refuses further use', () => {
    const anchor = anchorAt(0, 5)
    const bob = bobAt(0, 4)
    const joint = world.createDistanceJoint({ bodyIdA: anchor.id, bodyIdB: bob.id, length: 1 })

    joint.destroy()

    expect(joint.isValid).toBe(false)
    expect(() => joint.getLength()).toThrow()
  })
})
