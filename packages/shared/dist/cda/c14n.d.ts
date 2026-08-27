/**
 * ═══════════════════════════════════════════════════════════════════════════
 * XML CANONICALIZATION (C14N) & HL7 TS DATE UTILITIES FOR CDA R2 / УКЭП
 * Ensures deterministic byte-for-byte representation for GOST R 34.10-2012
 * CAdES-BES digital signature hash calculation.
 * ═══════════════════════════════════════════════════════════════════════════
 */
/**
 * Strips illegal XML 1.0 characters:
 * - Disallowed control codes (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F-0x84, 0x86-0x9F)
 * - Non-characters (U+FDD0-U+FDEF, U+FFFE, U+FFFF)
 * - Lone/orphaned Unicode surrogates (unpaired high or low surrogates)
 * Preserves valid characters: line breaks (\n, 0x0A), carriage returns (\r, 0x0D), tabs (\t, 0x09),
 * valid UTF-8 Cyrillic, non-breaking space (0x00A0), typography (« » “ ” —), and valid surrogate pairs (emojis).
 */
export declare function sanitizeXmlText(value: unknown): string;
/**
 * Escapes characters for XML attribute values and text elements according to XML 1.0 specification.
 * Strips non-printable illegal control chars, lone surrogates, and escapes the 5 predefined XML entities.
 */
export declare function escapeXml(value: unknown): string;
export declare const escapeCdaXml: typeof escapeXml;
/**
 * Formats Date object into HL7 CDA R2 Timestamp (TS) format:
 * - Date only (birthTime): YYYYMMDD
 * - Date with Time & Timezone offset (effectiveTime): YYYYMMDDHHMMSS+ZZZZ (e.g. 20260825164500+0300)
 */
export declare function formatHl7DateTime(dateInput: Date | string | number | null | undefined, includeTime?: boolean): string;
/**
 * Formats date into Russian readable format DD.MM.YYYY
 */
export declare function formatRuDate(dateInput: Date | string | number | null | undefined): string;
/**
 * Deterministic XML canonicalization subset (C14N) for Russian CDA R2 / УКЭП.
 * 1. Strips UTF-8 BOM (\uFEFF)
 * 2. Normalizes line endings (\r\n -> \n, \r -> \n)
 * 3. Trims trailing whitespace from lines
 * 4. Normalizes leading/trailing document whitespace
 */
export declare function canonicalizeCdaXml(xml: string): string;
/**
 * Computes SHA-256 digest of canonicalized XML payload.
 */
export declare function computeCdaSha256Hex(xml: string): string;
/**
 * Computes canonical XML digest fingerprint for UKEP GOST R 34.10 / CAdES-BES signing.
 */
export declare function computeCdaDocumentFingerprint(xml: string): {
    canonicalXml: string;
    sha256Hex: string;
    byteLength: number;
};
