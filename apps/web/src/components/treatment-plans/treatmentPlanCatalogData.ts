/**
 * treatmentPlanCatalogData.ts — Канонический мастер-фасад планов лечения и 3-уровневых смет.
 * Мандаты 8b, 8zi: Компактный фасад (< 300 строк), декомпозированный на модульные пресеты.
 * Мандат 8e: Автономия врача — скидки до 100%, фильтрация микро-расходников для пациента, 0 блокировок.
 * Мандат 8n: Клиники РФ 1–5 кресел — 3 тарифа, честные альтернативные материалы без множителей *0.75 / *1.45.
 * Мандат 8x: Чистый клинический язык без советского канцелярита в прод-UI.
 */

import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTier, TreatmentPlanTierId } from "./treatmentPlanTypes";
import { isMicroConsumable } from "./treatmentPlanConsumables";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { generatePatientCasePresentation, rublesToKopecks, kopecksToRubles, sumKopecks, percentageOfKopecks } from "@dental/shared";

// Экспорты из декомпозированных модулей пресетов (Мандат 8b/8zi)
export * from "./catalogPresets/presetHelpers";
export * from "./catalogPresets/presetCanonicalTiers";
export * from "./catalogPresets/presetTeethGenerator";
export * from "./catalogPresets/presetK02Caries";
export * from "./catalogPresets/presetK04Pulpitis";
export * from "./catalogPresets/presetK08Implant";

import {
	CANONICAL_CLINICAL_STAGES,
	DEFAULT_PRESENTER_TIERS,
	CANONICAL_TIER_DEFINITIONS,
} from "./catalogPresets/presetCanonicalTiers";
import { generateCariesPreset } from "./catalogPresets/presetK02Caries";
import { generatePulpitisPreset } from "./catalogPresets/presetK04Pulpitis";
import { generateImplantPreset } from "./catalogPresets/presetK08Implant";

export { generatePatientCasePresentation };

/** Фильтрация копеечных микро-расходников для клиента (Мандат 8e) */
export function sanitizePatientPresentationStages(stages: readonly TreatmentPlanStage[]): readonly TreatmentPlanStage[] {
	return stages.map((stage) => {
		const cleanItems = stage.items.filter((item) => !isMicroConsumable(item));
		return { ...stage, items: cleanItems.length > 0 ? cleanItems : stage.items };
	});
}

/** Расчет динамической суммы этапов в копейках и рублях (Мандат 8bm: Zero Float Drift) */
export function computeStagesKopecks(stages: readonly TreatmentPlanStage[]): {
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly amountKopecks: bigint;
	readonly stages: readonly TreatmentPlanStage[];
} {
	const mappedStages = stages.map((stg) => {
		const stageItemsKopecks = stg.items.map((it) => {
			const itemUnitPrice = typeof it.unitPriceRub === "number" && it.unitPriceRub > 0 ? it.unitPriceRub : it.priceRub;
			const qty = Math.max(1, it.quantity || 1);
			const unitKopecks = rublesToKopecks(itemUnitPrice);
			const discountKopecks = rublesToKopecks(it.discountRub || 0);
			return Math.max(0, unitKopecks * qty - discountKopecks);
		});
		const stageTotalKopecks = sumKopecks(stageItemsKopecks);
		const stageTotalRub = kopecksToRubles(stageTotalKopecks);
		return {
			...stg,
			totalRub: stageTotalRub,
			totalKopecks: stageTotalKopecks,
		};
	});

	const totalKopecks = sumKopecks(mappedStages.map((s) => s.totalKopecks));
	const totalRub = kopecksToRubles(totalKopecks);
	return {
		totalRub,
		totalKopecks,
		amountKopecks: BigInt(totalKopecks),
		stages: mappedStages,
	};
}

/**
 * CLINIC_SERVICE_TIER_CATALOG — Каталог услуг клиники с дифференциацией по тарифам (материалам).
 * Исключает хардкод и фиктивные множители *0.85 / *1.35.
 */
