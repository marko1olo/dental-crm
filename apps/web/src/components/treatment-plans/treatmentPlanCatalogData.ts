/**
 * treatmentPlanCatalogData.ts — Канонический SSOT планов лечения и 3-уровневых смет.
 * Мандаты 8b, 8zi: Целевой размер 250–320 строк (Sweet Spot).
 * Мандат 8e: Автономия врача — скидки до 100%, фильтрация микро-расходников для пациента, 0 блокировок.
 * Мандат 8n: Клиники РФ 1–5 кресел — 3 тарифа в 1 клик, 4 клинических этапа, точный BIGINT.
 * Мандат 8x: Чистый клинический язык без советского канцелярита в прод-UI.
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
	readonly amountKopecks: bigint;
}

/** Расчет динамической суммы этапов в копейках и рублях */
export function computeStagesKopecks(stages: readonly TreatmentPlanStage[], multiplier = 1.0): {
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly amountKopecks: bigint;
	readonly stages: readonly TreatmentPlanStage[];
} {
	const mappedStages = stages.map((stg) => {
		const mappedItems = stg.items.map((it) => {
			const itemPriceKopecks = BigInt(Math.round(it.priceRub * 100));
			const scaledKopecks = (itemPriceKopecks * BigInt(Math.round(multiplier * 100))) / 100n;
			const scaledRub = Number(scaledKopecks / 100n);
			return {
				...it,
				priceRub: scaledRub,
				unitPriceRub: typeof it.unitPriceRub === "number" ? scaledRub : undefined,
			};
		});

		const stageTotalRub = mappedItems.reduce((sum, it) => sum + it.priceRub, 0);
		const stageTotalKopecks = stageTotalRub * 100;
		return {
			...stg,
			totalRub: stageTotalRub,
			totalKopecks: stageTotalKopecks,
			items: mappedItems,
		};
	});

	const totalRub = mappedStages.reduce((sum, s) => sum + s.totalRub, 0);
	const totalKopecks = totalRub * 100;
	return {
		totalRub,
		totalKopecks,
		amountKopecks: BigInt(totalKopecks),
		stages: mappedStages,
	};
}

