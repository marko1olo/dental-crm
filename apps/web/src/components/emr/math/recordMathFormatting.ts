/** Экранирование специальных символов HTML */
export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/** Расчет возраста пациента в годах с правильным русским склонением */
export function formatPatientAge(birthDateStr: string, referenceDateStr?: string): string {
	if (!birthDateStr) return "Возраст не указан";
	const birthDate = new Date(birthDateStr);
	if (Number.isNaN(birthDate.getTime())) return "Возраст не указан";

	const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
	let ageYears = refDate.getFullYear() - birthDate.getFullYear();
	const monthDiff = refDate.getMonth() - birthDate.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
		ageYears--;
	}

	if (ageYears < 0) return "0 лет";
	if (ageYears === 0) {
		const months = (refDate.getFullYear() - birthDate.getFullYear()) * 12 + (refDate.getMonth() - birthDate.getMonth());
		if (months <= 1) return "1 месяц";
		if (months >= 2 && months <= 4) return `${months} месяца`;
		return `${Math.max(1, months)} месяцев`;
	}

	const rem10 = ageYears % 10;
	const rem100 = ageYears % 100;
	if (rem100 >= 11 && rem100 <= 19) return `${ageYears} лет`;
	if (rem10 === 1) return `${ageYears} год`;
	if (rem10 >= 2 && rem10 <= 4) return `${ageYears} года`;
	return `${ageYears} лет`;
}
