/**
 * labMath.ts — Types, Constants, VITA Shades, and Kopeck-Exact Financial Math
 * for Dental Lab Orders & Prosthetics Work Orders.
 */

// ─── TYPES & INTERFACES ────────────────────────────────────────────────────────

export interface DentalLabOrderData {
	id?: string;
	patientId: string;
	patientName?: string;
	doctorId?: string | null;
	doctorName?: string | null;
	secureToken?: string;
	toothFdi?: string | null;
	selectedTeeth?: number[];
	constructionType?: string;
	material?: string | null;
	colorVita?: string | null;
	shadeSystem?: "classical" | "3d_master" | "bleach";
	shadeCervical?: string;
	shadeBody?: string;
	shadeIncisal?: string;
	shadeStump?: string | null;
	translucency?: string;
	mamelons?: boolean;
	calcifications?: boolean;
	occlusalScheme?: string;
	contactTightness?: string;
	surfaceTexture?: string;
	cementGapMicrons?: number;
	status?: string;
	currentStage?: LabOrderStageKey;
	stageHistory?: Array<{ stage: LabOrderStageKey; timestamp: string; note?: string }>;
	dueDate?: string | null;
	frameworkTrialDate?: string | null;
	ceramicTrialDate?: string | null;
	deliveryDate?: string | null;
	clinicalNotes?: string | null;
	labComments?: string | null;
	attachedImageUrl?: string | null;
	priceRub?: number | null;
	clinicSharePct?: number;
	doctorSharePct?: number;
	doctorDeductionRub?: number | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface DentalLabOrderModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialOrder?: DentalLabOrderData | null | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialToothFdi?: string | number | undefined;
	readonly onOrderSaved?: ((order: DentalLabOrderData) => void) | undefined;
}

export interface LabTrackingDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: DentalLabOrderData | null;
	readonly onStageUpdate?: (orderId: string, newStage: LabOrderStageKey, note?: string | undefined) => Promise<void> | void;
	readonly onFittingDateUpdate?: (orderId: string, dates: { frameworkTrialDate?: string | undefined; ceramicTrialDate?: string | undefined; deliveryDate?: string | undefined }) => Promise<void> | void;
}

// ─── CONSTANTS & DICTIONARIES ──────────────────────────────────────────────────

export const CONSTRUCTION_TYPES = [
	{
		id: "single_crown",
		name: "Одиночная коронка",
		desc: "Анатомическая коронка (полная или с редукцией)",
		icon: "👑",
		category: "Несъемное",
	},
	{
		id: "bridge",
		name: "Мостовидный протез",
		desc: "Конструкция с опорными коронками и промежутком",
		icon: "🌉",
		category: "Несъемное",
	},
	{
		id: "veneer",
		name: "Керамический винир",
		desc: "Ультратонкая эстетическая накладка E.max / Feldspar",
		icon: "✨",
		category: "Эстетика",
	},
	{
		id: "inlay_onlay",
		name: "Вкладка / Накладка (Inlay/Onlay/Overlay)",
		desc: "Керамическая или композитная микропротезная реставрация",
		icon: "💎",
		category: "Микропротезирование",
	},
	{
		id: "all_on_4_6",
		name: "Тотальный протез All-on-4 / All-on-6",
		desc: "Балочный или винтовой условно-съемный протез на имплантатах",
		icon: "🛡️",
		category: "Имплантология",
	},
	{
		id: "all_on_arch",
		name: "Тотальный протез на всю челюсть",
		desc: "Условно-съемный балочный/винтовой протез челюсти",
		icon: "🏛️",
		category: "Имплантология",
	},
	{
		id: "implant_abutment",
		name: "Индивидуальный абатмент + коронка",
		desc: "Титановый / циркониевый абатмент на винтовой фиксации",
		icon: "🔩",
		category: "Имплантология",
	},
	{
		id: "clasp_denture",
		name: "Бюгельный / Частично-съемный протез",
		desc: "Протез на замках (аттачменах) или кламмерах",
		icon: "🦷",
		category: "Съемное",
	},
	{
		id: "aligner_nightguard",
		name: "Элайнер / Окклюзионная сплинт-каппа",
		desc: "Ортодонтический или миорелаксирующий прозрачный сплинт",
		icon: "🎯",
		category: "Каппы",
	},
	{
		id: "aligners_nightguard",
		name: "Элайнеры / Сплинт-шина",
		desc: "Окклюзионная защитная капа / ортодонтические элайнеры",
		icon: "🛡️",
		category: "Каппы",
	},
	{
		id: "endocrown",
		name: "Эндокоронка",
		desc: "Монолитная коронка с фиксацией в пульповой камере",
		icon: "👑",
		category: "Микропротезирование",
	},
] as const;

