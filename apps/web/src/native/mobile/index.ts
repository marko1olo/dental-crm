/**
 * DENTE CRM — Mobile Android (.APK) / Capacitor Native Bridge Subsystem (Layer 5)
 *
 * Master aggregation point for mobile native capabilities, platform detection,
 * haptics, clinical audio feedback, biometrics, barcode scanning, gestures,
 * modal stack, deep linking and push notifications.
 */

export * from "./types";
export * from "./platform";
export * from "./gs1Scanner";
export * from "./hapticsAndAudio";
export * from "./ergonomics";
export * from "./biometricsBridge";
export * from "./cameraScannerBridge";
export * from "./modalBackStack";
export * from "./shareAndDeepLinkBridge";
export * from "./pushNotificationsBridge";
export * from "./deviceAndNetworkBridge";
export * from "./offlineStorageBridge";
