/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEMD 101: ПРОТОКОЛ КОНСУЛЬТАЦИИ ВРАЧА-СТОМАТОЛОГА (HL7 CDA R2)
 * Compliant with Minzdrav Order No. 911n and SEMD 101 Specification.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { CdaSemd101Params } from "./types.js";
/**
 * Normalizes tooth surfaces array or string into standardized codes
 */
export declare function normalizeSurfaces(surfaces?: string[] | string | null): string[];
export declare function generateSemd101Xml(params: CdaSemd101Params): string;
