/**
 * dentalLabData.ts — Единый источник правды (SSOT) зуботехнической лаборатории в DENTE CRM.
 * Каталог конструкций, шкала VITA Classical + Bleach, этапы наряда и лаборатории-партнеры.
 * Мандаты 8b (Sweet Spot: 200–300 строк), 8e (Автономия врача), 8x (Живой клинический язык).
 */

export interface DentalLabCatalogItem {
	readonly id: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly material: string;
	readonly category: string;
	readonly standardDays: number;
	readonly defaultPatientPriceKopecks: number;
	readonly defaultZtlCostKopecks: number;
	readonly requiresShade: boolean;
	readonly description: string;
}

export const DENTAL_LAB_CATALOG: readonly DentalLabCatalogItem[] = [
	{
		id: "crown_zirconia",
		title: "Коронка из диоксида циркония (Katana ML / Prettau)",
		shortTitle: "Цирконий (ZrO2)",
		material: "Многослойный диоксид циркония Katana HTML",
		category: "Несъемное протезирование",
		standardDays: 5,
		defaultPatientPriceKopecks: 2400000,
		defaultZtlCostKopecks: 750000,
		requiresShade: true,
		description: "Анатомическая монолитная коронка с плавным оптическим градиентом прозрачности.",
	},
	{
		id: "crown_emax",
		title: "Коронка / винир IPS e.max Press (дисиликат лития)",
		shortTitle: "E.max Пресс/CAD",
		material: "Дисиликат лития IPS e.max Press (Ivoclar)",
		category: "Высокоэстетичная керамика",
		standardDays: 5,
		defaultPatientPriceKopecks: 2600000,
		defaultZtlCostKopecks: 850000,
		requiresShade: true,
		description: "Цельнокерамическая высокопрочная реставрация с естественной опалесценцией эмали.",
	},
	{
		id: "metal_ceramic",
		title: "Металлокерамическая коронка (Co-Cr)",
		shortTitle: "Металлокерамика",
		material: "Керамическая масса Duceram Plus на сплаве Co-Cr",
		category: "Традиционная ортопедия",
		standardDays: 5,
		defaultPatientPriceKopecks: 1400000,
		defaultZtlCostKopecks: 450000,
		requiresShade: true,
		description: "Классическая металлокерамическая коронка с анатомическим краевым прилеганием.",
	},
	{
		id: "temporary_pmma",
		title: "Временная фрезерованная коронка PMMA (CAD/CAM)",
		shortTitle: "Временная PMMA",
		material: "Многослойный полимер PMMA Telio CAD",
		category: "Провизорные конструкции",
		standardDays: 2,
		defaultPatientPriceKopecks: 450000,
		defaultZtlCostKopecks: 120000,
		requiresShade: true,
		description: "Долгосрочная провизорная коронка для моделирования десневого контура и функции.",
	},
	{
		id: "ceramic_veneer",
		title: "Керамический винир E.max / рефрактор",
		shortTitle: "Керамический винир",
		material: "Полевошпатная керамика Noritake / e.max",
		category: "Эстетическая реставрация",
		standardDays: 7,
		defaultPatientPriceKopecks: 2800000,
		defaultZtlCostKopecks: 950000,
		requiresShade: true,
		description: "Микроинвазивная эстетическая накладка с прецизионной анатомией и макротекстурой.",
	},
	{
		id: "clasp_denture",
		title: "Бюгельный / нейлоновый протез (Acry-Free)",
		shortTitle: "Бюгель / Acry-Free",
		material: "Безакриловый биосовместимый полимер Acry-Free",
		category: "Съемное протезирование",
		standardDays: 7,
		defaultPatientPriceKopecks: 3800000,
		defaultZtlCostKopecks: 1300000,
		requiresShade: true,
		description: "Съемный протез с кламмерной или замковой фиксацией без остаточного мономера.",
	},
	{
		id: "custom_abutment",
		title: "Индивидуальный абатмент Ti-Base / цирконий",
		shortTitle: "Индивидуальный абатмент",
		material: "Титановая база + диоксид циркония ZrO2",
		category: "Протезирование на имплантатах",
		standardDays: 4,
		defaultPatientPriceKopecks: 1200000,
		defaultZtlCostKopecks: 400000,
		requiresShade: false,
		description: "Анатомический трансгингивальный профиль прорезывания под винтовую фиксацию.",
	},
] as const;

