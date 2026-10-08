/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor Shift Cockpit Engine (Wave 21 / Canonical Facade)
 *
 * Decomposed under /decomposer Mandate (<800 lines budget per module).
 * Canonical Facade delegating to packages/shared/src/doctor/cockpit/
 * 
 * Layers:
 * - Layer 0: cockpit/timer.ts (Countdown timer & status meta)
 * - Layer 1: cockpit/emrCompleteness.ts (EMR 043/у statutory evaluation)
 * - Layer 1: cockpit/patientBalance.ts (Patient financial balance in kopecks)
 * - Layer 1: cockpit/pager.ts (Assistant & staff pager event dispatcher)
 * - Layer 1: cockpit/pepSigning.ts (Cryptographic SHA-256 PEP 63-ФЗ protocol)
 * - Layer 2: cockpit/queueOrchestration.ts (Shift queue & workspace orchestration)
 * - Layer 5: cockpit/index.ts (Master aggregator)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export * from "./cockpit/index.js";
