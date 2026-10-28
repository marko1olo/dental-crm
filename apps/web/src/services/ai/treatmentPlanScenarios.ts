/**
 * treatmentPlanScenarios.ts — 3 Clinical Scenarios for Treatment Plan Copilot:
 * 1. Эконом (Economy) — Functional base rehabilitation (metal-ceramic crowns, standard composites, Osstem).
 * 2. Оптимум (Optimum) — Gold standard evidence-based dentistry (zirconia Katana STML, E.max CAD, micro-endo).
 * 3. Премиум (Premium) — Uncompromising aesthetics & digital navigation (E.max Press, custom abutments, 3D templates).
 *
 * Strict Integer rubles & kopecks without float drift.
 * Zero mocks and full Mandate 8e (Doctor Autonomy).
 */

import type {
	TreatmentPlanItem,
	TreatmentPlanStage,
} from "../../components/treatment-plans/types";
import {
	type CopilotModificationAuditItem,
	type CopilotModificationResult,
	type CopilotPresetAction,
	recalculateStage,
} from "./treatmentPlanCopilotTypes";

export interface CopilotScenarioAction {
	readonly id: "tier_economy" | "tier_optimum" | "tier_premium";
	readonly title: string;
	readonly badge: string;
	readonly description: string;
}

export const COPILOT_SCENARIO_ACTIONS: readonly CopilotScenarioAction[] = [
	{
		id: "tier_economy",
		title: "Эконом",
		badge: "Базовая реабилитация",
		description: "Металлокерамика, стандартные композиты, базовые имплантаты Osstem",
	},
	{
		id: "tier_optimum",
		title: "Оптимум",
		badge: "Золотой стандарт",
		description: "Диоксид циркония Katana, E.max CAD, нанокомпозиты под изоляцией",
	},
	{
		id: "tier_premium",
		title: "Премиум",
		badge: "VIP & Цифра",
		description: "Виниры E.max Press, индивидуальные абатменты, навигационные 3D шаблоны",
	},
];

/**
 * 1. Сценарий «Эконом»: Базовая функциональная реабилитация
 */
