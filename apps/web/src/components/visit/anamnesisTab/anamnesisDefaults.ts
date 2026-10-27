/**
 * apps/web/src/components/visit/anamnesisTab/anamnesisDefaults.ts
 *
 * Клинические константы физиологической нормы и безопасный автопарсинг карты пациента.
 * Обеспечивает выполнение Мандата 8e (1-клик фиксация нормы без лишней бюрократии).
 */

import { parseSafetyProfileFromText } from "../../patients/safetyMath";
import type { PregnancyTrimester } from "./types";

export const PHYSIOLOGICAL_NORM = {
	complaintsList: ["Плановый осмотр (жалоб нет)"],
	historyList: ["Опыт анестезии положительный (без осложнений)"],
	notes:
		"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.",
	complaintsText: "Жалоб на момент осмотра не предъявляет (профилактический осмотр).",
	anamnesisText:
		"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Стоматологический анамнез: регулярная санация полости рта, опыт местной анестезии без осложнений. Физиологическая норма.",
	objectiveText:
		"Конфигурация лица не изменена, симметрично. Открывание рта свободное, безболезненное, в полном объеме. ВНЧС без патологии. Регионарные лимфоузлы не пальпируются. Слизистая оболочка полости рта физиологической окраски, влажная, без патологических элементов. Десна бледно-розовая, плотная, прикреплена, не кровоточит. Прикус физиологический (ортогнатический). Зубные ряды непрерывные, твердые ткани зубов без видимых кариозных поражений. Гигиеническое состояние полости рта удовлетворительное.",
	diagnosisText:
		"Z01.2 Стоматологическое обследование и исследование зубных рядов (патологий твердых тканей, пародонта и СОПР не выявлено / норма)",
	treatmentText:
		"В специальном стоматологическом лечении на момент осмотра не нуждается. Полость рта санирована.",
	recommendationsText:
		"Индивидуальная контролируемая гигиена полости рта 2 раза в день (зубная щетка средней жесткости, паста с фторидами 1450 ppm, зубная нить / флосс). Профилактический осмотр и профессиональная гигиена полости рта через 6 месяцев.",
	comorbiditiesText:
		"Сопутствующие патологии: отсутствуют (соматически здоров, норма).",
} as const;

export interface ExtractedSafetyProfile {
	allergies: Record<string, string>;
	risks: string[];
	pregnancyTrimester?: PregnancyTrimester;
}

export function extractPatientSafetyDefaults(
	activePat: { allergies?: string | string[]; somaticNotes?: string; concomitantDiseases?: string } | null | undefined,
): ExtractedSafetyProfile {
	const allergies: Record<string, string> = {};
	const risks: string[] = [];
	let pregnancyTrimester: PregnancyTrimester | undefined;

	if (!activePat) return { allergies, risks };

	const rawAllergies = activePat.allergies || "";
	const allergyStr = Array.isArray(rawAllergies) ? rawAllergies.join(", ") : String(rawAllergies);
	const fullText = `${allergyStr} ${activePat.somaticNotes || ""} ${activePat.concomitantDiseases || ""}`.trim();

	if (!fullText) return { allergies, risks };

	const safety = parseSafetyProfileFromText(fullText);
	if (safety.hasArticaineAllergy) allergies["Артикаин"] = "Крапивница / кожный зуд";
	if (safety.hasLidocaineAllergy) allergies["Лидокаин"] = "Крапивница / кожный зуд";
	if (safety.hasMepivacaineAllergy) allergies["Мепивакаин"] = "Местная гиперемия";
	if (safety.hasPenicillinAllergy) allergies["Пенициллиновый ряд"] = "Крапивница / кожный зуд";
	if (safety.hasLatexAllergy) allergies["Латекс"] = "Местная гиперемия";
	if (safety.hasIodineAllergy) allergies["Йод / Йодоформ"] = "Местная гиперемия";
	if (safety.hasNsaidAllergy) allergies["НПВП / Аспирин"] = "Бронхоспазм / удушье";

	if (safety.hasPacemakerExs) risks.push("Кардиостимулятор (ЭКС / ИКД)");
	if (safety.hasHypertension) risks.push("Гипертоническая болезнь / ИБС");
	if (safety.hasDiabetesMellitus) risks.push("Сахарный диабет");
	if (safety.takesAnticoagulants) risks.push("Приём антикоагулянтов");
	if (safety.takesBisphosphonates) risks.push("Приём бисфосфонатов");
	if (safety.pregnancyTrimester && (safety.pregnancyTrimester as string) !== "none") {
		risks.push("Беременность / Лактация");
		pregnancyTrimester = safety.pregnancyTrimester as PregnancyTrimester;
	}

	return { allergies, risks, pregnancyTrimester };
}
