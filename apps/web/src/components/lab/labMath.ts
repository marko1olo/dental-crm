/**
 * labMath.ts — Types, Constants, VITA Shades, and Kopeck-Exact Financial Math
 * for Dental Lab Orders & Prosthetics Work Orders.
 */

import { generateQrMatrix, generateQrCodeSvg as sharedGenerateQrCodeSvg } from "@dental/shared";

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
	impressionType?: string | null;
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
	isWarrantyRework?: boolean;
	reworkReason?: string;
	originalOrderId?: string;
	originalOrderNumber?: string;
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
	readonly patientDepositRub?: number | undefined;
	readonly stageTotalRub?: number | undefined;
	readonly stagePaidRub?: number | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly skipFinancialGate?: boolean | undefined;
	readonly treatmentPlanAgeDays?: number | undefined;
	readonly isPlanExpired?: boolean | undefined;
	readonly onOrderSaved?: ((order: DentalLabOrderData) => void) | undefined;
}

export interface LabTrackingDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: DentalLabOrderData | null;
	readonly patientDepositRub?: number | undefined;
	readonly stageTotalRub?: number | undefined;
	readonly stagePaidRub?: number | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly onStageUpdate?: ((orderId: string, newStage: LabOrderStageKey, note?: string) => Promise<void> | void) | undefined;
	readonly onFittingDateUpdate?: ((orderId: string, dates: { frameworkTrialDate?: string; ceramicTrialDate?: string; deliveryDate?: string }) => Promise<void> | void) | undefined;
}

// ─── CONSTANTS & DICTIONARIES ──────────────────────────────────────────────────

export const CONSTRUCTION_TYPES = [
	{
		id: "single_crown",
		name: "Одиночная коронка",
		desc: "Анатомическая коронка (полная или с редукцией)",
		icon: "crown",
		category: "Несъемное",
	},
	{
		id: "bridge",
		name: "Мостовидный протез",
		desc: "Конструкция с опорными коронками и промежутком",
		icon: "bridge",
		category: "Несъемное",
	},
	{
		id: "veneer",
		name: "Керамический винир",
		desc: "Ультратонкая эстетическая накладка E.max / Feldspar",
		icon: "veneer",
		category: "Эстетика",
	},
	{
		id: "inlay_onlay",
		name: "Вкладка / Накладка (Inlay/Onlay/Overlay)",
		desc: "Керамическая или композитная микропротезная реставрация",
		icon: "inlay",
		category: "Микропротезирование",
	},
	{
		id: "all_on_4_6",
		name: "Тотальный протез All-on-4 / All-on-6",
		desc: "Балочный или винтовой условно-съемный протез на имплантатах",
		icon: "implant",
		category: "Имплантология",
	},
	{
		id: "all_on_arch",
		name: "Тотальный протез на всю челюсть",
		desc: "Условно-съемный балочный/винтовой протез челюсти",
		icon: "arch",
		category: "Имплантология",
	},
	{
		id: "implant_abutment",
		name: "Индивидуальный абатмент + коронка",
		desc: "Титановый / циркониевый абатмент на винтовой фиксации",
		icon: "abutment",
		category: "Имплантология",
	},
	{
		id: "clasp_denture",
		name: "Бюгельный / Частично-съемный протез",
		desc: "Протез на замках (аттачменах) или кламмерах",
		icon: "denture",
		category: "Съемное",
	},
	{
		id: "aligner_nightguard",
		name: "Элайнер / Окклюзионная сплинт-каппа",
		desc: "Ортодонтический или миорелаксирующий прозрачный сплинт",
		icon: "aligner",
		category: "Каппы",
	},
	{
		id: "aligners_nightguard",
		name: "Элайнеры / Сплинт-шина",
		desc: "Окклюзионная защитная капа / ортодонтические элайнеры",
		icon: "guard",
		category: "Каппы",
	},
	{
		id: "endocrown",
		name: "Эндокоронка",
		desc: "Монолитная коронка с фиксацией в пульповой камере",
		icon: "endocrown",
		category: "Микропротезирование",
	},
	{
		id: "core_buildup_post",
		name: "Культевая вкладка (Штифтовая)",
		desc: "Разборная или неразборная культевая штифтовая вкладка (КХС / оксид циркония)",
		icon: "post",
		category: "Несъемное",
	},
] as const;

