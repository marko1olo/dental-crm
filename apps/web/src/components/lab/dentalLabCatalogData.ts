/**
 * apps/web/src/components/lab/dentalLabCatalogData.ts
 *
 * DENTE Dental CRM — Canonical SSOT Dental Laboratory & Orthopedic Orders Catalog.
 * Single Source of Truth for materials, Vita shades, 5 canonical production stages,
 * FDI teeth and lab cost calculation in kopecks (BIGINT Net Revenue).
 * Mandates: 8b (Sweet Spot: 250-350 lines), 8e (Doctor Autonomy), 8x (Human clinical language).
 */

export type DentalLabStage =
	| "scan_sent"
	| "in_production"
	| "fitting_ready"
	| "in_clinic"
	| "seated";

export interface DentalLabStageMeta {
	readonly id: DentalLabStage;
	readonly stepNumber: number;
	readonly labelRu: string;
	readonly shortLabel: string;
	readonly descriptionRu: string;
	readonly colorClass: string;
	readonly bgToken: string;
	readonly borderToken: string;
	readonly textToken: string;
}

export const CANONICAL_LAB_STAGES: readonly DentalLabStageMeta[] = Object.freeze([
	{
		id: "scan_sent",
		stepNumber: 1,
		labelRu: "Оттиск / Скан отправлен",
		shortLabel: "Отправлен",
		descriptionRu: "Цифровой скан или силиконовый слепок передан курьеру лаборатории",
		colorClass: "text-[var(--primary)]",
		bgToken: "var(--teal-surface, rgba(13, 148, 136, 0.12))",
		borderToken: "var(--teal, #0d9488)",
		textToken: "var(--teal, #0d9488)",
	},
	{
		id: "in_production",
		stepNumber: 2,
		labelRu: "В работе у техника",
		shortLabel: "В работе",
		descriptionRu: "CAD-моделировка, фрезеровка каркаса или спекание керамики",
		colorClass: "text-[var(--amber)]",
		bgToken: "var(--amber-surface, rgba(245, 158, 11, 0.12))",
		borderToken: "var(--amber, #f59e0b)",
		textToken: "var(--amber-ink, #92400e)",
	},
	{
		id: "fitting_ready",
		stepNumber: 3,
		labelRu: "Примерка каркаса",
		shortLabel: "Примерка",
		descriptionRu: "Промежуточный этап: проверка прилегания каркаса в полости рта",
		colorClass: "text-[var(--accent)]",
		bgToken: "var(--paper-soft, rgba(59, 130, 246, 0.12))",
		borderToken: "var(--accent, #3b82f6)",
		textToken: "var(--accent, #3b82f6)",
	},
	{
		id: "in_clinic",
		stepNumber: 4,
		labelRu: "Готово в клинике",
		shortLabel: "В клинике",
		descriptionRu: "Работа доставлена в клинику и ожидает визита пациента на фиксацию",
		colorClass: "text-[var(--emerald)]",
		bgToken: "var(--emerald-surface, rgba(16, 185, 129, 0.14))",
		borderToken: "var(--emerald, #10b981)",
		textToken: "var(--emerald-ink, #065f46)",
	},
	{
		id: "seated",
		stepNumber: 5,
		labelRu: "Зафиксировано во рту",
		shortLabel: "Зафиксировано",
		descriptionRu: "Окончательная постоянная цементировка конструкции завершена",
		colorClass: "text-[var(--muted)]",
		bgToken: "var(--paper-strong, rgba(100, 116, 139, 0.12))",
		borderToken: "var(--line, #cbd5e1)",
		textToken: "var(--ink-muted, #64748b)",
	},
]);

export interface OrthopedicMaterialMeta {
	readonly id: string;
	readonly titleRu: string;
	readonly shortTitle: string;
	readonly categoryRu: string;
	readonly defaultDurationDays: number;
	readonly baseLabCostKopecks: number;
	readonly defaultPatientPriceKopecks: number;
	readonly descriptionRu: string;
}

