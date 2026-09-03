/**
 * The table's geometry, as plain data.
 *
 * Physics and rendering both read this, so a wall can never be drawn somewhere
 * the ball does not actually collide with — the usual way a hand-built demo
 * scene drifts out of sync with itself.
 *
 * Metres throughout, origin at the bottom centre, y pointing up.
 */

export const TABLE_HALF_WIDTH = 2.5
/** The channel the ball is launched up, along the right edge. */
export const LANE_WIDTH = 0.55
export const LANE_INNER_X = TABLE_HALF_WIDTH - LANE_WIDTH
/** Height of the scoring pockets along the bottom. */
export const POCKET_HEIGHT = 1
/**
 * How far below the ceiling the lane's inner wall stops. A launched ball has to
 * clear this to reach the play area at all, which is what makes the strength of
 * the pull matter.
 */
export const LANE_WALL_TOP_DROP = 2.4
/** How far the corner guide above the lane drops from the ceiling to the right wall. */
export const DEFLECTOR_DROP = 1.8
/** The plunger's rest height. Its travel is this down to `- MAX_PULL`. */
export const PLUNGER_REST_Y = 1
/** The two dividers flanking the jackpot stand higher, to guard it. */
export const GUARD_HEIGHT = 1.55
export const BALL_RADIUS = 0.13
export const PLUNGER_HALF_WIDTH = 0.24
export const PLUNGER_HALF_HEIGHT = 0.12
/** How far down the plunger can be drawn, in metres. */
export const MAX_PULL = 0.75

/**
 * One multiplier per pocket, left to right. The jackpot sits in the middle
 * behind the two tall dividers, so it takes a near-vertical drop to land in.
 */
export const POCKET_MULTIPLIERS = [3, 1, 5, 20, 5, 1, 3]

export type Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type Peg = {
  x: number
  y: number
  radius: number
}

export type Pocket = {
  index: number
  left: number
  right: number
  multiplier: number
}

export type TableLayout = {
  height: number
  /** Every solid line on the table: the outer frame, the lane, the dividers. */
  walls: Wall[]
  pegs: Peg[]
  pockets: Pocket[]
  /** Where a fresh ball is placed, resting on top of the plunger. */
  serve: { x: number; y: number }
  /** The plunger's rest position — the top of its travel. */
  plunger: { x: number; y: number }
}

/**
 * Builds the table for a play area `height` metres tall.
 *
 * The height comes from the screen rather than being fixed, so the table fills
 * whatever phone it is on instead of letterboxing. Everything that has to scale
 * with it is expressed as a fraction.
 */
export const buildTable = (height: number): TableLayout => {
  const half = TABLE_HALF_WIDTH
  const laneX = LANE_INNER_X

  const pocketCount = POCKET_MULTIPLIERS.length
  const pocketSpan = laneX + half
  const pocketWidth = pocketSpan / pocketCount
  const jackpot = Math.floor(pocketCount / 2)

  const pockets: Pocket[] = POCKET_MULTIPLIERS.map((multiplier, index) => ({
    index,
    left: -half + index * pocketWidth,
    right: -half + (index + 1) * pocketWidth,
    multiplier: multiplier ?? 1,
  }))

  const dividers: Wall[] = []
  for (let i = 1; i < pocketCount; i++) {
    const x = -half + i * pocketWidth
    // The two dividers around the jackpot are the guards.
    const tall = i === jackpot || i === jackpot + 1
    dividers.push({ x1: x, y1: 0, x2: x, y2: tall ? GUARD_HEIGHT : POCKET_HEIGHT })
  }

  const walls: Wall[] = [
    // Outer frame. The bottom is solid — it is the floor of the pockets.
    { x1: -half, y1: 0, x2: -half, y2: height },
    { x1: half, y1: 0, x2: half, y2: height },
    { x1: -half, y1: 0, x2: half, y2: 0 },
    { x1: -half, y1: height, x2: half * 0.36, y2: height },
    // The guide that turns a launched ball out of the lane and into the play
    // area. It has to slope *down to the right*: a ball travelling straight up
    // bounces along the surface normal, and only this way round does that point
    // left. Sloping the other way would fire the ball back into the corner.
    { x1: half * 0.36, y1: height, x2: half, y2: height - DEFLECTOR_DROP },
    // The lane's inner wall. It stops short of the top so a ball that clears it
    // is thrown into the play area — and one that does not simply drops back
    // onto the plunger for another go.
    { x1: laneX, y1: 0, x2: laneX, y2: height - LANE_WALL_TOP_DROP },
    // The lane has no floor of its own: the plunger is its floor, and a floor
    // here would sit across the plunger's travel.
    ...dividers,
  ]

  const pegs: Peg[] = [
    { x: -1.45, y: height * 0.62, radius: 0.16 },
    { x: 0.0, y: height * 0.7, radius: 0.16 },
    { x: 1.2, y: height * 0.62, radius: 0.16 },
    { x: -0.72, y: height * 0.5, radius: 0.16 },
    { x: 0.6, y: height * 0.5, radius: 0.16 },
    { x: -1.72, y: height * 0.38, radius: 0.16 },
    { x: 1.5, y: height * 0.38, radius: 0.16 },
  ]

  const laneCentre = (laneX + half) / 2
  const plungerY = PLUNGER_REST_Y

  return {
    height,
    walls,
    pegs,
    pockets,
    serve: { x: laneCentre, y: plungerY + PLUNGER_HALF_HEIGHT + BALL_RADIUS + 0.02 },
    plunger: { x: laneCentre, y: plungerY },
  }
}
