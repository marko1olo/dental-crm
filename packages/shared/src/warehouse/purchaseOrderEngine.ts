/**
 * purchaseOrderEngine.ts — Canonical Facade for Warehouse Purchase Orders.
 *
 * Decomposed in accordance with /decomposer (SKILL.md) & Mandate 8t.
 * Re-exports 100% of public API from ./purchaseOrders/index.js preserving
 * exact backward compatibility and zero breaking changes across consumers.
 */

export * from "./purchaseOrders/index.js";
