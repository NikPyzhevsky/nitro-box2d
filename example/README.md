# nitro-box2d example

An Expo app that is two things at once: two screens you can play with, and the
test suite for `nitro-box2d`, run on a real device or simulator through
[React Native Harness](https://react-native-harness.dev).

## Running the app

```bash
npm install
npx expo prebuild
npm run ios      # or: npm run android
```

### Playground

![Shapes dropping onto a pile](https://raw.githubusercontent.com/NikPyzhevsky/nitro-box2d/main/docs/playground.gif)

Tap anywhere to drop a shape, *Explode* to blow the pile apart, *Reset* to clear
it. The header shows the Box2D version, the body count and how long a solver step
is actually taking.

[`src/playground/scene.ts`](src/playground/scene.ts) is the short version of
using this library: the fixed-timestep accumulator, the metres-to-pixels
conversion, and the choice to render only the bodies that moved.

### Pinball

![A ball launched from a spring plunger into scoring pockets](https://raw.githubusercontent.com/NikPyzhevsky/nitro-box2d/main/docs/pinball.gif)

Drag anywhere on the table to draw the plunger back, let go to launch. Pull
about seven tenths of the way and the ball clears the lane into the play area;
less than that and it drops back onto the plunger for another go, at no cost.
The whole bottom of the table is scoring pockets, ×20 in the middle behind two
tall guards.

It leans on the parts of the library the playground never touches:

- **A prismatic joint is the entire plunger.** The joint confines the body to
  the lane's axis, its limit is the travel, and its spring is what fires it.
  Drawing back is a motor fighting that spring; releasing just switches the
  motor off. [`src/pinball/scene.ts`](src/pinball/scene.ts)
- **Sensors score.** Each pocket is a sensor shape, and a `beginSensors` event
  maps back to its pocket through the shape id. Sensor events are opt-in on the
  *visitor* as well as on the sensor — forgetting that on the ball is why the
  first version of this screen scored nothing.
- **Contact events ring up the pegs**, and only the pegs: events are per shape,
  so the walls stay silent and cost nothing.
- **The table is data.** [`src/pinball/table.ts`](src/pinball/table.ts) returns
  the geometry, and both the physics bodies and the on-screen lines are built
  from it, so a wall can never be drawn somewhere the ball does not collide.

Both screens stay mounted when you switch tabs, so a game in progress survives.
Only the visible one steps its world; an unstepped world costs nothing.

## Running the tests

The tests exercise the native module, so they run **inside the app** rather than
in Node. There is no jsdom, no mock — `world.step()` in a test is the same C++
that runs in the playground.

```bash
npm test                  # the default runner (iOS simulator)
npm run test:android
npx harness --harnessRunner ios-simulator --testNamePattern "joint"
```

The app has to be built and installed first (`npx expo prebuild` then `npm run
ios` / `npm run android`) — Harness launches the installed build and drives it.

Standard Jest flags work: `--watch`, `--testNamePattern`, `-t`. Tests run
serially on one runner at a time.

### Configuration

- [`metro.config.js`](metro.config.js) — the wiring that lets an app resolve a
  library installed as `file:..`: watch the parent folder, hide the library's own
  `node_modules`, and point its peer dependencies back at this app. Without the
  last two the app ends up with two copies of Nitro, which is a crash rather
  than a warning.
- [`rn-harness.config.mjs`](rn-harness.config.mjs) — which devices to run on.
  The simulator and emulator names in there are whatever happened to be
  installed when this was written; `npx harness init` rewrites the file against
  yours, or edit it by hand. `xcrun simctl list devices available` and
  `emulator -list-avds` print what you have.
- [`jest.harness.config.mjs`](jest.harness.config.mjs) — test discovery and setup
  files.

### What is covered

| file | what it pins down |
| --- | --- |
| `module.harness.ts` | the Hybrid Object is registered, version reporting, length units |
| `world.harness.ts` | gravity, stepping, sleeping, the three ways of reading bodies back, determinism, lifetime |
| `body-shape.harness.ts` | body properties, mass from shapes, impulses, coordinate conversion, every shape type, hull building, filtering |
| `events.harness.ts` | contact / hit / sensor events, ray casts, point and AABB queries, explosions |
| `joints.harness.ts` | distance, revolute, prismatic, weld and mouse joints, including limits and motors |
| `ui.harness.tsx` | a React component driving a world, queried and pressed through `@react-native-harness/ui` |
| `pinball.harness.ts` | the pinball table itself: pockets tile the bottom, the plunger draws and springs back, a full draw clears the lane and a light one does not, and a ball ends up scoring |

The pinball suite is not decoration. Every number in that screen — spring
stiffness, gravity, where the lane wall stops — was picked by running those
tests and reading what the ball actually did, and they are what stops a later
tweak from quietly making the table unplayable.

Three things the suite deliberately checks beyond "does it run":

- **Determinism** — the same scene stepped twice produces bit-identical results.
  A physics binding that quietly loses precision somewhere between JS and C++
  fails this and passes everything else.
- **Lifetime** — a destroyed body, shape, joint or world throws on access. That
  is the difference between a clear error and a use-after-free.
- **Playability** — a full plunger draw gets the ball out of the lane, a light
  one does not. A physics binding can be perfectly correct and still produce a
  table nobody can play.

### Writing more

```ts
import { describe, expect, test } from 'react-native-harness'
import { BodyType, box2d } from 'nitro-box2d'

describe('my feature', () => {
  test('does the thing', () => {
    const world = box2d.createWorld({ gravity: { x: 0, y: -10 } })
    // ...
    world.destroy()
  })
})
```

Create the world in `beforeEach` and destroy it in `afterEach`. A leaked world
keeps running in the app process for the rest of the suite.

`npx harness skill list` prints the guides bundled with the CLI (`core`,
`mocking`, `ui`).

Screen queries match on `testID` and accessibility label, not on rendered text —
`ui.harness.tsx` puts the value it wants to assert on into the `testID` for that
reason.

## After changing the native module

Anything in `../cpp`, `../src/specs` or `../third_party` needs a rebuild:

```bash
cd .. && npm run specs && cd example
npm run ios
```

JavaScript-only changes are picked up by Metro as usual.
