// ─────────────────────────────────────────────────────────────────────────────
// PROCEDURAL & NOMENCLATURE TECHNICAL MATCHING (LAYER 1)
// ─────────────────────────────────────────────────────────────────────────────

export const SURGERY_PROCEDURE_KEYWORDS = [
	"удаление",
	"экстракция",
	"имплантация",
	"синус-лифтинг",
	"синуслифтинг",
	"костная пластика",
	"остеопластика",
	"резекция верхушки",
	"лоскутная операция",
	"кюретаж открытый",
	"периостотомия",
	"цистэктомия",
	"установка имплантата",
	"гингивэктоми",
	"surgery",
	"extraction",
	"implant",
];

export const SURGERY_NOMENCLATURE_CODES = [
	"a16.07.001", // Удаление зуба
	"a16.07.054", // Внутрикостная дентальная имплантация
	"a16.07.026", // Резекция верхушки корня
	"a16.07.041", // Костная пластика
	"a16.07.042", // Синус-лифтинг
	"a16.07.043", // Гингивэктомия
	"a16.07.044", // Лоскутная операция
	"a16.07.011", // Периостотомия
	"a16.07.016", // Цистэктомия
];

/**
 * Checks if a scheduled appointment involves an invasive surgical manipulation.
 */
export function isSurgicalAppointment(
	reason?: string | null,
	comment?: string | null,
	plannedServices?: Array<{ code?: string | null; title: string }>,
): boolean {
	const text = `${reason || ""} ${comment || ""}`.toLowerCase();
	if (SURGERY_PROCEDURE_KEYWORDS.some((kw) => text.includes(kw))) {
		return true;
	}

	if (plannedServices && plannedServices.length > 0) {
		for (const s of plannedServices) {
			const codeLower = (s.code || "").toLowerCase().trim();
			if (SURGERY_NOMENCLATURE_CODES.some((sc) => codeLower.startsWith(sc))) {
				return true;
			}
			const titleLower = s.title.toLowerCase();
			if (SURGERY_PROCEDURE_KEYWORDS.some((kw) => titleLower.includes(kw))) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Checks if an appointment involves dental procedures requiring local anesthesia.
 */
export function isAnesthesiaIndicatedAppointment(
	reason?: string | null,
	comment?: string | null,
	plannedServices?: Array<{ code?: string | null; title: string }>,
): boolean {
	if (isSurgicalAppointment(reason, comment, plannedServices)) {
		return true;
	}

	const text = `${reason || ""} ${comment || ""}`.toLowerCase();
	const anesthesiaKeywords = [
		"кариес",
		"пульпит",
		"периодонтит",
		"канал",
		"пломб",
		"реставрац",
		"коронк",
		"обточк",
		"препарирован",
		"депульпирован",
		"анестези",
		"лечени",
	];

	if (anesthesiaKeywords.some((kw) => text.includes(kw))) {
		return true;
	}

	if (plannedServices && plannedServices.length > 0) {
		for (const s of plannedServices) {
			const titleLower = s.title.toLowerCase();
			if (anesthesiaKeywords.some((kw) => titleLower.includes(kw))) {
				return true;
			}
		}
	}

	if (reason && !text.includes("осмотр") && !text.includes("консультац")) {
		return true;
	}

	return false;
}

/**
 * Calculates patient age from birthDate string.
 */
export function calculateAge(
	birthDateStr?: string | null,
	refDate?: Date,
): number | null {
	if (!birthDateStr) return null;
	const bDate = new Date(birthDateStr);
	if (Number.isNaN(bDate.getTime())) return null;
	const ref = refDate ?? new Date();
	let age = ref.getFullYear() - bDate.getFullYear();
	const m = ref.getMonth() - bDate.getMonth();
	if (m < 0 || (m === 0 && ref.getDate() < bDate.getDate())) {
		age--;
	}
	return age >= 0 ? age : null;
}
