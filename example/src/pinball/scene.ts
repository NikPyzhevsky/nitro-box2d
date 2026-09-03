import {
  BodyType,
  box2d,
  type Body,
  type Joint,
  type World,
} from 'nitro-box2d'

import {
  BALL_RADIUS,
  buildTable,
  MAX_PULL,
  PLUNGER_HALF_HEIGHT,
  PLUNGER_HALF_WIDTH,
  type TableLayout,
} from './table'

export const FIXED_TIME_STEP = 1 / 60
export const SUB_STEP_COUNT = 4

/**
 * Shallower than the playground's -10: a real table is tilted, so only part of
 * gravity acts down the playfield. It also keeps the ball slow enough to watch.
 */
export const GRAVITY_Y = -5.5

/**
 * Spring stiffness of the plunger, in Hz, and its damping.
 *
 * Tuned so that drawing about seven tenths of the way back is the threshold for
 * getting out of the lane: below it the ball drops back onto the plunger for
 * another go, above it the pull decides how far across the table the ball
 * lands.
 */
const PLUNGER_HERTZ = 4.4
const PLUNGER_DAMPING = 0.2

/**
 * How fast the motor is allowed to drag the plunger down, in m/s.
 *
 * Unclamped, the motor snatches the plunger away far faster than gravity pulls
 * the ball, so the ball is airborne when the finger lifts and the launch comes
 * out different every time.
 */
const PULL_SPEED_LIMIT = 1.2

export type PinballEvent =
  | { kind: 'pocket'; pocket: number; multiplier: number }
  | { kind: 'peg' }

export type Transform = {
  x: number
  y: number
  angle: number
}

/**
 * One pinball table: the world, the static geometry, the ball, and the plunger.
 *
 * React owns the score and the ball count; this owns everything Box2D touches.
 */
export class PinballScene {
  readonly world: World
  readonly layout: TableLayout

  private readonly plunger: Body
  private readonly plungerJoint: Joint
  /** Maps a sensor's shape id back to the pocket it belongs to. */
  private readonly pocketByShapeId = new Map<number, number>()
  private readonly pegShapeIds = new Set<number>()

  private ball: Body | null = null
  private accumulator = 0
  private pulling = false

  constructor(height: number) {
    this.layout = buildTable(height)
    this.world = box2d.createWorld({ gravity: { x: 0, y: GRAVITY_Y } })

    const table = this.world.createBody({ type: BodyType.Static, position: { x: 0, y: 0 } })

    for (const wall of this.layout.walls) {
      table.createSegmentShape(
        { friction: 0.1, restitution: 0.2 },
        { point1: { x: wall.x1, y: wall.y1 }, point2: { x: wall.x2, y: wall.y2 } }
      )
    }

    for (const peg of this.layout.pegs) {
      // Contact events are opt-in per shape, so only the pegs report touches —
      // the walls stay silent and cost nothing.
      const shape = table.createCircleShape(
        { friction: 0.02, restitution: 0.9, enableContactEvents: true },
        { center: { x: peg.x, y: peg.y }, radius: peg.radius }
      )
      this.pegShapeIds.add(shape.id)
    }

    for (const pocket of this.layout.pockets) {
      const width = pocket.right - pocket.left
      const sensor = table.createBoxShape(
        { isSensor: true, enableSensorEvents: true },
        width / 2 - 0.02,
        0.18,
        { x: (pocket.left + pocket.right) / 2, y: 0.2 },
        0
      )
      this.pocketByShapeId.set(sensor.id, pocket.index)
    }

    this.plunger = this.world.createBody({
      type: BodyType.Dynamic,
      position: this.layout.plunger,
    })
    this.plunger.createBoxShape(
      { density: 1, friction: 0.2 },
      PLUNGER_HALF_WIDTH,
      PLUNGER_HALF_HEIGHT,
      { x: 0, y: 0 },
      0
    )

    // A prismatic joint is the whole plunger: it confines the body to the lane's
    // vertical axis, the limit gives it a travel, and the spring is what fires
    // it. Pulling is a motor fighting that spring; releasing just switches the
    // motor off again.
    this.plungerJoint = this.world.createPrismaticJoint({
      bodyIdA: table.id,
      bodyIdB: this.plunger.id,
      localAnchorA: this.layout.plunger,
      localAnchorB: { x: 0, y: 0 },
      localAxisA: { x: 0, y: 1 },
      enableLimit: true,
      lowerTranslation: -MAX_PULL,
      upperTranslation: 0,
      enableSpring: true,
      hertz: PLUNGER_HERTZ,
      dampingRatio: PLUNGER_DAMPING,
      maxMotorForce: 400,
    })

    this.serve()
  }

