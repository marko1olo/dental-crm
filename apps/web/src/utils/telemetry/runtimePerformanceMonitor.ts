/**
 * DENTE CRM — Dynamic Runtime Host Performance Monitor (Facade)
 *
 * Decomposed under Mandate 8b into modular telemetry engines (<= 120 lines):
 * - fpsTelemetrySampler: Zero-GC frame delta & jitter calculator
 * - memoryPressureWatcher: Chromium heap exhaustion telemetry (zero-simulation)
 * - longTaskObserver: PerformanceObserver sliding window
 * - performanceStateMachine: Hysteresis state machine & DOM sync
 * - runtimePerformanceMonitorClass: Orchestration core
 */

export * from "./runtimePerformance/index.js";
