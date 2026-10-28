/**
 * DENTE CRM — Device Detection Module Entry Point
 */

export * from "./platformDetector.js";
export * from "./pointerErgonomics.js";
export * from "./doctorHotkeysHandler.js";
export * from "./chairsidePhotoCapture.js";
export * from "./deviceCapabilities.js";
export {
	DESKTOP_FINE_ERGONOMICS,
	TABLET_TOUCH_ERGONOMICS,
	PHONE_TOUCH_ERGONOMICS,
	DOCTOR_HOTKEYS,
} from "@dental/shared";
export { syncPlatformDomAttributes } from "../../lib/omniPlatformAdapter.js";
export {
	subscribeToPerformanceStateChange,
	useDynamicPerformanceState,
	getDynamicPerformanceSnapshot,
} from "../telemetry/runtimePerformanceMonitor.js";
export {
	getHardwareProfile,
	useHardwareProfile,
	useHardwareTier,
	useHardwareAdaptiveSettings,
	onHardwareProfileChange,
	subscribeToHardwareProfile,
	setHardwareTierOverride,
	getHardwareTierOverride,
} from "../../lib/hardwareCapabilities.js";