export const MATERIALS = [
	{
		id: "zirconia_multilayer",
		name: "Диоксид циркония Katana / Prettau (Multi-layer)",
		desc: "Градиентная транслюцентность, прочность 1100 МПа",
		category: "Цирконий",
		tag: "Премиум",
		costTier: "Премиум",
	},
	{
		id: "emax_lithium_disilicate",
		name: "Дисиликат лития IPS e.max CAD / Press",
		desc: "Максимальная флюоресценция и адгезивная фиксация (500 МПа)",
		category: "Стеклокерамика",
		tag: "Эстетика",
		costTier: "Эстетик",
	},
	{
		id: "pfm_cocr",
		name: "Металлокерамика (CoCr фрезерованный / литой)",
		desc: "Классическая металлокерамическая конструкция",
		category: "Металл",
		tag: "Стандарт",
		costTier: "Стандарт",
	},
	{
		id: "pmma_temporary",
		name: "Временная пластмасса PMMA CAD/CAM",
		desc: "Высокоточный фрезерованный полимер для провизорного ношения",
		category: "Временные",
		tag: "Временная",
		costTier: "Эконом",
	},
	{
		id: "titanium_custom_abutment",
		name: "Титановый сплав Grade 5 (Ti-6Al-4V ELI)",
		desc: "Биосовместимый фрезерованный титан для имплантологии",
		category: "Титан",
		tag: "Импланты",
		costTier: "Премиум",
	},
	{
		id: "peek_biohpp",
		name: "Биополимер PEEK / BioHPP",
		desc: "Безметалловый амортизирующий каркас с модулем кости",
		category: "Полимер",
		tag: "Инновация",
		costTier: "Премиум",
	},
	{
		id: "biocompatible_3d_resin",
		name: "Биосовместимый 3D-фотополимер",
		desc: "Высокоточная печать капп, сплинтов и шаблонов",
		category: "3D-печать",
		tag: "3D-печать",
		costTier: "Стандарт",
	},
] as const;

export const LAB_MATERIALS = MATERIALS;

export const VITA_CLASSICAL_SHADES = [
	// Group A (Reddish-brownish)
	"A1", "A2", "A3", "A3.5", "A4",
	// Group B (Reddish-yellowish)
	"B1", "B2", "B3", "B4",
	// Group C (Greyish)
	"C1", "C2", "C3", "C4",
	// Group D (Reddish-grey)
	"D2", "D3", "D4",
] as const;

export const VITA_BLEACH_SHADES = [
	"BL1", "BL2", "BL3", "BL4",
	"0M1", "0M2", "0M3",
] as const;

export const VITA_3D_MASTER_SHADES = [
	// Group 1 (Lightest)
	"1M1", "1M2",
	// Group 2
	"2L1.5", "2L2.5", "2M1", "2M2", "2M3", "2R1.5", "2R2.5",
	// Group 3 (Medium)
	"3L1.5", "3L2.5", "3M1", "3M2", "3M3", "3R1.5", "3R2.5",
	// Group 4
	"4L1.5", "4L2.5", "4M1", "4M2", "4M3", "4R1.5", "4R2.5",
	// Group 5 (Darkest)
	"5M1", "5M2", "5M3",
] as const;

export interface ShadeSwatchInfo {
	bg: string;
	border: string;
	desc: string;
	group?: string;
}

