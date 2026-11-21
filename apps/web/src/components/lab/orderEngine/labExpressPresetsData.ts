/**
 * labExpressPresetsData.ts — Canonical Express Presets for Chairside Dental Lab Orders.
 * Consolidated into orderEngine/ per Mandate 8b.
 */

export interface ExpressLabPreset {
	readonly id: string;
	readonly title: string;
	readonly shortDesc: string;
	readonly constructionType: string;
	readonly materialId: string;
	readonly colorVita: string;
	readonly workingDays: number;
	readonly priceRub: number;
	readonly labCostRub: number;
	readonly patientPriceRub: number;
	readonly patientPriceKopecks: number;
	readonly labCostKopecks: number;
	readonly occlusalScheme: string;
	readonly contactTightness: string;
	readonly surfaceTexture: string;
	readonly cementGapMicrons: number;
	readonly impressionType?: string | undefined;
	readonly badge: string;
	readonly implantSystem?: string | undefined;
	readonly abutmentType?: string | undefined;
	readonly toothFdi?: string | undefined;
	readonly isFullArchOrJaw?: boolean | undefined;
}

export const EXPRESS_PRESET_ZIRCONIA_CROWN: ExpressLabPreset = {
	id: "zirconia_crown_express",
	title: "Коронка диоксид циркония (Katana STML) — стандарт",
	shortDesc:
		"Анатомическая форма Katana STML, контакт 50 мкм, зазор под цемент 30 мкм, цвет VITA A2, 5 раб. дней (24 000 ₽ / 7 500 ₽)",
	constructionType: "single_crown",
	materialId: "zirconia_multilayer",
	colorVita: "A2",
	workingDays: 5,
	priceRub: 24000,
	labCostRub: 7500,
	patientPriceRub: 24000,
	patientPriceKopecks: 2400000,
	labCostKopecks: 750000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	impressionType: "a_silicone",
	badge: "Katana STML (5 дн.)",
};

export const EXPRESS_PRESET_PMMA_TEMPORARY: ExpressLabPreset = {
	id: "pmma_temporary_express",
	title: "Временная фрезерованная коронка PMMA",
	shortDesc:
		"Фрезерованная провизорная пластмасса CAD/CAM PMMA, зазор 40 мкм, срок 2 раб. дня (3 500 ₽ / 1 200 ₽)",
	constructionType: "single_crown",
	materialId: "pmma_temporary",
	colorVita: "A2",
	workingDays: 2,
	priceRub: 3500,
	labCostRub: 1200,
	patientPriceRub: 3500,
	patientPriceKopecks: 350000,
	labCostKopecks: 120000,
	occlusalScheme: "group_function",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 40,
	impressionType: "a_silicone",
	badge: "PMMA CAD/CAM (2 дн.)",
};

export const EXPRESS_PRESET_PFM_DUCERAM: ExpressLabPreset = {
	id: "pfm_duceram_express",
	title: "Металлокерамическая коронка (Duceram Plus) — классика",
	shortDesc:
		"Металлокерамика Co-Cr (Duceram Plus), цвет VITA A2, зазор 40 мкм, срок 7 раб. дней (15 000 ₽ / 5 000 ₽)",
	constructionType: "single_crown",
	materialId: "pfm_cocr",
	colorVita: "A2",
	workingDays: 7,
	priceRub: 15000,
	labCostRub: 5000,
	patientPriceRub: 15000,
	patientPriceKopecks: 1500000,
	labCostKopecks: 500000,
	occlusalScheme: "group_function",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 40,
	impressionType: "a_silicone",
	badge: "МК Duceram (7 дн.)",
};

export const EXPRESS_PRESET_IMPLANT_SCREW_RETAINED: ExpressLabPreset = {
	id: "implant_screw_retained_express",
	title: "Коронка на имплантате с винтовой фиксацией (Multi-unit / титановое основание)",
	shortDesc:
		"Винтовая фиксация: ZrO2 + Ti-Base / Multi-unit, зазор 30 мкм, срок 7 раб. дней (38 000 ₽ / 13 000 ₽)",
	constructionType: "implant_abutment",
	materialId: "titanium_custom_abutment",
	implantSystem: "Osstem TS III (SA / CA)",
	abutmentType: "Ti-Base (Титановое основание / Multi-unit)",
	colorVita: "A2",
	workingDays: 7,
	priceRub: 38000,
	labCostRub: 13000,
	patientPriceRub: 38000,
	patientPriceKopecks: 3800000,
	labCostKopecks: 1300000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	impressionType: "digital_scan_stl_ply",
	badge: "Винтовая Ti-Base (7 дн.)",
};

