import { z } from "zod";
import type { DentalAnestheticInfo } from "../types.js";

// ─── 1. TYPE DEFINITIONS & SCHEMAS ──────────────────────────────────────────

export const chestnyZnakVerificationStatusSchema = z.enum([
	"verified",
	"warning",
	"expired",
	"invalid_checksum",
	"invalid_format",
]);
export type ChestnyZnakVerificationStatus = z.infer<
	typeof chestnyZnakVerificationStatusSchema
>;

export interface ChestnyZnakScannedItem {
	readonly id: string;
	readonly rawBarcode: string;
	readonly gtin: string;
	readonly serialNumber: string;
	readonly sgtin: string;
	readonly expirationDate: string | null;
	readonly expirationDateRaw: string | null;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly daysUntilExpiration: number | null;
	readonly series: string | null;
	readonly lot: string | null;
	readonly cryptoKey: string | null;
	readonly cryptoSignature: string | null;
	readonly status: ChestnyZnakVerificationStatus;
	readonly statusReason: string;
	readonly tradeName: string;
	readonly inn: string;
	readonly dosageForm: string;
	readonly recognizedDrug: DentalAnestheticInfo | null;
	readonly costRub: number | null;
	readonly vatRate: 0 | 10 | 20;
	readonly scannedAt: string;
}

export interface ChestnyZnakScanSummary {
	readonly totalCount: number;
	readonly verifiedCount: number;
	readonly warningCount: number;
	readonly expiredCount: number;
	readonly invalidCount: number;
	readonly totalCostRub: number;
	readonly uniqueGtinCount: number;
	readonly uniqueSeriesCount: number;
}

// ─── Schema 701 (Acceptance by UPD / 701-accept-goods) ──────────────────────

export interface MdlpSchema701Item {
	readonly sgtin: string;
	readonly gtin?: string | undefined;
	readonly serialNumber?: string | undefined;
	readonly costRub?: number | null | undefined;
	readonly vatValueRub?: number | null | undefined;
	readonly series?: string | null | undefined;
	readonly tradeName?: string | null | undefined;
}

export interface MdlpSchema701Params {
	readonly subjectId: string;
	readonly shipperId: string;
	readonly operationDate?: string | Date | null | undefined;
	readonly docNum: string;
	readonly docDate: string;
	readonly receivingType?: 1 | 2 | undefined;
	readonly items: readonly MdlpSchema701Item[];
}

export interface MdlpSchema701Document {
	readonly actionId: 701;
	readonly subjectId: string;
	readonly shipperId: string;
	readonly operationDate: string;
	readonly docNum: string;
	readonly docDate: string;
	readonly receivingType: 1 | 2;
	readonly items: readonly MdlpSchema701Item[];
	readonly xmlContent: string;
	readonly jsonContent: Readonly<Record<string, unknown>>;
}

export type SafeParseMdlpSchema701Result =
	| { success: true; data: MdlpSchema701Params }
	| { success: false; errors: string[] };

// ─── Schema 531 (Medical Care Write-Off / 531-withdrawal) ───────────────────

export interface MdlpSchema531Item {
	readonly sgtin: string;
	readonly gtin?: string | undefined;
	readonly serialNumber?: string | undefined;
	readonly costRub?: number | null | undefined;
	readonly vatValueRub?: number | null | undefined;
	readonly series?: string | null | undefined;
	readonly tradeName?: string | null | undefined;
}

export interface MdlpSchema531Params {
	readonly subjectId: string;
	readonly operationDate?: string | Date | null | undefined;
	readonly docNum: string;
	readonly docDate: string;
	readonly withdrawalType?: 13 | 14 | 15 | 16 | number | undefined;
	readonly patientId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly notes?: string | null | undefined;
	readonly items: readonly MdlpSchema531Item[];
}

export interface MdlpSchema531Document {
	readonly actionId: 531;
	readonly subjectId: string;
	readonly operationDate: string;
	readonly docNum: string;
	readonly docDate: string;
	readonly withdrawalType: number;
	readonly patientId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly items: readonly MdlpSchema531Item[];
	readonly xmlContent: string;
	readonly jsonContent: Readonly<Record<string, unknown>>;
}

export type SafeParseMdlpSchema531Result =
	| { success: true; data: MdlpSchema531Params }
	| { success: false; errors: string[] };

// ─── 2. DATAMATRIX PARSING & VALIDATION TYPES ──────────────────────────────

export interface ParsedChestnyZnakBarcode {
	readonly rawBarcode: string;
	readonly gtin: string;
	readonly serialNumber: string;
	readonly sgtin: string;
	readonly cryptoKey: string | null;
	readonly cryptoSignature: string | null;
	readonly expirationDate: string | null;
	readonly expirationDateRaw: string | null;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly daysUntilExpiration: number | null;
	readonly series: string | null;
	readonly lot: string | null;
	readonly isValidGtinChecksum: boolean;
	readonly recognizedDrug: DentalAnestheticInfo | null;
	readonly parsedAIs: Readonly<Record<string, string>>;
	readonly status: ChestnyZnakVerificationStatus;
	readonly statusReason: string;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}
