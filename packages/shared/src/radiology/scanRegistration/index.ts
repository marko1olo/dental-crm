/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 3D OPTICAL SCAN RIGID REGISTRATION & TOOTH SETUP ENGINE (BARREL LAYER 4)
 * ═══════════════════════════════════════════════════════════════════════════
 * Canonical modular entry point for 3D optical scan rigid registration,
 * Horn/Kabsch unit-quaternion landmark alignment, cyclic Jacobi eigensolver,
 * point-to-point ICP surface refinement, Möller–Trumbore ray picking,
 * prosthetic tooth setup & backward planning, and Form 043/u clinical protocols.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { applyMat4 } from "./matrixMath4.js";
import { kabschTransformWithRms } from "./eigenAndKabsch.js";
import { pickMeshRay } from "./meshRayPicking.js";
import { formatScanRegistrationA4Protocol } from "./registrationProtocol.js";

export * from "./types.js";
export * from "./matrixMath4.js";
export * from "./eigenAndKabsch.js";
export * from "./icpRegistrationCore.js";
export * from "./meshRayPicking.js";
export * from "./prostheticToothSetup.js";
export * from "./registrationProtocol.js";

// ── Canonical Aliases (DenCT / API Parity per Mandate 8s) ────────
export const transformPoint4 = applyMat4;
export const hornRegistration = kabschTransformWithRms;
export const mollerTrumborePick = pickMeshRay;
export const formatRegistrationReport = formatScanRegistrationA4Protocol;
