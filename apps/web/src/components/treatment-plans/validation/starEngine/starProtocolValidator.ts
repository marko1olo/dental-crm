import type { TreatmentPlanItem, TreatmentPlanStage } from "../../types";
import { checkGlobalStarProtocols } from "./globalProtocolChecks";
import { detectMutuallyExclusiveToothProcedures } from "./mutualExclusionDetector";
import { checkToothStarProtocols } from "./toothProtocolChecks";
import type { StarProtocolOverallCompliance, StarProtocolRuleCheck, StarProtocolValidationSummary } from "./types";

export function validateTreatmentPlanStarProtocols(
	stages: readonly TreatmentPlanStage[],
): StarProtocolValidationSummary {
	const allItems: TreatmentPlanItem[] = stages.flatMap((s) => s.items);
	const checks: StarProtocolRuleCheck[] = [];

	const codesPresent = new Set(allItems.map((i) => i.code804n.trim().toUpperCase()));
	const hasCTDiagnostics = codesPresent.has("A06.07.012") || codesPresent.has("A06.07.004") || codesPresent.has("A06.07.003");
	const hasHygiene = codesPresent.has("A16.07.050") || codesPresent.has("A16.07.051");

	checks.push(...checkGlobalStarProtocols(allItems, codesPresent, hasCTDiagnostics, hasHygiene));

	const itemsByTooth = new Map<number, TreatmentPlanItem[]>();
	for (const it of allItems) {
		if (typeof it.toothNumber === "number" && it.toothNumber > 0) {
			const existing = itemsByTooth.get(it.toothNumber) || [];
			existing.push(it);
			itemsByTooth.set(it.toothNumber, existing);
		}
	}

	for (const [toothNum, toothItems] of itemsByTooth.entries()) {
		checks.push(...checkToothStarProtocols(toothNum, toothItems, hasCTDiagnostics));
	}

	const exclusiveConflicts = detectMutuallyExclusiveToothProcedures(allItems);
	for (const conflict of exclusiveConflicts) {
		checks.push({
			ruleId: `star-conflict-exclusive-${conflict.toothNumber}-${conflict.procedureA.id}-${conflict.procedureB.id}`,
			protocolCode: "K08_IMPLANT_ORTHO",
			protocolTitleRu: "Клинический протокол СтАР: Контроль взаимоисключающих манипуляций",
			toothNumber: conflict.toothNumber,
			ruleDescriptionRu: "Исключение одновременного назначения взаимоисключающих манипуляций на один и тот же зуб",
			status: "error",
			messageRu: `Клинический конфликт на зубе №${conflict.toothNumber}: ${conflict.descriptionRu}`,
			recommendationRu: `Удалите одну из взаимоисключающих процедур для зуба №${conflict.toothNumber}: выберите либо хирургическое удаление, либо терапевтическое/ортопедическое сохранение.`,
			normativeRefRu: "Клинические протоколы СтАР и стандарты качества стоматологической помощи",
			order804nCodesRelated: [conflict.procedureA.code804n, conflict.procedureB.code804n],
		});
	}

	const totalChecksCount = checks.length;
	const passedChecksCount = checks.filter((c) => c.status === "pass").length;
	const warningsCount = checks.filter((c) => c.status === "warning").length;
	const errorsCount = checks.filter((c) => c.status === "error").length;

	let overallStatus: StarProtocolOverallCompliance = "FULL_COMPLIANCE";
	if (errorsCount > 0) {
		overallStatus = "NON_COMPLIANT_DEFECTS";
	} else if (warningsCount > 0) {
		overallStatus = "COMPLIANT_WITH_RECOMMENDATIONS";
	}

	const complianceScorePercent =
		totalChecksCount > 0
			? Math.max(70, Math.min(100, Math.round(((passedChecksCount + warningsCount * 0.9) / totalChecksCount) * 100)))
			: 100;

	return {
		totalChecksCount,
		passedChecksCount,
		warningsCount,
		errorsCount,
		complianceScorePercent,
		overallStatus,
		checks,
		criticalDefects: checks.filter((c) => c.status === "error"),
		clinicalRecommendations: checks.filter((c) => c.status === "warning"),
		verifiedStagesCount: stages.length,
		verifiedProceduresCount: allItems.length,
		validatedAtIso: new Date().toISOString(),
	};
}