export interface ClinicTierServicePrice {
	readonly serviceCode?: string | undefined;
	readonly code804n: string;
	readonly category: string;
	readonly economy: { readonly name: string; readonly priceRub: number };
	readonly optimum: { readonly name: string; readonly priceRub: number };
	readonly premium: { readonly name: string; readonly priceRub: number };
}

export const CLINIC_SERVICE_TIER_CATALOG_DEMO: readonly ClinicTierServicePrice[] = [
	{
		code804n: "A16.07.002",
		category: "Терапия",
		economy: {
			name: "Восстановление зуба пломбой световой полимеризации (базовый композит)",
			priceRub: 3500,
		},
		optimum: {
			name: "Восстановление нанокомпозитом светового отверждения повышенной прочности",
			priceRub: 4800,
		},
		premium: {
			name: "Восстановление прессованной керамической накладкой / вкладкой",
			priceRub: 8500,
		},
	},
	{
		code804n: "A16.07.008.002",
		category: "Эндодонтия",
		economy: {
			name: "Эндодонтическое лечение корневых каналов (стандартная обработка)",
			priceRub: 9500,
		},
		optimum: {
			name: "Эндодонтическое лечение корневых каналов под операционным микроскопом",
			priceRub: 13500,
		},
		premium: {
			name: "Прецизионная микроскопная эндодонтия с биокерамическим силером",
			priceRub: 16500,
		},
	},
	{
		code804n: "A16.07.003.001",
		category: "Терапия",
		economy: {
			name: "Восстановление культи зуба под коронку (литая культевая вкладка)",
			priceRub: 4500,
		},
		optimum: {
			name: "Восстановление зуба под коронку со стекловолоконным штифтом",
			priceRub: 5500,
		},
		premium: {
			name: "Билдап композитом двойного отверждения с кварцевым штифтом",
			priceRub: 7500,
		},
	},
	{
		code804n: "A16.07.054.001",
		category: "Хирургия",
		economy: {
			name: "Внутрикостная дентальная имплантация базовой системы",
			priceRub: 32000,
		},
		optimum: {
			name: "Внутрикостная дентальная имплантация SLA-системы + формирователь десны",
			priceRub: 42000,
		},
		premium: {
			name: "Премиальная имплантация гидрофильной системы + 3D-шаблон",
			priceRub: 80000,
		},
	},
	{
		code804n: "A16.07.004",
		category: "Ортопедия",
		economy: {
			name: "Восстановление зуба металлокерамической коронкой Co-Cr",
			priceRub: 14000,
		},
		optimum: {
			name: "Восстановление зуба коронкой из многослойного диоксида циркония CAD/CAM",
			priceRub: 26000,
		},
		premium: {
			name: "Восстановление зуба керамической коронкой с индивидуальной эстетической раскраской",
			priceRub: 38000,
		},
	},
	{
		code804n: "A16.07.006",
		category: "Ортопедия",
		economy: {
			name: "Протезирование на имплантате металлокерамической коронкой",
			priceRub: 22000,
		},
		optimum: {
			name: "Протезирование на имплантате (диоксид циркония с шахтой винтовой фиксации)",
			priceRub: 34000,
		},
		premium: {
			name: "Протезирование на имплантате (индивидуальный абатмент Ti-Base + керамическая коронка)",
			priceRub: 48000,
		},
	},
];

/**
 * CLINIC_SERVICE_TIER_CATALOG — Каталог услуг клиники с дифференциацией по тарифам (материалам).
 * В демонстрационном режиме (isDemoShowcaseMode) используется витринный каталог CLINIC_SERVICE_TIER_CATALOG_DEMO,
 * в боевом режиме цены берутся строго из номенклатуры PostgreSQL 18 (service_catalog_items.tier_prices).
 */
export const CLINIC_SERVICE_TIER_CATALOG: readonly ClinicTierServicePrice[] =
	isDemoShowcaseMode() ? CLINIC_SERVICE_TIER_CATALOG_DEMO : [];

