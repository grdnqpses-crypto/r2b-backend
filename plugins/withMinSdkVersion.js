/**
 * Expo config plugin to force minSdkVersion=24 in the Android build.gradle.
 * This is a belt-and-suspenders fix for the Manus build system which may
 * override the minSdkVersion set by expo-build-properties.
 */
const { withAppBuildGradle } = require("@expo/config-plugins");

const withMinSdkVersion = (config) => {
  return withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    // Replace any minSdkVersion value less than 24 with 24
    contents = contents.replace(
      /minSdkVersion\s*=?\s*(\d+)/g,
      (match, version) => {
        const v = parseInt(version, 10);
        if (v < 24) {
          return match.replace(version, "24");
        }
        return match;
      }
    );
    mod.modResults.contents = contents;
    return mod;
  });
};

module.exports = withMinSdkVersion;