export const CANONICAL_LAB_MATERIALS: readonly OrthopedicMaterialMeta[] = Object.freeze([
	{
		id: "zirconia_multilayer",
		titleRu: "Диоксид циркония Multi-layer (Prettau)",
		shortTitle: "Цирконий ZrO2",
		categoryRu: "Несъемное протезирование",
		defaultDurationDays: 5,
		baseLabCostKopecks: 450000,
		defaultPatientPriceKopecks: 2200000,
		descriptionRu: "Высокоэстетичный градиентный цирконий с естественной прозрачностью режущего края",
	},
	{
		id: "emax_press",
		titleRu: "Пресс-керамика E-max (IPS e.max CAD)",
		shortTitle: "Керамика E-max",
		categoryRu: "Несъемное протезирование",
		defaultDurationDays: 4,
		baseLabCostKopecks: 400000,
		defaultPatientPriceKopecks: 2400000,
		descriptionRu: "Дисиликат лития высочайшей эстетики для виниров, вкладок и коронок во фронтальной зоне",
	},
	{
		id: "metal_ceramic_cocr",
		titleRu: "Металлокерамика на CoCr сплаве",
		shortTitle: "Металлокерамика",
		categoryRu: "Несъемное протезирование",
		defaultDurationDays: 6,
		baseLabCostKopecks: 320000,
		defaultPatientPriceKopecks: 1400000,
		descriptionRu: "Классическая биосовместимая коронка с послойным нанесением керамической массы",
	},
	{
		id: "pmma_temp",
		titleRu: "Временная CAD/CAM коронка PMMA",
		shortTitle: "Временная PMMA",
		categoryRu: "Временные конструкции",
		defaultDurationDays: 2,
		baseLabCostKopecks: 120000,
		defaultPatientPriceKopecks: 450000,
		descriptionRu: "Фрезерованная временная коронка длительного ношения для моделирования десневого контура",
	},
	{
		id: "clasp_prosthesis",
		titleRu: "Бюгельный протез с замковой фиксацией",
		shortTitle: "Бюгельный протез",
		categoryRu: "Съемное протезирование",
		defaultDurationDays: 8,
		baseLabCostKopecks: 1200000,
		defaultPatientPriceKopecks: 4500000,
		descriptionRu: "Литая металлическая дуга с точной биомеханикой распределения жевательного давления",
	},
	{
		id: "aligner_splint",
		titleRu: "Окклюзионный сплинт / Каппа от бруксизма",
		shortTitle: "Сплинт / Каппа",
		categoryRu: "Ортодонтия и каппы",
		defaultDurationDays: 3,
		baseLabCostKopecks: 250000,
		defaultPatientPriceKopecks: 950000,
		descriptionRu: "Индивидуальный разобщающий сплинт для защиты зубных рядов и нормализации тонуса ВНЧС",
	},
]);

export interface VitaShadeMeta {
	readonly code: string;
	readonly groupRu: string;
	readonly approxHex: string;
	readonly isBleach?: boolean;
}

export const VITA_SHADES_SSOT: readonly VitaShadeMeta[] = Object.freeze([
	// Группа A (Красновато-коричневые)
	{ code: "A1", groupRu: "Группа A (Светлый)", approxHex: "#FAF6E8" },
	{ code: "A2", groupRu: "Группа A (Стандарт)", approxHex: "#F5EED3" },
	{ code: "A3", groupRu: "Группа A (Насыщенный)", approxHex: "#EFE3BC" },
	{ code: "A3.5", groupRu: "Группа A (Тёмный)", approxHex: "#E6D3A3" },
	{ code: "A4", groupRu: "Группа A (Интенсив)", approxHex: "#DCBF89" },
	// Группа B (Желтоватые)
	{ code: "B1", groupRu: "Группа B (Светлый)", approxHex: "#FBF8E6" },
	{ code: "B2", groupRu: "Группа B (Стандарт)", approxHex: "#F4ECBE" },
	{ code: "B3", groupRu: "Группа B (Насыщенный)", approxHex: "#EADDA3" },
	// Группа C (Сероватые)
	{ code: "C1", groupRu: "Группа C (Светлый)", approxHex: "#F2EFE5" },
	{ code: "C2", groupRu: "Группа C (Стандарт)", approxHex: "#E4DEC9" },
	// Группа D (Красновато-серые)
	{ code: "D2", groupRu: "Группа D (Светлый)", approxHex: "#EDE7DA" },
	{ code: "D3", groupRu: "Группа D (Стандарт)", approxHex: "#DFD6BF" },
	// Bleach оттенки
	{ code: "BL1", groupRu: "Bleach Ультра-белый", approxHex: "#FFFFFF", isBleach: true },
	{ code: "BL2", groupRu: "Bleach Экстра-белый", approxHex: "#FAFBF7", isBleach: true },
	{ code: "BL3", groupRu: "Bleach Белый", approxHex: "#F6F7F0", isBleach: true },
	{ code: "BL4", groupRu: "Bleach Мягкий белый", approxHex: "#F1F2E8", isBleach: true },
]);

/** Канонические зубы FDI для экспресс-выбора у кресла (Мандат 8e) */
export const FDI_QUICK_TEETH: readonly number[] = Object.freeze([
	11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27,
	47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
]);

export interface DentalLabOrderEntry {
	id: string;
	orderNumber: string;
	patientName: string;
	doctorName: string;
	teeth: number[];
	materialId: string;
	shadeCode: string;
	stage: DentalLabStage;
	labCostKopecks: number;
	patientPriceKopecks: number;
	laboratoryName: string;
	technicianName?: string;
	createdAt: string;
	dueDate: string;
	fittingDate?: string;
	notes?: string;
	isUrgent?: boolean;
}

export function formatKopecksToRubles(kopecks: number): string {
	const rubles = Math.round(kopecks / 100);
	return rubles.toLocaleString("ru-RU") + " ₽";
}

