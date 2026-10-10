/**
 * DENTE Dental CRM — Doctor & Chair Roster Mathematical Engine (chairRosterMath.ts)
 *
 * Canonical thin facade re-exporting all public functions, constants, and types
 * from ./rosterMath/index.js to preserve 100% AST export parity across call sites.
 *
 * Principles & Compliance:
 * - Mandate 8b: Monolith Decomposition (facade <= 50 lines, submodules <= 800 lines)
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking 1-tap actions)
 * - Mandate 8k: CRM != Reality Simulator (1-click weekly shift assignment, copy week/month)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor)
 * - Mandate 8d: Apple HIG & Medical Density (touch targets >= 44x44px, 0 emojis)
 */

export * from "./rosterMath/index.js";
