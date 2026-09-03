import { screen, userEvent } from '@react-native-harness/ui'
import { describe, expect, render, test, waitUntil } from 'react-native-harness'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { BodyType, box2d, type Body, type World } from 'nitro-box2d'

/**
 * The smallest thing that is still a real integration: a component that owns a
 * world, steps it, and renders what the simulation says.
 *
 * The height goes into the `testID` because the harness's screen queries work on
 * test ids and accessibility labels, not on rendered text.
 */
function FallingBox() {
  const worldRef = useRef<World | null>(null)
  const bodyRef = useRef<Body | null>(null)
  const [height, setHeight] = useState(10)

  useEffect(() => {
    const world = box2d.createWorld({ gravity: { x: 0, y: -10 } })
    const body = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 10 } })
    body.createBoxShape({ density: 1 }, 0.5, 0.5, { x: 0, y: 0 }, 0)

    worldRef.current = world
    bodyRef.current = body

    return () => {
      world.destroy()
      worldRef.current = null
      bodyRef.current = null
    }
  }, [])

  const advance = useCallback(() => {
    const world = worldRef.current
    const body = bodyRef.current
    if (world === null || body === null) {
      return
    }

    for (let i = 0; i < 30; i++) {
      world.step(1 / 60, 4)
    }
    setHeight(body.position.y)
  }, [])

  return (
    <View testID="falling-box" style={{ width: 240, height: 120, padding: 12 }}>
      <Text testID={`height-${Math.floor(height)}`}>{height.toFixed(2)} m</Text>
      <Pressable testID="advance" onPress={advance}>
        <Text>Advance</Text>
      </Pressable>
    </View>
  )
}

describe('rendering a simulation', () => {
  test('the first render shows the starting height', async () => {
    await render(<FallingBox />)

    expect(await screen.findByTestId('falling-box')).toBeDefined()
    expect(screen.queryByTestId('height-10')).not.toBeNull()
  })

  test('pressing advance drops the box', async () => {
    await render(<FallingBox />)

    await userEvent.press(await screen.findByTestId('advance'))

    // Half a second of free fall under -10 m/s² is a little over a metre, so the
    // box ends up somewhere in the eighth metre.
    await waitUntil(() => screen.queryByTestId('height-8') !== null)

    expect(screen.queryByTestId('height-10')).toBeNull()
  })
})
