import { CLINICAL_SAFETY_CATALOG } from "./clinicalSafetyCatalogData";
import {
	isNegativeAllergyStatement,
	parseSafetyProfileFromText,
	type ClinicalSafetySeverity,
	type ClinicalSafetyCategory,
	type PatientClinicalSafetyProfile,
} from "./safetyMath";

/** Результат комплексной оценки клинической безопасности */
export interface PatientSafetyEvaluationResult {
	readonly hasCriticalStopFlags: boolean;
	readonly hasHighRiskFlags: boolean;
	readonly totalAlertCount: number;
	readonly maxSeverity: ClinicalSafetySeverity;
	readonly activeFlags: readonly ClinicalSafetyFlag[];
	readonly forbiddenProcedures: readonly string[];
	readonly mandatoryPrecautions: readonly string[];
	readonly anestheticRecommendations: readonly string[];
	readonly formattedSummaryLine: string;
	readonly formattedDiarySection: string;
}

export interface ClinicalSafetyFlag {
	readonly id: string;
	readonly category: ClinicalSafetyCategory;
	readonly severity: ClinicalSafetySeverity;
	readonly shortBadge: string;
	readonly titleRu: string;
	readonly description: string;
	readonly forbiddenProcedures: readonly string[];
	readonly mandatoryPrecautions: readonly string[];
	readonly recommendedAnesthesiaNotes?: string | undefined;
	readonly source: "structured_profile" | "text_parsing" | "manual";
}

/**
 * Оценивает профиль безопасности пациента и возвращает активные стоп-факторы,
 * запрещенные процедуры и рекомендации.
 */
