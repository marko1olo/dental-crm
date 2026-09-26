/**
 * labClinicalStages.ts — Clinical Stages, Statutory Form ZTL-1 Metadata,
 * Working Days Calculations & 152-FZ Patient Formatting.
 */

import { MATERIALS } from "./labMath";

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

// ─── CANONICAL 5-STAGE CLINICAL LAB STATUSES (USER MANDATE 8S, 8E) ────────────

export type Canonical5LabStatus = "sent" | "in_progress" | "fitting" | "ready" | "completed";

export interface Canonical5LabStatusItem {
	readonly id: Canonical5LabStatus;
	readonly step: number;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly descRu: string;
	readonly badgeClass: string;
}

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
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
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
 * Maps any granular raw status / stage key into the canonical 5-step clinical progression.
 * Progression: Отправлен -> В работе -> Примерка -> Готов -> Сдан
 */
export function mapTo5StageLabStatus(rawStatus?: string | null): Canonical5LabStatus {
	if (!rawStatus) return "sent";
	const s = rawStatus.toLowerCase().trim();
	if (s === "draft" || s === "sent" || s === "sent_to_lab" || s === "impression_sent" || s === "impression_scan") {
		return "sent";
	}
	if (
		s === "in_progress" ||
		s === "cad_design" ||
		s === "model_cad_design" ||
		s === "cad_modeling" ||
		s === "milling_wax_up" ||
		s === "framework_wax_milling" ||
		s === "sintering_ceramic_layering" ||
		s === "ceramic_layering"
	) {
		return "in_progress";
	}
	if (
		s === "fitting" ||
		s === "refitting" ||
		s === "try_in_fitting" ||
		s === "fitting_in_mouth" ||
		s === "fitting_scheduled" ||
		s === "framework_fitting"
	) {
		return "fitting";
	}
	if (
		s === "ready" ||
		s === "shipped" ||
		s === "received" ||
		s === "delivered" ||
		s === "final_glaze" ||
		s === "glaze_finish" ||
		s === "delivered_to_clinic" ||
		s === "ready_fixation"
	) {
		return "ready";
	}
	if (s === "completed" || s === "fitted" || s === "installed_in_mouth" || s === "delivered_completed") {
		return "completed";
	}
	return "sent";
}

// ─── STATUTORY FORM ZTL-1 METADATA (STaR / GOST R 51087-97) ─────────────────

export const FORM_ZTL_1_METADATA = {
	code: "Форма № ЗТЛ-1",
	titleRu: "Форма № ЗТЛ-1: Наряд-заказ в зуботехническую лабораторию (СтАР / ГОСТ)",
	blankHeaderRu: "Наряд-заказ в зуботехническую лабораторию (Форма № ЗТЛ-1)",
	subtitleRu: "Официальное клиническое задание на изготовление зубных протезов (ГОСТ Р 51087-97 / Стандарты СтАР)",
	mandate8eClauseRu: "Мандат 8e п. 7: Срок плана лечения (>30 дней) не блокирует создание нарядов ЗТЛ, оказание услуг или оплату.",
	sanpinClauseRu: "СанПиН 3.3686-21: Дезинфекция оттисков, прикусных валиков и протезов проведена перед отправкой.",
	warrantyGostRu: "2 года гарантии (ГОСТ Р 51087-97 / ГОСТ 31576-2012 / Рекомендации СтАР)",
} as const;

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

export interface WorkingDaysRemainingInfo {
	workingDays: number;
	calendarDays: number;
	isOverdue: boolean;
	isUrgent: boolean;
	badgeClass: string;
	labelRu: string;
}

/**
 * Calculates working business days remaining until dueDate/fitting date (excluding Sat & Sun).
 * Returns status badge style and clinical text per Mandate 8e item 7.
 */
export function calculateWorkingDaysRemaining(
	targetDate?: string | Date | null,
	fromDate: string | Date = new Date(),
): WorkingDaysRemainingInfo | null {
	if (!targetDate) return null;
	const due = new Date(targetDate);
	if (Number.isNaN(due.getTime())) return null;

	const from = new Date(fromDate);
	// Normalize to start of day (midnight)
	const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
	const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());

	const diffTime = dueMidnight.getTime() - fromMidnight.getTime();
	const calendarDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

	let workingDays = 0;
	if (calendarDays > 0) {
		const cur = new Date(fromMidnight);
		while (cur < dueMidnight) {
			cur.setDate(cur.getDate() + 1);
			const day = cur.getDay();
			if (day !== 0 && day !== 6) {
				workingDays++;
			}
		}
	} else if (calendarDays < 0) {
		const cur = new Date(dueMidnight);
		while (cur < fromMidnight) {
			cur.setDate(cur.getDate() + 1);
			const day = cur.getDay();
			if (day !== 0 && day !== 6) {
				workingDays--;
			}
		}
	}

	const isOverdue = workingDays < 0;
	const isUrgent = workingDays >= 0 && workingDays <= 2;

	let badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
	let labelRu = `В графике: ${workingDays} раб. дн.`;

	if (isOverdue) {
		badgeClass = "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
		labelRu = `Дедлайн просрочен на ${Math.abs(workingDays)} раб. дн.`;
	} else if (workingDays === 0) {
		badgeClass = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
		labelRu = "Срок сдачи: сегодня";
	} else if (isUrgent) {
		badgeClass = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
		labelRu = `Срочно: ${workingDays} раб. дн.`;
	}

	return {
		workingDays,
		calendarDays,
		isOverdue,
		isUrgent,
		badgeClass,
		labelRu,
	};
}

/**
 * 152-FZ patient name formatting for clinical documentation and external courier tags.
 * Generates both official full name and masked Courier Initials format (e.g. «Иванов И. И.»).
 */
export function formatPatientName152Fz(fullName?: string | null): {
	fullName: string;
	courierMaskedName: string;
} {
	if (!fullName || !fullName.trim()) {
		return { fullName: "Пациент", courierMaskedName: "Пациент" };
	}
	const trimmed = fullName.trim();
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length === 1) {
		return { fullName: trimmed, courierMaskedName: trimmed };
	}
	const surname = parts[0];
	const initials = parts
		.slice(1)
		.map((p) => (p[0] ? `${p[0].toUpperCase()}.` : ""))
		.join(" ");
	const courierMaskedName = `${surname} ${initials}`.trim();
	return { fullName: trimmed, courierMaskedName };
}
