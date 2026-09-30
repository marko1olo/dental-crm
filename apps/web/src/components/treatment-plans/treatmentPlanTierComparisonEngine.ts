/**
 * treatmentPlanTierComparisonEngine.ts — движок сравнения 3 сценариев плана лечения
 * («Эконом», «Стандарт», «Оптимальный») для презентации пациенту.
 *
 * Включает расчет 13% налогового вычета НДФЛ и рассрочки 0% в целых копейках (Мандат 8k).
 */

import { sumKopecks, calculateStaged304030Schedule } from "@dental/shared";
import type { ToothData } from "../odontogram/ToothChart";
import type { TreatmentPlanStage, TreatmentPlanTier, TreatmentPlanTierId } from "./types";
import {
	type CatalogServiceLookupItem,
	calculateNdflDeduction,
	computeTierInstallments,
} from "./treatmentPlanPricingEngine";
import {
	DEMO_SHOWCASE_TEETH,
	isDemoShowcaseMode,
} from "./treatmentPlanAutoGenerator";
import { generateTierPlanStages } from "./treatmentPlanTierStagesGenerator";

export function generate3TierPlanComparison(
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	patientLoyaltyDiscountPercent: number = 0,
	patientBonusBalanceRub: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanTier, TreatmentPlanTier, TreatmentPlanTier] {
	const isDemo = options?.isDemoMode !== undefined ? options.isDemoMode : isDemoShowcaseMode();
	const validLoyaltyPct = Math.max(0, Math.min(100, patientLoyaltyDiscountPercent));

	function makeTier(
		tierId: TreatmentPlanTierId,
		title: string,
		subtitle: string,
		badge: string,
		badgeClass: string,
		borderClass: string,
		isRecommended: boolean,
		warrantyYears: number | string,
		serviceLifeYears: number | string,
		materialsHeadline: string,
		materialsList: readonly string[],
		keyAdvantages: readonly string[],
		stages: [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage],
	): TreatmentPlanTier {
		const allItems = stages.flatMap((s) => s.items);
		const totalKopecks = sumKopecks(stages.map((s) => s.totalKopecks));
		const totalRub = Math.round(totalKopecks / 100);

		const isHighCost = allItems.some((i) =>
			i.code804n === "A16.07.054.001" ||
			i.code804n === "A16.07.041" ||
			i.code804n === "A16.07.035",
		);

		const ndflDetails = calculateNdflDeduction(totalKopecks, isHighCost);
		const installments = computeTierInstallments(totalKopecks);
		const stagedSchedule = calculateStaged304030Schedule(totalKopecks, true);

		const estimatedWeeks = stages.reduce((acc, s) => acc + s.estimatedWeeks, 0);
		const estimatedVisits = stages.reduce((acc, s) => acc + s.estimatedVisits, 0);

		return {
			tierId,
			title,
			subtitle,
			badge,
			badgeClass,
			borderClass,
			isRecommended,
			totalRub,
			totalKopecks,
			durationWeeks: estimatedWeeks,
			durationVisits: estimatedVisits,
			warrantyYears,
			serviceLifeYears,
			materialsHeadline,
			materialsList,
			keyAdvantages,
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


	const effectiveTeeth =
		isDemo && (!teeth || teeth.length === 0 || !teeth.some((t) => (t.state && t.state !== "Healthy" && t.state !== "Filled") || Boolean(t.boneLossLevel && t.boneLossLevel > 0)))
			? DEMO_SHOWCASE_TEETH
			: teeth;

	const economyStages = generateTierPlanStages("economy", effectiveTeeth, catalog, validLoyaltyPct, { isDemoMode: isDemo });
	const standardStages = generateTierPlanStages("standard", effectiveTeeth, catalog, validLoyaltyPct, { isDemoMode: isDemo });
	const optimumStages = generateTierPlanStages("optimum", effectiveTeeth, catalog, validLoyaltyPct, { isDemoMode: isDemo });

	const economyTier = makeTier(
		"economy",
		"Базовый / Эконом (Терапевтическая санация)",
		"Терапевтическое перелечивание, функциональный фокус, базовая терапия композитами и металлокерамическое протезирование",
		"Базовый / Эконом",
		"bg-muted/40 text-muted-foreground border-border",
		"border-border hover:border-foreground/40",
		false,
		1,
		"до 5–7 лет",
		"Микрогибридные композиты Gradia / Charisma, металлокерамика Co-Cr, функциональный фокус",
		[
			"Терапевтическое перелечивание и световые композиты базовой группы (GC Gradia / Heraeus Charisma)",
			"Металлокерамические коронки и мостовидные протезы Co-Cr",
			"Ультразвуковое снятие наддесневого камня и первичная санация",
			"Гарантия клиники 1 год",
		],
		[
			"Минимальная стоимость старта лечения (функциональный фокус)",
			"Быстрое устранение очагов инфекции и острой боли",
			"Возможность поэтапной оплаты за каждый визит",
		],
		economyStages,
	);

	const standardTier = makeTier(
		"standard",
		"Оптимальный (Комплексная реабилитация)",
		"Биологическая герметизация, стекловолоконный штифт, монолитный цирконий Prettau и надежная имплантация",
		"Оптимальный",
		"bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
		"border-[var(--teal,var(--brand-primary))]/50 hover:border-[var(--teal,var(--brand-primary))] shadow-md",
		false,
		2,
		"15–20 лет",
		"Монолитный диоксид циркония Prettau, стекловолоконный штифт, биологическая герметизация, имплантаты Osstem TS-III",
		[
			"Биологическая герметизация дентина и нанокомпозиты Estelite Asteria",
			"Эндодонтическое восстановление: стекловолоконный штифт и анатомический билд-ап",
			"Безметалловые коронки из высокопрочного монолитного диоксида циркония Prettau",
			"Дентальные имплантаты Osstem TS-III / Dentium SuperLine (SLA)",
			"Комплексная гигиена Air-Flow с глициновым порошком",
			"Гарантия клиники 2 года",
		],
		[
			"Идеальный баланс долговечности, биологической герметизации и эстетики",
			"Безметалловые биосовместимые циркониевые конструкции с высокой прочностью",
			"Надежная фиксация со стекловолоконным штифтом и защита корня",
			"Надежная остеоинтеграция дентальных имплантатов 98.8%",
		],
		standardStages,
	);

	const optimumTier = makeTier(
		"optimum",
		"Премиум (Прецизионная реконструкция)",
		"Дентальный микроскоп Leica, имплантация Straumann / Astra Tech, индивидуальный циркониевый абатмент и керамика E.max",
		"Премиум — Выбор главного врача",
		"bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400/60 font-bold",
		"border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10",
		true,
		"5 лет (импланты: пож.)",
		"25+ лет (пожизненно)",
		"Швейцарские/шведские имплантаты Straumann SLActive / Astra Tech, индивидуальный циркониевый абатмент, керамика IPS e.max Press, микроскоп Leica",
		[
			"Лечение каналов и реставрации под дентальным микроскопом Carl Zeiss / Leica",
			"Премиальная имплантация Straumann Roxolid SLActive / Astra Tech OsseoSpeed",
			"Индивидуальный титано-циркониевый абатмент для идеального десневого контура",
			"Высокоэстетичная прессованная керамика IPS e.max Press / Katana UTML",
			"3D навигационный хирургический шаблон виртуального позиционирования",
			"Гарантия клиники 5 лет, пожизненная международная гарантия производителя на имплантаты",
		],
		[
			"Максимальная надежность и сохранение собственных тканей под микроскопом",
			"Прецизионная посадка с индивидуальным циркониевым абатментом",
			"Ускоренное приживление имплантатов за 3-4 недели (SLActive / OsseoSpeed)",
			"Безупречная эстетика натурального зуба с микрорельефом и естественной прозрачностью",
			"Персональный медицинский куратор и персональное сопровождение",
		],
		optimumStages,
	);

	return [economyTier, standardTier, optimumTier];
}

export const generate3TierTreatmentPlanOptions = generate3TierPlanComparison;

