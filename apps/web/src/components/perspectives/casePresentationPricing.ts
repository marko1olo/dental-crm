/**
 * casePresentationPricing.ts — чистый модуль расчёта и генерации 3-уровневых планов лечения.
 *
 * Рассчитывает планы «Стандарт / Оптимум / Премиум» на основе реального состояния зубов
 * пациента (одонтограмма), каталога услуг клиники и сохранённых планов из базы данных.
 *
 * Полностью бескомпромиссная точная арифметика в копейках:
 * - splitKopecks для рассрочки (3, 6, 12, 24 мес.)
 * - percentageOfKopecks для вычета 13% НДФЛ (Код 01 с лимитом базы 150 000 ₽ vs Код 02 без лимита)
 */

import {
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
	percentageOfKopecks,
	splitKopecks,
	sumKopecks,
} from "@dental/shared";
import type { ToothState } from "../odontogram/ToothChart";

export interface CasePresentationTooth {
	toothNumber: number;
	state: ToothState;
	surfaces?: string[];
}

export interface CasePresentationCatalogItem {
	id: string;
	title: string;
	category: string;
	basePriceRub: number;
	active?: boolean;
}

export interface SavedPlanItem {
	id?: string;
	toothNumber?: number;
	priceId?: string | null;
	name: string;
	quantity: number;
	price: number | null;
	discount: number;
	phase: number;
	isAuto?: boolean;
}

export interface SavedTreatmentPlan {
	id: string;
	patientId?: string;
	name: string;
	status?: string;
	totalPrice?: number;
	patientSignature?: string | null;
	items?: SavedPlanItem[];
	createdAt?: string;
	updatedAt?: string;
}

export interface PlanStage {
	title: string;
	desc: string;
	count: string;
}

export interface CasePlanTier {
	id: "basic" | "optimum" | "premium" | string;
	badge: string;
	title: string;
	subtitle: string;
	isRecommended: boolean;
	badgeClass: string;
	borderClass: string;
	totalRub: number;
	totalKopecks: Kopecks;
	durationWeeks: number;
	warrantyYears: number | string;
	features: string[];
	stages: PlanStage[];
	isSavedPlan?: boolean;
	savedPlanId?: string;
}

export function pluralizeRu(
	count: number,
	one: string,
	few: string,
	many: string,
): string {
	const abs = Math.abs(count) % 100;
	const rem = abs % 10;
	if (abs > 10 && abs < 20) return many;
	if (rem > 1 && rem < 5) return few;
	if (rem === 1) return one;
	return many;
}

/**
 * Подбор цены услуги из каталога клиники по категории и ключевым словам.
 * При отсутствии совпадения используется эталонная цена для стоматологических расчётов.
 */
export function findMatchingCatalogPrice(
	catalog: readonly CasePresentationCatalogItem[] | undefined,
	category: string,
	keywords: readonly string[],
	fallbackRub: number,
): { priceRub: number; title: string; id: string | null; fromCatalog: boolean } {
	if (!catalog || catalog.length === 0) {
		return { priceRub: fallbackRub, title: "", id: null, fromCatalog: false };
	}

	const normalizedKeywords = keywords.map((k) =>
		k.toLowerCase().replace(/ё/g, "е"),
	);

	const matched = catalog.filter((item) => {
		if (item.category && item.category !== category) return false;
		const title = item.title.toLowerCase().replace(/ё/g, "е");
		return normalizedKeywords.some((kw) => title.includes(kw));
	});

	// Предпочитаем активные услуги
	const activeMatch =
		matched.find((item) => item.active !== false) ?? matched[0];
	if (
		activeMatch &&
		typeof activeMatch.basePriceRub === "number" &&
		Number.isFinite(activeMatch.basePriceRub) &&
		activeMatch.basePriceRub > 0
	) {
		return {
			priceRub: activeMatch.basePriceRub,
			title: activeMatch.title,
			id: activeMatch.id,
			fromCatalog: true,
		};
	}

	return { priceRub: fallbackRub, title: "", id: null, fromCatalog: false };
}

/**
 * Расчёт возврата 13% НДФЛ (Справка для налоговой).
 * Код 01 — Стандартное лечение (база ограничена 150 000 ₽, максимальный возврат 19 500 ₽)
 * Код 02 — Дорогостоящее лечение (возврат 13% от полной суммы без ограничений)
 */
