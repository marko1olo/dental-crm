/**
 * DENTE Dental CRM — Pure TypeScript ISO/IEC 18004 QR Code Matrix & SVG Engine.
 * Zero external runtime dependencies.
 *
 * Supports Byte & Alphanumeric encoding, Reed-Solomon Error Correction (L, M, Q, H),
 * optimal mask selection, and crisp SVG / Data-URI output for clinical documents and FNS QR verification.
 */
export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export interface QrSvgOptions {
    readonly size?: number | undefined;
    readonly margin?: number | undefined;
    readonly foregroundColor?: string | undefined;
    readonly backgroundColor?: string | undefined;
    readonly title?: string | undefined;
}
/**
 * Generates QR Code module boolean matrix for given text.
 */
export declare function generateQrMatrix(text: string, ecLevel?: QrErrorCorrectionLevel): {
    matrix: boolean[][];
    size: number;
    version: number;
};
/**
 * Generates an SVG string representation of a QR Code.
 */
export declare function generateQrCodeSvg(text: string, options?: QrSvgOptions): string;
/**
 * Generates a base64 Data-URI SVG representation of a QR Code.
 */
export declare function generateQrCodeDataUri(text: string, options?: QrSvgOptions): string;
