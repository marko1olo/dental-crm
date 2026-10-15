/**
 * Type definitions & contracts for 54-FZ FFD 1.2 fiscal validation.
 * Layer 0: Pure interfaces and data contracts.
 */

import type { Ffd12OperationType } from "../ffd12Types.js";

export interface Format54FzFtsQrParams {
	readonly issuedAt: Date | string;
	readonly totalKopecks: number;
	readonly fnSerial: string;
	readonly fiscalDocumentNumber: number | string;
	readonly fiscalSign: number | string;
	readonly operationType: Ffd12OperationType | number;
}

export interface Parsed54FzQrResult {
	readonly isValid: boolean;
	readonly errorMessage?: string | undefined;
	readonly issuedAtIso?: string | undefined;
	readonly totalAmountRub?: number | undefined;
	readonly totalAmountKopecks?: number | undefined;
	readonly fnSerial?: string | undefined;
	readonly fiscalDocumentNumber?: number | undefined;
	readonly fiscalSign?: string | undefined;
	readonly operationType?: Ffd12OperationType | undefined;
	readonly rawParams?: Record<string, string> | undefined;
}

export interface ComputeFpd54FzParams {
	readonly fnSerial: string;
	readonly fiscalDocumentNumber: number | string;
	readonly issuedAt: Date | string;
	readonly totalKopecks: number;
	readonly operationType?: Ffd12OperationType | number | string | undefined;
}

export interface CashChangeResult {
	readonly cashRequiredRub: number;
	readonly receivedCashRub: number;
	readonly changeRub: number;
	readonly changeKopecks: number;
	readonly isShortage: boolean;
	readonly shortageRub: number;
	readonly shortageKopecks: number;
}
