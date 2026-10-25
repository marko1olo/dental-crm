/**
 * @dental/shared/anesthesia/calculator/somaticAdjusterModules/clinicalWeightResolver.ts
 * Clinical weight resolution from age/pediatric presets (Mandate 8b, <= 120 lines)
 */

export function resolveClinicalDefaultWeightKg(
	patientWeightKg?: number | null | undefined,
	patientAgeYears?: number | null | undefined,
	isPediatric?: boolean | undefined,
): number {
	if (
		typeof patientWeightKg === "number" &&
		Number.isFinite(patientWeightKg) &&
		patientWeightKg > 0
	) {
		return Math.max(5, Math.min(250, patientWeightKg));
	}

	const isChild = Boolean(
		isPediatric ||
			(typeof patientAgeYears === "number" &&
				Number.isFinite(patientAgeYears) &&
				patientAgeYears > 0 &&
				patientAgeYears < 18),
	);

	if (!isChild) {
		return 70; // Клинический дефолт для взрослого пациента
	}

	// Педиатрический расчет веса по возрасту (стандарт клинической педиатрии РФ):
	const age =
		typeof patientAgeYears === "number" &&
		Number.isFinite(patientAgeYears) &&
		patientAgeYears > 0
			? patientAgeYears
			: 7; // Дефолтный возраст ребенка при неизвестном = 7 лет

	if (age < 1) return 10;
	if (age <= 5) return Math.round(2 * age + 8); // 1г: 10кг, 2г: 12кг, 3г: 14кг, 4г: 16кг, 5г: 18кг
	if (age <= 12) return Math.round(3 * age + 4); // 6л: 22кг, 7л: 25кг, 8л: 28кг, 9л: 31кг, 10л: 34кг, 11л: 37кг, 12л: 40кг
	return Math.min(65, Math.round(40 + (age - 12) * 4)); // 13-17 лет: 44-60 кг
}
