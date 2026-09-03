const path = require('node:path')

const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
// `nitro-box2d` is installed as `file:..`, so its source lives outside this app.
const moduleRoot = path.resolve(projectRoot, '..')
const modulePackage = require(path.join(moduleRoot, 'package.json'))

const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const toArray = (value) => (value == null ? [] : Array.isArray(value) ? value : [value])

// React Native Harness patches Metro from the inside these days, so this is the
// stock Expo config plus the linked-library wiring below.
const config = getDefaultConfig(projectRoot)

// Metro only serves files from folders it watches, and the library's source is
// one directory up.
config.watchFolders = [moduleRoot]

// The library's own `node_modules` holds its dev copies of react, react-native
// and react-native-nitro-modules. Hiding them keeps the app to one copy of
// each — two Nitro runtimes in one app is a crash, not a warning.
config.resolver.blockList = [
  ...toArray(config.resolver.blockList),
  new RegExp(`^${escapeForRegExp(path.join(moduleRoot, 'node_modules'))}${escapeForRegExp(path.sep)}.*$`),
]

// With those hidden, the library's own imports have nowhere left to look — it
// sits above this app, not inside it, so walking up never reaches
// `example/node_modules`. Point its peer dependencies back here explicitly.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...Object.fromEntries(
    Object.keys(modulePackage.peerDependencies ?? {}).map((name) => [
      name,
      path.join(projectRoot, 'node_modules', name),
    ])
  ),
}

module.exports = config
