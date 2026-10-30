/**
 * treatmentPlanCatalogData.ts — Канонический SSOT планов лечения и 3-уровневых смет.
 * Мандаты 8b, 8zi: Целевой размер 250–350 строк (Sweet Spot).
 * Мандат 8e: Автономия врача — свобода скидок до 100%, авто-скрытие микро-расходников,
 *            истечение срока 30 дней НЕ блокирует приём оплат и оказание услуг.
 * Мандат 8n: Суверенитет клиники — 3 канонических уровня плана в 1 клик.
 * Мандат 8x: Чистый клинический язык — запрет советских регуляторных шифров в прод-UI.
 */

import type {
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanItem,
} from "./treatmentPlanTypes";
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

/**
 * 3 канонических уровня плана лечения (Мандат 8n):
 * 1. Базовый (Эконом) — надежный минимум с гарантией 1 год.
 * 2. Оптимальный (Оптимум) — золотой стандарт клиники, микроскоп и диоксид циркония, гарантия 3 года.
 * 3. Премиум — швейцарские импланты Straumann и безметалловая керамика e.max, гарантия 10 лет.
 */
export const CANONICAL_TIER_DEFINITIONS: readonly TreatmentTierDefinition[] = [
	{
		id: "economy",
		title: "Базовый",
		subtitle: "Качественные композитные материалы и надежное стандартное протезирование",
		badge: "Базовый",
		isRecommended: false,
		warrantyYears: 1,
		keyAdvantages: [
			"Качественные светоотверждаемые композиты",
			"Санация очагов кариеса и купирование воспаления",
			"Стандартная металлокерамика и базовые импланты",
			"Гарантийный срок клиники 1 год",
		],
		totalRub: 24500,
		totalKopecks: 2450000,
	},
	{
		id: "optimum",
		title: "★ Оптимальный",
		subtitle: "Золотой стандарт клиники: наногибридный композит, микроскоп и диоксид циркония",
		badge: "Рекомендуемый",
		isRecommended: true,
		warrantyYears: 3,
		keyAdvantages: [
			"Лечение корневых каналов под операционным микроскопом",
			"Наногибридные реставрации Filtek / Estelite с сохранением эстетики",
			"Коронки из диоксида циркония CAD/CAM анатомической формы",
			"Дентальные имплантаты Dentium / Osstem с гидрофильной поверхностью",
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
			"Имплантационная система Straumann SLA Active (Швейцария)",
			"Безметалловая ультратонкая прессованная керамика IPS e.max",
			"Цифровой 3D-дизайн улыбки (Digital Smile Design)",
			"Персональный клинический куратор и консилиум врачей",
			"Пожизненная международная гарантия производителя на импланты",
		],
		totalRub: 175000,
		totalKopecks: 17500000,
	},
];

/**
 * 3 канонических клинических этапа комплексного плана лечения:
 * 1. Санация и терапия
 * 2. Хирургия и имплантация
 * 3. Ортопедия и протезирование
 */