/** 4 канонических клинических этапа комплексного плана */
export const CANONICAL_CLINICAL_STAGES: readonly TreatmentPlanStage[] = [
	{
		id: "stage-1-hygiene",
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Санация и гигиена",
		subtitle: "Профессиональная гигиена полости рта и пародонтологическая подготовка",
		clinicalGoal: "Ликвидация биопленки, наддесневых и поддесневых отложений",
		totalRub: 7500,
		totalKopecks: 750000,
		estimatedVisits: 1,
		estimatedWeeks: 1,
		status: "draft",
		items: [
			{ id: "proc-1-1", code804n: "A16.07.051", name: "Комплексная профессиональная гигиена полости рта (Air-Flow + ультразвук)", priceRub: 4500, unitPriceRub: 4500, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
			{ id: "proc-1-2", code804n: "A16.07.053", name: "Глубокое фторирование эмали и реминерализующая терапия", priceRub: 3000, unitPriceRub: 3000, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
		],
	},
	{
		id: "stage-2-therapy",
		stageNumber: 2,
		stageKind: "stage_1_therapy",
		title: "Этап 2: Терапия и эндодонтия",
		subtitle: "Лечение кариеса и обработка каналов под микроскопом",
		clinicalGoal: "Герметичная трехмерная обтурация каналов и восстановление культи",
		totalRub: 16000,
		totalKopecks: 1600000,
		estimatedVisits: 2,
		estimatedWeeks: 2,
		status: "draft",
		items: [
			{ id: "proc-2-1", toothNumber: 16, code804n: "A16.07.002", name: "Анатомическое восстановление зуба нанокомпозитом светового отверждения", priceRub: 6000, unitPriceRub: 6000, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
			{ id: "proc-2-2", toothNumber: 26, code804n: "A16.07.030", name: "Механическая и медикаментозная обработка корневых каналов под микроскопом", priceRub: 10000, unitPriceRub: 10000, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
		],
	},
	{
		id: "stage-3-surgery",
		stageNumber: 3,
		stageKind: "stage_2_surgery",
		title: "Этап 3: Хирургия и имплантация",
		subtitle: "Установка дентального имплантата в позиции отсутствующего зуба",
		clinicalGoal: "Восстановление утраченной костной опоры без препарирования соседних зубов",
		totalRub: 48000,
		totalKopecks: 4800000,
		estimatedVisits: 1,
		estimatedWeeks: 12,
		status: "draft",
		items: [
			{ id: "proc-3-1", toothNumber: 36, code804n: "A16.07.054", name: "Установка дентального имплантата с остеокондуктивной поверхностью", priceRub: 48000, unitPriceRub: 48000, discountRub: 0, quantity: 1, stageKind: "stage_2_surgery", isCompleted: false },
		],
	},
	{
		id: "stage-4-orthopedics",
		stageNumber: 4,
		stageKind: "stage_3_orthopedics",
		title: "Этап 4: Ортопедия и протезирование",
		subtitle: "Индивидуальный циркониевый абатмент и коронка CAD/CAM",
		clinicalGoal: "Восстановление окклюзии, анатомического экватора и жевательной функции",
		totalRub: 33500,
		totalKopecks: 3350000,
		estimatedVisits: 2,
		estimatedWeeks: 2,
		status: "draft",
		items: [
			{ id: "proc-4-1", toothNumber: 36, code804n: "A16.07.004", name: "Установка коронки из диоксида циркония на абатменте CAD/CAM", priceRub: 33500, unitPriceRub: 33500, discountRub: 0, quantity: 1, stageKind: "stage_3_orthopedics", isCompleted: false },
		],
	},
];

/** 3 канонических тарифа планов лечения (динамический расчет из номенклатуры РФ 1–5 кресел) */
const initialEconomyTotals = computeStagesKopecks(CANONICAL_CLINICAL_STAGES, 0.75);
const initialOptimumTotals = computeStagesKopecks(CANONICAL_CLINICAL_STAGES, 1.0);
const initialPremiumTotals = computeStagesKopecks(CANONICAL_CLINICAL_STAGES, 1.45);

export const CANONICAL_TIER_DEFINITIONS: readonly TreatmentTierDefinition[] = [
	{
		id: "economy",
		title: "Эконом",
		subtitle: "Базовые сертифицированные материалы РФ и стандартное протезирование",
		badge: "Базовый",
		isRecommended: false,
		warrantyYears: 1,
		keyAdvantages: ["Качественные композитные материалы РФ", "Санация очагов кариеса и купирование воспаления", "Стандартная металлокерамика и базовые импланты", "Гарантийный срок клиники 1 год"],
		totalRub: initialEconomyTotals.totalRub,
		totalKopecks: initialEconomyTotals.totalKopecks,
		amountKopecks: initialEconomyTotals.amountKopecks,
	},
	{
		id: "optimum",
		title: "★ Оптимум",
		subtitle: "Золотой стандарт клиники: наногибридный композит, микроскоп и диоксид циркония",
		badge: "Рекомендуемый",
		isRecommended: true,
		warrantyYears: 3,
		keyAdvantages: ["Лечение корневых каналов под операционным микроскопом", "Наногибридные реставрации с сохранением эстетики", "Анатомические коронки из диоксида циркония CAD/CAM", "Дентальные имплантаты с гидрофильной поверхностью", "Расширенная гарантия клиники 3 года"],
		totalRub: initialOptimumTotals.totalRub,
		totalKopecks: initialOptimumTotals.totalKopecks,
		amountKopecks: initialOptimumTotals.amountKopecks,
	},
	{
		id: "premium",
		title: "Премиум",
		subtitle: "Импортная эстетика и биоинженерия: швейцарские импланты и керамика e.max",
		badge: "Премиум",
		isRecommended: false,
		warrantyYears: 10,
		keyAdvantages: ["Швейцарская имплантационная система высшей категории", "Ультратонкая прессованная безметалловая керамика IPS e.max", "Цифровой 3D-дизайн улыбки и персональный куратор", "Консилиум ведущих специалистов клиники", "Расширенная гарантия производителя 10 лет"],
		totalRub: initialPremiumTotals.totalRub,
		totalKopecks: initialPremiumTotals.totalKopecks,
		amountKopecks: initialPremiumTotals.amountKopecks,
	},
];

/** Фильтрация копеечных микро-расходников для клиента (Мандат 8e) */
export function sanitizePatientPresentationStages(stages: readonly TreatmentPlanStage[]): readonly TreatmentPlanStage[] {
	return stages.map((stage) => {
		const cleanItems = stage.items.filter((item) => !isMicroConsumable(item));
		return { ...stage, items: cleanItems.length > 0 ? cleanItems : stage.items };
	});
}

/** Расчет скидки врача до 100% (Мандат 8e, BIGINT/integer precision) */
export function applyDoctorDiscountToTiers(tiers: readonly TreatmentPlanTier[], discountPercent: number): readonly TreatmentPlanTier[] {
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
		const totalKopecks = totalRub * 100;
		return {
			...tier,
			totalRub,
			totalKopecks,
			amountKopecks: BigInt(totalKopecks),
			stages: discountedStages,
		};
	});
}

/** Сборка 3 канонических тарифов плана лечения (SSOT) */
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
		const totalKopecks = totalRub * 100;
		return {
			tierId: def.id,
			title: def.title,
			subtitle: def.subtitle,
			badge: def.badge,
			isRecommended: def.isRecommended,
			totalRub,
			totalKopecks,
			amountKopecks: BigInt(totalKopecks),
			warrantyYears: def.warrantyYears,
			keyAdvantages: def.keyAdvantages,
			stages: tierStages,
		};
	});
}

