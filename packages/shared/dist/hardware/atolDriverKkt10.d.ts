/**
 * @dental/shared/hardware — АТОЛ Драйвер ККТ 10 (ATOL KKT Driver 10) Protocol Engine.
 *
 * Implements standard JSON & Binary communication protocol for ATOL fiscal registrars
 * (АТОЛ 27Ф, 25Ф, 55Ф, 11Ф, 30Ф, 77Ф) via direct TCP/IP LAN socket (port 5555/16732)
 * and Windows COM serial ports (COM1..COM32).
 *
 * Strictly compliant with 54-FZ & FFD 1.2 (Order of FTS Russia No. ED-7-20/662@).
 */
import { type Ffd12OperationType, type Ffd12PaymentMethod, type Ffd12PaymentSubject, type Ffd12TaxationSystem, type Ffd12VatRate } from "../fiscal/ffd12Types.js";
export interface Atol10ItemRequest {
    readonly name: string;
    readonly price: number;
    readonly quantity: number;
    readonly amount: number;
    readonly department?: number | undefined;
    readonly measurementUnit?: number | undefined;
    readonly paymentMethod?: Ffd12PaymentMethod | undefined;
    readonly paymentObject?: Ffd12PaymentSubject | undefined;
    readonly tax?: {
        readonly type: Ffd12VatRate;
    } | undefined;
    readonly markingCode?: {
        readonly raw: string;
        readonly plannedStatus?: number | undefined;
    } | undefined;
    readonly medicalServiceCode804n?: string | undefined;
}
export interface Atol10PaymentRequest {
    readonly type: "cash" | "electronically" | "prepaid" | "credit" | "other";
    readonly sum: number;
}
export interface Atol10FiscalReceiptRequest {
    readonly type: "sell" | "sellReturn" | "buy" | "buyReturn" | "sellCorrection" | "sellReturnCorrection";
    readonly electronical?: boolean | undefined;
    readonly taxationType?: Ffd12TaxationSystem | undefined;
    readonly ignoreNonFiscalPrintErrors?: boolean | undefined;
    readonly operator: {
        readonly name: string;
        readonly vatin?: string | undefined;
    };
    readonly clientInfo?: {
        readonly emailOrPhone?: string | undefined;
        readonly vatin?: string | undefined;
        readonly name?: string | undefined;
    } | undefined;
    readonly items: Atol10ItemRequest[];
    readonly payments: Atol10PaymentRequest[];
    readonly total: number;
}
export interface Atol10FiscalResponse {
    readonly success: boolean;
    readonly errorCode?: number | undefined;
    readonly errorDescription?: string | undefined;
    readonly fiscalSign?: string | undefined;
    readonly fiscalDocumentNumber?: number | undefined;
    readonly fiscalDocumentDateTime?: string | undefined;
    readonly shiftNumber?: number | undefined;
    readonly receiptNumber?: number | undefined;
    readonly fnSerialNumber?: string | undefined;
    readonly kktSerialNumber?: string | undefined;
    readonly fnsUrl?: string | undefined;
    readonly qrCode?: string | undefined;
}
export interface Atol10DeviceStatus {
    readonly online: boolean;
    readonly isCoverOpened: boolean;
    readonly isPaperPresent: boolean;
    readonly isPaperNearEnd: boolean;
    readonly isFnPresent: boolean;
    readonly isFnFiscalized: boolean;
    readonly isShiftOpened: boolean;
    readonly isShiftExpired24h: boolean;
    readonly shiftNumber: number;
    readonly receiptNumber: number;
    readonly modelName: string;
    readonly firmwareVersion: string;
    readonly fnSerialNumber: string;
    readonly kktSerialNumber: string;
    readonly batteryChargePercent?: number | undefined;
    readonly error?: string | undefined;
}
/**
 * Format Russian 54-FZ compliant ATOL 10 JSON command object.
 */
export declare function buildAtol10ReceiptJson(req: Atol10FiscalReceiptRequest, options?: {
    machineUuid?: string;
}): Record<string, unknown>;
/**
 * Builds standard 54-FZ QR code content string for receipt verification.
 */
export declare function buildAtolFiscalQrString(params: {
    issuedAt: Date;
    totalRub: number;
    fnSerial: string;
    fiscalDocNum: number | string;
    fiscalSign: string;
    operationType: Ffd12OperationType;
}): string;
/**
 * Parses raw ATOL 10 error code into human-readable Russian diagnostic text.
 */
export declare function parseAtol10ErrorCode(code: number): string;
