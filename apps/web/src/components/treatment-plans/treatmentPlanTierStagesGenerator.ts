/**
 * treatmentPlanTierStagesGenerator.ts — генератор этапов по тарифам («Эконом», «Стандарт», «Оптимальный»).
 */

import { type Kopecks, parseKopecks, sumKopecks } from "@dental/shared";
import type { ToothData, ToothState } from "../odontogram/ToothChart";
import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTierId } from "./types";
import type { CatalogServiceLookupItem } from "./treatmentPlanPricingEngine";
import {
	DEMO_SHOWCASE_TEETH,
	isDemoShowcaseMode,
	generateTreatmentPlanStages,
} from "./treatmentPlanAutoGenerator";
import {
	ORDER_804N_DICTIONARY,
	UPPER_ARCH_TEETH,
	LOWER_ARCH_TEETH,
	isDeciduousTooth,
	extractCanalCount,
	getEndoPreparationProcedure,
	getEndoObturationProcedure,
	isMolarOrPremolar,
} from "./treatmentPlanNomenclature804n";
import { createPlanItem, makeEmptyStage } from "./treatmentPlanItemFactory";

export function getDefaultClinicalPresetStages(
	tierId: TreatmentPlanTierId,
	catalog?: readonly CatalogServiceLookupItem[],
	discountPercent: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);

	if (tierId === "economy") {
		// Эконом: 45 000 ₽, 1 год гарантии, 3 нед / 3 виз.
		// Базовая санация, световые пломбы
		const s1Items: TreatmentPlanItem[] = [
			createPlanItem(
				"eco-diag-preset",
				1,
				"stage_1_therapy",
				ORDER_804N_DICTIONARY.DiagnosticsXray ?? {
					code: "A06.07.012",
					title: "Прицельная рентгенография и радиовизиография",
					category: "Диагностика",
					defaultPriceRub: 3500,
					stageKind: "stage_1_therapy",
					stageNumber: 1,
					keywords: ["рентген", "визиография"],
					materialsDefault: "Цифровой радиовизиограф",
				},
				undefined,
				catalog,
				validDiscountPct,
				{ customTitle: "Прицельная рентгенография и радиовизиография", customPriceRub: 3500, isDemoMode: isDemo },
			),
			createPlanItem(
				"eco-hyg-preset",
				1,
				"stage_1_therapy",
				ORDER_804N_DICTIONARY.HygieneComplex ?? {
					code: "A16.07.051",
					title: "Базовая ультразвуковая гигиена и снятие зубного камня",
					category: "Гигиена",
					defaultPriceRub: 4500,
					stageKind: "stage_1_therapy",
					stageNumber: 1,
					keywords: ["гигиена", "ультразвук"],
					materialsDefault: "Ультразвуковой скейлер EMS",
				},
				undefined,
				catalog,
				validDiscountPct,
				{ customTitle: "Базовая ультразвуковая гигиена и снятие зубного камня", customPriceRub: 4500, isDemoMode: isDemo },
			),
			createPlanItem(
				"eco-car16-preset",
				1,
				"stage_1_therapy",
				ORDER_804N_DICTIONARY.TherapyCaries ?? {
					code: "A16.07.002.001",
					title: "Лечение глубокого кариеса световым композитом Gradia Direct",
					category: "Терапия",
					defaultPriceRub: 7000,
					stageKind: "stage_1_therapy",
					stageNumber: 1,
					keywords: ["кариес", "пломба"],
					materialsDefault: "GC Gradia Direct",
				},
				16,
				catalog,
				validDiscountPct,
				{ customTitle: "Лечение глубокого кариеса световым композитом Gradia Direct (зуб 16)", customPriceRub: 7000, isDemoMode: isDemo },
			),
			createPlanItem(
				"eco-car26-preset",
				1,
				"stage_1_therapy",
				ORDER_804N_DICTIONARY.TherapyCaries ?? {
					code: "A16.07.002.001",
					title: "Лечение кариеса световым композитом Gradia Direct",
					category: "Терапия",
					defaultPriceRub: 7000,
					stageKind: "stage_1_therapy",
					stageNumber: 1,
					keywords: ["кариес", "пломба"],
					materialsDefault: "GC Gradia Direct",
				},
				26,
				catalog,
				validDiscountPct,
				{ customTitle: "Лечение кариеса световым композитом Gradia Direct (зуб 26)", customPriceRub: 7000, isDemoMode: isDemo },
			),
			createPlanItem(
				"eco-car35-preset",
				1,
				"stage_1_therapy",
				ORDER_804N_DICTIONARY.TherapyCaries ?? {
					code: "A16.07.002.001",
					title: "Восстановление контактного пункта световым композитом Charisma",
					category: "Терапия",
					defaultPriceRub: 8000,
					stageKind: "stage_1_therapy",
					stageNumber: 1,
					keywords: ["кариес", "пломба"],
					materialsDefault: "Heraeus Charisma Opal",
				},
				35,
				catalog,
				validDiscountPct,
				{ customTitle: "Восстановление контактного пункта световым композитом Charisma (зуб 35)", customPriceRub: 8000, isDemoMode: isDemo },
			),
		];

		const s2Items: TreatmentPlanItem[] = [
			createPlanItem(
				"eco-ext48-preset",
				2,
				"stage_2_surgery",
				ORDER_804N_DICTIONARY.SimpleExtraction ?? {
					code: "A16.07.001.001",
					title: "Атравматичное удаление зуба простое с ревизией лунки",
					category: "Хирургия",
					defaultPriceRub: 5000,
					stageKind: "stage_2_surgery",
					stageNumber: 2,
					keywords: ["удаление"],
					materialsDefault: "Septanest, гемостатическая губка",
				},
				48,
				catalog,
				validDiscountPct,
				{ customTitle: "Атравматичное удаление корня зуба простое (зуб 48)", customPriceRub: 5000, isDemoMode: isDemo },
			),
		];

		const s3Items: TreatmentPlanItem[] = [
			createPlanItem(
				"eco-ortho-preset",
				3,
				"stage_3_orthopedics",
				ORDER_804N_DICTIONARY.CrownMetalCeramic ?? {
					code: "A16.07.004",
					title: "Прямое шинирование композитом и окклюзионная разгрузка",
					category: "Ортопедия",
					defaultPriceRub: 10000,
					stageKind: "stage_3_orthopedics",
					stageNumber: 3,
					keywords: ["коронка", "шинирование"],
					materialsDefault: "Стекловолоконная лента Dentapreg + композит",
				},
				undefined,
				catalog,
				validDiscountPct,
				{ customTitle: "Прямое шинирование композитом и окклюзионная стабилизация", customPriceRub: 10000, isDemoMode: isDemo },
			),
		];

		const stage1: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Этап 1: Неотложная терапия и базовая санация",
			subtitle: "Устранение очагов кариеса световыми пломбами Gradia/Charisma и гигиена",
			clinicalGoal: "Базовая санация полости рта и устранение воспаления",
			items: s1Items,
			totalRub: 30000,
			totalKopecks: 3000000 as Kopecks,
			estimatedVisits: 2,
			estimatedWeeks: 2,
			order804nCodes: Array.from(new Set(s1Items.map((i) => i.code804n))),
		};

		const stage2: TreatmentPlanStage = {
			stageNumber: 2,
			stageKind: "stage_2_surgery",
			title: "Этап 2: Хирургическая санация",
			subtitle: "Атравматичное удаление разрушенного корня зуба под анестезией",
			clinicalGoal: "Устранение хронического очага инфекции",
			items: s2Items,
			totalRub: 5000,
			totalKopecks: 500000 as Kopecks,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			order804nCodes: Array.from(new Set(s2Items.map((i) => i.code804n))),
		};

		const stage3: TreatmentPlanStage = {
			stageNumber: 3,
			stageKind: "stage_3_orthopedics",
			title: "Этап 3: Ортопедическая стабилизация",
			subtitle: "Функциональная окклюзионная стабилизация и шинирование",
			clinicalGoal: "Восстановление жевательной функции",
			items: s3Items,
			totalRub: 10000,
			totalKopecks: 1000000 as Kopecks,
			estimatedVisits: 0,
			estimatedWeeks: 0,
			order804nCodes: Array.from(new Set(s3Items.map((i) => i.code804n))),
		};

		return [stage1, stage2, stage3];
	}

	if (tierId === "standard") {
		// Оптимум (Рекомендовано): 145 000 ₽, 2 года гарантии, 6 нед / 5 виз.
		// Керамические вкладки, эндодонтия под микроскопом
		const s1Items: TreatmentPlanItem[] = [
			createPlanItem(
				"opt-diag-ct-preset",
				1,
				"stage_1_therapy",
				ORDER_804N_DICTIONARY.DiagnosticsCT ?? {
					code: "A06.07.012",
					title: "КЛКТ 3D-диагностика челюстно-лицевой области высокого разрешения",
					category: "Диагностика",
					defaultPriceRub: 4500,
					stageKind: "stage_1_therapy",
					stageNumber: 1,
					keywords: ["клкт", "кт"],
					materialsDefault: "Vatech PaX-i3D Green",
				},
				undefined,
				catalog,
				validDiscountPct,
				{ customTitle: "КЛКТ 3D-диагностика челюстно-лицевой области высокого разрешения", customPriceRub: 4500, isDemoMode: isDemo },
			),
			createPlanItem(
				"opt-hyg-airflow-preset",
				1,
				"stage_1_therapy",
				ORDER_804N_DICTIONARY.HygieneComplex ?? {
					code: "A16.07.051",
					title: "Комплексная гигиена Air-Flow Plus с глицином и фторированием Clinpro",
					category: "Гигиена",
					defaultPriceRub: 7500,
					stageKind: "stage_1_therapy",
					stageNumber: 1,
					keywords: ["гигиена", "airflow"],
					materialsDefault: "EMS Air-Flow Plus, 3M Clinpro",
				},
				undefined,
				catalog,
				validDiscountPct,
				{ customTitle: "Комплексная гигиена Air-Flow Plus с глицином и фторированием Clinpro", customPriceRub: 7500, isDemoMode: isDemo },
			),
			createPlanItem(
				"opt-endo-micro-preset",
				1,
				"stage_1_therapy",
				ORDER_804N_DICTIONARY.EndoObturation3Canal ?? {
					code: "A16.07.008",
					title: "Эндодонтическое лечение 3-канального зуба под микроскопом Leica",
					category: "Терапия",
					defaultPriceRub: 28000,
					stageKind: "stage_1_therapy",
					stageNumber: 1,
					keywords: ["эндодонтия", "микроскоп"],
					materialsDefault: "Микроскоп Leica M320, BioRoot RCS",
				},
				46,
				catalog,
				validDiscountPct,
				{ customTitle: "Эндодонтическое лечение 3-канального зуба под микроскопом Leica (зуб 46)", customPriceRub: 28000, isDemoMode: isDemo },
			),
			createPlanItem(
				"opt-buildup-preset",
				1,
				"stage_1_therapy",
				ORDER_804N_DICTIONARY.TherapyBuildUp ?? {
					code: "A16.07.030",
					title: "Анатомический Core Build-up со стекловолоконным штифтом RelyX",
					category: "Терапия",
					defaultPriceRub: 15000,
					stageKind: "stage_1_therapy",
					stageNumber: 1,
					keywords: ["штифт", "билдап"],
					materialsDefault: "Стекловолоконный штифт 3M RelyX Fiber Post",
				},
				46,
				catalog,
				validDiscountPct,
				{ customTitle: "Анатомический Core Build-up со стекловолоконным штифтом RelyX (зуб 46)", customPriceRub: 15000, isDemoMode: isDemo },
			),
			createPlanItem(
				"opt-resto24-preset",
				1,
				"stage_1_therapy",
				ORDER_804N_DICTIONARY.TherapyCaries ?? {
					code: "A16.07.002.001",
					title: "Высокоэстетичная реставрация нанокомпозитом Estelite Asteria",
					category: "Терапия",
					defaultPriceRub: 10000,
					stageKind: "stage_1_therapy",
					stageNumber: 1,
					keywords: ["реставрация", "эстетика"],
					materialsDefault: "Tokuyama Estelite Asteria",
				},
				24,
				catalog,
				validDiscountPct,
				{ customTitle: "Высокоэстетичная реставрация нанокомпозитом Estelite Asteria (зуб 24)", customPriceRub: 10000, isDemoMode: isDemo },
			),
		];

		const s2Items: TreatmentPlanItem[] = [
			createPlanItem(
				"opt-surg-ext-preset",
				2,
				"stage_2_surgery",
				ORDER_804N_DICTIONARY.SimpleExtraction ?? {
					code: "A16.07.001",
					title: "Атравматичное удаление зуба с аугментацией костным коллагеном",
					category: "Хирургия",
					defaultPriceRub: 15000,
					stageKind: "stage_2_surgery",
					stageNumber: 2,
					keywords: ["удаление", "коллаген"],
					materialsDefault: "Коллагеновый конус Parasorb Sombrero, PRF",
				},
				36,
				catalog,
				validDiscountPct,
				{ customTitle: "Атравматичное удаление зуба с аугментацией лунки (зуб 36)", customPriceRub: 15000, isDemoMode: isDemo },
			),
		];

		const s3Items: TreatmentPlanItem[] = [
			createPlanItem(
				"opt-scan3d-preset",
				3,
				"stage_3_orthopedics",
				ORDER_804N_DICTIONARY.IntraoralScanning ?? {
					code: "A06.07.013",
					title: "Цифровое интраоральное 3D-сканирование зубных рядов",
					category: "Ортопедия",
					defaultPriceRub: 5000,
					stageKind: "stage_3_orthopedics",
					stageNumber: 3,
					keywords: ["сканирование", "3d"],
					materialsDefault: "Цифровой 3D-сканер",
				},
				undefined,
				catalog,
				validDiscountPct,
				{ customTitle: "Цифровое интраоральное 3D-сканирование зубных рядов (iTero)", customPriceRub: 5000, isDemoMode: isDemo },
			),
			createPlanItem(
				"opt-inlay16-preset",
				3,
				"stage_3_orthopedics",
				ORDER_804N_DICTIONARY.CeramicInlayEmax ?? {
					code: "A16.07.003",
					title: "Керамическая ультранирная вкладка/накладка IPS e.max CAD",
					category: "Ортопедия",
					defaultPriceRub: 30000,
					stageKind: "stage_3_orthopedics",
					stageNumber: 3,
					keywords: ["вкладка", "emax"],
					materialsDefault: "Ivoclar IPS e.max CAD, цемент Variolink",
				},
				16,
				catalog,
				validDiscountPct,
				{ customTitle: "Керамическая ультранирная вкладка IPS e.max CAD (зуб 16)", customPriceRub: 30000, isDemoMode: isDemo },
			),
			createPlanItem(
				"opt-crown46-preset",
				3,
				"stage_3_orthopedics",
				ORDER_804N_DICTIONARY.CrownZirconiaPrettau ?? {
					code: "A16.07.004",
					title: "Анатомическая коронка из монолитного диоксида циркония Prettau",
					category: "Ортопедия",
					defaultPriceRub: 30000,
					stageKind: "stage_3_orthopedics",
					stageNumber: 3,
					keywords: ["коронка", "цирконий", "prettau"],
					materialsDefault: "Zirkonzahn Prettau Zirconia, RelyX U200",
				},
				46,
				catalog,
				validDiscountPct,
				{ customTitle: "Анатомическая коронка из монолитного циркония Prettau (зуб 46)", customPriceRub: 30000, isDemoMode: isDemo },
			),
		];

		const stage1: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Этап 1: Неотложная терапия под микроскопом и санация",
			subtitle: "КЛКТ 3D, гигиена Air-Flow Plus, эндодонтия под микроскопом Leica и реставрации",
			clinicalGoal: "Биологическая герметизация каналов и сохранение жизнеспособности зубов",
			items: s1Items,
			totalRub: 65000,
			totalKopecks: 6500000 as Kopecks,
			estimatedVisits: 2,
			estimatedWeeks: 2,
			order804nCodes: Array.from(new Set(s1Items.map((i) => i.code804n))),
		};

		const stage2: TreatmentPlanStage = {
			stageNumber: 2,
			stageKind: "stage_2_surgery",
			title: "Этап 2: Хирургия и атравматичное удаление",
			subtitle: "Атравматичное удаление зуба с консервацией лунки биоматериалом",
			clinicalGoal: "Сохранение объема костной ткани альвеолярного гребня",
			items: s2Items,
			totalRub: 15000,
			totalKopecks: 1500000 as Kopecks,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			order804nCodes: Array.from(new Set(s2Items.map((i) => i.code804n))),
		};

		const stage3: TreatmentPlanStage = {
			stageNumber: 3,
			stageKind: "stage_3_orthopedics",
			title: "Этап 3: Ортопедическая реабилитация: вкладки и цирконий",
			subtitle: "3D-сканирование, керамическая ультранирная вкладка E.max и коронка Prettau",
			clinicalGoal: "Прецизионное микропротезирование и анатомическая окклюзия",
			items: s3Items,
			totalRub: 65000,
			totalKopecks: 6500000 as Kopecks,
			estimatedVisits: 2,
			estimatedWeeks: 3,
			order804nCodes: Array.from(new Set(s3Items.map((i) => i.code804n))),
		};

		return [stage1, stage2, stage3];
	}

	// optimum: Премиум (Выбор клиники): 380 000 ₽, 5+ лет гарантии, 16 нед / 8 виз.
	// Циркониевые коронки, имплантация Straumann/Osstem
	const s1Items: TreatmentPlanItem[] = [
		createPlanItem(
			"prem-diag-ct-preset",
			1,
			"stage_1_therapy",
			ORDER_804N_DICTIONARY.DiagnosticsCT ?? {
				code: "A06.07.012",
				title: "КЛКТ 3D-диагностика + цифровой анализ височно-нижнечелюстного сустава (ВНЧС)",
				category: "Диагностика",
				defaultPriceRub: 9000,
				stageKind: "stage_1_therapy",
				stageNumber: 1,
				keywords: ["клкт", "внчс"],
				materialsDefault: "КЛКТ Green X, аксиограф",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "КЛКТ 3D-диагностика + цифровой анализ височно-нижнечелюстного сустава (ВНЧС)", customPriceRub: 9000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-hyg-spa-preset",
			1,
			"stage_1_therapy",
			ORDER_804N_DICTIONARY.HygieneComplex ?? {
				code: "A16.07.051",
				title: "Премиальная SPA-профгигиена Clinpro + фотопротокол и полировка пастами",
				category: "Гигиена",
				defaultPriceRub: 11000,
				stageKind: "stage_1_therapy",
				stageNumber: 1,
				keywords: ["гигиена", "spa"],
				materialsDefault: "3M Clinpro Prophy, Air-Flow Master Piezon",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "Премиальная SPA-профгигиена Clinpro + фотопротокол и полировка", customPriceRub: 11000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-endo-zeiss-preset",
			1,
			"stage_1_therapy",
			ORDER_804N_DICTIONARY.EndoObturation3Canal ?? {
				code: "A16.07.008",
				title: "Эндодонтическое перелечивание каналов под микроскопом Carl Zeiss OPMI PROergo",
				category: "Терапия",
				defaultPriceRub: 35000,
				stageKind: "stage_1_therapy",
				stageNumber: 1,
				keywords: ["эндодонтия", "zeiss"],
				materialsDefault: "Carl Zeiss PROergo, биокерамика TotalFill BC",
			},
			16,
			catalog,
			validDiscountPct,
			{ customTitle: "Эндодонтическое лечение под микроскопом Carl Zeiss PROergo (зуб 16)", customPriceRub: 35000, isDemoMode: isDemo },
		),
	];

	const s2Items: TreatmentPlanItem[] = [
		createPlanItem(
			"prem-surg-template-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.SurgicalGuide3D ?? {
				code: "A16.07.040",
				title: "3D навигационный хирургический шаблон компьютерного позиционирования CAD/CAM",
				category: "Хирургия",
				defaultPriceRub: 20000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["шаблон", "навигационный"],
				materialsDefault: "Фотополимер Formlabs Dental SG",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "3D навигационный хирургический шаблон CAD/CAM", customPriceRub: 20000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-impl-straumann-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.ImplantStraumann ?? {
				code: "A16.07.054.001",
				title: "Дентальная имплантация Straumann Roxolid BLX / SLActive (Швейцария)",
				category: "Хирургия",
				defaultPriceRub: 90000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["straumann", "имплант"],
				materialsDefault: "Имплантат Straumann SLActive, заглушка",
			},
			36,
			catalog,
			validDiscountPct,
			{ customTitle: "Дентальная имплантация Straumann Roxolid BLX / SLActive (зуб 36)", customPriceRub: 90000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-impl-osstem-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.ImplantOsstem ?? {
				code: "A16.07.054.001",
				title: "Дентальная имплантация Osstem TS-III SA с микродизайном резьбы",
				category: "Хирургия",
				defaultPriceRub: 55000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["osstem", "имплант"],
				materialsDefault: "Имплантат Osstem TS-III SA",
			},
			46,
			catalog,
			validDiscountPct,
			{ customTitle: "Дентальная имплантация Osstem TS-III SA (зуб 46)", customPriceRub: 55000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-gbr-bioguide-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.BoneGraftingBiomaterial ?? {
				code: "A16.07.041",
				title: "Направленная костная регенерация (GBR): мембрана Geistlich Bio-Gide + графт Cerabone",
				category: "Хирургия",
				defaultPriceRub: 30000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["gbr", "кость", "биогайд"],
				materialsDefault: "Geistlich Bio-Gide, Botiss Cerabone, титановые пины",
			},
			36,
			catalog,
			validDiscountPct,
			{ customTitle: "Направленная костная регенерация (GBR): Bio-Gide + Cerabone (зуб 36)", customPriceRub: 30000, isDemoMode: isDemo },
		),
	];

	const s3Items: TreatmentPlanItem[] = [
		createPlanItem(
			"prem-abat-custom-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CustomAbutmentZirconia ?? {
				code: "A16.07.006",
				title: "Индивидуальные циркониевые абатменты на титановом основании (2 ед.)",
				category: "Ортопедия",
				defaultPriceRub: 40000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["абатмент", "цирконий"],
				materialsDefault: "Цирконий Katana + титановые основания Medentika",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "Индивидуальные циркониевые абатменты на титановом основании (2 ед.)", customPriceRub: 40000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-crown36-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CrownZirconiaPrettau ?? {
				code: "A16.07.004",
				title: "Высокоэстетичная коронка из диоксида циркония с послойным нанесением керамики",
				category: "Ортопедия",
				defaultPriceRub: 45000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["коронка", "цирконий"],
				materialsDefault: "Zirkonzahn Multi-Layered Zirconia, IPS Style",
			},
			36,
			catalog,
			validDiscountPct,
			{ customTitle: "Коронка из диоксида циркония с нанесением керамики (зуб 36)", customPriceRub: 45000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-crown46-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CrownZirconiaPrettau ?? {
				code: "A16.07.004",
				title: "Высокоэстетичная коронка из диоксида циркония с послойным нанесением керамики",
				category: "Ортопедия",
				defaultPriceRub: 45000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["коронка", "цирконий"],
				materialsDefault: "Zirkonzahn Multi-Layered Zirconia, IPS Style",
			},
			46,
			catalog,
			validDiscountPct,
			{ customTitle: "Коронка из диоксида циркония с нанесением керамики (зуб 46)", customPriceRub: 45000, isDemoMode: isDemo },
		),
	];

	const stage1: TreatmentPlanStage = {
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Диагностика экспертного класса и микроскопная эндодонтия",
		subtitle: "3D КЛКТ с аксиографией ВНЧС, SPA-гигиена Clinpro и терапия Carl Zeiss",
		clinicalGoal: "Устранение инфекции и подготовка к прецизионной имплантации",
		items: s1Items,
		totalRub: 55000,
		totalKopecks: 5500000 as Kopecks,
		estimatedVisits: 2,
		estimatedWeeks: 2,
		order804nCodes: Array.from(new Set(s1Items.map((i) => i.code804n))),
	};

	const stage2: TreatmentPlanStage = {
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		title: "Этап 2: Хирургия и дентальная имплантация Straumann / Osstem",
		subtitle: "3D навигационный шаблон, имплантация Straumann и Osstem, костная пластика GBR",
		clinicalGoal: "Восстановление утраченных опор зубного ряда дентальными имплантатами",
		items: s2Items,
		totalRub: 195000,
		totalKopecks: 19500000 as Kopecks,
		estimatedVisits: 3,
		estimatedWeeks: 10,
		order804nCodes: Array.from(new Set(s2Items.map((i) => i.code804n))),
	};

	const stage3: TreatmentPlanStage = {
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап 3: Прецизионная ортопедическая реконструкция цирконием",
		subtitle: "Индивидуальные циркониевые абатменты и коронки из многослойного диоксида циркония",
		clinicalGoal: "Полная эстетическая и окклюзионная реабилитация улыбки",
		items: s3Items,
		totalRub: 130000,
		totalKopecks: 13000000 as Kopecks,
		estimatedVisits: 3,
		estimatedWeeks: 4,
		order804nCodes: Array.from(new Set(s3Items.map((i) => i.code804n))),
	};

	return [stage1, stage2, stage3];
}

export function normalizeToothState(state: unknown): ToothState {
	if (!state || typeof state !== "string") return "Healthy";
	const trimmed = state.trim().toLowerCase();
	switch (trimmed) {
		case "caries":
		case "кариес":
			return "Caries";
		case "pulpitis":
		case "пульпит":
			return "Pulpitis";
		case "periodontitis":
		case "периодонтит":
			return "Periodontitis";
		case "missing":
		case "отсутствует":
		case "удален":
		case "удалён":
			return "Missing";
		case "crown":
		case "коронка":
			return "Crown";
		case "implant":
		case "имплант":
		case "имплантат":
			return "Implant";
		case "root":
		case "корень":
			return "Root";
		case "impacted":
		case "retained":
		case "дистопирован":
		case "дистопия":
		case "ретинирован":
		case "ретенция":
			return "Retained";
		case "filled":
		case "пломба":
			return "Filled";
		default:
			return "Healthy";
	}
}

export function hasToothDefect(t: ToothData): boolean {
	const normState = normalizeToothState(t.state);
	if (normState !== "Healthy" && normState !== "Filled") return true;
	if (Boolean(t.boneLossLevel && t.boneLossLevel > 0)) return true;
	if (Boolean(t.mobility && t.mobility > 0)) return true;
	if (Boolean(t.furcationGrade && t.furcationGrade > 0)) return true;
	return false;
}

export function generateTierPlanStages(
	tierId: TreatmentPlanTierId,
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	discountPercent: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));

	const effectiveTeeth =
		isDemo && (!teeth || teeth.length === 0 || !teeth.some(hasToothDefect))
			? DEMO_SHOWCASE_TEETH
			: teeth;

	const hasPathology = (effectiveTeeth || []).some(hasToothDefect);

	if (!hasPathology) {
		return getDefaultClinicalPresetStages(tierId, catalog, validDiscountPct, { isDemoMode: isDemo });
	}

	// Для тарифа Стандарт при наличии патологий используем базовый генератор
	if (tierId === "standard") {
		return generateTreatmentPlanStages(effectiveTeeth, catalog, discountPercent, { isDemoMode: isDemo });
	}

	const stage1Items: TreatmentPlanItem[] = [];
	const stage2Items: TreatmentPlanItem[] = [];
	const stage3Items: TreatmentPlanItem[] = [];

	let hasImplants = false;

	// КЛКТ диагностика и гигиена
	const defCT = ORDER_804N_DICTIONARY.DiagnosticsCT!;
	stage1Items.push(
		createPlanItem("s1-ct-diag", 1, "stage_1_therapy", defCT, undefined, catalog, validDiscountPct, { isDemoMode: isDemo }),
	);

	const defHygiene = ORDER_804N_DICTIONARY.HygieneComplex!;
	stage1Items.push(
		createPlanItem(
			"s1-hygiene",
			1,
			"stage_1_therapy",
			defHygiene,
			undefined,
			catalog,
			validDiscountPct,
			{
				customTitle:
					tierId === "optimum"
						? "Премиальная гигиена Air-Flow Plus с глицином + фторирование Clinpro"
						: "Базовая профессиональная гигиена и снятие зубного камня",
				isDemoMode: isDemo,
			},
		),
	);

	const missingUpper: number[] = [];
	const missingLower: number[] = [];

	for (const tooth of effectiveTeeth) {
		const num = tooth.toothNumber ?? (tooth as any).id ?? (tooth as any).number;
		if (typeof num !== "number" || !Number.isFinite(num)) continue;
		const state: ToothState = normalizeToothState(tooth.state);
		const isDeciduous = isDeciduousTooth(num);

		if (isDeciduous) {
			if (state === "Caries") {
				const defPed = ORDER_804N_DICTIONARY.PediatricCariesTherapy!;
				stage1Items.push(createPlanItem("s1-ped-" + num, 1, "stage_1_therapy", defPed, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			} else if (state === "Pulpitis") {
				const defPulp = ORDER_804N_DICTIONARY.PediatricPulpitisPulpotomy!;
				stage1Items.push(createPlanItem("s1-ped-pulp-" + num, 1, "stage_1_therapy", defPulp, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
				const defCrown = ORDER_804N_DICTIONARY.PediatricCrownSSC!;
				stage3Items.push(createPlanItem("s3-ped-crown-" + num, 3, "stage_3_orthopedics", defCrown, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			} else if (state === "Periodontitis" || state === "Root" || state === "Retained") {
				const defExt = ORDER_804N_DICTIONARY.PediatricExtraction!;
				stage2Items.push(createPlanItem("s2-ped-ext-" + num, 2, "stage_2_surgery", defExt, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			}
			continue;
		}

		if (state === "Missing") {
			const quadrant = Math.floor(num / 10);
			if (quadrant === 1 || quadrant === 2) missingUpper.push(num);
			else missingLower.push(num);
			continue;
		}

		if (state === "Root") {
			const defExt = ORDER_804N_DICTIONARY.SimpleExtraction!;
			stage2Items.push(
				createPlanItem(
					"s2-root-" + num,
					2,
					"stage_2_surgery",
					defExt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Атравматичное удаление корня зуба №" + num,
						isDemoMode: isDemo,
					},
				),
			);
			const quadrant = Math.floor(num / 10);
			if (quadrant === 1 || quadrant === 2) missingUpper.push(num);
			else missingLower.push(num);
			continue;
		}

		if (state === "Retained" || state === "Impacted") {
			const defComplexExt = ORDER_804N_DICTIONARY.ComplexExtraction!;
			if (tierId === "optimum") {
				stage2Items.push(
					createPlanItem(
						"s2-impacted-" + num,
						2,
						"stage_2_surgery",
						defComplexExt,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Пьезохирургическое атравматичное удаление ретенированного зуба №" + num + " под операционным микроскопом",
							customPriceRub: 15000,
							isDemoMode: isDemo,
						},
					),
				);
				const defBoneGraft = ORDER_804N_DICTIONARY.BoneGraftingSinusLift!;
				stage2Items.push(
					createPlanItem(
						"s2-bonegraft-" + num,
						2,
						"stage_2_surgery",
						defBoneGraft,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Направленная костная регенерация (GBR) лунки зуба №" + num + " (Geistlich Bio-Oss + биомембрана Bio-Gide)",
							isDemoMode: isDemo,
						},
					),
				);
			} else {
				stage2Items.push(
					createPlanItem(
						"s2-impacted-" + num,
						2,
						"stage_2_surgery",
						defComplexExt,
						num,
						catalog,
						validDiscountPct,
						{ isDemoMode: isDemo },
					),
				);
			}
			continue;
		}

		if (state === "Caries") {
			if (tierId === "economy") {
				const defCarEco = ORDER_804N_DICTIONARY.CariesTherapyEconomy!;
				stage1Items.push(
					createPlanItem(
						"s1-caries-eco-" + num,
						1,
						"stage_1_therapy",
						defCarEco,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Пломбирование зуба №" + num + " базовым световым композитом Gradia",
							isDemoMode: isDemo,
						},
					),
				);
			} else {
				// optimum: керамическая вкладка / накладка IPS e.max CAD в этап 3 (ортопедия)
				const defInlay = ORDER_804N_DICTIONARY.InlayOnlay!;
				stage3Items.push(
					createPlanItem(
						"s3-inlay-opt-" + num,
						3,
						"stage_3_orthopedics",
						defInlay,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Керамическая вкладка / накладка IPS e.max CAD на зуб №" + num,
							isDemoMode: isDemo,
						},
					),
				);
			}
		} else if (state === "Pulpitis" || state === "Periodontitis") {
			// Коффердам + Эндодонтия
			const defCofferdam = ORDER_804N_DICTIONARY.CofferdamIsolation!;
			stage1Items.push(createPlanItem("s1-cofferdam-" + num, 1, "stage_1_therapy", defCofferdam, num, catalog, validDiscountPct, { isDemoMode: isDemo }));

			const canalCount = extractCanalCount(tooth);
			const defPrep = getEndoPreparationProcedure(canalCount);
			stage1Items.push(
				createPlanItem(
					"s1-prep-" + num,
					1,
					"stage_1_therapy",
					defPrep,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle:
							tierId === "optimum"
								? "Обработка корневых каналов зуба №" + num + " под микроскопом Zeiss (" + canalCount + " кан.)"
								: "Инструментальная обработка каналов зуба №" + num + " (" + canalCount + " кан.)",
						isDemoMode: isDemo,
					},
				),
			);

			const defObt = getEndoObturationProcedure(canalCount);
			stage1Items.push(
				createPlanItem(
					"s1-obt-" + num,
					1,
					"stage_1_therapy",
					defObt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "3D-обтурация каналов зуба №" + num + " горячей гуттаперчей (" + canalCount + " кан.)",
						isDemoMode: isDemo,
					},
				),
			);

			const defBuildup = ORDER_804N_DICTIONARY.BuildupFiberPost!;
			stage1Items.push(createPlanItem("s1-buildup-" + num, 1, "stage_1_therapy", defBuildup, num, catalog, validDiscountPct, { isDemoMode: isDemo }));

			// Коронка на депульпированный моляр/премоляр
			if (isMolarOrPremolar(num)) {
				if (tierId === "economy") {
					const defMKK = ORDER_804N_DICTIONARY.CrownMetalCeramic!;
					stage3Items.push(
						createPlanItem(
							"s3-crown-mk-" + num,
							3,
							"stage_3_orthopedics",
							defMKK,
							num,
							catalog,
							validDiscountPct,
							{
								customTitle: "Металлокерамическая коронка на зуб №" + num,
								isDemoMode: isDemo,
							},
						),
					);
				} else {
					// optimum
					const defEmax = ORDER_804N_DICTIONARY.CrownEmaxCeramic!;
					stage3Items.push(
						createPlanItem(
							"s3-crown-emax-" + num,
							3,
							"stage_3_orthopedics",
							defEmax,
							num,
							catalog,
							validDiscountPct,
							{
								customTitle: "Премиальная керамическая коронка IPS e.max Press на зуб №" + num,
								isDemoMode: isDemo,
							},
						),
					);
				}
			}
		} else if (state === "Crown") {
			if (tierId === "economy") {
				const defMK = ORDER_804N_DICTIONARY.CrownMetalCeramic!;
				stage3Items.push(createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defMK, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			} else {
				const defEmax = ORDER_804N_DICTIONARY.CrownEmaxCeramic!;
				stage3Items.push(createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defEmax, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			}
		}
	}

	// Обработка адентии по тарифам
	function processTierMissingTeeth(jawSeq: readonly number[], missingList: number[], jawLabel: "верхней" | "нижней") {
		const missingSet = new Set(missingList);
		if (missingSet.size === 0) return;

		// Тотальная адентия (>10 зубов)
		if (missingSet.size > 10) {
			if (tierId === "economy") {
				// Эконом: Съемный пластиночный / бюгельный протез
				const defClasp = ORDER_804N_DICTIONARY.ClaspProsthesisEconomy!;
				stage3Items.push(
					createPlanItem(
						"s3-full-clasp-" + jawLabel,
						3,
						"stage_3_orthopedics",
						defClasp,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Полный съемный пластиночный протез (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);
			} else {
				// Оптимум: Протокол All-on-6 на швейцарских Straumann + циркониевый мост на балке
				hasImplants = true;
				const defGuide = ORDER_804N_DICTIONARY.AllOn4SurgicalGuide!;
				stage2Items.push(
					createPlanItem(
						"s2-allon6-guide-" + jawLabel,
						2,
						"stage_2_surgery",
						defGuide,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Прецизионный навигационный 3D-шаблон All-on-6 (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);

				const defAllOn6 = ORDER_804N_DICTIONARY.AllOn6Implantation!;
				stage2Items.push(
					createPlanItem(
						"s2-allon6-implants-" + jawLabel,
						2,
						"stage_2_surgery",
						defAllOn6,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Установка 6 премиальных имплантатов Straumann SLActive All-on-6 (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);

				const defMultiUnit = ORDER_804N_DICTIONARY.MultiUnitAbutment!;
				stage2Items.push(
					createPlanItem(
						"s2-allon6-multiunit-" + jawLabel,
						2,
						"stage_2_surgery",
						defMultiUnit,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Установка мультиюнит-абатментов Straumann (6 шт, " + jawLabel + " челюсть)",
							quantity: 6,
							isDemoMode: isDemo,
						},
					),
				);

				const defAllOn6Prosth = ORDER_804N_DICTIONARY.AllOn6Prosthesis!;
				stage3Items.push(
					createPlanItem(
						"s3-allon6-prosthesis-" + jawLabel,
						3,
						"stage_3_orthopedics",
						defAllOn6Prosth,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Высокоэстетичный циркониевый протез All-on-6 на титановой балке (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);
			}
			return;
		}

		// Локальная адентия
		const handled = new Set<number>();
		let i = 0;
		while (i < jawSeq.length) {
			const tNum = jawSeq[i]!;
			if (missingSet.has(tNum) && !handled.has(tNum)) {
				const currentSpan: number[] = [tNum];
				let j = i + 1;
				while (j < jawSeq.length && missingSet.has(jawSeq[j]!) && !handled.has(jawSeq[j]!)) {
					currentSpan.push(jawSeq[j]!);
					j++;
				}

				if (tierId === "economy") {
					// Эконом: удаление корня / подготовка лунки + мостовидные металлокерамические протезы
					for (const missingT of currentSpan) {
						handled.add(missingT);
						const defExt = ORDER_804N_DICTIONARY.SimpleExtraction!;
						stage2Items.push(
							createPlanItem(
								"s2-eco-ext-" + missingT,
								2,
								"stage_2_surgery",
								defExt,
								missingT,
								catalog,
								validDiscountPct,
								{
									customTitle: "Удаление разрушенного корня / подготовка альвеолы зуба №" + missingT,
									isDemoMode: isDemo,
								},
							),
						);
						const defEcoBridge = ORDER_804N_DICTIONARY.BridgeProsthesisEconomy!;
						stage3Items.push(
							createPlanItem(
								"s3-eco-bridge-" + missingT,
								3,
								"stage_3_orthopedics",
								defEcoBridge,
								missingT,
								catalog,
								validDiscountPct,
								{
									customTitle: "Восстановление дефекта зуба №" + missingT + " металлокерамическим мостовидным протезом",
									isDemoMode: isDemo,
								},
							),
						);
					}
					i = j;
					continue;
				}

				// Оптимум (Премиум):
				if (currentSpan.length === 3) {
					hasImplants = true;
					const [tooth1, tooth2, tooth3] = currentSpan as [number, number, number];
					handled.add(tooth1);
					handled.add(tooth2);
					handled.add(tooth3);

					const defGuide = ORDER_804N_DICTIONARY.SurgicalNavigationGuide!;
					stage2Items.push(
						createPlanItem("s2-guide-" + tooth1, 2, "stage_2_surgery", defGuide, tooth1, catalog, validDiscountPct, { isDemoMode: isDemo }),
					);

					const defImpPrem = ORDER_804N_DICTIONARY.DentalImplantationPremium!;
					stage2Items.push(
						createPlanItem(
							"s2-imp-opt-" + tooth1,
							2,
							"stage_2_surgery",
							defImpPrem,
							tooth1,
							catalog,
							validDiscountPct,
							{
								customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + tooth1,
								isDemoMode: isDemo,
							},
						),
					);
					stage2Items.push(
						createPlanItem(
							"s2-imp-opt-" + tooth3,
							2,
							"stage_2_surgery",
							defImpPrem,
							tooth3,
							catalog,
							validDiscountPct,
							{
								customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + tooth3,
								isDemoMode: isDemo,
							},
						),
					);

					const defBridge = ORDER_804N_DICTIONARY.BridgeProsthesis!;
					stage3Items.push(
						createPlanItem(
							"s3-bridge-opt-" + tooth1 + "-" + tooth3,
							3,
							"stage_3_orthopedics",
							defBridge,
							tooth1,
							catalog,
							validDiscountPct,
							{
								customTitle: "Премиальный мостовидный протез E.max / Katana UTML на 2 имплантатах Straumann (№" + tooth1 + ", №" + tooth2 + ", №" + tooth3 + ")",
								relatedToothNumbers: [tooth1, tooth2, tooth3],
								isDemoMode: isDemo,
							},
						),
					);
					i = j;
					continue;
				}

				// Одиночные дефекты в Оптимум: Straumann + Ti-Base абатмент + коронка Katana/E.max
				for (const missingT of currentSpan) {
					hasImplants = true;
					handled.add(missingT);

					const defGuide = ORDER_804N_DICTIONARY.SurgicalNavigationGuide!;
					stage2Items.push(
						createPlanItem("s2-guide-" + missingT, 2, "stage_2_surgery", defGuide, missingT, catalog, validDiscountPct, { isDemoMode: isDemo }),
					);

					const defImpPrem = ORDER_804N_DICTIONARY.DentalImplantationPremium!;
					stage2Items.push(
						createPlanItem(
							"s2-imp-opt-" + missingT,
							2,
							"stage_2_surgery",
							defImpPrem,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + missingT,
								isDemoMode: isDemo,
							},
						),
					);

					const defImpCrownPrem = ORDER_804N_DICTIONARY.ImplantCrownPremium!;
					stage3Items.push(
						createPlanItem(
							"s3-imp-crown-opt-" + missingT,
							3,
							"stage_3_orthopedics",
							defImpCrownPrem,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Протезирование на имплантате: индивидуальный Ti-Base абатмент + коронка Katana/E.max (№" + missingT + ")",
								isDemoMode: isDemo,
							},
						),
					);
				}
				i = j;
				continue;
			}
			i++;
		}
	}

	processTierMissingTeeth(UPPER_ARCH_TEETH, missingUpper, "верхней");
	processTierMissingTeeth(LOWER_ARCH_TEETH, missingLower, "нижней");

	// 3D-сканирование в Этап 3
	if (stage3Items.length > 0) {
		const defScan = ORDER_804N_DICTIONARY.IntraoralScanning3D!;
		stage3Items.unshift(createPlanItem("s3-scan", 3, "stage_3_orthopedics", defScan, undefined, catalog, validDiscountPct, { isDemoMode: isDemo }));
	}

	const s1TotalKopecks = sumKopecks(stage1Items.map((it) => parseKopecks(it.priceRub)));
	const s1Total = Math.round(s1TotalKopecks / 100);
	const s2TotalKopecks = sumKopecks(stage2Items.map((it) => parseKopecks(it.priceRub)));
	const s2Total = Math.round(s2TotalKopecks / 100);
	const s3TotalKopecks = sumKopecks(stage3Items.map((it) => parseKopecks(it.priceRub)));
	const s3Total = Math.round(s3TotalKopecks / 100);

	const stage1: TreatmentPlanStage = {
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Неотложная терапия и санация",
		subtitle:
			tierId === "optimum"
				? "Лечение под микроскопом Leica, КЛКТ 3D-диагностика, швейцарская гигиена Air-Flow и реставрации."
				: "Базовая терапия, устранение боли, гигиена и пломбирование.",
		clinicalGoal: "Устранение очагов воспаления и санация кариозных поражений.",
		items: stage1Items,
		totalRub: s1Total,
		totalKopecks: s1TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage1Items.length / 2)),
		estimatedWeeks: 2,
		order804nCodes: Array.from(new Set(stage1Items.map((i) => i.code804n))),
	};

	const stage2: TreatmentPlanStage = {
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		title: "Этап 2: Хирургия и имплантация",
		subtitle: hasImplants
			? "Дентальная имплантация по 3D-шаблону. Включает период остеоинтеграции (3–6 месяцев)."
			: "Хирургическая санация полости рта.",
		clinicalGoal: "Установка дентальных имплантатов и подготовка костного ложа.",
		items: stage2Items,
		totalRub: s2Total,
		totalKopecks: s2TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage2Items.length / 2)),
		estimatedWeeks: hasImplants ? 16 : 2,
		order804nCodes: Array.from(new Set(stage2Items.map((i) => i.code804n))),
	};

	const stage3: TreatmentPlanStage = {
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle:
			tierId === "optimum"
				? "Цифровой 3D-скан TRIOS, индивидуальные Ti-Base абатменты и премиальные коронки IPS e.max / Katana."
				: "Ортопедическое восстановление зубов и мостовидных протезов.",
		clinicalGoal: "Анатомическое протезирование и окклюзионная реабилитация.",
		items: stage3Items,
		totalRub: s3Total,
		totalKopecks: s3TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage3Items.length / 2)),
		estimatedWeeks: 4,
		order804nCodes: Array.from(new Set(stage3Items.map((i) => i.code804n))),
	};

	return [stage1, stage2, stage3];
}
