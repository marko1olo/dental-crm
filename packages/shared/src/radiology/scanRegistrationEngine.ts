/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 3D OPTICAL SCAN RIGID REGISTRATION & TOOTH SETUP ENGINE (FACADE)
 * ═══════════════════════════════════════════════════════════════════════════
 * Canonical backward-compatibility facade delegating 100% of symbols to
 * modular scanRegistration/ sub-package.
 *
 * All submodules strictly <= 800 lines. Facade strictly <= 50 lines.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export * from "./scanRegistration/index.js";