export const MATERIALS = [
	{
		id: "zirconia_multilayer",
		name: "Диоксид циркония ZrO₂ Katana / Prettau (Multi-layer)",
		desc: "Градиентная транслюцентность ZrO₂, прочность 1100 МПа",
		category: "Цирконий",
		tag: "Премиум",
		costTier: "Премиум",
		baseCostKopecks: 650000,
		unitCostRub: 6500,
	},
	{
		id: "emax_lithium_disilicate",
		name: "Прессованная керамика IPS e.max Press / CAD (Дисиликат лития)",
		desc: "Максимальная флюоресценция и адгезивная фиксация (500 МПа)",
		category: "Стеклокерамика",
		tag: "Эстетика",
		costTier: "Эстетик",
		baseCostKopecks: 750000,
		unitCostRub: 7500,
	},
	{
		id: "pfm_cocr",
		name: "Металлокерамика CoCr (фрезерованная / литая)",
		desc: "Классическая металлокерамическая конструкция CoCr",
		category: "Металл",
		tag: "Стандарт",
		costTier: "Стандарт",
		baseCostKopecks: 400000,
		unitCostRub: 4000,
	},
	{
		id: "pmma_temporary",
		name: "Временная пластмасса PMMA CAD/CAM",
		desc: "Высокоточный фрезерованный полимер для провизорного ношения",
		category: "Временные",
		tag: "Временная",
		costTier: "Эконом",
		baseCostKopecks: 150000,
		unitCostRub: 1500,
	},
	{
		id: "titanium_custom_abutment",
		name: "Индивидуальный абатмент Ti-Base Grade 5 (Ti-6Al-4V ELI)",
		desc: "Биосовместимый титановый сплав с шахтой винта для имплантатов",
		category: "Титан",
		tag: "Импланты",
		costTier: "Премиум",
		baseCostKopecks: 550000,
		unitCostRub: 5500,
	},
	{
		id: "peek_biohpp",
		name: "Биополимер PEEK / BioHPP",
		desc: "Безметалловый амортизирующий каркас с модулем кости",
		category: "Полимер",
		tag: "Инновация",
		costTier: "Премиум",
		baseCostKopecks: 800000,
		unitCostRub: 8000,
	},
	{
		id: "biocompatible_3d_resin",
		name: "Биосовместимый 3D-фотополимер",
		desc: "Высокоточная печать капп, сплинтов и шаблонов",
		category: "3D-печать",
		tag: "3D-печать",
		costTier: "Стандарт",
		baseCostKopecks: 300000,
		unitCostRub: 3000,
	},
	{
		id: "cobalt_chrome_cocr",
		name: "Кобальт-хромовый сплав CoCr (КХС литой / фрезерованный)",
		desc: "Высокопрочный литейный сплав CoCr для штифтовых культевых вкладок и каркасов",
		category: "Металл",
		tag: "Стандарт",
		costTier: "Стандарт",
		baseCostKopecks: 250000,
		unitCostRub: 2500,
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
		id: "in_progress" as const,
		name: "1. В работе",
		desc: "Заказ передан в лабораторию и находится в процессе изготовления",
		step: 1,
		color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
		badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
	},
	{
		id: "fitting_scheduled" as const,
		name: "2. Примерка назначена",
		desc: "Работа изготовлена ЗТЛ, назначена дата клинической примерки в расписании",
		step: 2,
		color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300",
		badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
	},
	{
		id: "delivered_completed" as const,
		name: "3. Сдано",
		desc: "Ортопедическая конструкция окончательно зафиксирована в полости рта",
		step: 3,
		color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300",
		badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
	},
	{
		id: "correction_remake" as const,
		name: "4. Коррекция",
		desc: "Возврат в ЗТЛ на коррекцию окклюзии, цвета или переделку",
		step: 4,
		color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-300",
		badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
	},
] as const;

export type LabOrderStageKey =
	| (typeof LAB_ORDER_STAGES)[number]["id"]
	| "sent_to_lab"
	| "model_cad_design"
	| "framework_wax_milling"
	| "sintering_ceramic_layering"
	| "fitting_in_mouth"
	| "final_glaze"
	| "delivered_to_clinic"
	| "completed";

// ─── CANONICAL 4-STATUS DENTAL LAB WORKFLOW ───────────────────────────────────

export type CanonicalLabOrderStatus = "sent" | "fitting" | "ready" | "completed";

export interface CanonicalLabStatusInfo {
	readonly id: CanonicalLabOrderStatus;
	readonly label: string;
	readonly shortLabel: string;
	readonly desc: string;
	readonly bgClass: string;
	readonly textClass: string;
	readonly borderClass: string;
	readonly activeClass: string;
}

