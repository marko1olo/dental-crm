/**
 * clinicalValidator.ts — Deterministic Clinical Validator & Dental Protocol Compliance
 */

import type {
	TreatmentPlanAnatomicalCheck,
	TreatmentPlanValidationItem,
	TreatmentPlanValidationStage,
	StarComplianceStatus,
} from "@dental/shared";
import {
	getAnatomicalRootCanalCount,
	isDeciduousTooth,
} from "./anatomicalCanalBaseline.js";

export interface DeterministicClinicalValidationResult {
	overallStatus: StarComplianceStatus;
	complianceScorePercent: number;
	totalChecksCount: number;
	passedChecksCount: number;
	warningsCount: number;
	errorsCount: number;
	criticalWarnings: string[];
	clinicalRecommendations: string[];
	anatomicalChecks: TreatmentPlanAnatomicalCheck[];
}

export function runDeterministicClinicalValidation(
	stages: readonly TreatmentPlanValidationStage[],
): DeterministicClinicalValidationResult {
	const allItems: TreatmentPlanValidationItem[] = stages.flatMap((s) => s.items);
	const anatomicalChecks: TreatmentPlanAnatomicalCheck[] = [];
	const criticalWarnings: string[] = [];
	const clinicalRecommendations: string[] = [];

	const codesPresent = new Set(
		allItems.map((i) => (i.code804n || "").trim().toUpperCase()),
	);
	const hasCTDiagnostics =
		codesPresent.has("A06.07.004") ||
		codesPresent.has("A06.07.003") ||
		allItems.some((i) => /кт|томограф|панорам|ортопантомо/i.test(i.name));
	const hasHygiene =
		codesPresent.has("A16.07.050") ||
		codesPresent.has("A16.07.051") ||
		allItems.some((i) => /гигиен|чистк|air-flow|ультразвук/i.test(i.name));
	const hasSurgeryOrImplant =
		stages.some(
			(s) => s.stageNumber === 2 || s.stageKind?.includes("surgery"),
		) ||
		allItems.some(
			(i) =>
				i.category === "Хирургия" || /имплант|синус|костн.*пласт/i.test(i.name),
		);
	const hasOrthopedics =
		stages.some(
			(s) => s.stageNumber === 3 || s.stageKind?.includes("ortho"),
		) ||
		allItems.some(
			(i) =>
				i.category === "Ортопедия" ||
				/коронк|протез|винир|мостовид/i.test(i.name),
		);

	// 1. Diagnostics & Hygiene basic checks
	if (allItems.length > 0) {
		if (hasSurgeryOrImplant || hasOrthopedics) {
			if (!hasCTDiagnostics) {
				anatomicalChecks.push({
					rule: "STAR_CT_DIAGNOSTICS",
					status: "warning",
					message:
						"В плане отсутствует 3D КЛКТ томография челюстно-лицевой области (A06.07.004).",
					recommendation:
						"Рекомендуется включить 3D КЛКТ на 1-м этапе для точной оценки объема кости и анатомии каналов.",
					code804nRelated: ["A06.07.004"],
				});
				clinicalRecommendations.push(
					"Добавьте 3D КЛКТ диагностику перед хирургическим/ортопедическим этапом.",
				);
			}
			if (!hasHygiene) {
				anatomicalChecks.push({
					rule: "STAR_HYGIENE_PREPARATION",
					status: "warning",
					message:
						"В плане отсутствует комплексная профессиональная гигиена (A16.07.050 / A16.07.051).",
					recommendation:
						"Проведите санацию полости рта и устранение биопленки до начала инвазивных процедур.",
					code804nRelated: ["A16.07.050", "A16.07.051"],
				});
				clinicalRecommendations.push(
					"Включите профессиональную гигиену на 1-м этапе для предотвращения периимплантита и инфицирования.",
				);
			}
		}
	}

	// 2. Per-tooth anatomical & endo canal checks
	const itemsByTooth = new Map<number, TreatmentPlanValidationItem[]>();
	for (const item of allItems) {
		if (
			typeof item.toothNumber === "number" &&
			item.toothNumber >= 11 &&
			item.toothNumber <= 85
		) {
			const arr = itemsByTooth.get(item.toothNumber) || [];
			arr.push(item);
			itemsByTooth.set(item.toothNumber, arr);
		}
	}

	for (const [toothNum, toothItems] of itemsByTooth.entries()) {
		const expectedCanals = getAnatomicalRootCanalCount(toothNum);
		const isDeciduous = isDeciduousTooth(toothNum);
		const toothCodes = toothItems.map((i) =>
			(i.code804n || "").trim().toUpperCase(),
		);

		const endoPrepItem = toothItems.find(
			(i) =>
				i.code804n.startsWith("A16.07.030") ||
				/обработк.*канал/i.test(i.name),
		);
		const endoObtItem = toothItems.find(
			(i) =>
				i.code804n.startsWith("A16.07.008") ||
				/пломбирован.*канал|обтурац/i.test(i.name),
		);
		const hasEndo = Boolean(endoPrepItem || endoObtItem);

		// A) Canal count matching
		if (endoPrepItem && !isDeciduous) {
			const expectedPrepCode = `A16.07.030.00${expectedCanals}`;
			if (
				endoPrepItem.code804n.startsWith("A16.07.030") &&
				endoPrepItem.code804n !== expectedPrepCode
			) {
				anatomicalChecks.push({
					toothNumber: toothNum,
					rule: "FDI_ENDO_CANAL_PREPARATION_COUNT",
					status: "warning",
					message: `Зуб ${toothNum} анатомически имеет ${expectedCanals} кан., указан код обработки ${endoPrepItem.code804n}.`,
					recommendation: `Проверьте КЛКТ и скорректируйте код на ${expectedPrepCode} (${expectedCanals}-канальный зуб).`,
					code804nRelated: [endoPrepItem.code804n, expectedPrepCode],
				});
				clinicalRecommendations.push(
					`Зуб ${toothNum}: проверьте соответствие числа каналов (${expectedCanals} кан.) выбранной услуге.`,
				);
			}
		}

		if (endoObtItem && !isDeciduous) {
			const expectedObtCode = `A16.07.008.00${expectedCanals}`;
			if (
				endoObtItem.code804n.startsWith("A16.07.008") &&
				endoObtItem.code804n !== expectedObtCode
			) {
				anatomicalChecks.push({
					toothNumber: toothNum,
					rule: "FDI_ENDO_CANAL_OBTURATON_COUNT",
					status: "warning",
					message: `Зуб ${toothNum} анатомически имеет ${expectedCanals} кан., указан код обтурации ${endoObtItem.code804n}.`,
					recommendation: `Скорректируйте код пломбирования каналов на ${expectedObtCode}.`,
					code804nRelated: [endoObtItem.code804n, expectedObtCode],
				});
			}
		}

		// B) Devitalized tooth crown requirement (posterior teeth % 10 >= 4)
		if (hasEndo && !isDeciduous && toothNum % 10 >= 4) {
			const hasCrownOrOnlay = toothCodes.some(
				(c) =>
					c.startsWith("A16.07.004") ||
					c.startsWith("A16.07.003") ||
					c === "A16.07.005" ||
					toothItems.some((i) =>
						/коронк|вкладк|накладк|onlay|overlay/i.test(i.name),
					),
			);

			if (!hasCrownOrOnlay) {
				anatomicalChecks.push({
					toothNumber: toothNum,
					rule: "DEVITALIZED_POSTERIOR_CROWN_PROTECTION",
					status: "warning",
					message: `Депульпированный жевательный зуб ${toothNum} восстанавливается без ортопедической коронки или накладки (высокий риск перелома корня).`,
					recommendation: `По клиническим протоколам СтАР зуб ${toothNum} после эндодонтии подлежит защите коронкой из диоксида циркония (A16.07.004.001) или керамической вкладкой Onlay (A16.07.003).`,
					code804nRelated: ["A16.07.004.001", "A16.07.003"],
				});
				criticalWarnings.push(
					`Зуб ${toothNum}: жевательный зуб после депульпирования без коронки имеет критический риск раскола корня с последующим удалением.`,
				);
			}
		}

		// C) Implant intervals and bone volume
		const isImplant =
			toothCodes.some((c) => c.startsWith("A16.07.054")) ||
			toothItems.some((i) => /имплант/i.test(i.name));
		if (isImplant) {
			const isUpperJaw = toothNum >= 11 && toothNum <= 28;
			const healingWeeks = isUpperJaw
				? "16–24 недель (ВЧ)"
				: "8–12 недель (НЧ)";
			anatomicalChecks.push({
				toothNumber: toothNum,
				rule: "IMPLANT_HEALING_INTERVAL",
				status: "pass",
				message: `Имплантация в области зуба ${toothNum}: рекомендуемый интервал остеоинтеграции до постоянного протезирования составляет ${healingWeeks}.`,
				recommendation: isUpperJaw
					? "Контроль плотности кости D3/D4 и синус-лифтинга перед нагрузкой."
					: "Контроль плотности кости D1/D2 перед установкой формирователя десны.",
				code804nRelated: ["A16.07.054.001"],
			});
		}
	}

	// 3. Price catalog verification (Zero Mocks & Mandate 8e Doctor Autonomy)
	const unpricedItems = allItems.filter(
		(i) => i.requiresManualPricing === true || (i.priceRub || 0) <= 0,
	);
	if (unpricedItems.length > 0) {
		anatomicalChecks.push({
			rule: "PRICE_CATALOG_VERIFICATION",
			status: "warning",
			message: `В плане обнаружено ${unpricedItems.length} позиций без цены в каталоге клиники (${unpricedItems.map((u) => u.name).slice(0, 3).join(", ")}${unpricedItems.length > 3 ? "..." : ""}).`,
			recommendation:
				"Укажите актуальную стоимость из прайс-листа клиники вручную. Система не подставляет вымышленные цены (Мандат 8e).",
			code804nRelated: unpricedItems
				.map((u) => u.code804n)
				.filter(Boolean) as string[],
		});
		clinicalRecommendations.push(
			`Требуется уточнение стоимости ${unpricedItems.length} позиций в прайс-листе клиники.`,
		);
	}

	// 4. Overall compliance calculation
	const errorsCount = anatomicalChecks.filter((c) => c.status === "error").length;
	const warningsCount = anatomicalChecks.filter(
		(c) => c.status === "warning",
	).length;
	const passedChecksCount = anatomicalChecks.filter(
		(c) => c.status === "pass",
	).length;
	const totalChecksCount = Math.max(1, anatomicalChecks.length);

	let complianceScorePercent = 100;
	if (errorsCount > 0)
		complianceScorePercent = Math.max(
			20,
			100 - errorsCount * 25 - warningsCount * 10,
		);
	else if (warningsCount > 0)
		complianceScorePercent = Math.max(50, 100 - warningsCount * 12);

	let overallStatus: StarComplianceStatus = "FULL_COMPLIANCE";
	if (errorsCount > 0) overallStatus = "NON_COMPLIANT_DEFECTS";
	else if (warningsCount > 0) overallStatus = "COMPLIANT_WITH_RECOMMENDATIONS";

	return {
		overallStatus,
		complianceScorePercent,
		totalChecksCount,
		passedChecksCount,
		warningsCount,
		errorsCount,
		criticalWarnings,
		clinicalRecommendations,
		anatomicalChecks,
	};
}
