/**
 * @dental/web/native — Universal Cross-Platform Native Bridges Barrel Export.
 */

export * from "./desktopBridge.js";
export * from "./mobileBridge.js";
export * from "./hardwareDispatcher.js";
export * from "./runtimeRouter.js";
export { isDesktopApp, isMobileApp, isPwaApp, isWebApp } from "./desktopBridge.js";
export { CLINICAL_TOUCH_TARGETS, validateClinicalActionButtonErgonomics } from "./mobileBridge.js";
export type { ClinicalAudioFeedbackType, ParsedGs1DataMatrix } from "./mobileBridge.js";