export const CANONICAL_LAB_STATUSES: readonly CanonicalLabStatusInfo[] = [
	{
		id: "sent",
		label: "1. Слепок / Оттиск (Передан в ЗТЛ)",
		shortLabel: "Слепок",
		desc: "Оттиски / цифровые сканы переданы в лабораторию",
		bgClass: "bg-blue-50 dark:bg-blue-950/40",
		textClass: "text-blue-700 dark:text-blue-300",
		borderClass: "border-blue-200 dark:border-blue-800",
		activeClass: "bg-blue-600 text-white border-blue-700",
	},
	{
		id: "ready",
		label: "2. Каркас / Конструкция (CAD/CAM)",
		shortLabel: "Каркас",
		desc: "Каркас смоделирован, отфрезерован и поступил в клинику",
		bgClass: "bg-teal-50 dark:bg-teal-950/40",
		textClass: "text-teal-700 dark:text-teal-300",
		borderClass: "border-teal-200 dark:border-teal-800",
		activeClass: "bg-teal-600 text-white border-teal-700",
	},
	{
		id: "fitting",
		label: "3. Примерка у пациента",
		shortLabel: "Примерка",
		desc: "Клиническая примерка каркаса / бисквита в полости рта",
		bgClass: "bg-amber-50 dark:bg-amber-950/40",
		textClass: "text-amber-700 dark:text-amber-300",
		borderClass: "border-amber-200 dark:border-amber-800",
		activeClass: "bg-amber-600 text-white border-amber-700",
	},
	{
		id: "completed",
		label: "4. Фиксация / Сдан",
		shortLabel: "Фиксация",
		desc: "Конструкция окончательно зафиксирована в полости рта",
		bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
		textClass: "text-emerald-700 dark:text-emerald-300",
		borderClass: "border-emerald-200 dark:border-emerald-800",
		activeClass: "bg-emerald-600 text-white border-emerald-700",
	},
] as const;

/**
 * Maps any granular raw status / stage key into the canonical 4-step workflow.
 */
export function mapToCanonicalStatus(rawStatus?: string | null): CanonicalLabOrderStatus {
	if (!rawStatus) return "sent";
	const s = rawStatus.toLowerCase();
	if (s === "draft" || s === "sent" || s === "sent_to_lab" || s === "in_progress" || s === "model_cad_design" || s === "framework_wax_milling" || s === "sintering_ceramic_layering") {
		return "sent";
	}
	if (s === "fitting" || s === "refitting" || s === "fitting_in_mouth") {
		return "fitting";
	}
	if (s === "shipped" || s === "delivered" || s === "received" || s === "ready" || s === "final_glaze" || s === "delivered_to_clinic") {
		return "ready";
	}
	if (s === "completed" || s === "fitted") {
		return "completed";
	}
	return "sent";
}

/**
 * Calculates total material cost in whole kopecks based on selected teeth count.
 */
export function calculateMaterialTotalCostKopecks(materialId: string, teethCount = 1): number {
	const count = Math.max(1, teethCount);
	const mat = MATERIALS.find((m) => m.id === materialId);
	const unitKopecks = (mat as any)?.baseCostKopecks ?? 650000;
	return unitKopecks * count;
}

/**
 * Adds specified number of working business days (skipping Saturday and Sunday)
 * for dental lab orders per standard clinical protocol (+7 working days).
 */
export function addWorkingDays(startDate: Date, workingDays = 7): Date {
	const result = new Date(startDate);
	let added = 0;
	while (added < workingDays) {
		result.setDate(result.getDate() + 1);
		const day = result.getDay();
		if (day !== 0 && day !== 6) {
			added++;
		}
	}
	return result;
}

/**
 * Default standard parameters for 1-click lab order creation per Mandate 8e / Section VII:
 * Zirconia crown (ZrO2), VITA shade A2, natural anatomy, 5 business days deadline.
 */
export const ONE_CLICK_LAB_DEFAULTS = {
	materialId: "zirconia_multilayer",
	materialName: "Коронка ZrO2 (диоксид циркония)",
	colorVita: "A2",
	workingDays: 5,
	translucency: "HT",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	shadeSystem: "classical" as const,
	restorationTypeSingle: "single_crown",
	restorationTypeBridge: "bridge",
};

export interface ExpressLabPreset {
	id: string;
	title: string;
	shortDesc: string;
	constructionType: string;
	materialId: string;
	colorVita: string;
	workingDays: number;
	priceRub: number;
	occlusalScheme: string;
	contactTightness: string;
	surfaceTexture: string;
	cementGapMicrons: number;
	badge: string;
}

export const EXPRESS_LAB_PRESETS: ExpressLabPreset[] = [
	{
		id: "zirconia_a2_std",
		title: "Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней",
		shortDesc: "Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней",
		constructionType: "single_crown",
		materialId: "zirconia_multilayer",
		colorVita: "A2",
		workingDays: 5,
		priceRub: 6500,
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
		priceRub: 6500,
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
		priceRub: 7500,
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
		priceRub: 4000,
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
		priceRub: 12000,
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
		occlusalScheme: "mutually_protected",
		contactTightness: "normal",
		surfaceTexture: "natural_anatomy",
		cementGapMicrons: 30,
		badge: "Гарантия (0 ₽)",
	},
];

