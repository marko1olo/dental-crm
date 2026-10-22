/**
 * semanticRulesEngine.ts — Coordinates semantic validation rules for EGISZ CDA
 */

import { checkHeaderAndMoRules } from "./semanticRulesHeaderMo";
import { checkPatientAndClinicalRules } from "./semanticRulesPatientClinical";
import type { CdaExportData, SemanticValidationReport, SemanticValidationRuleResult } from "./validatorTypes";

export function validateCdaSemanticRules(
	data: CdaExportData,
	xml: string,
	hasDoctorSignature: boolean = false,
	hasMoSignature: boolean = false,
): SemanticValidationReport {
	const rules: SemanticValidationRuleResult[] = [];

	checkHeaderAndMoRules(data, xml, rules);
	checkPatientAndClinicalRules(data, xml, hasDoctorSignature, rules);

	const passedCount = rules.filter((r) => r.status === "passed").length;
	const failedCount = rules.filter((r) => r.status === "failed").length;
	const warningCount = rules.filter((r) => r.status === "warning").length;
	const totalRules = rules.length;
	const scorePercent = Math.round((passedCount / totalRules) * 100);

	return {
		isValid: failedCount === 0,
		totalRules,
		passedCount,
		failedCount,
		warningCount,
		scorePercent,
		rules,
	};
}
