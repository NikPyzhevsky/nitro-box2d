import { afterEach, clearAllMocks } from 'react-native-harness'

// Every test in this suite creates its own world and destroys it in its own
// `afterEach`, so there is nothing global to tear down — but mock state is
// shared across files and is worth resetting between tests.
afterEach(() => {
  clearAllMocks()
})
