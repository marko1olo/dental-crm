/**
 * Statutory Russian Dental Lab Order Presets & Materials
 * Standards for Dental Prosthetics, VITA Shades, Stump Shades (ND1-ND9), Materials, and Lab Workflows.
 */

// ---------------------------------------------------------------------------
// 1. Prosthetic Types & Categories
// ---------------------------------------------------------------------------

export type ProstheticTypeId =
	| 'crown_zirconia_monolithic'    // Диоксид циркония Prettau / Katana ML
	| 'crown_pmma_temporary'         // Временная фрезерованная коронка PMMA CAD/CAM
	| 'crown_pfm_cocr'               // Металлокерамика Co-Cr (Duceram Plus)
	| 'crown_emax_press'             // Пресс-керамика IPS e.max Press
	| 'veneer_refractory'            // Керамический винир на рефракторе / полевошпатная керамика
	| 'implant_screw_retained_crown' // Коронка на имплантате с винтовой фиксацией (Ti-base + ZrO₂)
	| 'removable_clasp_prosthesis'   // Бюгельный протез с кламмерной/замковой фиксацией Bredent
	| 'all_on_4_hybrid'              // Условно-съемный протез на титановой балке All-on-4 / All-on-6
	| 'surgical_guide_3d'            // Навигационный хирургический шаблон с титановыми втулками
	| 'orthodontic_aligners_set'     // Комплект ортодонтических элайнеров CAD/CAM (1 клик)
	| 'orthodontic_retention_splint' // Ретенционная прозрачная каппа / вакуум-сплинт
	| 'orthodontic_expansion_plate'; // Съемная пластинка с расширяющим винтом

export type ProstheticCategory =
	| 'fixed'
	| 'aesthetic'
	| 'implant'
	| 'removable'
	| 'implant_full_arch'
	| 'digital_cad'
	| 'orthodontic';

export interface ProstheticTypeDefinition {
	id: ProstheticTypeId;
	nameRu: string;
	shortNameRu: string;
	category: ProstheticCategory;
	categoryNameRu: string;
	descriptionRu: string;
	icon: string;
	defaultMaterialId: string;
	standardTurnaroundWorkingDays: number;
	requiresStumpShade: boolean;
	requiresImplantSystem: boolean;
	requiresFittingStage: boolean;
	defaultPriceClinicRub: number;
	defaultCostLabRub: number;
}

