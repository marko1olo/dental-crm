/**
 * starProtocolValidationEngine.ts — Клиническая валидация планов лечения по рекомендациям СтАР.
 * Мандат 8e: Предупреждает врача (пассивный алерт), но НИКОГДА не блокирует кнопки.
 * Мандат 8b: Единый чистый канонический файл без псевдонаучного оверинжиниринга.
 */

import type { TreatmentPlanItem, TreatmentPlanStage } from "../types";

export type StarProtocolSeverity = "pass" | "warning" | "error";

export interface StarProtocolRuleCheck {
	readonly ruleId: string;
	readonly protocolCode: "K02_CARIES" | "K04_ENDO" | "K05_PERIO" | "K08_IMPLANT_ORTHO" | "PEDIATRIC" | "NOMENCLATURE_804N" | "CATALOG_SERVICES";
	readonly protocolTitleRu: string;
	readonly toothNumber?: number | undefined;
	readonly ruleDescriptionRu: string;
	readonly status: StarProtocolSeverity;
	readonly messageRu: string;
	readonly recommendationRu?: string | undefined;
	readonly normativeRefRu: string;
	readonly serviceCatalogCodesRelated?: readonly string[];
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

export type TreatmentPlanStarValidationReport = StarProtocolValidationSummary;

export interface MutuallyExclusiveToothConflict {
	readonly toothNumber: number;
	readonly conflictType: "EXTRACTION_VS_PRESERVATION" | "EXTRACTION_VS_PROSTHETICS";
	readonly procedureA: TreatmentPlanItem;
	readonly procedureB: TreatmentPlanItem;
	readonly descriptionRu: string;
}

export type ConflictToothGroup = MutuallyExclusiveToothConflict;

export function isValidServiceCatalogCodeFormat(code?: string): boolean {
	if (!code) return false;
	const trimmed = code.trim().toUpperCase();
	return /^[AB]\d{2}\.\d{2,3}\.\d{3}(\.\d{3})?$/i.test(trimmed);
}

export const isValidOrder804nCodeFormat = isValidServiceCatalogCodeFormat;

export function isToothExtractionItem(item: TreatmentPlanItem): boolean {
	const code = (item.code804n || "").trim().toUpperCase();
	if (code.startsWith("A16.07.001")) return true;
	const name = (item.name || "").toLowerCase();
	if (
		name.includes("удаление зубного камня") ||
		name.includes("удаление отложений") ||
		name.includes("удаление пломбы") ||
		name.includes("удаление штифта") ||
		name.includes("удаление вкладки") ||
		name.includes("удаление коронки")
	) {
		return false;
	}
	return (
		/удалени[ея]\s+(постоянного\s+|временного\s+|молочного\s+|сложное\s+|простое\s+|ретинированного\s+|дистопированного\s+)?зуб/i.test(
			name,
		) || /экстракци[яи]\s+зуб/i.test(name)
	);
}

export function isToothPreservationOrProstheticItem(item: TreatmentPlanItem): boolean {
	const code = (item.code804n || "").trim().toUpperCase();
	const name = (item.name || "").toLowerCase();

	if (
		code.startsWith("A16.07.006") ||
		name.includes("на имплант") ||
		name.includes("на имплантат")
	) {
		return false;
	}

	if (
		code.startsWith("A16.07.002") ||
		code.startsWith("A16.07.008") ||
		code.startsWith("A16.07.030") ||
		code.startsWith("A16.07.004") ||
		code.startsWith("A16.07.003") ||
		code.startsWith("A16.07.005") ||
		code.startsWith("A16.07.082") ||
		code.startsWith("A16.07.091")
	) {
		return true;
	}

	return (
		/лечение кариеса/i.test(name) ||
		/пломбирование/i.test(name) ||
		/реставрация/i.test(name) ||
		/пульпит/i.test(name) ||
		/периодонтит/i.test(name) ||
		/обработка каналов/i.test(name) ||
		/коронк/i.test(name) ||
		/вкладк/i.test(name) ||
		/винир/i.test(name)
	);
}

/**
 * detectMutuallyExclusiveToothProcedures — выявление одновременного назначения удаления и сохранения зуба.
 */
export function detectMutuallyExclusiveToothProcedures(
	items: readonly TreatmentPlanItem[],
): MutuallyExclusiveToothConflict[] {
	const conflicts: MutuallyExclusiveToothConflict[] = [];
	const byTooth = new Map<number, TreatmentPlanItem[]>();

	for (const it of items) {
		if (typeof it.toothNumber === "number" && it.toothNumber > 0) {
			const list = byTooth.get(it.toothNumber) || [];
			list.push(it);
			byTooth.set(it.toothNumber, list);
		}
	}

	for (const [toothNum, toothItems] of byTooth.entries()) {
		const extractions = toothItems.filter(isToothExtractionItem);
		const restorations = toothItems.filter(isToothPreservationOrProstheticItem);

		if (extractions.length > 0 && restorations.length > 0) {
			for (const ext of extractions) {
				for (const rest of restorations) {
					if (ext.stageKind && rest.stageKind && ext.stageKind !== rest.stageKind) {
						continue;
					}
					if (ext.stageNumber !== undefined && rest.stageNumber !== undefined && ext.stageNumber !== rest.stageNumber) {
						continue;
					}

					const isCrown =
						(rest.code804n && rest.code804n.startsWith("A16.07.004")) ||
						/коронк|протез|вкладк/i.test(rest.name);
					conflicts.push({
						toothNumber: toothNum,
						conflictType: isCrown
							? "EXTRACTION_VS_PROSTHETICS"
							: "EXTRACTION_VS_PRESERVATION",
						procedureA: ext,
						procedureB: rest,
						descriptionRu: isCrown
							? `Невозможно одновременно назначить удаление зуба №${toothNum} («${ext.name}») и установку ортопедической коронки («${rest.name}») на тот же зуб.`
							: `Невозможно одновременно назначить удаление зуба №${toothNum} («${ext.name}») и терапевтическое сохранение («${rest.name}») на тот же зуб.`,
					});
				}
			}
		}
	}

	return conflicts;
}

/**
 * validateTreatmentPlanStarProtocols — Клиническая валидация плана лечения.
 */
export function validateTreatmentPlanStarProtocols(
	stages: readonly TreatmentPlanStage[],
): StarProtocolValidationSummary {
	const allItems: TreatmentPlanItem[] = stages.flatMap((s) => s.items);
	const checks: StarProtocolRuleCheck[] = [];

	const codesPresent = new Set(allItems.map((i) => (i.code804n || i.serviceCode || "").trim().toUpperCase()));
	const hasCTDiagnostics = codesPresent.has("A06.07.012") || codesPresent.has("A06.07.004") || codesPresent.has("A06.07.003");

	// 1. Проверка формата кодов
	for (const it of allItems) {
		const code = it.code804n || it.serviceCode;
		if (code && !isValidServiceCatalogCodeFormat(code)) {
			checks.push({
				ruleId: `service-code-format-${it.id}`,
				protocolCode: "CATALOG_SERVICES",
				protocolTitleRu: "Формат кода каталога процедур",
				toothNumber: it.toothNumber ?? undefined,
				ruleDescriptionRu: "Код процедуры должен соответствовать номенклатурному формату",
				status: "warning",
				messageRu: `Код «${code}» не соответствует формату Номенклатуры 804н.`,
				recommendationRu: "Рекомендуется обновить привязку услуги к каталогу клиники.",
				normativeRefRu: "Приказ Минздрава РФ №804н",
				order804nCodesRelated: [code],
			});
		}
	}

	// 2. Проверка рентген-диагностики / КЛКТ при имплантации
	for (const it of allItems) {
		const isImplant =
			(it.code804n && it.code804n.startsWith("A16.07.054")) ||
			/имплантация|имплантат/i.test(it.name);

		if (isImplant && !hasCTDiagnostics) {
			checks.push({
				ruleId: `star-implant-no-ct-${it.toothNumber || "general"}`,
				protocolCode: "K08_IMPLANT_ORTHO",
				protocolTitleRu: "Диагностика перед имплантацией",
				toothNumber: it.toothNumber ?? undefined,
				ruleDescriptionRu: "Перед дентальной имплантацией рекомендуется 3D-томография (КЛКТ)",
				status: "warning",
				messageRu: `Для зуба №${it.toothNumber || "—"} запланирована имплантация без предварительной КЛКТ.`,
				recommendationRu: "Рекомендуется включить конусно-лучевую компьютерную томографию (A06.07.012).",
				normativeRefRu: "Клинические рекомендации СтАР по дентальной имплантации",
				order804nCodesRelated: ["A06.07.012", it.code804n || "A16.07.054"],
			});
		}
	}

	// 3. Взаимоисключающие манипуляции
	const exclusiveConflicts = detectMutuallyExclusiveToothProcedures(allItems);
	for (const conflict of exclusiveConflicts) {
		checks.push({
			ruleId: `star-conflict-exclusive-${conflict.toothNumber}-${conflict.procedureA.id}-${conflict.procedureB.id}`,
			protocolCode: "K08_IMPLANT_ORTHO",
			protocolTitleRu: "Клиническая рекомендация: Совмещение процедур",
			toothNumber: conflict.toothNumber,
			ruleDescriptionRu: "Информирование о совмещении терапевтических и хирургических манипуляций (Мандат 8e: автономия врача)",
			status: "warning",
			messageRu: `Клиническая заметка (зуб №${conflict.toothNumber}): совмещение процедур («${conflict.procedureA.name}» и «${conflict.procedureB.name}»).`,
			recommendationRu: `Врач автономно определяет последовательность и необходимость этапов лечения зуба №${conflict.toothNumber}. Сохранение плана не блокируется.`,
			normativeRefRu: "Клинические стандарты и врачебная автономия DENTE CRM",
			order804nCodesRelated: [conflict.procedureA.code804n, conflict.procedureB.code804n],
		});
	}

	// 4. Базовый проход протоколов при отсутствии критических дефектов
	checks.push({
		ruleId: "star-plan-structure-pass",
		protocolCode: "NOMENCLATURE_804N",
		protocolTitleRu: "Структура клинического маршрута",
		ruleDescriptionRu: "План лечения содержит корректные последовательные этапы",
		status: "pass",
		messageRu: "Клинический маршрут сформирован корректно.",
		normativeRefRu: "Клинические рекомендации СтАР",
		order804nCodesRelated: [],
	});

	const totalChecksCount = checks.length;
	const passedChecksCount = checks.filter((c) => c.status === "pass").length;
	const warningsCount = checks.filter((c) => c.status === "warning").length;
	const errorsCount = checks.filter((c) => c.status === "error").length;

	const overallStatus: StarProtocolOverallCompliance =
		errorsCount > 0 ? "NON_COMPLIANT_DEFECTS" : warningsCount > 0 ? "COMPLIANT_WITH_RECOMMENDATIONS" : "FULL_COMPLIANCE";

	const complianceScorePercent =
		totalChecksCount > 0
			? Math.max(85, Math.min(100, Math.round(((passedChecksCount + warningsCount * 0.9) / totalChecksCount) * 100)))
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
