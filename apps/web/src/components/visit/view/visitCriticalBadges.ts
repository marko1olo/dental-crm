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

	// 1. Аллергия на местные анестетики (Лидокаин, Артикаин, Убистезин, Септанест, Новокаин) — ВИТАЛЬНАЯ УГРОЗА В КРЕСЛЕ
	const hasLidocaine = safety.hasLidocaineAllergy || combinedLower.includes("лидокаин") || combinedLower.includes("ксилокаин");
	const hasArticaine = safety.hasArticaineAllergy || combinedLower.includes("артикаин") || combinedLower.includes("ультракаин") || combinedLower.includes("септанест") || combinedLower.includes("убистезин");
	const hasOtherAnesthetic = safety.hasMepivacaineAllergy || safety.hasEsterAnestheticsAllergy || (!hasNegativeAllergy && (combinedLower.includes("анестетик") || combinedLower.includes("анестези")));

	if (hasLidocaine || (!hasArticaine && hasOtherAnesthetic)) {
		badges.push({
			id: "lidocaine",
			testId: "visit-focus-lidocaine-alert",
			title: "АЛЛЕРГИЯ НА МЕСТНЫЕ АНЕСТЕТИКИ (Лидокаин): РИСК АНАФИЛАКТИЧЕСКОГО ШОКА! Рекомендован Мепивакаин 3% plain или Артикаин без парабенов",
			shortLabel: "ЛИДОКАИН ⚠️",
			fullLabel: "ЛИДОКАИН: аллергия! Рекомендован Мепивакаин 3% без вазоконстриктора",
		});
	}

	if (hasArticaine) {
		badges.push({
			id: "articaine",
			testId: "visit-focus-articaine-alert",
			title: "АЛЛЕРГИЯ НА АРТИКАИН (Ультракаин / Убистезин / Септанест): РИСК АНАФИЛАКТИЧЕСКОГО ШОКА! Рекомендован Мепивакаин 3% без вазоконстриктора (Скандонест)",
			shortLabel: "АРТИКАИН ⚠️",
			fullLabel: "АРТИКАИН: аллергия! Рекомендован Мепивакаин 3% без вазоконстриктора",
		});
	}

	// 2. Аллергия на пенициллины (Амоксиклав, Аугментин) — ВИТАЛЬНЫЙ РИСК ПРИ АНТИБИОТИКОТЕРАПИИ
	if (safety.hasPenicillinAllergy) {
		badges.push({
			id: "penicillin",
			testId: "visit-focus-penicillin-alert",
			title: "АЛЛЕРГИЯ НА ПЕНИЦИЛЛИНЫ (Амоксициллин/Амоксиклав/Аугментин): ЗАПРЕТ ПЕНИЦИЛЛИНОВ! Рекомендована замена на Кларитромицин 500 мг или Клиндамицин 300 мг",
			shortLabel: "ПЕНИЦИЛЛИН ⚠️",
			fullLabel: "ПЕНИЦИЛЛИН: аллергия! Альтернатива: Кларитромицин / Клиндамицин",
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

	// 4. Гипертоническая болезнь / Сердечно-сосудистые риски (запрет на адреналин 1:100 000, рекомендован 1:200 000 или скандонест)
	if (
		safety.hasHypertension ||
		safety.hasCardiovascularDisease ||
		safety.hasIhd ||
		safety.hasArrhythmia ||
		combinedLower.includes("гипертон") ||
		combinedLower.includes("гипертенз") ||
		combinedLower.includes("давлен") ||
		combinedLower.includes("ибс") ||
		combinedLower.includes("стенокард")
	) {
		badges.push({
			id: "hypertension",
			testId: "visit-focus-hypertension-alert",
			title: "Артериальная гипертензия / ССЗ: ограничение вазоконстрикторов! Запрет адреналина 1:100 000, рекомендован Мепивакаин 3% plain или Артикаин 1:200 000",
			shortLabel: "АГ / ССЗ",
			fullLabel: "ГИПЕРТОНИЯ / ССЗ: адреналин <= 1:200 000 или скандонест",
		});
	}

	// 5. ЭКС (кардиостимулятор) — ЗАПРЕТ УЗ-скейлера и коагулятора
	if (safety.hasPacemakerExs || combinedLower.includes("экс") || combinedLower.includes("кардиостимулятор")) {
		badges.push({
			id: "pacemaker",
			testId: "visit-focus-pacemaker-alert",
			title: "Наличие ЭКС: ЗАПРЕТ УЗ-скейлера и электрокоагулятора!",
			shortLabel: "ЭКС",
			fullLabel: "ЭКС (кардиостимулятор) — ЗАПРЕТ УЗ!",
		});
	}

	// 6. Антикоагулянтная терапия — риск кровотечения при хирургии
	if (
		safety.takesAnticoagulants ||
		safety.hasAnticoagulantTherapy ||
		combinedLower.includes("антикоагулянт") ||
		combinedLower.includes("варфарин") ||
		combinedLower.includes("ксарелто") ||
		combinedLower.includes("аспирин") ||
		combinedLower.includes("дезагрегант")
	) {
		badges.push({
			id: "anticoagulant",
			testId: "visit-focus-anticoagulant-alert",
			title: "Антикоагулянтная терапия (варфарин/аспирин/НОАК): высокий риск луночкового кровотечения при удалении! Местный гемостаз, ушивание лунки",
			shortLabel: "АНТИКОАГ.",
			fullLabel: "АНТИКОАГУЛЯНТЫ — риск кровотечения при удалении",
		});
	}

	// 7. Сахарный диабет — риск замедленной остеоинтеграции
	if (safety.hasDiabetesMellitus || combinedLower.includes("диабет")) {
		badges.push({
			id: "diabetes",
			testId: "visit-focus-diabetes-alert",
			title: "Сахарный диабет: риск гипогликемии и замедленной остеоинтеграции имплантов, атравматичный протокол",
			shortLabel: "СД",
			fullLabel: "САХАРНЫЙ ДИАБЕТ — риск остеоинтеграции имплантов",
		});
	}

	// 8. Беременность и период лактации
	if ((safety.pregnancyTrimester && safety.pregnancyTrimester !== "none") || combinedLower.includes("беременн") || combinedLower.includes("лактац") || combinedLower.includes("триместр")) {
		badges.push({
			id: "pregnancy",
			testId: "visit-focus-pregnancy-alert",
			title: "Беременность / Лактация: безопасные анестетики без эпинефрина (или адреналин <= 1:200 000), защита фартуком при рентгене",
			shortLabel: "БЕРЕМЕННОСТЬ",
			fullLabel: "БЕРЕМЕННОСТЬ — анестетик без адреналина / 1:200 000",
		});
	}

	// 9. Бисфосфонаты — риск остеонекроза челюсти (БОНЧ)
	if (safety.takesBisphosphonates || safety.hasBisphosphonateTherapy || combinedLower.includes("бисфосфон") || combinedLower.includes("остеопороз")) {
		badges.push({
			id: "bisphosphonates",
			testId: "visit-focus-bisphosphonates-alert",
			title: "Бисфосфонаты: риск остеонекроза челюсти (MRONJ/БОНЧ)! Атравматичное удаление, консилиум перед костной пластикой",
			shortLabel: "БИСФОСФ.",
			fullLabel: "Бисфосфонаты — риск некроза челюсти!",
		});
	}

	return badges;
}
