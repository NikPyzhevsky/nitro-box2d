import { androidEmulator, androidPlatform } from '@react-native-harness/platform-android'
import { appleSimulator, applePlatform } from '@react-native-harness/platform-apple'

/**
 * Where the tests run.
 *
 * The devices below are whatever was installed when this was written. `npx
 * harness init` rewrites this file against your own simulators and emulators,
 * or edit the names by hand — `xcrun simctl list devices available` and
 * `emulator -list-avds` print what you have.
 */
export default {
  entryPoint: './index.js',
  appRegistryComponentName: 'main',

  runners: [
    applePlatform({
      name: 'ios-simulator',
      device: appleSimulator('iPhone 17 Pro', '26.5'),
      bundleId: 'com.nitrobox2d.example',
    }),
    androidPlatform({
      name: 'android-emulator',
      device: androidEmulator('Pixel_9'),
      bundleId: 'com.nitrobox2d.example',
    }),
  ],
  defaultRunner: 'ios-simulator',
}