/**
 * resolveTierService — Сопоставление услуги с клиническим прейскурантом тарифов (Мандат 8z).
 * Название и цена услуги врача из прейскуранта клиники неприкосновенны!
 * Исключены фейковые множители *0.80 / *1.30 и подменяющие регулярки.
 */
export function resolveTierService(
	item: TreatmentPlanItem,
	tierId: TreatmentPlanTierId,
): { name: string; priceRub: number } {
	const basePrice = typeof item.unitPriceRub === "number" && item.unitPriceRub > 0 ? item.unitPriceRub : item.priceRub;

	// 1. Проверяем наличие индивидуальных цен по тарифам в tierPrices (из номенклатуры PostgreSQL 18)
	const tierPrice = item.tierPrices?.[tierId];
	if (typeof tierPrice === "number" && tierPrice > 0) {
		return {
			name: item.name,
			priceRub: tierPrice,
		};
	}

	if (tierId === "optimum") {
		return { name: item.name, priceRub: basePrice };
	}

	// 2. В демо-режиме (isDemoShowcaseMode) проверяем витринный каталог по коду услуги
	if (isDemoShowcaseMode()) {
		const code = (item.code804n || item.serviceCode || "").trim().toUpperCase();
		const toothPrefix = item.toothNumber ? `зуба ${item.toothNumber} ` : "";
		const catalogEntry = CLINIC_SERVICE_TIER_CATALOG.find(
			(entry) => entry.code804n === code || (code && code.startsWith(entry.code804n)),
		);

		if (catalogEntry) {
			const tierData = catalogEntry[tierId];
			const nameWithTooth = item.toothNumber ? `${tierData.name} (${toothPrefix.trim()})` : tierData.name;
			return {
				name: nameWithTooth,
				priceRub: tierData.priceRub,
			};
		}
	}

	// 3. Боевой режим (Мандат 8z): реальное название и базовая цена услуги врача неприкосновенны!
	return {
		name: item.name,
		priceRub: basePrice,
	};
}

/**
 * differentiateStagesForTier — Дифференциация этапов и услуг по клинической матрице материалов
 * строго из прейскуранта CLINIC_SERVICE_TIER_CATALOG без искусственных множителей.
 */
export function differentiateStagesForTier(
	stages: readonly TreatmentPlanStage[],
	tierId: string,
): TreatmentPlanStage[] {
	const validTierId: TreatmentPlanTierId =
		tierId === "economy" || tierId === "premium" ? tierId : "optimum";

	return stages.map((stg) => {
		const mappedItems = stg.items.map((it) => {
			const resolved = resolveTierService(it, validTierId);
			return {
				...it,
				name: resolved.name,
				priceRub: resolved.priceRub,
				unitPriceRub: resolved.priceRub,
			};
		});

		const stageItemsKopecks = mappedItems.map((it) => {
			const qty = Math.max(1, it.quantity || 1);
			const unitKopecks = rublesToKopecks(it.priceRub);
			const discountKopecks = rublesToKopecks(it.discountRub || 0);
			return Math.max(0, unitKopecks * qty - discountKopecks);
		});
		const stageTotalKopecks = sumKopecks(stageItemsKopecks);
		const stageTotalRub = kopecksToRubles(stageTotalKopecks);

		return {
			...stg,
			totalRub: stageTotalRub,
			totalKopecks: stageTotalKopecks,
			items: mappedItems,
		};
	});
}

/**
 * buildCanonical3TierPlans — Сборка 3 канонических тарифов плана лечения.
 */
