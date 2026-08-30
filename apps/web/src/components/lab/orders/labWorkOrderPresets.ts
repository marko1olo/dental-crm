/**
 * Statutory Russian Dental Lab Order Presets & Materials
 * Standards for Dental Prosthetics, VITA Shades, Stump Shades (ND1-ND9), Materials, and Lab Workflows.
 */

// ---------------------------------------------------------------------------
// 1. Prosthetic Types & Categories
// ---------------------------------------------------------------------------

export type ProstheticTypeId =
	| 'crown_zirconia_monolithic'    // Диоксид циркония Prettau / Katana ML
	| 'crown_emax_press'             // Пресс-керамика IPS e.max Press
	| 'veneer_refractory'            // Керамический винир на рефракторе / полевошпатная керамика
	| 'implant_screw_retained_crown' // Коронка на имплантате с винтовой фиксацией (Ti-base + ZrO2)
	| 'removable_clasp_prosthesis'   // Бюгельный протез с кламмерной/замковой фиксацией Bredent
	| 'all_on_4_hybrid'              // Условно-съемный протез на титановой балке All-on-4 / All-on-6
	| 'surgical_guide_3d';           // Навигационный хирургический шаблон с титановыми втулками

export type ProstheticCategory =
	| 'fixed'
	| 'aesthetic'
	| 'implant'
	| 'removable'
	| 'implant_full_arch'
	| 'digital_cad';

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
		shortNameRu: 'Коронка ZrO2 (Katana ML)',
		category: 'fixed',
		categoryNameRu: 'Несъемное протезирование',
		descriptionRu: 'Анатомическая монолитная коронка из многослойного диоксида циркония с плавным градиентом цвета и прочности (Katana / Prettau).',
		icon: 'crown',
		defaultMaterialId: 'zirconia_katana_ml',
		standardTurnaroundWorkingDays: 5,
		requiresStumpShade: true,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 18000,
		defaultCostLabRub: 6500
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
		nameRu: 'Коронка на имплантате с винтовой фиксацией (Ti-base + ZrO2)',
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
		defaultPriceClinicRub: 35000,
		defaultCostLabRub: 12000
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
		nameRu: 'ZrO2 на титановом основании (Ti-Base / Medentika)',
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
	{ code: 'BL4', groupRu: 'Bleach: Экстра-белые', hex: '#EBE6D5', descriptionRu: 'Мягкий светлый переходный тон к A1' }
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
// 4. Canonical 4-Status Clinical Workflow (В работе / Примерка / Сдано / Коррекция)
// ---------------------------------------------------------------------------

export type LabWorkflowStageId =
	| 'in_progress'          // 1. В работе
	| 'fitting_scheduled'    // 2. Примерка назначена
	| 'delivered_completed'  // 3. Сдано
	| 'correction_remake'    // 4. Коррекция
	// Backward compatibility aliases
	| 'impression_sent'
	| 'cad_design'
	| 'milling_wax_up'
	| 'try_in_fitting'
	| 'glaze_finish'
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
	in_progress: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ передан в лабораторию и находится в процессе моделирования и фрезерования.',
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
	correction_remake: {
		id: 'correction_remake',
		orderIndex: 4,
		nameRu: '4. Коррекция',
		shortTitleRu: 'Коррекция',
		icon: 'rotate-ccw',
		descriptionRu: 'Возврат в ЗТЛ на коррекцию окклюзии, цвета, аппроксимальных контактов или переделку.',
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
	glaze_finish: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ в лаборатории',
		colorToken: 'var(--brand-500, #3b82f6)'
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
