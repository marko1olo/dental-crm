import type { z } from "zod";
import type {
	generateBarcodeBodySchema,
	linkSchema,
	quickNormCycleSchema,
	sanpinCycleCreateSchema,
	scanSchema,
	sterilizationShiftBatchSchema,
	unsealBodySchema,
} from "./sterilizationBodySchemas.js";

export type ScanInput = z.infer<typeof scanSchema>;
export type LinkInput = z.infer<typeof linkSchema>;
export type GenerateBarcodeInput = z.infer<typeof generateBarcodeBodySchema>;
export type UnsealBodyInput = z.infer<typeof unsealBodySchema>;
export type QuickNormCycleInput = z.infer<typeof quickNormCycleSchema>;
export type SanpinCycleCreateBody = z.infer<typeof sanpinCycleCreateSchema>;
export type SterilizationShiftBatchBody = z.infer<typeof sterilizationShiftBatchSchema>;

export interface AutoProvisionSterilizationLogParams {
	organizationId: string;
	barcode: string;
	operatorId?: string | null;
	now?: Date;
}

export interface EvaluateSterilizationLogInput {
	status: string;
	passedIndicator: boolean;
	expiresAt?: Date | string | null;
	itemsDescription?: string | null;
}

export interface EvaluateSterilizationLogResult {
	allowed: boolean;
	isExpired: boolean;
	errorCode?: string;
	errorMessage?: string;
	emergencyLogNote?: string;
}

export interface DiaryHashInput {
	visitId: string;
	patientId?: string | null;
	anamnesis?: string | null;
	statusLocalis?: string | null;
	treatmentDescription?: string | null;
	diagnosisIcd10?: string | null;
	diagnosisTooth?: string | null;
	complications?: string | null;
	comorbidities?: string | null;
	instrumentTrayBarcode?: string | null;
}

export interface UnsealKraftPackageParams {
	barcode: string;
	operatorName?: string | null | undefined;
	operatorId?: string | null | undefined;
	notes?: string | null | undefined;
	now?: Date | undefined;
}

export interface UnsealKraftPackageResponse {
	success: boolean;
	barcode: string;
	unsealedAt: string;
	commissionRequired: false;
	operatorName: string;
	operatorId: string | null;
	status: "unsealed";
	sanpinVerified: true;
	message: string;
}