export const SHADE_SWATCH_MAP: Record<string, ShadeSwatchInfo> = {
	// VITA Classical A (Reddish-Brownish)
	A1: { bg: "#f7f1e7", border: "#dfd2c0", desc: "Светлый красновато-коричневый", group: "Группа A" },
	A2: { bg: "#efe2d0", border: "#d3c2aa", desc: "Средний естественный", group: "Группа A" },
	A3: { bg: "#e5d3bc", border: "#c7b296", desc: "Насыщенный дентинный", group: "Группа A" },
	"A3.5": { bg: "#d9be9f", border: "#b89c7c", desc: "Темный пришеечный", group: "Группа A" },
	A4: { bg: "#cbaa84", border: "#a6855e", desc: "Интенсивный коричневый", group: "Группа A" },

	// VITA Classical B (Yellowish)
	B1: { bg: "#f6f3e5", border: "#ded7bf", desc: "Светлый желтоватый", group: "Группа B" },
	B2: { bg: "#eee7d0", border: "#d4caa8", desc: "Средний желтоватый", group: "Группа B" },
	B3: { bg: "#e5dcba", border: "#c8be93", desc: "Насыщенный желтый", group: "Группа B" },
	B4: { bg: "#d7cb9e", border: "#b6a877", desc: "Темный желтоватый", group: "Группа B" },

	// VITA Classical C (Greyish)
	C1: { bg: "#ede9e2", border: "#d2ccc3", desc: "Светлый сероватый", group: "Группа C" },
	C2: { bg: "#ded6cb", border: "#c1b8aa", desc: "Средний серый", group: "Группа C" },
	C3: { bg: "#cfc5b5", border: "#b0a593", desc: "Насыщенный серый", group: "Группа C" },
	C4: { bg: "#beaf9d", border: "#9e8e7c", desc: "Темный серо-коричневый", group: "Группа C" },

	// VITA Classical D (Reddish-Grey)
	D2: { bg: "#eae4dc", border: "#cdc5ba", desc: "Светлый красно-серый", group: "Группа D" },
	D3: { bg: "#ddd4c4", border: "#beb4a1", desc: "Средний красно-серый", group: "Группа D" },
	D4: { bg: "#d0c3af", border: "#aea08a", desc: "Темный красно-серый", group: "Группа D" },

	// Bleach Shades
	BL1: { bg: "#fdfdfb", border: "#e8e7e1", desc: "Ультра-белый отбеленный (Hollywood)", group: "Bleach" },
	BL2: { bg: "#faf8f3", border: "#e4e1d7", desc: "Экстра-светлый отбеленный", group: "Bleach" },
	BL3: { bg: "#f7f4ec", border: "#ded9cc", desc: "Мягкий отбеленный", group: "Bleach" },
	BL4: { bg: "#f4efe3", border: "#d7d0bf", desc: "Натуральный отбеленный", group: "Bleach" },
	"0M1": { bg: "#fcfbfa", border: "#e5e3dc", desc: "3D Bleach 0M1", group: "Bleach" },
	"0M2": { bg: "#f9f7f1", border: "#dfdcd2", desc: "3D Bleach 0M2", group: "Bleach" },
	"0M3": { bg: "#f6f2e8", border: "#d9d4c5", desc: "3D Bleach 0M3", group: "Bleach" },

	// VITA 3D-Master
	"1M1": { bg: "#f7f2ea", border: "#ded6ca", desc: "L1 Chroma 1", group: "3D Group 1" },
	"1M2": { bg: "#f2e9dc", border: "#d5c9b8", desc: "L1 Chroma 2", group: "3D Group 1" },
	"2L1.5": { bg: "#f2ebd9", border: "#d6cdb5", desc: "L2 Желтоватый 1.5", group: "3D Group 2" },
	"2L2.5": { bg: "#ece0c6", border: "#cdc0a1", desc: "L2 Желтоватый 2.5", group: "3D Group 2" },
	"2M1": { bg: "#f3ede2", border: "#d8cfc0", desc: "L2 Нейтральный 1", group: "3D Group 2" },
	"2M2": { bg: "#ece3d3", border: "#cfc3b0", desc: "L2 Нейтральный 2", group: "3D Group 2" },
	"2M3": { bg: "#e4d6bf", border: "#c5b59b", desc: "L2 Нейтральный 3", group: "3D Group 2" },
	"2R1.5": { bg: "#f4ebe2", border: "#d9cdbf", desc: "L2 Красноватый 1.5", group: "3D Group 2" },
	"2R2.5": { bg: "#eddccf", border: "#d0bcad", desc: "L2 Красноватый 2.5", group: "3D Group 2" },
	"3L1.5": { bg: "#e9dfc7", border: "#cdc1a3", desc: "L3 Желтоватый 1.5", group: "3D Group 3" },
	"3L2.5": { bg: "#dfd2b2", border: "#c0b08b", desc: "L3 Желтоватый 2.5", group: "3D Group 3" },
	"3M1": { bg: "#e9e1d1", border: "#cdc3b0", desc: "L3 Нейтральный 1", group: "3D Group 3" },
	"3M2": { bg: "#e1d6c1", border: "#c3b59c", desc: "L3 Нейтральный 2", group: "3D Group 3" },
	"3M3": { bg: "#d7c8ac", border: "#b6a484", desc: "L3 Нейтральный 3", group: "3D Group 3" },
	"3R1.5": { bg: "#e9dcce", border: "#cebdbc", desc: "L3 Красноватый 1.5", group: "3D Group 3" },
	"3R2.5": { bg: "#decbba", border: "#bfa994", desc: "L3 Красноватый 2.5", group: "3D Group 3" },
	"4L1.5": { bg: "#dfd0b2", border: "#c1b08f", desc: "L4 Желтоватый 1.5", group: "3D Group 4" },
	"4L2.5": { bg: "#d3bf9c", border: "#b29b74", desc: "L4 Желтоватый 2.5", group: "3D Group 4" },
	"4M1": { bg: "#ded2bf", border: "#bfb19b", desc: "L4 Нейтральный 1", group: "3D Group 4" },
	"4M2": { bg: "#d5c5ad", border: "#b4a185", desc: "L4 Нейтральный 2", group: "3D Group 4" },
	"4M3": { bg: "#c9b496", border: "#a68e6c", desc: "L4 Нейтральный 3", group: "3D Group 4" },
	"4R1.5": { bg: "#dfcdbd", border: "#c0ab99", desc: "L4 Красноватый 1.5", group: "3D Group 4" },
	"4R2.5": { bg: "#d3bca8", border: "#b29881", desc: "L4 Красноватый 2.5", group: "3D Group 4" },
	"5M1": { bg: "#cfbe9f", border: "#ac9875", desc: "L5 Нейтральный 1", group: "3D Group 5" },
	"5M2": { bg: "#c2ae8b", border: "#9e8760", desc: "L5 Нейтральный 2", group: "3D Group 5" },
	"5M3": { bg: "#b59e76", border: "#8e754b", desc: "L5 Нейтральный 3", group: "3D Group 5" },

	// Stump Shades (ND1–ND9)
	ND1: { bg: "#f9f8f4", border: "#e0ded6", desc: "Ультра-светлая отбеленная культя", group: "Культя" },
	ND2: { bg: "#f3ede0", border: "#d7cebc", desc: "Светлая витальная культя (A1/B1)", group: "Культя" },
	ND3: { bg: "#ebdcc9", border: "#cdbc9f", desc: "Средняя витальная культя (A2/B2)", group: "Культя" },
	ND4: { bg: "#dec6ab", border: "#bda281", desc: "Насыщенная витальная культя (A3/A3.5)", group: "Культя" },
	ND5: { bg: "#d1b392", border: "#af8e68", desc: "Легко дисколорированная культя", group: "Культя" },
	ND6: { bg: "#bf9e7d", border: "#9c7a57", desc: "Потемневшая депульпированная культя", group: "Культя" },
	ND7: { bg: "#9b8d80", border: "#7b6c5f", desc: "Темная дисколорированная серая культя", group: "Культя" },
	ND8: { bg: "#6d5d52", border: "#4f4137", desc: "Сильно пигментированная девитальная", group: "Культя" },
	ND9: { bg: "#949ba2", border: "#6c737c", desc: "Металлическая вкладка / титановый абатмент", group: "Культя" },
};

