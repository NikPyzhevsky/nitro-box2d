import { afterEach, describe, expect, test } from 'react-native-harness'

import { PinballScene, type PinballEvent } from '../src/pinball/scene'
import {
  BALL_RADIUS,
  buildTable,
  LANE_INNER_X,
  LANE_WALL_TOP_DROP,
  MAX_PULL,
  POCKET_MULTIPLIERS,
  TABLE_HALF_WIDTH,
} from '../src/pinball/table'

/** A table roughly the shape of a phone's play area. */
const TABLE_HEIGHT = 8.5

let scene: PinballScene | null = null

const build = () => {
  scene = new PinballScene(TABLE_HEIGHT)
  return scene
}

afterEach(() => {
  scene?.destroy()
  scene = null
})

/** Steps one frame at a time, so a test can watch the ball as it goes. */
const step = (instance: PinballScene, frames: number, watch?: () => void) => {
  const events: PinballEvent[] = []
  for (let i = 0; i < frames; i++) {
    events.push(...instance.advance(1 / 60))
    watch?.()
  }
  return events
}

const launch = (instance: PinballScene, pull: number, frames = 70) => {
  for (let i = 0; i < frames; i++) {
    instance.pull(pull)
    instance.advance(1 / 60)
  }
  instance.release()
}

describe('table geometry', () => {
  test('the pockets tile the whole bottom with no gaps', () => {
    const table = buildTable(TABLE_HEIGHT)

    expect(table.pockets).toHaveLength(POCKET_MULTIPLIERS.length)
    expect(table.pockets[0]!.left).toBeCloseTo(-TABLE_HALF_WIDTH, 5)
    expect(table.pockets[table.pockets.length - 1]!.right).toBeCloseTo(LANE_INNER_X, 5)

    // Each pocket starts exactly where the previous one ended.
    for (let i = 1; i < table.pockets.length; i++) {
      expect(table.pockets[i]!.left).toBeCloseTo(table.pockets[i - 1]!.right, 5)
    }
  })

  test('the peg field always leaves a gap wider than the ball', () => {
    // Checked at both extremes of the table heights a phone can produce: a
    // shorter screen must not squeeze the rows together until the ball can no
    // longer get through.
    for (const height of [7, TABLE_HEIGHT, 10]) {
      const { pegs } = buildTable(height)

      let narrowest = Infinity
      for (let i = 0; i < pegs.length; i++) {
        for (let j = i + 1; j < pegs.length; j++) {
          const a = pegs[i]!
          const b = pegs[j]!
          narrowest = Math.min(narrowest, Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius)
        }
      }

      expect(narrowest).toBeGreaterThan(BALL_RADIUS * 2)
    }
  })

  test('the pegs stay clear of the walls and the launch lane', () => {
    const { pegs } = buildTable(TABLE_HEIGHT)

    for (const peg of pegs) {
      expect(peg.x - peg.radius).toBeGreaterThan(-TABLE_HALF_WIDTH + BALL_RADIUS * 2)
      expect(peg.x + peg.radius).toBeLessThan(LANE_INNER_X - BALL_RADIUS * 2)
    }
  })

  test('the jackpot sits in the middle', () => {
    const table = buildTable(TABLE_HEIGHT)
    const best = table.pockets.reduce((a, b) => (b.multiplier > a.multiplier ? b : a))

    expect(best.index).toBe(Math.floor(POCKET_MULTIPLIERS.length / 2))
    expect(best.multiplier).toBe(20)
  })
})

describe('the plunger', () => {
  test('holds a served ball in the lane', () => {
    const instance = build()

    step(instance, 60)

    const ball = instance.ballTransform()
    expect(ball).not.toBeNull()
    // Still in the lane, resting on the plunger rather than through the floor.
    expect(ball!.x).toBeGreaterThan(LANE_INNER_X)
    expect(ball!.y).toBeGreaterThan(1)
  })

  test('a drag draws it down, and it springs back on release', () => {
    const instance = build()

    for (let i = 0; i < 40; i++) {
      instance.pull(1)
      instance.advance(1 / 60)
    }
    const drawn = instance.plungerTranslation()
    expect(drawn).toBeLessThan(-MAX_PULL * 0.85)

    instance.release()
    step(instance, 60)

    expect(instance.plungerTranslation()).toBeGreaterThan(drawn)
  })

  test('a full draw throws the ball out of the lane and into the play area', () => {
    const instance = build()
    launch(instance, 1)

    let highest = 0
    let leftTheLane = false
    step(instance, 240, () => {
      const ball = instance.ballTransform()
      if (ball === null) {
        return
      }
      highest = Math.max(highest, ball.y)
      if (ball.x < LANE_INNER_X) {
        leftTheLane = true
      }
    })

    // The lane wall stops 1.5m below the ceiling; clearing it is what gets the
    // ball onto the playfield at all.
    expect(highest).toBeGreaterThan(TABLE_HEIGHT - LANE_WALL_TOP_DROP)
    expect(leftTheLane).toBe(true)
  })

  test('a light draw does not clear the lane, and the ball comes back for another go', () => {
    const instance = build()
    launch(instance, 0.4)

    let highest = 0
    step(instance, 180, () => {
      const ball = instance.ballTransform()
      if (ball !== null) {
        highest = Math.max(highest, ball.y)
      }
    })

    expect(highest).toBeLessThan(TABLE_HEIGHT - LANE_WALL_TOP_DROP)
    // No ball lost: it is back in the lane, resting on the plunger.
    expect(instance.hasBall).toBe(true)
    expect(instance.ballTransform()!.x).toBeGreaterThan(LANE_INNER_X)
  })
})

describe('scoring', () => {
  test('a launched ball ends up in a pocket', () => {
    const instance = build()
    launch(instance, 1)

    const events = step(instance, 900)
    const pockets = events.filter((event) => event.kind === 'pocket')

    expect(pockets.length).toBeGreaterThanOrEqual(1)
    const [first] = pockets
    expect(first!.kind).toBe('pocket')
    if (first!.kind === 'pocket') {
      expect(POCKET_MULTIPLIERS).toContain(first!.multiplier)
      expect(first!.pocket).toBeGreaterThanOrEqual(0)
      expect(first!.pocket).toBeLessThan(POCKET_MULTIPLIERS.length)
    }
  })

  test('the ball is taken out of play when it pockets, and can be re-served', () => {
    const instance = build()
    launch(instance, 1)

    step(instance, 900)
    expect(instance.hasBall).toBe(false)

    instance.serve()
    expect(instance.hasBall).toBe(true)
    expect(instance.ballTransform()!.x).toBeGreaterThan(LANE_INNER_X)
  })

  test('bouncing off the pegs reports hits', () => {
    const instance = build()
    launch(instance, 1)

    const events = step(instance, 900)

    expect(events.some((event) => event.kind === 'peg')).toBe(true)
  })
})
