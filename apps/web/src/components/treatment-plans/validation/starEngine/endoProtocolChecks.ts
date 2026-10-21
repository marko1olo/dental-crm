import { getAnatomicalRootCanalCount, isDeciduousTooth } from "../../treatmentPlanStagesEngine";
import type { TreatmentPlanItem } from "../../types";
import type { StarProtocolRuleCheck } from "./types";

export function checkEndoToothProtocol(
	toothNum: number,
	toothItems: readonly TreatmentPlanItem[],
): StarProtocolRuleCheck[] {
	const checks: StarProtocolRuleCheck[] = [];
	const isDeciduous = isDeciduousTooth(toothNum);
	const expectedCanals = getAnatomicalRootCanalCount(toothNum);
	const codes = toothItems.map((i) => i.code804n.trim().toUpperCase());

	const hasEndoPrep = codes.some((c) => c.startsWith("A16.07.030"));
	const hasEndoObturation = codes.some((c) => c.startsWith("A16.07.008"));

	if (!hasEndoPrep && !hasEndoObturation) return checks;

	const expectedPrepCode = `A16.07.030.00${expectedCanals}`;
	const expectedObtCode = `A16.07.008.00${expectedCanals}`;
	const actualPrep = codes.find((c) => c.startsWith("A16.07.030"));
	const actualObt = codes.find((c) => c.startsWith("A16.07.008"));

	if (actualPrep && actualPrep !== expectedPrepCode && !isDeciduous) {
		checks.push({
			ruleId: `star-endo-canals-prep-${toothNum}`,
			protocolCode: "K04_ENDO",
			protocolTitleRu: "Клинический протокол СтАР: Пульпит и болезни периапикальных тканей (К04)",
			toothNumber: toothNum,
			ruleDescriptionRu: `Анатомическое соответствие инструментальной обработки числу каналов (${expectedCanals} кан.)`,
			status: "warning",
			messageRu: `Для зуба ${toothNum} (анатомически ${expectedCanals} кан.) указан код обработки ${actualPrep}`,
			recommendationRu: `Рекомендуется проверить анатомию по КЛКТ и скорректировать на ${expectedPrepCode}`,
			normativeRefRu: "Клинические рекомендации СтАР «Пульпит зуба» (К04.0)",
			order804nCodesRelated: [actualPrep, expectedPrepCode],
		});
	}

	if (actualObt && actualObt !== expectedObtCode && !isDeciduous) {
		checks.push({
			ruleId: `star-endo-canals-obt-${toothNum}`,
			protocolCode: "K04_ENDO",
			protocolTitleRu: "Клинический протокол СтАР: Пульпит и болезни периапикальных тканей (К04)",
			toothNumber: toothNum,
			ruleDescriptionRu: `Анатомическое соответствие пломбирования каналов (${expectedCanals} кан.)`,
			status: "warning",
			messageRu: `Для зуба ${toothNum} (анатомически ${expectedCanals} кан.) указан код обтурации ${actualObt}`,
			recommendationRu: `Рекомендуется скорректировать на ${expectedObtCode}`,
			normativeRefRu: "Клинические рекомендации СтАР «Пульпит зуба» (К04.0)",
			order804nCodesRelated: [actualObt, expectedObtCode],
		});
	}

	const hasCrownOrInlay = codes.some(
		(c) => c.startsWith("A16.07.004") || c.startsWith("A16.07.003") || c === "A16.07.005",
	);
	if (!hasCrownOrInlay && !isDeciduous && (toothNum % 10 >= 4)) {
		checks.push({
			ruleId: `star-endo-crown-protection-${toothNum}`,
			protocolCode: "K04_ENDO",
			protocolTitleRu: "Клинический протокол СтАР: Реабилитация депульпированных зубов",
			toothNumber: toothNum,
			ruleDescriptionRu: "Ортопедическая защита жевательного зуба (коронка/вкладка) после депульпирования",
			status: "warning",
			messageRu: `Жевательный зуб ${toothNum} после эндодонтического лечения восстанавливается только пломбой`,
			recommendationRu: "Рекомендуется включить в Этап 3 керамическую коронку (A16.07.004.001) или накладку Onlay (A16.07.003) для предотвращения раскола корня",
			normativeRefRu: "Клинические рекомендации СтАР «Восстановление коронковой части зуба после эндодонтии»",
			order804nCodesRelated: ["A16.07.004.001", "A16.07.003"],
		});
	} else {
		checks.push({
			ruleId: `star-endo-success-${toothNum}`,
			protocolCode: "K04_ENDO",
			protocolTitleRu: "Клинический протокол СтАР: Пульпит и эндодонтия",
			toothNumber: toothNum,
			ruleDescriptionRu: "Комплексное эндодонтическое лечение с ортопедической реабилитацией",
			status: "pass",
			messageRu: `Зуб ${toothNum}: соблюден протокол эндодонтической обработки и защиты`,
			normativeRefRu: "Клинические рекомендации СтАР (К04)",
			order804nCodesRelated: codes,
		});
	}

	return checks;
}
