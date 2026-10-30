/**
 * treatmentPlansCatalogData.ts — Канонический каталог планов лечения и 3-уровневых смет (SSOT).
 * Мандаты 8b, 8zi: Целевой размер 200–250 строк (Sweet Spot).
 * Мандат 8e: Автономия врача — свобода скидок до 100%, авто-скрытие микро-расходников,
 *            истечение срока 30 дней НЕ блокирует приём оплат и оказание услуг.
 * Мандат 8x: Чистый клинический язык — вместо «804н» -> «Каталог процедур» / «Прейскурант услуг».
 */

import type { TreatmentPlanStage, TreatmentPlanTier, TreatmentPlanTierId } from "./treatmentPlanTypes";
import { isMicroConsumable } from "./treatmentPlanConsumables";

export interface TreatmentTierDefinition {
	readonly id: TreatmentPlanTierId;
	readonly title: string;
	readonly subtitle: string;
	readonly badge: string;
	readonly isRecommended: boolean;
	readonly warrantyYears: number;
	readonly keyAdvantages: readonly string[];
	readonly totalRub: number;
	readonly totalKopecks: number;
}

export const CANONICAL_TIER_DEFINITIONS: readonly TreatmentTierDefinition[] = [
	{
		id: "economy",
		title: "Эконом",
		subtitle: "Базовые надежные материалы: световая полимеризация и стандартное протезирование",
		badge: "Базовый",
		isRecommended: false,
		warrantyYears: 1,
		keyAdvantages: [
			"Качественные композитные материалы",
			"Санация очагов кариеса",
			"Базовый гарантийный срок 1 год",
		],
		totalRub: 24500,
		totalKopecks: 2450000,
	},
	{
		id: "optimum",
		title: "★ Оптимум",
		subtitle: "Золотой стандарт клиники: наногибридный композит, микроскоп и диоксид циркония",
		badge: "Рекомендуемый",
		isRecommended: true,
		warrantyYears: 3,
		keyAdvantages: [
			"Эндодонтия под операционным микроскопом",
			"Наногибридные реставрации Filtek / Estelite",
			"Коронки из диоксида циркония CAD/CAM",
			"Дентальные имплантаты Dentium / Osstem",
			"Расширенная гарантия клиники 3 года",
		],
		totalRub: 98000,
		totalKopecks: 9800000,
	},
	{
		id: "premium",
		title: "Премиум",
		subtitle: "Бескомпромиссная эстетика: швейцарские импланты Straumann и керамика IPS e.max",
		badge: "Премиум",
		isRecommended: false,
		warrantyYears: 10,
		keyAdvantages: [
			"Имплантационная система Straumann SLA Active",
			"Безметалловая ультратонкая керамика IPS e.max",
			"Цифровой дизайн улыбки (Digital Smile Design)",
			"Персональный клинический куратор и консилиум",
			"Пожизненная гарантия производителя на импланты",
		],
		totalRub: 175000,
		totalKopecks: 17500000,
	},
];

export const CANONICAL_CLINICAL_STAGES: readonly TreatmentPlanStage[] = [
	{
		id: "stage-1-therapy",
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Терапевтическая санация и купирование воспаления",
		subtitle: "Профессиональная гигиена и устранение кариозных поражений",
		clinicalGoal: "Ликвидация инфекционных очагов и подготовка пародонта к протезированию",
		totalRub: 16500,
		totalKopecks: 1650000,
		estimatedVisits: 2,
		estimatedWeeks: 1,
		status: "draft",
		items: [
			{
				id: "proc-1-1",
				toothNumber: 16,
				code804n: "A16.07.002",
				name: "Восстановление зуба пломбой с нарушением контактного пункта (кариес дентина)",
				priceRub: 5500,
				unitPriceRub: 5500,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_1_therapy",
				isCompleted: false,
			},
			{
				id: "proc-1-2",
				toothNumber: 26,
				code804n: "A16.07.030",
				name: "Инструментальная и медикаментозная обработка корневого канала под микроскопом",
				priceRub: 6500,
				unitPriceRub: 6500,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_1_therapy",
				isCompleted: false,
			},
			{
				id: "proc-1-3",
				code804n: "A16.07.051",
				name: "Комплексная профессиональная гигиена полости рта (Air-Flow + ультразвук)",
				priceRub: 4500,
				unitPriceRub: 4500,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_1_therapy",
				isCompleted: false,
			},
		],
	},
	{
		id: "stage-2-surgery",
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		title: "Этап 2: Хирургический этап и дентальная имплантация",
		subtitle: "Установка дентального имплантата в позиции отсутствующего зуба",
		clinicalGoal: "Восстановление утраченной костной опоры без препарирования соседних зубов",
		totalRub: 48000,
		totalKopecks: 4800000,
		estimatedVisits: 1,
		estimatedWeeks: 12,
		status: "draft",
		items: [
			{
				id: "proc-2-1",
				toothNumber: 36,
				code804n: "A16.07.054",
				name: "Установка дентального имплантата с гидрофильной поверхностью SLA",
				priceRub: 48000,
				unitPriceRub: 48000,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_2_surgery",
				isCompleted: false,
			},
		],
	},
	{
		id: "stage-3-orthopedics",
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle: "Индивидуальный титановый абатмент и коронка из диоксида циркония",
		clinicalGoal: "Восстановление окклюзии, анатомического экватора и жевательной эффективности",
		totalRub: 33500,
		totalKopecks: 3350000,
		estimatedVisits: 2,
		estimatedWeeks: 2,
		status: "draft",
		items: [
			{
				id: "proc-3-1",
				toothNumber: 36,
				code804n: "A16.07.004",
				name: "Установка коронки из диоксида циркония на индивидуальном абатменте CAD/CAM",
				priceRub: 33500,
				unitPriceRub: 33500,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_3_orthopedics",
				isCompleted: false,
			},
		],
	},
];

