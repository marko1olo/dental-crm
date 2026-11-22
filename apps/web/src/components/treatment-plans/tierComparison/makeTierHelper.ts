import {
	sumKopecks,
	calculateStaged304030Schedule,
	getTierMaterialsHeadlineRu,
	getTierAdvantagesRu,
	kopecksToRubles,
} from "@dental/shared";
import type { TreatmentPlanStage, TreatmentPlanTier, TreatmentPlanTierId } from "../types/index.js";
import { calculateNdflDeduction, computeTierInstallments } from "../treatmentPlanPricingEngine.js";

export interface TierPresetMeta {
	readonly title: string;
	readonly subtitle: string;
	readonly badge: string;
	readonly badgeClass: string;
	readonly borderClass: string;
	readonly isRecommended: boolean;
	readonly warrantyYears: number | string;
	readonly serviceLifeYears: number | string;
	readonly materialsHeadline: string;
	readonly materialsList: readonly string[];
	readonly keyAdvantages: readonly string[];
}

export const ECONOMY_TIER_META: TierPresetMeta = {
	title: "Базовый (Эконом)",
	subtitle: "Санация, световые микрогибридные композиты, базовое протезирование",
	badge: "Базовый (Эконом)",
	badgeClass: "bg-[var(--paper-soft)] text-[var(--ink-muted)] border border-[var(--line)]",
	borderClass: "border-[var(--line)] hover:border-[var(--line-strong)]",
	isRecommended: false,
	warrantyYears: 1,
	serviceLifeYears: "до 5–7 лет",
	materialsHeadline: getTierMaterialsHeadlineRu("economy"),
	materialsList: [
		"Базовая терапия полости рта, световые микрогибридные композиты",
		"Восстановление металлокерамическими коронками Co-Cr",
		"Классический протокол имплантации и съемного протезирования",
		"Гарантия клиники 1 год",
	],
	keyAdvantages: getTierAdvantagesRu("economy"),
};

export const OPTIMUM_TIER_META: TierPresetMeta = {
	title: "Оптимальный (Рекомендуемый)",
	subtitle: "Лечение под увеличением, нанокомпозиты, циркониевые коронки, имплантация",
	badge: "Оптимум (Выбор врачей)",
	badgeClass: "bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/30 font-medium",
	borderClass: "border-[var(--primary)] shadow-sm",
	isRecommended: true,
	warrantyYears: 3,
	serviceLifeYears: "15–20 лет",
	materialsHeadline: getTierMaterialsHeadlineRu("optimum"),
	materialsList: [
		"Лечение под оптическим увеличением дентального микроскопа",
		"Нанокомпозиты светового отверждения повышенной прочности",
		"Цельная пресс-керамика IPS e.max и коронки из диоксида циркония",
		"Дентальная имплантация с ускоренной остеоинтеграцией",
		"Гарантия клиники 3 года",
	],
	keyAdvantages: getTierAdvantagesRu("optimum"),
};

export const STANDARD_TIER_META: TierPresetMeta = OPTIMUM_TIER_META;

export const PREMIUM_TIER_META: TierPresetMeta = {
	title: "Премиум (Комплексный VIP)",
	subtitle: "Художественная реставрация под микроскопом, виниры, премиум-имплантация SLA, 3D-шаблон",
	badge: "Премиум / VIP",
	badgeClass: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line-strong)] font-semibold",
	borderClass: "border-[var(--ink)] shadow-md",
	isRecommended: false,
	warrantyYears: "10 лет / Пожизненная на имплантаты",
	serviceLifeYears: "25+ лет (пожизненно)",
	materialsHeadline: getTierMaterialsHeadlineRu("premium"),
	materialsList: [
		"Художественная реставрация под микроскопом премиальными нанокомпозитами (Enamel Plus / Asteria)",
		"Ультратонкие цельнокерамические виниры и многослойный цирконий Katana Multi-Layer",
		"Премиальная имплантационная система с активной гидрофильной SLA-поверхностью",
		"Навигационный хирургический 3D-шаблон CAD/CAM",
		"Расширенная гарантия 10 лет, пожизненная гарантия на титановые опоры",
	],
	keyAdvantages: getTierAdvantagesRu("premium"),
};

export function assembleTierFromPreset(
	tierId: TreatmentPlanTierId,
	meta: TierPresetMeta,
	stages: [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage],
): TreatmentPlanTier {
	const allItems = stages.flatMap((s) => s.items);
	const totalKopecks = sumKopecks(stages.map((s) => s.totalKopecks));
	const totalRub = Math.round(kopecksToRubles(totalKopecks));

	const isHighCost = allItems.some((i) => {
		const code = (i.code804n || "").trim().toUpperCase();
		return (
			code.startsWith("A16.07.054") ||
			code.startsWith("A16.07.041") ||
			code.startsWith("A16.07.035") ||
			/имплант|синус|костн.*пласт|all-on-4|all-on-6|балочн/i.test(i.name)
		);
	});

	const ndflDetails = calculateNdflDeduction(totalKopecks, isHighCost);
	const installments = computeTierInstallments(totalKopecks);
	const stagedSchedule = calculateStaged304030Schedule(totalKopecks, true);

	const estimatedWeeks = stages.reduce((acc, s) => acc + s.estimatedWeeks, 0);
	const estimatedVisits = stages.reduce((acc, s) => acc + s.estimatedVisits, 0);

	return {
		tierId,
		title: meta.title,
		subtitle: meta.subtitle,
		badge: meta.badge,
		badgeClass: meta.badgeClass,
		borderClass: meta.borderClass,
		isRecommended: meta.isRecommended,
		totalRub,
		totalKopecks,
		durationWeeks: estimatedWeeks,
		durationVisits: estimatedVisits,
		warrantyYears: meta.warrantyYears,
		serviceLifeYears: meta.serviceLifeYears,
		materialsHeadline: meta.materialsHeadline,
		materialsList: meta.materialsList,
		keyAdvantages: meta.keyAdvantages,
		stages,
		itemsCount: allItems.length,
		ndflRefundRub: ndflDetails.refundRub,
		priceWithNdflRefundRub: ndflDetails.finalPriceWithRefundRub,
		monthlyInstallment12Rub: installments[12]?.monthlyPaymentRub ?? 0,
		installments,
		ndflDetails,
		stagedSchedule,
	};
}