/** 1-клик генератор типовых планов по диагнозу МКБ-10 (Мандат 8n) */
export function generateTreatmentPlanFromDiagnosis(diagnosisCode: string, toothNumber = 16): readonly TreatmentPlanStage[] {
	const cleanCode = diagnosisCode.trim().toUpperCase();

	// 1. Кариес дентина (K02)
	if (cleanCode.includes("K02") || cleanCode.includes("КАРИЕС")) {
		return [{
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
				{ id: `item-caries-${toothNumber}`, toothNumber, code804n: "A16.07.002", name: `Восстановление зуба ${toothNumber} нанокомпозитом`, priceRub: 5500, unitPriceRub: 5500, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
			],
		}];
	}

	// 2. Пульпит / эндодонтия (K04)
	if (cleanCode.includes("K04") || cleanCode.includes("ПУЛЬПИТ") || cleanCode.includes("ПЕРИОДОНТИТ")) {
		return [{
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
				{ id: `item-endo-prep-${toothNumber}`, toothNumber, code804n: "A16.07.030", name: `Обработка корневых каналов зуба ${toothNumber} под микроскопом`, priceRub: 7500, unitPriceRub: 7500, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
				{ id: `item-endo-fill-${toothNumber}`, toothNumber, code804n: "A16.07.002", name: `Реставрация коронковой части зуба ${toothNumber}`, priceRub: 4500, unitPriceRub: 4500, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
			],
		}];
	}

	// 3. Адентия / имплантация (K08)
	if (cleanCode.includes("K08") || cleanCode.includes("АДЕНТИЯ") || cleanCode.includes("ИМПЛАНТ")) {
		return [
			{
				id: `stage-surg-${toothNumber}`,
				stageNumber: 1,
				stageKind: "stage_2_surgery",
				title: "Хирургический этап: дентальная имплантация",
				subtitle: `Установка имплантата в позиции зуба ${toothNumber}`,
				clinicalGoal: "Остеоинтеграция дентального имплантата",
				totalRub: 48000,
				totalKopecks: 4800000,
				estimatedVisits: 1,
				estimatedWeeks: 12,
				status: "draft",
				items: [
					{ id: `item-surg-impl-${toothNumber}`, toothNumber, code804n: "A16.07.054", name: `Установка имплантата в позиции зуба ${toothNumber}`, priceRub: 48000, unitPriceRub: 48000, discountRub: 0, quantity: 1, stageKind: "stage_2_surgery", isCompleted: false },
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
					{ id: `item-ortho-crown-${toothNumber}`, toothNumber, code804n: "A16.07.004", name: `Коронка из диоксида циркония на имплантате ${toothNumber}`, priceRub: 35000, unitPriceRub: 35000, discountRub: 0, quantity: 1, stageKind: "stage_3_orthopedics", isCompleted: false },
				],
			},
		];
	}

	return CANONICAL_CLINICAL_STAGES;
}

/** Проверка срока действия плана (30 дней): истечение НЕ блокирует врача (Мандат 8e) */
export function isTreatmentPlanExpired(createdAtIso?: string): {
	readonly isExpired: boolean;
	readonly daysElapsed: number;
	readonly warningNotice?: string;
} {
	if (!createdAtIso) return { isExpired: false, daysElapsed: 0 };
	const created = new Date(createdAtIso).getTime();
	if (Number.isNaN(created)) return { isExpired: false, daysElapsed: 0 };
	const daysElapsed = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
	const isExpired = daysElapsed > 30;

	return {
		isExpired,
		daysElapsed,
		warningNotice: isExpired
			? `Срок предварительной сметы (30 дней) истёк ${daysElapsed - 30} дн. назад. Врач сохраняет право согласовать продолжение лечения без изменения цен.`
			: undefined,
	};
}