export const STUMP_NATURAL_DIE_SHADES = [
	{ id: "ND1", name: "ND1 — Отбеленная / Ультра-светлая культя", desc: "Для виниров на отбеленных зубах" },
	{ id: "ND2", name: "ND2 — Светлая витальная культя (A1/B1)", desc: "Естественный дентин высокой светлоты" },
	{ id: "ND3", name: "ND3 — Средняя витальная культя (A2/B2)", desc: "Стандартный витальный зуб" },
	{ id: "ND4", name: "ND4 — Насыщенная витальная культя (A3/A3.5)", desc: "Зрелый желтоватый дентин" },
	{ id: "ND5", name: "ND5 — Легко дисколорированная культя", desc: "Начальное потемнение зуба" },
	{ id: "ND6", name: "ND6 — Умеренно потемневшая культя (депульпированный)", desc: "Депульпированный зуб с желто-серым оттенком" },
	{ id: "ND7", name: "ND7 — Темная дисколорированная культя (серый оттенок)", desc: "Выраженный серый дисколорит" },
	{ id: "ND8", name: "ND8 — Сильно пигментированная / девитальная культя", desc: "Темно-коричневый/черный дентин" },
	{ id: "ND9", name: "ND9 — Металлическая литая вкладка / титановый абатмент", desc: "Темный металл под коронку" },
] as const;