export const PROSTHETIC_TYPES: Record<ProstheticTypeId, ProstheticTypeDefinition> = {
	crown_zirconia_monolithic: {
		id: 'crown_zirconia_monolithic',
		nameRu: 'Диоксид циркония Prettau / Katana ML (Multilayer)',
		shortNameRu: 'Коронка ZrO₂ (Katana ML)',
		category: 'fixed',
		categoryNameRu: 'Несъемное протезирование',
		descriptionRu: 'Анатомическая монолитная коронка из многослойного диоксида циркония с плавным градиентом цвета и прочности (Katana / Prettau).',
		icon: 'crown',
		defaultMaterialId: 'zirconia_katana_ml',
		standardTurnaroundWorkingDays: 5,
		requiresStumpShade: true,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 24000,
		defaultCostLabRub: 7500
	},
	crown_pmma_temporary: {
		id: 'crown_pmma_temporary',
		nameRu: 'Временная фрезерованная коронка PMMA CAD/CAM (1 клик)',
		shortNameRu: 'Временная PMMA CAD/CAM',
		category: 'fixed',
		categoryNameRu: 'Провизорное протезирование',
		descriptionRu: 'Высокоточная провизорная коронка из фрезерованного полимера PMMA CAD/CAM, зазор 40 мкм.',
		icon: 'crown',
		defaultMaterialId: 'pmma_cad_cam',
		standardTurnaroundWorkingDays: 2,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 3500,
		defaultCostLabRub: 1200
	},
	crown_pfm_cocr: {
		id: 'crown_pfm_cocr',
		nameRu: 'Металлокерамическая коронка (Duceram Plus) — классика',
		shortNameRu: 'Металлокерамика Co-Cr (Duceram)',
		category: 'fixed',
		categoryNameRu: 'Несъемное протезирование',
		descriptionRu: 'Классическая металлокерамика Co-Cr с фарфоровой облицовкой Duceram Plus, зазор 40 мкм.',
		icon: 'crown',
		defaultMaterialId: 'pfm_cocr_duceram',
		standardTurnaroundWorkingDays: 7,
		requiresStumpShade: true,
		requiresImplantSystem: false,
		requiresFittingStage: true,
		defaultPriceClinicRub: 15000,
		defaultCostLabRub: 5000
	},
	crown_emax_press: {
		id: 'crown_emax_press',
		nameRu: 'Пресс-керамика IPS e.max Press (анатомическая / с нанесением)',
		shortNameRu: 'Коронка e.max Press',
		category: 'fixed',
		categoryNameRu: 'Несъемное протезирование',
		descriptionRu: 'Высокоэстетичная коронка из дисиликата лития e.max Press. Высокая опалесценция и естественная светопроницаемость.',
		icon: 'gem',
		defaultMaterialId: 'emax_press',
		standardTurnaroundWorkingDays: 6,
		requiresStumpShade: true,
		requiresImplantSystem: false,
		requiresFittingStage: true,
		defaultPriceClinicRub: 22000,
		defaultCostLabRub: 8000
	},
	veneer_refractory: {
		id: 'veneer_refractory',
		nameRu: 'Керамический винир на рефракторе / полевошпатная керамика',
		shortNameRu: 'Винир на рефракторе',
		category: 'aesthetic',
		categoryNameRu: 'Эстетическая стоматология',
		descriptionRu: 'Ультратонкий керамический винир ручной послойной лепки на огнеупорной штампиковой модели (0.2–0.4 мм). Максимальная эстетика.',
		icon: 'sparkles',
		defaultMaterialId: 'feldspathic_refractory',
		standardTurnaroundWorkingDays: 7,
		requiresStumpShade: true,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 28000,
		defaultCostLabRub: 10500
	},
	implant_screw_retained_crown: {
		id: 'implant_screw_retained_crown',
		nameRu: 'Коронка на имплантате с винтовой фиксацией (Ti-base + ZrO₂)',
		shortNameRu: 'Коронка на имплантате (Винтовая)',
		category: 'implant',
		categoryNameRu: 'Протезирование на имплантатах',
		descriptionRu: 'Коронка из диоксида циркония с шахтой под винт, вклеенная на оригинальное титановое основание (Ti-Base / Multi-Unit).',
		icon: 'screw',
		defaultMaterialId: 'zirconia_tibase',
		standardTurnaroundWorkingDays: 7,
		requiresStumpShade: false,
		requiresImplantSystem: true,
		requiresFittingStage: true,
		defaultPriceClinicRub: 38000,
		defaultCostLabRub: 13000
	},
	removable_clasp_prosthesis: {
		id: 'removable_clasp_prosthesis',
		nameRu: 'Бюгельный протез с кламмерной/замковой фиксацией Bredent',
		shortNameRu: 'Бюгельный протез Bredent',
		category: 'removable',
		categoryNameRu: 'Съемное протезирование',
		descriptionRu: 'Цельнолитой дуговой протез на Co-Cr каркасе с микрозамковыми креплениями Bredent VKS-SG / кламмерами и гарнитурными зубами.',
		icon: 'layers',
		defaultMaterialId: 'cobalt_chromium_bredent',
		standardTurnaroundWorkingDays: 10,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		requiresFittingStage: true,
		defaultPriceClinicRub: 45000,
		defaultCostLabRub: 16000
	},
	all_on_4_hybrid: {
		id: 'all_on_4_hybrid',
		nameRu: 'Условно-съемный протез на титановой балке All-on-4 / All-on-6',
		shortNameRu: 'Балка All-on-4/6',
		category: 'implant_full_arch',
		categoryNameRu: 'Тотальная имплантология',
		descriptionRu: 'Фрезерованная индивидуальная балка из титана Grade 5 с фиксацией на Multi-Unit абатменты, композитной десной и армированными зубами.',
		icon: 'arch',
		defaultMaterialId: 'titanium_bar_pmma_zirconia',
		standardTurnaroundWorkingDays: 12,
		requiresStumpShade: false,
		requiresImplantSystem: true,
		requiresFittingStage: true,
		defaultPriceClinicRub: 180000,
		defaultCostLabRub: 65000
	},
	surgical_guide_3d: {
		id: 'surgical_guide_3d',
		nameRu: 'Навигационный хирургический шаблон с титановыми втулками',
		shortNameRu: 'Хирургический шаблон 3D',
		category: 'digital_cad',
		categoryNameRu: 'Цифровая навигация',
		descriptionRu: 'Прецизионный навигационный шаблон, напечатанный из биосовместимого фотополимера с направляющими втулками под протокол имплантации.',
		icon: 'crosshair',
		defaultMaterialId: 'photopolymer_biocompatible',
		standardTurnaroundWorkingDays: 3,
		requiresStumpShade: false,
		requiresImplantSystem: true,
		requiresFittingStage: false,
		defaultPriceClinicRub: 15000,
		defaultCostLabRub: 5000
	},
	orthodontic_aligners_set: {
		id: 'orthodontic_aligners_set',
		nameRu: 'Комплект ортодонтических элайнеров 3D CAD/CAM (1 клик)',
		shortNameRu: 'Элайнеры CAD/CAM',
		category: 'orthodontic',
		categoryNameRu: 'Ортодонтия и элайнеры',
		descriptionRu: 'Набор прецизионных прозрачных элайнеров из термопластического полиуретана по виртуальному 3D-сетапу.',
		icon: 'sparkles',
		defaultMaterialId: 'aligner_polyurethane_duran',
		standardTurnaroundWorkingDays: 5,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 60000,
		defaultCostLabRub: 22000
	},
	orthodontic_retention_splint: {
		id: 'orthodontic_retention_splint',
		nameRu: 'Ретенционная прозрачная каппа / вакуум-сплинт',
		shortNameRu: 'Ретенционная каппа',
		category: 'orthodontic',
		categoryNameRu: 'Ортодонтия и элайнеры',
		descriptionRu: 'Вакуумформованная прозрачная ретенционная каппа толщиной 1.0 мм для стабилизации результатов лечения.',
		icon: 'shield',
		defaultMaterialId: 'aligner_polyurethane_duran',
		standardTurnaroundWorkingDays: 3,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 7000,
		defaultCostLabRub: 2500
	},
	orthodontic_expansion_plate: {
		id: 'orthodontic_expansion_plate',
		nameRu: 'Съемная ортодонтическая пластинка с расширяющим винтом',
		shortNameRu: 'Пластинка с винтом',
		category: 'orthodontic',
		categoryNameRu: 'Ортодонтия и элайнеры',
		descriptionRu: 'Акриловый съемный аппарат с кламмерами Адамса, вестибулярной дугой и расширяющим винтом Бертони/Хааса.',
		icon: 'sliders',
		defaultMaterialId: 'orthodontic_acrylic_leocryl',
		standardTurnaroundWorkingDays: 6,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		requiresFittingStage: true,
		defaultPriceClinicRub: 14000,
		defaultCostLabRub: 5000
	}
};

