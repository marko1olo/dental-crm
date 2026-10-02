/**
 * visitCriticalBadges.ts — Расчет критических соматических и аллергических бейджей у кресла врача (Tier 1).
 *
 * Интегрирует:
 * 1. Аллергию на местные анестетики (Лидокаин, Артикаин, Новокаин) — анафилаксия.
 * 2. Аллергию на пенициллины (Амоксиклав, Аугментин) — запрет пенициллинов.
 * 3. Бронхиальную астму — риск бронхоспазма на консервант сульфит/метабисульфит E223 в карпулах с адреналином.
 * 4. ЭКС / Кардиостимулятор — абсолютный запрет УЗ-скейлинга.
 * 5. Антикоагулянты (Варфарин, Ксарелто) — риск кровотечения при хирургии.
 * 6. Сахарный диабет — риск гипогликемии.
 * 7. Беременность — ограничение адреналина и рентгена.
 * 8. Бисфосфонаты — риск остеонекроза челюсти (БОНЧ / MRONJ).
 *
 * Сохраняет 100% автономию врача (Mandates 8e, 8y): не блокирует интерфейс, только информирует с высоким приоритетом.
 */

import { isNegativeAllergyStatement, parseSafetyProfileFromText } from "../../patients/safetyMath";

export interface VisitCriticalBadge {
	readonly id: string;
	readonly testId: string;
	readonly title: string;
	readonly shortLabel: string;
	readonly fullLabel: string;
}

export interface PatientForCriticalBadges {
	readonly allergies?: string | readonly string[] | null | undefined;
	readonly somaticNotes?: string | null | undefined;
	readonly concomitantDiseases?: string | null | undefined;
}

