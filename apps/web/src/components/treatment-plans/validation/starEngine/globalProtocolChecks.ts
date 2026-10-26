import type { TreatmentPlanItem } from "../../types";
import { isValidServiceCatalogCodeFormat } from "./toothProcedureClassifier";
import type { StarProtocolRuleCheck } from "./types";

export function checkGlobalStarProtocols(
	allItems: readonly TreatmentPlanItem[],
	codesPresent: ReadonlySet<string>,
	hasCTDiagnostics: boolean,
	hasHygiene: boolean,
): StarProtocolRuleCheck[] {
	const checks: StarProtocolRuleCheck[] = [];

	let validCodesCount = 0;
	for (const item of allItems) {
		const rawCode = (item as any).serviceCode || item.code804n;
		const isValidFormat = isValidServiceCatalogCodeFormat(rawCode);
		if (isValidFormat) {
			validCodesCount++;
		} else {
			checks.push({
				ruleId: `service-code-format-${item.id}`,
				protocolCode: "CATALOG_SERVICES",
				protocolTitleRu: "Прейскурант и каталог процедур",
				toothNumber: item.toothNumber,
				ruleDescriptionRu: "Каждая позиция плана должна иметь валидный код по каталогу процедур",
				status: "warning",
				messageRu: `Позиция «${item.name}» использует пользовательский код каталога: «${rawCode}»`,
				recommendationRu: "Рекомендуется указать утвержденный код каталога услуг (например, A16.07.002.001)",
				normativeRefRu: "Прейскурант и клинические стандарты услуг",
				serviceCatalogCodesRelated: [rawCode],
				order804nCodesRelated: [rawCode],
			});
		}
	}

	if (allItems.length > 0 && validCodesCount === allItems.length) {
		checks.push({
			ruleId: "service-code-all-valid",
			protocolCode: "CATALOG_SERVICES",
			protocolTitleRu: "Прейскурант и каталог процедур",
			ruleDescriptionRu: "Все позиции плана соответствуют каталогу процедур",
			status: "pass",
			messageRu: `Все ${allItems.length} процедур плана имеют зарегистрированные коды каталога процедур`,
			normativeRefRu: "Прейскурант и клинические стандарты услуг",
			serviceCatalogCodesRelated: Array.from(codesPresent),
			order804nCodesRelated: Array.from(codesPresent),
		});
	}

	if (allItems.length > 0) {
		if (hasCTDiagnostics) {
			checks.push({
				ruleId: "star-diag-ct-pass",
				protocolCode: "K08_IMPLANT_ORTHO",
				protocolTitleRu: "Клинический протокол СтАР: Диагностика и планирование",
				ruleDescriptionRu: "Наличие компьютерной томографии 3D КЛКТ перед инвазивным лечением",
				status: "pass",
				messageRu: "3D КЛКТ диагностика челюстно-лицевой области (A06.07.004) включена в план",
				normativeRefRu: "Клинические рекомендации СтАР «Диагностика в стоматологии»",
				order804nCodesRelated: ["A06.07.004"],
			});
		} else {
			checks.push({
				ruleId: "star-diag-ct-warn",
				protocolCode: "K08_IMPLANT_ORTHO",
				protocolTitleRu: "Клинический протокол СтАР: Диагностика и планирование",
				ruleDescriptionRu: "Наличие компьютерной томографии 3D КЛКТ перед инвазивным лечением",
				status: "warning",
				messageRu: "В плане отсутствует 3D КЛКТ диагностика (A06.07.004)",
				recommendationRu: "Рекомендуется добавить 3D-томографию для оценки анатомии корней и объема кости",
				normativeRefRu: "Клинические рекомендации СтАР «Диагностика в стоматологии»",
				order804nCodesRelated: ["A06.07.004"],
			});
		}

		if (hasHygiene) {
			checks.push({
				ruleId: "star-hygiene-pass",
				protocolCode: "K05_PERIO",
				protocolTitleRu: "Клинический протокол СтАР: Профессиональная гигиена полости рта",
				ruleDescriptionRu: "Санация полости рта и удаление биопленки перед хирургическим/ортопедическим этапом",
				status: "pass",
				messageRu: "Профессиональная гигиена полости рта (A16.07.050 / A16.07.051) включена в план",
				normativeRefRu: "Клинические рекомендации СтАР «Профилактика стоматологических заболеваний»",
				order804nCodesRelated: ["A16.07.050"],
			});
		} else {
			checks.push({
				ruleId: "star-hygiene-warn",
				protocolCode: "K05_PERIO",
				protocolTitleRu: "Клинический протокол СтАР: Профессиональная гигиена полости рта",
				ruleDescriptionRu: "Санация полости рта и удаление биопленки перед хирургическим/ортопедическим этапом",
				status: "warning",
				messageRu: "В плане отсутствует профессиональная гигиена (A16.07.050)",
				recommendationRu: "Включите комплексную гигиену Air-Flow на 1-м этапе для устранения бактериального очага",
				normativeRefRu: "Клинические рекомендации СтАР «Профилактика стоматологических заболеваний»",
				order804nCodesRelated: ["A16.07.050"],
			});
		}
	}

	return checks;
}