// ---------------------------------------------------------------------------
// 2. Laboratory Materials
// ---------------------------------------------------------------------------

export interface DentalLabMaterial {
	id: string;
	nameRu: string;
	manufacturerRu: string;
	strengthMpa: number;
	indicationsRu: string;
	isBiocompatible: boolean;
}

export const LAB_MATERIALS: Record<string, DentalLabMaterial> = {
	zirconia_katana_ml: {
		id: 'zirconia_katana_ml',
		nameRu: 'Katana Zirconia HTML / Prettau Dispersive',
		manufacturerRu: 'Kuraray Noritake / Zirkonzahn',
		strengthMpa: 1150,
		indicationsRu: 'Одиночные коронки фронтальной и жевательной зоны, мостовидные протезы любой протяженности.',
		isBiocompatible: true
	},
	emax_press: {
		id: 'emax_press',
		nameRu: 'IPS e.max Press (дисиликат лития)',
		manufacturerRu: 'Ivoclar Vivadent',
		strengthMpa: 470,
		indicationsRu: 'Виниры, вкладки Inlay/Onlay/Overlay, анатомические коронки во фронтальном отделе.',
		isBiocompatible: true
	},
	feldspathic_refractory: {
		id: 'feldspathic_refractory',
		nameRu: 'Полевошпатная керамика Noritake EX-3 / Creation CC',
		manufacturerRu: 'Noritake / Creation Willi Geller',
		strengthMpa: 120,
		indicationsRu: 'Ультратонкие виниры без препарирования, жакетные коронки, микропротезы.',
		isBiocompatible: true
	},
	zirconia_tibase: {
		id: 'zirconia_tibase',
		nameRu: 'ZrO₂ на титановом основании (Ti-Base / Medentika)',
		manufacturerRu: 'Straumann / Medentika / Zirkonzahn',
		strengthMpa: 1200,
		indicationsRu: 'Одиночные и мостовидные коронки с винтовой фиксацией на дентальных имплантатах.',
		isBiocompatible: true
	},
	cobalt_chromium_bredent: {
		id: 'cobalt_chromium_bredent',
		nameRu: 'Co-Cr сплав Bego Wironit + замки Bredent VKS-SG',
		manufacturerRu: 'BEGO / Bredent',
		strengthMpa: 850,
		indicationsRu: 'Бюгельные протезы сложной архитектоники, комбинированные конструкции с фрезерованными балками.',
		isBiocompatible: true
	},
	titanium_bar_pmma_zirconia: {
		id: 'titanium_bar_pmma_zirconia',
		nameRu: 'Фрезерованный титан Grade 5 + Multi-Unit коннекторы',
		manufacturerRu: 'Dentsply Sirona / Zfx / Schutz Dental',
		strengthMpa: 950,
		indicationsRu: 'Тотальные балочные конструкции при протоколах All-on-4, All-on-6, Trefoil.',
		isBiocompatible: true
	},
	photopolymer_biocompatible: {
		id: 'photopolymer_biocompatible',
		nameRu: 'Биосовместимый полимер NextDent SG / Formlabs Dental SG',
		manufacturerRu: '3D Systems / Formlabs',
		strengthMpa: 110,
		indicationsRu: 'Хирургические навигационные шаблоны, позиционеры, прикусные сплинты.',
		isBiocompatible: true
	},
	pmma_cad_cam: {
		id: 'pmma_cad_cam',
		nameRu: 'PMMA CAD/CAM (фрезерованный полимер)',
		manufacturerRu: 'Yamahachi Dental / Huge Dental',
		strengthMpa: 130,
		indicationsRu: 'Провизорные фрезерованные коронки и мостовидные протезы длительного ношения.',
		isBiocompatible: true
	},
	pfm_cocr_duceram: {
		id: 'pfm_cocr_duceram',
		nameRu: 'Металлокерамика Co-Cr + Duceram Plus / Kiss',
		manufacturerRu: 'Dentsply Sirona / BEGO Wirobond',
		strengthMpa: 650,
		indicationsRu: 'Классические металлокерамические коронки и мостовидные конструкции.',
		isBiocompatible: true
	},
	aligner_polyurethane_duran: {
		id: 'aligner_polyurethane_duran',
		nameRu: 'Термопластический полиуретан / PETG (Duran / Erkodur 0.75-1.0 мм)',
		manufacturerRu: 'Scheu Dental / Erkodent',
		strengthMpa: 95,
		indicationsRu: 'Ортодонтические элайнеры, ретенционные каппы, бруксо-сплинты.',
		isBiocompatible: true
	},
	orthodontic_acrylic_leocryl: {
		id: 'orthodontic_acrylic_leocryl',
		nameRu: 'Ортодонтический акрил холодной полимеризации Leocryl + винт Бертони',
		manufacturerRu: 'Dentaurum / Leone',
		strengthMpa: 85,
		indicationsRu: 'Съемные ортодонтические пластинки с расширяющими винтами, ретенционные аппараты.',
		isBiocompatible: true
	}
};

// ---------------------------------------------------------------------------
// 3. VITA Shades & Stump / Natural Die Shades (ND1-ND9)
// ---------------------------------------------------------------------------

export interface ColorShadeOption {
	code: string;
	groupRu: string;
	hex: string;
	descriptionRu?: string;
}

