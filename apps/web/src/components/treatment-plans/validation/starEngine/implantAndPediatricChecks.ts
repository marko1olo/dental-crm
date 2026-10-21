import { isDeciduousTooth } from "../../treatmentPlanStagesEngine";
import type { TreatmentPlanItem } from "../../types";
import type { StarProtocolRuleCheck } from "./types";

export function checkImplantAndPediatricProtocols(
	toothNum: number,
	toothItems: readonly TreatmentPlanItem[],
	hasCTDiagnostics: boolean,
): StarProtocolRuleCheck[] {
	const checks: StarProtocolRuleCheck[] = [];
	const isDeciduous = isDeciduousTooth(toothNum);
	const codes = toothItems.map((i) => i.code804n.trim().toUpperCase());

	const hasImplant = codes.includes("A16.07.054.001") || codes.includes("A16.07.054");
	const hasGuide = codes.includes("A16.07.054") && !codes.includes("A16.07.054.001");
	const hasImplantCrown = codes.includes("A16.07.006");

	if (hasImplant) {
		if (!hasCTDiagnostics) {
			checks.push({
				ruleId: `star-implant-no-ct-${toothNum}`,
				protocolCode: "K08_IMPLANT_ORTHO",
				protocolTitleRu: "Клинический протокол СтАР: Дентальная имплантация",
				toothNumber: toothNum,
				ruleDescriptionRu: "Рекомендация 3D КЛКТ перед операцией имплантации",
				status: "warning",
				messageRu: `Имплантация зуба ${toothNum}: рекомендуется проверить наличие 3D КЛКТ диагностики (A06.07.004)`,
				recommendationRu: "Убедитесь в наличии актуального 3D КЛКТ снимка в архиве карты пациента перед операцией",
				normativeRefRu: "Клинический протокол СтАР «Дентальная имплантация при дефектах зубных рядов»",
				order804nCodesRelated: ["A06.07.004", "A16.07.054.001"],
			});
		}

		if (hasGuide) {
			checks.push({
				ruleId: `star-implant-guide-pass-${toothNum}`,
				protocolCode: "K08_IMPLANT_ORTHO",
				protocolTitleRu: "Клинический протокол СтАР: Навигационная хирургия",
				toothNumber: toothNum,
				ruleDescriptionRu: "Применение 3D хирургического навигационного шаблона",
				status: "pass",
				messageRu: `Зуб ${toothNum}: имплантация по навигационному 3D-шаблону (A16.07.054)`,
				normativeRefRu: "Клинические рекомендации СтАР по цифровой навигационной имплантологии",
				order804nCodesRelated: ["A16.07.054", "A16.07.054.001"],
			});
		}

		if (!hasImplantCrown) {
			checks.push({
				ruleId: `star-implant-no-crown-${toothNum}`,
				protocolCode: "K08_IMPLANT_ORTHO",
				protocolTitleRu: "Клинический протокол СтАР: Дентальная имплантация",
				toothNumber: toothNum,
				ruleDescriptionRu: "Завершение имплантации ортопедическим этапом протезирования",
				status: "warning",
				messageRu: `Для имплантата ${toothNum} не запланировано ортопедическое протезирование (A16.07.006)`,
				recommendationRu: "Добавьте в Этап 3 коронку на имплантате с индивидуальным абатментом",
				normativeRefRu: "Клинический протокол СтАР «Протезирование на дентальных имплантатах»",
				order804nCodesRelated: ["A16.07.006"],
			});
		}
	}

	if (isDeciduous) {
		const hasPulpotomy = codes.includes("A16.07.008.001");
		const hasSSC = codes.includes("A16.07.004.003");
		if (hasPulpotomy && !hasSSC) {
			checks.push({
				ruleId: `star-pediatric-ssc-recommend-${toothNum}`,
				protocolCode: "PEDIATRIC",
				protocolTitleRu: "Клинический протокол СтАР: Детская терапевтическая стоматология",
				toothNumber: toothNum,
				ruleDescriptionRu: "Стандартная защитная коронка SSC после пульпотомии молочного моляра",
				status: "warning",
				messageRu: `Временный моляр ${toothNum} после пульпотомии не защищен коронкой SSC`,
				recommendationRu: "Рекомендуется стандартная коронка SSC (A16.07.004.003) для предотвращения сколов до физиологической смены",
				normativeRefRu: "Клинические рекомендации СтАР «Пульпит временных зубов у детей»",
				order804nCodesRelated: ["A16.07.004.003"],
			});
		}
	}

	return checks;
}
