/**
 * treatmentPlanStagesEngine.ts — чистый клинико-финансовый движок планов лечения DENTE CRM.
 *
 * Выполняет:
 * 1. 1-Click генерацию 3 клинических этапов по одонтограмме с номенклатурой Приказа Минздрава РФ № 804н:
 *    - Этап 1: Неотложная помощь и терапевтическая санация (кариес, пульпиты, периодонтиты, профгигиена, КЛКТ).
 *    - Этап 2: Хирургический этап (удаление корней, костная пластика, синус-лифтинг, навигационный шаблон, имплантация).
 *    - Этап 3: Ортопедический этап (коронки E.max / диоксид циркония, мостовидные протезы, вкладки, протезирование на имплантатах).
 * 2. Генерацию 3 вариантов плана лечения («Эконом», «Стандарт», «Оптимальный») для презентации пациенту.
 * 3. Расчёт 13% налогового вычета НДФЛ (Код 01 / Код 02) и рассрочки 0% (3, 6, 12, 24 мес.) в копейках.
 * 4. Сопоставление с реальным каталогом услуг клиники (ServiceCatalogItem).
 */

import {
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
	percentageOfKopecks,
	splitKopecks,
	sumKopecks,
} from "@dental/shared";
import type {
	LoyaltyBonusDeduction,
	NdflDeductionResult,
	Order804nProcedureDefinition,
	TierInstallmentPlan,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStageKind,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "./types";
import type { ToothData, ToothState } from "../odontogram/ToothChart";

export interface CatalogServiceLookupItem {
	readonly id: string;
	readonly title: string;
	readonly category: string;
	readonly basePath?: string;
	readonly basePriceRub: number;
	readonly active?: boolean;
}

/**
 * Официальная Номенклатура медицинских услуг (Приказ Минздрава России от 13.10.2017 № 804н)
 * с эталонной клинической структуризацией по 3 этапам комплексного плана.
 */
export const ORDER_804N_DICTIONARY: Record<string, Order804nProcedureDefinition> = {
	// ==========================================
	// ЭТАП 1: ТЕРАПИЯ И НЕОТЛОЖНАЯ САНАЦИЯ
	// ==========================================
	DiagnosticsCT: {
		code: "A06.07.004",
		title: "Компьютерная томография челюстно-лицевой области (КЛКТ 3D)",
		category: "Диагностика",
		defaultPriceRub: 3500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["кт", "томограф", "сним", "кнкт", "диагност"],
		materialsDefault: "Цифровой 3D-томограф высокой резолюции",
		uetDoctor: 1.5,
		uetNurse: 1.5,
	},
	HygieneComplex: {
		code: "A16.07.051",
		title: "Профессиональная гигиена полости рта и зубов (Air-Flow + УЗ-скейлинг)",
		category: "Гигиена",
		defaultPriceRub: 5500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["гигиен", "air-flow", "чистк", "скейлинг", "отложени"],
		materialsDefault: "Порошок Glycine/Erythritol, фторлак Clinpro White Varnish",
		uetDoctor: 2.0,
		uetNurse: 2.0,
	},
	CariesTherapy: {
		code: "A16.07.002.001",
		title: "Восстановление зуба пломбой (лечение кариеса нанокомпозитом)",
		category: "Терапия",
		defaultPriceRub: 4800,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["кариес", "пломб", "композит", "реставрац", "эмаль"],
		materialsDefault: "Светоотверждаемый наногибридный композит (Estelite / Filtek Ultimate)",
		uetDoctor: 2.5,
		uetNurse: 2.0,
	},
	PulpitisEndo: {
		code: "A16.07.008.002",
		title: "Эндодонтическое лечение пульпита (инструментальная обработка и 3D-обтурация каналов)",
		category: "Эндодонтия",
		defaultPriceRub: 13500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["пульпит", "эндо", "канал", "обтурац", "депульп"],
		materialsDefault: "Никель-титановые ротационные файлы WaveOne Gold, гуттаперча с биокерамическим силером",
		uetDoctor: 4.5,
		uetNurse: 3.5,
	},
	PeriodontitisTherapy: {
		code: "A16.07.009.001",
		title: "Лечение апикального периодонтита (распломбирование, дезинфекция и герметизация)",
		category: "Эндодонтия",
		defaultPriceRub: 16500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["периодонтит", "дезинфекц", "гранулем", "кист"],
		materialsDefault: "Препарат на основе гидроксида кальция UltraCal, термопластифицированная гуттаперча",
		uetDoctor: 5.0,
		uetNurse: 4.0,
	},

	// ==========================================
	// ЭТАП 2: ХИРУРГИЧЕСКИЙ ЭТАП
	// ==========================================
	SimpleExtraction: {
		code: "A16.07.001.001",
		title: "Атравматичное удаление зуба / корня с консервацией лунки",
		category: "Хирургия",
		defaultPriceRub: 3800,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["удален", "экстракц", "корен", "лунк"],
		materialsDefault: "Коллагеновый конус Parasorb Som / Alveostim, шовный материал PTFE",
		uetDoctor: 2.0,
		uetNurse: 2.0,
	},
	ComplexExtraction: {
		code: "A16.07.001.002",
		title: "Сложное хирургическое удаление ретенированного зуба / корня",
		category: "Хирургия",
		defaultPriceRub: 7500,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["сложное удален", "ретинирован", "дистопирован", "8-к"],
		materialsDefault: "Пьезохирургический протокол Mectron, гемостатическая губка",
		uetDoctor: 3.5,
		uetNurse: 3.0,
	},
	BoneGraftingSinusLift: {
		code: "A16.07.041",
		title: "Костная пластика челюстно-лицевой области (направленная костная регенерация / синус-лифтинг)",
		category: "Хирургия",
		defaultPriceRub: 28000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["костн", "пластик", "синус", "лифтинг", "аугментац", "bio-oss"],
		materialsDefault: "Ксеногенный костный материал Geistlich Bio-Oss + мембрана Bio-Gide",
		uetDoctor: 5.0,
		uetNurse: 4.0,
	},
	SurgicalNavigationGuide: {
		code: "A16.07.054",
		title: "Изготовление и фиксация навигационного 3D хирургического шаблона",
		category: "Хирургия",
		defaultPriceRub: 12000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["шаблон", "навигацион", "3d-шаблон", "пилотн"],
		materialsDefault: "Биосовместимый 3D-фотополимер Formlabs Dental SG",
		uetDoctor: 2.0,
		uetNurse: 1.5,
	},
	DentalImplantation: {
		code: "A16.07.054.001",
		title: "Внутрикостная дентальная имплантация + формирователь десны",
		category: "Хирургия",
		defaultPriceRub: 42000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["имплант", "внутрикостн", "остеоинтеграц", "osstem", "straumann"],
		materialsDefault: "Титановый имплантат с биоактивной гидрофильной поверхностью SLA/SLActive",
		uetDoctor: 4.5,
		uetNurse: 4.0,
	},

	// ==========================================
	// ЭТАП 3: ОРТОПЕДИЧЕСКИЙ ЭТАП
	// ==========================================
	InlayOnlay: {
		code: "A16.07.003",
		title: "Восстановление зуба керамической вкладкой / накладкой (Inlay/Onlay)",
		category: "Ортопедия",
		defaultPriceRub: 19500,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["вкладк", "накладк", "inlay", "onlay", "overlay"],
		materialsDefault: "Прессованная полевошпатная керамика IPS e.max Press",
		uetDoctor: 3.5,
		uetNurse: 2.5,
	},
	CrownZirconia: {
		code: "A16.07.004.001",
		title: "Восстановление зуба коронкой из диоксида циркония (Prettau / Multi-Layer)",
		category: "Ортопедия",
		defaultPriceRub: 26000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["цирконий", "диоксид", "коронк", "prettau", "zirconia"],
		materialsDefault: "Высокотранслюцентный многослойный диоксид циркония Katana Zirconia HTML",
		uetDoctor: 4.0,
		uetNurse: 3.0,
	},
	CrownEmaxCeramic: {
		code: "A16.07.004.002",
		title: "Восстановление зуба керамической коронкой / виниром E.max",
		category: "Ортопедия",
		defaultPriceRub: 38000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["e.max", "emax", "керамик", "винир", "коронк"],
		materialsDefault: "Дисиликат лития IPS e.max CAD/Press с индивидуальным нанесением",
		uetDoctor: 4.5,
		uetNurse: 3.0,
	},
	BridgeProsthesis: {
		code: "A16.07.005",
		title: "Восстановление целостности зубного ряда несъемным мостовидным протезом",
		category: "Ортопедия",
		defaultPriceRub: 52000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["мост", "мостовидн", "протез"],
		materialsDefault: "Фрезерованный каркас из диоксида циркония с анатомической облицовкой",
		uetDoctor: 5.0,
		uetNurse: 3.5,
	},
	ImplantCrownProsthetics: {
		code: "A16.07.006",
		title: "Протезирование на имплантате (индивидуальный циркониевый абатмент + коронка с винтовой фиксацией)",
		category: "Ортопедия",
		defaultPriceRub: 34000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["абатмент", "коронка на имплант", "протезирование на имплант", "винтовая"],
		materialsDefault: "Индивидуальный титано-циркониевый Ti-Base абатмент + коронка с винтовой фиксацией",
		uetDoctor: 4.5,
		uetNurse: 3.5,
	},
};

/**
 * Поиск услуги в прейскуранте клиники по ключевым словам и категории.
 */
export function matchCatalogService(
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	category: string,
	keywords: readonly string[],
	fallbackPriceRub: number,
	order804nCode?: string,
): { priceRub: number; title: string; priceId: string | null; fromCatalog: boolean } {
	if (!catalog || catalog.length === 0) {
		return {
			priceRub: fallbackPriceRub,
			title: "",
			priceId: null,
			fromCatalog: false,
		};
	}

	const normalizedKeywords = keywords.map((k) =>
		k.toLowerCase().replace(/ё/g, "е"),
	);

	// 1. Точное совпадение по Order 804n коду (если есть в прайсе)
	if (order804nCode) {
		const byCode = catalog.find(
			(s) =>
				s.active !== false &&
				(s.title.includes(order804nCode) ||
					(s as unknown as { order804nCode?: string }).order804nCode ===
						order804nCode),
		);
		if (
			byCode &&
			typeof byCode.basePriceRub === "number" &&
			byCode.basePriceRub > 0
		) {
			return {
				priceRub: byCode.basePriceRub,
				title: byCode.title,
				priceId: byCode.id,
				fromCatalog: true,
			};
		}
	}

	// 2. Сопоставление по ключевым словам и категории
	const matched = catalog.filter((item) => {
		const title = item.title.toLowerCase().replace(/ё/g, "е");
		return normalizedKeywords.some((kw) => title.includes(kw));
	});

	const activeMatch = matched.find((s) => s.active !== false) ?? matched[0];
	if (
		activeMatch &&
		typeof activeMatch.basePriceRub === "number" &&
		activeMatch.basePriceRub > 0
	) {
		return {
			priceRub: activeMatch.basePriceRub,
			title: activeMatch.title,
			priceId: activeMatch.id,
			fromCatalog: true,
		};
	}

	return {
		priceRub: fallbackPriceRub,
		title: "",
		priceId: null,
		fromCatalog: false,
	};
}

/**
 * 1-Click генерация комплексных этапов плана лечения на основе одонтограммы.
 */
export function generateTreatmentPlanStages(
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	discountPercent: number = 0,
): TreatmentPlanStage[] {
	const stage1Items: TreatmentPlanItem[] = [];
	const stage2Items: TreatmentPlanItem[] = [];
	const stage3Items: TreatmentPlanItem[] = [];

	const validDiscountPct = Math.max(0, Math.min(50, discountPercent));

	// Анализируем патологии зубов
	for (const tooth of teeth) {
		const num = tooth.toothNumber;
		const state: ToothState | string = tooth.state || "Healthy";

		if (state === "Healthy" || state === "Filled") continue;

		if (state === "Caries") {
			const def = ORDER_804N_DICTIONARY.CariesTherapy!;
			const match = matchCatalogService(
				catalog,
				"therapy",
				def.keywords,
				def.defaultPriceRub,
				def.code,
			);
			const unitPrice = match.priceRub;
			const discountRub =
				validDiscountPct > 0 ? Math.round((unitPrice * validDiscountPct) / 100) : 0;
			const finalPrice = Math.max(0, unitPrice - discountRub);

			stage1Items.push({
				id: `caries-${num}`,
				toothNumber: num,
				code804n: def.code,
				name: match.title || `Зуб ${num}: ${def.title}`,
				category: "Терапия",
				unitPriceRub: unitPrice,
				priceRub: finalPrice,
				discountRub: discountRub,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				isAuto: true,
				priceId: match.priceId,
				fromCatalog: match.fromCatalog,
				materials: def.materialsDefault,
				clinicalRationale: "Устранение очага кариозного распада, восстановление контактного пункта",
			});
		} else if (state === "Pulpitis") {
			const def = ORDER_804N_DICTIONARY.PulpitisEndo!;
			const match = matchCatalogService(
				catalog,
				"therapy",
				def.keywords,
				def.defaultPriceRub,
				def.code,
			);
			const unitPrice = match.priceRub;
			const discountRub =
				validDiscountPct > 0 ? Math.round((unitPrice * validDiscountPct) / 100) : 0;
			const finalPrice = Math.max(0, unitPrice - discountRub);

			stage1Items.push({
				id: `pulpitis-${num}`,
				toothNumber: num,
				code804n: def.code,
				name: match.title || `Зуб ${num}: ${def.title}`,
				category: "Эндодонтия",
				unitPriceRub: unitPrice,
				priceRub: finalPrice,
				discountRub: discountRub,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				isAuto: true,
				priceId: match.priceId,
				fromCatalog: match.fromCatalog,
				materials: def.materialsDefault,
				clinicalRationale: "Купирование пульпарной боли, трехмерная обтурация каналов",
			});
		} else if (state === "Periodontitis") {
			const def = ORDER_804N_DICTIONARY.PeriodontitisTherapy!;
			const match = matchCatalogService(
				catalog,
				"therapy",
				def.keywords,
				def.defaultPriceRub,
				def.code,
			);
			const unitPrice = match.priceRub;
			const discountRub =
				validDiscountPct > 0 ? Math.round((unitPrice * validDiscountPct) / 100) : 0;
			const finalPrice = Math.max(0, unitPrice - discountRub);

			stage1Items.push({
				id: `perio-${num}`,
				toothNumber: num,
				code804n: def.code,
				name: match.title || `Зуб ${num}: ${def.title}`,
				category: "Эндодонтия",
				unitPriceRub: unitPrice,
				priceRub: finalPrice,
				discountRub: discountRub,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				isAuto: true,
				priceId: match.priceId,
				fromCatalog: match.fromCatalog,
				materials: def.materialsDefault,
				clinicalRationale: "Ликвидация апикального периапикального воспаления",
			});
		} else if (state === "Missing" || state === "Planned_Implant") {
			// Хирургический этап: Удаление корня + Навигационный шаблон + Имплантация
			const defGuide = ORDER_804N_DICTIONARY.SurgicalNavigationGuide!;
			const defImplant = ORDER_804N_DICTIONARY.DentalImplantation!;

			const matchGuide = matchCatalogService(
				catalog,
				"surgery",
				defGuide.keywords,
				defGuide.defaultPriceRub,
				defGuide.code,
			);
			const matchImplant = matchCatalogService(
				catalog,
				"surgery",
				defImplant.keywords,
				defImplant.defaultPriceRub,
				defImplant.code,
			);

			if (state === "Missing") {
				const defExtract = ORDER_804N_DICTIONARY.SimpleExtraction!;
				const matchExtract = matchCatalogService(
					catalog,
					"surgery",
					defExtract.keywords,
					defExtract.defaultPriceRub,
					defExtract.code,
				);
				const extUnit = matchExtract.priceRub;
				const extDisc =
					validDiscountPct > 0 ? Math.round((extUnit * validDiscountPct) / 100) : 0;

				stage2Items.push({
					id: `extract-${num}`,
					toothNumber: num,
					code804n: defExtract.code,
					name: matchExtract.title || `Зуб ${num}: ${defExtract.title}`,
					category: "Хирургия",
					unitPriceRub: extUnit,
					priceRub: extUnit - extDisc,
					discountRub: extDisc,
					quantity: 1,
					phase: 2,
					stageKind: "stage_2_surgery",
					isAuto: true,
					priceId: matchExtract.priceId,
					fromCatalog: matchExtract.fromCatalog,
					materials: defExtract.materialsDefault,
					clinicalRationale: "Санация разрушенного зуба, подготовка костного ложа к имплантации",
				});
			}

			const guideUnit = matchGuide.priceRub;
			const guideDisc =
				validDiscountPct > 0 ? Math.round((guideUnit * validDiscountPct) / 100) : 0;
			stage2Items.push({
				id: `guide-${num}`,
				toothNumber: num,
				code804n: defGuide.code,
				name: matchGuide.title || `Зуб ${num}: ${defGuide.title}`,
				category: "Хирургия",
				unitPriceRub: guideUnit,
				priceRub: guideUnit - guideDisc,
				discountRub: guideDisc,
				quantity: 1,
				phase: 2,
				stageKind: "stage_2_surgery",
				isAuto: true,
				priceId: matchGuide.priceId,
				fromCatalog: matchGuide.fromCatalog,
				materials: defGuide.materialsDefault,
				clinicalRationale: "Прецизионное позиционирование имплантата по данным КТ",
			});

			const impUnit = matchImplant.priceRub;
			const impDisc =
				validDiscountPct > 0 ? Math.round((impUnit * validDiscountPct) / 100) : 0;
			stage2Items.push({
				id: `implant-${num}`,
				toothNumber: num,
				code804n: defImplant.code,
				name: matchImplant.title || `Зуб ${num}: ${defImplant.title}`,
				category: "Хирургия",
				unitPriceRub: impUnit,
				priceRub: impUnit - impDisc,
				discountRub: impDisc,
				quantity: 1,
				phase: 2,
				stageKind: "stage_2_surgery",
				isAuto: true,
				priceId: matchImplant.priceId,
				fromCatalog: matchImplant.fromCatalog,
				materials: defImplant.materialsDefault,
				clinicalRationale: "Восстановление утраченной жевательной опоры",
			});

			// Ортопедический этап на имплантате
			const defImpCrown = ORDER_804N_DICTIONARY.ImplantCrownProsthetics!;
			const matchImpCrown = matchCatalogService(
				catalog,
				"prosthetics",
				defImpCrown.keywords,
				defImpCrown.defaultPriceRub,
				defImpCrown.code,
			);
			const crownUnit = matchImpCrown.priceRub;
			const crownDisc =
				validDiscountPct > 0 ? Math.round((crownUnit * validDiscountPct) / 100) : 0;

			stage3Items.push({
				id: `implant-crown-${num}`,
				toothNumber: num,
				code804n: defImpCrown.code,
				name: matchImpCrown.title || `Зуб ${num}: ${defImpCrown.title}`,
				category: "Ортопедия",
				unitPriceRub: crownUnit,
				priceRub: crownUnit - crownDisc,
				discountRub: crownDisc,
				quantity: 1,
				phase: 3,
				stageKind: "stage_3_orthopedics",
				isAuto: true,
				priceId: matchImpCrown.priceId,
				fromCatalog: matchImpCrown.fromCatalog,
				materials: defImpCrown.materialsDefault,
				clinicalRationale: "Финишная эстетическая и функциональная реставрация на имплантате",
			});
		} else if (state === "Crown") {
			const defCrown = ORDER_804N_DICTIONARY.CrownZirconia!;
			const matchCrown = matchCatalogService(
				catalog,
				"prosthetics",
				defCrown.keywords,
				defCrown.defaultPriceRub,
				defCrown.code,
			);
			const crUnit = matchCrown.priceRub;
			const crDisc =
				validDiscountPct > 0 ? Math.round((crUnit * validDiscountPct) / 100) : 0;

			stage3Items.push({
				id: `crown-${num}`,
				toothNumber: num,
				code804n: defCrown.code,
				name: matchCrown.title || `Зуб ${num}: ${defCrown.title}`,
				category: "Ортопедия",
				unitPriceRub: crUnit,
				priceRub: crUnit - crDisc,
				discountRub: crDisc,
				quantity: 1,
				phase: 3,
				stageKind: "stage_3_orthopedics",
				isAuto: true,
				priceId: matchCrown.priceId,
				fromCatalog: matchCrown.fromCatalog,
				materials: defCrown.materialsDefault,
				clinicalRationale: "Анатомическое укрепление депульпированного зуба коронкой",
			});
		}
	}

	// Если есть патологии — добавляем диагностику и гигиену в Этап 1
	if (stage1Items.length > 0 || stage2Items.length > 0 || stage3Items.length > 0) {
		const defDiag = ORDER_804N_DICTIONARY.DiagnosticsCT!;
		const matchDiag = matchCatalogService(
			catalog,
			"diagnostics",
			defDiag.keywords,
			defDiag.defaultPriceRub,
			defDiag.code,
		);
		const diagUnit = matchDiag.priceRub;
		const diagDisc =
			validDiscountPct > 0 ? Math.round((diagUnit * validDiscountPct) / 100) : 0;

		const defHyg = ORDER_804N_DICTIONARY.HygieneComplex!;
		const matchHyg = matchCatalogService(
			catalog,
			"hygiene",
			defHyg.keywords,
			defHyg.defaultPriceRub,
			defHyg.code,
		);
		const hygUnit = matchHyg.priceRub;
		const hygDisc =
			validDiscountPct > 0 ? Math.round((hygUnit * validDiscountPct) / 100) : 0;

		stage1Items.unshift(
			{
				id: "stage1-hygiene",
				code804n: defHyg.code,
				name: matchHyg.title || defHyg.title,
				category: "Гигиена",
				unitPriceRub: hygUnit,
				priceRub: hygUnit - hygDisc,
				discountRub: hygDisc,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				isAuto: true,
				priceId: matchHyg.priceId,
				fromCatalog: matchHyg.fromCatalog,
				materials: defHyg.materialsDefault,
				clinicalRationale: "Снятие биопленки и наддесневого камня перед вмешательствами",
			},
			{
				id: "stage1-ct",
				code804n: defDiag.code,
				name: matchDiag.title || defDiag.title,
				category: "Диагностика",
				unitPriceRub: diagUnit,
				priceRub: diagUnit - diagDisc,
				discountRub: diagDisc,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				isAuto: true,
				priceId: matchDiag.priceId,
				fromCatalog: matchDiag.fromCatalog,
				materials: defDiag.materialsDefault,
				clinicalRationale: "3D-контроль анатомии корней и плотности альвеолярной кости",
			},
		);
	}

	// Формируем 3 структуры этапов
	const buildStage = (
		num: number,
		kind: TreatmentPlanStageKind,
		title: string,
		subtitle: string,
		goal: string,
		items: TreatmentPlanItem[],
	): TreatmentPlanStage => {
		const totalKopecksList = items.map((i) => parseKopecks(i.priceRub));
		const totalKopecks = sumKopecks(totalKopecksList);
		const totalRub = Math.round(totalKopecks / 100);
		const visits = items.length === 0 ? 0 : Math.max(1, Math.ceil(items.length / 2));
		const weeks = items.length === 0 ? 0 : num === 2 ? 8 : num === 3 ? 3 : visits * 1;
		const codes = [...new Set(items.map((i) => i.code804n))];

		return {
			stageNumber: num,
			stageKind: kind,
			title,
			subtitle,
			clinicalGoal: goal,
			items,
			totalRub,
			totalKopecks,
			estimatedVisits: visits,
			estimatedWeeks: weeks,
			order804nCodes: codes,
		};
	};

	const s1 = buildStage(
		1,
		"stage_1_therapy",
		"Этап 1: Неотложная помощь и терапевтическая санация",
		"Купирование боли, лечение кариеса, пульпита, периодонтита и профгигиена",
		"Полная ликвидация очагов инфекции и воспаления в полости рта",
		stage1Items,
	);

	const s2 = buildStage(
		2,
		"stage_2_surgery",
		"Этап 2: Хирургический этап",
		"Атравматичное удаление, костная пластика и дентальная имплантация",
		"Восстановление объема костной ткани и интеграция титановых опор",
		stage2Items,
	);

	const s3 = buildStage(
		3,
		"stage_3_orthopedics",
		"Этап 3: Ортопедический этап",
		"Коронки E.max / диоксид циркония, мостовидные протезы, протезирование на имплантатах",
		"Полное анатомическое и эстетическое восстановление прикуса и улыбки",
		stage3Items,
	);

	return [s1, s2, s3];
}

/**
 * Точный копеечный расчет рассрочки 0% без переплат на 3, 6, 12 и 24 месяца.
 * Использует splitKopecks для равномерного распределения копеек без потерь и погрешностей.
 */
export function computeTierInstallments(
	totalKopecks: Kopecks,
): Record<3 | 6 | 12 | 24, TierInstallmentPlan> {
	const build = (months: 3 | 6 | 12 | 24): TierInstallmentPlan => {
		if (totalKopecks <= 0) {
			return {
				months,
				monthlyPaymentKopecks: 0 as Kopecks,
				monthlyPaymentRub: 0,
				partsKopecks: Array(months).fill(0 as Kopecks),
				remainderKopecks: 0 as Kopecks,
			};
		}
		const parts = splitKopecks(totalKopecks, months);
		const monthlyPaymentKopecks = (parts[0] ?? 0) as Kopecks;
		const monthlyPaymentRub = Math.round(monthlyPaymentKopecks / 100);
		const remainderKopecks = ((parts[parts.length - 1] ?? 0) - monthlyPaymentKopecks) as Kopecks;
		return {
			months,
			monthlyPaymentKopecks,
			monthlyPaymentRub,
			partsKopecks: parts,
			remainderKopecks,
		};
	};

	return {
		3: build(3),
		6: build(6),
		12: build(12),
		24: build(24),
	};
}

/**
 * Расчёт возврата 13% НДФЛ по НК РФ (Справка об оплате медицинских услуг).
 * Код 01 — обычное лечение (лимит налоговой базы 150 000 ₽, возврат до 19 500 ₽).
 * Код 02 — дорогостоящее лечение (имплантация/костная пластика, возврат 13% от всей суммы).
 */
export function calculateNdflDeduction(
	totalKopecks: Kopecks,
	isHighCostCode02: boolean = true,
): NdflDeductionResult {
	const code = isHighCostCode02 ? "02" : "01";
	const codeDescription = isHighCostCode02
		? "Код 02 — Дорогостоящее лечение (имплантация, костная пластика, синус-лифтинг) — налоговый вычет 13% со всей суммы без ограничений"
		: "Код 01 — Обычное медицинское лечение (терапия, гигиена, ортопедия) — налоговый вычет 13% с лимитом налоговой базы 150 000 ₽ (макс. возврат 19 500 ₽)";

	if (totalKopecks <= 0) {
		return {
			code,
			codeDescription,
			isHighCostCode02,
			baseKopecks: 0 as Kopecks,
			refundKopecks: 0 as Kopecks,
			refundRub: 0,
			finalPriceWithRefundRub: 0,
			annualLimitRub: isHighCostCode02 ? undefined : 150000,
		};
	}

	let refundKopecks: Kopecks;
	let baseKopecks: Kopecks;
	if (isHighCostCode02) {
		baseKopecks = totalKopecks;
		refundKopecks = percentageOfKopecks(totalKopecks, 1300); // 13.00%
	} else {
		const cap = parseKopecks(150000);
		baseKopecks = Math.min(totalKopecks, cap) as Kopecks;
		refundKopecks = percentageOfKopecks(baseKopecks, 1300);
	}

	const refundRub = Math.round(refundKopecks / 100);
	const totalRub = Math.round(totalKopecks / 100);
	const finalPriceWithRefundRub = Math.max(0, totalRub - refundRub);

	return {
		code,
		codeDescription,
		isHighCostCode02,
		baseKopecks,
		refundKopecks,
		refundRub,
		finalPriceWithRefundRub,
		annualLimitRub: isHighCostCode02 ? undefined : 150000,
	};
}

/**
 * Расчет списания бонусных баллов / депозита пациента с учетом копеечной точности.
 */
export function calculateLoyaltyBonusDeduction(
	grossKopecks: Kopecks,
	discountPercent: number,
	availablePatientBalanceRub: number,
	requestedBonusToSpendRub: number = 0,
): LoyaltyBonusDeduction {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));
	const discountKopecks =
		validDiscountPct > 0
			? percentageOfKopecks(grossKopecks, validDiscountPct * 100)
			: (0 as Kopecks);

	const afterDiscountKopecks = Math.max(0, grossKopecks - discountKopecks) as Kopecks;
	const afterDiscountRub = Math.round(afterDiscountKopecks / 100);

	const maxSpendableBonusRub = Math.max(
		0,
		Math.min(availablePatientBalanceRub, afterDiscountRub),
	);
	const appliedBonusRub = Math.max(
		0,
		Math.min(requestedBonusToSpendRub, maxSpendableBonusRub),
	);
	const appliedBonusKopecks = parseKopecks(appliedBonusRub);

	const netPayableKopecks = Math.max(
		0,
		afterDiscountKopecks - appliedBonusKopecks,
	) as Kopecks;
	const netPayableRub = Math.round(netPayableKopecks / 100);

	return {
		availableBalanceRub: availablePatientBalanceRub,
		appliedBonusRub,
		appliedBonusKopecks,
		grossKopecks,
		discountKopecks,
		netPayableKopecks,
		netPayableRub,
	};
}