// ─── LAB ORDER TO SCHEDULE SLOT PLANNING HELPER ───────────────────────────────

export interface LabScheduleSlotInfo {
	patientId: string;
	patientName?: string | undefined;
	doctorId?: string | null | undefined;
	doctorName?: string | null | undefined;
	targetDateIso: string;
	reason: string;
	toothFdi?: string | null | undefined;
	material?: string | null | undefined;
}

/**
 * Extracts slot planning info from a lab order to seamlessly bind dueDate with ScheduleView.
 */
export function buildLabAppointmentDraft(order: DentalLabOrderData | {
	patientId: string;
	patientName?: string;
	doctorId?: string | null;
	doctorName?: string | null;
	toothFdi?: string | null;
	material?: string | null;
	dueDate?: string | null;
	status?: string;
}): LabScheduleSlotInfo | null {
	const targetDate =
		order.dueDate ||
		(order as any).deliveryDate ||
		(order as any).ceramicTrialDate ||
		(order as any).frameworkTrialDate;

	if (!targetDate) return null;

	const toothStr = order.toothFdi ? `зуб ${order.toothFdi}` : "ортопедия";
	const matStr = order.material ? ` (${order.material})` : "";
	const isFitting = order.status === "fitting" || order.status === "refitting";
	const actionName = isFitting ? "Примерка конструкции ЗТЛ" : "Установка / фиксация конструкции ЗТЛ";

	return {
		patientId: order.patientId,
		patientName: order.patientName ?? undefined,
		doctorId: order.doctorId ?? undefined,
		doctorName: order.doctorName ?? undefined,
		targetDateIso: String(targetDate),
		reason: `${actionName}: ${toothStr}${matStr}`,
		toothFdi: order.toothFdi ?? undefined,
		material: order.material ?? undefined,
	};
}

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

// Canonical Code 128 (ISO/IEC 15417) Patterns for Symbol Indexes 0 to 106
const CODE128_PATTERNS = [
	"212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
	"221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
	"221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
	"212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
	"231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
	"231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
	"314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
	"112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
	"111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
	"214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
	"114131", "311141", "411131", "211412", "211214", "211232", "2331112",
] as const;

/**
 * Generates an SVG vector barcode for the lab work order using canonical Code 128 (ISO/IEC 15417).
 */
export function generateBarcodeSvg(data: string): string {
	const rawText = (data || "").trim() || "ZTL-ORDER";
	// Code 128 Set B encodes standard ASCII 32..126
	const safeData = rawText.replace(/[^\x20-\x7E]/g, "-").slice(0, 24) || "ZTL-ORDER";

	const symbols: number[] = [];
	let checksum = 104; // Start Code B (symbol index 104)

	for (let i = 0; i < safeData.length; i++) {
		const code = safeData.charCodeAt(i);
		const sym = code >= 32 && code <= 126 ? code - 32 : 0;
		symbols.push(sym);
		checksum += (i + 1) * sym;
	}
	checksum %= 103;

	const sequence = [104, ...symbols, checksum, 106];
	let x = 10;
	let bars = "";
	const barHeight = 35;

	for (const symIndex of sequence) {
		const pattern = CODE128_PATTERNS[symIndex];
		if (!pattern) continue;
		for (let p = 0; p < pattern.length; p++) {
			const width = Number(pattern[p]);
			const isBar = p % 2 === 0;
			if (isBar) {
				bars += `<rect x="${x}" y="5" width="${width}" height="${barHeight}" fill="currentColor"/>`;
			}
			x += width;
		}
	}
	const totalWidth = Math.max(x + 10, 160);
	return `<svg viewBox="0 0 ${totalWidth} 50" xmlns="http://www.w3.org/2000/svg" class="w-full h-12">${bars}<text x="${totalWidth / 2}" y="47" font-size="7" font-family="monospace" text-anchor="middle" fill="currentColor">${safeData}</text></svg>`;
}

/**
 * Generates an ISO/IEC 18004 Reed-Solomon QR Code vector SVG for the lab work order.
 * Strictly zero fake Math.sin generators — uses canonical Galois Field GF(256) Reed-Solomon engine.
 */
export function generateQrCodeSvg(text: string): string {
	const safeText = text || "DENTE-ZTL";
	try {
		const { matrix, size } = generateQrMatrix(safeText, "M");
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
	} catch {
		return sharedGenerateQrCodeSvg(safeText, { margin: 2 });
	}
}

export function formatGostOrderNumber(token?: string, date?: Date): string {
	const d = date || new Date();
	const year = d.getFullYear().toString().slice(-2);
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const shortToken = (token || "00000000").slice(0, 6).toUpperCase();
	return `ЗТЛ-${year}${month}-${shortToken}`;
}