export const VITA_CLASSICAL_SHADES: ColorShadeOption[] = [
	{ code: 'A1', groupRu: 'A: Красновато-коричневые', hex: '#EDE8D5', descriptionRu: 'Светлый теплый оттенок' },
	{ code: 'A2', groupRu: 'A: Красновато-коричневые', hex: '#E5DDC3', descriptionRu: 'Самый частый естественный оттенок (60% пациентов)' },
	{ code: 'A3', groupRu: 'A: Красновато-коричневые', hex: '#DCceA8', descriptionRu: 'Насыщенный теплый тон' },
	{ code: 'A3.5', groupRu: 'A: Красновато-коричневые', hex: '#D2BE90', descriptionRu: 'Темный теплый тон для пришеечной зоны' },
	{ code: 'A4', groupRu: 'A: Красновато-коричневые', hex: '#C4AB77', descriptionRu: 'Интенсивно пигментированный тон' },
	{ code: 'B1', groupRu: 'B: Красновато-желтоватые', hex: '#F0EBD6', descriptionRu: 'Яркий светлый природный тон' },
	{ code: 'B2', groupRu: 'B: Красновато-желтоватые', hex: '#E7DEC2', descriptionRu: 'Светлый желтоватый оттенок' },
	{ code: 'B3', groupRu: 'B: Красновато-желтоватые', hex: '#DCCEA4', descriptionRu: 'Желтовато-коричневый оттенок' },
	{ code: 'B4', groupRu: 'B: Красновато-желтоватые', hex: '#CDB988', descriptionRu: 'Насыщенный желтый тон' },
	{ code: 'C1', groupRu: 'C: Сероватые тона', hex: '#E0DDD2', descriptionRu: 'Светлый холодный сероватый оттенок' },
	{ code: 'C2', groupRu: 'C: Сероватые тона', hex: '#D4CEBF', descriptionRu: 'Средне-серый холодный оттенок' },
	{ code: 'C3', groupRu: 'C: Сероватые тона', hex: '#C4BCA8', descriptionRu: 'Темно-серый тон' },
	{ code: 'C4', groupRu: 'C: Сероватые тона', hex: '#B3A992', descriptionRu: 'Интенсивный серо-коричневый тон' },
	{ code: 'D2', groupRu: 'D: Красновато-серые', hex: '#E1D9CA', descriptionRu: 'Светлый красно-серый тон' },
	{ code: 'D3', groupRu: 'D: Красновато-серые', hex: '#D4C7B1', descriptionRu: 'Средний красно-серый тон' },
	{ code: 'D4', groupRu: 'D: Красновато-серые', hex: '#C4B49C', descriptionRu: 'Темный красно-серый тон' }
];

export const VITA_BLEACH_SHADES: ColorShadeOption[] = [
	{ code: 'BL1', groupRu: 'Bleach: Экстра-белые', hex: '#FAF9F5', descriptionRu: 'Ультра-белый голливудский оттенок' },
	{ code: 'BL2', groupRu: 'Bleach: Экстра-белые', hex: '#F5F3EB', descriptionRu: 'Яркий отбеленный тон' },
	{ code: 'BL3', groupRu: 'Bleach: Экстра-белые', hex: '#F0ECE0', descriptionRu: 'Умеренно отбеленный тон' },
	{ code: 'BL4', groupRu: 'Bleach: Экстра-белые', hex: '#EBE6D5', descriptionRu: 'Мягкий светлый переходный тон к A1' },
	{ code: 'OM1', groupRu: 'Bleach: VITA 3D Bleach', hex: '#FCFBFA', descriptionRu: 'Экстра-белый 3D Bleach OM1 (0M1)' },
	{ code: 'OM2', groupRu: 'Bleach: VITA 3D Bleach', hex: '#F9F7F1', descriptionRu: 'Светлый 3D Bleach OM2 (0M2)' },
	{ code: 'OM3', groupRu: 'Bleach: VITA 3D Bleach', hex: '#F6F2E8', descriptionRu: 'Натуральный 3D Bleach OM3 (0M3)' },
	{ code: '0M1', groupRu: 'Bleach: VITA 3D Bleach', hex: '#FCFBFA', descriptionRu: 'Экстра-белый 3D Bleach 0M1 (OM1)' },
	{ code: '0M2', groupRu: 'Bleach: VITA 3D Bleach', hex: '#F9F7F1', descriptionRu: 'Светлый 3D Bleach 0M2 (OM2)' },
	{ code: '0M3', groupRu: 'Bleach: VITA 3D Bleach', hex: '#F6F2E8', descriptionRu: 'Натуральный 3D Bleach 0M3 (OM3)' }
];

