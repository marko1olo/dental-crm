/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT 3D IMPLANT GEOMETRY & MESH GENERATION — BARREL EXPORTS (LAYER 5)
 * ═══════════════════════════════════════════════════════════════════════════
 * Canonical modular entry point for 3D parametric implant geometry, mesh
 * generation, arch-frame projection, safety clearance evaluator, slice plane
 * intersections, drill sleeve geometries, and Form 043/u clinical reporting.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export * from "./types.js";
export * from "./mathVectors.js";
export * from "./archFrame.js";
export * from "./meshGenerator.js";
export * from "./sliceIntersection.js";
export * from "./safetyEnvelope.js";
export * from "./implantCollisionDetector.js";
export * from "./planningReport.js";
