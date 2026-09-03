import { registerRootComponent } from 'expo'

import App from './App'

// Registers the app as "main", which is the component name
// `rn-harness.config.mjs` mounts the test runner over.
registerRootComponent(App)
