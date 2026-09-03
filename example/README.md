# nitro-box2d example

An Expo app that is two things at once: a physics playground you can poke at,
and the test suite for `nitro-box2d`, run on a real device or simulator through
[React Native Harness](https://react-native-harness.dev).

## Running the app

```bash
npm install
npx expo prebuild
npm run ios      # or: npm run android
```

Tap anywhere to drop a shape, *Explode* to blow the pile apart, *Reset* to clear
it. The header shows the Box2D version, the body count and how long a solver step
is actually taking.

The interesting code is [`src/world.ts`](src/world.ts): the fixed-timestep
accumulator, the metres-to-pixels conversion, and the choice to render only the
bodies that moved.

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

Two things the suite deliberately checks beyond "does it run":

- **Determinism** — the same scene stepped twice produces bit-identical results.
  A physics binding that quietly loses precision somewhere between JS and C++
  fails this and passes everything else.
- **Lifetime** — a destroyed body, shape, joint or world throws on access. That
  is the difference between a clear error and a use-after-free.

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
