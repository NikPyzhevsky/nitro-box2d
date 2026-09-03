import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native'

import { PinballScene, type Transform } from './scene'
import {
  BALL_RADIUS,
  LANE_INNER_X,
  MAX_PULL,
  PLUNGER_HALF_HEIGHT,
  PLUNGER_HALF_WIDTH,
  POCKET_HEIGHT,
  TABLE_HALF_WIDTH,
  type TableLayout,
} from './table'

const BALLS_PER_GAME = 3
/** Finger travel, in points, that draws the plunger all the way back. */
const PULL_TRAVEL = 150
/**
 * Points of margin around the table.
 *
 * The frame is drawn as lines centred on the wall, so without this the outer
 * walls would be half off the screen and the table would look open on the right.
 */
const INSET = 3
/** Height of the pull gauge, in points. */
const GAUGE_HEIGHT = 110

const POCKET_COLORS: Record<number, string> = {
  1: '#3b4254',
  3: '#4c6ef5',
  5: '#4caf82',
  20: '#f4b942',
}

type Props = {
  active: boolean
  width: number
  height: number
  onStats: (stats: string) => void
}

export function PinballScreen({ active, width, height, onStats }: Props) {
  const scale = (width - INSET * 2) / (TABLE_HALF_WIDTH * 2)
  const tableHeight = (height - INSET * 2) / scale

  const sceneRef = useRef<PinballScene | null>(null)
  const [layout, setLayout] = useState<TableLayout | null>(null)
  const [ball, setBall] = useState<Transform | null>(null)
  const [pullMeters, setPullMeters] = useState(0)
  const [score, setScore] = useState(0)
  const [ballsLeft, setBallsLeft] = useState(BALLS_PER_GAME)
  const [lastPocket, setLastPocket] = useState<number | null>(null)

  // The frame loop reads these rather than the state above, so a drag never
  // waits on a React render to reach the solver.
  const pullRef = useRef(0)
  const draggingRef = useRef(false)
  const ballsLeftRef = useRef(BALLS_PER_GAME)

  useEffect(() => {
    const scene = new PinballScene(tableHeight)
    sceneRef.current = scene
    setLayout(scene.layout)

    return () => {
      scene.destroy()
      sceneRef.current = null
    }
  }, [tableHeight])

  useEffect(() => {
    if (!active) {
      return
    }

    let frame = 0
    let previous = 0

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const scene = sceneRef.current
      if (scene === null) {
        return
      }
      if (previous === 0) {
        previous = now
        return
      }

      const elapsed = (now - previous) / 1000
      previous = now

      if (draggingRef.current) {
        scene.pull(pullRef.current)
      }

      for (const event of scene.advance(elapsed)) {
        if (event.kind === 'peg') {
          setScore((current) => current + 10)
          continue
        }

        setScore((current) => current + event.multiplier * 100)
        setLastPocket(event.pocket)
        ballsLeftRef.current -= 1
        setBallsLeft(ballsLeftRef.current)
        if (ballsLeftRef.current > 0) {
          scene.serve()
        }
      }

      setBall(scene.ballTransform())
      setPullMeters(-scene.plungerTranslation())
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active])

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          draggingRef.current = true
          pullRef.current = 0
        },
        onPanResponderMove: (_event, gesture) => {
          // Dragging down draws the plunger down. Anywhere on the table works —
          // asking for a precise grab on a 30pt-wide lane would be miserable.
          pullRef.current = Math.max(0, Math.min(1, gesture.dy / PULL_TRAVEL))
        },
        onPanResponderRelease: () => {
          draggingRef.current = false
          sceneRef.current?.release()
        },
        onPanResponderTerminate: () => {
          draggingRef.current = false
          sceneRef.current?.release()
        },
      }),
    []
  )

  const newGame = useCallback(() => {
    setScore(0)
    setLastPocket(null)
    ballsLeftRef.current = BALLS_PER_GAME
    setBallsLeft(BALLS_PER_GAME)
    sceneRef.current?.serve()
  }, [])

  useEffect(() => {
    onStats(`${score} pts · ${ballsLeft} balls`)
  }, [onStats, score, ballsLeft])

  const toX = (meters: number) => INSET + (meters + TABLE_HALF_WIDTH) * scale
  const toY = (meters: number) => height - INSET - meters * scale

  const gameOver = ballsLeft === 0

  return (
    <View style={styles.root}>
      <View style={[styles.stage, { height }]} {...pan.panHandlers}>
        {layout !== null && (
          <>
            {layout.pockets.map((pocket) => {
              const left = toX(pocket.left)
              const pocketWidth = (pocket.right - pocket.left) * scale
              return (
                <View
                  key={`pocket-${pocket.index}`}
                  pointerEvents="none"
                  style={[
                    styles.pocket,
                    {
                      backgroundColor: POCKET_COLORS[pocket.multiplier] ?? '#3b4254',
                      height: POCKET_HEIGHT * scale,
                      left: left + 1,
                      top: toY(POCKET_HEIGHT),
                      width: pocketWidth - 2,
                      opacity: lastPocket === pocket.index ? 1 : 0.55,
                    },
                  ]}
                >
                  <Text style={styles.pocketLabel}>×{pocket.multiplier}</Text>
                </View>
              )
            })}

            {layout.walls.map((wall, index) => {
              const x1 = toX(wall.x1)
              const y1 = toY(wall.y1)
              const x2 = toX(wall.x2)
              const y2 = toY(wall.y2)
              const dx = x2 - x1
              const dy = y2 - y1
              const length = Math.hypot(dx, dy)

              return (
                <View
                  key={`wall-${index}`}
                  pointerEvents="none"
                  style={[
                    styles.wall,
                    {
                      left: x1 + dx / 2 - length / 2,
                      top: y1 + dy / 2 - 1,
                      width: length,
                      transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                    },
                  ]}
                />
              )
            })}

            {layout.pegs.map((peg, index) => (
              <View
                key={`peg-${index}`}
                pointerEvents="none"
                style={[
                  styles.peg,
                  {
                    height: peg.radius * 2 * scale,
                    left: toX(peg.x - peg.radius),
                    top: toY(peg.y + peg.radius),
                    width: peg.radius * 2 * scale,
                    borderRadius: peg.radius * scale,
                  },
                ]}
              />
            ))}

            <View
              pointerEvents="none"
              testID="plunger"
              style={[
                styles.plunger,
                {
                  height: PLUNGER_HALF_HEIGHT * 2 * scale,
                  left: toX(layout.plunger.x - PLUNGER_HALF_WIDTH),
                  top: toY(layout.plunger.y + PLUNGER_HALF_HEIGHT - pullMeters),
                  width: PLUNGER_HALF_WIDTH * 2 * scale,
                },
              ]}
            />
          </>
        )}

        {ball !== null && (
          <View
            pointerEvents="none"
            testID="ball"
            style={[
              styles.ball,
              {
                height: BALL_RADIUS * 2 * scale,
                left: toX(ball.x - BALL_RADIUS),
                top: toY(ball.y + BALL_RADIUS),
                width: BALL_RADIUS * 2 * scale,
                borderRadius: BALL_RADIUS * scale,
              },
            ]}
          />
        )}

        <View
          pointerEvents="none"
          style={[styles.gauge, { right: (TABLE_HALF_WIDTH - LANE_INNER_X) * scale + 12 }]}
        >
          <View
            style={[
              styles.gaugeFill,
              {
                height: Math.min(1, pullMeters / MAX_PULL) * (GAUGE_HEIGHT - 4),
                // Amber while the pull is still too weak to clear the lane,
                // green once it will — the one thing worth telling the player.
                backgroundColor: pullMeters / MAX_PULL > 0.7 ? '#4caf82' : '#f4b942',
              },
            ]}
          />
        </View>

        <Text style={styles.hint} pointerEvents="none">
          {gameOver ? 'Out of balls' : 'Drag down to draw the plunger, release to launch'}
        </Text>
      </View>

      <View style={styles.controls}>
        <Text style={styles.score}>
          {score} <Text style={styles.scoreUnit}>pts</Text>
        </Text>
        <Text style={styles.balls}>{'●'.repeat(ballsLeft) + '○'.repeat(BALLS_PER_GAME - ballsLeft)}</Text>
        <Pressable style={styles.button} onPress={newGame} testID="new-game">
          <Text style={styles.buttonLabel}>New game</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stage: {
    backgroundColor: '#14171f',
    overflow: 'hidden',
  },
  wall: {
    backgroundColor: '#39415a',
    height: 2,
    position: 'absolute',
  },
  peg: {
    backgroundColor: '#e2725b',
    position: 'absolute',
  },
  pocket: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    position: 'absolute',
  },
  pocketLabel: {
    color: '#0d0f14',
    fontSize: 11,
    fontWeight: '700',
  },
  plunger: {
    backgroundColor: '#b07de0',
    borderRadius: 3,
    position: 'absolute',
  },
  ball: {
    backgroundColor: '#f5f6fa',
    position: 'absolute',
  },
  gauge: {
    backgroundColor: '#20242f',
    borderRadius: 5,
    bottom: 24,
    height: GAUGE_HEIGHT,
    justifyContent: 'flex-end',
    padding: 2,
    position: 'absolute',
    width: 10,
  },
  gaugeFill: {
    borderRadius: 3,
    width: 6,
  },
  hint: {
    alignSelf: 'center',
    color: '#4d5468',
    fontSize: 12,
    position: 'absolute',
    top: 12,
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    padding: 20,
  },
  score: {
    color: '#f5f6fa',
    fontSize: 22,
    fontWeight: '700',
  },
  scoreUnit: {
    color: '#8b93a7',
    fontSize: 13,
    fontWeight: '500',
  },
  balls: {
    color: '#f4b942',
    flex: 1,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#2a2f3d',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonLabel: {
    color: '#f5f6fa',
    fontSize: 15,
    fontWeight: '600',
  },
})
