/**
 * @dental/shared/hardware — 2D Barcode & GS1 DataMatrix Scanner Protocol.
 *
 * Provides decoding and frame reconstruction for:
 * 1. USB Virtual COM / RS-232 Serial barcode scanners (Honeywell, Zebra, Datalogic, Mindeo).
 * 2. USB HID Keyboard Emulation burst detection (<35ms inter-character timing).
 * 3. GS1 DataMatrix (Chestny ZNAK / МДЛП), EAN-13, Patient QR and SanPiN Kraft codes.
 */
import { parseMdlpDataMatrix } from "../mdlp/index.js";
export class ScannerStreamBuffer {
    buffer = "";
    delimiterRegex;
    constructor(delimiters = ["\r\n", "\n", "\r"]) {
        // Escape delimiter characters for regex
        const escaped = delimiters.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
        this.delimiterRegex = new RegExp(`(${escaped})`);
    }
    /**
     * Ingests incoming serial chunk and returns complete scan packets if delimiter was reached.
     */
    pushChunk(chunk) {
        this.buffer += chunk;
        const packets = [];
        let match = this.delimiterRegex.exec(this.buffer);
        while (match) {
            const index = match.index;
            const packet = this.buffer.slice(0, index).trim();
            if (packet.length > 0) {
                packets.push(packet);
            }
            const matchedDelimiter = match[0] ?? "";
            this.buffer = this.buffer.slice(index + matchedDelimiter.length);
            match = this.delimiterRegex.exec(this.buffer);
        }
        return packets;
    }
    clear() {
        this.buffer = "";
    }
}
/**
 * Classifies raw scan string into clinical barcode types (DataMatrix, EAN-13, Patient QR, SanPiN).
 */
export function classifyBarcodeScan(rawText, source = "usb_com_serial") {
    const trimmed = (rawText || "").trim();
    const nowIso = new Date().toISOString();
    // 1. Patient Portal / Reception QR (e.g. "DENTE:PATIENT:p-1042" or JSON)
    if (trimmed.startsWith("DENTE:PATIENT:") || trimmed.startsWith("PATIENT:")) {
        const parts = trimmed.split(":");
        const patientId = parts[parts.length - 1];
        return {
            rawText: trimmed,
            scanSource: source,
            barcodeType: "qr_patient",
            patientId,
            timestamp: nowIso,
        };
    }
    // 2. SanPiN Kraft Package QR / Barcode (e.g. "SANPIN:CSO-2026-08-23-01" or "KRAFT:...")
    if (trimmed.startsWith("SANPIN:") || trimmed.startsWith("KRAFT:") || trimmed.startsWith("#CSO-")) {
        return {
            rawText: trimmed,
            scanSource: source,
            barcodeType: "sanpin_kraft",
            kraftPackageId: trimmed.replace(/^(SANPIN:|KRAFT:)/, ""),
            timestamp: nowIso,
        };
    }
    // 3. GS1 DataMatrix (Chestny ZNAK / MDLP / Pharma / Implants)
    const parsedGs1 = parseMdlpDataMatrix(trimmed);
    if (parsedGs1.isValid || (parsedGs1.gtin && parsedGs1.serialNumber)) {
        return {
            rawText: trimmed,
            scanSource: source,
            barcodeType: "gs1_datamatrix",
            parsedGs1,
            timestamp: nowIso,
        };
    }
    // 4. EAN-13 (13 digits)
    if (/^\d{13}$/.test(trimmed)) {
        return {
            rawText: trimmed,
            scanSource: source,
            barcodeType: "ean13",
            timestamp: nowIso,
        };
    }
    // 5. EAN-8 (8 digits)
    if (/^\d{8}$/.test(trimmed)) {
        return {
            rawText: trimmed,
            scanSource: source,
            barcodeType: "ean8",
            timestamp: nowIso,
        };
    }
    return {
        rawText: trimmed,
        scanSource: source,
        barcodeType: "generic_code",
        timestamp: nowIso,
    };
}
