/**
 * types.ts — Контракты моделей каталогов страховых компаний и полисов ДМС
 */

export type DmsProgramType = "base" | "extended" | "vip";

export interface DmsInsurerDefinition {
	readonly id: string;
	readonly key: string;
	readonly shortName: string;
	readonly fullName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly phone: string;
	readonly email: string;
	readonly portalUrl: string;
	readonly defaultClaimSlaHours: number;
	readonly supportedPrograms: readonly DmsProgramType[];
	readonly standardTerms: string;
}

export interface DmsProgramDefinition {
	readonly type: DmsProgramType;
	readonly name: string;
	readonly description: string;
	readonly defaultLimitKopecks: number;
	readonly allowedCategories: readonly string[];
	readonly maxHygienePerYear: number;
}

export interface DmsExclusionRule {
	readonly id: string;
	readonly code: string;
	readonly title: string;
	readonly description: string;
	readonly matchingKeywords: readonly string[];
	readonly matchingNomenclaturePrefixes: readonly string[];
	readonly appliesToPrograms: readonly DmsProgramType[];
}

export interface DmsPolicy {
	readonly id: string;
	readonly insurerId: string;
	readonly policySeries?: string | undefined;
	readonly policyNumber: string;
	readonly program: DmsProgramType;
	readonly liabilityLimitKopecks: number;
	readonly franchiseType: "none" | "percent" | "fixed";
	readonly franchisePercent?: number | undefined;
	readonly franchiseFixedKopecks?: number | undefined;
	readonly validFrom: string;
	readonly validTo: string;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | undefined;
	readonly specialConditions?: readonly string[] | undefined;
}