export const VITA_3D_MASTER_SHADES: ColorShadeOption[] = [
	{ code: '1M1', groupRu: 'Группа 1: Светлые', hex: '#F2EDE0' },
	{ code: '1M2', groupRu: 'Группа 1: Светлые', hex: '#EDE6D4' },
	{ code: '2L1.5', groupRu: 'Группа 2: Желтоватые', hex: '#ECE3CE' },
	{ code: '2M1', groupRu: 'Группа 2: Нейтральные', hex: '#E9DFC8' },
	{ code: '2M2', groupRu: 'Группа 2: Нейтральные', hex: '#E5D9BE' },
	{ code: '2M3', groupRu: 'Группа 2: Нейтральные', hex: '#DFD1B1' },
	{ code: '2R1.5', groupRu: 'Группа 2: Красноватые', hex: '#E5D6C1' },
	{ code: '2R2.5', groupRu: 'Группа 2: Красноватые', hex: '#DECBB3' },
	{ code: '3L1.5', groupRu: 'Группа 3: Желтоватые', hex: '#E2D3B8' },
	{ code: '3M1', groupRu: 'Группа 3: Нейтральные', hex: '#DECDB0' },
	{ code: '3M2', groupRu: 'Группа 3: Нейтральные', hex: '#D8C5A4' },
	{ code: '3M3', groupRu: 'Группа 3: Нейтральные', hex: '#D0BA95' },
	{ code: '3R2.5', groupRu: 'Группа 3: Красноватые', hex: '#D3BDA4' },
	{ code: '4M1', groupRu: 'Группа 4: Насыщенные', hex: '#CEBA98' },
	{ code: '4M2', groupRu: 'Группа 4: Насыщенные', hex: '#C5AF8A' },
	{ code: '4M3', groupRu: 'Группа 4: Насыщенные', hex: '#BCA37C' },
	{ code: '5M1', groupRu: 'Группа 5: Темные', hex: '#BAA27E' },
	{ code: '5M2', groupRu: 'Группа 5: Темные', hex: '#B19770' },
	{ code: '5M3', groupRu: 'Группа 5: Темные', hex: '#A88C64' }
];

export const STUMP_SHADES_ND: ColorShadeOption[] = [
	{ code: 'ND1', groupRu: 'Natural Die Material (IPS e.max)', hex: '#EFEADB', descriptionRu: 'Светлая витальная культя (соответствует A1/B1)' },
	{ code: 'ND2', groupRu: 'Natural Die Material (IPS e.max)', hex: '#E6DCBF', descriptionRu: 'Естественная витальная культя (A2)' },
	{ code: 'ND3', groupRu: 'Natural Die Material (IPS e.max)', hex: '#DCcca0', descriptionRu: 'Теплая культя средней насыщенности (A3)' },
	{ code: 'ND4', groupRu: 'Natural Die Material (IPS e.max)', hex: '#D0B984', descriptionRu: 'Темная культя / девитализированный дентин (A3.5/A4)' },
	{ code: 'ND5', groupRu: 'Natural Die Material (IPS e.max)', hex: '#E2DCB8', descriptionRu: 'Светлая сероватая культя (C1/D2)' },
	{ code: 'ND6', groupRu: 'Natural Die Material (IPS e.max)', hex: '#D1C89F', descriptionRu: 'Серовато-желтая культя (C2/C3)' },
	{ code: 'ND7', groupRu: 'Natural Die Material (IPS e.max)', hex: '#B8AB7F', descriptionRu: 'Темно-серая девитализированная культя (C4)' },
	{ code: 'ND8', groupRu: 'Natural Die Material (IPS e.max)', hex: '#9E8D68', descriptionRu: 'Сильно дисколорированная культя (резорцин-формалин)' },
	{ code: 'ND9', groupRu: 'Natural Die Material (IPS e.max)', hex: '#7D7A73', descriptionRu: 'Металлическая культевая вкладка (Co-Cr / никель / золото)' }
];

export interface SurfaceTextureOption {
	id: 'high_gloss' | 'microtexture' | 'matte';
	nameRu: string;
	descriptionRu: string;
}

export const SURFACE_TEXTURES: SurfaceTextureOption[] = [
	{ id: 'high_gloss', nameRu: 'Глянцевая (Зеркальная)', descriptionRu: 'Максимальный зеркальный блеск, гладкая поверхность без перикимат.' },
	{ id: 'microtexture', nameRu: 'Естественная микротекстура', descriptionRu: 'Анатомические вертикальные борозды, мамелоны и горизонтальные линии роста эмали (перикиматы).' },
	{ id: 'matte', nameRu: 'Матовая (Сатиновая)', descriptionRu: 'Низкая степень блеска, матовый финиш для пациентов старшей возрастной группы.' }
];

export interface TranslucencyLevelOption {
	id: 'HT' | 'MT' | 'LT' | 'MO' | 'HO';
	nameRu: string;
	descriptionRu: string;
}

export const TRANSLUCENCY_LEVELS: TranslucencyLevelOption[] = [
	{ id: 'HT', nameRu: 'HT (High Translucency)', descriptionRu: 'Высокая прозрачность. Идеально для вкладок, накладок и виниров на светлой культе.' },
	{ id: 'MT', nameRu: 'MT (Medium Translucency)', descriptionRu: 'Средняя прозрачность. Универсально для коронок фронтальной и жевательной зоны.' },
	{ id: 'LT', nameRu: 'LT (Low Translucency)', descriptionRu: 'Низкая прозрачность. Высокая маскирующая способность для слегка измененных в цвете культей.' },
	{ id: 'MO', nameRu: 'MO (Medium Opacity)', descriptionRu: 'Средняя опаковость. Каркасы под нанесение керамики при дисколорите.' },
	{ id: 'HO', nameRu: 'HO (High Opacity)', descriptionRu: 'Высокая опаковость. Полное перекрытие металлических вкладок и темных штифтов (ND8/ND9).' }
];

// ---------------------------------------------------------------------------
// 3b. Implant Platforms, Abutments & Fixation Types
// ---------------------------------------------------------------------------

export type ImplantPlatformType = 'conical' | 'hex';

export interface ImplantPlatformOption {
	id: ImplantPlatformType;
	nameRu: string;
	descriptionRu: string;
}

export const IMPLANT_PLATFORMS: ImplantPlatformOption[] = [
	{
		id: 'conical',
		nameRu: 'Conical (Коническое соединение / Morse Taper)',
		descriptionRu: 'Конус Морзе с антиротационным элементом (Straumann BLX, Nobel Conical, Astra EV, Osstem TS, Dentium)'
	},
	{
		id: 'hex',
		nameRu: 'Hex (Шестигранное соединение / Internal/External Hex)',
		descriptionRu: 'Внутренний или внешний шестигранник (Zimmer, BioHorizons, MIS, Alpha-Bio)'
	}
];

