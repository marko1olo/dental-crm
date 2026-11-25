import type {
	Canonical5LabStatus,
	Canonical5LabStatusItem,
	CanonicalPgLabStatus,
	ImpressionType,
	LabOrderStatus,
	LabPipeline5StageDefinition,
	LabPipeline5StageKey,
	LabPipeline7StageDefinition,
	LabPipeline7StageKey,
	LabWorkType,
} from "./labOrderSchemasAndEnums.js";

export const IMPRESSION_MATERIALS_RU: Record<ImpressionType, { nameRu: string; category: string; descriptionRu: string }> = {
	a_silicone: {
		nameRu: "А-силикон (Винилполисилоксан / VPS)",
		category: "Эластомерные оттиски",
		descriptionRu: "Высокоточный А-силикон (база + корригирующий слой) с минимальной усадкой (<0.1%) и гидрофильностью.",
	},
	c_silicone: {
		nameRu: "С-силикон (Конденсационный силикон)",
		category: "Эластомерные оттиски",
		descriptionRu: "Стандартный поликонденсационный силикон для базовых двухэтапных и одноэтапных оттисков.",
	},
	polyether: {
		nameRu: "Полиэфир (Impregum / Permadyne)",
		category: "Полиэфирные оттиски",
		descriptionRu: "Истинная гидрофильность во влажной среде зубодесневой борозды, идеален для протезирования на имплантатах.",
	},
	hydrocolloid: {
		nameRu: "Обратимый гидроколлоид (Агар-агар)",
		category: "Гидроколлоидные массы",
		descriptionRu: "Сверхточная передача поддесневых уступов и микрорельефа витальных культей.",
	},
	alginate: {
		nameRu: "Альгинатная масса (Необратимый гидроколлоид)",
		category: "Диагностические оттиски",
		descriptionRu: "Альгинат высокой стабильности для диагностических моделей, антагонистов и капп.",
	},
	digital_scan: {
		nameRu: "Интраоральный цифровой 3D-скан (STL / PLY / OBJ)",
		category: "Цифровой протокол CAD/CAM",
		descriptionRu: "Прямой оптический скан челюстей сканером (Medit / 3Shape TRIOS / Shining3D / PrimeScan).",
	},
	digital_scan_stl_ply: {
		nameRu: "Интраоральный цифровой 3D-скан (STL / PLY)",
		category: "Цифровой протокол CAD/CAM",
		descriptionRu: "Файлы оптического сканирования челюстей с текстурой в цвете (PLY) и полигональной сеткой (STL).",
	},
	pvs_silicone: {
		nameRu: "PVS-силикон (Поливинилсилоксан)",
		category: "Эластомерные оттиски",
		descriptionRu: "Эластомерный слепочный материал длительной размерной стабильности.",
	},
	other: {
		nameRu: "Прочий слепочный материал",
		category: "Индивидуальный",
		descriptionRu: "Комбинированная или индивидуальная методика снятия оттиска.",
	},
};

