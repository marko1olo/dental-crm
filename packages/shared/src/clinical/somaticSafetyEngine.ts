/**
 * packages/shared/src/clinical/somaticSafetyEngine.ts
 *
 * Single Canonical Authority for Chairside Somatic Safety Alerts & Clinical Stop-Factors.
 * Mandates: 8e (Doctor Autonomy, 0-click norm), 8i (Ambulatory dental context), 8k (Friction-Killer), 8s (Anti-Bloat).
 */

import {
	type SomaticPregnancyTrimester,
	type SomaticSafetyEvaluation,
	type SomaticSafetyInput,
	type SomaticSeverity,
	type SomaticStopFactor,
	CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	CANONICAL_SOMATIC_NORM_SHORT,
	extractFullAnamnesisText,
	isNegativeAllergyOrSomaticStatement,
} from "./somaticSafetyTypes.js";

export * from "./somaticSafetyTypes.js";


/**
 * Canonical evaluator for chairside somatic safety & dental stop-factors
 */
export function evaluateSomaticSafety(
	input?: SomaticSafetyInput | string | null | undefined,
	allergyTextOverride?: string | null | undefined,
): SomaticSafetyEvaluation {
	const rawText = extractFullAnamnesisText(input);
	const lower = rawText.toLowerCase();

	const structured: SomaticSafetyInput =
		input && typeof input === "object" ? input : {};

	const overrideText = allergyTextOverride?.trim() || "";
	const overrideLower = overrideText.toLowerCase();

	const stopFactors: SomaticStopFactor[] = [];

	// If doctor explicitly confirmed healthy norm and there's no active override text, honor doctor autonomy
	const hasDoctorConfirmedNorm = Boolean(
		structured.isSomaticNormConfirmed &&
			(!overrideText || isNegativeAllergyOrSomaticStatement(overrideText)),
	);

	// -------------------------------------------------------------------------------------------------------
	// 1. СТОП-ФАКТОР 1: Аллергия на местные анестетики (Артикаин, Лидокаин) и антибиотики (пенициллины)
	// -------------------------------------------------------------------------------------------------------
	const detectedAllergens: string[] = [];

	// Local anesthetics
	if (
		structured.hasArticaineAllergy ||
		lower.includes("артикаин") ||
		lower.includes("ультракаин") ||
		lower.includes("септанест") ||
		lower.includes("убистезин") ||
		overrideLower.includes("артикаин") ||
		overrideLower.includes("ультракаин")
	) {
		detectedAllergens.push("Артикаин");
	}
	if (
		structured.hasLidocaineAllergy ||
		lower.includes("лидокаин") ||
		lower.includes("ксилокаин") ||
		overrideLower.includes("лидокаин")
	) {
		detectedAllergens.push("Лидокаин");
	}
	if (
		structured.hasMepivacaineAllergy ||
		lower.includes("мепивакаин") ||
		lower.includes("скандонест") ||
		lower.includes("мепивастезин") ||
		overrideLower.includes("мепивакаин") ||
		overrideLower.includes("скандонест")
	) {
		detectedAllergens.push("Мепивакаин");
	}
	if (
		structured.hasNovocaineAllergy ||
		structured.hasProcaineAllergy ||
		lower.includes("новокаин") ||
		lower.includes("прокаин") ||
		lower.includes("бензокаин") ||
		overrideLower.includes("новокаин")
	) {
		detectedAllergens.push("Новокаин / Эфирные анестетики");
	}

	// Antibiotics (Penicillins)
	if (
		structured.hasPenicillinAllergy ||
		lower.includes("пенициллин") ||
		lower.includes("амоксициллин") ||
		lower.includes("амоксиклав") ||
		lower.includes("аугментин") ||
		lower.includes("флемоксин") ||
		lower.includes("ампициллин") ||
		overrideLower.includes("пенициллин") ||
		overrideLower.includes("амоксиклав")
	) {
		detectedAllergens.push("Пенициллины (Амоксиклав)");
	}

	// Sulfite preservative allergy
	if (
		structured.hasSulfitesAllergy ||
		lower.includes("сульфит") ||
		lower.includes("метабисульфит") ||
		overrideLower.includes("сульфит")
	) {
		detectedAllergens.push("Сульфиты / Консерванты вазоконстрикторов");
	}

	// NSAIDs allergy
	if (
		structured.hasNsaidAllergy ||
		lower.includes("нпвп") ||
		lower.includes("нпвс") ||
		lower.includes("аспирин") ||
		lower.includes("кеторол") ||
		overrideLower.includes("нпвп")
	) {
		detectedAllergens.push("НПВП (Аспирин/Кеторол)");
	}

	// Latex allergy
	if (
		structured.hasLatexAllergy ||
		lower.includes("латекс") ||
		overrideLower.includes("латекс")
	) {
		detectedAllergens.push("Латекс (раббердам/перчатки)");
	}

	// Generic custom allergy string if not negative
	if (
		overrideText &&
		!isNegativeAllergyOrSomaticStatement(overrideText) &&
		detectedAllergens.length === 0
	) {
		detectedAllergens.push(overrideText);
	} else if (
		structured.customAllergyNotes &&
		!isNegativeAllergyOrSomaticStatement(structured.customAllergyNotes) &&
		detectedAllergens.length === 0
	) {
		detectedAllergens.push(structured.customAllergyNotes.trim());
	}

	if (detectedAllergens.length > 0 && !hasDoctorConfirmedNorm) {
		const label = detectedAllergens.join(", ");
		const hasArticaineOrLido =
			detectedAllergens.includes("Артикаин") ||
			detectedAllergens.includes("Лидокаин");
		const hasPenicillin = detectedAllergens.some((a) => a.includes("Пенициллин"));

		const recs: string[] = [];
		if (hasArticaineOrLido) {
			recs.push(
				"Препарат выбора для анестезии: Мепивакаин 3% без вазоконстриктора (Скандонест 3%) либо Лидокаин 2% (при изолированной непереносимости артикаина).",
			);
		}
		if (hasPenicillin) {
			recs.push(
				"Альтернатива для антибиотикопрофилактики: Линкозамиды (Клиндамицин 300 мг) или Макролиды (Азитромицин 500 мг / Кларитромицин).",
			);
		}
		recs.push(
			"Противошоковая укладка в кабинете наготове: Адреналин 0.1%, Преднизолон, Супрастин.",
		);

		stopFactors.push({
			id: "allergy_anesthetics_antibiotics",
			category: "allergy",
			severity: "critical",
			title: "Аллергия на местные анестетики и антибиотики",
			shortBadge: "АЛЛЕРГИЯ",
			fullLabel: `АЛЛЕРГИЯ: ${label} — запрет анестетика/препарата!`,
			detectedItems: detectedAllergens,
			prohibitions: [
				`Категорический запрет на введение выявленного аллергена (${label}).`,
				hasPenicillin
					? "Строгий запрет назначения Амоксиклава, Аугментина, Флемоксина; с осторожностью цефалоспорины (риск перекреста 5-10%)."
					: "Запрет препаратов с перекрестной реактивностью.",
				detectedAllergens.includes("Сульфиты / Консерванты вазоконстрикторов")
					? "Строгий запрет применения растворов анестетиков с вазоконстриктором (адреналином)."
					: "Запрет инъекций без предварительного сбора анамнеза.",
			],
			recommendations: recs,
			anesthesiaGuidance: hasArticaineOrLido
				? "Мепивакаин 3% без вазоконстриктора (Скандонест 3%)"
				: "Индивидуальный подбор анестетика вне аллергенной группы",
			icd10Codes: ["Z88.4", "Z88.0"],
			testId: "visit-focus-allergy-alert",
			actionHint:
				"Исключить причинный анестетик/антибиотик, подготовить противошоковую укладку",
		});
	}

	// -------------------------------------------------------------------------------------------------------
	// 2. СТОП-ФАКТОР 2: Сердечно-сосудистые риски (гипертонический криз в анамнезе, инфаркт < 6 мес)
	// -------------------------------------------------------------------------------------------------------
	const cvdItems: string[] = [];
	const hasCrisis =
		Boolean(structured.hasHypertensiveCrisisHistory) ||
		lower.includes("гипертонический криз") ||
		lower.includes("кризовое течение") ||
		lower.includes("криз в анамнезе");

	const hasRecentInfarct =
		Boolean(structured.hasMyocardialInfarctionRecent) ||
		Boolean(structured.hasRecentInfarction) ||
		lower.includes("инфаркт < 6 мес") ||
		lower.includes("инфаркт миокарда < 6") ||
		lower.includes("свежий инфаркт") ||
		lower.includes("недавний инфаркт") ||
		(lower.includes("инфаркт") &&
			!lower.includes("отрицает") &&
			(lower.includes("< 6") || lower.includes("менее 6")));

	const hasSevereCvd =
		Boolean(structured.hasHypertension) ||
		Boolean(structured.hasCoronaryDisease) ||
		Boolean(structured.hasCardiacArrhythmia) ||
		lower.includes("ишемическая болезнь") ||
		lower.includes("ибс") ||
		lower.includes("стенокардия") ||
		lower.includes("аритмия");

	if (hasCrisis) {
		cvdItems.push("Гипертонический криз в анамнезе");
	}
	if (hasRecentInfarct) {
		cvdItems.push("Инфаркт миокарда (< 6 мес)");
	} else if (lower.includes("инфаркт") && !lower.includes("отрицает")) {
		cvdItems.push("Инфаркт миокарда в анамнезе");
	}
	if (hasSevereCvd && cvdItems.length === 0) {
		cvdItems.push("Артериальная гипертензия / Сердечно-сосудистая патология");
	}

	if (cvdItems.length > 0 && !hasDoctorConfirmedNorm) {
		const isHighAlert = hasCrisis || hasRecentInfarct;
		const cvdTitle = isHighAlert
			? "Сердечно-сосудистый стоп-фактор: запрет адреналина 1:100 000"
			: "Кардиоваскулярный риск: лимит адреналина";

		stopFactors.push({
			id: "cardiovascular_risks",
			category: "cardiovascular",
			severity: "critical",
			title: cvdTitle,
			shortBadge: "ССЗ: СТОП",
			fullLabel: `ССЗ [${cvdItems.join("; ")}]: ЗАПРЕТ АДРЕНАЛИНА 1:100 000!`,
			detectedItems: cvdItems,
			prohibitions: [
				"ЖЕСТКИЙ ЗАПРЕТ НА АДРЕНАЛИН 1:100 000 (Ультракаин Форте, Септанест 1:100k, Брилокаин 1:100k)!",
				hasRecentInfarct
					? "При инфаркте < 6 месяцев: запрет плановых стоматологических операций (только неотложная помощь по острой боли с кардиомониторингом)."
					: "Запрет превышения суммарной дозы адреналина свыше 0.04 мг.",
				"Запрет анестезии при систолическом АД > 160–180 мм рт. ст. до медикаментозной стабилизации давления.",
			],
			recommendations: [
				"Рекомендация: Мепивакаин 3% без вазоконстриктора (Скандонест 3% / Мепивастезин 3%).",
				"При необходимости легкой пролонгации — не более 1-2 карпул Артикаина 1:200 000 (Ультракаин Д-С).",
				"Обязательное измерение артериального давления и пульса у кресла перед инъекцией.",
				"Аспирационная проба перед каждым введением раствора анестетика.",
			],
			anesthesiaGuidance:
				"Мепивакаин 3% без вазоконстриктора (Скандонест 3%) — препарат выбора",
			icd10Codes: ["I10", "I21", "I25"],
			testId: "visit-focus-cvd-alert",
			actionHint:
				"Запрет адреналина 1:100 000! Препарат выбора: Мепивакаин 3% без вазоконстриктора",
		});
	}

	// -------------------------------------------------------------------------------------------------------
	// 3. СТОП-ФАКТОР 3: Антикоагулянты и антиагреганты (Варфарин, Ксарелто, Эликвис, Тромбо АСС)
	// -------------------------------------------------------------------------------------------------------
	const coagItems: string[] = [];
	if (
		structured.takesAnticoagulants ||
		structured.hasAnticoagulantTherapy ||
		lower.includes("варфарин") ||
		lower.includes("ксарелто") ||
		lower.includes("ривароксабан") ||
		lower.includes("эликвис") ||
		lower.includes("апиксабан") ||
		lower.includes("прадакса") ||
		lower.includes("дабигатран") ||
		lower.includes("антикоагулянт")
	) {
		const name =
			structured.anticoagulantName ||
			(lower.includes("варфарин")
				? "Варфарин"
				: lower.includes("ксарелто")
					? "Ксарелто (Ривароксабан)"
					: lower.includes("эликвис")
						? "Эликвис (Апиксабан)"
						: lower.includes("прадакса")
							? "Прадакса (Дабигатран)"
							: "Антикоагулянтная терапия");
		coagItems.push(name);
	}

	if (
		structured.takesAntiplatelets ||
		lower.includes("тромбо асс") ||
		lower.includes("тромбоасс") ||
		lower.includes("аспирин кардио") ||
		lower.includes("плавикс") ||
		lower.includes("клопидогрел") ||
		lower.includes("брилинта") ||
		lower.includes("антиагрегант") ||
		lower.includes("дезагрегант")
	) {
		const name = lower.includes("тромбо асс") || lower.includes("тромбоасс")
			? "Тромбо АСС"
			: lower.includes("аспирин кардио")
				? "Аспирин Кардио"
				: lower.includes("плавикс")
					? "Плавикс (Клопидогрел)"
					: "Антиагрегантная терапия";
		if (!coagItems.includes(name)) {
			coagItems.push(name);
		}
	}

	if (coagItems.length > 0 && !hasDoctorConfirmedNorm) {
		stopFactors.push({
			id: "anticoagulants_antiplatelets",
			category: "anticoagulants",
			severity: "critical",
			title: "Прием антикоагулянтов / антиагрегантов: риск профузного кровотечения",
			shortBadge: "АК / КРОВОТЕЧЕНИЕ",
			fullLabel: `АНТИКОАГУЛЯНТЫ (${coagItems.join(", ")}): РИСК КРОВОТЕЧЕНИЯ`,
			detectedItems: coagItems,
			prohibitions: [
				"Запрет самовольной отмены антикоагулянтов/антиагрегантов без согласования с кардиологом (риск фатальной тромбоэмболии!).",
				"Запрет назначения классических НПВП (Аспирин, Кеторол, Диклофенак) для послеоперационного обезболивания.",
				"Избегать глубоких проводниковых мандибулярных инъекций без строгой необходимости (риск компрессионной гематомы глотки).",
			],
			recommendations: [
				"Риск профузного кровотечения при удалении зубов и хирургических операциях!",
				"Рекомендация по местному гемостазу: гемостатическая губка, швы (коллагеновый конус с тромбином, плотное крестообразное ушивание лунки).",
				"Орошение раны 5% раствором Транексамовой кислоты, давящий марлевый тампон.",
				"Контроль МНО (INR) не старше 24–48 ч (допустимо при INR <= 2.5–3.0). Наблюдение в кресле не менее 30–40 минут после вмешательства.",
			],
			anesthesiaGuidance:
				"Инфильтрационная анестезия предпочтительнее глубокой проводниковой",
			icd10Codes: ["Z92.1", "D68.3"],
			testId: "visit-focus-anticoagulant-alert",
			actionHint:
				"Риск кровотечения! Местный гемостаз: гемостатическая губка, швы, наблюдение 30-40 мин",
		});
	}

	// -------------------------------------------------------------------------------------------------------
	// 4. СТОП-ФАКТОР 4: Бисфосфонаты (Зомета, Фосамакс -> риск остеонекроза челюсти MRONJ / БОНЧ)
	// -------------------------------------------------------------------------------------------------------
	const bisItems: string[] = [];
	if (
		structured.takesBisphosphonates ||
		structured.hasBisphosphonateTherapy ||
		lower.includes("бисфосфонат") ||
		lower.includes("зомета") ||
		lower.includes("фосамакс") ||
		lower.includes("акласта") ||
		lower.includes("золедронат") ||
		lower.includes("золедроновая") ||
		lower.includes("алендронат") ||
		lower.includes("бонвива") ||
		lower.includes("ибандронат") ||
		lower.includes("пролиа") ||
		lower.includes("деносумаб") ||
		lower.includes("эксджива") ||
		lower.includes("mronj") ||
		lower.includes("бонч") ||
		lower.includes("остеонекроз")
	) {
		const name =
			structured.bisphosphonateName ||
			(lower.includes("зомета")
				? "Зомета (Золедронат)"
				: lower.includes("фосамакс")
					? "Фосамакс (Алендронат)"
					: lower.includes("акласта")
						? "Акласта"
						: lower.includes("бонвива")
							? "Бонвива"
							: lower.includes("пролиа") || lower.includes("деносумаб")
								? "Пролиа (Деносумаб)"
								: "Бисфосфонаты / Антирезорбтивная терапия");
		bisItems.push(name);
	}

	if (bisItems.length > 0 && !hasDoctorConfirmedNorm) {
		stopFactors.push({
			id: "bisphosphonates_mronj",
			category: "bisphosphonates",
			severity: "critical",
			title: "Бисфосфонаты: критический риск остеонекроза челюсти (MRONJ / БОНЧ)",
			shortBadge: "БОНЧ / ОСТЕОНЕКРОЗ",
			fullLabel: `БИСФОСФОНАТЫ (${bisItems.join(", ")}): РИСК ОСТЕОНЕКРОЗА ЧЕЛЮСТИ (MRONJ)`,
			detectedItems: bisItems,
			prohibitions: [
				"КРИТИЧЕСКИЙ РИСК БИСФОСФОНАТНОГО ОСТЕОНЕКРОЗА ЧЕЛЮСТИ (MRONJ / БОНЧ) при удалении зубов и имплантации!",
				"ЖЕСТКИЙ ЗАПРЕТ на плановое удаление зубов, дентальную имплантацию, синус-лифтинг и костную пластику без онкостоматологического консилиума.",
				"Запрет агрессивного кюретажа кости и травматичной отслойки надкостницы.",
			],
			recommendations: [
				"Максимально органосохраняющая тактика: эндодонтическое лечение корней без резекции верхушки корня.",
				"При неизбежном удалении: атравматичная экстракция (периотом/люксатор), сглаживание острых костных краев альвеолы фрезой.",
				"Первичное ушивание лунки наглухо без натяжения лоскута.",
				"Обязательная антибиотикопрофилактика (Амоксиклав + Метронидазол, либо Клиндамицин при аллергии) курсом 7–10 дней.",
				"Обязательное информированное согласие с предупреждением о риске остеонекроза.",
			],
			anesthesiaGuidance:
				"Анестезия без компрессионного введения под надкостницу",
			icd10Codes: ["M87.1", "T98.3"],
			testId: "visit-focus-bisphosphonates-alert",
			actionHint:
				"Критический риск остеонекроза (БОНЧ)! Запрет планового удаления/имплантации без онкоконсилиума",
		});
	}

	// -------------------------------------------------------------------------------------------------------
	// 5. СТОП-ФАКТОР 5: Сахарный диабет декомпенсированный / Беременность (щадящая анестезия)
	// -------------------------------------------------------------------------------------------------------
	const diabetesPregItems: string[] = [];
	const isDiabetesDecomp =
		Boolean(structured.isDiabetesDecompensated) ||
		lower.includes("декомпенсирован") ||
		lower.includes("декомпенсация") ||
		lower.includes("некомпенсирован");

	const hasDiabetes =
		Boolean(structured.hasDiabetesMellitus) ||
		Boolean(structured.isDiabetesDecompensated) ||
		isDiabetesDecomp ||
		lower.includes("сахарный диабет") ||
		lower.includes("диабет 1 типа") ||
		lower.includes("диабет 2 типа") ||
		(lower.includes("диабет") && !lower.includes("отрицает"));

	if (hasDiabetes) {
		const typeStr = isDiabetesDecomp
			? "Сахарный диабет (ДЕКОМПЕНСИРОВАННЫЙ)"
			: structured.diabetesType || "Сахарный диабет";
		diabetesPregItems.push(typeStr);
	}

	// Pregnancy / lactation
	let pregTrimester: SomaticPregnancyTrimester = "none";
	const rawPreg =
		structured.pregnancyTrimester ||
		(lower.includes("trimester_1") || lower.includes("1 триместр") || lower.includes("первый триместр")
			? "trimester_1"
			: lower.includes("trimester_2") || lower.includes("2 триместр") || lower.includes("второй триместр")
				? "trimester_2"
				: lower.includes("trimester_3") || lower.includes("3 триместр") || lower.includes("третий триместр")
					? "trimester_3"
					: lower.includes("лактация") || lower.includes("грудное вскармливание") || lower.includes("гв")
						? "lactation"
						: lower.includes("беременн")
							? "trimester_2"
							: "none");

	if (rawPreg && rawPreg !== "none") {
		pregTrimester = rawPreg as SomaticPregnancyTrimester;
		const trimesterText =
			pregTrimester === "trimester_1"
				? "Беременность (1 триместр: 1–12 нед)"
				: pregTrimester === "trimester_2"
					? "Беременность (2 триместр: 13–27 нед)"
					: pregTrimester === "trimester_3"
						? "Беременность (3 триместр: 28–40 нед)"
						: "Период лактации / ГВ";
		diabetesPregItems.push(trimesterText);
	}

	if (diabetesPregItems.length > 0 && !hasDoctorConfirmedNorm) {
		const isCritical =
			isDiabetesDecomp ||
			pregTrimester === "trimester_1" ||
			pregTrimester === "trimester_3";

		const recs: string[] = [];
		const prohibitions: string[] = [
			"ЖЕСТКИЙ ЗАПРЕТ НА АДРЕНАЛИН 1:100 000 (Ультракаин Форте, Септанест 1:100k)!",
		];

		if (hasDiabetes) {
			prohibitions.push(
				"Запрет приема пациента натощак (риск гипогликемической комы у кресла!).",
			);
			recs.push(
				"Прием строго в утренние часы через 1–1.5 ч после еды и базовой дозы инсулина/метформина.",
			);
			recs.push("Быстрая глюкоза (сок, сахар, 40% глюкоза) в кабинете наготове.");
			recs.push(
				"Атравматичная техника, антисептический протокол и профилактика альвеолита.",
			);
		}

		if (pregTrimester !== "none") {
			if (pregTrimester === "trimester_1") {
				prohibitions.push(
					"1 триместр: период органогенеза. Запрет планового лечения и рентгена без витальных показаний. Помощь только по острой боли!",
				);
			} else if (pregTrimester === "trimester_3") {
				prohibitions.push(
					"3 триместр: запрет горизонтального положения на спине (риск синдрома сдавления нижней полой вены / Supine Hypotensive Syndrome).",
				);
				recs.push(
					"Положение кресла: полусидя (угол >= 45°), поворот на левый бок 15° (валик под правое бедро). Короткие сеансы (<30 мин).",
				);
			} else if (pregTrimester === "trimester_2") {
				recs.push(
					"2 триместр: оптимальное безопасное окно для проведения плановой санации полости рта.",
				);
			}
		}

		recs.push(
			"Щадящая анестезия: Артикаин 1:200 000 (Ультракаин Д-С) в минимальной дозировке (высокое связывание с белками 95%, не преодолевает плацентарный барьер в терапевтических дозах) либо Мепивакаин 3% без вазоконстриктора.",
		);

		stopFactors.push({
			id: "diabetes_decompensated_or_pregnancy",
			category: "diabetes_pregnancy",
			severity: isCritical ? "critical" : "warning",
			title:
				pregTrimester !== "none"
					? `Беременность (${pregTrimester === "trimester_1" ? "1 триместр" : pregTrimester === "trimester_3" ? "3 триместр" : "2 триместр"}) / Щадящая анестезия`
					: "Сахарный диабет / Щадящий протокол",
			shortBadge: pregTrimester !== "none" ? "БЕРЕМЕННОСТЬ" : "ДИАБЕТ",
			fullLabel: `${diabetesPregItems.join(" + ")}: ЩАДЯЩАЯ АНЕСТЕЗИЯ (ЗАПРЕТ 1:100 000)`,
			detectedItems: diabetesPregItems,
			prohibitions,
			recommendations: recs,
			anesthesiaGuidance:
				"Артикаин 1:200 000 (Ультракаин Д-С) минимально, либо Мепивакаин 3% без вазоконстриктора",
			icd10Codes: ["E10", "E11", "Z33"],
			testId:
				pregTrimester !== "none"
					? "visit-focus-pregnancy-alert"
					: "visit-focus-diabetes-alert",
			actionHint:
				"Щадящая анестезия (Артикаин 1:200 000 или Мепивакаин 3%), запрет адреналина 1:100 000",
		});
	}

	// -------------------------------------------------------------------------------------------------------
	// ДОПОЛНИТЕЛЬНЫЕ СТОМАТОЛОГИЧЕСКИЕ РИСКИ (ЭКС, Астма, Эпилепсия)
	// -------------------------------------------------------------------------------------------------------
	if (
		(structured.hasPacemakerExs ||
			lower.includes("кардиостимулятор") ||
			lower.includes("экс") ||
			lower.includes("пейсмейкер")) &&
		!hasDoctorConfirmedNorm
	) {
		stopFactors.push({
			id: "pacemaker_exs",
			category: "pacemaker",
			severity: "warning",
			title: "ЭКС (Имплантированный кардиостимулятор): абсолютный запрет УЗ-аппаратов",
			shortBadge: "ЭКС",
			fullLabel: "Кардиостимулятор (ЭКС): ЗАПРЕТ УЗ-скейлера и электрокоагулятора!",
			detectedItems: ["Имплантированный кардиостимулятор (ЭКС / ИКД)"],
			prohibitions: [
				"Абсолютный запрет использования ультразвуковых пьезо- и магнитострикционных скейлеров.",
				"Абсолютный запрет монополярной электрокоагуляции и неэкранированных апекслокаторов.",
			],
			recommendations: [
				"Профессиональная гигиена: строго ручной инструментальный скейлинг кюретами Грейси (Gracey).",
				"Эндодонтия: рентгенологический контроль рабочей длины зуба.",
				"Гемостаз: механический (губка, швы) или биполярный коагулятор с заземлением.",
			],
			anesthesiaGuidance: "Мепивакаин 3% без вазоконстриктора (Скандонест 3%)",
			icd10Codes: ["Z95.0"],
			testId: "visit-focus-pacemaker-alert",
			actionHint:
				"Запрет УЗ-скейлера и электрокоагулятора! Ручной скейлинг кюретами Грейси",
		});
	}

	if (
		(structured.hasBronchialAsthma ||
			structured.hasAsthma ||
			lower.includes("астма") ||
			lower.includes("бронхиальная астма")) &&
		!hasDoctorConfirmedNorm
	) {
		stopFactors.push({
			id: "bronchial_asthma",
			category: "other",
			severity: "warning",
			title: "Бронхиальная астма: риск бронхоспазма, ингалятор наготове",
			shortBadge: "АСТМА",
			fullLabel: "Бронхиальная астма: риск бронхоспазма, ингалятор наготове",
			detectedItems: ["Бронхиальная астма"],
			prohibitions: [
				"Запрет назначения Аспирина и классических НПВП при аспириновой триаде.",
				"Запрет анестетиков с консервантами-сульфитами.",
			],
			recommendations: [
				"Индивидуальный ингалятор пациента (Сальбутамол, Беродуал) должен лежать на столике врача.",
				"Использование коффердама для защиты от аэрозолей и пахучих мономеров.",
			],
			anesthesiaGuidance:
				"Мепивакаин 3% без сульфитов и адреналина (Скандонест 3%)",
			icd10Codes: ["J45"],
			testId: "visit-focus-asthma-alert",
			actionHint:
				"Проверить ингалятор сальбутамола у кресла, избегать аспирина и сульфитов",
		});
	}

	if (
		(structured.hasEpilepsy ||
			lower.includes("эпилепсия") ||
			lower.includes("судорожный синдром")) &&
		!hasDoctorConfirmedNorm
	) {
		stopFactors.push({
			id: "epilepsy",
			category: "other",
			severity: "warning",
			title: "Эпилепсия: защита от фотостимуляции, противосудорожная готовность",
			shortBadge: "ЭПИЛЕПСИЯ",
			fullLabel: "Эпилепсия: противосудорожная готовность, защита от световых триггеров",
			detectedItems: ["Эпилепсия"],
			prohibitions: [
				"Запрет направления яркого рефлектора и фотополимеризатора прямо в глаза.",
				"Избегать резких стрессовых раздражителей.",
			],
			recommendations: [
				"Защитные темные очки пациенту на протяжении всего приема.",
				"Готовность роторасширителя и противосудорожной укладки.",
			],
			anesthesiaGuidance:
				"Артикаин 1:200 000 или Мепивакаин 3% с седацией",
			icd10Codes: ["G40"],
			testId: "visit-focus-epilepsy-alert",
			actionHint:
				"Защитные очки при полимеризации, противосудорожная готовность",
		});
	}

	// -------------------------------------------------------------------------------------------------------
	// ОЦЕНКА РЕЗУЛЬТАТА: Норма vs Стоп-Факторы
	// -------------------------------------------------------------------------------------------------------
	const isHealthyNorm = stopFactors.length === 0;
	const criticalStopFactors = stopFactors.filter((f) => f.severity === "critical");
	const warningStopFactors = stopFactors.filter((f) => f.severity === "warning");
	const hasCriticalStop = criticalStopFactors.length > 0;
	const hasWarningStop = warningStopFactors.length > 0;

	const firstStop = stopFactors[0];
	const primaryAlertBadge =
		isHealthyNorm || !firstStop
			? {
					id: "somatic-norm",
					shortLabel: "Норма",
					fullLabel: CANONICAL_SOMATIC_NORM_SHORT,
					title:
						"Соматический статус: норма (1-клик). Противопоказаний к анестезии и вмешательствам нет.",
					severity: "healthy" as const,
					testId: "btn-somatic-norm-one-click",
				}
			: {
					id: firstStop.id,
					shortLabel:
						stopFactors.length > 1
							? `[СТОП: ${stopFactors.length}]`
							: firstStop.shortBadge,
					fullLabel:
						stopFactors.length > 1
							? `СТОП-ФАКТОРЫ (${stopFactors.length}): ${stopFactors.map((s) => s.shortBadge).join(", ")}`
							: firstStop.fullLabel,
					title: firstStop.title,
					severity: (hasCriticalStop ? "critical" : "warning") as SomaticSeverity,
					testId: firstStop.testId,
				};

	// Badges array for backward-compatibility with UI renderers
	const badges = isHealthyNorm
		? [
				{
					id: "somatic-norm",
					testId: "visit-somatic-norm-badge",
					shortLabel: "Норма",
					fullLabel: CANONICAL_SOMATIC_NORM_SHORT,
					title: "Соматический статус: норма (1-клик)",
					severity: "healthy" as const,
					actionHint: "Патологий не выявлено. Врач правит только патологию.",
				},
			]
		: stopFactors.map((f) => ({
				id: f.id,
				testId: f.testId,
				shortLabel: f.shortBadge,
				fullLabel: f.fullLabel,
				title: f.title,
				severity: f.severity,
				actionHint: f.actionHint,
			}));

	// Form 043/u snippet
	const diary043uSnippet = isHealthyNorm
		? CANONICAL_SOMATIC_HEALTHY_NORM_TEXT
		: `[СОМАТИЧЕСКИЕ СТОП-ФАКТОРЫ: ${stopFactors.map((s) => s.title).join("; ")}]\n` +
			stopFactors
				.map((s) => {
					const items = s.detectedItems.length > 0 ? ` (${s.detectedItems.join(", ")})` : "";
					return `- ${s.title}${items}: ЗАПРЕТ: ${s.prohibitions.join(" ")} РЕКОМЕНДАЦИЯ: ${s.recommendations.join(" ")}`;
				})
				.join("\n");

	// Chairside guidance list
	const chairsideGuidanceList = stopFactors.map((s) => ({
		title: s.title,
		category: s.category,
		severity: s.severity,
		prohibitions: s.prohibitions,
		recommendations: s.recommendations,
		anesthesiaGuidance: s.anesthesiaGuidance,
	}));

	return {
		isHealthyNorm,
		hasCriticalStop,
		hasWarningStop,
		stopFactors,
		criticalStopFactors,
		warningStopFactors,
		primaryAlertBadge,
		badges,
		diary043uSnippet,
		chairsideGuidanceList,
	};
}