export type AbutmentCategoryType =
	| 'tibase_bonded'
	| 'multiunit_straight'
	| 'multiunit_17'
	| 'multiunit_30'
	| 'custom_titanium'
	| 'custom_zirconia'
	| 'standard_titanium';

export interface AbutmentTypeOption {
	id: AbutmentCategoryType;
	nameRu: string;
	angle: number;
	descriptionRu: string;
	isMultiUnit?: boolean;
	isTiBase?: boolean;
}

export const ABUTMENT_TYPE_OPTIONS: AbutmentTypeOption[] = [
	{
		id: 'tibase_bonded',
		nameRu: 'Ti-Base вклеиваемое основание',
		angle: 0,
		isTiBase: true,
		descriptionRu: 'Титановое основание (Ti-Base) под вклейку циркониевой коронки (3M RelyX Ultimate / Multilink Hybrid Abutment).'
	},
	{
		id: 'multiunit_straight',
		nameRu: 'Multi-Unit прямой (0°)',
		angle: 0,
		isMultiUnit: true,
		descriptionRu: 'Винтовой абатмент Multi-Unit для мостовидных и балочных конструкций при параллельных осях.'
	},
	{
		id: 'multiunit_17',
		nameRu: 'Multi-Unit угловой 17°',
		angle: 17,
		isMultiUnit: true,
		descriptionRu: 'Угловой абатмент Multi-Unit 17° для компенсации наклона имплантатов в протоколах All-on-4 / All-on-6.'
	},
	{
		id: 'multiunit_30',
		nameRu: 'Multi-Unit угловой 30°',
		angle: 30,
		isMultiUnit: true,
		descriptionRu: 'Угловой абатмент Multi-Unit 30° для дистальных наклонных имплантатов в протоколах All-on-4 / All-on-6.'
	},
	{
		id: 'custom_titanium',
		nameRu: 'Индивидуальный титановый абатмент Grade 5',
		angle: 0,
		descriptionRu: 'Фрезерованный индивидуальный абатмент из титана Grade 5 с анатомическим десневым уступом.'
	},
	{
		id: 'custom_zirconia',
		nameRu: 'Индивидуальный циркониевый абатмент ZrO₂',
		angle: 0,
		descriptionRu: 'Безметалловый абатмент из оксида циркония на титановом интерфейсе для фронтальной эстетики.'
	},
	{
		id: 'standard_titanium',
		nameRu: 'Стандартный прямой титановый абатмент',
		angle: 0,
		descriptionRu: 'Фабричный стандартный абатмент для цементной фиксации одиночных коронок.'
	}
];

export type FixationType = 'screw_retained' | 'cement_retained';

export interface FixationTypeOption {
	id: FixationType;
	nameRu: string;
	descriptionRu: string;
}

export const FIXATION_TYPES: FixationTypeOption[] = [
	{
		id: 'screw_retained',
		nameRu: 'Винтовая фиксация',
		descriptionRu: 'Трансокклюзионная шахта винта, прямое прикручивание к имплантату или Multi-Unit. Безопасность для маргинальной кости.'
	},
	{
		id: 'cement_retained',
		nameRu: 'Цементная фиксация',
		descriptionRu: 'Фиксация коронки на постоянный/временный цемент на индивидуальный абатмент с зазором 30–50 мкм.'
	}
];

// ---------------------------------------------------------------------------
// 3c. Implant Components Consignment & Tracking Manifest
// ---------------------------------------------------------------------------

export interface LabImplantComponentsManifest {
	hasImplantComponents?: boolean | undefined;
	implantSystemName?: string | undefined; // e.g. "Osstem TS III", "Dentium SuperLine", "Straumann BLX", "Nobel Conical"
	transfersCount?: number | undefined; // Трансферы для слепков (открытая/закрытая ложка / скан-маркеры)
	transfersType?: 'open_tray' | 'closed_tray' | 'scan_body' | string | undefined;
	analogsCount?: number | undefined; // Лабораторные аналоги имплантатов / Multi-Unit
	healingAbutmentsCount?: number | undefined; // Формирователи десны (ФДМ)
	screwsCount?: number | undefined; // Фиксирующие / лабораторные клинические винты
	extraComponentsNotes?: string | undefined; // Дополнительные компоненты (отвертки, позиционеры, титановые основания)
}

export function formatImplantComponentsSummary(manifest?: LabImplantComponentsManifest): string {
	if (!manifest || (!manifest.hasImplantComponents && !manifest.transfersCount && !manifest.analogsCount && !manifest.healingAbutmentsCount && !manifest.screwsCount)) {
		return 'Компоненты имплантационной системы не передавались';
	}
	const parts: string[] = [];
	if (manifest.implantSystemName) parts.push(`Система: ${manifest.implantSystemName}`);
	if (manifest.transfersCount) {
		const typeLabel = manifest.transfersType === 'open_tray' ? 'открытая ложка' : manifest.transfersType === 'closed_tray' ? 'закрытая ложка' : manifest.transfersType === 'scan_body' ? 'скан-боди' : '';
		parts.push(`Трансферы: ${manifest.transfersCount} шт.${typeLabel ? ` (${typeLabel})` : ''}`);
	}
	if (manifest.analogsCount) parts.push(`Аналоги: ${manifest.analogsCount} шт.`);
	if (manifest.healingAbutmentsCount) parts.push(`ФДМ: ${manifest.healingAbutmentsCount} шт.`);
	if (manifest.screwsCount) parts.push(`Винты: ${manifest.screwsCount} шт.`);
	if (manifest.extraComponentsNotes) parts.push(`Доп: ${manifest.extraComponentsNotes}`);
	return parts.join('; ');
}

