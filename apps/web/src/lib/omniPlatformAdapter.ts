/**
 * DENTE CRM — Universal Omni-Platform Adapter Implementation
 *
 * Canonically decomposed into modular DAG layers under ./omniPlatform/
 * Preserves 100% backward compatibility for all exported symbols.
 *
 * Layer 0: ./omniPlatform/types.ts
 * Layer 1: ./omniPlatform/environmentDetector.ts
 * Layer 1: ./omniPlatform/pwaServiceWorkerManager.ts
 * Layer 2: ./omniPlatform/omniWebSocketHub.ts
 * Layer 2: ./omniPlatform/offlineSyncManager.ts
 * Layer 3: ./omniPlatform/unifiedAdapterClass.ts
 * Layer 5: ./omniPlatform/index.ts
 */

export * from "./omniPlatform/index.js";