export function calculateNdflRefund(
	planKopecks: Kopecks,
	isHighCostEligible: boolean,
): {
	taxRefundKopecks: Kopecks;
	finalPriceWithRefundKopecks: Kopecks;
} {
	if (planKopecks <= 0) {
		return {
			taxRefundKopecks: 0 as Kopecks,
			finalPriceWithRefundKopecks: 0 as Kopecks,
		};
	}

	let taxRefundKopecks: Kopecks;
	if (isHighCostEligible) {
		// Код 02: 1300 базисных пунктов = 13.00%
		taxRefundKopecks = percentageOfKopecks(planKopecks, 1300);
	} else {
		// Код 01: лимит базы 150 000 руб. (15 000 000 копеек)
		const cappedBaseKopecks = Math.min(
			planKopecks,
			parseKopecks(150000),
		) as Kopecks;
		taxRefundKopecks = percentageOfKopecks(cappedBaseKopecks, 1300);
	}

	const finalPriceWithRefundKopecks = Math.max(
		0,
		planKopecks - taxRefundKopecks,
	) as Kopecks;
	return { taxRefundKopecks, finalPriceWithRefundKopecks };
}

/**
 * Расчёт ежемесячного платежа по беспроцентной рассрочке 0%.
 * Использует splitKopecks для идеальной точности без потери остатка.
 */
export function calculateInstallmentMonthly(
	planKopecks: Kopecks,
	months: number,
): Kopecks {
	const validMonths = Math.max(1, months || 1);
	const parts = splitKopecks(planKopecks, validMonths);
	return parts[0] ?? (0 as Kopecks);
}

/**
 * Анализ формулы зубов пациента и разделение по клиническим патологиям.
 */
export function analyzeTeethFindings(teeth: readonly CasePresentationTooth[]) {
	const cariesTeeth = teeth.filter((t) => t.state === "Caries");
	const pulpitisTeeth = teeth.filter((t) => t.state === "Pulpitis");
	const periodontitisTeeth = teeth.filter((t) => t.state === "Periodontitis");
	const missingTeeth = teeth.filter(
		(t) => t.state === "Missing" || t.state === "Planned_Implant",
	);
	const crownTeeth = teeth.filter((t) => t.state === "Crown");
	const implantTeeth = teeth.filter((t) => t.state === "Implant");
	const filledTeeth = teeth.filter((t) => t.state === "Filled");
	const healthyTeeth = teeth.filter((t) => t.state === "Healthy");

	const totalPathologyCount =
		cariesTeeth.length +
		pulpitisTeeth.length +
		periodontitisTeeth.length +
		missingTeeth.length +
		crownTeeth.length;

	return {
		cariesTeeth,
		pulpitisTeeth,
		periodontitisTeeth,
		missingTeeth,
		crownTeeth,
		implantTeeth,
		filledTeeth,
		healthyTeeth,
		totalPathologyCount,
		hasPathologies: totalPathologyCount > 0,
	};
}

function formatToothList(numbers: number[]): string {
	const sorted = [...numbers].sort((a, b) => a - b);
	return sorted.join(", ");
}

/**
 * Динамическая генерация 3 вариантов плана лечения («Стандарт», «Оптимум», «Премиум»)
 * на основе фактического состояния зубов и прайса клиники.
 */
