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
		"Базовая санация, световые пломбы, функциональный фокус и базовая терапия композитами",
		"Базовый / Эконом",
		"bg-muted/40 text-muted-foreground border-border",
		"border-border hover:border-foreground/40",
		false,
		1,
		"до 5–7 лет",
		"Световые микрогибридные композиты Gradia / Charisma, базовая УЗ-гигиена, функциональный фокус",
		[
			"Базовая санация полости рта и световые композиты (GC Gradia / Heraeus Charisma)",
			"Терапевтическое устранение кариеса и очагов воспаления",
			"Ультразвуковое снятие наддесневого камня и первичная гигиена",
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
		"Керамические вкладки, эндодонтия под микроскопом, биологическая герметизация и коронки Prettau",
		"Оптимальный",
		"bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
		"border-[var(--teal,var(--brand-primary))]/50 hover:border-[var(--teal,var(--brand-primary))] shadow-md",
		false,
		2,
		"15–20 лет",
		"Керамические вкладки IPS e.max CAD, монолитный диоксид циркония Prettau, эндодонтия Leica",
		[
			"Лечение каналов под дентальным микроскопом Leica M320 и биологическая герметизация",
			"Керамические ультранирные вкладки IPS e.max CAD и анатомические коронки Prettau",
			"Эндодонтическое восстановление: стекловолоконный штифт и анатомический билд-ап",
			"Комплексная швейцарская гигиена Air-Flow Plus с глициновым порошком",
			"Гарантия клиники 2 года",
		],
		[
			"Идеальный баланс долговечности, биологической герметизации и эстетики",
			"Керамические прецизионные вкладки E.max CAD и монолитный диоксид циркония",
			"Надежная фиксация со стекловолоконным штифтом и сохранение корня",
			"Эндодонтия под оптическим увеличением микроскопа",
		],
		standardStages,
	);

	const optimumTier = makeTier(
		"optimum",
		"Премиум (Прецизионная реконструкция)",
		"Циркониевые коронки, имплантация Straumann/Osstem, индивидуальные абатменты и микроскоп Carl Zeiss",
		"Премиум — Выбор клиники",
		"bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400/60 font-bold",
		"border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10",
		true,
		"5+ лет (пожизненно)",
		"25+ лет (пожизненно)",
		"Швейцарские имплантаты Straumann SLActive / Osstem TS-III, коронки из циркония, 3D-шаблон CAD/CAM",
		[
			"Дентальная имплантация Straumann Roxolid BLX / SLActive и Osstem TS-III по 3D-шаблону",
			"Высокоэстетичные коронки из многослойного диоксида циркония с индивидуальными абатментами",
			"Эндодонтическое перелечивание под микроскопом Carl Zeiss OPMI PROergo",
			"Направленная костная регенерация (GBR) биомембранами Geistlich Bio-Gide",
			"Премиальная SPA-профгигиена Clinpro + фотопротокол",
			"Гарантия клиники 5+ лет, пожизненная международная гарантия на имплантаты",
		],
		[
			"Максимальная надежность: швейцарская имплантация Straumann и цирконий",
			"Прецизионная точность навигационного 3D-шаблона CAD/CAM",
			"Ускоренная остеоинтеграция имплантатов за счет гидрофильной поверхности SLActive",
			"Безупречная эстетика натурального зуба с послойной керамикой",
			"Персональное кураторское сопровождение пациента",
		],
		optimumStages,
	);

	return [economyTier, standardTier, optimumTier];
}

export const generate3TierTreatmentPlanOptions = generate3TierPlanComparison;