/**
 * Генерация 3 сопоставимых вариантов плана лечения (Эконом, Стандарт, Оптимальный)
 * для side-by-side презентации пациенту.
 */
export function generate3TierPlanComparison(
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	customDiscountPercent: number = 0,
): TreatmentPlanTier[] {
	const stages = generateTreatmentPlanStages(teeth, catalog, customDiscountPercent);

	const baseKopecks = sumKopecks(stages.map((s) => s.totalKopecks));
	const baseTotalRub = Math.round(baseKopecks / 100);

	// ==========================================
	// 1. ВАРИАНТ 1: ЭКОНОМ (Базовый минимум)
	// ==========================================
	// Эконом использует базовые пломбы и металлокерамику (коэфф ~0.75 от базовой стоимости)
	const economyKopecks = percentageOfKopecks(baseKopecks, 7500);
	const economyTotalRub = Math.max(baseTotalRub > 0 ? 9500 : 0, Math.round(economyKopecks / 100));
	const econNdfl = calculateNdflDeduction(economyKopecks, false);
	const econInstallments = computeTierInstallments(economyKopecks);

	const economyTier: TreatmentPlanTier = {
		tierId: "economy",
		title: "Эконом (Базовый)",
		subtitle: "Неотложная помощь, купирование боли и базовая функциональность",
		badge: "Эконом",
		badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
		borderClass: "border-[var(--line,#cbd5e1)] dark:border-zinc-800 hover:border-slate-400",
		isRecommended: false,
		totalRub: economyTotalRub,
		totalKopecks: economyKopecks,
		durationWeeks: 4,
		durationVisits: 3,
		warrantyYears: 1,
		materialsHeadline: "Светоотверждаемые нанокомпозиты, стандартные металлокерамические коронки",
		materialsList: [
			"Пломбировочные фотополимеры Gradia / Charisma",
			"Стандартная механическая обработка каналов K-файлами",
			"Металлокерамические коронки и мостовидные протезы",
			"Ультразвуковое снятие наддесневого камня",
			"Гарантия клиники 1 год",
		],
		keyAdvantages: [
			"Минимальная стоимость старта лечения",
			"Быстрое устранение очагов острой боли и инфекции",
			"Возможность поэтапной оплаты за каждый визит",
		],
		stages,
		itemsCount: stages.reduce((acc, s) => acc + s.items.length, 0),
		ndflRefundRub: econNdfl.refundRub,
		priceWithNdflRefundRub: econNdfl.finalPriceWithRefundRub,
		monthlyInstallment12Rub: econInstallments[12].monthlyPaymentRub,
		installments: econInstallments,
		ndflDetails: econNdfl,
	};

	// ==========================================
	// 2. ВАРИАНТ 2: СТАНДАРТ (Сбалансированная реабилитация)
	// ==========================================
	// Стандарт = 100% расчет по прайсу клиники с современными протоколами
	const standardKopecks = baseKopecks;
	const standardTotalRub = baseTotalRub;
	const stdNdfl = calculateNdflDeduction(standardKopecks, true);
	const stdInstallments = computeTierInstallments(standardKopecks);

	const standardTier: TreatmentPlanTier = {
		tierId: "standard",
		title: "Стандарт (Оптимальный выбор)",
		subtitle: "Комплексная реабилитация: нанокомпозиты Estelite, имплантаты Osstem и диоксид циркония",
		badge: "Популярный выбор",
		badgeClass: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800",
		borderClass: "border-blue-500/50 hover:border-blue-500 dark:border-blue-700/60 shadow-md",
		isRecommended: false,
		totalRub: standardTotalRub,
		totalKopecks: standardKopecks,
		durationWeeks: 8,
		durationVisits: 5,
		warrantyYears: 2,
		materialsHeadline: "Нанокомпозиты Estelite Asteria, корейские имплантаты Osstem, коронки из диоксида циркония",
		materialsList: [
			"Японские наногибридные композиты Estelite Asteria / Filtek Ultimate",
			"Дентальные имплантаты Osstem TS-III / Dentium SuperLine (SLA)",
			"Безметалловые коронки из монолитного диоксида циркония Prettau",
			"Комплексная гигиена Air-Flow с глициновым порошком",
			"Гарантия клиники 2 года",
		],
		keyAdvantages: [
			"Идеальный баланс долговечности, эстетики и стоимости",
			"Безметалловые биосовместимые циркониевые конструкции",
			"Надежная остеоинтеграция имплантатов 98.8%",
		],
		stages,
		itemsCount: stages.reduce((acc, s) => acc + s.items.length, 0),
		ndflRefundRub: stdNdfl.refundRub,
		priceWithNdflRefundRub: stdNdfl.finalPriceWithRefundRub,
		monthlyInstallment12Rub: stdInstallments[12].monthlyPaymentRub,
		installments: stdInstallments,
		ndflDetails: stdNdfl,
	};

	// ==========================================
	// 3. ВАРИАНТ 3: ОПТИМАЛЬНЫЙ / ПРЕМИУМ (Выбор главного врача)
	// ==========================================
	// Оптимальный включает микроскопное лечение, Straumann Roxolid, E.max керамику, 3D-шаблон (~1.35x)
	const optimumKopecks = percentageOfKopecks(baseKopecks, 13500);
	const optimumTotalRub = Math.round(optimumKopecks / 100);
	const optNdfl = calculateNdflDeduction(optimumKopecks, true);
	const optInstallments = computeTierInstallments(optimumKopecks);

	const optimumTier: TreatmentPlanTier = {
		tierId: "optimum",
		title: "Оптимальный (Премиум Реконструкция)",
		subtitle: "Лечение под микроскопом, швейцарские имплантаты Straumann SLActive, керамика E.max и 3D-навигация",
		badge: "Выбор главного врача",
		badgeClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400/60 font-bold",
		borderClass: "border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10",
		isRecommended: true,
		totalRub: optimumTotalRub,
		totalKopecks: optimumKopecks,
		durationWeeks: 10,
		durationVisits: 6,
		warrantyYears: "5 лет / Пожизненная на имплантаты",
		materialsHeadline: "Швейцарские имплантаты Straumann Roxolid SLActive, керамика IPS e.max Press, микроскоп Leica",
		materialsList: [
			"Лечение каналов и реставрации под дентальным микроскопом Carl Zeiss / Leica",
			"Швейцарские гидрофильные имплантаты Straumann Roxolid SLActive",
			"Высокоэстетичная прессованная керамика IPS e.max Press / Katana UTML",
			"3D навигационный хирургический шаблон виртуального позиционирования",
			"DSD (Digital Smile Design) 3D-моделирование будущей улыбки",
			"Пожизненная международная гарантия производителя на имплантаты",
		],
		keyAdvantages: [
			"Максимальная надежность и сохранение собственных тканей под микроскопом",
			"Ускоренное приживление имплантатов за 3-4 недели (SLActive технология)",
			"Безупречная эстетика натурального зуба с естественной прозрачностью",
			"Персональный медицинский консьерж и VIP сопровождение",
		],
		stages,
		itemsCount: stages.reduce((acc, s) => acc + s.items.length, 0),
		ndflRefundRub: optNdfl.refundRub,
		priceWithNdflRefundRub: optNdfl.finalPriceWithRefundRub,
		monthlyInstallment12Rub: optInstallments[12].monthlyPaymentRub,
		installments: optInstallments,
		ndflDetails: optNdfl,
	};

	return [economyTier, standardTier, optimumTier];
}
