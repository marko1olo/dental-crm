import type { TreatmentPlanItem, TreatmentPlanStage } from "../../types";
import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";
import { ORDER_804N_DICTIONARY } from "../../treatmentPlanProcedures";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import { buildPresetStage } from "./presetStageBuilder";

/**
 * getPremiumPresetStages — Премиальный клинический протокол DENTE CRM (SSOT).
 * Мандат 8e: Полная дифференциация материалов премиум-класса (Straumann SLActive, Prettau, Carl Zeiss, Ti-Base).
 * DEF-05: Ликвидация клонирования — честные премиальные услуги, материалы и честный расчет стоимости.
 */
export function getPremiumPresetStages(
	catalog?: readonly CatalogServiceLookupItem[],
	validDiscountPct: number = 0,
	isDemo: boolean = false,
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	// Этап 1: Премиальная диагностика, гигиена и микроскопная эндодонтия Carl Zeiss
	const s1Items: TreatmentPlanItem[] = [
		createPlanItem(
			"prem-diag-ct-preset",
			1,
			"stage_1_therapy",
			ORDER_804N_DICTIONARY.DiagnosticsCT ?? {
				code: "A06.07.012",
				title: "КЛКТ 3D-диагностика + цифровой анализ височно-нижнечелюстного сустава (ВНЧС)",
				category: "Диагностика",
				defaultPriceRub: 12000,
				stageKind: "stage_1_therapy",
				stageNumber: 1,
				keywords: ["клкт", "внчс", "томография"],
				materialsDefault: "КЛКТ Green X, электронная аксиография Freecorder",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "КЛКТ 3D-диагностика + цифровой аксиографический анализ ВНЧС", customPriceRub: 12000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-hyg-spa-preset",
			1,
			"stage_1_therapy",
			ORDER_804N_DICTIONARY.HygieneComplex ?? {
				code: "A16.07.051",
				title: "Премиальная SPA-профгигиена Clinpro Air-Flow Master + фотопротокол",
				category: "Гигиена",
				defaultPriceRub: 14000,
				stageKind: "stage_1_therapy",
				stageNumber: 1,
				keywords: ["гигиена", "spa", "clinpro"],
				materialsDefault: "3M Clinpro Prophy, Air-Flow Master Piezon, фторирование Tooth Mousse",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "Премиальная SPA-профгигиена Clinpro Air-Flow Master + фотопротокол", customPriceRub: 14000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-endo-zeiss-preset",
			1,
			"stage_1_therapy",
			ORDER_804N_DICTIONARY.EndoObturation3Canal ?? {
				code: "A16.07.008",
				title: "Эндодонтическое лечение под микроскопом Carl Zeiss PROergo (3D-обтурация биокерамикой)",
				category: "Терапия",
				defaultPriceRub: 42000,
				stageKind: "stage_1_therapy",
				stageNumber: 1,
				keywords: ["эндодонтия", "zeiss", "микроскоп"],
				materialsDefault: "Carl Zeiss PROergo, биокерамический силер TotalFill BC",
			},
			16,
			catalog,
			validDiscountPct,
			{ customTitle: "Прецизионная эндодонтия под микроскопом Carl Zeiss PROergo с биокерамикой (зуб 16)", customPriceRub: 42000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-inlay-emax-preset",
			1,
			"stage_1_therapy",
			ORDER_804N_DICTIONARY.InlayOnlay ?? {
				code: "A16.07.003",
				title: "Восстановление зуба керамической накладкой IPS e.max Inlay/Onlay CAD/CAM",
				category: "Ортопедия",
				defaultPriceRub: 28000,
				stageKind: "stage_1_therapy",
				stageNumber: 1,
				keywords: ["inlay", "onlay", "вкладка", "emax"],
				materialsDefault: "Прессованная стеклокерамика дисиликата лития IPS e.max",
			},
			15,
			catalog,
			validDiscountPct,
			{ customTitle: "Керамическая накладка IPS e.max Inlay/Onlay CAD/CAM микропрепарирование (зуб 15)", customPriceRub: 28000, isDemoMode: isDemo },
		),
	];

	// Этап 2: Навигационная хирургия и дентальная имплантация Straumann BLX / SLActive
	const s2Items: TreatmentPlanItem[] = [
		createPlanItem(
			"prem-surg-template-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.SurgicalGuide3D ?? {
				code: "A16.07.040",
				title: "3D навигационный хирургический шаблон компьютерного позиционирования CAD/CAM",
				category: "Хирургия",
				defaultPriceRub: 25000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["шаблон", "навигационный", "formlabs"],
				materialsDefault: "Фотополимер Formlabs Dental SG, титановые направляющие втулки",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "3D хирургический навигационный шаблон компьютерного позиционирования CAD/CAM", customPriceRub: 25000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-impl-straumann-36-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.ImplantStraumann ?? {
				code: "A16.07.054.001",
				title: "Дентальная имплантация Straumann Roxolid BLX / SLActive (Швейцария)",
				category: "Хирургия",
				defaultPriceRub: 95000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["straumann", "roxolid", "slactive", "имплант"],
				materialsDefault: "Имплантат Straumann Roxolid SLActive, формирователь десны",
			},
			36,
			catalog,
			validDiscountPct,
			{ customTitle: "Дентальная имплантация Straumann Roxolid SLActive с гидрофильной поверхностью (зуб 36)", customPriceRub: 95000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-impl-straumann-46-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.ImplantStraumann ?? {
				code: "A16.07.054.001",
				title: "Дентальная имплантация Straumann Roxolid BLX / SLActive (Швейцария)",
				category: "Хирургия",
				defaultPriceRub: 95000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["straumann", "roxolid", "slactive", "имплант"],
				materialsDefault: "Имплантат Straumann Roxolid SLActive, формирователь десны",
			},
			46,
			catalog,
			validDiscountPct,
			{ customTitle: "Дентальная имплантация Straumann Roxolid SLActive с гидрофильной поверхностью (зуб 46)", customPriceRub: 95000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-gbr-bioguide-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.BoneGraftingBiomaterial ?? {
				code: "A16.07.041",
				title: "Направленная костная регенерация (GBR): биоматериал Geistlich Bio-Oss + мембрана Bio-Gide",
				category: "Хирургия",
				defaultPriceRub: 40000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["gbr", "кость", "bio-oss", "bio-gide"],
				materialsDefault: "Geistlich Bio-Gide, Geistlich Bio-Oss, титановые пины",
			},
			36,
			catalog,
			validDiscountPct,
			{ customTitle: "Направленная костная регенерация (GBR): Geistlich Bio-Oss + Bio-Gide (зуб 36)", customPriceRub: 40000, isDemoMode: isDemo },
		),
	];

	// Этап 3: Прецизионная ортопедическая реконструкция диоксидом циркония Prettau Anterior и Ti-Base
	const s3Items: TreatmentPlanItem[] = [
		createPlanItem(
			"prem-abat-custom-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CustomAbutmentZirconia ?? {
				code: "A16.07.006",
				title: "Индивидуальные циркониевые абатменты CAD/CAM на титановом основании Ti-Base Medentika (2 ед.)",
				category: "Ортопедия",
				defaultPriceRub: 50000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["абатмент", "цирконий", "ti-base", "medentika"],
				materialsDefault: "Диоксид циркония Katana + титановые основания Medentika Ti-Base",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "Индивидуальные циркониевые абатменты CAD/CAM на основании Ti-Base Medentika (2 ед.)", customPriceRub: 50000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-crown36-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CrownZirconiaPrettau ?? {
				code: "A16.07.004",
				title: "Высокоэстетичная коронка из ультрапрозрачного диоксида циркония Prettau Anterior с керамикой IPS e.max Ceram",
				category: "Ортопедия",
				defaultPriceRub: 55000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["коронка", "цирконий", "prettau", "zirkonzahn"],
				materialsDefault: "Zirkonzahn Prettau Anterior Multi-Layered Zirconia, IPS e.max Ceram",
			},
			36,
			catalog,
			validDiscountPct,
			{ customTitle: "Коронка из ультрапрозрачного диоксида циркония Prettau Anterior с керамикой IPS e.max (зуб 36)", customPriceRub: 55000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-crown46-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CrownZirconiaPrettau ?? {
				code: "A16.07.004",
				title: "Высокоэстетичная коронка из ультрапрозрачного диоксида циркония Prettau Anterior с керамикой IPS e.max Ceram",
				category: "Ортопедия",
				defaultPriceRub: 55000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["коронка", "цирконий", "prettau", "zirkonzahn"],
				materialsDefault: "Zirkonzahn Prettau Anterior Multi-Layered Zirconia, IPS e.max Ceram",
			},
			46,
			catalog,
			validDiscountPct,
			{ customTitle: "Коронка из ультрапрозрачного диоксида циркония Prettau Anterior с керамикой IPS e.max (зуб 46)", customPriceRub: 55000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-veneer11-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CrownEmaxCeramic ?? {
				code: "A16.07.004.002",
				title: "Высокоэстетичный винир / коронка IPS e.max Press индивидуального послойного нанесения мастера-керамиста",
				category: "Ортопедия",
				defaultPriceRub: 45000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["винир", "emax", "керамика", "эстетика"],
				materialsDefault: "Прессованная стеклокерамика дисиликата лития IPS e.max Press, глазурь Ivoclar",
			},
			11,
			catalog,
			validDiscountPct,
			{ customTitle: "Высокоэстетичный керамический винир IPS e.max Press послойного нанесения (зуб 11)", customPriceRub: 45000, isDemoMode: isDemo },
		),
	];

	const stage1 = buildPresetStage(
		1,
		"stage_1_therapy",
		"Этап 1: Экспертная 3D-диагностика, SPA-гигиена и микроскопная эндодонтия Carl Zeiss",
		"КЛКТ 3D с аксиографией ВНЧС, SPA-гигиена Clinpro Air-Flow Master, микроскоп Carl Zeiss и накладка IPS e.max",
		"Полная санация очагов инфекции и подготовка к навигационной имплантации",
		s1Items,
		96000,
		2,
		2,
	);

	const stage2 = buildPresetStage(
		2,
		"stage_2_surgery",
		"Этап 2: Навигационная хирургия и дентальная имплантация Straumann Roxolid SLActive",
		"3D навигационный хирургический шаблон Formlabs, 2 имплантата Straumann Roxolid SLActive, аугментация Bio-Oss",
		"Прецизионное анатомическое восстановление утраченных опор зубного ряда с пожизненной гарантией",
		s2Items,
		255000,
		3,
		10,
	);

	const stage3 = buildPresetStage(
		3,
		"stage_3_orthopedics",
		"Этап 3: Тотальная эстетическая реабилитация цирконием Prettau Anterior и Ti-Base",
		"Индивидуальные абатменты Ti-Base Medentika, коронки Zirkonzahn Prettau Anterior и винир IPS e.max",
		"Идеальная гармония улыбки, естественная полупрозрачность эмали и долговечная окклюзионная стабильность",
		s3Items,
		205000,
		3,
		4,
	);

	return [stage1, stage2, stage3];
}
