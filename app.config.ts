// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const bundleId = "com.remember2buy.shopping";
const schemeFromBundleId = "remember2buy";

const env = {
  appName: "Remember 2 Buy",
  appSlug: "belief-field-detector",
  logoUrl: "",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.76",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    buildNumber: "1.0.76",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSMotionUsageDescription:
        "Remember2Buy uses motion sensors to detect when you arrive near a saved store.",
      NSLocationWhenInUseUsageDescription:
        "Remember2Buy uses your location to show nearby stores and send arrival alerts.",
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#1a0533",
      foregroundImage: "./assets/images/android-icon-foreground.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    versionCode: 10076,
    permissions: [
      "POST_NOTIFICATIONS",
      "VIBRATE",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
      "FOREGROUND_SERVICE_SPECIAL_USE",
      "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
      "WAKE_LOCK",
      "RECORD_AUDIO",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Remember2Buy needs background location to alert you when you arrive near a saved store.",
        locationAlwaysPermission:
          "Remember2Buy needs 'Allow all the time' access to send store arrival alerts while the app is in the background.",
        locationWhenInUsePermission:
          "Remember2Buy uses your location to show nearby stores.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      "expo-task-manager",
    ],
    [
      "expo-notifications",
      {
        color: "#7c3aed",
        sounds: [],
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#1a0533",
        dark: {
          backgroundColor: "#1a0533",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
          compileSdkVersion: 36,
          targetSdkVersion: 36,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "1c2dd7ea-a0a4-49cb-92f8-061aec5dfb6c",
    },
  },
};

export default config;