export function generate3TierPlans(
	teeth: readonly CasePresentationTooth[],
	catalog: readonly CasePresentationCatalogItem[] | undefined,
	savedPlans?: readonly SavedTreatmentPlan[],
): CasePlanTier[] {
	const findings = analyzeTeethFindings(teeth);

	// Подбор реальных цен из каталога
	const therapyCaries = findMatchingCatalogPrice(
		catalog,
		"therapy",
		["кариес"],
		4500,
	);
	const therapyPulpitis = findMatchingCatalogPrice(
		catalog,
		"therapy",
		["пульпит", "эндо", "канал"],
		9500,
	);
	const therapyPeriodontitis = findMatchingCatalogPrice(
		catalog,
		"therapy",
		["периодонтит", "эндо"],
		12500,
	);
	const hygieneBasic = findMatchingCatalogPrice(
		catalog,
		"hygiene",
		["ультразвук", "чистк", "скейлинг"],
		4500,
	);
	const hygieneAirFlow = findMatchingCatalogPrice(
		catalog,
		"hygiene",
		["air-flow", "глицин", "комплекс"],
		7500,
	);
	const hygieneSpa = findMatchingCatalogPrice(
		catalog,
		"hygiene",
		["spa", "remin", "отбеливание", "beyond"],
		15000,
	);
	const implantOsstem = findMatchingCatalogPrice(
		catalog,
		"surgery",
		["osstem", "dentium", "имплант"],
		38000,
	);
	const implantStraumann = findMatchingCatalogPrice(
		catalog,
		"surgery",
		["straumann", "nobel", "roxolid", "премиум"],
		75000,
	);
	const surgicalGuide = findMatchingCatalogPrice(
		catalog,
		"surgery",
		["шаблон", "навигацион"],
		12000,
	);
	const crownStandard = findMatchingCatalogPrice(
		catalog,
		"prosthetics",
		["металлокерамика", "коронка"],
		16000,
	);
	const crownZirconia = findMatchingCatalogPrice(
		catalog,
		"prosthetics",
		["цирконий", "диоксид"],
		28000,
	);
	const crownEmax = findMatchingCatalogPrice(
		catalog,
		"prosthetics",
		["e.max", "emax", "керамик", "винир"],
		42000,
	);
	const diagnostics = findMatchingCatalogPrice(
		catalog,
		"diagnostics",
		["кт", "сним", "рентген", "диагностика"],
		2500,
	);

	const cariesNums = findings.cariesTeeth.map((t) => t.toothNumber);
	const pulpitisNums = findings.pulpitisTeeth.map((t) => t.toothNumber);
	const perioNums = findings.periodontitisTeeth.map((t) => t.toothNumber);
	const missingNums = findings.missingTeeth.map((t) => t.toothNumber);
	const crownNums = findings.crownTeeth.map((t) => t.toothNumber);

	// ==========================================
	// 1. ТИР 1: СТАНДАРТ (Терапевтический минимум)
	// ==========================================
	let basicKopecksList: Kopecks[] = [];
	const basicFeatures: string[] = [];
	const basicStages: PlanStage[] = [];

	if (findings.hasPathologies) {
		basicKopecksList.push(parseKopecks(diagnostics.priceRub));
		basicKopecksList.push(parseKopecks(hygieneBasic.priceRub));

		if (cariesNums.length > 0) {
			const cost = multiplyKopecks(
				parseKopecks(therapyCaries.priceRub),
				cariesNums.length,
			);
			basicKopecksList.push(cost);
			basicFeatures.push(
				`Устранение кариеса: ${cariesNums.length} ${pluralizeRu(cariesNums.length, "зуб", "зуба", "зубов")} (${formatToothList(cariesNums)})`,
			);
		}
		if (pulpitisNums.length > 0) {
			const cost = multiplyKopecks(
				parseKopecks(therapyPulpitis.priceRub),
				pulpitisNums.length,
			);
			basicKopecksList.push(cost);
			basicFeatures.push(
				`Лечение пульпита: ${pulpitisNums.length} ${pluralizeRu(pulpitisNums.length, "зуб", "зуба", "зубов")} (${formatToothList(pulpitisNums)})`,
			);
		}
		if (perioNums.length > 0) {
			const cost = multiplyKopecks(
				parseKopecks(therapyPeriodontitis.priceRub),
				perioNums.length,
			);
			basicKopecksList.push(cost);
			basicFeatures.push(
				`Купирование периодонтита: зубы ${formatToothList(perioNums)}`,
			);
		}
		if (crownNums.length > 0) {
			const cost = multiplyKopecks(
				parseKopecks(crownStandard.priceRub),
				crownNums.length,
			);
			basicKopecksList.push(cost);
			basicFeatures.push(
				`Восстановление стандартными коронками: ${crownNums.length} ед. (${formatToothList(crownNums)})`,
			);
		}
		if (missingNums.length > 0) {
			basicFeatures.push(
				`Консервативный мониторинг отсутствующих зубов (${missingNums.length} ед.)`,
			);
		}

		basicFeatures.push("Светоотверждаемые нано-композиты Filtek / Estelite");
		basicFeatures.push("Профессиональная ультразвуковая чистка");
		basicFeatures.push("Базовая гарантия клиники 1 год");

		const visitsTherapy = Math.max(
			1,
			Math.ceil((cariesNums.length + pulpitisNums.length + perioNums.length) / 2),
		);
		basicStages.push({
			title: "Диагностика и гигиена",
			desc: "Ультразвуковой скейлинг, прицельные контрольные снимки",
			count: "1 визит",
		});
		basicStages.push({
			title: "Терапевтическая санация",
			desc: `Пломбирование кариозных полостей и эндодонтия${cariesNums.length > 0 ? ` (зубы ${formatToothList(cariesNums)})` : ""}`,
			count: `${visitsTherapy} ${pluralizeRu(visitsTherapy, "визит", "визита", "визитов")}`,
		});
		if (crownNums.length > 0) {
			basicStages.push({
				title: "Базовое протезирование",
				desc: `Снятие слепков и фиксация коронок на зубы ${formatToothList(crownNums)}`,
				count: "2 визита",
			});
		}
	} else {
		// Профилактический стандарт
		basicKopecksList = [
			parseKopecks(diagnostics.priceRub),
			parseKopecks(hygieneBasic.priceRub),
			parseKopecks(1500),
		];
		basicFeatures.push("Комплексная диагностика и фотопротокол");
		basicFeatures.push("Профессиональная ультразвуковая гигиена");
		basicFeatures.push("Фторирование и реминерализация эмали Clinpro");
		basicFeatures.push("Базовая гарантия клиники 1 год");

		basicStages.push({
			title: "Диагностика и гигиена",
			desc: "Осмотр, фотопротокол, снятие зубного камня",
			count: "1 визит",
		});
		basicStages.push({
			title: "Реминерализация эмали",
			desc: "Глубокое фторирование эмали и индивидуальный подбор ухода",
			count: "1 визит",
		});
	}

	const basicTotalKopecks = sumKopecks(basicKopecksList);
	const basicTotalRub = Math.round(basicTotalKopecks / 100);
	const basicWeeks = Math.max(
		1,
		Math.min(4, Math.ceil((findings.totalPathologyCount || 1) / 2)),
	);

	const basicTier: CasePlanTier = {
		id: "basic",
		badge: "Стандарт",
		title: "Терапевтический минимум",
		subtitle:
			"Купирование боли, устранение очагов инфекции и базовая функциональность",
		isRecommended: false,
		badgeClass:
			"bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
		borderClass:
			"border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600",
		totalRub: basicTotalRub,
		totalKopecks: basicTotalKopecks,
		durationWeeks: basicWeeks,
		warrantyYears: 1,
		features: basicFeatures,
		stages: basicStages,
	};

	// ==========================================
	// 2. ТИР 2: ОПТИМУМ (Комплексная реабилитация — Выбор врача)
	// ==========================================
	let optimumKopecksList: Kopecks[] = [];
	const optimumFeatures: string[] = [];
	const optimumStages: PlanStage[] = [];

	if (findings.hasPathologies) {
		optimumKopecksList.push(
			multiplyKopecks(parseKopecks(diagnostics.priceRub), 2),
		);
		optimumKopecksList.push(parseKopecks(hygieneAirFlow.priceRub));

		if (missingNums.length > 0) {
			const unitImplantKopecks = sumKopecks([
				parseKopecks(implantOsstem.priceRub),
				parseKopecks(crownZirconia.priceRub),
			]);
			const totalImplantsKopecks = multiplyKopecks(
				unitImplantKopecks,
				missingNums.length,
			);
			const guideKopecks = parseKopecks(surgicalGuide.priceRub);
			optimumKopecksList.push(totalImplantsKopecks);
			optimumKopecksList.push(guideKopecks);

			optimumFeatures.push(
				`Дентальная имплантация Osstem/Dentium: ${missingNums.length} ${pluralizeRu(missingNums.length, "единица", "единицы", "единиц")} (${formatToothList(missingNums)})`,
			);
			optimumFeatures.push("Навигационный хирургический 3D-шаблон");
			optimumFeatures.push(
				`Безметалловые циркониевые коронки на имплантатах (${missingNums.length} ед.)`,
			);
		}

		if (crownNums.length > 0) {
			const cost = multiplyKopecks(
				parseKopecks(crownZirconia.priceRub),
				crownNums.length,
			);
			optimumKopecksList.push(cost);
			optimumFeatures.push(
				`Циркониевые коронки на свои зубы: ${crownNums.length} ед. (${formatToothList(crownNums)})`,
			);
		}

		if (cariesNums.length > 0) {
			const cost = multiplyKopecks(
				parseKopecks(therapyCaries.priceRub + 2000),
				cariesNums.length,
			);
			optimumKopecksList.push(cost);
			optimumFeatures.push(
				`Лечение кариеса под микроскопом: ${cariesNums.length} ${pluralizeRu(cariesNums.length, "зуб", "зуба", "зубов")}`,
			);
		}

		if (pulpitisNums.length > 0 || perioNums.length > 0) {
			const count = pulpitisNums.length + perioNums.length;
			const cost = multiplyKopecks(
				parseKopecks(therapyPulpitis.priceRub + 4000),
				count,
			);
			optimumKopecksList.push(cost);
			optimumFeatures.push(
				`Эндодонтия каналов под микроскопом с 3D-обтурацией (${count} ${pluralizeRu(count, "зуб", "зуба", "зубов")})`,
			);
		}

		optimumFeatures.push(
			"Air-Flow гигиена с порошком на основе глицина и полировкой",
		);
		optimumFeatures.push("Цифровые оптические 3D-слепки (сканер iTero)");
		optimumFeatures.push("Расширенная гарантия клиники 5 лет");

		optimumStages.push({
			title: "Санация и подготовка",
			desc: "Лечение каналов под дентальным микроскопом, Air-Flow гигиена",
			count: "2 визита",
		});
		if (missingNums.length > 0) {
			optimumStages.push({
				title: "Хирургический этап",
				desc: `Установка ${missingNums.length} ${pluralizeRu(missingNums.length, "имплантата", "имплантатов", "имплантатов")} по навигационному шаблону`,
				count: "1 визит",
			});
		}
		optimumStages.push({
			title: "Ортопедический этап",
			desc: "Снятие цифровых 3D-слепков и фиксация диоксида циркония",
			count: "2 визита",
		});
	} else {
		optimumKopecksList = [
			parseKopecks(diagnostics.priceRub * 2),
			parseKopecks(hygieneAirFlow.priceRub),
			parseKopecks(16000),
		];
		optimumFeatures.push("Комплексный 3D-чекап с КТ-сканированием");
		optimumFeatures.push("Глубокая гигиена Air-Flow Glycine");
		optimumFeatures.push("Замена старых пломб с микротрещинами");
		optimumFeatures.push("Фторирование глубокого проникновения");
		optimumFeatures.push("Расширенная гарантия клиники 5 лет");

		optimumStages.push({
			title: "3D-диагностика и гигиена",
			desc: "КТ челюстей, Air-Flow чистка и фотопротокол",
			count: "1 визит",
		});
		optimumStages.push({
			title: "Эстетическое моделирование",
			desc: "Полировка, коррекция контактов и защита эмали",
			count: "1 визит",
		});
	}

	const optimumTotalKopecks = sumKopecks(optimumKopecksList);
	const optimumTotalRub = Math.round(optimumTotalKopecks / 100);
	const optimumWeeks = missingNums.length > 0 ? 8 : 4;

	const optimumTier: CasePlanTier = {
		id: "optimum",
		badge: "Оптимум (Выбор врача)",
		title: "Комплексная реабилитация",
		subtitle:
			"Имплантация, лечение под микроскопом и безметалловая керамика",
		isRecommended: true,
		badgeClass:
			"bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border-[var(--teal,var(--brand-primary))]/50",
		borderClass:
			"border-[var(--teal,var(--brand-primary))] ring-2 ring-[var(--teal,var(--brand-primary))]/20 shadow-lg shadow-[var(--teal,var(--brand-primary))]/10",
		totalRub: optimumTotalRub,
		totalKopecks: optimumTotalKopecks,
		durationWeeks: optimumWeeks,
		warrantyYears: 5,
		features: optimumFeatures,
		stages: optimumStages,
	};

	// ==========================================
	// 3. ТИР 3: VIP ПРЕМИУМ (Эстетическая реконструкция)
	// ==========================================
	let premiumKopecksList: Kopecks[] = [];
	const premiumFeatures: string[] = [];
	const premiumStages: PlanStage[] = [];

	if (findings.hasPathologies) {
		premiumKopecksList.push(parseKopecks(12000)); // VIP DSD + Diagnostics
		premiumKopecksList.push(parseKopecks(hygieneSpa.priceRub));
		premiumKopecksList.push(parseKopecks(18000)); // Седация

		if (missingNums.length > 0) {
			const unitStraumannKopecks = sumKopecks([
				parseKopecks(implantStraumann.priceRub),
				parseKopecks(crownEmax.priceRub),
			]);
			const totalImplantsKopecks = multiplyKopecks(
				unitStraumannKopecks,
				missingNums.length,
			);
			premiumKopecksList.push(totalImplantsKopecks);
			premiumKopecksList.push(parseKopecks(surgicalGuide.priceRub));

			premiumFeatures.push(
				`Швейцарские имплантаты Straumann Roxolid SLActive (${missingNums.length} ед.: ${formatToothList(missingNums)})`,
			);
		}

		const totalEstheticUnits = Math.max(
			4,
			missingNums.length + crownNums.length,
		);
		const emaxUnitsCost = multiplyKopecks(
			parseKopecks(crownEmax.priceRub),
			Math.max(crownNums.length, 2),
		);
		premiumKopecksList.push(emaxUnitsCost);

		if (cariesNums.length > 0 || pulpitisNums.length > 0) {
			const count = cariesNums.length + pulpitisNums.length;
			const cost = multiplyKopecks(parseKopecks(14000), count);
			premiumKopecksList.push(cost);
		}

		premiumFeatures.push(
			`Керамические виниры и коронки E.max (${totalEstheticUnits} ед.)`,
		);
		premiumFeatures.push(
			"Лечение в комфортной медикаментозной седации (антистресс)",
		);
		premiumFeatures.push(
			"Digital Smile Design (DSD) виртуальное 3D-моделирование",
		);
		premiumFeatures.push("Персональный медицинский консьерж и VIP-палата");
		premiumFeatures.push(
			"Пожизненная гарантия производителя на имплантаты Straumann",
		);

		premiumStages.push({
			title: "VIP 3D-моделирование и Smile Design",
			desc: "Digital Smile Design, виртуальный сетап, щадящая SPA-гигиена",
			count: "1 визит",
		});
		premiumStages.push({
			title: "Хирургия и терапия в седации",
			desc: "Атравматичная имплантация Straumann и микроскопная санация во сне",
			count: "1 визит",
		});
		premiumStages.push({
			title: "Финальная эстетическая реконструкция",
			desc: "Индивидуальная фиксация безметалловой керамики E.max",
			count: "2 визита",
		});
	} else {
		premiumKopecksList = [
			parseKopecks(12000),
			parseKopecks(hygieneSpa.priceRub),
			parseKopecks(38000),
		];
		premiumFeatures.push(
			"Digital Smile Design (DSD) виртуальное 3D-моделирование улыбки",
		);
		premiumFeatures.push(
			"VIP SPA-гигиена и бережное аппаратное отбеливание Beyond Polus",
		);
		premiumFeatures.push(
			"Укрепление и реминерализация эмали составами премиум-класса",
		);
		premiumFeatures.push("Персональный медицинский консьерж клиники");
		premiumFeatures.push("Гарантия 10 лет");

		premiumStages.push({
			title: "DSD моделирование и SPA-гигиена",
			desc: "Профессиональная фотосессия, 3D DSD сетап, SPA чистка",
			count: "1 визит",
		});
		premiumStages.push({
			title: "Аппаратное отбеливание Beyond Polus",
			desc: "Бережное холодное отбеливание и глубокая защита эмали",
			count: "1 визит",
		});
	}

	const premiumTotalKopecks = sumKopecks(premiumKopecksList);
	const premiumTotalRub = Math.round(premiumTotalKopecks / 100);
	const premiumWeeks = missingNums.length > 0 ? 10 : 6;

	const premiumTier: CasePlanTier = {
		id: "premium",
		badge: "VIP Премиум",
		title: "Эстетическая реконструкция",
		subtitle:
			"Швейцарские имплантаты Straumann, керамика E.max, седация и VIP-сервис",
		isRecommended: false,
		badgeClass:
			"bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border-purple-400/50",
		borderClass:
			"border-purple-500/80 hover:border-purple-400 dark:border-purple-600 shadow-md",
		totalRub: premiumTotalRub,
		totalKopecks: premiumTotalKopecks,
		durationWeeks: premiumWeeks,
		warrantyYears: "10 лет / Пожизненная",
		features: premiumFeatures,
		stages: premiumStages,
	};

	const tiers: CasePlanTier[] = [basicTier, optimumTier, premiumTier];

	// Если есть сохранённые планы лечения пациента в базе — добавляем лучший сохранённый план
	if (savedPlans && savedPlans.length > 0) {
		const latestSaved = savedPlans[0];
		if (latestSaved && Array.isArray(latestSaved.items) && latestSaved.items.length > 0) {
			const savedItemKopecks = latestSaved.items.map((it) => {
				const priceRub = typeof it.price === "number" ? it.price : 0;
				const discountRub = typeof it.discount === "number" ? it.discount : 0;
				const qty = it.quantity || 1;
				const itemTotalRub = Math.max(0, priceRub * qty - discountRub);
				return parseKopecks(itemTotalRub);
			});
			const savedTotalKopecks = sumKopecks(savedItemKopecks);
			const savedTotalRub = Math.round(savedTotalKopecks / 100);

			const savedFeatures = latestSaved.items.slice(0, 6).map((it) => {
				const toothPart = it.toothNumber ? ` (зуб ${it.toothNumber})` : "";
				return `${it.name}${toothPart}`;
			});

			const stagesMap = new Map<number, string[]>();
			for (const it of latestSaved.items) {
				const phase = it.phase || 1;
				const list = stagesMap.get(phase) ?? [];
				list.push(it.name);
				stagesMap.set(phase, list);
			}

			const phaseLabels: Record<number, string> = {
				1: "Терапевтический этап",
				2: "Хирургический этап",
				3: "Ортопедический этап",
			};

			const savedStages: PlanStage[] = [...stagesMap.entries()].map(
				([phase, itemsList]) => ({
					title: phaseLabels[phase] || `Этап ${phase}`,
					desc: itemsList.slice(0, 3).join(", "),
					count: `${Math.max(1, Math.ceil(itemsList.length / 2))} визита`,
				}),
			);

			const savedTier: CasePlanTier = {
				id: `saved_${latestSaved.id}`,
				badge: "План из карты",
				title: latestSaved.name || "Утверждённый план",
				subtitle:
					"Сохранённый лечащим врачом план с фиксированными услугами",
				isRecommended: false,
				badgeClass:
					"bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-400/50",
				borderClass:
					"border-amber-500/80 hover:border-amber-400 dark:border-amber-600 shadow-md",
				totalRub: savedTotalRub,
				totalKopecks: savedTotalKopecks,
				durationWeeks: 4,
				warrantyYears: "По гарантии клиники",
				features: savedFeatures,
				stages: savedStages.length > 0 ? savedStages : basicStages,
				isSavedPlan: true,
				savedPlanId: latestSaved.id,
			};

			return [savedTier, ...tiers];
		}
	}

	return tiers;
}

