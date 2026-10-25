/**
 * patientNameMasker.ts — Маскирование ПДн по 152-ФЗ для табло холла
 * Гарантирует неразглашение врачебной тайны и персональных данных пациентов.
 */

/**
 * Преобразует ФИО пациента в защищенный формат 152-ФЗ: "Иванов И. О." или "Иванов И."
 * Никогда не выводит полные имена и отчества на публичные экраны.
 */
export function maskPatientName152Fz(fullName: string | null | undefined): string {
	if (!fullName || typeof fullName !== "string") return "Пациент";
	const clean = fullName.trim();
	if (!clean) return "Пациент";

	const parts = clean.split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "Пациент";
	if (parts.length === 1) return parts[0] ?? "Пациент";

	const surname = parts[0] ?? "";
	const firstInitial = parts[1]?.[0] ? `${parts[1][0].toUpperCase()}.` : "";
	const patronymicInitial = parts[2]?.[0] ? ` ${parts[2][0].toUpperCase()}.` : "";

	return `${surname} ${firstInitial}${patronymicInitial}`.trim();
}

/**
 * Преобразует ФИО врача в компактный клинический формат: "Зубов А. В."
 */
export function formatDoctorDisplay(fullName: string | null | undefined): string {
	if (!fullName || typeof fullName !== "string") return "Дежурный врач";
	const clean = fullName.trim();
	if (!clean) return "Дежурный врач";

	// Если уже содержит сокращенный префикс
	const withoutPrefix = clean.replace(/^(д-р|доктор|врач)\s+/i, "");
	const parts = withoutPrefix.split(/\s+/).filter(Boolean);

	if (parts.length === 0) return "Дежурный врач";
	if (parts.length === 1) return parts[0] ?? "Дежурный врач";

	const surname = parts[0] ?? "";
	const p1 = parts[1]?.[0] ? `${parts[1][0].toUpperCase()}.` : "";
	const p2 = parts[2]?.[0] ? ` ${parts[2][0].toUpperCase()}.` : "";

	return `${surname} ${p1}${p2}`.trim();
}
