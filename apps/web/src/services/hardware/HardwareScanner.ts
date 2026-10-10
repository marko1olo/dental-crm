/**
 * HardwareScanner.ts — Canonical Thin Facade re-exporting the modularized HardwareScanner layers.
 */

export {
	HardwareScanner,
	hardwareScanner,
	type HardwareScannerErrorSubscriber,
	type HardwareScannerState,
	type HardwareScannerSubscriber,
} from "./hardwareScannerModules/index.js";
export * from "./hardwareScannerModules/index.js";