export function buildCanonical3TierPlans(baseStages?: readonly TreatmentPlanStage[]): readonly TreatmentPlanTier[] {
	if (baseStages === undefined || baseStages === CANONICAL_CLINICAL_STAGES) {
		return DEFAULT_PRESENTER_TIERS;
	}

	if (baseStages.length === 0) {
		return CANONICAL_TIER_DEFINITIONS.map((def) => ({
			tierId: def.id,
			title: def.title,
			subtitle: def.subtitle,
			badge: def.badge,
			isRecommended: def.isRecommended,
			totalRub: 0,
			totalKopecks: 0,
			amountKopecks: 0n,
			warrantyYears: def.warrantyYears,
			keyAdvantages: def.keyAdvantages,
			stages: [],
		}));
	}

	const sanitized = sanitizePatientPresentationStages(baseStages);

	return CANONICAL_TIER_DEFINITIONS.map((def) => {
		const tierStages = differentiateStagesForTier(sanitized, def.id);
		const totalKopecks = sumKopecks(tierStages.map((s) => s.totalKopecks));
		const totalRub = kopecksToRubles(totalKopecks);
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

/** Расчет скидки врача до 100% (Мандат 8e, BIGINT/integer precision) */
export function applyDoctorDiscountToTiers(tiers: readonly TreatmentPlanTier[], discountPercent: number): readonly TreatmentPlanTier[] {
	const clampedDiscount = Math.max(0, Math.min(100, discountPercent));
	if (clampedDiscount === 0) return tiers;

	const discountBasisPoints = clampedDiscount * 100;
	return tiers.map((tier) => {
		const discountedStages = tier.stages.map((stage) => {
			const discountedItems = stage.items.map((it) => {
				const itemKopecks = rublesToKopecks(it.priceRub);
				const discountKopecks = percentageOfKopecks(itemKopecks, discountBasisPoints);
				const discountedItemKopecks = Math.max(0, itemKopecks - discountKopecks);
				const itemRub = kopecksToRubles(discountedItemKopecks);
				const unitPriceRub = typeof it.unitPriceRub === "number"
					? kopecksToRubles(Math.max(0, rublesToKopecks(it.unitPriceRub) - percentageOfKopecks(rublesToKopecks(it.unitPriceRub), discountBasisPoints)))
					: undefined;
				return {
					...it,
					priceRub: itemRub,
					unitPriceRub,
					discountRub: it.priceRub - itemRub,
				};
			});

			const stageKopecks = sumKopecks(
				discountedItems.map((it) => rublesToKopecks(it.priceRub) * (it.quantity || 1))
			);
			const stageRub = kopecksToRubles(stageKopecks);

			return {
				...stage,
				totalRub: stageRub,
				totalKopecks: stageKopecks,
				items: discountedItems,
			};
		});

		const totalKopecks = sumKopecks(discountedStages.map((s) => s.totalKopecks));
		const totalRub = kopecksToRubles(totalKopecks);
		return {
			...tier,
			totalRub,
			totalKopecks,
			amountKopecks: BigInt(totalKopecks),
			stages: discountedStages,
		};
	});
}

/** Клинический генератор типовых планов по диагнозу МКБ-10 (Мандат 8n) */
export function generateTreatmentPlanFromDiagnosis(diagnosisCode: string, toothNumber?: number): readonly TreatmentPlanStage[] {
	const cleanCode = diagnosisCode.trim().toUpperCase();

	// 1. Кариес дентина (K02)
	if (cleanCode.includes("K02") || cleanCode.includes("КАРИЕС")) {
		return generateCariesPreset(toothNumber);
	}

	// 2. Пульпит / эндодонтия (K04)
	if (cleanCode.includes("K04") || cleanCode.includes("ПУЛЬПИТ") || cleanCode.includes("ПЕРИОДОНТИТ")) {
		return generatePulpitisPreset(toothNumber);
	}

	// 3. Адентия / имплантация (K08)
	if (cleanCode.includes("K08") || cleanCode.includes("АДЕНТИЯ") || cleanCode.includes("ИМПЛАНТ")) {
		return generateImplantPreset(toothNumber);
	}

	return CANONICAL_CLINICAL_STAGES;
}

/** Проверка срока действия плана (30 дней): истечение НЕ блокирует врача (Мандат 8e) */
export function isTreatmentPlanExpired(createdAtIso?: string): {
	readonly isExpired: boolean;
	readonly daysElapsed: number;
	readonly warningNotice?: string | undefined;
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