  /** Puts a fresh ball on the plunger. Does nothing if one is already in play. */
  serve() {
    if (this.ball !== null) {
      return
    }

    const ball = this.world.createBody({
      type: BodyType.Dynamic,
      position: this.layout.serve,
      // Continuous collision against dynamic bodies. A fully drawn plunger
      // throws the ball at over 10 m/s, which is a sixth of a metre per step —
      // more than the ball's own diameter.
      isBullet: true,
    })
    ball.createCircleShape(
      {
        density: 1,
        friction: 0.05,
        restitution: 0.35,
        // Contact events for the pegs. Sensor events are a separate opt-in and
        // are needed on the *visitor* as well as on the sensor — without this
        // the ball drops into a pocket and nothing happens.
        enableContactEvents: true,
        enableSensorEvents: true,
      },
      { center: { x: 0, y: 0 }, radius: BALL_RADIUS }
    )

    this.ball = ball
  }

  /** `amount` is 0 (released) to 1 (fully drawn). */
  pull(amount: number) {
    const target = -MAX_PULL * Math.max(0, Math.min(1, amount))

    if (!this.pulling) {
      this.pulling = true
      this.plungerJoint.enableSpring(false)
      this.plungerJoint.enableMotor(true)
      this.plungerJoint.wakeBodies()
    }

    // The motor takes a speed, not a position, so chase the target: the further
    // the plunger is from where the finger is, the faster it moves — up to a
    // limit that keeps the ball resting on it the whole way down.
    const error = target - this.plungerJoint.getTranslation()
    const speed = Math.max(-PULL_SPEED_LIMIT, Math.min(PULL_SPEED_LIMIT, error * 8))
    this.plungerJoint.setMotorSpeed(speed)
  }

  /** Lets the spring go. */
  release() {
    if (!this.pulling) {
      return
    }

    this.pulling = false
    this.plungerJoint.enableMotor(false)
    this.plungerJoint.enableSpring(true)
    this.plungerJoint.wakeBodies()
  }

  /**
   * Advances by real elapsed time in whole fixed steps, and reports what
   * happened. See the playground's scene for why the step is fixed.
   */
  advance(elapsedSeconds: number): PinballEvent[] {
    this.accumulator += Math.min(elapsedSeconds, 0.25)

    const events: PinballEvent[] = []
    while (this.accumulator >= FIXED_TIME_STEP) {
      this.world.step(FIXED_TIME_STEP, SUB_STEP_COUNT)
      this.accumulator -= FIXED_TIME_STEP
      this.collect(events)
    }
    return events
  }

  /** Reads one step's events. Box2D keeps them only until the next step. */
  private collect(into: PinballEvent[]) {
    const { beginContacts, beginSensors } = this.world.getEvents()

    for (const contact of beginContacts) {
      if (this.pegShapeIds.has(contact.shapeIdA) || this.pegShapeIds.has(contact.shapeIdB)) {
        into.push({ kind: 'peg' })
      }
    }

    for (const touch of beginSensors) {
      const pocket = this.pocketByShapeId.get(touch.sensorShapeId)
      if (pocket === undefined) {
        continue
      }

      const multiplier = this.layout.pockets[pocket]?.multiplier ?? 1
      into.push({ kind: 'pocket', pocket, multiplier })

      if (this.ball !== null && this.ball.isValid) {
        this.ball.destroy()
      }
      this.ball = null
    }
  }

  /** Where to draw the ball, or `null` when none is in play. */
  ballTransform(): Transform | null {
    if (this.ball === null || !this.ball.isValid) {
      return null
    }

    // Two property reads rather than the playground's bulk `getAwakeBodyStates`.
    // With exactly one moving body, going through a buffer would cost more than
    // it saves.
    const position = this.ball.position
    return { x: position.x, y: position.y, angle: this.ball.angle }
  }

  /** How far the plunger is drawn down, in metres (0 at rest, negative pulled). */
  plungerTranslation(): number {
    return this.plungerJoint.getTranslation()
  }

  get hasBall(): boolean {
    return this.ball !== null && this.ball.isValid
  }

  destroy() {
    this.ball = null
    this.world.destroy()
  }
}
