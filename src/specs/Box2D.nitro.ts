import { type HybridObject } from 'react-native-nitro-modules'

/**
 * A point or a vector, in metres. Box2D is tuned for objects roughly 0.1m to
 * 10m across — feeding it pixels makes the solver behave badly, so convert at
 * the render layer rather than here.
 */
export type Vec2 = {
  x: number
  y: number
}

export enum BodyType {
  /** Never moves, infinite mass. Ground, walls, static scenery. */
  Static = 0,
  /** Moves at whatever velocity you set, unaffected by forces or collisions. */
  Kinematic = 1,
  /** Fully simulated. */
  Dynamic = 2,
}

export enum ShapeType {
  Circle = 0,
  Capsule = 1,
  Segment = 2,
  Polygon = 3,
  ChainSegment = 4,
}

export enum JointType {
  Distance = 0,
  Filter = 1,
  Motor = 2,
  Mouse = 3,
  Prismatic = 4,
  Revolute = 5,
  Weld = 6,
  Wheel = 7,
}

/**
 * Collision filtering. A pair collides when
 * `(a.category & b.mask) != 0 && (b.category & a.mask) != 0`, unless both share
 * a non-zero `groupIndex`, which forces the outcome: positive always collides,
 * negative never does.
 *
 * Box2D's bits are 64-wide. JS bitwise operators are 32-bit, so anything above
 * bit 31 has to be built with multiplication (`2 ** 40`) rather than `1 << 40`.
 */
export type Filter = {
  category?: number
  mask?: number
  groupIndex?: number
}

export type WorldDef = {
  /** Metres per second squared. Defaults to `{ x: 0, y: -10 }`. */
  gravity?: Vec2
  /** Below this approach speed a collision does not bounce. Defaults to 1 m/s. */
  restitutionThreshold?: number
  /** Approach speed a collision must exceed to appear in `hits`. Defaults to 1 m/s. */
  hitEventThreshold?: number
  /** Contact stiffness, in Hz. Defaults to 30. */
  contactHertz?: number
  /** Defaults to 10. */
  contactDampingRatio?: number
  /** Cap on the speed overlap is pushed apart at. Defaults to 3 m/s. */
  maxContactPushSpeed?: number
  /** Speed cap applied to every body. Defaults to 400 m/s. */
  maximumLinearSpeed?: number
  /** Whether bodies are allowed to sleep. Defaults to true, and you want it. */
  enableSleep?: boolean
  /** Continuous collision, which keeps fast bodies from tunnelling. Defaults to true. */
  enableContinuous?: boolean
}

export type BodyDef = {
  /** Defaults to `BodyType.Static`, same as Box2D. */
  type?: BodyType
  position?: Vec2
  /** Rotation in radians, counter-clockwise. */
  angle?: number
  linearVelocity?: Vec2
  angularVelocity?: number
  linearDamping?: number
  angularDamping?: number
  gravityScale?: number
  /** Speed below which the body is allowed to fall asleep. */
  sleepThreshold?: number
  fixedRotation?: boolean
  /** Continuous collision against *other dynamic* bodies. Expensive; use for bullets. */
  isBullet?: boolean
  isAwake?: boolean
  isEnabled?: boolean
  enableSleep?: boolean
  /**
   * An integer tag carried on the body and echoed back on `BodyState.userData`,
   * for mapping a body back to your own model. Truncated to a pointer, so on
   * 32-bit ABIs the usable range is 32-bit.
   */
  userData?: number
  /** Shows up in Box2D's own diagnostics. Handy when debugging a joint chain. */
  name?: string
}

export type ShapeDef = {
  /** kg/m². The body's mass is the sum over its shapes. Defaults to 1. */
  density?: number
  /** 0 is ice, 1 is rubber on rubber. Defaults to 0.6. */
  friction?: number
  /** Bounciness, 0 to 1. Defaults to 0. */
  restitution?: number
  /** Detects overlap but never collides. */
  isSensor?: boolean
  /** Off by default — a shape only reports begin/end touch when this is on. */
  enableContactEvents?: boolean
  /** Off by default. Needed on the *visitor* shape as well as the sensor. */
  enableSensorEvents?: boolean
  /** Off by default. Gates `hits`, which carry the impact point and speed. */
  enableHitEvents?: boolean
  filter?: Filter
  userData?: number
}

