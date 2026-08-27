/**
 * sbpQrEngine.ts — Движок генерации динамических QR-кодов СБП (НСПК / ГОСТ Р 56042-2014)
 * и копеечного сплита платежей (Депозит/Семейный баланс Тег 1215 + Доплата через СБП Тег 1081).
 */
export interface SbpDynamicQrParams {
    readonly sumRub: number;
    readonly orderId: string;
    readonly purpose?: string | undefined;
    readonly merchantId?: string | undefined;
    readonly bankId?: string | undefined;
    readonly sbpMemberId?: string | undefined;
    readonly ttlMinutes?: number | undefined;
    readonly clinicName?: string | undefined;
}
export interface SbpDynamicQrResult {
    readonly qrId: string;
    readonly orderId: string;
    readonly sumRub: number;
    readonly sumKopecks: number;
    readonly sumFormattedRu: string;
    readonly purpose: string;
    readonly nspkUrl: string;
    readonly crc16Hex: string;
    readonly expiresAtIso: string;
    readonly emvPayload: string;
    readonly deepLinkAppUrl: string;
}
export interface SbpSplitTenderDraft {
    readonly totalAmountRub: number;
    readonly depositAvailableRub: number;
    readonly orderId?: string | undefined;
    readonly purpose?: string | undefined;
    readonly clinicName?: string | undefined;
}
export interface SbpSplitTenderResult {
    readonly totalAmountRub: number;
    readonly totalAmountKopecks: number;
    readonly depositOffsetRub: number;
    readonly depositOffsetKopecks: number;
    readonly sbpChargeRub: number;
    readonly sbpChargeKopecks: number;
    readonly isFullyCoveredByDeposit: boolean;
    readonly sbpQr: SbpDynamicQrResult | null;
    readonly tag1081ElectronicKopecks: number;
    readonly tag1215PrepaidKopecks: number;
}
/**
 * Calculates standard CRC-16/CCITT-FALSE (Polynomial 0x1021, Init 0xFFFF)
 * required by EMVCo and NSPK QR specifications.
 * Safely processes multi-byte UTF-8 streams and handles empty/huge payloads.
 */
export declare function calculateCrc16Ccitt(data: string): string;
/**
 * Generates a compliant NSPK SBP dynamic QR payload with CRC16 checksum.
 * Strictly requires sumRub > 0 and validates orderId.
 */
export declare function generateDynamicSbpQrPayload(params: SbpDynamicQrParams): SbpDynamicQrResult;
/**
 * 1-Click calculation of multi-tender split:
 * Available Family Deposit (Tag 1215) + Dynamic SBP QR generation for remaining due (Tag 1081).
 */
export declare function calculateSbpMultiTenderSplit(draft: SbpSplitTenderDraft): SbpSplitTenderResult;
