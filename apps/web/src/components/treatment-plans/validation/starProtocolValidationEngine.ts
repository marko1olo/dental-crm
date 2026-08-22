/**
 * starProtocolValidationEngine.ts — Движок автоматической клинической валидации планов лечения
 * по клиническим рекомендациям СтАР (Стоматологическая Ассоциация России) и Приказу Минздрава РФ № 804н.
 *
 * НОРМАТИВНО-КЛИНИЧЕСКИЙ КОНТУР:
 * 1. Приказ Минздрава России от 13.10.2017 № 804н «Об утверждении номенклатуры медицинских услуг».
 * 2. Клинические рекомендации (протоколы лечения) СтАР:
 *    - К02: Кариес зубов (Диагностика, препарирование, адгезия, нанокомпозиты A16.07.002.001).
 *    - К04.0-К04.3: Пульпит (Изоляция, обработка по числу каналов A16.07.030.001..004, 3D-обтурация A16.07.008.001..004, рентген-контроль A06.07.004).
 *    - К04.4-К04.7: Периодонтит (Распломбирование A16.07.082, Ca(OH)2 дезинфекция A16.07.091, герметизация).
 *    - К05: Болезни пародонта (Профгигиена A16.07.050, скейлинг SRP A16.07.051, кюретаж A16.07.039, шинирование A16.07.019).
 *    - К08.1: Адентия (3D КЛКТ A06.07.004, навигационный шаблон A16.07.054, имплантация A16.07.054.001, костная пластика A16.07.041, коронки на имплантатах A16.07.006).
 *    - Детская стоматология (Лечение временных зубов, детские коронки SSC A16.07.004.003).
 */

import {
	getAnatomicalRootCanalCount,
	isDeciduousTooth,
	ORDER_804N_DICTIONARY,
} from "../treatmentPlanStagesEngine";
import type { TreatmentPlanItem, TreatmentPlanStage } from "../types";

export type StarProtocolSeverity = "pass" | "warning" | "error";

export interface StarProtocolRuleCheck {
	readonly ruleId: string;
	readonly protocolCode: "K02_CARIES" | "K04_ENDO" | "K05_PERIO" | "K08_IMPLANT_ORTHO" | "PEDIATRIC" | "NOMENCLATURE_804N";
	readonly protocolTitleRu: string;
	readonly toothNumber?: number | undefined;
	readonly ruleDescriptionRu: string;
	readonly status: StarProtocolSeverity;
	readonly messageRu: string;
	readonly recommendationRu?: string | undefined;
	readonly normativeRefRu: string;
	readonly order804nCodesRelated: readonly string[];
}

export type StarProtocolOverallCompliance =
	| "FULL_COMPLIANCE"
	| "COMPLIANT_WITH_RECOMMENDATIONS"
	| "NON_COMPLIANT_DEFECTS";

export interface StarProtocolValidationSummary {
	readonly totalChecksCount: number;
	readonly passedChecksCount: number;
	readonly warningsCount: number;
	readonly errorsCount: number;
	readonly complianceScorePercent: number;
	readonly overallStatus: StarProtocolOverallCompliance;
	readonly checks: readonly StarProtocolRuleCheck[];
	readonly criticalDefects: readonly StarProtocolRuleCheck[];
	readonly clinicalRecommendations: readonly StarProtocolRuleCheck[];
	readonly verifiedStagesCount: number;
	readonly verifiedProceduresCount: number;
	readonly validatedAtIso: string;
}

/**
 * Валидация корректности формата кода Номенклатуры 804н.
 * Форматы:
 * - A06.07.004 / A16.07.002.001
 * - B01.003.004.005
 */
export function isValidOrder804nCodeFormat(code: string): boolean {
	if (!code || typeof code !== "string") return false;
	const trimmed = code.trim().toUpperCase();
	const regex = /^[AB]\d{2}\.\d{2,3}\.\d{3}(\.\d{3})*$/;
	return regex.test(trimmed);
}

/**
 * Комплексный анализ соответствия плана лечения клиническим рекомендациям СтАР и Номенклатуре 804н.
 */
