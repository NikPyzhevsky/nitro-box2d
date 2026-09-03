import { NitroModules } from 'react-native-nitro-modules'
import type { Box2D } from './specs/Box2D.nitro'

export type {
  Body,
  BodyDef,
  BodyState,
  Box2D,
  Capsule,
  Circle,
  ContactHitEvent,
  ContactTouchEvent,
  Counters,
  DistanceJointDef,
  ExplosionDef,
  Filter,
  Joint,
  MouseJointDef,
  PolygonShape,
  PrismaticJointDef,
  Profile,
  RayHit,
  RevoluteJointDef,
  Segment,
  SensorTouchEvent,
  Shape,
  ShapeDef,
  Vec2,
  WeldJointDef,
  World,
  WorldDef,
  WorldEvents,
} from './specs/Box2D.nitro'

export { BodyType, JointType, ShapeType } from './specs/Box2D.nitro'

/**
 * The Box2D entry point.
 *
 * Created eagerly, like any always-present Hybrid Object: if the native side is
 * missing, that is a broken build and failing at import is more honest than
 * failing later on the first `createWorld`.
 */
export const box2d = NitroModules.createHybridObject<Box2D>('Box2D')

/** Radians for a given number of degrees. Box2D angles are radians throughout. */
export const degToRad = (degrees: number): number => (degrees * Math.PI) / 180

/** Degrees for a given number of radians. */
export const radToDeg = (radians: number): number => (radians * 180) / Math.PI

/**
 * Reads a buffer from `World.getAwakeBodyTransforms` as a typed array.
 *
 * Stride 4: `[id, x, y, angle]`. The view aliases the buffer, so copy anything
 * you intend to keep past the next step.
 */
export const asTransformArray = (buffer: ArrayBuffer): Float32Array =>
  new Float32Array(buffer)