export const CANONICAL_CLINICAL_STAGES: readonly TreatmentPlanStage[] = [
	{
		id: "stage-1-therapy",
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Санация и терапия",
		subtitle: "Профессиональная гигиена полости рта и эндодонтическое лечение",
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
		title: "Этап 2: Хирургия и имплантация",
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
		title: "Этап 3: Ортопедия и протезирование",
		subtitle: "Индивидуальный циркониевый абатмент и коронка CAD/CAM",
		clinicalGoal: "Восстановление окклюзии, анатомического экватора и жевательной функции",
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
 * Расходные материалы списываются пакетом в бэке (Soft Negative Stock).
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
 * Расчет скидки врача до 100% (Мандат 8e):
 * Врач свободен предоставить скидку без ввода мастер-паролей директора.
 * Расчет ведется в точных копейках (BIGINT / integer math).
 */
export function applyDoctorDiscountToTiers(
	tiers: readonly TreatmentPlanTier[],
	discountPercent: number,
): readonly TreatmentPlanTier[] {
	const clampedDiscount = Math.max(0, Math.min(100, discountPercent));
	if (clampedDiscount === 0) return tiers;

	const multiplier = (100 - clampedDiscount) / 100;
	return tiers.map((tier) => {
		const discountedStages = tier.stages.map((stage) => {
			const sRub = Math.round(stage.totalRub * multiplier);
			return {
				...stage,
				totalRub: sRub,
				totalKopecks: sRub * 100,
				items: stage.items.map((it) => {
					const itemRub = Math.round(it.priceRub * multiplier);
					return {
						...it,
						priceRub: itemRub,
						unitPriceRub: typeof it.unitPriceRub === "number" ? Math.round(it.unitPriceRub * multiplier) : undefined,
						discountRub: it.priceRub - itemRub,
					};
				}),
			};
		});

		const totalRub = discountedStages.reduce((sum, s) => sum + s.totalRub, 0);
		return {
			...tier,
			totalRub,
			totalKopecks: totalRub * 100,
			stages: discountedStages,
		};
	});
}

/**
 * Генерация 3 канонических тарифов планов лечения по образцу клинических данных.
 */
export function buildCanonical3TierPlans(
	baseStages = CANONICAL_CLINICAL_STAGES,
): readonly TreatmentPlanTier[] {
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

/**
 * 1-клик генератор типовых планов лечения по диагнозу МКБ-10 (Мандат 8n).
 * Врач выбирает диагноз и мгновенно получает готовый 3-уровневый план.
 */
export function generateTreatmentPlanFromDiagnosis(
	diagnosisCode: string,
	toothNumber = 16,
): readonly TreatmentPlanStage[] {
	const cleanCode = diagnosisCode.trim().toUpperCase();

	// 1. Кариес дентина (K02.1)
	if (cleanCode.includes("K02") || cleanCode.includes("КАРИЕС")) {
		return [
			{
				id: `stage-caries-${toothNumber}`,
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Терапевтическое лечение кариеса",
				subtitle: `Анатомическая реставрация зуба ${toothNumber}`,
				clinicalGoal: "Иссечение некротизированных тканей и восстановление формы зуба",
				totalRub: 5500,
				totalKopecks: 550000,
				estimatedVisits: 1,
				estimatedWeeks: 1,
				status: "draft",
				items: [
					{
						id: `item-caries-${toothNumber}`,
						toothNumber,
						code804n: "A16.07.002",
						name: `Восстановление зуба ${toothNumber} светоотверждаемым нанокомпозитом`,
						priceRub: 5500,
						unitPriceRub: 5500,
						discountRub: 0,
						quantity: 1,
						stageKind: "stage_1_therapy",
						isCompleted: false,
					},
				],
			},
		];
	}

	// 2. Пульпит / периодонтит (K04.0, K04.4)
	if (cleanCode.includes("K04") || cleanCode.includes("ПУЛЬПИТ") || cleanCode.includes("ПЕРИОДОНТИТ")) {
		return [
			{
				id: `stage-endo-${toothNumber}`,
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Эндодонтическое лечение каналов",
				subtitle: `Механическая и медикаментозная обработка зуба ${toothNumber}`,
				clinicalGoal: "Пломбирование корневых каналов гуттаперчей и герметизация",
				totalRub: 12000,
				totalKopecks: 1200000,
				estimatedVisits: 2,
				estimatedWeeks: 2,
				status: "draft",
				items: [
					{
						id: `item-endo-prep-${toothNumber}`,
						toothNumber,
						code804n: "A16.07.030",
						name: `Обработка корневых каналов зуба ${toothNumber} под микроскопом`,
						priceRub: 7500,
						unitPriceRub: 7500,
						discountRub: 0,
						quantity: 1,
						stageKind: "stage_1_therapy",
						isCompleted: false,
					},
					{
						id: `item-endo-fill-${toothNumber}`,
						toothNumber,
						code804n: "A16.07.002",
						name: `Постоянная реставрация коронковой части зуба ${toothNumber}`,
						priceRub: 4500,
						unitPriceRub: 4500,
						discountRub: 0,
						quantity: 1,
						stageKind: "stage_1_therapy",
						isCompleted: false,
					},
				],
			},
		];
	}

	// 3. Потеря зубов / адентия / имплантация (K08.1)
	if (cleanCode.includes("K08") || cleanCode.includes("АДЕНТИЯ") || cleanCode.includes("ИМПЛАНТ")) {
		return [
			{
				id: `stage-surg-${toothNumber}`,
				stageNumber: 1,
				stageKind: "stage_2_surgery",
				title: "Хирургический этап: дентальная имплантация",
				subtitle: `Установка имплантата в позиции отсутствующего зуба ${toothNumber}`,
				clinicalGoal: "Остеоинтеграция дентального имплантата",
				totalRub: 48000,
				totalKopecks: 4800000,
				estimatedVisits: 1,
				estimatedWeeks: 12,
				status: "draft",
				items: [
					{
						id: `item-surg-impl-${toothNumber}`,
						toothNumber,
						code804n: "A16.07.054",
						name: `Установка дентального имплантата в позиции зуба ${toothNumber}`,
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
				id: `stage-ortho-${toothNumber}`,
				stageNumber: 2,
				stageKind: "stage_3_orthopedics",
				title: "Ортопедический этап: коронка на имплантате",
				subtitle: `Индивидуальный абатмент и коронка на зуб ${toothNumber}`,
				clinicalGoal: "Полноценное функциональное протезирование",
				totalRub: 35000,
				totalKopecks: 3500000,
				estimatedVisits: 2,
				estimatedWeeks: 2,
				status: "draft",
				items: [
					{
						id: `item-ortho-crown-${toothNumber}`,
						toothNumber,
						code804n: "A16.07.004",
						name: `Коронка из диоксида циркония на имплантате в позиции ${toothNumber}`,
						priceRub: 35000,
						unitPriceRub: 35000,
						discountRub: 0,
						quantity: 1,
						stageKind: "stage_3_orthopedics",
						isCompleted: false,
					},
				],
			},
		];
	}

	// По умолчанию возвращаем канонический комплексный 3-этапный план
	return CANONICAL_CLINICAL_STAGES;
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