export function evaluatePatientSafetyFlags(
	input?: Partial<PatientClinicalSafetyProfile> | string | null | undefined,
): PatientSafetyEvaluationResult {
	let profile: Partial<PatientClinicalSafetyProfile> = {};

	if (typeof input === "string") {
		profile = parseSafetyProfileFromText(input);
	} else if (input && typeof input === "object") {
		profile = input;
	}

	const activeFlags: ClinicalSafetyFlag[] = [];
	const forbiddenSet = new Set<string>();
	const precautionsSet = new Set<string>();
	const anestheticRecsSet = new Set<string>();

	const addFlagFromCatalog = (catalogId: string, customDetails?: string | undefined) => {
		const item = CLINICAL_SAFETY_CATALOG.find((x) => x.id === catalogId);
		if (!item) return;

		activeFlags.push({
			id: item.id,
			category: item.category,
			severity: item.severity,
			shortBadge: item.shortBadge,
			titleRu: item.titleRu,
			description: customDetails ? `${item.fullDescription} Примечание: ${customDetails}` : item.fullDescription,
			forbiddenProcedures: item.forbiddenProcedures,
			mandatoryPrecautions: item.mandatoryPrecautions,
			recommendedAnesthesiaNotes: item.recommendedAnesthesiaNotes ?? undefined,
			source: "structured_profile",
		});

		for (const p of item.forbiddenProcedures) forbiddenSet.add(p);
		for (const m of item.mandatoryPrecautions) precautionsSet.add(m);
		if (item.recommendedAnesthesiaNotes) anestheticRecsSet.add(item.recommendedAnesthesiaNotes);
	};

	// 1. Аллергии на анестетики
	if (profile.hasArticaineAllergy) addFlagFromCatalog("allergy_articaine");
	if (profile.hasLidocaineAllergy) addFlagFromCatalog("allergy_lidocaine");
	if (profile.hasMepivacaineAllergy) addFlagFromCatalog("allergy_mepivacaine");
	if (profile.hasEsterAnestheticsAllergy) addFlagFromCatalog("allergy_ester_anesthetics");
	if (profile.hasSulfiteAllergy) addFlagFromCatalog("allergy_sulfites");

	// 2. ЭКС / Кардиостимулятор
	if (profile.hasPacemakerExs) addFlagFromCatalog("pacemaker_exs");

	// 3. Бисфосфонаты
	if (profile.takesBisphosphonates) {
		addFlagFromCatalog("bisphosphonates_mronj", profile.bisphosphonateName);
	}

	// 4. Антикоагулянты
	if (profile.takesAnticoagulants) {
		const extra = profile.anticoagulantName
			? `Препарат: ${profile.anticoagulantName}${profile.lastInrValue !== undefined ? `, МНО (INR): ${profile.lastInrValue}` : ""}`
			: undefined;
		addFlagFromCatalog("anticoagulants_bleeding", extra);
	}

	// 5. Беременность
	if (profile.pregnancyTrimester === "trimester_1") addFlagFromCatalog("pregnancy_trimester_1");
	else if (profile.pregnancyTrimester === "trimester_2") addFlagFromCatalog("pregnancy_trimester_2");
	else if (profile.pregnancyTrimester === "trimester_3") addFlagFromCatalog("pregnancy_trimester_3");

	// 6. Хронические соматические болезни
	if (profile.hasHypertension || profile.hasCardiovascularDisease || profile.hasIhd || profile.hasArrhythmia) {
		addFlagFromCatalog("hypertension_cvd");
	}
	if (profile.hasSevereHypertensionStage3) {
		addFlagFromCatalog("severe_hypertension_stage_3");
	}
	if (profile.hasPheochromocytoma) {
		addFlagFromCatalog("pheochromocytoma_catecholamines");
	}
	if (profile.hasThyrotoxicosis) {
		addFlagFromCatalog("thyrotoxicosis_hyperthyroidism");
	}
	if (profile.takesBetaBlockers) {
		addFlagFromCatalog("beta_blockers_interaction");
	}
	if (profile.hasDiabetesMellitus) {
		const extra = profile.diabetesType ? `Тип: ${profile.diabetesType}` : undefined;
		addFlagFromCatalog("diabetes_mellitus", extra);
	}
	if (profile.hasBronchialAsthma) addFlagFromCatalog("bronchial_asthma");
	if (profile.hasEpilepsy) addFlagFromCatalog("epilepsy_seizures");
	if (profile.hasHepatitis || profile.hasHiv) addFlagFromCatalog("hepatitis_hiv_infection");
	if (profile.hasPenicillinAllergy) addFlagFromCatalog("allergy_penicillin");
	if (profile.hasLatexAllergy) addFlagFromCatalog("allergy_latex");
	if (profile.hasNsaidAllergy) addFlagFromCatalog("allergy_nsaid");
	if (profile.hasIodineAllergy) addFlagFromCatalog("allergy_iodine");

	if (profile.hasAnaphylaxisHistory) {
		activeFlags.push({
			id: "anaphylaxis_history",
			category: "anesthesia_allergy",
			severity: "critical",
			shortBadge: "[СТОП] АНАФИЛАКСИЯ В АНАМНЕЗЕ",
			titleRu: "Отягощенный аллергоанамнез: анафилактический шок / ангионевротический отек",
			description: "У пациента в анамнезе системные аллергические реакции немедленного типа (анафилаксия / отек Квинке). Повышенная готовность противошоковой укладки.",
			forbiddenProcedures: ["Применение аллергенов и полипрагмазия"],
			mandatoryPrecautions: [
				"Яркая маркировка титульного листа амбулаторной карты 043/у",
				"Проверка готовности посиндромной аптечки «Антишок» в кабинете перед началом приёма",
			],
			source: "structured_profile",
		});
		forbiddenSet.add("Применение аллергенов и полипрагмазия");
		precautionsSet.add("Проверка готовности посиндромной аптечки «Антишок» в кабинете перед началом приёма");
	}

	if (
		profile.customAllergyNotes &&
		profile.customAllergyNotes.trim() &&
		!isNegativeAllergyStatement(profile.customAllergyNotes)
	) {
		const rawNotes = profile.customAllergyNotes.trim();
		activeFlags.push({
			id: "custom_allergy_notes",
			category: "anesthesia_allergy",
			severity: "critical",
			shortBadge: `[АЛЛЕРГИЯ] ${rawNotes.toUpperCase()}`,
			titleRu: `Индивидуальная лекарственная/вещественная аллергия: ${rawNotes}`,
			description: `У пациента зарегистрирована индивидуальная аллергия или гиперчувствительность: ${rawNotes}`,
			forbiddenProcedures: [`Применение препаратов, содержащих ${rawNotes}`],
			mandatoryPrecautions: [
				"Яркая маркировка титульного листа амбулаторной карты 043/у",
				"Уточнение анамнеза и выбор безопасных альтернативных препаратов",
			],
			source: "structured_profile",
		});
		forbiddenSet.add(`Применение препаратов, содержащих ${rawNotes}`);
		precautionsSet.add("Уточнение анамнеза и выбор безопасных альтернативных препаратов");
	}

	if (
		profile.customAllergiesNotes &&
		profile.customAllergiesNotes.trim() &&
		!isNegativeAllergyStatement(profile.customAllergiesNotes)
	) {
		const rawNotes = profile.customAllergiesNotes.trim();
		activeFlags.push({
			id: "custom_allergies_notes",
			category: "anesthesia_allergy",
			severity: "critical",
			shortBadge: `[АЛЛЕРГИЯ] ${rawNotes.toUpperCase()}`,
			titleRu: `Индивидуальная аллергия: ${rawNotes}`,
			description: `У пациента зарегистрирована аллергия: ${rawNotes}`,
			forbiddenProcedures: [`Применение препаратов, содержащих ${rawNotes}`],
			mandatoryPrecautions: [
				"Яркая маркировка титульного листа амбулаторной карты 043/у",
				"Уточнение анамнеза и выбор безопасных альтернативных препаратов",
			],
			source: "structured_profile",
		});
		forbiddenSet.add(`Применение препаратов, содержащих ${rawNotes}`);
		precautionsSet.add("Уточнение анамнеза и выбор безопасных альтернативных препаратов");
	}

	// Расчет сводных метрик
	const hasCriticalStopFlags = activeFlags.some((f) => f.severity === "critical");
	const hasHighRiskFlags = activeFlags.some((f) => f.severity === "high");

	let maxSeverity: ClinicalSafetySeverity = "none";
	if (hasCriticalStopFlags) maxSeverity = "critical";
	else if (hasHighRiskFlags) maxSeverity = "high";
	else if (activeFlags.some((f) => f.severity === "moderate")) maxSeverity = "moderate";
	else if (activeFlags.length > 0) maxSeverity = "info";

	const formattedSummaryLine = activeFlags.length > 0
		? activeFlags.map((f) => f.shortBadge).join(" ")
		: "Анамнез не отягощен. Критических стоп-факторов не выявлено.";

	const formattedDiarySection = formatSafetyProfileToDiaryText(profile);

	return {
		hasCriticalStopFlags,
		hasHighRiskFlags,
		totalAlertCount: activeFlags.length,
		maxSeverity,
		activeFlags,
		forbiddenProcedures: Array.from(forbiddenSet),
		mandatoryPrecautions: Array.from(precautionsSet),
		anestheticRecommendations: Array.from(anestheticRecsSet),
		formattedSummaryLine,
		formattedDiarySection,
	};
}


