/**
 * clinicalPresets.ts — Layer 1: Клинические пресеты этапов планов («Эконом», «Стандарт», «Оптимальный»).
 */

import { type Kopecks } from "@dental/shared";
import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTierId } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import { isDemoShowcaseMode } from "../treatmentPlanAutoGenerator";
import { ORDER_804N_DICTIONARY } from "../treatmentPlanNomenclature804n";
import { createPlanItem } from "../treatmentPlanItemFactory";

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
