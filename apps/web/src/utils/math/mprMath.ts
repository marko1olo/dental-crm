/**
 * mprMath.ts — Canonical MPR Math Facade
 * Decomposed into focused, modular, testable kernels:
 * - ./mprCaliperMath: Pure calipers, distance, navigation, axis/slab clamping, formatting
 * - ./mprProjectionMath: Pure 3D volume raycasting, panoramic MIP, Catmull-Rom splines, bone density
 *
 * All functions and types are re-exported below for zero-downtime backward compatibility.
 */

export * from "./mprCaliperMath.js";
export * from "./mprProjectionMath.js";