export const EXPRESS_PRESET_BRUXISM_SPLINT: ExpressLabPreset = {
	id: "bruxism_splint_guard",
	title: "Каппа от бруксизма / Сплинт (3 дня)",
	shortDesc:
		'Каппа от бруксизма / Сплинт (3 дня, 15 000 ₽ / 4 500 ₽, без привязки к одиночным зубам: toothFdi: "Общий наряд / Челюсть")',
	constructionType: "aligner_nightguard",
	materialId: "biocompatible_3d_resin",
	colorVita: "A2",
	workingDays: 3,
	priceRub: 15000,
	labCostRub: 4500,
	patientPriceRub: 15000,
	patientPriceKopecks: 1500000,
	labCostKopecks: 450000,
	toothFdi: "Общий наряд / Челюсть",
	isFullArchOrJaw: true,
	occlusalScheme: "balanced_articulation",
	contactTightness: "normal",
	surfaceTexture: "satin_semi_matte",
	cementGapMicrons: 0,
	impressionType: "a_silicone",
	badge: "Сплинт / Каппа (3 дн.)",
};

export const EXPRESS_PRESET_CUSTOM_ABUTMENT: ExpressLabPreset = {
	id: "custom_abutment_zirconia",
	title: "Индивидуальный абатмент Ti-Base + коронка ZrO2 (7 дней)",
	shortDesc:
		"Индивидуальный абатмент Ti-Base + коронка ZrO2 (7 дней, 35 000 ₽ / 12 000 ₽)",
	constructionType: "implant_abutment",
	materialId: "titanium_custom_abutment",
	implantSystem: "Osstem TS III (SA / CA)",
	abutmentType: "Ti-Base (Титановое основание)",
	colorVita: "A2",
	workingDays: 7,
	priceRub: 35000,
	labCostRub: 12000,
	patientPriceRub: 35000,
	patientPriceKopecks: 3500000,
	labCostKopecks: 1200000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	impressionType: "digital_scan_stl_ply",
	badge: "Ti-Base + ZrO2 (7 дн.)",
};

export const EXPRESS_PRESET_REMOVABLE_ACRY_FREE: ExpressLabPreset = {
	id: "removable_acry_free",
	title: "Съемный нейлоновый протез Acry-Free / Квадротти (8 дней)",
	shortDesc:
		"Съемный нейлоновый протез Acry-Free / Квадротти (8 дней, 45 000 ₽ / 16 000 ₽)",
	constructionType: "clasp_denture",
	materialId: "acry_free_nylon",
	colorVita: "A2",
	workingDays: 8,
	priceRub: 45000,
	labCostRub: 16000,
	patientPriceRub: 45000,
	patientPriceKopecks: 4500000,
	labCostKopecks: 1600000,
	toothFdi: "Общий наряд / Челюсть",
	isFullArchOrJaw: true,
	occlusalScheme: "balanced_articulation",
	contactTightness: "normal",
	surfaceTexture: "high_gloss_glaze",
	cementGapMicrons: 50,
	impressionType: "a_silicone",
	badge: "Acry-Free (8 дн.)",
};

export const EXPRESS_PRESET_REMOVABLE_NYLON = EXPRESS_PRESET_REMOVABLE_ACRY_FREE;

export const EXPRESS_PRESET_EMAX_CROWN: ExpressLabPreset = {
	id: "emax_crown_express",
	title: "Коронка E.max CAD / Press",
	shortDesc:
		"Дисиликат лития E.max, цвет VITA A2, зазор 30 мкм, срок 5 раб. дней (22 000 ₽ / 6 500 ₽)",
	constructionType: "single_crown",
	materialId: "emax_lithium_disilicate",
	colorVita: "A2",
	workingDays: 5,
	priceRub: 22000,
	labCostRub: 6500,
	patientPriceRub: 22000,
	patientPriceKopecks: 2200000,
	labCostKopecks: 650000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	impressionType: "a_silicone",
	badge: "E.max (5 дн.)",
};