/**
 * Форматирует структурированный профиль безопасности в юридически и клинически выверенную
 * текстовую запись для Дневника приёма (форма 043/у).
 */
export function formatSafetyProfileToDiaryText(profile?: Partial<PatientClinicalSafetyProfile> | null | undefined): string {
	if (!profile) return "Аллергологический и соматический статус не отягощен.";

	const items: string[] = [];

	// Аллергостатус
	const allergies: string[] = [];
	if (profile.hasArticaineAllergy) allergies.push("Артикаин (Ультракаин)");
	if (profile.hasLidocaineAllergy) allergies.push("Лидокаин");
	if (profile.hasMepivacaineAllergy) allergies.push("Мепивакаин");
	if (profile.hasEsterAnestheticsAllergy) allergies.push("Эфирные анестетики (Новокаин / Дикаин / Анестезин / Бензокаин)");
	if (profile.hasSulfiteAllergy) allergies.push("Сульфиты / метабисульфит");
	if (profile.hasPenicillinAllergy) allergies.push("Пенициллины (Амоксиклав)");
	if (profile.hasLatexAllergy) allergies.push("Латекс");
	if (profile.hasNsaidAllergy)
		allergies.push(
			"АЛЛЕРГИЯ: НПВП (Аспирин, Кеторол, Ибупрофен — противопоказаны, препарат выбора: Парацетамол)",
		);
	if (profile.hasIodineAllergy) allergies.push("Йод и йодоформсодержащие препараты (Бетадин, Метапекс, Альвожил)");
	if (profile.customAllergyNotes) allergies.push(profile.customAllergyNotes);

	if (allergies.length > 0) {
		items.push(`Аллергологический анамнез: Отягощен (аллергия на: ${allergies.join(", ")}).`);
	} else {
		items.push("Аллергологический анамнез: Со слов пациента не отягощен, аллергии на медикаменты отрицает.");
	}

	// Критические соматические стоп-факторы
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
			profile.pregnancyTrimester === "trimester_2" ? "2-й триместр (плановая санация разрешена)" :
			profile.pregnancyTrimester === "trimester_3" ? "3-й триместр (риск сдавления НПВ)" : "Период лактации";
		criticals.push(`Беременность/Лактация: ${trimLabel}`);
	}

	if (criticals.length > 0) {
		items.push(`Критические клинические факторы: ${criticals.join("; ")}.`);
	}

	// Соматические хронические заболевания
	const chronic: string[] = [];
	if (profile.hasHypertension || profile.hasCardiovascularDisease) chronic.push("Гипертоническая болезнь / ССЗ (контроль АД, предел адреналина 0.04 мг)");
	if (profile.hasDiabetesMellitus) chronic.push(`Сахарный диабет${profile.diabetesType ? ` ${profile.diabetesType} типа` : ""}`);
	if (profile.hasBronchialAsthma) chronic.push("Бронхиальная астма (ингалятор готов к применению)");
	if (profile.hasEpilepsy) chronic.push("Эпилепсия (защита от фотостимуляции)");
	if (profile.hasHepatitis) chronic.push("Вирусный гепатит (СанПиН 3.3686-21)");
	if (profile.hasHiv) chronic.push("ВИЧ-инфекция (СанПиН 3.3686-21)");
	if (profile.customChronicNotes) chronic.push(profile.customChronicNotes);

	if (chronic.length > 0) {
		if (
			chronic.length === 1 &&
			profile.customChronicNotes &&
			(profile.customChronicNotes.toLowerCase().includes("соматически здоров") ||
				profile.customChronicNotes.toLowerCase().includes("норма"))
		) {
			items.push(`Соматический статус: ${profile.customChronicNotes}.`);
		} else {
			items.push(`Сопутствующие соматические заболевания: ${chronic.join(", ")}.`);
		}
	} else {
		items.push("Соматический статус: Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.");
	}

	return items.join("\n");
}

