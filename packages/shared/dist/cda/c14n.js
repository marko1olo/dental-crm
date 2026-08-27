/**
 * ═══════════════════════════════════════════════════════════════════════════
 * XML CANONICALIZATION (C14N) & HL7 TS DATE UTILITIES FOR CDA R2 / УКЭП
 * Ensures deterministic byte-for-byte representation for GOST R 34.10-2012
 * CAdES-BES digital signature hash calculation.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { sha256Hex } from "../sync/hashing.js";
/**
 * Strips illegal XML 1.0 characters:
 * - Disallowed control codes (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F-0x84, 0x86-0x9F)
 * - Non-characters (U+FDD0-U+FDEF, U+FFFE, U+FFFF)
 * - Lone/orphaned Unicode surrogates (unpaired high or low surrogates)
 * Preserves valid characters: line breaks (\n, 0x0A), carriage returns (\r, 0x0D), tabs (\t, 0x09),
 * valid UTF-8 Cyrillic, non-breaking space (0x00A0), typography (« » “ ” —), and valid surrogate pairs (emojis).
 */
export function sanitizeXmlText(value) {
    if (value === null || value === undefined)
        return "";
    return String(value)
        // Strip illegal XML 1.0 control characters and C1 control codes
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, "")
        // Strip Unicode non-characters
        .replace(/[\uFDD0-\uFDEF\uFFFE\uFFFF]/g, "")
        // Strip lone/orphaned surrogate code points (unpaired high or low surrogates)
        .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}
/**
 * Escapes characters for XML attribute values and text elements according to XML 1.0 specification.
 * Strips non-printable illegal control chars, lone surrogates, and escapes the 5 predefined XML entities.
 */
export function escapeXml(value) {
    if (value === null || value === undefined)
        return "";
    return sanitizeXmlText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
export const escapeCdaXml = escapeXml;
/**
 * Formats Date object into HL7 CDA R2 Timestamp (TS) format:
 * - Date only (birthTime): YYYYMMDD
 * - Date with Time & Timezone offset (effectiveTime): YYYYMMDDHHMMSS+ZZZZ (e.g. 20260825164500+0300)
 */
export function formatHl7DateTime(dateInput, includeTime = true) {
    const d = dateInput instanceof Date
        ? dateInput
        : dateInput
            ? new Date(dateInput)
            : new Date();
    const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
    const pad = (n) => n.toString().padStart(2, "0");
    const yyyy = validDate.getFullYear().toString();
    const MM = pad(validDate.getMonth() + 1);
    const dd = pad(validDate.getDate());
    if (!includeTime)
        return `${yyyy}${MM}${dd}`;
    const HH = pad(validDate.getHours());
    const mm = pad(validDate.getMinutes());
    const ss = pad(validDate.getSeconds());
    const offsetMinutes = -validDate.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absOffset = Math.abs(offsetMinutes);
    const offsetHours = pad(Math.floor(absOffset / 60));
    const offsetMins = pad(absOffset % 60);
    const tzStr = `${sign}${offsetHours}${offsetMins}`;
    return `${yyyy}${MM}${dd}${HH}${mm}${ss}${tzStr}`;
}
/**
 * Formats date into Russian readable format DD.MM.YYYY
 */
export function formatRuDate(dateInput) {
    if (!dateInput)
        return "";
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(d.getTime()))
        return String(dateInput);
    const pad = (n) => n.toString().padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}
/**
 * Deterministic XML canonicalization subset (C14N) for Russian CDA R2 / УКЭП.
 * 1. Strips UTF-8 BOM (\uFEFF)
 * 2. Normalizes line endings (\r\n -> \n, \r -> \n)
 * 3. Trims trailing whitespace from lines
 * 4. Normalizes leading/trailing document whitespace
 */
export function canonicalizeCdaXml(xml) {
    if (!xml || typeof xml !== "string")
        return "";
    return xml
        .replace(/^\uFEFF/, "") // Strip Byte Order Mark (BOM)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim();
}
/**
 * Computes SHA-256 digest of canonicalized XML payload.
 */
export function computeCdaSha256Hex(xml) {
    const canonical = canonicalizeCdaXml(xml);
    return sha256Hex(canonical);
}
/**
 * Computes canonical XML digest fingerprint for UKEP GOST R 34.10 / CAdES-BES signing.
 */
export function computeCdaDocumentFingerprint(xml) {
    const canonicalXml = canonicalizeCdaXml(xml);
    const sha256 = sha256Hex(canonicalXml);
    const byteLength = Buffer.byteLength(canonicalXml, "utf8");
    return {
        canonicalXml,
        sha256Hex: sha256,
        byteLength,
    };
}
