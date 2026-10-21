/**
 * types.ts — Контракты справочников страховых компаний, программ и гарантийных писем
 */

export type DmsInsurerId =
	| "sogaz"
	| "ingosstrakh"
	| "reso_garantiya"
	| "alfastrakhovanie"
	| "vsk"
	| "soglasie";

export type DmsProgramKey =
	| "standard_therapy"
	| "vip_full_coverage"
	| "extended_surgery_hygiene"
	| "economy_emergency_only";

export type DmsGuaranteeLetterStatus =
	| "draft"
	| "pending_approval"
	| "approved"
	| "active"
	| "billed"
	| "paid"
	| "exhausted"
	| "expired"
	| "cancelled";

export type DmsPreAuthApprovalStatus =
	| "approved"
	| "pending_preauth"
	| "rejected_exclusion"
	| "limit_exceeded"
	| "requires_letter";

export interface DmsInsurerMetadata {
	readonly id: DmsInsurerId;
	readonly key: string;
	readonly shortName: string;
	readonly fullName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly kpp: string;
	readonly phone: string;
	readonly email: string;
	readonly portalUrl: string;
	readonly curatorDepartment: string;
	readonly defaultSlaHours: number;
	readonly statutoryRegulations2026: boolean;
	readonly supportedPrograms: readonly DmsProgramKey[];
	readonly standardTermsDescription: string;
	readonly requiresXrayForEndo: boolean;
	readonly requiresCtPreAuth: boolean;
}

export interface DmsProgramPolicyDefinition {
	readonly key: DmsProgramKey;
	readonly title: string;
	readonly subtitle: string;
	readonly defaultLimitKopecks: number;
	readonly isUnlimited: boolean;
	readonly maxHygienePerYear: number;
	readonly coversOrthodontics: boolean;
	readonly coversImplantation: boolean;
	readonly coversVeneers: boolean;
	readonly coversBleaching: boolean;
	readonly coversCt3D: boolean;
	readonly description: string;
}

export interface DmsStatutoryExclusionRule {
	readonly ruleId: string;
	readonly code: string;
	readonly title: string;
	readonly reasonDescription: string;
	readonly matchingKeywords: readonly string[];
	readonly matchingNomenclatureCodes: readonly string[];
	readonly excludedInPrograms: readonly DmsProgramKey[];
	readonly allowsPreAuthOverride: boolean;
}

export interface DmsNomenclature804nItem {
	readonly code: string;
	readonly name: string;
	readonly category: "therapy" | "surgery" | "hygiene" | "orthopedics" | "orthodontics" | "radiology" | "anesthesia";
	readonly defaultPriceKopecks: number;
	readonly isBaseDmsCovered: boolean;
	readonly requiresToothNumber: boolean;
	readonly requiresXrayProof: boolean;
}

export interface DmsGuaranteeLetterRecord {
	readonly id: string;
	readonly letterNumber: string;
	readonly insurerId: DmsInsurerId;
	readonly insurerName: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly programKey: DmsProgramKey;
	readonly issueDate: string;
	readonly validUntil: string;
	readonly totalLimitKopecks: number;
	readonly usedAmountKopecks: number;
	readonly approvedNomenclatureCodes: readonly string[];
	readonly approvedTeeth: readonly string[];
	readonly diagnosisMkb10: readonly string[];
	readonly status: DmsGuaranteeLetterStatus;
	readonly curatorFullName: string;
	readonly curatorPhone: string;
	readonly curatorEmail: string;
	readonly attachedXrayUris: readonly string[];
	readonly notes: string;
}