/**
 * Фильтрация копеечных микро-расходников (Мандат 8e):
 * Пациент видит только чистые клинические номенклатурные услуги.
 * Расходные материалы (валики, салфетки, карпулы) списываются пакетом в бэке (Soft Negative Stock).
 */
export function sanitizePatientPresentationStages(
	stages: readonly TreatmentPlanStage[],
): readonly TreatmentPlanStage[] {
	return stages.map((stage) => {
		const cleanItems = stage.items.filter((item) => !isMicroConsumable(item));
		return {
			...stage,
			items: cleanItems.length > 0 ? cleanItems : stage.items,
		};
	});
}

/**
 * Проверка срока действия плана (30 дней):
 * Истечение срока НЕ блокирует приём оплат и оказание помощи врачом (Мандат 8e).
 */
export function isTreatmentPlanExpired(createdAtIso?: string): {
	readonly isExpired: boolean;
	readonly daysElapsed: number;
	readonly warningNotice?: string;
} {
	if (!createdAtIso) return { isExpired: false, daysElapsed: 0 };
	const created = new Date(createdAtIso).getTime();
	if (Number.isNaN(created)) return { isExpired: false, daysElapsed: 0 };
	const now = Date.now();
	const daysElapsed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
	const isExpired = daysElapsed > 30;

	return {
		isExpired,
		daysElapsed,
		warningNotice: isExpired
			? `Срок актуальности предварительной сметы (30 дней) истёк ${daysElapsed - 30} дн. назад. Врач сохраняет право согласовать продолжение лечения без изменения цен.`
			: undefined,
	};
}

/**
 * Генерация 3 канонических тарифов планов лечения по образцу клинических данных.
 */
export function buildCanonical3TierPlans(baseStages = CANONICAL_CLINICAL_STAGES): readonly TreatmentPlanTier[] {
	const sanitized = sanitizePatientPresentationStages(baseStages);

	return CANONICAL_TIER_DEFINITIONS.map((def) => {
		const multiplier = def.id === "economy" ? 0.75 : def.id === "optimum" ? 1.0 : 1.45;
		const tierStages = sanitized.map((stg) => {
			const sRub = Math.round(stg.totalRub * multiplier);
			return {
				...stg,
				totalRub: sRub,
				totalKopecks: sRub * 100,
				items: stg.items.map((it) => ({
					...it,
					priceRub: Math.round(it.priceRub * multiplier),
					unitPriceRub: typeof it.unitPriceRub === "number" ? Math.round(it.unitPriceRub * multiplier) : undefined,
				})),
			};
		});

		const totalRub = tierStages.reduce((sum, s) => sum + s.totalRub, 0);

		return {
			tierId: def.id,
			title: def.title,
			subtitle: def.subtitle,
			badge: def.badge,
			isRecommended: def.isRecommended,
			totalRub,
			totalKopecks: totalRub * 100,
			warrantyYears: def.warrantyYears,
			keyAdvantages: def.keyAdvantages,
			stages: tierStages,
		};
	});
}