export function getStageMeta(stage: DentalLabStage): DentalLabStageMeta {
	const found = CANONICAL_LAB_STAGES.find((s) => s.id === stage);
	return found || CANONICAL_LAB_STAGES[0];
}

export function getMaterialMeta(materialId: string): OrthopedicMaterialMeta {
	const found = CANONICAL_LAB_MATERIALS.find((m) => m.id === materialId);
	return found || CANONICAL_LAB_MATERIALS[0];
}

export function isOrderOverdue(order: DentalLabOrderEntry, nowMs: number = Date.now()): boolean {
	if (order.stage === "in_clinic" || order.stage === "seated") {
		return false;
	}
	const dueMs = new Date(order.dueDate).getTime();
	return dueMs < nowMs;
}

export function calcNetRevenueKopecks(patientPriceKopecks: number, labCostKopecks: number): number {
	return Math.max(0, patientPriceKopecks - labCostKopecks);
}

/** Список проверенных лабораторий-партнеров клиники */
export const CLINIC_LABORATORIES: readonly string[] = Object.freeze([
	"ЗТЛ «Мастер Дент»",
	"CAD/CAM Лаборатория «Дентал Арт»",
	"Прецизионная ЗТЛ «Циркон Элит»",
	"Собственная лаборатория клиники",
]);

/** Начальный демонстрационный массив нарядов (Мандат 8wy, demo showcase) */
export const SEED_LAB_ORDERS: readonly DentalLabOrderEntry[] = Object.freeze([
	{
		id: "lab-ord-101",
		orderNumber: "ЗТЛ-101",
		patientName: "Ковалев Дмитрий Сергеевич",
		doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		teeth: [16],
		materialId: "zirconia_multilayer",
		shadeCode: "A2",
		stage: "in_production",
		labCostKopecks: 450000,
		patientPriceKopecks: 2200000,
		laboratoryName: "ЗТЛ «Мастер Дент»",
		technicianName: "Смирнов А. В.",
		createdAt: "2026-10-26T09:00:00Z",
		dueDate: "2026-10-31",
		fittingDate: "2026-10-29",
		notes: "Анатомический абатмент с винтовой фиксацией, уступ 0.5 мм",
		isUrgent: false,
	},
	{
		id: "lab-ord-102",
		orderNumber: "ЗТЛ-102",
		patientName: "Васильева Анна Романовна",
		doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		teeth: [11, 21],
		materialId: "emax_press",
		shadeCode: "BL3",
		stage: "in_clinic",
		labCostKopecks: 800000,
		patientPriceKopecks: 4800000,
		laboratoryName: "CAD/CAM Лаборатория «Дентал Арт»",
		technicianName: "Григорьев М. И.",
		createdAt: "2026-10-24T11:30:00Z",
		dueDate: "2026-10-28",
		notes: "Виниры рефрактор с микрорельефом мамелонов. Доставлено в клинику",
		isUrgent: false,
	},
	{
		id: "lab-ord-103",
		orderNumber: "ЗТЛ-103",
		patientName: "Михайлов Артем Игоревич",
		doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		teeth: [36],
		materialId: "metal_ceramic_cocr",
		shadeCode: "A3",
		stage: "fitting_ready",
		labCostKopecks: 320000,
		patientPriceKopecks: 1400000,
		laboratoryName: "Прецизионная ЗТЛ «Циркон Элит»",
		technicianName: "Федоров К. С.",
		createdAt: "2026-10-25T14:15:00Z",
		dueDate: "2026-11-01",
		fittingDate: "2026-10-30",
		notes: "Примерка литого колпачка перед нанесением опака",
		isUrgent: false,
	},
	{
		id: "lab-ord-104",
		orderNumber: "ЗТЛ-104",
		patientName: "Попова Екатерина Владимировна",
		doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		teeth: [24, 25, 26],
		materialId: "pmma_temp",
		shadeCode: "A2",
		stage: "scan_sent",
		labCostKopecks: 360000,
		patientPriceKopecks: 1350000,
		laboratoryName: "Собственная лаборатория клиники",
		createdAt: "2026-10-29T16:00:00Z",
		dueDate: "2026-10-31",
		notes: "Временный мостовидный протез на период остеоинтеграции",
		isUrgent: true,
	},
	{
		id: "lab-ord-105",
		orderNumber: "ЗТЛ-105",
		patientName: "Новиков Игорь Олегович",
		doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		teeth: [46],
		materialId: "zirconia_multilayer",
		shadeCode: "A3.5",
		stage: "in_production",
		labCostKopecks: 450000,
		patientPriceKopecks: 2200000,
		laboratoryName: "ЗТЛ «Мастер Дент»",
		createdAt: "2026-10-20T10:00:00Z",
		dueDate: "2026-10-25", // Намеренно просроченный заказ для проверки фильтра "Просрочены"
		notes: "Задержка поставки премиального премилл-блока, техник ускоряет спекание",
		isUrgent: false,
	},
]);
