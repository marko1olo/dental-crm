/**
 * apps/web/src/components/settings/insuranceModules/insuranceContractsTypes.ts
 *
 * Types and helper functions for Clinic DMS / VHI Insurance Contracts.
 * Governed by Mandates 8b (<= 500 lines), 8d (zero cartoon emojis), 8e (doctor autonomy).
 */

import type { ContractFormData } from "../insurance/InsuranceContractModal";
import type { InsuranceContract } from "../insuranceContractsPanelData";

export interface GuaranteeLetterSummary {
	id: string;
	contractId: string | null;
	patientId: string;
	patientFullName: string;
	policyNumber: string;
	insurerName: string;
	letterNumber: string;
	validFrom: string;
	validUntil: string;
	maxCoverageRub: number;
	usedAmountRub: number;
	franchisePct: number;
	curatorFullName: string | null;
	curatorPhone: string | null;
	status: string;
}

export const defaultContractFormData = (): ContractFormData => ({
	companyName: "",
	policyNumberMask: "",
	coverageTherapyPct: "0",
	coverageSurgeryPct: "0",
	coverageOrthoPct: "0",
	coverageHygienePct: "0",
	annualLimitRub: "",
	patientFranchisePct: "0",
	requiresGuaranteeLetter: false,
});

export const clampPct = (v: string): number =>
	Math.min(100, Math.max(0, parseFloat(v) || 0));

export type { ContractFormData, InsuranceContract };