/** Проверяет безопасность запланированной процедуры относительно профиля пациента */
export function checkProcedureSafety(
	procedureName: string,
	profile?: Partial<PatientClinicalSafetyProfile> | null | undefined,
): {
	readonly isAllowed: boolean;
	readonly severity: ClinicalSafetySeverity;
	readonly warnings: readonly string[];
	readonly alternatives: readonly string[];
} {
	if (!profile) {
		return { isAllowed: true, severity: "none", warnings: [], alternatives: [] };
	}

	const pLower = procedureName.toLowerCase();
	evaluatePatientSafetyFlags(profile);
	const warnings: string[] = [];
	const alternatives: string[] = [];
	let isAllowed = true;
	let severity: ClinicalSafetySeverity = "none";

	// 1. Ультразвук при ЭКС
	if (profile.hasPacemakerExs && (pLower.includes("ультразвук") || pLower.includes("уз-") || pLower.includes("скейлинг") || pLower.includes("air-flow") || pLower.includes("чистк"))) {
		isAllowed = false;
		severity = "critical";
		warnings.push("Ультразвуковой скейлинг абсолютно запрещен при наличии электрокардиостимулятора (ЭКС) из-за риска срыва ритма!");
		alternatives.push("Провести профессиональную гигиену ручными кюретами Грейси (Gracey) и полировочными пастами.");
	}

	// 2. Коагуляция при ЭКС
	if (profile.hasPacemakerExs && (pLower.includes("электрокоагуляц") || pLower.includes("коагуляц") || pLower.includes("электронож"))) {
		isAllowed = false;
		severity = "critical";
		warnings.push("Монополярная электрокоагуляция категорически запрещена пациентам с кардиостимулятором!");
		alternatives.push("Использовать лазерный скальпель или механический гемостаз швами и компрессией.");
	}

	// 3. Удаление / Имплантация при Бисфосфонатах
	if (profile.takesBisphosphonates && (pLower.includes("удален") || pLower.includes("экстракц") || pLower.includes("имплант") || pLower.includes("синус-лифтинг"))) {
		isAllowed = false;
		severity = "critical";
		warnings.push("Инвазивная хирургия и дентальная имплантация несут экстремальный риск остеонекроза челюсти (MRONJ/БОНЧ)!");
		alternatives.push("Органосохраняющая эндодонтия без резекции верхушки. При неизбежном удалении — онкоконсилиум и курс антибиотиков.");
	}

	// 4. Хирургия при антикоагулянтах
	if (profile.takesAnticoagulants && (pLower.includes("удален") || pLower.includes("имплант") || pLower.includes("кюретаж") || pLower.includes("синус-лифтинг"))) {
		severity = "critical";
		warnings.push("Прием антикоагулянтов: высокий риск профузного кровотечения. Требуется свежий анализ МНО (INR < 2.5) и местный гемостаз!");
		alternatives.push("Использовать гемостатическую губку с тромбином, транексамовую кислоту 5% и герметичное ушивание раны.");
	}

	// 5. Рентген / КТ в 1 триместре беременности
	if (profile.pregnancyTrimester === "trimester_1" && (pLower.includes("кт") || pLower.includes("клкт") || pLower.includes("панорам") || pLower.includes("оптг"))) {
		isAllowed = false;
		severity = "critical";
		warnings.push("Компьютерная томография (КТ/ОПТГ) в 1-м триместре беременности несет тератогенный риск и запрещена!");
		alternatives.push("Отложить до 2-го триместра либо при острой боли выполнить прицельный снимок на визиографе с двойным свинцовым фартуком.");
	}

	// 6. Эфирные анестетики и аппликационный бензокаин
	if (profile.hasEsterAnestheticsAllergy && (pLower.includes("бензокаин") || pLower.includes("анестезин") || pLower.includes("новокаин") || pLower.includes("дикаин") || pLower.includes("hurricaine") || pLower.includes("dispodent") || (pLower.includes("аппликацион") && (pLower.includes("гель") || pLower.includes("спрей"))))) {
		isAllowed = false;
		severity = "critical";
		warnings.push("Аппликационные гели на основе бензокаина (Hurricaine, Dispodent) и новокаин категорически запрещены при аллергии на эфирные анестетики!");
		alternatives.push("Использовать аппликационный Лидокаин-гель 2–5% (при отсутствии аллергии на лидокаин) либо контактное охлаждение.");
	}

	// 7. Йодсодержащие антисептики и материалы
	if (profile.hasIodineAllergy && (pLower.includes("йод") || pLower.includes("бетадин") || pLower.includes("метапекс") || pLower.includes("альвожил") || pLower.includes("йодинол") || pLower.includes("йодоформ"))) {
		isAllowed = false;
		severity = "critical";
		warnings.push("Препараты йода (Повидон-йод / Бетадин), йодоформные пасты (Metapex) и турунды (Альвожил) абсолютно противопоказаны при аллергии на йод!");
		alternatives.push("Использовать Хлоргексидин 0.05–0.2%, Мирамистин 0.01%, чистый гидроксид кальция (UltraCal XS) без йодоформа.");
	}

	// 8. Вазоконстрикторы при феохромоцитоме
	if (profile.hasPheochromocytoma && (pLower.includes("адреналин") || pLower.includes("эпинефрин") || pLower.includes("1:100") || pLower.includes("1:200") || pLower.includes("ультракаин д-с") || pLower.includes("ретракцион"))) {
		isAllowed = false;
		severity = "critical";
		warnings.push("Анестетики и ретракционные нити с адреналином/эпинефрином абсолютно противопоказаны при феохромоцитоме (угроза смертельного криза)!");
		alternatives.push("Использовать Скандонест 3% (Мепивакаин без вазоконстриктора) и безадреналиновые ретракционные нити.");
	}

	// 9. Вазоконстрикторы при тяжелой гипертонии (3 стадия / криз), тиреотоксикозе или приеме бета-блокаторов
	if (
		(profile.hasSevereHypertensionStage3 || profile.hasThyrotoxicosis || profile.takesBetaBlockers) &&
		(pLower.includes("адреналин") ||
			pLower.includes("эпинефрин") ||
			pLower.includes("1:100") ||
			pLower.includes("1:200") ||
			pLower.includes("ультракаин д-с") ||
			pLower.includes("ультракаин форте") ||
			pLower.includes("убистезин") ||
			pLower.includes("септанест") ||
			(pLower.includes("ретракцион") && pLower.includes("нить")))
	) {
		isAllowed = false;
		severity = "critical";
		warnings.push("Препараты и ретракционные нити с адреналином абсолютно противопоказаны при кризовом АД, тиреотоксикозе или терапии бета-блокаторами!");
		alternatives.push("Препарат выбора: Скандонест 3% (Мепивакаин без вазоконстриктора). Безадреналиновые ретракционные нити.");
	}

	// 10. Аллергия на артикаин
	if (profile.hasArticaineAllergy && (pLower.includes("артикаин") || pLower.includes("ультракаин") || pLower.includes("убистезин") || pLower.includes("септанест"))) {
		isAllowed = false;
		severity = "critical";
		warnings.push("Артикаин (Ультракаин, Убистезин, Септанест) категорически противопоказан из-за подтвержденной аллергии!");
		alternatives.push("Препарат выбора: Скандонест 3% (Мепивакаин) под контролем аллерголога.");
	}

	// 11. Аллергия на мепивакаин
	if (profile.hasMepivacaineAllergy && (pLower.includes("мепивакаин") || pLower.includes("скандонест") || pLower.includes("мепивастезин"))) {
		isAllowed = false;
		severity = "critical";
		warnings.push("Мепивакаин (Скандонест) категорически противопоказан из-за подтвержденной аллергии!");
		alternatives.push("Использовать Артикаин (Ультракаин) при отсутствии аллергии на артикаин и сульфиты.");
	}

	// 12. Аллергия на сульфиты
	if ((profile.hasSulfiteAllergy || profile.hasSulfitesAllergy) && (pLower.includes("ультракаин") || pLower.includes("убистезин") || pLower.includes("септанест") || pLower.includes("адреналин") || pLower.includes("эпинефрин"))) {
		isAllowed = false;
		severity = "critical";
		warnings.push("Анестетики с адреналином содержат сульфиты (метабисульфит) в качестве антиоксиданта и противопоказаны при аллергии на сульфиты!");
		alternatives.push("Препарат выбора: Скандонест 3% (Мепивакаин без сульфитов).");
	}

	return {
		isAllowed,
		severity,
		warnings,
		alternatives,
	};
}