export function calculateActivePatientCriticalBadges(
	patient?: PatientForCriticalBadges | null,
	anamnesisText?: string | null,
): readonly VisitCriticalBadge[] {
	if (!patient) return [];
	const badges: VisitCriticalBadge[] = [];

	const rawAllergies = patient.allergies || "";
	const allergyText = Array.isArray(rawAllergies) ? rawAllergies.join(", ") : String(rawAllergies);
	const hasNegativeAllergy = isNegativeAllergyStatement(allergyText);

	if (allergyText && !hasNegativeAllergy) {
		badges.push({
			id: "allergy",
			testId: "visit-focus-allergy-alert",
			title: `Аллергоанамнез: ${allergyText}`,
			shortLabel: "АЛЛЕРГИЯ",
			fullLabel: `Аллергия: ${allergyText}`,
		});
	}

	const combinedMedicalText = `${allergyText} ${patient.somaticNotes || ""} ${patient.concomitantDiseases || ""} ${anamnesisText || ""}`.trim();
	const safety = parseSafetyProfileFromText(combinedMedicalText);
	const combinedLower = combinedMedicalText.toLowerCase();

	// 1. Аллергия на местные анестетики (Лидокаин, Артикаин, Новокаин) — ВИТАЛЬНАЯ УГРОЗА В КРЕСЛЕ
	const hasAnestheticAllergy =
		safety.hasLidocaineAllergy ||
		safety.hasArticaineAllergy ||
		safety.hasMepivacaineAllergy ||
		safety.hasEsterAnestheticsAllergy ||
		(!hasNegativeAllergy && (combinedLower.includes("анестетик") || combinedLower.includes("анестези")));

	if (hasAnestheticAllergy) {
		badges.push({
			id: "lidocaine",
			testId: "visit-focus-lidocaine-alert",
			title: "АЛЛЕРГИЯ НА МЕСТНЫЕ АНЕСТЕТИКИ (Лидокаин/Артикаин): РИСК АНАФИЛАКТИЧЕСКОГО ШОКА!",
			shortLabel: "ЛИДОКАИН ⚠️",
			fullLabel: "ЛИДОКАИН — АЛЛЕРГИЯ НА АНЕСТЕТИКИ!",
		});
	}

	// 2. Аллергия на пенициллины (Амоксиклав, Аугментин) — ВИТАЛЬНЫЙ РИСК ПРИ АНТИБИОТИКОТЕРАПИИ
	if (safety.hasPenicillinAllergy) {
		badges.push({
			id: "penicillin",
			testId: "visit-focus-penicillin-alert",
			title: "АЛЛЕРГИЯ НА ПЕНИЦИЛЛИНЫ (Амоксиклав/Аугментин): ЗАПРЕТ ПЕНИЦИЛЛИНОВОГО РЯДА!",
			shortLabel: "ПЕНИЦИЛЛИН ⚠️",
			fullLabel: "ПЕНИЦИЛЛИН — АЛЛЕРГИЯ НА АНТИБИОТИКИ!",
		});
	}

	// 3. Бронхиальная астма — ЗАПРЕТ СУЛЬФИТОВ / МЕТАБИСУЛЬФИТА (E223) В КАРПУЛАХ С АДРЕНАЛИНОМ
	if (safety.hasBronchialAsthma || safety.hasSulfiteAllergy) {
		badges.push({
			id: "asthma",
			testId: "visit-focus-asthma-alert",
			title: "БРОНХИАЛЬНАЯ АСТМА: РИСК БРОНХОСПАЗМА НА СУЛЬФИТЫ (консервант E223 в эпинефрине)! Использовать скандонест 3% plain",
			shortLabel: "АСТМА (СУЛЬФИТЫ)",
			fullLabel: "БРОНХИАЛЬНАЯ АСТМА — ЗАПРЕТ СУЛЬФИТОВ!",
		});
	}

	// 4. ЭКС (кардиостимулятор) — ЗАПРЕТ УЗ-скейлера и коагулятора
	if (safety.hasPacemakerExs || combinedLower.includes("экс") || combinedLower.includes("кардиостимулятор")) {
		badges.push({
			id: "pacemaker",
			testId: "visit-focus-pacemaker-alert",
			title: "Наличие ЭКС: ЗАПРЕТ УЗ-скейлера и электрокоагулятора!",
			shortLabel: "ЭКС",
			fullLabel: "ЭКС (кардиостимулятор) — ЗАПРЕТ УЗ!",
		});
	}

	// 5. Антикоагулянтная терапия — риск кровотечения
	if (safety.takesAnticoagulants || combinedLower.includes("антикоагулянт") || combinedLower.includes("варфарин") || combinedLower.includes("ксарелто")) {
		badges.push({
			id: "anticoagulant",
			testId: "visit-focus-anticoagulant-alert",
			title: "Антикоагулянтная терапия: риск кровотечения",
			shortLabel: "АКТ",
			fullLabel: "Антикоагулянты (риск кровотечения)",
		});
	}

	// 6. Сахарный диабет
	if (safety.hasDiabetesMellitus || combinedLower.includes("диабет")) {
		badges.push({
			id: "diabetes",
			testId: "visit-focus-diabetes-alert",
			title: "Сахарный диабет: риск гипогликемии и замедленной регенерации",
			shortLabel: "СД",
			fullLabel: "Сахарный диабет",
		});
	}

	// 7. Беременность
	if ((safety.pregnancyTrimester && safety.pregnancyTrimester !== "none") || combinedLower.includes("беременн") || combinedLower.includes("триместр")) {
		badges.push({
			id: "pregnancy",
			testId: "visit-focus-pregnancy-alert",
			title: "Беременность: ограничение адреналина и рентгена",
			shortLabel: "БЕРЕМ.",
			fullLabel: "Беременность",
		});
	}

	// 8. Бисфосфонаты — риск остеонекроза челюсти (БОНЧ)
	if (safety.takesBisphosphonates || combinedLower.includes("бисфосфон") || combinedLower.includes("остеопороз")) {
		badges.push({
			id: "bisphosphonates",
			testId: "visit-focus-bisphosphonates-alert",
			title: "Бисфосфонаты: риск остеонекроза челюсти!",
			shortLabel: "БИСФОСФ.",
			fullLabel: "Бисфосфонаты — риск некроза челюсти!",
		});
	}

	return badges;
}
