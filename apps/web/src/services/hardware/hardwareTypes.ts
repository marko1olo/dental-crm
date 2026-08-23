/**
 * DENTE CRM — Web Hardware Services Types & Contracts.
 *
 * Defines contracts for:
 * 1. Direct LAN TCP printing on KKT (ATOL / Shtrikh-M) according to 54-FZ.
 * 2. Offline fiscal receipt buffering in `fiscal_receipt_queue`.
 * 3. Local visiograph (TWAIN/DICOM) watch folder and instant patient chart preview.
 */

export type KktProtocolType = "atol" | "shtrih";

export interface KktLanPrinterConfig {
	readonly host: string;
	readonly port: number;
	readonly protocol: KktProtocolType;
	readonly timeoutMs?: number | undefined;
	readonly password?: string | undefined;
	readonly deviceNumber?: number | undefined;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
}

export interface KktDeviceHealthStatus {
	readonly online: boolean;
	readonly paperOk: boolean;
	readonly coverClosed: boolean;
	readonly fnPresent: boolean;
	readonly fnFiscalized: boolean;
	readonly latencyMs: number;
	readonly modelName?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly shiftNumber?: number | undefined;
	readonly error?: string | undefined;
	readonly checkedAt: string;
}

export interface FiscalReceiptLineItem {
	readonly name: string;
	readonly priceRub: number;
	readonly quantity: number;
	readonly amountRub: number;
	readonly vatRate?: "vat_20" | "vat_10" | "vat_0" | "vat_none" | undefined;
	readonly paymentMethod?: "full_payment" | "advance" | "prepayment" | "full_prepayment" | undefined;
	readonly paymentSubject?: "service" | "commodity" | "goods_with_marking" | undefined;
	readonly medicalServiceCode804n?: string | undefined;
	readonly markingCode?: string | undefined;
}

export interface FiscalReceiptPrintPayload {
	readonly clientMutationId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly operationType: "income" | "income_return" | "expense" | "expense_return";
	readonly customerContact: string;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly items: FiscalReceiptLineItem[];
	readonly totalRub: number;
	readonly cashRub?: number | undefined;
	readonly electronicRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly prepaidRub?: number | undefined;
	readonly taxationSystem?: "usn_income" | "usn_income_expense" | "osn" | "psn" | undefined;
	readonly taxDeductionCategory?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
}

export interface FiscalReceiptPrintResult {
	readonly success: boolean;
	readonly status: "printed" | "hardware_offline";
	readonly fiscalSign?: string | undefined;
	readonly fiscalDocNum?: string | undefined;
	readonly shiftNum?: number | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly printedAt?: string | undefined;
	readonly qrString?: string | undefined;
	readonly ofdVerificationUrl?: string | undefined;
	readonly queueId?: string | undefined;
	readonly error?: string | undefined;
}

export interface QueuedFiscalReceiptItem {
	readonly id: string;
	readonly organizationId?: string | undefined;
	readonly paymentId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly receiptType: string;
	readonly status: "pending_print" | "hardware_offline" | "printed" | "failed";
	readonly payload: FiscalReceiptPrintPayload;
	readonly retryCount: number;
	readonly lastError?: string | null | undefined;
	readonly printedAt?: string | null | undefined;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface VisiographWatchConfig {
	readonly folderPath: string;
	readonly allowedExtensions?: string[] | undefined;
	readonly autoAttachToPatient?: boolean | undefined;
	readonly activePatientId?: string | undefined;
	readonly activeVisitId?: string | undefined;
}

export interface RadiographyScanEvent {
	readonly filePath: string;
	readonly fileName: string;
	readonly fileSize: number;
	readonly detectedAt: string;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly modality: "IO" | "DX" | "PX" | "CT" | "CR";
	readonly thumbnailDataUri?: string | undefined;
	readonly previewReady: boolean;
}
