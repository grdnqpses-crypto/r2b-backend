module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  // In Reanimated v4, react-native-reanimated/plugin re-exports react-native-worklets/plugin
  // So we only need ONE of them — using reanimated/plugin covers both
  // Having both causes "Duplicate plugin" error during bundling
  plugins.push("react-native-reanimated/plugin");

  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    plugins,
  };
};