export function validateTreatmentPlanStarProtocols(
	stages: readonly TreatmentPlanStage[],
): StarProtocolValidationSummary {
	const allItems: TreatmentPlanItem[] = stages.flatMap((s) => s.items);
	const checks: StarProtocolRuleCheck[] = [];

	const codesPresent = new Set(allItems.map((i) => i.code804n.trim().toUpperCase()));
	const hasCTDiagnostics = codesPresent.has("A06.07.004") || codesPresent.has("A06.07.003");
	const hasHygiene = codesPresent.has("A16.07.050") || codesPresent.has("A16.07.051");

	// 1. Проверка Номенклатуры 804н для всех позиций
	let validCodesCount = 0;
	for (const item of allItems) {
		const isValidFormat = isValidOrder804nCodeFormat(item.code804n);
		if (isValidFormat) {
			validCodesCount++;
		} else {
			checks.push({
				ruleId: `804n-format-${item.id}`,
				protocolCode: "NOMENCLATURE_804N",
				protocolTitleRu: "Номенклатура медицинских услуг (Приказ МЗ РФ № 804н)",
				toothNumber: item.toothNumber,
				ruleDescriptionRu: "Каждая позиция плана должна иметь валидный код по Номенклатуре 804н",
				status: "error",
				messageRu: `Позиция «${item.name}» имеет некорректный код номенклатуры: «${item.code804n}»`,
				recommendationRu: "Укажите утвержденный код Номенклатуры 804н (например, A16.07.002.001)",
				normativeRefRu: "Приказ Минздрава России от 13.10.2017 № 804н",
				order804nCodesRelated: [item.code804n],
			});
		}
	}

	if (allItems.length > 0 && validCodesCount === allItems.length) {
		checks.push({
			ruleId: "804n-all-valid",
			protocolCode: "NOMENCLATURE_804N",
			protocolTitleRu: "Номенклатура медицинских услуг (Приказ МЗ РФ № 804н)",
			ruleDescriptionRu: "Все позиции плана соответствуют кодификатору 804н",
			status: "pass",
			messageRu: `Все ${allItems.length} процедур плана имеют зарегистрированные коды Номенклатуры 804н`,
			normativeRefRu: "Приказ Минздрава России от 13.10.2017 № 804н",
			order804nCodesRelated: Array.from(codesPresent),
		});
	}

	// 2. Проверка первичной 3D-диагностики и гигиены (Базовый стандарт СтАР)
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

	// 3. Анализ по отдельным зубам и нозологиям СтАР
	const itemsByTooth = new Map<number, TreatmentPlanItem[]>();
	for (const it of allItems) {
		if (typeof it.toothNumber === "number" && it.toothNumber > 0) {
			const existing = itemsByTooth.get(it.toothNumber) || [];
			existing.push(it);
			itemsByTooth.set(it.toothNumber, existing);
		}
	}

	for (const [toothNum, toothItems] of itemsByTooth.entries()) {
		const isDeciduous = isDeciduousTooth(toothNum);
		const expectedCanals = getAnatomicalRootCanalCount(toothNum);
		const codes = toothItems.map((i) => i.code804n.trim().toUpperCase());

		// А) Протокол СтАР: Пульпит и Эндодонтия (К04)
		const hasEndoPrep = codes.some((c) => c.startsWith("A16.07.030"));
		const hasEndoObturation = codes.some((c) => c.startsWith("A16.07.008"));
		const hasEndoUnsealing = codes.includes("A16.07.082");

		if (hasEndoPrep || hasEndoObturation) {
			// Проверка соответствия числа каналов
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

			// Проверка ортопедической защиты депульпированного зуба коронкой или накладкой (ст. СтАР: зубы после эндо подлежат укреплению)
			const hasCrownOrInlay = codes.some(
				(c) =>
					c.startsWith("A16.07.004") ||
					c.startsWith("A16.07.003") ||
					c === "A16.07.005",
			);
			if (!hasCrownOrInlay && !isDeciduous && (toothNum % 10 >= 4)) {
				// Для жевательных зубов (премоляры и моляры 4-8)
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
		}

		// Б) Протокол СтАР: Дентальная имплантация (К08.1)
		const hasImplant = codes.includes("A16.07.054.001");
		const hasGuide = codes.includes("A16.07.054");
		const hasImplantCrown = codes.includes("A16.07.006");

		if (hasImplant) {
			if (!hasCTDiagnostics) {
				checks.push({
					ruleId: `star-implant-no-ct-${toothNum}`,
					protocolCode: "K08_IMPLANT_ORTHO",
					protocolTitleRu: "Клинический протокол СтАР: Дентальная имплантация",
					toothNumber: toothNum,
					ruleDescriptionRu: "Обязательность 3D КЛКТ перед операцией имплантации",
					status: "error",
					messageRu: `Имплантация зуба ${toothNum} запланирована без 3D КЛКТ диагностики (A06.07.004)`,
					recommendationRu: "Добавьте КЛКТ челюстно-лицевой области для оценки плотности кости и анатомии нервов",
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

		// В) Детская стоматология (Временные зубы 51..85)
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
	}

	// 4. Подсчет итоговых показателей
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
			? Math.max(0, Math.min(100, Math.round(((passedChecksCount + warningsCount * 0.7) / totalChecksCount) * 100)))
			: 100;

	const criticalDefects = checks.filter((c) => c.status === "error");
	const clinicalRecommendations = checks.filter((c) => c.status === "warning");

	return {
		totalChecksCount,
		passedChecksCount,
		warningsCount,
		errorsCount,
		complianceScorePercent,
		overallStatus,
		checks,
		criticalDefects,
		clinicalRecommendations,
		verifiedStagesCount: stages.length,
		verifiedProceduresCount: allItems.length,
		validatedAtIso: new Date().toISOString(),
	};
}
