/**
 * DENTE CRM — Multi-Platform Device & Runtime Detection Utilities (Facade)
 *
 * Decomposed under Mandate 8b into modular detectors (<= 120 lines):
 * - platformDetector: OS, runtime, and hardware tier classification
 * - pointerErgonomics: fine vs coarse pointer, responsive dimensions, DOM tuning
 * - doctorHotkeysHandler: doctor shortcuts (F1-F12, Ctrl+S, Esc)
 * - chairsidePhotoCapture: HTML5 / Native camera photo protocol
 * - deviceCapabilities: capabilities matrix & full diagnostics telemetry
 */

export * from "./deviceDetection/index.js";
