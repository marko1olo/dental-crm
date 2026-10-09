/**
 * index.ts — Layer 5: Чистый barrel-фасад подсистемы аппаратного шлюза визиографов (sensorGateway).
 *
 * Implements Mandates 8e, 8s, 8p.
 * Re-exports 100% of canonical sensor gateway types, catalogs, drivers, and detection routines.
 */

export type * from "./types";
export * from "./sensorCatalogs";
export * from "./twainAndUsbDrivers";
export * from "./hotFolderRouting";
export * from "./hardwareDetection";