export type Circle = {
  /** In body-local coordinates. */
  center: Vec2
  radius: number
}

/** A stadium: the sweep of a circle of `radius` from `center1` to `center2`. */
export type Capsule = {
  center1: Vec2
  center2: Vec2
  radius: number
}

/** A one-dimensional wall. Only useful on static bodies; it has no volume. */
export type Segment = {
  point1: Vec2
  point2: Vec2
}

/**
 * A convex polygon, given as up to 8 points in body-local coordinates.
 *
 * The points are run through Box2D's hull builder, so winding order does not
 * matter and interior points are dropped — but a concave outline silently
 * becomes its hull. Decompose concave shapes yourself, or attach several.
 */
export type PolygonShape = {
  points: Vec2[]
  /**
   * Rounds the corners off by this radius, growing the polygon outwards.
   * Cheap way to stop boxes catching on each other. Defaults to 0.
   */
  radius?: number
}

/** One body's simulation state, as of the last step. */
export type BodyState = {
  id: number
  position: Vec2
  /** Radians, wrapped to (-pi, pi]. */
  angle: number
  linearVelocity: Vec2
  angularVelocity: number
  isAwake: boolean
  userData: number
}

export type RayHit = {
  shapeId: number
  bodyId: number
  point: Vec2
  /** Unit surface normal at the hit, pointing back along the ray. */
  normal: Vec2
  /** Where along `translation` the hit is, 0 to 1. */
  fraction: number
}

export type ContactTouchEvent = {
  shapeIdA: number
  shapeIdB: number
  bodyIdA: number
  bodyIdB: number
}

export type ContactHitEvent = {
  shapeIdA: number
  shapeIdB: number
  bodyIdA: number
  bodyIdB: number
  point: Vec2
  normal: Vec2
  /** Closing speed along the normal, in m/s. */
  approachSpeed: number
}

export type SensorTouchEvent = {
  sensorShapeId: number
  sensorBodyId: number
  visitorShapeId: number
  visitorBodyId: number
}

/**
 * Everything that happened during the last `step`.
 *
 * Box2D keeps these buffers only until the next step, so read them between
 * steps. Contact and sensor events are opt-in per shape — see `ShapeDef`.
 */
export type WorldEvents = {
  beginContacts: ContactTouchEvent[]
  endContacts: ContactTouchEvent[]
  hits: ContactHitEvent[]
  beginSensors: SensorTouchEvent[]
  endSensors: SensorTouchEvent[]
}

/** What one `step` cost, in milliseconds. All of it is time spent in native code. */
export type Profile = {
  step: number
  collide: number
  solve: number
  continuous: number
}

export type Counters = {
  bodyCount: number
  shapeCount: number
  contactCount: number
  jointCount: number
  islandCount: number
}

export type DistanceJointDef = {
  bodyIdA: number
  bodyIdB: number
  /** Whether the two bodies' shapes still collide with each other. Defaults to false. */
  collideConnected?: boolean
  localAnchorA?: Vec2
  localAnchorB?: Vec2
  /** Rest length in metres. Must be greater than zero. Defaults to 1. */
  length?: number
  /** Turns the joint into a spring instead of a rigid rod. */
  enableSpring?: boolean
  hertz?: number
  dampingRatio?: number
  enableLimit?: boolean
  minLength?: number
  maxLength?: number
  enableMotor?: boolean
  maxMotorForce?: number
  motorSpeed?: number
}

export type RevoluteJointDef = {
  bodyIdA: number
  bodyIdB: number
  /** Whether the two bodies' shapes still collide with each other. Defaults to false. */
  collideConnected?: boolean
  localAnchorA?: Vec2
  localAnchorB?: Vec2
  /** Angle between the bodies treated as zero, in radians. */
  referenceAngle?: number
  enableSpring?: boolean
  hertz?: number
  dampingRatio?: number
  enableLimit?: boolean
  lowerAngle?: number
  upperAngle?: number
  enableMotor?: boolean
  maxMotorTorque?: number
  motorSpeed?: number
}

