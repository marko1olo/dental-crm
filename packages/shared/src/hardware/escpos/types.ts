/**
 * @dental/shared/hardware/escpos — Layer 0: ESC/POS Data Contracts, Payload Models & Options
 *
 * Implements typed contracts for thermal receipt printers (58mm / 80mm),
 * fiscal receipts (54-FZ), appointment tickets, SBP QR payments, barcodes, and test slips.
 */

export type EscPosQrErrorCorrection = "L" | "M" | "Q" | "H";

export interface EscPosQrOptions {
	/** Module size (dot size) 1..16 (default: 4 for 58mm, 5 for 80mm) */
	readonly moduleSize?: number | undefined;
	/** Error correction level L (7%), M (15%), Q (25%), H (30%) (default: 'M') */
	readonly errorCorrection?: EscPosQrErrorCorrection | undefined;
	/** Center align before printing QR */
	readonly centerAlign?: boolean | undefined;
}

export interface EscPosBarcode128Options {
	/** Barcode height in dots 1..255 (default: 64) */
	readonly heightDots?: number | undefined;
	/** Module width 2..6 (default: 2) */
	readonly moduleWidth?: number | undefined;
	/** HRI Human Readable text position: 0=none, 1=above, 2=below, 3=both (default: 2) */
	readonly hriPosition?: 0 | 1 | 2 | 3 | undefined;
	/** Center align before printing barcode */
	readonly centerAlign?: boolean | undefined;
}

export interface EscPosTableColumn {
	readonly text: string;
	readonly width: number;
	readonly align?: "left" | "center" | "right" | undefined;
}

export interface EscPosFiscalReceiptItem {
	readonly name: string;
	readonly priceRub: number;
	readonly quantity: number;
	readonly amountRub: number;
	readonly medicalServiceCode804n?: string | undefined;
	readonly markingCode?: string | undefined;
}

export interface EscPosFiscalReceiptPayload {
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly inn?: string | undefined;
	readonly kpp?: string | undefined;
	readonly licenseNumber?: string | undefined;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly customerContact?: string | undefined;
	readonly operationType?: "income" | "income_return" | undefined;
	readonly items: readonly EscPosFiscalReceiptItem[];
	readonly totalRub: number;
	readonly cashRub?: number | undefined;
	readonly electronicRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly prepaidRub?: number | undefined;
	readonly fnSerial?: string | undefined;
	readonly fiscalDocNum?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly fnsQrString?: string | undefined;
	readonly paperWidthMm?: 58 | 80 | undefined;
	readonly autoCut?: boolean | undefined;
	readonly timestamp?: Date | string | undefined;
}

export interface EscPosAppointmentTicketPayload {
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly ticketNumber: string;
	readonly patientFullName: string;
	readonly doctorFullName: string;
	readonly doctorSpecialtyRu?: string | undefined;
	readonly cabinetName: string;
	readonly appointmentDateRu: string;
	readonly appointmentTimeRu: string;
	readonly toothCodes?: readonly string[] | undefined;
	readonly plannedProcedures?: readonly string[] | undefined;
	readonly checkInQrPayload?: string | undefined;
	readonly barcode128Value?: string | undefined;
	readonly note?: string | undefined;
	readonly paperWidthMm?: 58 | 80 | undefined;
	readonly autoCut?: boolean | undefined;
}

export interface EscPosSbpPaymentPayload {
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly patientFullName?: string | undefined;
	readonly appointmentSummary?: string | undefined;
	readonly billNumber?: string | undefined;
	/** Exact integer kopecks (e.g. 550000 = 5500.00 руб) */
	readonly totalKopecks: number;
	/** Dynamic SBP QR URL (e.g. https://qr.nspk.ru/AD100004...) */
	readonly sbpQrUrl: string;
	readonly paperWidthMm?: 58 | 80 | undefined;
	readonly autoCut?: boolean | undefined;
	readonly expiresAtIso?: string | undefined;
}

export interface EscPosKopeckReceiptItem {
	readonly name: string;
	readonly priceKopecks: number;
	readonly quantity: number;
	readonly amountKopecks: number;
	readonly medicalServiceCode804n?: string | undefined;
	readonly markingCode?: string | undefined;
}

export interface EscPosKopeckReceiptPayload {
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly inn?: string | undefined;
	readonly kpp?: string | undefined;
	readonly licenseNumber?: string | undefined;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly customerContact?: string | undefined;
	readonly operationType?: "income" | "income_return" | undefined;
	readonly items: readonly EscPosKopeckReceiptItem[];
	readonly totalKopecks: number;
	readonly cashKopecks?: number | undefined;
	readonly electronicKopecks?: number | undefined;
	readonly sbpKopecks?: number | undefined;
	readonly prepaidKopecks?: number | undefined;
	readonly fnSerial?: string | undefined;
	readonly fiscalDocNum?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly fnsQrString?: string | undefined;
	readonly paperWidthMm?: 58 | 80 | undefined;
	readonly autoCut?: boolean | undefined;
	readonly timestamp?: Date | string | undefined;
}

export interface EscPosTestPatternOptions {
	readonly paperWidthMm?: 58 | 80 | undefined;
	readonly clinicName?: string | undefined;
	readonly deviceName?: string | undefined;
	readonly interfaceName?: string | undefined;
}
