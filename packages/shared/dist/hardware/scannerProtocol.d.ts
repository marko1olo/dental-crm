/**
 * @dental/shared/hardware — 2D Barcode & GS1 DataMatrix Scanner Protocol.
 *
 * Provides decoding and frame reconstruction for:
 * 1. USB Virtual COM / RS-232 Serial barcode scanners (Honeywell, Zebra, Datalogic, Mindeo).
 * 2. USB HID Keyboard Emulation burst detection (<35ms inter-character timing).
 * 3. GS1 DataMatrix (Chestny ZNAK / МДЛП), EAN-13, Patient QR and SanPiN Kraft codes.
 */
import { type MdlpParsedBarcode } from "../mdlp/index.js";
export interface DecodedScanResult {
    readonly rawText: string;
    readonly scanSource: "usb_com_serial" | "usb_hid_keyboard" | "camera_native";
    readonly barcodeType: "gs1_datamatrix" | "ean13" | "ean8" | "qr_patient" | "sanpin_kraft" | "generic_code";
    readonly parsedGs1?: MdlpParsedBarcode | undefined;
    readonly patientId?: string | undefined;
    readonly kraftPackageId?: string | undefined;
    readonly timestamp: string;
}
export declare class ScannerStreamBuffer {
    private buffer;
    private readonly delimiterRegex;
    constructor(delimiters?: string[]);
    /**
     * Ingests incoming serial chunk and returns complete scan packets if delimiter was reached.
     */
    pushChunk(chunk: string): string[];
    clear(): void;
}
/**
 * Classifies raw scan string into clinical barcode types (DataMatrix, EAN-13, Patient QR, SanPiN).
 */
export declare function classifyBarcodeScan(rawText: string, source?: "usb_com_serial" | "usb_hid_keyboard" | "camera_native"): DecodedScanResult;
