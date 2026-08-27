/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 & UKEP STATUTORY VALIDATOR (МИНЗДРАВ РФ)
 * Strict validation of Russian healthcare CDA R2 XML against Minzdrav
 * regulatory rules, XSD schema constraints, and digital signature standards.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { CdaValidationResult } from "./types.js";
/**
 * Validates OID (Object Identifier) syntax per ITU-T X.660 / ISO 8824.
 */
export declare function validateOid(oid: string): boolean;
/**
 * Validates FRMO (Federal Register of Medical Organizations) MO OID root.
 */
export declare function validateFrmoOid(oid: string): boolean;
/**
 * Normalizes SNILS string to digits only.
 */
export declare function normalizeSnils(input: unknown): string;
/**
 * Validates Russian SNILS 11-digit number with checksum algorithm (Resolution 192p).
 */
export declare function isValidSnils(input: unknown): boolean;
/**
 * Validates Russian OGRN (13 digits for Legal Entity, 15 digits for IP).
 */
export declare function validateOgrn(ogrn: string | null | undefined): boolean;
/**
 * Validates Russian INN (10 digits for Legal Entity, 12 digits for Individual/IP).
 */
export declare function validateInn(inn: string | null | undefined): boolean;
/**
 * Validates FDI ISO 3950 Tooth Number.
 * Adult quadrants: 11..18, 21..28, 31..38, 41..48.
 * Deciduous quadrants: 51..55, 61..65, 71..75, 81..85.
 */
export declare const VALID_FDI_TEETH: Set<number>;
export declare function validateFdiToothNumber(tooth: unknown): boolean;
/**
 * Validates ICD-10 Diagnosis Code format (e.g. K02.1, K04.0, Z01.2).
 */
export declare function validateIcd10Code(code: string | null | undefined): boolean;
/**
 * Validates Order 804n Medical Service Nomenclature Code (e.g. A16.07.002.001, B01.065.001).
 */
export declare function validateOrder804nCode(code: string | null | undefined): boolean;
/**
 * Full pre-flight semantic and structural validator for CDA R2 document parameters.
 */
export declare function validateCdaParams(params: unknown): CdaValidationResult;
/**
 * Validates detached digital signature structure (ГОСТ Р 34.10-2012 / CAdES-BES).
 */
export declare function validateDetachedSignature(sig: unknown): {
    valid: boolean;
    errors: string[];
};
