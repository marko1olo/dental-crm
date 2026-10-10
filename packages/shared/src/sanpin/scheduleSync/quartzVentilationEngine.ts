import { type SanpinClinicalSpecialty, type SanpinAppointmentSource, SANPIN_VISIT_CONSUMPTION_STANDARDS } from './types.js';
// ─────────────────────────────────────────────────────────────────────────────
// 2. SPECIALTY CLASSIFICATION & NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

const SURGERY_REGEX =
	/хирург|удален|экстракц|имплант|синус|резекц|костн.*пластик|апикал|кюретаж|лунк|швы|лоскут|распатор|синуслифт/i;

const ORTHOPEDICS_REGEX =
	/ортопед|коронк|протез|мост|винир|вкладк|слепок|оттиск|окклюз|бюгел|абатмент|примерк|культев|накладк|акрил|бюгель/i;

const THERAPY_REGEX =
	/терап|кариес|пульпит|периодонтит|пломб|реставрац|чистк|гигиен|отбеливан|эндо|детск|осмотр|консультац|аирфло|air-flow|скейлинг|герметизац/i;

/**
 * Интеллектуальная классификация визита по специализации на основе:
 * 1. Явного поля `specialty` / `category`;
 * 2. Маппинга врача `doctorSpecialtyMap`;
 * 3. Семантического анализа причины приёма (`reason`), комментария (`comment`) и названия услуги (`serviceTitle`).
 */
export function classifyAppointmentSpecialty(
	appointment: SanpinAppointmentSource,
	doctorSpecialtyMap?: Readonly<Record<string, SanpinClinicalSpecialty | string>> | undefined,
): SanpinClinicalSpecialty {
	// 1. Проверка явного поля specialty / category
	const explicit = (appointment.specialty || appointment.category || "").toLowerCase().trim();
	if (explicit) {
		if (explicit.includes("surg") || explicit.includes("хирург") || explicit.includes("implant")) {
			return "surgery";
		}
		if (explicit.includes("ortho") || explicit.includes("ортопед") || explicit.includes("prosth")) {
			return "orthopedics";
		}
		if (
			explicit.includes("therap") ||
			explicit.includes("терап") ||
			explicit.includes("endo") ||
			explicit.includes("pediatric") ||
			explicit.includes("гигиен")
		) {
			return "therapy";
		}
	}

	// 2. Проверка специализации доктора
	if (appointment.doctorUserId && doctorSpecialtyMap && doctorSpecialtyMap[appointment.doctorUserId]) {
		const docSpec = String(doctorSpecialtyMap[appointment.doctorUserId]).toLowerCase().trim();
		if (docSpec.includes("surg") || docSpec.includes("хирург") || docSpec.includes("implant")) {
			return "surgery";
		}
		if (docSpec.includes("ortho") || docSpec.includes("ортопед") || docSpec.includes("prosth")) {
			return "orthopedics";
		}
		if (
			docSpec.includes("therap") ||
			docSpec.includes("терап") ||
			docSpec.includes("endo") ||
			docSpec.includes("pediatric")
		) {
			return "therapy";
		}
	}

	// 3. Семантический разбор текстовых полей
	const textContent = `${appointment.reason || ""} ${appointment.comment || ""} ${appointment.serviceTitle || ""}`.trim();
	if (textContent) {
		if (ORTHOPEDICS_REGEX.test(textContent)) {
			return "orthopedics";
		}
		if (SURGERY_REGEX.test(textContent)) {
			return "surgery";
		}
		if (THERAPY_REGEX.test(textContent)) {
			return "therapy";
		}
	}

	// 4. Дефолт: терапевтический приём
	return "therapy";
}

/**
 * Извлекает календарную дату в формате YYYY-MM-DD из ISO строки или Date.
 */
export function extractIsoDateString(value: string | Date): string {
	if (typeof value === "string") {
		const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
		if (match) {
			return `${match[1]}-${match[2]}-${match[3]}`;
		}
		const d = new Date(value);
		if (!Number.isNaN(d.getTime())) {
			return d.toISOString().slice(0, 10);
		}
		return value.slice(0, 10);
	}
	return value.toISOString().slice(0, 10);
}

/**
 * Генерирует массив всех календарных дат между startDate и endDate (включительно).
 */
export function generateDateSequence(startDateStr: string, endDateStr: string): string[] {
	const start = extractIsoDateString(startDateStr);
	const end = extractIsoDateString(endDateStr);

	if (start > end) {
		return [start];
	}

	const dates: string[] = [];
	const current = new Date(`${start}T00:00:00.000Z`);
	const target = new Date(`${end}T00:00:00.000Z`);

	while (current <= target) {
		dates.push(current.toISOString().slice(0, 10));
		current.setUTCDate(current.getUTCDate() + 1);
	}

	return dates;
}

export const RU_DAY_NAMES = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
