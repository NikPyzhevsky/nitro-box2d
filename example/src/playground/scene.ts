import {
  BodyType,
  box2d,
  type Body,
  type Vec2,
  type World,
} from 'nitro-box2d'

/** How the scene is drawn. Box2D never sees any of this. */
export type Sprite = {
  bodyId: number
  kind: 'box' | 'circle'
  /** Metres: half-extents for a box, radius for a circle. */
  halfWidth: number
  halfHeight: number
  color: string
}

export type Transform = {
  x: number
  y: number
  angle: number
}

/**
 * Box2D is tuned for objects between roughly 0.1m and 10m. A phone screen is
 * therefore about six metres wide, and everything converts at the render layer.
 */
export const WORLD_WIDTH_METERS = 6

/** Box2D's own recommendation, and the reason `step` takes a fixed delta. */
export const FIXED_TIME_STEP = 1 / 60
export const SUB_STEP_COUNT = 4

const PALETTE = ['#f4b942', '#e2725b', '#5b8def', '#4caf82', '#b07de0', '#e05f8a']

let nextColor = 0
const pickColor = () => {
  const color = PALETTE[nextColor % PALETTE.length]!
  nextColor += 1
  return color
}

export class Scene {
  readonly world: World
  readonly sprites = new Map<number, Sprite>()

  private readonly bodies = new Map<number, Body>()
  private readonly heightMeters: number
  private accumulator = 0

  constructor(heightMeters: number) {
    this.heightMeters = heightMeters
    this.world = box2d.createWorld({ gravity: { x: 0, y: -10 } })
    this.buildBounds()
  }

  /** Ground and side walls, as one static body with three segment shapes. */
  private buildBounds() {
    const halfWidth = WORLD_WIDTH_METERS / 2
    const bounds = this.world.createBody({
      type: BodyType.Static,
      position: { x: 0, y: 0 },
    })

    const wall = { friction: 0.4 }
    bounds.createSegmentShape(wall, {
      point1: { x: -halfWidth, y: 0 },
      point2: { x: halfWidth, y: 0 },
    })
    bounds.createSegmentShape(wall, {
      point1: { x: -halfWidth, y: 0 },
      point2: { x: -halfWidth, y: this.heightMeters },
    })
    bounds.createSegmentShape(wall, {
      point1: { x: halfWidth, y: 0 },
      point2: { x: halfWidth, y: this.heightMeters },
    })
  }

  drop(position: Vec2, kind: 'box' | 'circle') {
    const body = this.world.createBody({
      type: BodyType.Dynamic,
      position,
      angularVelocity: (Math.random() - 0.5) * 4,
    })

    const material = { density: 1, friction: 0.35, restitution: 0.25 }
    const size = 0.12 + Math.random() * 0.1

    if (kind === 'circle') {
      body.createCircleShape(material, { center: { x: 0, y: 0 }, radius: size })
    } else {
      body.createBoxShape(material, size, size, { x: 0, y: 0 }, 0)
    }

    this.bodies.set(body.id, body)
    this.sprites.set(body.id, {
      bodyId: body.id,
      kind,
      halfWidth: size,
      halfHeight: size,
      color: pickColor(),
    })

    return body
  }

  /**
   * Advances by real elapsed time, in whole fixed steps.
   *
   * Stepping by the frame delta instead would make the simulation depend on
   * frame rate — the same scene settling differently on a 120Hz phone than on a
   * 60Hz one. The leftover time carries into the next frame.
   */
  advance(elapsedSeconds: number) {
    this.accumulator += Math.min(elapsedSeconds, 0.25)

    let steps = 0
    while (this.accumulator >= FIXED_TIME_STEP) {
      this.world.step(FIXED_TIME_STEP, SUB_STEP_COUNT)
      this.accumulator -= FIXED_TIME_STEP
      steps += 1
    }
    return steps
  }

  /** Positions for everything that moved this step, keyed by body id. */
  readTransforms(): Map<number, Transform> {
    const transforms = new Map<number, Transform>()
    for (const state of this.world.getAwakeBodyStates()) {
      transforms.set(state.id, {
        x: state.position.x,
        y: state.position.y,
        angle: state.angle,
      })
    }
    return transforms
  }

  explode(position: Vec2) {
    // An explosion only pushes bodies that are awake, and a settled pile is
    // asleep by definition — so wake everything first, or the blast does nothing
    // to exactly the pile you wanted to scatter.
    for (const body of this.bodies.values()) {
      if (body.isValid) {
        body.awake = true
      }
    }

    this.world.explode({
      position,
      radius: 2.5,
      impulsePerLength: 8,
      falloff: 0.5,
    })
  }

  clearDroppedBodies() {
    for (const body of this.bodies.values()) {
      if (body.isValid) {
        body.destroy()
      }
    }
    this.bodies.clear()
    this.sprites.clear()
  }

  destroy() {
    this.bodies.clear()
    this.sprites.clear()
    this.world.destroy()
  }
}