export interface VitaShadeItem {
	readonly code: string;
	readonly group: "A" | "B" | "C" | "D" | "BL";
	readonly hex: string;
	readonly isBleach?: boolean;
}

export const VITA_SHADES: readonly VitaShadeItem[] = [
	{ code: "A1", group: "A", hex: "#F3E2C8" }, { code: "A2", group: "A", hex: "#EBD7BB" },
	{ code: "A3", group: "A", hex: "#E2CBAE" }, { code: "A3.5", group: "A", hex: "#D8C2A4" },
	{ code: "A4", group: "A", hex: "#CFA98F" }, { code: "B1", group: "B", hex: "#F1E6CF" },
	{ code: "B2", group: "B", hex: "#E6D9BE" }, { code: "B3", group: "B", hex: "#DACAAE" },
	{ code: "B4", group: "B", hex: "#CDBA9C" }, { code: "C1", group: "C", hex: "#E9DEC6" },
	{ code: "C2", group: "C", hex: "#E0D2B8" }, { code: "C3", group: "C", hex: "#D6C6AA" },
	{ code: "C4", group: "C", hex: "#C7B596" }, { code: "D2", group: "D", hex: "#E7DCC6" },
	{ code: "D3", group: "D", hex: "#DACDB5" }, { code: "D4", group: "D", hex: "#CBBCA2" },
	{ code: "BL1", group: "BL", hex: "#FFF7EE", isBleach: true },
	{ code: "BL2", group: "BL", hex: "#FEF1E3", isBleach: true },
	{ code: "BL3", group: "BL", hex: "#FDEAD6", isBleach: true },
	{ code: "BL4", group: "BL", hex: "#FBE1C6", isBleach: true },
] as const;

export function getVitaHex(code: string | null | undefined): string {
	if (!code) return "#E2CBAE";
	const normalized = code.trim().toUpperCase();
	return VITA_SHADES.find((s) => s.code === normalized)?.hex ?? "#E2CBAE";
}

export type LabStageId = "sent" | "in_progress" | "fitting" | "ready_in_clinic" | "completed";

export interface LabStageDef {
	readonly id: LabStageId;
	readonly stepNumber: number;
	readonly label: string;
	readonly shortLabel: string;
	readonly badgeClass: string;
}

