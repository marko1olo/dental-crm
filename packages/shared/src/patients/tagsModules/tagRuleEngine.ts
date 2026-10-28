import { type PatientTagCode } from "./tagDefinitions.js";

export interface PatientTagEvaluationFacts {
	readonly balanceKopecks?: number;
	readonly ageYears?: number;
	readonly noShowCount?: number;
	readonly isPregnant?: boolean;
	readonly hasDrugAllergies?: boolean;
	readonly hasAcutePainEmergency?: boolean;
	readonly hasInsurancePolicy?: boolean;
	readonly isMedicalStaff?: boolean;
	readonly isDisabilityAssisted?: boolean;
	readonly isFamilyHead?: boolean;
	readonly isVipService?: boolean;
}

export function shouldAssignDebtorTag(balanceKopecks?: number): boolean {
	return typeof balanceKopecks === "number" && balanceKopecks < 0;
}

export function shouldAssignChildTag(ageYears?: number): boolean {
	return typeof ageYears === "number" && ageYears >= 0 && ageYears < 18;
}

export function shouldAssignPensionerTag(ageYears?: number): boolean {
	return typeof ageYears === "number" && ageYears >= 60;
}

export function shouldAssignBlacklistTag(noShowCount?: number): boolean {
	return typeof noShowCount === "number" && noShowCount >= 3;
}

export function evaluatePatientTagRules(
	facts: PatientTagEvaluationFacts,
	existingTags: (PatientTagCode | string)[] = [],
): PatientTagCode[] {
	const result = new Set<PatientTagCode>(existingTags as PatientTagCode[]);

	if (facts.hasDrugAllergies) result.add("allergy");
	if (facts.hasAcutePainEmergency) result.add("acute_pain");
	if (facts.isPregnant) result.add("pregnancy");
	if (facts.hasInsurancePolicy) result.add("dms");
	if (facts.isMedicalStaff) result.add("medical_staff");
	if (facts.isDisabilityAssisted) result.add("disability");
	if (facts.isFamilyHead) result.add("family_head");
	if (facts.isVipService) result.add("vip");

	if (shouldAssignDebtorTag(facts.balanceKopecks)) {
		result.add("debtor");
	} else if (facts.balanceKopecks !== undefined && facts.balanceKopecks >= 0) {
		result.delete("debtor");
	}

	if (shouldAssignChildTag(facts.ageYears)) {
		result.add("child");
	}

	if (shouldAssignPensionerTag(facts.ageYears)) {
		result.add("pensioner");
	}

	if (shouldAssignBlacklistTag(facts.noShowCount)) {
		result.add("blacklist");
	}

	return Array.from(result);
}