export type PrismaticJointDef = {
  bodyIdA: number
  bodyIdB: number
  /** Whether the two bodies' shapes still collide with each other. Defaults to false. */
  collideConnected?: boolean
  localAnchorA?: Vec2
  localAnchorB?: Vec2
  /** The axis of travel, in body A's frame. Defaults to `{ x: 1, y: 0 }`. */
  localAxisA?: Vec2
  referenceAngle?: number
  enableSpring?: boolean
  hertz?: number
  dampingRatio?: number
  enableLimit?: boolean
  lowerTranslation?: number
  upperTranslation?: number
  enableMotor?: boolean
  maxMotorForce?: number
  motorSpeed?: number
}

export type WeldJointDef = {
  bodyIdA: number
  bodyIdB: number
  /** Whether the two bodies' shapes still collide with each other. Defaults to false. */
  collideConnected?: boolean
  localAnchorA?: Vec2
  localAnchorB?: Vec2
  referenceAngle?: number
  /** 0 makes the constraint rigid. Anything above turns it into a spring. */
  linearHertz?: number
  angularHertz?: number
  linearDampingRatio?: number
  angularDampingRatio?: number
}

/**
 * Drags body B towards a moving target, the way a finger drags a shape.
 *
 * Body A is only there to anchor the joint — pass a static body. Box2D wakes
 * body B and expects `setTarget` on every frame the finger moves.
 */
export type MouseJointDef = {
  bodyIdA: number
  bodyIdB: number
  /** Whether the two bodies' shapes still collide with each other. Defaults to false. */
  collideConnected?: boolean
  target: Vec2
  hertz?: number
  dampingRatio?: number
  /** Cap on the pull, in newtons. Defaults to 0, which is no pull at all. */
  maxForce?: number
}

export type ExplosionDef = {
  position: Vec2
  radius: number
  /**
   * Impulse applied per metre of shape perimeter inside the blast, in N·s/m.
   * Positive pushes outwards.
   */
  impulsePerLength: number
  /** Distance past `radius` over which the impulse fades to nothing. */
  falloff?: number
  /** Only shapes whose category matches are affected. Defaults to everything. */
  maskBits?: number
}

/**
 * One collider attached to a {@linkcode Body}.
 *
 * Shapes carry the geometry, the material and the collision filter; the body
 * carries the motion. A body with no shapes has no mass and collides with
 * nothing.
 */
export interface Shape
  extends HybridObject<{
    ios: 'c++'
    android: 'c++'
  }> {
  /**
   * Identifies the shape in `WorldEvents` and ray hits.
   *
   * Unique among *live* shapes only: Box2D recycles the slot after
   * `destroy()`, so do not hold on to it past that.
   */
  readonly id: number
  readonly bodyId: number
  readonly type: ShapeType
  readonly isValid: boolean
  readonly isSensor: boolean

  density: number
  friction: number
  restitution: number
  enableContactEvents: boolean
  enableSensorEvents: boolean
  enableHitEvents: boolean

  setFilter(filter: Filter): void
  getFilter(): Filter
  /** `point` is in world coordinates. */
  testPoint(point: Vec2): boolean
  /** World-space bounding box, as `[lowerX, lowerY, upperX, upperY]`. */
  getAABB(): number[]
  /** The shape's own geometry, in body-local coordinates. Circles only. */
  getCircle(): Circle
  /** Capsules only. */
  getCapsule(): Capsule
  /** Segments only. */
  getSegment(): Segment
  /** Polygons and boxes. Returns the hull's points, in winding order. */
  getPolygonPoints(): Vec2[]

  destroy(): void
}

/**
 * A rigid body: a position, a rotation, a velocity, and the shapes attached
 * to it.
 *
 * Create one with {@linkcode World.createBody}, then give it geometry with the
 * `create*Shape` methods. Mass is recomputed from the shapes as they change,
 * unless the body is static or has fixed rotation.
 */