export const LAB_STAGES: readonly LabStageDef[] = [
	{ id: "sent", stepNumber: 1, label: "Отправлен в лабораторию", shortLabel: "Отправлен", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
	{ id: "in_progress", stepNumber: 2, label: "В работе у техника", shortLabel: "В работе", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
	{ id: "fitting", stepNumber: 3, label: "Примерка конструкции", shortLabel: "Примерка", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
	{ id: "ready_in_clinic", stepNumber: 4, label: "Готов в клинике", shortLabel: "В клинике", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
	{ id: "completed", stepNumber: 5, label: "Сдан пациенту", shortLabel: "Сдан", badgeClass: "bg-teal-50 text-teal-700 border-teal-200" },
] as const;

export interface PartnerDentalLab {
	readonly id: string;
	readonly name: string;
	readonly phone: string;
	readonly address: string;
	readonly courier: string;
	readonly specialization: string;
}

export const PARTNER_LABS: readonly PartnerDentalLab[] = [
	{
		id: "lab_art",
		name: "ДенталАрт Лаб",
		phone: "+7 (495) 120-44-33",
		address: "г. Москва, ул. Профсоюзная, д. 56",
		courier: "Курьер Иван (+7 999 123-45-67)",
		specialization: "Цифровой CAD/CAM цирконий и индивидуальные абатменты",
	},
	{
		id: "lab_master",
		name: "СтомТех Мастер",
		phone: "+7 (495) 230-11-22",
		address: "г. Москва, Варшавское ш., д. 125",
		courier: "Служба доставки ЗТЛ (+7 999 234-56-78)",
		specialization: "Сложное бюгельное протезирование, Acry-Free и металлокерамика",
	},
	{
		id: "lab_premium",
		name: "ПремиумЭстетик Лаб",
		phone: "+7 (495) 789-00-11",
		address: "г. Москва, Кутузовский пр-т, д. 22",
		courier: "Экспресс-курьер (+7 999 345-67-89)",
		specialization: "Высокохудожественные виниры E.max и коронки на рефракторе",
	},
	{
		id: "lab_ortho",
		name: "ОртоЛаб Сервис",
		phone: "+7 (495) 345-66-77",
		address: "г. Москва, Ленинградский пр-т, д. 39",
		courier: "Курьер Алексей (+7 999 456-78-90)",
		specialization: "Быстрые временные коронки PMMA и защитные капы",
	},
] as const;

export interface DentalLabOrder {
	readonly id: string;
	readonly orderNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly clinicName: string;
	readonly toothFdi: string;
	readonly workTypeId: string;
	readonly workTitle: string;
	readonly material: string;
	readonly colorVita: string;
	readonly labId: string;
	readonly labName: string;
	readonly status: LabStageId;
	readonly createdDate: string;
	readonly dueDate: string;
	readonly fittingDate?: string;
	readonly patientPriceKopecks: number;
	readonly ztlCostKopecks: number;
	readonly notes?: string;
	readonly isUrgent?: boolean;
}

export function addWorkingDaysRu(startDate: Date, days: number): Date {
	const current = new Date(startDate);
	let added = 0;
	while (added < days) {
		current.setDate(current.getDate() + 1);
		const day = current.getDay();
		if (day !== 0 && day !== 6) added++;
	}
	return current;
}

export function formatDateIso(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function formatRuDate(dateStr: string): string {
	if (!dateStr) return "—";
	const [y, m, d] = dateStr.split("-");
	return y && m && d ? `${d}.${m}.${y}` : dateStr;
}

export function formatKopecks(kopecks?: number | null): string {
	if (kopecks == null || Number.isNaN(Number(kopecks))) return "0 ₽";
	return `${Math.round(Number(kopecks) / 100).toLocaleString("ru-RU")} ₽`;
}

export const SAMPLE_LAB_ORDERS: readonly DentalLabOrder[] = [
	{
		id: "ord_101",
		orderNumber: "ЗТЛ-1041",
		patientId: "pat_01",
		patientName: "Ковалев Дмитрий Сергеевич",
		doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		clinicName: "Клиника DENTE",
		toothFdi: "16",
		workTypeId: "crown_zirconia",
		workTitle: "Коронка из диоксида циркония (Katana ML)",
		material: "Многослойный диоксид циркония Katana HTML",
		colorVita: "A2",
		labId: "lab_art",
		labName: "ДенталАрт Лаб",
		status: "in_progress",
		createdDate: "2026-10-24",
		dueDate: "2026-10-31",
		fittingDate: "2026-10-30",
		patientPriceKopecks: 2400000,
		ztlCostKopecks: 750000,
		notes: "Под винтовую фиксацию, абатмент Ti-Base 4.5 мм.",
	},
	{
		id: "ord_102",
		orderNumber: "ЗТЛ-1042",
		patientId: "pat_02",
		patientName: "Васильева Анна Михайловна",
		doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		clinicName: "Клиника DENTE",
		toothFdi: "11, 21",
		workTypeId: "crown_emax",
		workTitle: "Виниры IPS e.max Press",
		material: "Дисиликат лития IPS e.max Press",
		colorVita: "BL2",
		labId: "lab_premium",
		labName: "ПремиумЭстетик Лаб",
		status: "fitting",
		createdDate: "2026-10-22",
		dueDate: "2026-10-29",
		fittingDate: "2026-10-28",
		patientPriceKopecks: 5200000,
		ztlCostKopecks: 1700000,
		notes: "Микрорельеф по сагиттали, индивидуализация режущего края.",
		isUrgent: true,
	},
	{
		id: "ord_103",
		orderNumber: "ЗТЛ-1043",
		patientId: "pat_03",
		patientName: "Морозов Артем Павлович",
		doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		clinicName: "Клиника DENTE",
		toothFdi: "46",
		workTypeId: "temporary_pmma",
		workTitle: "Временная коронка PMMA",
		material: "Многослойный полимер PMMA Telio CAD",
		colorVita: "A3",
		labId: "lab_ortho",
		labName: "ОртоЛаб Сервис",
		status: "ready_in_clinic",
		createdDate: "2026-10-27",
		dueDate: "2026-10-29",
		patientPriceKopecks: 450000,
		ztlCostKopecks: 120000,
		notes: "Примерка и временная фиксация на Temp-Bond.",
	},
];
