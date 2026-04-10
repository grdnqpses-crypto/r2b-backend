import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";

export type OEMType = "samsung" | "xiaomi" | "huawei" | "oppo" | "vivo" | "oneplus" | "default";

export interface OEMBatteryGuide {
  oem: OEMType;
  displayName: string;
  steps: Array<{ icon: string; text: string }>;
  settingsAction?: string; // intent action to open directly
}

export async function getDeviceOEM(): Promise<OEMType> {
  if (Platform.OS !== "android") return "default";
  try {
    const manufacturer = (await DeviceInfo.getManufacturer()).toLowerCase();
    if (manufacturer.includes("samsung")) return "samsung";
    if (manufacturer.includes("xiaomi") || manufacturer.includes("redmi") || manufacturer.includes("poco")) return "xiaomi";
    if (manufacturer.includes("huawei") || manufacturer.includes("honor")) return "huawei";
    if (manufacturer.includes("oppo") || manufacturer.includes("realme")) return "oppo";
    if (manufacturer.includes("vivo")) return "vivo";
    if (manufacturer.includes("oneplus")) return "oneplus";
    return "default";
  } catch {
    return "default";
  }
}

export const OEM_GUIDES: Record<OEMType, OEMBatteryGuide> = {
  samsung: {
    oem: "samsung",
    displayName: "Samsung",
    steps: [
      { icon: "⚙️", text: "Open Settings" },
      { icon: "🔋", text: "Tap Battery and device care" },
      { icon: "📱", text: "Tap Battery → Background usage limits" },
      { icon: "✅", text: "Find Remember2Buy → tap Never sleeping apps" },
      { icon: "🔓", text: "Also go to App info → Battery → Set to Unrestricted" },
    ],
    settingsAction: "android.settings.APPLICATION_DETAILS_SETTINGS",
  },
  xiaomi: {
    oem: "xiaomi",
    displayName: "Xiaomi / MIUI",
    steps: [
      { icon: "⚙️", text: "Open Settings" },
      { icon: "🔋", text: "Tap Battery & performance" },
      { icon: "📱", text: "Tap Choose apps → find Remember2Buy" },
      { icon: "✅", text: "Set Battery saver to No restrictions" },
      { icon: "🔓", text: "Also enable Autostart in Security app" },
    ],
    settingsAction: "android.settings.APPLICATION_DETAILS_SETTINGS",
  },
  huawei: {
    oem: "huawei",
    displayName: "Huawei / EMUI",
    steps: [
      { icon: "⚙️", text: "Open Settings" },
      { icon: "📱", text: "Tap Apps → Remember2Buy" },
      { icon: "🔋", text: "Tap Battery → Enable Background activity" },
      { icon: "🚀", text: "Go to Settings → Battery → App launch" },
      { icon: "✅", text: "Find Remember2Buy → toggle to Manual → enable all" },
    ],
    settingsAction: "android.settings.APPLICATION_DETAILS_SETTINGS",
  },
  oppo: {
    oem: "oppo",
    displayName: "OPPO / ColorOS",
    steps: [
      { icon: "⚙️", text: "Open Settings" },
      { icon: "🔋", text: "Tap Battery → Smart power saver" },
      { icon: "📱", text: "Find Remember2Buy → tap it" },
      { icon: "✅", text: "Set to Allow background activity" },
      { icon: "🔓", text: "Also enable Autostart in Settings → Apps" },
    ],
    settingsAction: "android.settings.APPLICATION_DETAILS_SETTINGS",
  },
  vivo: {
    oem: "vivo",
    displayName: "Vivo / FuntouchOS",
    steps: [
      { icon: "⚙️", text: "Open Settings" },
      { icon: "🔋", text: "Tap Battery → High background power consumption" },
      { icon: "📱", text: "Find Remember2Buy → enable it" },
      { icon: "✅", text: "Also go to Settings → Apps → Remember2Buy" },
      { icon: "🔓", text: "Enable Autostart" },
    ],
    settingsAction: "android.settings.APPLICATION_DETAILS_SETTINGS",
  },
  oneplus: {
    oem: "oneplus",
    displayName: "OnePlus / OxygenOS",
    steps: [
      { icon: "⚙️", text: "Open Settings" },
      { icon: "🔋", text: "Tap Battery → Battery optimization" },
      { icon: "📱", text: "Find Remember2Buy → tap it" },
      { icon: "✅", text: "Select Don't optimize" },
      { icon: "🔓", text: "Also enable Allow background activity in App info" },
    ],
    settingsAction: "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
  },
  default: {
    oem: "default",
    displayName: "Android",
    steps: [
      { icon: "⚙️", text: "Open Settings" },
      { icon: "🔋", text: "Tap Battery → Battery optimization" },
      { icon: "📱", text: "Find Remember2Buy in the list" },
      { icon: "✅", text: "Select Don't optimize" },
      { icon: "🔓", text: "Tap OK to confirm" },
    ],
    settingsAction: "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
  },
};