export interface Body
  extends HybridObject<{
    ios: 'c++'
    android: 'c++'
  }> {
  /**
   * Matches `BodyState.id` and the `bodyIdA`/`bodyIdB` on events, which is how
   * you get from an event back to your own model. Recycled after `destroy()`.
   */
  readonly id: number
  readonly isValid: boolean
  readonly mass: number
  readonly rotationalInertia: number
  readonly worldCenterOfMass: Vec2
  readonly shapeCount: number

  type: BodyType
  position: Vec2
  /**
   * Radians, counter-clockwise.
   *
   * Box2D stores a rotation as a cos/sin pair built with a fast approximation,
   * so an angle set here reads back accurate to roughly a tenth of a degree
   * rather than to float precision. Keep your own value if you need it exact.
   */
  angle: number
  linearVelocity: Vec2
  angularVelocity: number
  linearDamping: number
  angularDamping: number
  gravityScale: number
  fixedRotation: boolean
  bullet: boolean
  awake: boolean
  enabled: boolean
  userData: number

  /**
   * Teleports the body. It does not sweep, so it can end up overlapping
   * something; prefer velocity or forces for anything the player should see
   * move.
   */
  setTransform(position: Vec2, angle: number): void

  applyForce(force: Vec2, point: Vec2, wake: boolean): void
  applyForceToCenter(force: Vec2, wake: boolean): void
  applyTorque(torque: number, wake: boolean): void
  /** An instant change in momentum, in N·s. This is what a jump or a hit is. */
  applyLinearImpulse(impulse: Vec2, point: Vec2, wake: boolean): void
  applyLinearImpulseToCenter(impulse: Vec2, wake: boolean): void
  applyAngularImpulse(impulse: number, wake: boolean): void

  getWorldPoint(localPoint: Vec2): Vec2
  getLocalPoint(worldPoint: Vec2): Vec2
  getWorldVector(localVector: Vec2): Vec2
  getLocalVector(worldVector: Vec2): Vec2

  createCircleShape(def: ShapeDef, circle: Circle): Shape
  createCapsuleShape(def: ShapeDef, capsule: Capsule): Shape
  createSegmentShape(def: ShapeDef, segment: Segment): Shape
  createPolygonShape(def: ShapeDef, polygon: PolygonShape): Shape
  /** `halfWidth`/`halfHeight` are half-extents: a 2x1 box is `(1, 0.5)`. */
  createBoxShape(
    def: ShapeDef,
    halfWidth: number,
    halfHeight: number,
    center: Vec2,
    angle: number
  ): Shape

  getShapes(): Shape[]
  getState(): BodyState
  /** World-space bounding box over every shape, as `[lowerX, lowerY, upperX, upperY]`. */
  computeAABB(): number[]

  destroy(): void
}

/**
 * A joint constraining two bodies.
 *
 * One interface covers every joint type, because that is what Box2D's own C API
 * does. The type-specific methods throw when called on the wrong joint — check
 * `type` if you are holding a joint you did not create yourself.
 */
export interface Joint
  extends HybridObject<{
    ios: 'c++'
    android: 'c++'
  }> {
  readonly id: number
  readonly type: JointType
  readonly isValid: boolean
  readonly bodyIdA: number
  readonly bodyIdB: number

  collideConnected: boolean

  wakeBodies(): void
  /** The force the joint applied over the last step, in newtons. */
  getConstraintForce(): Vec2
  getConstraintTorque(): number

  /** Distance, prismatic, revolute and wheel joints. */
  enableMotor(enable: boolean): void
  setMotorSpeed(speed: number): void
  getMotorSpeed(): number
  /** Distance and prismatic joints. */
  setMaxMotorForce(force: number): void
  /** Revolute and wheel joints. */
  setMaxMotorTorque(torque: number): void
  /** Newtons for distance and prismatic joints, N·m for revolute and wheel. */
  getMotorLoad(): number

  /** Distance, prismatic and revolute joints. */
  enableLimit(enable: boolean): void
  /** Radians for revolute joints, metres for the rest. */
  setLimits(lower: number, upper: number): void

  /** Distance, prismatic, revolute and wheel joints. */
  enableSpring(enable: boolean): void
  setSpringHertz(hertz: number): void
  setSpringDampingRatio(dampingRatio: number): void

  /** Distance joints. */
  setLength(length: number): void
  getLength(): number
  getCurrentLength(): number

  /** Mouse joints. Call it every frame the target moves. */
  setTarget(target: Vec2): void
  getTarget(): Vec2
  setMaxForce(force: number): void

  /** Revolute joints: the current angle in radians. */
  getAngle(): number
  /** Prismatic joints: the current offset along the axis, in metres. */
  getTranslation(): number
  /** Prismatic joints: the current speed along the axis, in m/s. */
  getSpeed(): number

  destroy(): void
}