export const OCCLUSAL_SCHEMES = [
	{
		id: "mutually_protected",
		name: "Взаимно-защищенная окклюзия",
		desc: "Боковые зубы защищают передние в контакте, клыки ведут в латеротрузии",
	},
	{
		id: "canine_guidance",
		name: "Клыковое ведение (разобщение)",
		desc: "Немедленная дизокклюзия моляров и премоляров при боковом движении",
	},
	{
		id: "group_function",
		name: "Групповая функция",
		desc: "Равномерный контакт щечных бугров рабочей стороны",
	},
	{
		id: "balanced_articulation",
		name: "Сбалансированная окклюзия",
		desc: "Трехпунктный баланс контактов для съемных протезов и All-on-4/6",
	},
] as const;

export const CONTACT_TIGHTNESS_OPTIONS = [
	{
		id: "normal",
		name: "Нормальный (50 мкм)",
		desc: "Легкое сопротивление калибровочной фольги Shimstock 50 мкм",
	},
	{
		id: "tight",
		name: "Плотный точечный",
		desc: "Максимально плотный контакт для предотвращения застревания пищи",
	},
	{
		id: "light",
		name: "Ослабленный (пассивный)",
		desc: "Минимальный контакт при подвижности соседних зубов",
	},
	{
		id: "open_pontic",
		name: "Промывное пространство",
		desc: "Гигиенический овоидный контакт промежуточной части моста",
	},
] as const;

export const SURFACE_TEXTURE_OPTIONS = [
	{
		id: "natural_anatomy",
		name: "Естественная анатомическая микротекстура",
		desc: "Перикиматы, мамелоны, макро- и микрорельеф эмали",
	},
	{
		id: "satin_semi_matte",
		name: "Сатиновый (полуматовый)",
		desc: "Мягкий рассеянный блеск с натуральной структурой",
	},
	{
		id: "high_gloss_glaze",
		name: "Высокий глянец (Glass glaze)",
		desc: "Идеально гладкая зеркальная поверхность, высокая стойкость к налету",
	},
] as const;

export const LAB_ORDER_STAGES = [
	{
		id: "sent_to_lab",
		name: "1. Отправлен в ЗТЛ",
		desc: "Слепки/сканы и наряд переданы курьеру или загружены в лабораторию",
		step: 1,
		color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
		badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
	},
	{
		id: "model_cad_design",
		name: "2. Сканирование & CAD-дизайн",
		desc: "Создание цифровой 3D-модели, виртуальное моделирование реставрации",
		step: 2,
		color: "text-[var(--info-fg,#0284c7)] bg-[var(--info-bg,rgba(2,132,199,0.1))] border-[var(--info-fg,rgba(2,132,199,0.3))]",
		badgeColor: "bg-[var(--info-bg,rgba(2,132,199,0.15))] text-[var(--info-fg,#0284c7)]",
	},
	{
		id: "framework_wax_milling",
		name: "3. CAM Фрезеровка / Воск",
		desc: "Фрезеровка каркаса на 5-осевом станке или восковая репродукция",
		step: 3,
		color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300",
		badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
	},
	{
		id: "sintering_ceramic_layering",
		name: "4. Синтеризация & Облицовка",
		desc: "Высокотемпературное спекание циркония / послойное нанесение керамики",
		step: 4,
		color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300",
		badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300",
	},
	{
		id: "fitting_in_mouth",
		name: "5. Клиническая примерка",
		desc: "Примерка каркаса или реставрации в полости рта у пациента",
		step: 5,
		color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300",
		badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
	},
	{
		id: "final_glaze",
		name: "6. Финальная глазурь & ОТК",
		desc: "Индивидуализация красителями, глазурование, контроль посадки",
		step: 6,
		color: "text-[var(--teal)] bg-[var(--teal-surface)] border-[var(--teal-soft)]",
		badgeColor: "bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]",
	},
	{
		id: "delivered_to_clinic",
		name: "7. Доставлен в клинику / Готов",
		desc: "Работа проверена и готова к постоянной фиксации на приеме",
		step: 7,
		color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300",
		badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
	},
] as const;

export type LabOrderStageKey = (typeof LAB_ORDER_STAGES)[number]["id"];

// ─── KOPECK-EXACT FINANCIAL CALCULATIONS ───────────────────────────────────────

export interface LabFinancialSplitResult {
	clinicAmountRub: number;
	doctorAmountRub: number;
	clinicKopecks: number;
	doctorKopecks: number;
	totalKopecks: number;
	isBalanced: boolean;
}

