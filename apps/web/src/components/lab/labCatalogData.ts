/**
 * labCatalogData.ts — Канонический каталог и справочники зуботехнической лаборатории (SSOT).
 * 
 * Включает:
 * - Ортопедические конструкции (диоксид циркония, E-max, виниры, мосты, бюгели, каппы/элайнеры, PMMA).
 * - Шкалы оттенков VITA Classical / Bleach и VITA 3D Master, шкалу культи (Natural Die ND1..ND9).
 * - Сквозной расчет удержания расходов ЗТЛ из Net Revenue врача в Payroll (Мандат 8n).
 * - Автономные пресеты в 1 клик и расчет рабочих дней без блокировок (Мандат 8e).
 * 
 * Соответствует Мандатам 8b (200–250 строк, Sweet Spot) и 8x (Живой клинический язык).
 */

export interface LabConstructionType {
	readonly id: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly material: string;
	readonly category: "fixed" | "removable" | "aligner" | "implant";
	readonly standardWorkingDays: number;
	readonly defaultLabCostKopecks: number;
	readonly defaultPatientPriceKopecks: number;
	readonly requiresShade: boolean;
	readonly allowsStumpShade: boolean;
	readonly description: string;
}

export const LAB_CONSTRUCTION_CATALOG: readonly LabConstructionType[] = [
	{
		id: "crown_zirconia", title: "Коронка из диоксида циркония (Katana ML / Prettau)",
		shortTitle: "Цирконий (ZrO2)", material: "Многослойный диоксид циркония Katana HTML",
		category: "fixed", standardWorkingDays: 5,
		defaultLabCostKopecks: 750000, defaultPatientPriceKopecks: 2400000,
		requiresShade: true, allowsStumpShade: true,
		description: "Анатомическая монолитная коронка с плавным оптическим градиентом прозрачности.",
	},
	{
		id: "crown_emax", title: "Коронка IPS e.max Press (дисиликат лития)",
		shortTitle: "E-max коронка", material: "Дисиликат лития IPS e.max Press (Ivoclar)",
		category: "fixed", standardWorkingDays: 5,
		defaultLabCostKopecks: 850000, defaultPatientPriceKopecks: 2600000,
		requiresShade: true, allowsStumpShade: true,
		description: "Цельнокерамическая высокопрочная реставрация с естественной опалесценцией эмали.",
	},
	{
		id: "veneer_emax", title: "Керамический винир E.max / рефрактор",
		shortTitle: "Винир E-max", material: "Полевошпатная керамика Noritake / e.max Press",
		category: "fixed", standardWorkingDays: 7,
		defaultLabCostKopecks: 950000, defaultPatientPriceKopecks: 2800000,
		requiresShade: true, allowsStumpShade: true,
		description: "Микроинвазивная эстетическая накладка с прецизионной анатомией и макротекстурой.",
	},
	{
		id: "bridge_zirconia", title: "Мостовидный протез из диоксида циркония (3–4 единицы)",
		shortTitle: "Мостовидный протез", material: "Высокопрочный диоксид циркония Translucent ZrO2",
		category: "fixed", standardWorkingDays: 7,
		defaultLabCostKopecks: 1800000, defaultPatientPriceKopecks: 6500000,
		requiresShade: true, allowsStumpShade: true,
		description: "Несъемная мостовидная конструкция с анатомическим моделированием промежуточных звеньев.",
	},
	{
		id: "clasp_denture", title: "Бюгельный протез с кламмерами / микрозамками",
		shortTitle: "Бюгельный протез", material: "Сплав Co-Cr / биосовместимый полимер Acry-Free",
		category: "removable", standardWorkingDays: 8,
		defaultLabCostKopecks: 1300000, defaultPatientPriceKopecks: 3800000,
		requiresShade: true, allowsStumpShade: false,
		description: "Съемный опирающийся протез с литым металлическим базисом и анатомическим гарнитуром.",
	},
	{
		id: "aligner_ortho", title: "Ортодонтическая каппа / элайнер для позиционирования",
		shortTitle: "Каппа / элайнер", material: "Медицинский термопласт Duran / Zendura FLX",
		category: "aligner", standardWorkingDays: 4,
		defaultLabCostKopecks: 350000, defaultPatientPriceKopecks: 1100000,
		requiresShade: false, allowsStumpShade: false,
		description: "Прозрачная вакуумформованная каппа для перемещения зубов или стабилизации окклюзии.",
	},
	{
		id: "temporary_pmma", title: "Временная фрезерованная коронка PMMA (CAD/CAM)",
		shortTitle: "Временная PMMA", material: "Многослойный полимер PMMA Telio CAD",
		category: "fixed", standardWorkingDays: 2,
		defaultLabCostKopecks: 120000, defaultPatientPriceKopecks: 450000,
		requiresShade: true, allowsStumpShade: false,
		description: "Долгосрочная провизорная коронка для моделирования десневого профиля прорезывания.",
	},
];

