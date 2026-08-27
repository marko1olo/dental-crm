/**
 * @dental/shared/hardware — ШТРИХ-М (Shtrikh-M) Protocol Engine.
 *
 * Implements binary frame transport and 54-FZ commands for Shtrikh-M fiscal registrars
 * (ШТРИХ-М-01Ф, ШТРИХ-ON-LINE, РИТЕЙЛ-01Ф, ШТРИХ-СИТИ-Ф) over TCP/IP and COM ports.
 */
export interface ShtrikhMFrame {
    readonly commandCode: number;
    readonly data: Uint8Array;
}
export interface ShtrikhMDeviceStatus {
    readonly online: boolean;
    readonly operatorNumber: number;
    readonly flags: number;
    readonly mode: number;
    readonly subMode: number;
    readonly isPaperPresent: boolean;
    readonly isCoverClosed: boolean;
    readonly isFnPresent: boolean;
    readonly isShiftOpen: boolean;
    readonly isShiftExpired24h: boolean;
    readonly modelName: string;
    readonly firmwareVersion: string;
    readonly kktSerialNumber: string;
    readonly fnSerialNumber: string;
    readonly error?: string | undefined;
}
export interface ShtrikhMReceiptParams {
    readonly cashierPassword?: number | undefined;
    readonly operatorName: string;
    readonly operationType: 1 | 2 | 3 | 4;
    readonly items: Array<{
        readonly name: string;
        readonly priceKopecks: number;
        readonly quantity: number;
        readonly department?: number | undefined;
        readonly vatRate?: 1 | 2 | 3 | 4 | 5 | 6 | undefined;
        readonly paymentMethod?: number | undefined;
        readonly paymentSubject?: number | undefined;
        readonly markingRaw?: string | undefined;
    }>;
    readonly cashKopecks?: number | undefined;
    readonly cardKopecks?: number | undefined;
    readonly totalKopecks: number;
}
/**
 * Computes 8-bit XOR checksum (LRC) over payload.
 */
export declare function computeShtrikhLrc(data: Uint8Array): number;
/**
 * Encapsulates a command into a standard Shtrikh-M framing packet:
 * STX (0x02) + Length (1 byte) + Command (1 byte) + Data + LRC (1 byte)
 */
export declare function buildShtrikhCommandPacket(commandCode: number, data?: Uint8Array): Uint8Array;
/**
 * Decodes a Shtrikh-M response packet and verifies STX & LRC integrity.
 */
export declare function parseShtrikhResponsePacket(rawBuffer: Uint8Array): {
    readonly success: boolean;
    readonly commandCode?: number | undefined;
    readonly returnCode?: number | undefined;
    readonly data?: Uint8Array | undefined;
    readonly error?: string | undefined;
};
/**
 * Human-readable mapping of Shtrikh-M hardware error codes.
 */
export declare function parseShtrikhErrorCode(code: number): string;
