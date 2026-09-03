import { radToDeg } from 'nitro-box2d'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native'

import { Scene, WORLD_WIDTH_METERS, type Transform } from './scene'

type Placed = {
  bodyId: number
  kind: 'box' | 'circle'
  halfWidth: number
  halfHeight: number
  color: string
  transform: Transform
}

type Props = {
  /** The screen only steps its world while it is the one on show. */
  active: boolean
  width: number
  height: number
  onStats: (stats: string) => void
}

export function PlaygroundScreen({ active, width, height, onStats }: Props) {
  // Pixels per metre. Fixed by the width, so the world is always six metres across.
  const scale = width / WORLD_WIDTH_METERS
  const heightMeters = height / scale

  const sceneRef = useRef<Scene | null>(null)
  const [placed, setPlaced] = useState<Placed[]>([])

  useEffect(() => {
    const scene = new Scene(heightMeters)
    sceneRef.current = scene

    return () => {
      scene.destroy()
      sceneRef.current = null
    }
  }, [heightMeters])

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

      if (scene.advance(elapsed) === 0) {
        return
      }

      const transforms = scene.readTransforms()
      if (transforms.size === 0) {
        // Everything is asleep. Re-rendering identical positions is pure waste.
        return
      }

      setPlaced((current) =>
        current.map((item) => {
          const next = transforms.get(item.bodyId)
          return next === undefined ? item : { ...item, transform: next }
        })
      )
      onStats(`${scene.sprites.size} bodies · ${scene.world.getProfile().step.toFixed(2)} ms/step`)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, onStats])

  const drop = useCallback(
    (event: GestureResponderEvent) => {
      const scene = sceneRef.current
      if (scene === null) {
        return
      }

      const { locationX, locationY } = event.nativeEvent
      const position = {
        x: locationX / scale - WORLD_WIDTH_METERS / 2,
        y: (height - locationY) / scale,
      }

      const kind = Math.random() < 0.5 ? 'box' : 'circle'
      const body = scene.drop(position, kind)
      const sprite = scene.sprites.get(body.id)
      if (sprite === undefined) {
        return
      }

      setPlaced((current) => [
        ...current,
        { ...sprite, transform: { x: position.x, y: position.y, angle: 0 } },
      ])
    },
    [scale, height]
  )

  const explode = useCallback(() => {
    // Just above the floor, where whatever has been dropped ends up.
    sceneRef.current?.explode({ x: 0, y: 0.4 })
  }, [])

  const reset = useCallback(() => {
    sceneRef.current?.clearDroppedBodies()
    setPlaced([])
  }, [])

  return (
    <View style={styles.root}>
      <Pressable style={[styles.stage, { height }]} onPress={drop}>
        {placed.map((item) => {
          const size = { width: item.halfWidth * 2 * scale, height: item.halfHeight * 2 * scale }
          const left = (item.transform.x + WORLD_WIDTH_METERS / 2) * scale - size.width / 2
          const top = height - item.transform.y * scale - size.height / 2

          return (
            <View
              key={item.bodyId}
              testID={`body-${item.bodyId}`}
              style={[
                styles.sprite,
                size,
                {
                  left,
                  top,
                  backgroundColor: item.color,
                  borderRadius: item.kind === 'circle' ? size.width / 2 : 4,
                  transform: [{ rotate: `${radToDeg(item.transform.angle)}deg` }],
                },
              ]}
            />
          )
        })}

        <View style={styles.floor} pointerEvents="none" />
        <Text style={styles.hint}>Tap anywhere to drop a shape</Text>
      </Pressable>

      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={explode} testID="explode">
          <Text style={styles.buttonLabel}>Explode</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondary]} onPress={reset} testID="reset">
          <Text style={styles.buttonLabel}>Reset</Text>
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
    backgroundColor: '#1a1d27',
    overflow: 'hidden',
  },
  // A border on the stage would sit inside its box and push every absolutely
  // positioned sprite down by a point, so the floor is drawn as its own view.
  floor: {
    backgroundColor: '#2a2f3d',
    bottom: 0,
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  sprite: {
    position: 'absolute',
  },
  hint: {
    alignSelf: 'center',
    color: '#4d5468',
    fontSize: 13,
    position: 'absolute',
    top: 16,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  button: {
    backgroundColor: '#5b8def',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 14,
  },
  secondary: {
    backgroundColor: '#2a2f3d',
  },
  buttonLabel: {
    color: '#f5f6fa',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
})