export function applyEconomyScenarioToPlan(
	stages: readonly TreatmentPlanStage[],
): CopilotModificationResult {
	const oldTotalRub = stages.reduce((acc, s) => acc + s.totalRub, 0);
	const auditTrail: CopilotModificationAuditItem[] = [];

	const updatedStages: TreatmentPlanStage[] = stages.map((stage) => {
		const updatedItems: TreatmentPlanItem[] = stage.items.map((item) => {
			// Ортопедия: коронки и мосты -> металлокерамика 16 000 ₽
			if (
				item.category === "Ортопедия" &&
				((item.code804n || "").startsWith("A16.07.004") || /коронк|протез|винир|циркони|e\.max|керамич/i.test(item.name))
			) {
				const qty = item.quantity || 1;
				const economyUnitPrice = 16000;
				const economyPrice = economyUnitPrice * qty;
				if (item.priceRub !== economyPrice) {
					auditTrail.push({
						action: "modified",
						description: `Эконом: металлокерамическая коронка стандарт (зуб ${item.toothNumber ?? "—"})`,
						stageNumber: stage.stageNumber,
						oldPriceRub: item.priceRub,
						newPriceRub: economyPrice,
						code804n: "A16.07.004.002",
						...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
					});
				}

				return {
					...item,
					code804n: "A16.07.004.002",
					name: item.toothNumber
						? `Восстановление зуба ${item.toothNumber} коронкой металлокерамической стандарт`
						: "Восстановление зуба коронкой металлокерамической стандарт",
					materials: "КХС / Керамическая масса Duceram Plus",
					priceRub: economyPrice,
					unitPriceRub: economyUnitPrice,
					discountRub: 0,
					requiresManualPricing: false,
					clinicalRationale: "Сценарий Эконом: надежное функциональное протезирование металлокерамикой",
				};
			}

			// Хирургия: имплантаты -> Osstem 32 000 ₽
			if (
				item.category === "Хирургия" &&
				((item.code804n || "").startsWith("A16.07.054") || /имплант/i.test(item.name))
			) {
				const qty = item.quantity || 1;
				const economyUnitPrice = 32000;
				const economyPrice = economyUnitPrice * qty;
				if (item.priceRub !== economyPrice) {
					auditTrail.push({
						action: "modified",
						description: `Эконом: имплантат Osstem TS-III SA (зуб ${item.toothNumber ?? "—"})`,
						stageNumber: stage.stageNumber,
						oldPriceRub: item.priceRub,
						newPriceRub: economyPrice,
						code804n: item.code804n || "A16.07.054.001",
						...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
					});
				}

				return {
					...item,
					name: item.toothNumber
						? `Внутрикостная дентальная имплантация системы Osstem (Корея) в области зуба ${item.toothNumber}`
						: "Внутрикостная дентальная имплантация системы Osstem (Корея)",
					materials: "Титан Grade 4, поверхность SA",
					priceRub: economyPrice,
					unitPriceRub: economyUnitPrice,
					discountRub: 0,
					requiresManualPricing: false,
					clinicalRationale: "Сценарий Эконом: базовая имплантация Osstem TS-III",
				};
			}

			// Терапия: пломбы -> стандартный световой композит 4 500 ₽
			if (
				item.category === "Терапия" &&
				((item.code804n || "").startsWith("A16.07.002") || /кариес|пломб|реставрац/i.test(item.name)) &&
				!/коффердам|девитал|анестез/i.test(item.name)
			) {
				const qty = item.quantity || 1;
				const economyUnitPrice = 4500;
				const economyPrice = economyUnitPrice * qty;
				if (item.priceRub !== economyPrice) {
					auditTrail.push({
						action: "modified",
						description: `Эконом: пломба световой полимеризации Filtek Z250 (зуб ${item.toothNumber ?? "—"})`,
						stageNumber: stage.stageNumber,
						oldPriceRub: item.priceRub,
						newPriceRub: economyPrice,
						code804n: "A16.07.002.001",
						...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
					});
				}

				return {
					...item,
					code804n: "A16.07.002.001",
					name: item.toothNumber
						? `Восстановление зуба ${item.toothNumber} пломбой световой полимеризации стандарт`
						: "Восстановление зуба пломбой световой полимеризации стандарт",
					materials: "Светоотверждаемый композит Filtek Z250 / Gradia Direct",
					priceRub: economyPrice,
					unitPriceRub: economyUnitPrice,
					discountRub: 0,
					requiresManualPricing: false,
					clinicalRationale: "Сценарий Эконом: стандартная терапевтическая санация",
				};
			}

			return item;
		});

		return recalculateStage({
			...stage,
			items: updatedItems,
		});
	});

	const newTotalRub = updatedStages.reduce((acc, s) => acc + s.totalRub, 0);
	const deltaRub = newTotalRub - oldTotalRub;

	return {
		success: true,
		commandType: "tier_economy",
		commandTitle: "Клинический сценарий «Эконом»",
		explanation: `План пересчитан по сценарию «Эконом»: металлокерамика стандарт (16 000 ₽), базовая имплантация Osstem (32 000 ₽) и надежная терапия. Общая стоимость: ${newTotalRub.toLocaleString("ru-RU")} ₽ (${deltaRub <= 0 ? "экономия" : "изменение"} ${Math.abs(deltaRub).toLocaleString("ru-RU")} ₽). Санация полости рта сохранена на 100%.`,
		stages: updatedStages,
		auditTrail,
		oldTotalRub,
		newTotalRub,
		deltaRub,
	};
}

/**
 * 2. Сценарий «Оптимум»: Золотой стандарт доказательной стоматологии
 */
