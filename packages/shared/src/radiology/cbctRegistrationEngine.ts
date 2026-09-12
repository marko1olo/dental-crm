/**
 * ===========================================================================
 * WAVE 126: CBCT <-> INTRAORAL SCAN REGISTRATION FACADE
 * ===========================================================================
 * Canonical authority consolidated into scanRegistrationEngine.ts
 * per Mandate 8s (Zero Duplicates / Single Source of Truth).
 *
 * Re-exports 4x4 matrix algebra, Horn unit-quaternion registration,
 * Jacobi symmetric eigensolver, Moller-Trumbore picking, ICP surface
 * alignment, and A4 clinical protocol generation.
 * ===========================================================================
 */

export * from "./scanRegistrationEngine.js";
