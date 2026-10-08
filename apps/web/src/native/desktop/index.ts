/**
 * DENTE CRM — Desktop Windows (.EXE) Native Hardware Bridge Subsystem (Layer 5)
 *
 * Master aggregation point for desktop native hardware capabilities:
 * - TWAIN dental sensors & visiographs.
 * - АТОЛ / Штрих-М 54-ФЗ fiscal printing & ESC/POS receipt generation.
 * - Local DICOM directory watching & external 3D CT/CBCT viewers.
 * - USB HID 2D barcode / GS1 DataMatrix scanner packet interceptor.
 * - Doctor hotkeys (F1-F12, F5 protection, Ctrl+S/Ctrl+P) & Kiosk mode.
 * - Background auto-updates & offline PostgreSQL / SQLite telemetry.
 *
 * All underlying modules strictly conform to Mandate 8b (<800 lines per file).
 */

export * from "./types";
export * from "./platformDetection";
export * from "./twainAndDicomBridge";
export * from "./fiscalPrintingBridge";
export * from "./ctViewerBridge";
export * from "./usbHidScannerBridge";
export * from "./updatesBridge";
export * from "./hotkeysAndKioskBridge";

export {
	CLINICAL_TOUCH_TARGETS,
} from "../mobile/types";

export {
	validateClinicalActionButtonErgonomics,
} from "../mobile/ergonomics";

export {
	playClinicalAudioFeedback,
	isClinicalAudioMuted,
	setClinicalAudioMuted,
	type ClinicalAudioFeedbackType,
} from "../mobile/hapticsAndAudio";