export const CANONICAL_7STAGE_LAB_PIPELINE: Record<LabPipeline7StageKey, LabPipeline7StageDefinition> = {
	impression_scan: {
		id: "impression_scan",
		step: 1,
		titleRu: "1. Слепок / Интраоральный скан",
		shortTitleRu: "Слепок/Скан",
		descriptionRu: "Отправка STL/PLY цифрового скана или физического слепка с указанием оттискной массы (А-силикон, С-силикон, полиэфир, гидроколлоид, альгинат).",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]",
		iconName: "scan",
	},
	cad_modeling: {
		id: "cad_modeling",
		step: 2,
		titleRu: "2. 3D-моделирование / CAD",
		shortTitleRu: "CAD-моделирование",
		descriptionRu: "Цифровое моделирование анатомической формы, согласование виртуального wax-up, проверка окклюзионных контактов.",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]",
		iconName: "layers",
	},
	framework_production: {
		id: "framework_production",
		step: 3,
		titleRu: "3. Производство каркаса",
		shortTitleRu: "Фрезеровка/Литье",
		descriptionRu: "Фрезерование диоксида циркония ZrO₂, фрезерованный титан или аддитивная 3D-печать каркаса.",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]",
		iconName: "tool",
	},
	framework_fitting: {
		id: "framework_fitting",
		step: 4,
		titleRu: "4. Примерка каркаса",
		shortTitleRu: "Примерка каркаса",
		descriptionRu: "Клиническая примерка изготовленного каркаса в полости рта, проверка пассивной посадки и краевого прилегания.",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]",
		iconName: "crosshair",
	},
	ceramic_glazing: {
		id: "ceramic_glazing",
		step: 5,
		titleRu: "5. Облицовка & Глазурование",
		shortTitleRu: "Керамика/Глазурь",
		descriptionRu: "Послойное нанесение керамических масс, индивидуализация (мамелоны, прозрачный край), глазурование и спекание.",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]",
		iconName: "palette",
	},
	otk_control: {
		id: "otk_control",
		step: 6,
		titleRu: "6. Контроль качества (ОТК)",
		shortTitleRu: "Контроль ОТК",
		descriptionRu: "Инструментальный контроль качества лаборатории: проверка под микроскопом, толщина стенок, прочность фиксации, стерилизация.",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]",
		iconName: "shield-check",
	},
	clinic_delivery: {
		id: "clinic_delivery",
		step: 7,
		titleRu: "7. Доставка в клинику",
		shortTitleRu: "Готово / Фиксация",
		descriptionRu: "Работа прибыла в клинику, прошла входной контроль, готова к постоянной фиксации, выписан гарантийный паспорт.",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]",
		iconName: "check-circle",
	},
};

export const CANONICAL_5STAGE_LAB_PIPELINE: Record<LabPipeline5StageKey, LabPipeline5StageDefinition> = {
	impression_scan: {
		id: "impression_scan",
		step: 1,
		titleRu: "1. Слепок / Интраоральный скан",
		shortTitleRu: "Слепок/Скан",
		descriptionRu: "Отправка STL/PLY цифрового скана или физического слепка с указанием оттискной массы (А-силикон, С-силикон, полиэфир, гидроколлоид, альгинат).",
		badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
		iconName: "scan",
	},
	cad_modeling: {
		id: "cad_modeling",
		step: 2,
		titleRu: "2. 3D-моделирование / CAD",
		shortTitleRu: "CAD-моделирование",
		descriptionRu: "Цифровое моделирование анатомической формы, согласование виртуального wax-up, проверка окклюзионных контактов.",
		badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
		iconName: "layers",
	},
	framework_fitting: {
		id: "framework_fitting",
		step: 3,
		titleRu: "3. Примерка каркаса",
		shortTitleRu: "Примерка каркаса",
		descriptionRu: "Фрезерование или литье каркаса (диоксид циркония ZrO₂, фрезерованный титан, КХС / CoCr), клиническая примерка в полости рта.",
		badgeClass: "bg-[var(--warning-soft)] text-[var(--warning)]",
		iconName: "tool",
	},
	ceramic_layering: {
		id: "ceramic_layering",
		step: 4,
		titleRu: "4. Нанесение керамики",
		shortTitleRu: "Облицовка & Глазурь",
		descriptionRu: "Послойное нанесение керамических масс, индивидуализация (мамелоны, кальцификаты), расцветка VITA Classical / 3D-Master / Bleach, глазурование.",
		badgeClass: "bg-[var(--primary-soft)] text-[var(--primary)]",
		iconName: "palette",
	},
	ready_fixation: {
		id: "ready_fixation",
		step: 5,
		titleRu: "5. Готово к фиксации",
		shortTitleRu: "Готово / Фиксация",
		descriptionRu: "Работа прибыла в клинику, назначена дата и время сдачи, оформлен гарантийный паспорт ортопедической конструкции.",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
		iconName: "check-circle",
	},
};

