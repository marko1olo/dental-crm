/**
 * DENTE Dental CRM — Canonical Pediatric & Mixed Dentition Engine
 * @dental/shared/clinical/pediatricDentition.ts
 *
 * Layer 5 Master Facade: Re-exports all pediatric clinical modules, constants,
 * and physiological norms preserving 100% backward compatibility.
 */

export * from "./pediatric/index.js";
export * from "./pediatricPhysiologicalNorms.js";
export type { CariogramRiskLevel } from "./pediatric/index.js";
