import type { PatientClinicalSafetyProfile } from "../safetyMath";

export function formatSafetyProfileToDiaryText(profile?: Partial<PatientClinicalSafetyProfile> | null | undefined): string {
	if (!profile) return "Аллергологический и соматический статус не отягощен.";

	const items: string[] = [];
	const allergies: string[] = [];
	if (profile.hasArticaineAllergy) allergies.push("Артикаин (Ультракаин)");
	if (profile.hasLidocaineAllergy) allergies.push("Лидокаин");
	if (profile.hasMepivacaineAllergy) allergies.push("Мепивакаин");
	if (profile.hasEsterAnestheticsAllergy) allergies.push("Эфирные анестетики (Новокаин / Дикаин / Анестезин / Бензокаин)");
	if (profile.hasSulfiteAllergy) allergies.push("Сульфиты / метабисульфит");
	if (profile.hasPenicillinAllergy) allergies.push("Пенициллины (Амоксиклав)");
	if (profile.hasLatexAllergy) allergies.push("Латекс");
	if (profile.hasNsaidAllergy) allergies.push("АЛЛЕРГИЯ: НПВП (Аспирин, Кеторол, Ибупрофен — противопоказаны, препарат выбора: Парацетамол)");
	if (profile.hasIodineAllergy) allergies.push("Йод и йодоформсодержащие препараты (Бетадин, Метапекс, Альвожил)");
	if (profile.customAllergyNotes) allergies.push(profile.customAllergyNotes);

	if (allergies.length > 0) {
		items.push(`Аллергологический анамнез: Отягощен (аллергия на: ${allergies.join(", ")}).`);
	} else {
		items.push("Аллергологический анамнез: Со слов пациента не отягощен, аллергии на медикаменты отрицает.");
	}

	const criticals: string[] = [];
	if (profile.hasPacemakerExs) {
		criticals.push("Электрокардиостимулятор (ЭКС) — ультразвуковой скейлинг и электрокоагуляция категорически противопоказаны");
	}
	if (profile.takesBisphosphonates) {
		criticals.push(`Прием бисфосфонатов (${profile.bisphosphonateName || "антирезорбтивная терапия"}) — высокий риск остеонекроза челюстей (MRONJ)`);
	}
	if (profile.takesAnticoagulants) {
		criticals.push(`Прием антикоагулянтов/дезагрегантов (${profile.anticoagulantName || "варфарин/НОАК"}${profile.lastInrValue !== undefined ? `, МНО: ${profile.lastInrValue}` : ""}) — риск геморрагий`);
	}
	if (profile.hasPheochromocytoma) {
		criticals.push("Феохромоцитома (абсолютный запрет адреналина и вазоконстрикторов)");
	}
	if (profile.pregnancyTrimester && profile.pregnancyTrimester !== "none") {
		const trimLabel =
			profile.pregnancyTrimester === "trimester_1" ? "1-й триместр (неотложная помощь)" :
			profile.pregnancyTrimester === "trimester_2" ? "2-й триместр (плановое лечение разрешено)" :
			profile.pregnancyTrimester === "trimester_3" ? "3-й триместр (риск сдавления НПВ)" : "Период лактации";
		criticals.push(`Беременность/Лактация: ${trimLabel}`);
	}
	if (criticals.length > 0) items.push(`Критические клинические факторы: ${criticals.join("; ")}.`);

	const chronic: string[] = [];
	if (profile.hasHypertension || profile.hasCardiovascularDisease) chronic.push("Гипертоническая болезнь / ССЗ (контроль АД, предел адреналина 0.04 мг)");
	if (profile.hasDiabetesMellitus) chronic.push(`Сахарный диабет${profile.diabetesType ? ` ${profile.diabetesType} типа` : ""}`);
	if (profile.hasBronchialAsthma) chronic.push("Бронхиальная астма (ингалятор готов к применению)");
	if (profile.hasEpilepsy) chronic.push("Эпилепсия (защита от фотостимуляции)");
	if (profile.hasHepatitis) chronic.push("Вирусный гепатит");
	if (profile.hasHiv) chronic.push("ВИЧ-инфекция");
	if (profile.customChronicNotes) chronic.push(profile.customChronicNotes);

	if (chronic.length > 0) {
		if (
			chronic.length === 1 &&
			profile.customChronicNotes &&
			(profile.customChronicNotes.toLowerCase().includes("соматически здоров") ||
				profile.customChronicNotes.toLowerCase().includes("норма"))
		) {
			items.push(`Соматический статус: ${profile.customChronicNotes.replace(/\.+$/, "")}.`);
		} else {
			const cleanChronic = chronic.map((c) => c.replace(/\.+$/, ""));
			items.push(`Сопутствующие соматические заболевания: ${cleanChronic.join(", ")}.`);
		}
	} else {
		items.push("Соматический статус: Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.");
	}

	return items.join("\n");
}