export const CANONICAL_5_CLINICAL_LAB_STATUSES: readonly Canonical5LabStatusItem[] = [
	{
		id: "sent",
		step: 1,
		labelRu: "1. Отправлен в ЗТЛ",
		shortLabelRu: "Отправлен",
		descRu: "Оттиски (силикон/скан) и клиническое задание переданы в лабораторию",
		badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
	},
	{
		id: "in_progress",
		step: 2,
		labelRu: "2. В работе у техника",
		shortLabelRu: "В работе",
		descRu: "3D-моделирование CAD/CAM, фрезеровка каркаса или нанесение керамики",
		badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
	},
	{
		id: "fitting",
		step: 3,
		labelRu: "3. Примерка у пациента",
		shortLabelRu: "Примерка",
		descRu: "Клиническая примерка каркаса, восковой моделировки или бисквита",
		badgeClass: "bg-[var(--warning-soft)] text-[var(--warning)]",
	},
	{
		id: "ready",
		step: 4,
		labelRu: "4. Готов в клинике",
		shortLabelRu: "Готов",
		descRu: "Работа завершена лабораторией, проверена и ожидает визита пациента на сдачу",
		badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300",
	},
	{
		id: "completed",
		step: 5,
		labelRu: "5. Сдан / Зафиксирован",
		shortLabelRu: "Сдан",
		descRu: "Конструкция окончательно зафиксирована в полости рта, выдан паспорт изделия",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
	},
] as const;

/**
 * Канонический маппинг из 5 клинических стадий UI в 12 допустимых статусов PostgreSQL CHECK constraint (0231).
 * Защищает от ошибки "violates check constraint lab_orders_status_check".
 */
export const STAGE_TO_CANONICAL_PG_STATUS: Record<Canonical5LabStatus, CanonicalPgLabStatus> = {
	sent: "sent",
	in_progress: "in_progress",
	fitting: "fitting",       // работа на клинической примерке у пациента
	ready: "ready_in_clinic", // работа завершена лабораторией и готова в клинике
	completed: "completed",   // конструкция зафиксирована во рту
};

// ─── CANONICAL RUSSIAN LABELS & STATUTORY A4 PRESCRIPTION ENGINE ────────────

export const LAB_WORK_TYPE_LABELS_RU: Record<LabWorkType, string> = {
	crown: "Коронка",
	bridge: "Мостовидный протез",
	denture: "Съемный протез",
	implant: "Протезирование на имплантате",
	veneer: "Винир",
	orthodontic: "Ортодонтический аппарат",
	inlay_onlay: "Вкладка / Накладка",
	splint_nightguard: "Каппа / Сплинт",
	repair: "Ремонт протеза",
	other: "Прочее",
};

export const LAB_ORDER_STATUS_LABELS_RU: Record<LabOrderStatus, string> = {
	draft: "Черновик",
	sent: "Отправлен в ЗТЛ",
	in_progress: "В работе у техника",
	shipped: "Отправлен лабораторией",
	received: "Доставлен в клинику",
	ready: "Готов в ЗТЛ",
	ready_in_clinic: "Готов в клинике",
	fitting: "На примерке у пациента",
	refitting: "На переделке / коррекции",
	fitted: "Припасован / Сдан пациенту",
	completed: "Завершен / Установлен",
	cancelled: "Отменен",
	rejected_remake: "Брак / На переделку",
};

export const LAB_IMPRESSION_LABELS_RU: Record<ImpressionType, string> = {
	digital_scan: "Цифровой скан IOS",
	digital_scan_stl_ply: "Цифровой 3D-скан (STL/PLY)",
	alginate: "Альгинатный слепок",
	pvs_silicone: "А-Силикон / C-Силикон",
	a_silicone: "А-силикон (VPS)",
	c_silicone: "С-силикон",
	polyether: "Полиэфирный оттиск",
	hydrocolloid: "Гидроколлоидная масса",
	other: "Прочее",
};

export const VITA_CLASSICAL_SHADES = [
	"A1",
	"A2",
	"A3",
	"A3.5",
	"A4",
	"B1",
	"B2",
	"B3",
	"B4",
	"C1",
	"C2",
	"C3",
	"C4",
	"D2",
	"D3",
	"D4",
] as const;

export const VITA_BLEACH_SHADES = [
	"0M1",
	"0M2",
	"0M3",
	"BL1",
	"BL2",
	"BL3",
	"BL4",
	"OM1",
	"OM2",
	"OM3",
] as const;

export const VITA_3D_MASTER_SHADES = [
	"1M1",
	"1M2",
	"2L1.5",
	"2L2.5",
	"2M1",
	"2M2",
	"2M3",
	"2R1.5",
	"2R2.5",
	"3L1.5",
	"3L2.5",
	"3M1",
	"3M2",
	"3M3",
	"3R1.5",
	"3R2.5",
	"4L1.5",
	"4L2.5",
	"4M1",
	"4M2",
	"4M3",
	"4R1.5",
	"4R2.5",
	"5M1",
	"5M2",
	"5M3",
] as const;