/**
 * A physics world: the bodies, the joints, and the solver that advances them.
 *
 * Step it with a fixed `timeStep` — feeding it the real frame delta makes the
 * simulation depend on frame rate, which is the usual cause of "it behaves
 * differently on the other phone". 1/60 with 4 sub-steps is Box2D's own
 * recommendation.
 */
export interface World
  extends HybridObject<{
    ios: 'c++'
    android: 'c++'
  }> {
  readonly isValid: boolean
  readonly awakeBodyCount: number

  gravity: Vec2
  sleepingEnabled: boolean
  continuousEnabled: boolean
  restitutionThreshold: number
  hitEventThreshold: number

  createBody(def: BodyDef): Body

  /**
   * Advances the simulation by `timeStep` seconds.
   *
   * `subStepCount` is how many solver iterations that step is split into — 4 is
   * the default and is plenty for most scenes; raise it for long joint chains.
   */
  step(timeStep: number, subStepCount: number): void

  /** Every body in the world, awake or not. */
  getBodyStates(): BodyState[]
  /** Only the bodies that moved this step, which is usually far fewer. */
  getAwakeBodyStates(): BodyState[]

  /**
   * The same data as `getAwakeBodyStates`, packed as a `Float32Array`-shaped
   * buffer with a stride of 4: `[id, x, y, angle]` per body.
   *
   * One buffer copy instead of an object per body — worth it once a few hundred
   * bodies are moving, and pointless below that.
   */
  getAwakeBodyTransforms(): ArrayBuffer

  getEvents(): WorldEvents

  createDistanceJoint(def: DistanceJointDef): Joint
  createRevoluteJoint(def: RevoluteJointDef): Joint
  createPrismaticJoint(def: PrismaticJointDef): Joint
  createWeldJoint(def: WeldJointDef): Joint
  createMouseJoint(def: MouseJointDef): Joint

  /** Nearest shape along the ray, or `undefined` when it hits nothing. */
  castRayClosest(origin: Vec2, translation: Vec2): RayHit | undefined
  /** Every shape the ray crosses, nearest first. */
  castRay(origin: Vec2, translation: Vec2): RayHit[]
  /** Shape ids whose bounding box overlaps the box. Broad-phase only, so it over-reports. */
  overlapAABB(lower: Vec2, upper: Vec2): number[]
  /** Shapes containing `point` exactly, narrow-phase. */
  queryPoint(point: Vec2): number[]

  /** A radial impulse. Only affects awake dynamic bodies. */
  explode(def: ExplosionDef): void

  getProfile(): Profile
  getCounters(): Counters

  /**
   * Frees the world and everything in it.
   *
   * Every `Body`, `Shape` and `Joint` from this world throws after this — they
   * hold handles into memory that no longer exists, and Box2D's own validity
   * check cannot see a freed world.
   */
  destroy(): void
}

/**
 * Entry point. One instance per app; worlds are independent of each other.
 */
export interface Box2D
  extends HybridObject<{
    ios: 'c++'
    android: 'c++'
  }> {
  /** The vendored Box2D version, for example `3.1.1`. */
  readonly version: string

  createWorld(def: WorldDef): World

  /**
   * Rescales Box2D's internal tolerances, in metres per "metre".
   *
   * Set it once before creating any world, and only if your units genuinely
   * cannot be metres. Converting at the render layer is almost always better.
   */
  setLengthUnitsPerMeter(unitsPerMeter: number): void
  getLengthUnitsPerMeter(): number
}