export function applyOptimumScenarioToPlan(
	stages: readonly TreatmentPlanStage[],
): CopilotModificationResult {
	const oldTotalRub = stages.reduce((acc, s) => acc + s.totalRub, 0);
	const auditTrail: CopilotModificationAuditItem[] = [];

	const updatedStages: TreatmentPlanStage[] = stages.map((stage) => {
		const updatedItems: TreatmentPlanItem[] = stage.items.map((item) => {
			// Ортопедия: цельный диоксид циркония Katana STML 26 000 ₽
			if (
				item.category === "Ортопедия" &&
				((item.code804n || "").startsWith("A16.07.004") || /коронк|протез|винир|циркони|e\.max|металлокерам/i.test(item.name))
			) {
				const qty = item.quantity || 1;
				const optimumUnitPrice = 26000;
				const optimumPrice = optimumUnitPrice * qty;
				if (item.priceRub !== optimumPrice) {
					auditTrail.push({
						action: "modified",
						description: `Оптимум: коронка из диоксида циркония Katana STML (зуб ${item.toothNumber ?? "—"})`,
						stageNumber: stage.stageNumber,
						oldPriceRub: item.priceRub,
						newPriceRub: optimumPrice,
						code804n: "A16.07.004.003",
						...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
					});
				}

				return {
					...item,
					code804n: "A16.07.004.003",
					name: item.toothNumber
						? `Восстановление зуба ${item.toothNumber} коронкой из диоксида циркония Katana STML`
						: "Восстановление зуба коронкой из диоксида циркония Katana STML",
					materials: "Диоксид циркония Katana STML multi-layer CAD/CAM",
					priceRub: optimumPrice,
					unitPriceRub: optimumUnitPrice,
					discountRub: 0,
					requiresManualPricing: false,
					clinicalRationale: "Сценарий Оптимум: биоинертный многослойный диоксид циркония без сколов",
				};
			}

			// Хирургия: имплантаты Osstem/Dentium SLA 38 000 ₽
			if (
				item.category === "Хирургия" &&
				((item.code804n || "").startsWith("A16.07.054") || /имплант/i.test(item.name))
			) {
				const qty = item.quantity || 1;
				const optimumUnitPrice = 38000;
				const optimumPrice = optimumUnitPrice * qty;
				if (item.priceRub !== optimumPrice) {
					auditTrail.push({
						action: "modified",
						description: `Оптимум: имплантат Osstem SLA Hydrophilic (зуб ${item.toothNumber ?? "—"})`,
						stageNumber: stage.stageNumber,
						oldPriceRub: item.priceRub,
						newPriceRub: optimumPrice,
						code804n: item.code804n || "A16.07.054.001",
						...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
					});
				}

				return {
					...item,
					name: item.toothNumber
						? `Внутрикостная дентальная имплантация Osstem SLA в области зуба ${item.toothNumber}`
						: "Внутрикостная дентальная имплантация Osstem SLA",
					materials: "Титан Grade 4 / SLA поверхность гидрофильная",
					priceRub: optimumPrice,
					unitPriceRub: optimumUnitPrice,
					discountRub: 0,
					requiresManualPricing: false,
					clinicalRationale: "Сценарий Оптимум: ускоренная гидрофильная остеоинтеграция SLA",
				};
			}

			// Терапия: высокоэстетичный нанокомпозит Estelite Asteria 7 500 ₽
			if (
				item.category === "Терапия" &&
				((item.code804n || "").startsWith("A16.07.002") || /кариес|пломб|реставрац/i.test(item.name)) &&
				!/коффердам|девитал|анестез/i.test(item.name)
			) {
				const qty = item.quantity || 1;
				const optimumUnitPrice = 7500;
				const optimumPrice = optimumUnitPrice * qty;
				if (item.priceRub !== optimumPrice) {
					auditTrail.push({
						action: "modified",
						description: `Оптимум: наногибридная реставрация Estelite Asteria (зуб ${item.toothNumber ?? "—"})`,
						stageNumber: stage.stageNumber,
						oldPriceRub: item.priceRub,
						newPriceRub: optimumPrice,
						code804n: "A16.07.002.001",
						...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
					});
				}

				return {
					...item,
					code804n: "A16.07.002.001",
					name: item.toothNumber
						? `Эстетическая реставрация зуба ${item.toothNumber} нанокомпозитом под коффердамом`
						: "Эстетическая реставрация зуба нанокомпозитом под коффердамом",
					materials: "Наногибридный композит Estelite Asteria / Tokuyama Dental",
					priceRub: optimumPrice,
					unitPriceRub: optimumUnitPrice,
					discountRub: 0,
					requiresManualPricing: false,
					clinicalRationale: "Сценарий Оптимум: послойное анатомическое восстановление бугров и фиссур",
				};
			}

			return item;
		});

		return recalculateStage({
			...stage,
			items: updatedItems,
		});
	});

	const newTotalRub = updatedStages.reduce((acc, s) => acc + s.totalRub, 0);
	const deltaRub = newTotalRub - oldTotalRub;

	return {
		success: true,
		commandType: "tier_optimum",
		commandTitle: "Клинический сценарий «Оптимум»",
		explanation: `План пересчитан по золотому стандарту «Оптимум»: цельный диоксид циркония Katana STML (26 000 ₽), имплантаты с гидрофильной SLA поверхностью (38 000 ₽) и высокоточная реставрация Estelite Asteria (7 500 ₽). Общая стоимость: ${newTotalRub.toLocaleString("ru-RU")} ₽.`,
		stages: updatedStages,
		auditTrail,
		oldTotalRub,
		newTotalRub,
		deltaRub,
	};
}