export const EXPRESS_PRESET_BRIDGE_ZIRCONIA: ExpressLabPreset = {
	id: "bridge_zirconia_express",
	title: "Мостовидный протез ZrO2",
	shortDesc:
		"Диоксид циркония Multi-Layer, цвет VITA A2, зазор 30 мкм, срок 7 раб. дней (48 000 ₽ / 15 000 ₽)",
	constructionType: "bridge",
	materialId: "zirconia_multilayer",
	colorVita: "A2",
	workingDays: 7,
	priceRub: 48000,
	labCostRub: 15000,
	patientPriceRub: 48000,
	patientPriceKopecks: 4800000,
	labCostKopecks: 1500000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	impressionType: "a_silicone",
	badge: "Мост ZrO2 (7 дн.)",
};

export const EXPRESS_PRESET_EMAX_INLAY: ExpressLabPreset = {
	id: "emax_inlay_express",
	title: "Вкладка E.max (Inlay/Onlay)",
	shortDesc:
		"Дисиликат лития IPS e.max Press, цвет VITA A2, зазор 20 мкм, срок 5 раб. дней (18 000 ₽ / 5 500 ₽)",
	constructionType: "inlay_onlay",
	materialId: "emax_lithium_disilicate",
	colorVita: "A2",
	workingDays: 5,
	priceRub: 18000,
	labCostRub: 5500,
	patientPriceRub: 18000,
	patientPriceKopecks: 1800000,
	labCostKopecks: 550000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 20,
	impressionType: "a_silicone",
	badge: "Вкладка E.max (5 дн.)",
};

export const CANONICAL_EXPRESS_LAB_PRESETS: readonly ExpressLabPreset[] = [
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_IMPLANT_SCREW_RETAINED,
	EXPRESS_PRESET_BRUXISM_SPLINT,
	EXPRESS_PRESET_CUSTOM_ABUTMENT,
	EXPRESS_PRESET_REMOVABLE_ACRY_FREE,
] as const;

