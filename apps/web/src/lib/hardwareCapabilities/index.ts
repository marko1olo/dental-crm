/**
 * apps/web/src/lib/hardwareCapabilities/index.ts
 *
 * Unified Barrel Export for Hardware Capabilities Architecture.
 * Layer 5: Aggregates Layers 0 through 4 with zero circular dependencies.
 *
 * Submodules:
 * - types.ts: Core types, interfaces, and clinical contracts (Layer 0)
 * - constants.ts: Storage keys, TTL, default configs, presets (Layer 0)
 * - gpuProber.ts: WebGL/WebGPU probing, architecture detection, fillrate benchmark (Layer 1)
 * - cashRegisterDriver.ts: 54-FZ FFD 1.2 ATOL / Shtrih-M cash register driver (Layer 1)
 * - posTerminalDriver.ts: Bank acquiring terminal driver with idempotent UUIDv7 (Layer 1)
 * - imagingHardwareDriver.ts: DirectShow intraoral cameras, TWAIN radiovisiograph sensors (Layer 2)
 * - hardwareDiscovery.ts: WebSerial / WebUSB device scanner and health polling (Layer 2)
 * - profileEvaluator.ts: Hardware capability scoring, tier mapping, TTL cache (Layer 2)
 * - domAdapter.ts: Root DOM attributes, dynamic perf states, CT scan flags (Layer 3)
 * - hooks.ts: React hooks, subscription listeners, background watchers (Layer 4)
 */

export * from "./types";
export * from "./constants";
export * from "./gpuProber";
export * from "./cashRegisterDriver";
export * from "./posTerminalDriver";
export * from "./imagingHardwareDriver";
export * from "./hardwareDiscovery";
export * from "./profileEvaluator";
export * from "./domAdapter";
export * from "./hooks";
