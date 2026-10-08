/**
 * DENTE CRM — Mobile Android (.APK) / Capacitor Native Bridge (Layer 5 Facade)
 *
 * Provides typed interfaces for native Android capabilities:
 * - Camera-based GS1 DataMatrix / Barcode scanner for Честный ЗНАК / МДЛП.
 * - Biometric staff authentication (Fingerprint / Face Unlock / Secure PIN).
 * - Native vibration feedback for touch-first clinical operations.
 * - Native offline storage and filesystem cache.
 *
 * Canonical facade re-exporting 100% of symbols from modular subsystem `./mobile/`.
 * All underlying modules strictly conform to Mandate 8b (<800 lines per file).
 */

export * from "./mobile";