export const EXTENDED_PRESETS: readonly ExpressLabPreset[] = [
	{
		id: "zirconia_a2_std",
		title: "Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней",
		shortDesc: "Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней",
		constructionType: "single_crown",
		materialId: "zirconia_multilayer",
		colorVita: "A2",
		workingDays: 5,
		priceRub: 24000,
		labCostRub: 7500,
		patientPriceRub: 24000,
		patientPriceKopecks: 2400000,
		labCostKopecks: 750000,
		occlusalScheme: "mutually_protected",
		contactTightness: "normal",
		surfaceTexture: "natural_anatomy",
		cementGapMicrons: 30,
		badge: "Стандарт (5 дней)",
	},
	{
		id: "zirconia_a2",
		title: "Коронка ZrO2 A2 (5 дней)",
		shortDesc: "Диоксид циркония Multi-layer, цвет VITA A2, анатомическая форма, срок 5 рабочих дней",
		constructionType: "single_crown",
		materialId: "zirconia_multilayer",
		colorVita: "A2",
		workingDays: 5,
		priceRub: 24000,
		labCostRub: 7500,
		patientPriceRub: 24000,
		patientPriceKopecks: 2400000,
		labCostKopecks: 750000,
		occlusalScheme: "mutually_protected",
		contactTightness: "normal",
		surfaceTexture: "natural_anatomy",
		cementGapMicrons: 30,
		badge: "Топ выбор",
	},
	{
		id: "emax_a2",
		title: "Коронка E.max A2 (5 дней)",
		shortDesc: "Прессованная керамика E.max Press, цвет VITA A2, срок 5 рабочих дней",
		constructionType: "single_crown",
		materialId: "emax_lithium_disilicate",
		colorVita: "A2",
		workingDays: 5,
		priceRub: 26000,
		labCostRub: 8500,
		patientPriceRub: 26000,
		patientPriceKopecks: 2600000,
		labCostKopecks: 850000,
		occlusalScheme: "mutually_protected",
		contactTightness: "normal",
		surfaceTexture: "natural_anatomy",
		cementGapMicrons: 30,
		badge: "Эстетика",
	},
	{
		id: "pfm_cocr_a2",
		title: "Металлокерамика CoCr A2 (7 дней)",
		shortDesc: "Металлокерамическая коронка CoCr, цвет VITA A2, срок 7 рабочих дней",
		constructionType: "single_crown",
		materialId: "pfm_cocr",
		colorVita: "A2",
		workingDays: 7,
		priceRub: 15000,
		labCostRub: 5000,
		patientPriceRub: 15000,
		patientPriceKopecks: 1500000,
		labCostKopecks: 500000,
		occlusalScheme: "group_function",
		contactTightness: "normal",
		surfaceTexture: "natural_anatomy",
		cementGapMicrons: 40,
		badge: "Классика",
	},
	{
		id: "removable_clasp",
		title: "Съемный протез бюгельный (10 дней)",
		shortDesc: "Бюгельный / частично-съемный протез с кламмерами, срок 10 рабочих дней",
		constructionType: "clasp_denture",
		materialId: "cobalt_chrome_cocr",
		colorVita: "A2",
		workingDays: 10,
		priceRub: 32000,
		labCostRub: 11000,
		patientPriceRub: 32000,
		patientPriceKopecks: 3200000,
		labCostKopecks: 1100000,
		occlusalScheme: "balanced_articulation",
		contactTightness: "normal",
		surfaceTexture: "natural_anatomy",
		cementGapMicrons: 50,
		badge: "Съемный",
	},
	{
		id: "pmma_temp",
		title: "Временная PMMA (2 дня)",
		shortDesc: "Фрезерованная провизорная пластмасса CAD/CAM, цвет VITA A2, срок 2 дня",
		constructionType: "single_crown",
		materialId: "pmma_temporary",
		colorVita: "A2",
		workingDays: 2,
		priceRub: 1500,
		labCostRub: 600,
		patientPriceRub: 1500,
		patientPriceKopecks: 150000,
		labCostKopecks: 60000,
		occlusalScheme: "group_function",
		contactTightness: "normal",
		surfaceTexture: "smooth",
		cementGapMicrons: 40,
		badge: "Срочно",
	},
	{
		id: "core_post_cocr",
		title: "Культевая вкладка КХС (3 дня)",
		shortDesc: "Штифтовая культевая вкладка CoCr (КХС) под коронку, срок 3 дня",
		constructionType: "core_buildup_post",
		materialId: "cobalt_chrome_cocr",
		colorVita: "A2",
		workingDays: 3,
		priceRub: 2500,
		labCostRub: 1000,
		patientPriceRub: 2500,
		patientPriceKopecks: 250000,
		labCostKopecks: 100000,
		occlusalScheme: "group_function",
		contactTightness: "normal",
		surfaceTexture: "smooth",
		cementGapMicrons: 50,
		badge: "База",
	},
	{
		id: "warranty_rework_free",
		title: "Гарантийная переделка (0 ₽ / 4 дня)",
		shortDesc: "Бесплатная гарантийная доработка / переделка скола или прилегания (0 ₽ для пациента)",
		constructionType: "single_crown",
		materialId: "zirconia_multilayer",
		colorVita: "A2",
		workingDays: 4,
		priceRub: 0,
		labCostRub: 0,
		patientPriceRub: 0,
		patientPriceKopecks: 0,
		labCostKopecks: 0,
		occlusalScheme: "mutually_protected",
		contactTightness: "normal",
		surfaceTexture: "natural_anatomy",
		cementGapMicrons: 30,
		badge: "Гарантия (0 ₽)",
	},
];

export const EXPRESS_LAB_PRESETS: ExpressLabPreset[] = [
	...CANONICAL_EXPRESS_LAB_PRESETS,
	...EXTENDED_PRESETS,
];

export const MODAL_EXPRESS_LAB_PRESETS: readonly ExpressLabPreset[] = [
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA,
	EXPRESS_PRESET_EMAX_INLAY,
	EXPRESS_PRESET_EMAX_CROWN,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	...EXPRESS_LAB_PRESETS.filter(
		(p) =>
			p.id !== "zirconia_crown_express" &&
			p.id !== "bridge_zirconia_express" &&
			p.id !== "emax_inlay_express" &&
			p.id !== "pfm_duceram_express" &&
			p.id !== "pmma_temporary_express" &&
			p.id !== "emax_crown_express",
	),
];
