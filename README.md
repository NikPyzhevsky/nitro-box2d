# nitro-box2d

[Box2D](https://box2d.org) v3 for React Native, through [Nitro Modules](https://nitro.margelo.com).

The whole simulation runs in C++. JavaScript holds handles to native objects and
calls straight into them — no bridge, no serialisation, no async round trip for
reading a body's position sixty times a second.

| Playground | Pinball |
| --- | --- |
| ![Shapes dropping onto a pile](https://raw.githubusercontent.com/NikPyzhevsky/nitro-box2d/main/docs/playground.gif) | ![A ball launched from a spring plunger into scoring pockets](https://raw.githubusercontent.com/NikPyzhevsky/nitro-box2d/main/docs/pinball.gif) |

Both are screens of the [example app](example/), which is also the test suite.

```ts
import { BodyType, box2d } from 'nitro-box2d'

const world = box2d.createWorld({ gravity: { x: 0, y: -10 } })

const ground = world.createBody({ type: BodyType.Static })
ground.createSegmentShape({}, { point1: { x: -10, y: 0 }, point2: { x: 10, y: 0 } })

const crate = world.createBody({ type: BodyType.Dynamic, position: { x: 0, y: 5 } })
crate.createBoxShape({ density: 1, friction: 0.4 }, 0.5, 0.5, { x: 0, y: 0 }, 0)

world.step(1 / 60, 4)
console.log(crate.position) // { x: 0, y: 4.997… }

world.destroy()
```

## Installing

```bash
npm install nitro-box2d react-native-nitro-modules
cd ios && pod install
```

Box2D itself is vendored as source under `third_party/box2d` and compiled into
the module, so there is nothing to download, no framework to place by hand, and
no per-architecture binary to keep in sync. iOS builds it through the podspec;
Android through `android/CMakeLists.txt`.

## Units, and why they matter

Box2D is tuned for objects roughly 0.1m to 10m across. Feeding it pixel
coordinates puts every object hundreds of "metres" wide, and the solver behaves
badly there — jitter, tunnelling, contacts that never settle. Work in metres and
convert at the render layer:

```ts
const PIXELS_PER_METER = screenWidth / 6 // a six-metre-wide world
```

`box2d.setLengthUnitsPerMeter` exists for the rare case where that is genuinely
impossible, but converting at the edge is almost always the better answer.

Angles are radians everywhere. `degToRad` and `radToDeg` are exported for
convenience.

## Stepping

Step with a **fixed** delta:

```ts
world.step(1 / 60, 4)
```

Passing the real frame delta makes the simulation depend on frame rate — the
same scene settles differently on a 120Hz phone than on a 60Hz one. Accumulate
elapsed time and take whole fixed steps instead; `example/src/world.ts` shows the
pattern. The second argument is the sub-step count: 4 is Box2D's own
recommendation, and long joint chains are the usual reason to raise it.

## Reading the world back

Three ways, in increasing order of how much you care about the cost:

| | what you get | when |
| --- | --- | --- |
| `body.position` | one body, one call | a handful of bodies |
| `world.getAwakeBodyStates()` | full state for everything that moved | the normal render path |
| `world.getAwakeBodyTransforms()` | one `Float32Array`, stride 4 (`[id, x, y, angle]`) | hundreds of moving bodies |

`getBodyStates()` returns *every* body, asleep ones included, which is what you
want for a save or a debug view rather than for a frame.

Only the awake variants use Box2D's move events, so they cost nothing beyond
copying — a settled scene reports nothing at all, and rendering can skip the
frame entirely.

## Events

Contact, sensor and hit events are **opt-in per shape**, because tracking them
is not free:

```ts
shape = body.createCircleShape(
  { density: 1, enableContactEvents: true, enableHitEvents: true },
  { center: { x: 0, y: 0 }, radius: 0.5 }
)
```

Sensors need `enableSensorEvents` on the sensor shape *and* on the visitor.

Read them between steps — Box2D keeps each batch only until the next `step`:

```ts
world.step(1 / 60, 4)
const { beginContacts, endContacts, hits, beginSensors, endSensors } = world.getEvents()
```

Every event carries shape ids and body ids. Those match `Body.id` and
`Shape.id`, which is how you get from an event back to your own model. They are
unique among *live* objects only — Box2D reuses the slot after a destroy.

## Object lifetime

`World`, `Body`, `Shape` and `Joint` are native objects. A destroyed one throws
on every access rather than returning stale data:

```ts
body.destroy()
body.isValid // false
body.position // throws
```

`world.destroy()` frees the world and everything in it, so every handle into it
throws afterwards — a `Body` from a freed world cannot validate itself, and
reading through it would be a use-after-free. A `World` that JavaScript simply
drops is freed by its destructor, but destroying it explicitly is better: it
happens when you say so rather than at the next GC.

## API

Everything is typed in [`src/specs/Box2D.nitro.ts`](src/specs/Box2D.nitro.ts),
which is also where the per-field documentation lives.

- **`box2d`** — `version`, `createWorld`, `setLengthUnitsPerMeter`
- **`World`** — `step`, `createBody`, the five `create*Joint` methods, `getEvents`,
  `castRay` / `castRayClosest` / `overlapAABB` / `queryPoint`, `explode`,
  `getProfile`, `getCounters`
- **`Body`** — transform, velocity, damping, mass, the `apply*` force and impulse
  methods, local/world coordinate conversion, the `create*Shape` methods
- **`Shape`** — geometry accessors, density/friction/restitution, filtering,
  `testPoint`
- **`Joint`** — distance, revolute, prismatic, weld and mouse joints behind one
  interface, matching Box2D's own C API. Type-specific calls throw on the wrong
  joint type rather than returning something meaningless.

## Development

```bash
npm install
npm run specs      # regenerate nitrogen output from src/specs
npm run typecheck
```

`npm run specs` must be re-run after any change to `src/specs/*.nitro.ts`, and
the app rebuilt afterwards — the generated C++ in `nitrogen/generated` is what
the native side compiles against.

The example app under [`example/`](example/) is both a demo and the test suite;
see its README.

## Updating Box2D

Drop a newer release's `include/` and `src/` into `third_party/box2d` and update
`VERSION`. Nothing there is patched. Watch for renamed fields in the `b2*Def`
structs — that is where `cpp/Box2DCore.cpp` touches Box2D most directly.