/** Шкала VITA Classical + Bleach с RGB-свотчами для реалистичного предпросмотра */
export interface VitaShadeItem {
	readonly code: string;
	readonly label: string;
	readonly group: "Bleach" | "A" | "B" | "C" | "D";
	readonly hexColor: string;
}

export const VITA_SHADES: readonly VitaShadeItem[] = [
	{ code: "BL1", label: "BL1 (Ультра-белый)", group: "Bleach", hexColor: "#FFFFFF" },
	{ code: "BL2", label: "BL2 (Экстра-светлый)", group: "Bleach", hexColor: "#FBF9F0" },
	{ code: "BL3", label: "BL3 (Светлый опалесцент)", group: "Bleach", hexColor: "#F7F3E6" },
	{ code: "BL4", label: "BL4 (Мягкий отбеленный)", group: "Bleach", hexColor: "#F3EEDB" },
	{ code: "A1", label: "A1 (Светлый красновато-коричневый)", group: "A", hexColor: "#EFE8D6" },
	{ code: "A2", label: "A2 (Универсальный естественный)", group: "A", hexColor: "#E7DCBF" },
	{ code: "A3", label: "A3 (Насыщенный дентинный)", group: "A", hexColor: "#DFCFA5" },
	{ code: "A3.5", label: "A3.5 (Темный дентинный)", group: "A", hexColor: "#D3BF8E" },
	{ code: "A4", label: "A4 (Интенсивный коричневый)", group: "A", hexColor: "#C3AB74" },
	{ code: "B1", label: "B1 (Светлый красновато-желтый)", group: "B", hexColor: "#EFEBD9" },
	{ code: "B2", label: "B2 (Естественный желтоватый)", group: "B", hexColor: "#E6DCB9" },
	{ code: "B3", label: "B3 (Теплый золотистый)", group: "B", hexColor: "#DFCFA1" },
	{ code: "B4", label: "B4 (Интенсивный золотистый)", group: "B", hexColor: "#CEBA84" },
	{ code: "C1", label: "C1 (Светлый сероватый)", group: "C", hexColor: "#E7E2D5" },
	{ code: "C2", label: "C2 (Средний серый)", group: "C", hexColor: "#DBD4C2" },
	{ code: "C3", label: "C3 (Пепельно-серый)", group: "C", hexColor: "#CCC3AF" },
	{ code: "C4", label: "C4 (Темно-серый)", group: "C", hexColor: "#B9AE98" },
	{ code: "D2", label: "D2 (Светлый красно-серый)", group: "D", hexColor: "#E4DEC9" },
	{ code: "D3", label: "D3 (Теплый серый)", group: "D", hexColor: "#D8CEB3" },
	{ code: "D4", label: "D4 (Насыщенный красновато-серый)", group: "D", hexColor: "#C6B999" },
];

/** Шкала цвета препарированной культи (IPS Natural Die Material) */
export interface StumpShadeItem {
	readonly code: string;
	readonly label: string;
	readonly hexColor: string;
}

export const STUMP_SHADES: readonly StumpShadeItem[] = [
	{ code: "ND1", label: "ND1 (Отбеленная культя)", hexColor: "#F5EFE1" },
	{ code: "ND2", label: "ND2 (Светлая витальная)", hexColor: "#EADDC6" },
	{ code: "ND3", label: "ND3 (Средняя витальная)", hexColor: "#DFC9A8" },
	{ code: "ND4", label: "ND4 (Темная витальная)", hexColor: "#D0B58E" },
	{ code: "ND5", label: "ND5 (Слегка измененная в цвете)", hexColor: "#BF9F74" },
	{ code: "ND6", label: "ND6 (Дисколорит средней степени)", hexColor: "#AB895E" },
	{ code: "ND7", label: "ND7 (Выраженный дисколорит)", hexColor: "#8D6E48" },
	{ code: "ND8", label: "ND8 (Темно-коричневая культя)", hexColor: "#6A4E32" },
	{ code: "ND9", label: "ND9 (Металлическая культевая вкладка)", hexColor: "#7A7D84" },
];

/** Партнерские зуботехнические лаборатории */
export interface PartnerLabItem {
	readonly id: string;
	readonly name: string;
	readonly phone: string;
	readonly courierCutoffTime: string;
	readonly city: string;
	readonly isDefault?: boolean;
}

