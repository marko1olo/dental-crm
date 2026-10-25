/**
 * apps/web/src/components/settings/clinic/taxationModules/TaxationCardTypes.ts
 *
 * Types and configurations for Clinic Taxation & KKT Fiscalization.
 */

import type { Ffd12AgentSign } from "@dental/shared";

export type TaxationSystem =
	| "usn_income"
	| "usn_income_expense"
	| "psn"
	| "osn"
	| "patent"
	| "osno";

export type CanonicalTaxationSystem =
	| "usn_income"
	| "usn_income_expense"
	| "psn"
	| "osn";

export interface TaxationSystemConfig {
	id: CanonicalTaxationSystem;
	ffdTagCode: number;
	name: string;
	shortName: string;
	rateDescription: string;
	vatRule: string;
	recommendedFor: string;
}

export interface AgentSignOption {
	value: Ffd12AgentSign | "none";
	label: string;
	tag1057Code?: number;
	description: string;
}

export type FiscalSaveStatus = "idle" | "saved" | "error";

export interface FiscalSettingsFormData {
	activeTaxation: CanonicalTaxationSystem;
	ofdProvider: string;
	ffdVersion: "1.2" | "1.05";
	autoSendReceipt: boolean;
	allowAutonomousBuffer: boolean;
	cashBoxId: string | null;
	cashBoxName: string;
	kkmModel: string;
	kkmSerialNumber: string;
	branchId: string;
	kkmActive: boolean;
	agentSign: Ffd12AgentSign | "none";
}

export function normalizeTaxationId(value: unknown): CanonicalTaxationSystem {
	if (typeof value !== "string") return "usn_income";
	const v = value.trim().toLowerCase();
	if (v === "usn_income_expense") return "usn_income_expense";
	if (v === "psn" || v === "patent") return "psn";
	if (v === "osn" || v === "osno") return "osn";
	return "usn_income";
}

export {
	TAXATION_SYSTEMS,
	KKM_MODEL_OPTIONS,
	BRANCH_OPTIONS,
	OFD_PROVIDER_OPTIONS,
	FISCAL_AGENT_OPTIONS,
} from "./taxationPresets";