/**
 * Генерация текста предложения для отправки в мессенджер (WhatsApp/Telegram/SMS).
 */
export function formatPresentationMessengerText(
	patientName: string,
	tier: CasePlanTier,
	installmentMonths: number,
	isHighCostEligible: boolean,
	clinicName = "Клиника ДЕНТЕ",
): string {
	const { taxRefundKopecks, finalPriceWithRefundKopecks } = calculateNdflRefund(
		tier.totalKopecks,
		isHighCostEligible,
	);
	const monthlyKopecks = calculateInstallmentMonthly(
		tier.totalKopecks,
		installmentMonths,
	);

	const featuresList = tier.features
		.slice(0, 5)
		.map((f) => `• ${f}`)
		.join("\n");

	const rubText = (kopecks: Kopecks) => {
		const rub = Math.round(kopecks / 100);
		return `${rub.toLocaleString("ru-RU")} ₽`;
	};

	return (
		`Здравствуйте, ${patientName || "уважаемый пациент"}!\n\n` +
		`${clinicName} подготовила для вас презентацию плана лечения:\n` +
		`«${tier.title}» (${tier.badge})\n\n` +
		`💰 Полная стоимость: ${rubText(tier.totalKopecks)}\n` +
		`🏛 С учетом вычета 13% НДФЛ: ${rubText(finalPriceWithRefundKopecks)} (возврат ${rubText(taxRefundKopecks)})\n` +
		`💳 Рассрочка 0%: ${rubText(monthlyKopecks)} / мес на ${installmentMonths} мес.\n\n` +
		`📋 Что включено в план:\n${featuresList}\n\n` +
		`⏱ Срок реализации: ~${tier.durationWeeks} нед.\n` +
		`🛡 Гарантия: ${tier.warrantyYears} ${typeof tier.warrantyYears === "number" ? pluralizeRu(tier.warrantyYears, "год", "года", "лет") : ""}\n\n` +
		`Если у вас возникнут любые вопросы или вы хотите забронировать время первого визита, мы всегда на связи!`
	);
}
