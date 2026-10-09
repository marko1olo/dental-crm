/**
 * DENTE CRM — Omni-Platform Architecture Master Barrel (Layer 5)
 *
 * Re-exports the complete public API surface across all decomposed modules
 * preserving 100% backward compatibility and AST export parity.
 */

export type * from "./types.js";
export * from "./types.js";

export * from "./environmentDetector.js";
export * from "./pwaServiceWorkerManager.js";
export * from "./omniWebSocketHub.js";
export * from "./offlineSyncManager.js";
export * from "./unifiedAdapterClass.js";

export {
	DESKTOP_FINE_ERGONOMICS,
	TABLET_TOUCH_ERGONOMICS,
	PHONE_TOUCH_ERGONOMICS,
	DOCTOR_HOTKEYS,
} from "@dental/shared";

export {
	useSafeSwipe,
	useQuadrantSwipe,
	useVisitTabSwipe,
	useToothSwipe,
	getNextQuadrantBySwipe,
	getNextVisitTabBySwipe,
	getNextToothBySwipe,
	getOpposingTooth,
	ADULT_UPPER_ARCH,
	ADULT_LOWER_ARCH,
	PEDIATRIC_UPPER_ARCH,
	PEDIATRIC_LOWER_ARCH,
	type UseSafeSwipeOptions,
	type UseQuadrantSwipeOptions,
	type UseVisitTabSwipeOptions,
	type UseToothSwipeOptions,
	type OdontogramQuadrantId,
	type VisitSubViewTab,
} from "../../hooks/useSafeSwipe.js";

export {
	registerSafeSwipeGesture,
	triggerHaptic,
	printMobileThermalBinary,
	type SafeSwipeOptions,
} from "../../native/mobileBridge.js";

export {
	isTypingInInputElement,
	dispatchDesktopShortcut,
	useDesktopShortcuts,
} from "../../hooks/useDesktopShortcuts.js";

export {
	registerDoctorHotkeys,
} from "../../utils/deviceDetection.js";

export {
	isWebUsbSupported,
	printWebUsbEscPosReceipt,
	printDesktopA4DocumentSilent,
	printDesktopDocumentSilent,
} from "../hardwarePrinting.js";

export {
	enqueueOfflineMutationsBatch,
} from "../../services/offline";

export {
	detectAppRuntimeKind,
	getRuntimeRoutingConfig,
	routeDatabasePath,
	routeVisiographAcquisition,
	routeFiscalReceiptPrint,
	routeBarcodeScan,
	setMockAppRuntimeKind,
	isDesktopRuntime,
	isAndroidRuntime,
	isPwaRuntime,
	isWebRuntime,
	type AppRuntimeKind,
	type RuntimeRoutingConfig,
	type RuntimeDatabaseRouting,
	type RuntimeCacheRouting,
	type RuntimeHardwareRouting,
} from "../../native/runtimeRouter.js";