// ---------------------------------------------------------------------------
// 4. Canonical 4-Status Clinical Workflow & 8 Technological Lab Stages
// ---------------------------------------------------------------------------

export type LabWorkflowStageId =
	| 'draft'                // 0. Черновик наряда
	| 'draft_order'          // Черновик (алиас)
	| 'in_progress'          // 1. В работе
	| 'sent_to_lab'          // Отправлен в лабораторию (алиас)
	| 'fitting_scheduled'    // 2. Примерка назначена
	| 'delivered_completed'  // 3. Сдано
	| 'installed_completed'  // Зафиксировано/сдано (алиас)
	| 'correction_remake'    // 4. Коррекция
	| 'warranty_rework'      // Гарантийная переделка (алиас)
	// Backward compatibility aliases
	| 'impression_sent'
	| 'cad_design'
	| 'milling_wax_up'
	| 'try_in_fitting'
	| 'delivered_to_clinic'
	| 'installed_in_mouth';

export interface LabStageDefinition {
	id: LabWorkflowStageId;
	orderIndex: number;
	nameRu: string;
	shortTitleRu: string;
	icon: string;
	descriptionRu: string;
	colorToken: string;
}

export const LAB_WORKFLOW_STAGES: Record<LabWorkflowStageId, LabStageDefinition> = {
	draft: {
		id: 'draft',
		orderIndex: 0,
		nameRu: '0. Черновик',
		shortTitleRu: 'Черновик',
		icon: 'file-text',
		descriptionRu: 'Черновик наряда формируется врачом в кабинете.',
		colorToken: 'var(--muted, #64748b)'
	},
	draft_order: {
		id: 'draft',
		orderIndex: 0,
		nameRu: '0. Черновик',
		shortTitleRu: 'Черновик',
		icon: 'file-text',
		descriptionRu: 'Черновик наряда формируется врачом в кабинете.',
		colorToken: 'var(--muted, #64748b)'
	},
	in_progress: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ передан в лабораторию и находится в процессе моделирования и фрезерования.',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	sent_to_lab: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ передан в лабораторию.',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	fitting_scheduled: {
		id: 'fitting_scheduled',
		orderIndex: 2,
		nameRu: '2. Примерка назначена',
		shortTitleRu: 'Примерка',
		icon: 'search',
		descriptionRu: 'Работа изготовлена ЗТЛ, назначена дата клинической примерки каркаса или реставрации в расписании.',
		colorToken: 'var(--warn, #f59e0b)'
	},
	delivered_completed: {
		id: 'delivered_completed',
		orderIndex: 3,
		nameRu: '3. Сдано',
		shortTitleRu: 'Сдано',
		icon: 'check',
		descriptionRu: 'Ортопедическая конструкция окончательно зафиксирована в полости рта у пациента. Заказ выполнен.',
		colorToken: 'var(--ok, #10b981)'
	},
	installed_completed: {
		id: 'delivered_completed',
		orderIndex: 3,
		nameRu: '3. Сдано',
		shortTitleRu: 'Сдано',
		icon: 'check',
		descriptionRu: 'Ортопедическая конструкция окончательно зафиксирована.',
		colorToken: 'var(--ok, #10b981)'
	},
	correction_remake: {
		id: 'correction_remake',
		orderIndex: 4,
		nameRu: '4. Коррекция',
		shortTitleRu: 'Коррекция',
		icon: 'rotate-ccw',
		descriptionRu: 'Возврат в ЗТЛ на коррекцию окклюзии, цвета, аппроксимальных контактов или переделку.',
		colorToken: 'var(--bad, #ef4444)'
	},
	warranty_rework: {
		id: 'correction_remake',
		orderIndex: 4,
		nameRu: '4. Коррекция',
		shortTitleRu: 'Коррекция',
		icon: 'rotate-ccw',
		descriptionRu: 'Гарантийный возврат на переделку/коррекцию.',
		colorToken: 'var(--bad, #ef4444)'
	},

	// Aliases for backward compatibility with existing saved records
	impression_sent: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ в лаборатории',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	cad_design: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ в лаборатории',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	milling_wax_up: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ в лаборатории',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	try_in_fitting: {
		id: 'fitting_scheduled',
		orderIndex: 2,
		nameRu: '2. Примерка назначена',
		shortTitleRu: 'Примерка',
		icon: 'search',
		descriptionRu: 'Примерка назначена',
		colorToken: 'var(--warn, #f59e0b)'
	},
	delivered_to_clinic: {
		id: 'fitting_scheduled',
		orderIndex: 2,
		nameRu: '2. Примерка назначена',
		shortTitleRu: 'Примерка',
		icon: 'search',
		descriptionRu: 'В клинике / на примерке',
		colorToken: 'var(--warn, #f59e0b)'
	},
	installed_in_mouth: {
		id: 'delivered_completed',
		orderIndex: 3,
		nameRu: '3. Сдано',
		shortTitleRu: 'Сдано',
		icon: 'check',
		descriptionRu: 'Зафиксировано',
		colorToken: 'var(--ok, #10b981)'
	}
};

export const LAB_STAGE_ORDER: LabWorkflowStageId[] = [
	'in_progress',
	'fitting_scheduled',
	'delivered_completed',
	'correction_remake'
];

