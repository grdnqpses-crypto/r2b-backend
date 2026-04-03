// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const bundleId = "com.remember2buy.shopping";
const schemeFromBundleId = "remember2buy";

const env = {
  appName: "Remember2Buy",
  appSlug: "remember2buy",
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663348315388/3MWRPobTFfqJ6iFRe4j7At/r2b-icon-CAWNbqfNGqp34zMiwqtnFA.png",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.49",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Remember2Buy needs your location to alert you when you approach a store on your list.",
      NSLocationWhenInUseUsageDescription:
        "Remember2Buy needs your location to show nearby stores.",
      UIBackgroundModes: ["location", "fetch"],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#1D4ED8",
      foregroundImage: "./assets/images/android-icon-foreground.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    versionCode: 49,
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "POST_NOTIFICATIONS",
      "VIBRATE",
      "RECEIVE_BOOT_COMPLETED",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
      "CAMERA",
      "READ_MEDIA_IMAGES",
      "com.android.vending.BILLING",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "./plugins/withGestureHandlerFix",
    "expo-router",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Remember2Buy needs your location to alert you when you're near a store on your shopping list.",
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow Remember2Buy to access your camera to scan coupon barcodes.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Remember2Buy to access your photos to import shopping lists.",
      },
    ],
    [
      "expo-notifications",
      {
        color: "#1D4ED8",
        sounds: [],
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#1D4ED8",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
          kotlinVersion: "2.1.20",
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
};

export default config;