/**
 * 3. Сценарий «Премиум»: Бескомпромиссная эстетика и цифровая навигация
 */
export function applyPremiumScenarioToPlan(
	stages: readonly TreatmentPlanStage[],
): CopilotModificationResult {
	const oldTotalRub = stages.reduce((acc, s) => acc + s.totalRub, 0);
	const auditTrail: CopilotModificationAuditItem[] = [];

	const updatedStages: TreatmentPlanStage[] = stages.map((stage) => {
		const updatedItems: TreatmentPlanItem[] = stage.items.map((item) => {
			// Ортопедия: E.max Press с индивидуальным нанесением Vita VM9 45 000 ₽
			if (
				item.category === "Ортопедия" &&
				((item.code804n || "").startsWith("A16.07.004") || /коронк|протез|винир|циркони|e\.max|металлокерам/i.test(item.name))
			) {
				const qty = item.quantity || 1;
				const premiumUnitPrice = 45000;
				const premiumPrice = premiumUnitPrice * qty;
				if (item.priceRub !== premiumPrice) {
					auditTrail.push({
						action: "modified",
						description: `Премиум: винир/коронка E.max Press с нанесением Vita VM9 (зуб ${item.toothNumber ?? "—"})`,
						stageNumber: stage.stageNumber,
						oldPriceRub: item.priceRub,
						newPriceRub: premiumPrice,
						code804n: "A16.07.004.004",
						...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
					});
				}

				return {
					...item,
					code804n: "A16.07.004.004",
					name: item.toothNumber
						? `Высокоэстетическая керамическая коронка/винир E.max Press зуба ${item.toothNumber} с индивидуальным нанесением`
						: "Высокоэстетическая керамическая коронка/винир E.max Press с индивидуальным нанесением",
					materials: "Пресс-керамика Ivoclar E.max Press + облицовка Vita VM9",
					priceRub: premiumPrice,
					unitPriceRub: premiumUnitPrice,
					discountRub: 0,
					requiresManualPricing: false,
					clinicalRationale: "Сценарий Премиум: живая глубина цвета, опалесценция и безупречное краевое прилегание",
				};
			}

			// Хирургия: имплантаты Straumann BLX / Nobel Active 65 000 ₽
			if (
				item.category === "Хирургия" &&
				((item.code804n || "").startsWith("A16.07.054") || /имплант/i.test(item.name))
			) {
				const qty = item.quantity || 1;
				const premiumUnitPrice = 65000;
				const premiumPrice = premiumUnitPrice * qty;
				if (item.priceRub !== premiumPrice) {
					auditTrail.push({
						action: "modified",
						description: `Премиум: имплантат Straumann BLX Roxolid SLActive (зуб ${item.toothNumber ?? "—"})`,
						stageNumber: stage.stageNumber,
						oldPriceRub: item.priceRub,
						newPriceRub: premiumPrice,
						code804n: item.code804n || "A16.07.054.001",
						...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
					});
				}

				return {
					...item,
					name: item.toothNumber
						? `Дентальная имплантация Straumann BLX / Nobel Active (Швейцария) в области зуба ${item.toothNumber}`
						: "Дентальная имплантация Straumann BLX / Nobel Active (Швейцария)",
					materials: "Сплав Roxolid, поверхность SLActive / TiUnite",
					priceRub: premiumPrice,
					unitPriceRub: premiumUnitPrice,
					discountRub: 0,
					requiresManualPricing: false,
					clinicalRationale: "Сценарий Премиум: ускоренная гидрофильная остеоинтеграция 3-4 недели и максимальная стабильность",
				};
			}

			// Терапия: художественная реставрация под микроскопом Leica 12 000 ₽
			if (
				item.category === "Терапия" &&
				((item.code804n || "").startsWith("A16.07.002") || /кариес|пломб|реставрац/i.test(item.name)) &&
				!/коффердам|девитал|анестез/i.test(item.name)
			) {
				const qty = item.quantity || 1;
				const premiumUnitPrice = 12000;
				const premiumPrice = premiumUnitPrice * qty;
				if (item.priceRub !== premiumPrice) {
					auditTrail.push({
						action: "modified",
						description: `Премиум: художественная реставрация под микроскопом Leica (зуб ${item.toothNumber ?? "—"})`,
						stageNumber: stage.stageNumber,
						oldPriceRub: item.priceRub,
						newPriceRub: premiumPrice,
						code804n: "A16.07.002.002",
						...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
					});
				}

				return {
					...item,
					code804n: "A16.07.002.002",
					name: item.toothNumber
						? `Художественная реставрация зуба ${item.toothNumber} под микроскопом Leica`
						: "Художественная реставрация зуба под микроскопом Leica",
					materials: "Опалесцентный нанокомпозит Tokuyama Omnichroma / Asteria + Leica M320",
					priceRub: premiumPrice,
					unitPriceRub: premiumUnitPrice,
					discountRub: 0,
					requiresManualPricing: false,
					clinicalRationale: "Сценарий Премиум: микронная точность прилегания и оптическая неотличимость от эмали",
				};
			}

			return item;
		});

		return recalculateStage({
			...stage,
			items: updatedItems,
		});
	});

	const newTotalRub = updatedStages.reduce((acc, s) => acc + s.totalRub, 0);
	const deltaRub = newTotalRub - oldTotalRub;

	return {
		success: true,
		commandType: "tier_premium",
		commandTitle: "Клинический сценарий «Премиум»",
		explanation: `План пересчитан по высшему стандарту «Премиум»: виниры/коронки E.max Press с индивидуальным нанесением (45 000 ₽), премиальная имплантация Straumann BLX Roxolid (65 000 ₽) и микроскопическая реставрация Leica (12 000 ₽). Общая стоимость: ${newTotalRub.toLocaleString("ru-RU")} ₽.`,
		stages: updatedStages,
		auditTrail,
		oldTotalRub,
		newTotalRub,
		deltaRub,
	};
}