// ---------------------------------------------------------------------------
// 4b. Real 8 Technological Production Stages of Dental Laboratory
// 1) Оттиски/3D-скан -> 2) Wax-Up / CAD -> 3) Фрезеровка / каркас ->
// 4) Примерка в клинике -> 5) Нанесение керамики / покраска ->
// 6) Финишная глазуровка -> 7) Готовая работа в клинике -> 8) Фиксация пациенту
// ---------------------------------------------------------------------------

export type LabTechnologicalStageId =
	| 'impression_scan'     // 1) Оттиски / 3D-скан
	| 'waxup_cad'           // 2) Wax-Up / CAD-моделирование
	| 'milling_framework'   // 3) Фрезеровка / каркас
	| 'clinical_fitting'    // 4) Примерка в клинике
	| 'ceramic_layering'    // 5) Нанесение керамики / покраска
	| 'glaze_finish'        // 6) Финишная глазуровка
	| 'ready_in_clinic'     // 7) Готовая работа в клинике
	| 'patient_fixation';   // 8) Фиксация пациенту

export interface LabTechnologicalStageDefinition {
	id: LabTechnologicalStageId;
	stepIndex: number;
	stepNumber: number;
	nameRu: string;
	shortTitleRu: string;
	departmentRu: string;
	descriptionRu: string;
	icon: string;
	colorToken: string;
}

export const LAB_TECHNOLOGICAL_STAGES: Record<LabTechnologicalStageId, LabTechnologicalStageDefinition> = {
	impression_scan: {
		id: 'impression_scan',
		stepIndex: 1,
		stepNumber: 1,
		nameRu: '1. Оттиски / 3D-скан',
		shortTitleRu: 'Слепки / Скан',
		departmentRu: 'Клинический кабинет / Терапия-Ортопедия',
		descriptionRu: 'Снятие прецизионных оттисков (А-силикон) или интраоральное 3D-сканирование зубных рядов (STL/PLY).',
		icon: 'scan',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	waxup_cad: {
		id: 'waxup_cad',
		stepIndex: 2,
		stepNumber: 2,
		nameRu: '2. Wax-Up / CAD-моделирование',
		shortTitleRu: 'Wax-Up / CAD',
		departmentRu: 'CAD/CAM лаборатория',
		descriptionRu: 'Цифровое 3D-моделирование анатомической формы реставрации в Exocad или восковой Wax-Up.',
		icon: 'layers',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	milling_framework: {
		id: 'milling_framework',
		stepIndex: 3,
		stepNumber: 3,
		nameRu: '3. Фрезеровка / каркас',
		shortTitleRu: 'Фрезеровка / Каркас',
		departmentRu: 'Фрезерный центр / Литейная',
		descriptionRu: 'CAM-фрезеровка диоксида циркония Prettau/Katana, PMMA или синтеризация Co-Cr каркаса.',
		icon: 'settings',
		colorToken: 'var(--teal, #0d9488)'
	},
	clinical_fitting: {
		id: 'clinical_fitting',
		stepIndex: 4,
		stepNumber: 4,
		nameRu: '4. Примерка в клинике',
		shortTitleRu: 'Примерка каркаса',
		departmentRu: 'Клинический кабинет ортопеда',
		descriptionRu: 'Клиническая примерка каркаса / конструкции в полости рта у пациента, проверка окклюзии и контактов.',
		icon: 'search',
		colorToken: 'var(--warn, #f59e0b)'
	},
	ceramic_layering: {
		id: 'ceramic_layering',
		stepIndex: 5,
		stepNumber: 5,
		nameRu: '5. Нанесение керамики / покраска',
		shortTitleRu: 'Керамика / Покраска',
		departmentRu: 'Керамический цех ЗТЛ',
		descriptionRu: 'Послойное нанесение керамических масс (Duceram, Noritake) или колоризация многослойного циркония.',
		icon: 'palette',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	glaze_finish: {
		id: 'glaze_finish',
		stepIndex: 6,
		stepNumber: 6,
		nameRu: '6. Финишная глазуровка',
		shortTitleRu: 'Глазуровка',
		departmentRu: 'Цех глазуровки и полировки',
		descriptionRu: 'Финальный глазуровочный обжиг в печи, механическая полировка уступа и подгонка аппроксимальных контактов.',
		icon: 'sparkles',
		colorToken: 'var(--teal, #0d9488)'
	},
	ready_in_clinic: {
		id: 'ready_in_clinic',
		stepIndex: 7,
		stepNumber: 7,
		nameRu: '7. Готовая работа в клинике',
		shortTitleRu: 'В клинике',
		departmentRu: 'Регистратура / Склад клиники',
		descriptionRu: 'Работа доставлена курьером в клинику, прошла входной контроль ортопеда и готова к фиксации.',
		icon: 'truck',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	patient_fixation: {
		id: 'patient_fixation',
		stepIndex: 8,
		stepNumber: 8,
		nameRu: '8. Фиксация пациенту',
		shortTitleRu: 'Сдано пациенту',
		departmentRu: 'Клинический кабинет ортопеда',
		descriptionRu: 'Окончательная адгезивная или винтовая фиксация конструкции в полости рта у пациента.',
		icon: 'check',
		colorToken: 'var(--ok, #10b981)'
	}
};

export const LAB_TECHNOLOGICAL_STAGE_ORDER: readonly LabTechnologicalStageId[] = [
	'impression_scan',
	'waxup_cad',
	'milling_framework',
	'clinical_fitting',
	'ceramic_layering',
	'glaze_finish',
	'ready_in_clinic',
	'patient_fixation'
];