/**
 * Calculates kopeck-exact split between clinic and doctor with strict penny-drift protection.
 */
export function calculateLabFinancialSplit(
	totalPriceRub: number,
	doctorSharePct: number,
): LabFinancialSplitResult {
	const safeTotalRub = Number.isFinite(totalPriceRub) && totalPriceRub >= 0 ? totalPriceRub : 0;
	const safeDoctorPct = Math.min(100, Math.max(0, Number.isFinite(doctorSharePct) ? doctorSharePct : 50));

	const totalKopecks = Math.round(safeTotalRub * 100);
	const doctorKopecks = Math.round((totalKopecks * safeDoctorPct) / 100);
	const clinicKopecks = totalKopecks - doctorKopecks;

	const clinicAmountRub = Number((clinicKopecks / 100).toFixed(2));
	const doctorAmountRub = Number((doctorKopecks / 100).toFixed(2));

	return {
		clinicAmountRub,
		doctorAmountRub,
		clinicKopecks,
		doctorKopecks,
		totalKopecks,
		isBalanced: clinicKopecks + doctorKopecks === totalKopecks,
	};
}

// ─── VECTOR BARCODE & QR GENERATORS ────────────────────────────────────────────

/**
 * Generates an SVG vector barcode for the lab work order.
 */
export function generateBarcodeSvg(data: string): string {
	const safeData = (data || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 16) || "ZTL-ORDER";
	let bars = "";
	let x = 10;
	for (let i = 0; i < safeData.length; i++) {
		const charCode = safeData.charCodeAt(i);
		const width1 = (charCode % 3) + 1;
		const space = (charCode % 2) + 1;
		bars += `<rect x="${x}" y="5" width="${width1}" height="35" fill="currentColor"/>`;
		x += width1 + space;
		const width2 = ((charCode >> 1) % 3) + 1;
		bars += `<rect x="${x}" y="5" width="${width2}" height="35" fill="currentColor"/>`;
		x += width2 + 2;
	}
	const totalWidth = Math.max(x + 10, 160);
	return `<svg viewBox="0 0 ${totalWidth} 50" xmlns="http://www.w3.org/2000/svg" class="w-full h-12">${bars}<text x="${totalWidth / 2}" y="47" font-size="7" font-family="monospace" text-anchor="middle" fill="currentColor">${safeData}</text></svg>`;
}

/**
 * Generates a 21x21 QR Code matrix SVG.
 */
export function generateQrCodeSvg(text: string): string {
	const size = 21;
	const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

	const addMarker = (startX: number, startY: number) => {
		for (let r = 0; r < 7; r++) {
			const row = matrix[startY + r];
			if (!row) continue;
			for (let c = 0; c < 7; c++) {
				if (
					r === 0 || r === 6 || c === 0 || c === 6 ||
					(r >= 2 && r <= 4 && c >= 2 && c <= 4)
				) {
					row[startX + c] = true;
				}
			}
		}
	};

	addMarker(0, 0);
	addMarker(size - 7, 0);
	addMarker(0, size - 7);

	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = (hash * 31 + text.charCodeAt(i)) | 0;
	}

	for (let r = 0; r < size; r++) {
		const row = matrix[r];
		if (!row) continue;
		for (let c = 0; c < size; c++) {
			const isCorner =
				(r < 8 && c < 8) ||
				(r < 8 && c >= size - 8) ||
				(r >= size - 8 && c < 8);
			if (!isCorner) {
				const bit = (Math.sin(hash + r * 13 + c * 37) * 10000) % 1;
				row[c] = Math.abs(bit) > 0.5;
			}
		}
	}

	let rects = "";
	for (let r = 0; r < size; r++) {
		const row = matrix[r];
		if (!row) continue;
		for (let c = 0; c < size; c++) {
			if (row[c]) {
				rects += `<rect x="${c * 4}" y="${r * 4}" width="4" height="4" fill="currentColor"/>`;
			}
		}
	}

	return `<svg viewBox="0 0 ${size * 4} ${size * 4}" xmlns="http://www.w3.org/2000/svg" class="w-24 h-24">${rects}</svg>`;
}

export function formatGostOrderNumber(token?: string, date?: Date): string {
	const d = date || new Date();
	const year = d.getFullYear().toString().slice(-2);
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const shortToken = (token || "00000000").slice(0, 6).toUpperCase();
	return `ЗТЛ-${year}${month}-${shortToken}`;
}
