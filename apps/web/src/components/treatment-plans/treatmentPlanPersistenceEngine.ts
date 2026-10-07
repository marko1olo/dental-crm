/**
 * treatmentPlanPersistenceEngine.ts — движок гидратации и персистенции планов лечения DENTE CRM.
 *
 * Преобразует плоские записи процедур (PostgreSQL 18 `treatment_plan_items`)
 * в структурированные клинические этапы (TreatmentPlanStage[]) с расчетом копеечных
 * итогов (Мандат 8k) и привязкой к номенклатуре Минздрава РФ № 804н.
 */

import { type Kopecks } from "@dental/shared";
import {
	type TreatmentPlanItem,
	type TreatmentPlanStage,
	type TreatmentPlanStageKind,
	romanizeStageNumber,
} from "./types";
import type { CatalogServiceLookupItem } from "./treatmentPlanPricingEngine";

/**
 * Восстановление структурированных этапов плана лечения из плоских записей БД (treatment_plan_items).
 */
export function buildStagesFromPlanItems(
	rawItems: readonly any[],
	catalog?: readonly CatalogServiceLookupItem[],
): TreatmentPlanStage[] {
	if (!Array.isArray(rawItems) || rawItems.length === 0) {
		return [];
	}

	// Группируем элементы по номеру фазы/этапа (phase: 1, 2, 3, 4, 5...)
	const phaseGroups = new Map<number, any[]>();
	for (const raw of rawItems) {
		const phase = Math.max(1, Number(raw.phase) || 1);
		const list = phaseGroups.get(phase) || [];
		list.push(raw);
		phaseGroups.set(phase, list);
	}

	const sortedPhases = Array.from(phaseGroups.keys()).sort((a, b) => a - b);
	const stages: TreatmentPlanStage[] = [];

	for (const phaseNumber of sortedPhases) {
		const phaseItemsRaw = phaseGroups.get(phaseNumber) || [];

		const mappedItems: TreatmentPlanItem[] = phaseItemsRaw.map((raw, idx) => {
			const rawPriceId = String(raw.priceId || raw.code804n || "");
			const [cleanCode, explicitName] = rawPriceId.includes("::")
				? rawPriceId.split("::")
				: [rawPriceId, raw.name || ""];

			const code804n = cleanCode || raw.code804n || "A16.07.001";
			const name =
				raw.name ||
				explicitName ||
				catalog?.find((c) => c.id === raw.priceId || c.order804nCode === code804n)?.title ||
				"Медицинская услуга";

			const unitPriceRub = Number(raw.price ?? raw.unitPriceRub ?? 0);
			const quantity = Math.max(1, Number(raw.quantity) || 1);
			const discountRub = Number(raw.discount ?? raw.discountRub ?? 0);
			const toothNumber = raw.toothNumber ? Number(raw.toothNumber) : undefined;

			// Определение категории и stageKind по номенклатуре и названию
			const lowerName = name.toLowerCase();
			let category = "Терапия";
			let stageKind: TreatmentPlanStageKind = "stage_1_therapy";

			if (
				lowerName.includes("ортодонт") ||
				lowerName.includes("брекет") ||
				lowerName.includes("элайнер") ||
				code804n.startsWith("A16.07.04")
			) {
				category = "Ортодонтия";
				stageKind = "stage_4_orthodontics";
			} else if (
				lowerName.includes("пародонт") ||
				lowerName.includes("вектор") ||
				lowerName.includes("кюретаж") ||
				lowerName.includes("десн") ||
				code804n.startsWith("A16.07.039")
			) {
				category = "Пародонтология";
				stageKind = "stage_5_periodontics";
			} else if (
				lowerName.includes("коронк") ||
				lowerName.includes("протез") ||
				lowerName.includes("мост") ||
				lowerName.includes("вкладк") ||
				lowerName.includes("абатмент") ||
				code804n.startsWith("A16.07.004")
			) {
				category = "Ортопедия";
				stageKind = "stage_3_orthopedics";
			} else if (
				lowerName.includes("удал") ||
				lowerName.includes("имплант") ||
				lowerName.includes("синус") ||
				lowerName.includes("костн") ||
				code804n.startsWith("A16.07.001") ||
				code804n.startsWith("A16.07.006") ||
				code804n.startsWith("A16.07.054")
			) {
				category = "Хирургия";
				stageKind = "stage_2_surgery";
			} else if (phaseNumber === 2) {
				category = "Хирургия";
				stageKind = "stage_2_surgery";
			} else if (phaseNumber === 3) {
				category = "Ортопедия";
				stageKind = "stage_3_orthopedics";
			} else if (phaseNumber === 4) {
				category = "Ортодонтия";
				stageKind = "stage_4_orthodontics";
			} else if (phaseNumber === 5) {
				category = "Пародонтология";
				stageKind = "stage_5_periodontics";
			}

			const lineGrossKopecks = Math.round(unitPriceRub * quantity * 100);
			const lineDiscKopecks = Math.round(discountRub * 100);
			const netKopecks = Math.max(0, lineGrossKopecks - lineDiscKopecks);
			const netRub = netKopecks / 100;

			const isCompleted = Boolean(
				raw.isCompleted ||
				raw.status === "completed" ||
				raw.planStatus === "completed",
			);

			return {
				id: String(raw.id || `item_${phaseNumber}_${idx}_${Date.now()}`),
				toothNumber,
				code804n,
				name,
				category,
				priceRub: netRub,
				unitPriceRub,
				discountRub,
				quantity,
				phase: phaseNumber,
				stageKind,
				priceId: cleanCode,
				fromCatalog: true,
				isAuto: Boolean(raw.isAuto),
				doctorId: raw.doctorId ?? null,
				doctorName: raw.doctorName ?? null,
				doctorSpecialty: raw.doctorSpecialty ?? null,
				isCompleted,
				status: isCompleted ? "completed" : (raw.status || "planned"),
				visitId: raw.visitId ?? null,
				completedAtIso: raw.completedAtIso ?? raw.updatedAt ?? null,
			};
		});

		// Метаданные этапа
		let stageKind: TreatmentPlanStageKind = "stage_1_therapy";
		let title = `Этап ${romanizeStageNumber(phaseNumber)}: Терапевтическая санация`;
		let subtitle = "Купирование очагов воспаления, лечение кариеса и эндодонтия";
		let clinicalGoal = "Полная санация полости рта и подготовка к последующим этапам";

		if (phaseNumber === 2) {
			stageKind = "stage_2_surgery";
			title = "Этап II: Хирургия и дентальная имплантация";
			subtitle = "Удаление несостоятельных зубов, пластика кости и установка имплантатов";
			clinicalGoal = "Восстановление костной опоры и подготовка к протезированию";
		} else if (phaseNumber === 3) {
			stageKind = "stage_3_orthopedics";
			title = "Этап III: Ортопедическая реабилитация";
			subtitle = "Прецизионные коронки, мостовидные протезы и функциональная окклюзия";
			clinicalGoal = "Полное восстановление жевательной эффективности и эстетики";
		} else if (phaseNumber === 4) {
			stageKind = "stage_4_orthodontics";
			title = "Этап IV: Ортодонтическое лечение";
			subtitle = "Нормализация окклюзии, исправление прикуса и положения зубов";
			clinicalGoal = "Формирование стабильного физиологического прикуса";
		} else if (phaseNumber === 5) {
			stageKind = "stage_5_periodontics";
			title = "Этап V: Пародонтология и профилактика";
			subtitle = "Вектор-терапия, кюретаж, стабилизация десны и поддерживающий протокол";
			clinicalGoal = "Ликвидация пародонтальных карманов и защита от рецидивов";
		} else if (phaseNumber > 5) {
			stageKind = "stage_custom";
			title = `Этап ${romanizeStageNumber(phaseNumber)}: Клинический этап`;
			subtitle = "Специализированные процедуры по индивидуальному плану";
			clinicalGoal = "Достижение согласованного клинического результата";
		}

		// Расчёт финансовых итогов в целых копейках (Мандат 8k)
		const totalKopecks = mappedItems.reduce((acc, it) => {
			const gross = Math.round(it.unitPriceRub * it.quantity * 100);
			const disc = Math.round(it.discountRub * 100);
			return (acc + Math.max(0, gross - disc)) as Kopecks;
		}, 0 as Kopecks);
		const totalRub = totalKopecks / 100;

		const order804nCodes = Array.from(new Set(mappedItems.map((it) => it.code804n)));

		const stageDoctor = mappedItems.find((it) => it.doctorId);

		const hasAllCompleted =
			mappedItems.length > 0 && mappedItems.every((it) => it.isCompleted);
		const hasSomeCompleted = mappedItems.some((it) => it.isCompleted);
		const stageStatus = hasAllCompleted
			? "completed"
			: hasSomeCompleted
				? "in_progress"
				: "agreed";

		stages.push({
			stageNumber: phaseNumber,
			stageKind,
			title,
			subtitle,
			clinicalGoal,
			items: mappedItems,
			totalRub,
			totalKopecks,
			estimatedVisits: Math.max(1, Math.ceil(mappedItems.length / 2)),
			estimatedWeeks: phaseNumber === 2 ? 12 : phaseNumber === 3 ? 4 : 2,
			order804nCodes,
			status: stageStatus,
			doctorId: stageDoctor?.doctorId ?? null,
			doctorName: stageDoctor?.doctorName ?? null,
			doctorSpecialty: stageDoctor?.doctorSpecialty ?? null,
		});
	}

	return stages;
}
