/**
 * Expo config plugin to fix react-native-gesture-handler Gradle build failure.
 *
 * The issue: react-native-gesture-handler 2.28+ uses `providers.exec {}` (a Gradle
 * configuration-cache API) to resolve the React Native directory. This fails with
 * "Cannot query the value of this provider because it has no value available" on
 * some Gradle versions.
 *
 * The fix: Set `REACT_NATIVE_NODE_MODULES_DIR` in the root project ext block so
 * gesture-handler skips the `providers.exec` call entirely.
 */
const { withAppBuildGradle } = require("@expo/config-plugins");
const path = require("path");

const withGestureHandlerFix = (config) => {
  return withAppBuildGradle(config, (mod) => {
    const buildGradle = mod.modResults.contents;

    // Only inject if not already present
    if (buildGradle.includes("REACT_NATIVE_NODE_MODULES_DIR")) {
      return mod;
    }

    // Add the ext block at the top of the file, before any existing content
    const injection = `
// Fix for react-native-gesture-handler: set REACT_NATIVE_NODE_MODULES_DIR
// so it doesn't use providers.exec {} which fails on some Gradle versions.
project.ext {
    REACT_NATIVE_NODE_MODULES_DIR = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()
}

`;

    mod.modResults.contents = injection + buildGradle;
    return mod;
  });
};

module.exports = withGestureHandlerFix;
