/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIFIED EGISZ REMD CDA R2 XML GENERATOR (МИНЗДРАВ РФ)
 * Central routing and generation facade for SEMD 101, 104, and 130.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { generateSemd101Xml } from "./generator101.js";
import { generateSemd043_1uXml } from "./generator043_1u.js";
export declare const generateSemd043uXml: typeof generateSemd101Xml;
export declare const generateSemd108Xml: typeof generateSemd101Xml;
export declare const generateSemd109Xml: typeof generateSemd043_1uXml;
export { generateSemd043_1uXml };
import type { CdaGenerationResult } from "./types.js";
/**
 * Universal generator for Russian EGISZ REMD CDA Release 2 XML documents.
 * Validates input parameters against statutory rules, produces valid HL7 CDA R2 XML,
 * and canonicalizes it for digital signing (ГОСТ Р 34.10-2012 / УКЭП).
 */
export declare function generateCdaXml(params: unknown): CdaGenerationResult;