export const CHROMASCOP_SHADES = [
	"110", "120", "130", "140",
	"210", "220", "230", "240",
	"310", "320", "330", "340",
	"410", "420", "430", "440",
	"510", "520", "530", "540",
] as const;

export const ALL_VALID_VITA_SHADES: ReadonlySet<string> = new Set<string>([
	...VITA_CLASSICAL_SHADES,
	...VITA_BLEACH_SHADES,
	...VITA_3D_MASTER_SHADES,
	...CHROMASCOP_SHADES,
]);

export function normalizeVitaShade(shade: string): string {
	if (!shade) return "";
	let s = shade.trim().toUpperCase();

	// Sanitize Chromascop prefixes (Мандат 8ap / SEV-3)
	s = s.replace(/^(?:CHROMASCOP|ХРОМАСКОП|CHROMA|ХРОМА)[\s\-_:]*/i, "");

	// Transliterate Cyrillic homoglyphs using explicit Unicode code points:
	// \u0410: А -> A, \u0412: В -> B, \u0411: Б -> B, \u0421: С -> C, \u0414: Д -> D,
	// \u041C: М -> M, \u0420: Р -> R, \u041B: Л -> L, \u041E: О -> O
	s = s
		.replace(/\u0410/g, "A")
		.replace(/\u0412/g, "B")
		.replace(/\u0411/g, "B")
		.replace(/\u0421/g, "C")
		.replace(/\u0414/g, "D")
		.replace(/\u041C/g, "M")
		.replace(/\u0420/g, "R")
		.replace(/\u041B/g, "L")
		.replace(/\u041E/g, "O");

	// Strip extraneous punctuation, hyphens, and whitespace
	s = s.replace(/[\s\-_]+/g, "");

	// Normalize decimal comma to dot
	s = s.replace(/,/g, ".");

	// Canonicalize OM1-OM3 (letter O) to 0M1-0M3 (digit 0)
	if (/^OM[1-3]$/.test(s)) {
		s = "0" + s.slice(1);
	}

	return s;
}

export function isValidVitaShade(shade?: string | null | undefined): boolean {
	if (!shade) return false;
	return ALL_VALID_VITA_SHADES.has(normalizeVitaShade(shade));
}

export const VITA_SHADE_VALIDATION_MESSAGE =
	"Недопустимый оттенок зуба. Используйте стандарт VITA Classical (A1–D4), VITA 3D-Master (1M1–5M3), Bleach (0M1–0M3, BL1–BL4) или Ivoclar Chromascop (110–540).";

export const LAB_ORDER_MATERIALS = {
	zirconia_multilayer: "Диоксид циркония многослойный (Multi-layer)",
	zirconia_ht: "Диоксид циркония высокопрозрачный (HT/ST)",
	emax_cad: "Литий-дисиликатная керамика (IPS e.max CAD)",
	emax_press: "Пресс-керамика (IPS e.max Press)",
	pfm: "Металлокерамика (PFM / CoCr/NiCr)",
	pmma_temp: "Временная пластмасса PMMA (CAD/CAM)",
	composite: "Композит лабораторный (Nano-hybrid)",
	titanium_abutment: "Индивидуальный титановый абатмент",
	cocr_framework: "Литой/фрезерованный бюгельный каркас (CoCr)",
	peek: "Биополимер PEEK / BioHPP",
} as const;

export type LabOrderMaterialKey = keyof typeof LAB_ORDER_MATERIALS;

export const LAB_ORDER_STATUS_LABELS = {
	draft: "Черновик",
	sent: "Отправлен в лабораторию",
	in_progress: "В работе у техника",
	shipped: "Отправлен в клинику",
	received: "Получен клиникой",
	ready: "Готов в лаборатории",
	ready_in_clinic: "Готов в клинике",
	fitting: "На примерке у пациента",
	fitted: "Припасован / Сдан пациенту",
	refitting: "На примерке / доработке",
	completed: "Установлен / завершен",
	cancelled: "Отменен",
	rejected_remake: "Брак / На переделку",
} as const;

export type LabOrderStatusKey = keyof typeof LAB_ORDER_STATUS_LABELS;