export const PARTNER_LABS: readonly PartnerLabItem[] = [
	{ id: "lab_art", name: "Арт-Дент Лаб (CAD/CAM фрезерный центр)", phone: "+7 (926) 400-12-34", courierCutoffTime: "17:00", city: "Москва", isDefault: true },
	{ id: "lab_ortho", name: "Орто-Мастер ЗТЛ (Высокоточная ортопедия)", phone: "+7 (916) 555-88-99", courierCutoffTime: "18:00", city: "Москва" },
	{ id: "lab_premium", name: "Премиум-Смайл Лаб (Эстетическая керамика)", phone: "+7 (985) 123-45-67", courierCutoffTime: "16:30", city: "Москва" },
	{ id: "lab_inhouse", name: "Собственная лаборатория клиники", phone: "Внутр. 104", courierCutoffTime: "20:00", city: "Клиника" },
];

/** Этапы прохождения наряда в лаборатории */
export type LabStageId = "draft" | "sent" | "in_progress" | "fitting" | "ready" | "installed" | "warranty";

export interface LabStageInfo {
	readonly id: LabStageId;
	readonly title: string;
	readonly badgeClass: string;
	readonly isFinal?: boolean;
}

export const LAB_STAGES: readonly LabStageInfo[] = [
	{ id: "draft", title: "Черновик", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
	{ id: "sent", title: "Отправлен курьером", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300" },
	{ id: "in_progress", title: "В работе у техника", badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" },
	{ id: "fitting", title: "На примерке в клинике", badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300" },
	{ id: "ready", title: "Готово к фиксации", badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300" },
	{ id: "installed", title: "Зафиксировано во рту", badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300", isFinal: true },
	{ id: "warranty", title: "Гарантийная переделка", badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" },
];

/** 0-клик быстрые пресеты для врача у кресла (Мандат 8e) */
export interface LabFastPreset {
	readonly id: string;
	readonly label: string;
	readonly workTypeId: string;
	readonly shadeCode: string;
	readonly stumpShadeCode?: string;
	readonly daysOffset: number;
	readonly isWarranty?: boolean;
}

export const LAB_FAST_PRESETS: readonly LabFastPreset[] = [
	{ id: "preset_zr_a2", label: "Цирконий А2", workTypeId: "crown_zirconia", shadeCode: "A2", stumpShadeCode: "ND2", daysOffset: 5 },
	{ id: "preset_emax_a1", label: "E-max А1", workTypeId: "crown_emax", shadeCode: "A1", stumpShadeCode: "ND1", daysOffset: 5 },
	{ id: "preset_veneer_bl2", label: "Винир BL2", workTypeId: "veneer_emax", shadeCode: "BL2", stumpShadeCode: "ND1", daysOffset: 7 },
	{ id: "preset_pmma_a2", label: "Временная PMMA А2", workTypeId: "temporary_pmma", shadeCode: "A2", daysOffset: 2 },
	{ id: "preset_bridge_a3", label: "Мост цирконий А3", workTypeId: "bridge_zirconia", shadeCode: "A3", stumpShadeCode: "ND3", daysOffset: 7 },
	{ id: "preset_aligner", label: "Каппа / элайнер", workTypeId: "aligner_ortho", shadeCode: "", daysOffset: 4 },
];

/** Расчет рабочих дней в РФ (пропуск суббот и воскресений) */
export function addWorkingDaysRu(startDate: Date, workingDays: number): Date {
	const current = new Date(startDate);
	let added = 0;
	while (added < workingDays) {
		current.setDate(current.getDate() + 1);
		const dayOfWeek = current.getDay();
		if (dayOfWeek !== 0 && dayOfWeek !== 6) {
			added++;
		}
	}
	return current;
}

/** Форматирование копеек в рубли */
export function formatKopecks(kopecks: number | bigint): string {
	const n = typeof kopecks === "bigint" ? Number(kopecks) : kopecks;
	const rubles = Math.round(n / 100);
	return rubles.toLocaleString("ru-RU") + " ₽";
}

/** Сквозная интеграция с Net Revenue врача в Payroll (Мандат 8n) */
export interface DoctorNetRevenueCalculation {
	readonly orthoGrossKopecks: number;
	readonly labCostKopecks: number;
	readonly netRevenueKopecks: number;
	readonly doctorPercent: number;
	readonly doctorWageKopecks: number;
}

export function calculateZtlPayrollNetRevenue(
	orthoGrossKopecks: number,
	labCostKopecks: number,
	doctorPercent = 25,
	isWarranty = false,
): DoctorNetRevenueCalculation {
	const effectiveLabCost = isWarranty ? 0 : Math.max(0, labCostKopecks);
	const netRevenue = Math.max(0, orthoGrossKopecks - effectiveLabCost);
	const doctorWage = Math.round((netRevenue * doctorPercent) / 100);

	return {
		orthoGrossKopecks,
		labCostKopecks: effectiveLabCost,
		netRevenueKopecks: netRevenue,
		doctorPercent,
		doctorWageKopecks: doctorWage,
	};
}
