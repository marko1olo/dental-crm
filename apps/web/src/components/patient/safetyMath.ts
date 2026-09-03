/**
 * safetyMath.ts — Клинический двигатель безопасности пациента, аллергостатуса и критических стоп-факторов.
 *
 * Соответствует клиническим рекомендациям Стоматологической Ассоциации России (СтАР),
 * Приказам Минздрава РФ № 804н, № 203н и СанПиН 3.3686-21.
 *
 * Охватывает критические клинические стоп-факторы:
 * 1. Острая аллергия на анестетики (Лидокаин, Артикаин, Мепивакаин, метабисульфиты, анафилаксия).
 * 2. Имплантированный кардиостимулятор / ЭКС (Абсолютный запрет УЗ-скейлинга и монополярной электрокоагуляции).
 * 3. Прием антикоагулянтов / дезагрегантов (Варфарин, Ксарелто, Эликвис, Прадакса, Плавикс) — риск кровотечения.
 * 4. Бисфосфонатная и антирезорбтивная терапия (Золедронат, Акласта, Бонвива, Пролиа) — риск остеонекроза челюсти (MRONJ/БОНЧ).
 * 5. Беременность по триместрам (1-й триместр: органогенез, запрет адреналина и КТ; 2-й триместр: безопасное окно; 3-й: синдром НПВ) и лактация.
 * 6. Хронические соматические заболевания (Сахарный диабет, Гипертония, Астма, Эпилепсия, Гепатит B/C, ВИЧ, аллергия на латекс и пенициллины).
 */

import {
	type AnesthesiaDrugKey,
	type AutopilotResolutionResult,
	type PatientMrdCalculation,
	type SomaticRiskProfile,
	calculatePatientMrd,
	resolveAutopilotAnesthesia,
} from "../visit/anesthesiaCalculatorEngine";

export type ClinicalSafetySeverity = "critical" | "high" | "moderate" | "info" | "none";

export type ClinicalSafetyCategory =
	| "anesthesia_allergy"
	| "pacemaker_cardio"
	| "anticoagulants"
	| "bisphosphonates"
	| "pregnancy"
	| "chronic_somatic"
	| "general_allergy";

export type PregnancyTrimester = "none" | "trimester_1" | "trimester_2" | "trimester_3" | "lactation";

export interface ClinicalSafetyItemDefinition {
	readonly id: string;
	readonly category: ClinicalSafetyCategory;
	readonly severity: ClinicalSafetySeverity;
	readonly shortBadge: string;
	readonly titleRu: string;
	readonly fullDescription: string;
	readonly forbiddenProcedures: readonly string[];
	readonly mandatoryPrecautions: readonly string[];
	readonly recommendedAnesthesiaNotes?: string | undefined;
	readonly icd10Codes?: readonly string[] | undefined;
	readonly keywords: readonly string[];
}

/** Профиль безопасности пациента, сохраняемый в базе и анкете здоровья */
export interface PatientClinicalSafetyProfile {
	// 1. Аллергии на анестетики и консерванты
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasMepivacaineAllergy?: boolean | undefined;
	readonly hasEsterAnestheticsAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasIodineAllergy?: boolean | undefined;
	readonly hasAnaphylaxisHistory?: boolean | undefined;

	// 2. ЭКС / Кардиостимулятор & Кардиология
	readonly hasPacemakerExs?: boolean | undefined;
	readonly hasCardiovascularDisease?: boolean | undefined;
	readonly hasHypertension?: boolean | undefined;
	readonly hasSevereHypertensionStage3?: boolean | undefined;
	readonly hasIhd?: boolean | undefined;
	readonly hasArrhythmia?: boolean | undefined;
	readonly takesBetaBlockers?: boolean | undefined;
	readonly hasPheochromocytoma?: boolean | undefined;

	// 3. Гематология & Антикоагулянты
	readonly takesAnticoagulants?: boolean | undefined;
	readonly anticoagulantName?: string | undefined; // Варфарин, Ксарелто, Эликвис, Тромбо АСС и т.д.
	readonly lastInrValue?: number | undefined; // Значение МНО (INR)

	// 4. Бисфосфонаты & Остеонекроз (MRONJ)
	readonly takesBisphosphonates?: boolean | undefined;
	readonly bisphosphonateName?: string | undefined; // Акласта, Зомета, Фосамакс, Пролиа

	// 5. Беременность и лактация
	readonly pregnancyTrimester: PregnancyTrimester;
	readonly gestationalWeeks?: number | undefined;

	// 6. Хронические заболевания (Соматический статус)
	readonly hasDiabetesMellitus?: boolean | undefined;
	readonly diabetesType?: "1" | "2" | "unknown" | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly hasEpilepsy?: boolean | undefined;
	readonly hasHepatitis?: boolean | undefined;
	readonly hasHiv?: boolean | undefined;
	readonly hasThyroidDisease?: boolean | undefined;
	readonly hasThyrotoxicosis?: boolean | undefined;
	readonly hasPenicillinAllergy?: boolean | undefined;
	readonly hasLatexAllergy?: boolean | undefined;

	// Свободные примечания
	readonly customAllergyNotes?: string | undefined;
	readonly customChronicNotes?: string | undefined;
	readonly currentMedicationsList?: string | undefined;
	readonly lastUpdated?: string | undefined;
}

/** Каталог определений стоп-факторов и клинических протоколов */
export const CLINICAL_SAFETY_CATALOG: readonly ClinicalSafetyItemDefinition[] = [
	{
		id: "pacemaker_exs",
		category: "pacemaker_cardio",
		severity: "critical",
		shortBadge: "⛔ ЭКС: ЗАПРЕТ УЗ / ЭЛЕКТРОКОАГУЛЯЦИИ",
		titleRu: "Имплантированный электрокардиостимулятор (ЭКС / ИКД)",
		fullDescription:
			"У пациента установлен имплантированный электрокардиостимулятор или кардиовертер-дефибриллятор. Электромагнитные помехи (EMI) от ультразвуковых генераторов и электрохирургических аппаратов могут нарушить ритмовождение и вызвать фатальную аритмию (остановка сердца, фибрилляция желудочков).",
		forbiddenProcedures: [
			"Ультразвуковой скейлинг (пьезоэлектрические и магнитострикционные насадки)",
			"Монополярная электрокоагуляция и радиоволновой скальпель",
			"Неэкранированные электронные апекслокаторы",
			"Магнитно-индукционные физиотерапевтические приборы",
		],
		mandatoryPrecautions: [
			"Профессиональная гигиена — строго ручной скейлинг кюретами Грейси (Gracey)",
			"Эндодонтия — рентгенологический контроль рабочей длины зуба",
			"Гемостаз — механический (компрессия, швы, гемостатическая губка) или биполярный коагулятор с заземлением",
		],
		recommendedAnesthesiaNotes: "Скандонест 3% (Мепивакаин без адреналина) или Ультракаин Д-С 1:200 000 с контролем АД и ЭКГ.",
		icd10Codes: ["Z95.0"],
		keywords: ["кардиостимулятор", "экс", "икд", "пейсмейкер", "pacemaker", "водитель ритма", "z95.0"],
	},
	{
		id: "bisphosphonates_mronj",
		category: "bisphosphonates",
		severity: "critical",
		shortBadge: "⛔ БИСФОСФОНАТЫ: РИСК ОСТЕОНЕКРОЗА (MRONJ)",
		titleRu: "Бисфосфонатная терапия / Антирезорбтивные препараты",
		fullDescription:
			"Пациент получает или получал бисфосфонаты (Золедроновая кислота, Акласта, Зомета, Фосамакс/Алендронат, Бонвива) либо деносумаб (Пролиа, Эксджива). Экстремальный риск развития медикаментозного остеонекроза челюстей (MRONJ / БОНЧ) после любых хирургических манипуляций, удаления зубов или травмы надкостницы.",
		forbiddenProcedures: [
			"Плановое удаление зубов без онкостоматологического консилиума",
			"Дентальная имплантация и костная пластика (синус-лифтинг, НКР)",
			"Хирургическое удлинение коронки зуба с резекцией кости",
			"Травматичный кюретаж пародонтальных карманов с отслойкой лоскута",
		],
		mandatoryPrecautions: [
			"Максимально органосохраняющая тактика: эндодонтическое лечение без резекции верхушки корня",
			"При неизбежном удалении: атравматичная экстракция, сглаживание острых костных краев, ушивание наглухо, антибиотикопрофилактика (Амоксиклав + Метронидазол) 7–10 дней",
			"Обязательное информированное согласие с предупреждением о риске остеонекроза",
		],
		recommendedAnesthesiaNotes: "Местная анестезия без агрессивной интралигаментарной компрессии надкостницы.",
		icd10Codes: ["M87.1", "T98.3"],
		keywords: ["бисфосфонат", "акласта", "зомета", "золедронат", "фосамакс", "алендронат", "бонвива", "пролиа", "деносумаб", "остеонекроз", "mronj", "бонч"],
	},
	{
		id: "anticoagulants_bleeding",
		category: "anticoagulants",
		severity: "critical",
		shortBadge: "⚠️ АНТИКОАГУЛЯНТЫ: РИСК КРОВОТЕЧЕНИЯ",
		titleRu: "Прием антикоагулянтов / Антиагрегантная терапия",
		fullDescription:
			"Пациент принимает препараты прямого или непрямого антикоагулянтного действия (Варфарин, Ксарелто/Ривароксабан, Эликвис/Апиксабан, Прадакса/Дабигатран) либо двойную антиагрегантную терапию (Плавикс/Клопидогрел + Тромбо АСС). Высокий риск профузного, труднокупируемого кровотечения.",
		forbiddenProcedures: [
			"Плановая амбулаторная хирургия при МНО (INR) > 2.5–3.0 без согласования с кардиологом",
			"Самовольная отмена антикоагулянтов без «мост-терапии» низкомолекулярными гепаринами (риск тромбоэмболии/инсульта!)",
			"Назначение НПВС (Аспирин, Кеторол) в качестве анальгетика после лечения",
		],
		mandatoryPrecautions: [
			"Контроль анализа крови на МНО (INR) давностью не более 24–48 часов до хирургического вмешательства",
			"Местный хирургический гемостаз: гемостатическая губка с тромбином, коллагеновый конус, ушивание лунки крестообразным швом",
			"Ирригация операционной раны раствором Транексамовой кислоты 5%",
			"Контрольное наблюдение в клинике не менее 30-40 минут после завершения вмешательства",
		],
		recommendedAnesthesiaNotes: "Инфильтрационная анестезия предпочтительнее глубокой проводниковой мандибулярной (риск гематомы дна полости рта и крыловидно-челюстного пространства).",
		icd10Codes: ["Z92.1", "D68.3"],
		keywords: ["варфарин", "ксарелто", "ривароксабан", "эликвис", "апиксабан", "прадакса", "дабигатран", "плавикс", "клопидогрел", "тромбо асс", "аспирин кардио", "антикоагулянт", "мно", "inr"],
	},
	{
		id: "allergy_articaine",
		category: "anesthesia_allergy",
		severity: "critical",
		shortBadge: "⛔ АЛЛЕРГИЯ: АРТИКАИН (УЛЬТРАКАИН / СЕПТАНЕСТ)",
		titleRu: "Острая аллергия на Артикаин (Ультракаин, Септанест, Убистезин)",
		fullDescription:
			"У пациента подтвержденная гиперчувствительность или анафилактоидная реакция на артикаин. Абсолютно противопоказано применение любых артикаин-содержащих растворов.",
		forbiddenProcedures: [
			"Инъекции Артикаина 4% (Ультракаин Д-С, Ультракаин Форте, Септанест, Убистезин, Брилокаин)",
			"Использование комбинированных препаратов на основе артикаина",
		],
		mandatoryPrecautions: [
			"Яркая маркировка титульного листа амбулаторной карты 043/у",
			"Выбор альтернативной группы анестетика (Скандонест 3% / Мепивакаин без вазоконстриктора)",
		],
		recommendedAnesthesiaNotes: "Препарат выбора: Скандонест 3% (Мепивакаин) или Лидокаин 2% (при отсутствии перекрестной аллергии).",
		icd10Codes: ["Z88.4", "T88.6"],
		keywords: ["артикаин", "ультракаин", "септанест", "убистезин", "брилокаин", "аллергия на артикаин", "аллергия на ультракаин"],
	},
	{
		id: "allergy_lidocaine",
		category: "anesthesia_allergy",
		severity: "critical",
		shortBadge: "⛔ АЛЛЕРГИЯ: ЛИДОКАИН / СПРЕИ",
		titleRu: "Острая аллергия на Лидокаин (включая аэрозоли)",
		fullDescription:
			"У пациента аллергическая непереносимость Лидокаина. Противопоказаны как инъекционные формы, так и аппликационные спреи и гели на основе лидокаина (Динакаин, Лидокаин-спрей, Камистад).",
		forbiddenProcedures: [
			"Инъекции Лидокаина 2% / 10%",
			"Аппликационная анестезия спреем/гелем Лидокаина 10%",
		],
		mandatoryPrecautions: [
			"Использование аппликационных гелей на основе Бензокаина (Hurricaine, Dispodent) или предварительное охлаждение",
		],
		recommendedAnesthesiaNotes: "Препарат выбора: Артикаин 4% (Ультракаин Д-С) или Скандонест 3% (Мепивакаин).",
		icd10Codes: ["Z88.4"],
		keywords: ["лидокаин", "ксилокаин", "аллергия на лидокаин", "лидокаин-спрей"],
	},
	{
		id: "allergy_mepivacaine",
		category: "anesthesia_allergy",
		severity: "critical",
		shortBadge: "⛔ АЛЛЕРГИЯ: МЕПИВАКАИН (СКАНДОНЕСТ)",
		titleRu: "Острая аллергия на Мепивакаин (Скандонест, Мепивастезин)",
		fullDescription:
			"Аллергическая непереносимость Мепивакаина. Запрещено использование Скандонеста 3% и Мепивастезина.",
		forbiddenProcedures: [
			"Инъекции Мепивакаина (Скандонест 3%, Мепивастезин 3%, Мепивакаин)",
		],
		mandatoryPrecautions: [
			"При необходимости анестетика без адреналина применить Лидокаин 2% без вазоконстриктора",
		],
		recommendedAnesthesiaNotes: "Ультракаин Д-С (Артикаин 1:200 000) при отсутствии аллергии на артикаин.",
		icd10Codes: ["Z88.4"],
		keywords: ["мепивакаин", "скандонест", "мепивастезин", "изокаин"],
	},
	{
		id: "allergy_ester_anesthetics",
		category: "anesthesia_allergy",
		severity: "critical",
		shortBadge: "⛔ АЛЛЕРГИЯ: ЭФИРНЫЕ АНЕСТЕТИКИ (НОВОКАИН / АНЕСТЕЗИН / БЕНЗОКАИН)",
		titleRu: "Аллергия на эфирные анестетики (Новокаин, Прокаин, Бензокаин, Дикаин)",
		fullDescription:
			"Истинная IgE-гиперчувствительность к сложным эфирам парааминобензойной кислоты (ПАБК). Противопоказаны инъекции новокаина/прокаина, дикаина/тетракаина и аппликационные гели на основе бензокаина/анестезина (Hurricaine, Dispodent, Topex).",
		forbiddenProcedures: [
			"Инъекции Новокаина (Прокаина) и Дикаина (Тетракаина)",
			"Аппликационная анестезия гелями и спреями на основе Бензокаина (Hurricaine, Dispodent, Topex, Дентинокс)",
		],
		mandatoryPrecautions: [
			"Применять современные амидные анестетики (Артикаин 4%, Мепивакаин 3%, Лидокаин 2%) при отсутствии индивидуальной непереносимости",
			"Аппликационное обезболивание выполнять Лидокаин-гелем 2–5% или контактным охлаждением",
		],
		recommendedAnesthesiaNotes: "Препараты выбора: амидные анестетики (Артикаин 4% / Ультракаин Д-С, Мепивакаин 3% / Скандонест, Лидокаин 2%).",
		icd10Codes: ["Z88.4", "T88.6"],
		keywords: ["новокаин", "прокаин", "дикаин", "тетракаин", "анестезин", "бензокаин", "hurricaine", "dispodent", "аллергия на новокаин", "аллергия на бензокаин"],
	},
	{
		id: "allergy_sulfites",
		category: "anesthesia_allergy",
		severity: "critical",
		shortBadge: "⛔ АЛЛЕРГИЯ: СУЛЬФИТЫ (БЕЗ ВАЗОКОНСТРИКТОРОВ)",
		titleRu: "Аллергия на сульфиты / Метабисульфит натрия (E223)",
		fullDescription:
			"Метабисульфит натрия используется как антиоксидант для стабилизации адреналина (эпинефрина) во всех анестетиках с вазоконстрикторами. При сульфитной непереносимости инъекция адреналинового анестетика вызывает тяжелый анафилактоидный шок или острый бронхоспазм.",
		forbiddenProcedures: [
			"Любые анестетики с адреналином / эпинефрином (Ультракаин Д-С, Ультракаин Форте, Септанест, Убистезин)",
		],
		mandatoryPrecautions: [
			"Категорический выбор анестетика БЕЗ вазоконстриктора и сульфитов",
		],
		recommendedAnesthesiaNotes: "Препарат выбора: Скандонест 3% (Мепивакаин 3% без вазоконстриктора) или чистый Лидокаин 2%.",
		icd10Codes: ["Z88.8", "T78.4"],
		keywords: ["сульфит", "метабисульфит", "e223", "консервант", "аллергия на сульфиты"],
	},
	{
		id: "pregnancy_trimester_1",
		category: "pregnancy",
		severity: "critical",
		shortBadge: "🤰 БЕРЕМЕННОСТЬ 1 ТРИМЕСТР: ТОЛЬКО ОСТРАЯ БОЛЬ",
		titleRu: "Беременность 1-й триместр (1–12 недель)",
		fullDescription:
			"Период активного органогенеза и формирования плаценты. Любые медикаменты, стресс и ионизирующее излучение несут потенциальный тератогенный риск и угрозу прерывания беременности.",
		forbiddenProcedures: [
			"Плановая санация полости рта, профессиональное отбеливание, дентальная имплантация, костная пластика",
			"Рентгенологические исследования и КЛКТ (КТ) без абсолютных витальных показаний",
			"Применение анестетиков с высоким содержанием адреналина (1:100 000)",
			"Назначение тетрациклинов, фторхинолонов, НПВС",
		],
		mandatoryPrecautions: [
			"Оказание помощи строго по неотложным показаниям (острый пульпит, острый периодонтит, травма)",
			"При рентгене по жизненным показаниям — обязательный свинцовый защитный фартук с воротником на брюшную полость и таз",
		],
		recommendedAnesthesiaNotes: "Артикаин 1:200 000 (Ультракаин Д-С) в минимальной эффективной дозе (высокое связывание с белками 95%, не преодолевает плацентарный барьер в терапевтических дозах).",
		icd10Codes: ["Z33", "Z34.0"],
		keywords: ["беременность 1 триместр", "1 триместр", "первый триместр", "ранние сроки беременности"],
	},
	{
		id: "pregnancy_trimester_2",
		category: "pregnancy",
		severity: "moderate",
		shortBadge: "🤰 БЕРЕМЕННОСТЬ 2 ТРИМЕСТР: БЕЗОПАСНОЕ ОКНО",
		titleRu: "Беременность 2-й триместр (13–27 недель)",
		fullDescription:
			"Оптимальный и наиболее стабильный период для проведения необходимой плановой санации, лечения кариеса и купирования очагов хронической одонтогенной инфекции.",
		forbiddenProcedures: [
			"Применение адреналина высокой концентрации (1:100 000)",
			"Эстетическое отбеливание и необоснованная костно-пластическая хирургия",
		],
		mandatoryPrecautions: [
			"Лечение в полусидячем положении, предотвращение длительных утомительных приемов (>40 минут)",
			"Рентген-диагностика только прицельная с двойной защитой свинцовым фартуком",
		],
		recommendedAnesthesiaNotes: "Препарат золотого стандарта: Ультракаин Д-С (Артикаин 4% + Эпинефрин 1:200 000) до 1-2 карпул.",
		icd10Codes: ["Z33", "Z34.8"],
		keywords: ["беременность 2 триместр", "2 триместр", "второй триместр"],
	},
	{
		id: "pregnancy_trimester_3",
		category: "pregnancy",
		severity: "high",
		shortBadge: "🤰 БЕРЕМЕННОСТЬ 3 ТРИМЕСТР: РИСК СИНДРОМА НПВ",
		titleRu: "Беременность 3-й триместр (28–40 недель)",
		fullDescription:
			"Поздние сроки беременности. Повышенный тонус матки, риск индуцирования преждевременных родов на фоне стресса и адреналина. Риск синдрома сдавления нижней полой вены (Supine Hypotensive Syndrome) в горизонтальном положении в стоматологическом кресле.",
		forbiddenProcedures: [
			"Длительные травматичные вмешательства, объемная хирургия",
			"Горизонтальная укладка пациентки на спину (угол наклона < 45°)",
			"Анестетики с адреналином 1:100 000",
		],
		mandatoryPrecautions: [
			"Позиционирование пациентки в кресле с поворотом на левый бок на 15° (валик под правое бедро) для декомпрессии нижней полой вены",
			"Короткие сеансы лечения (не более 20–30 минут), постоянный контроль гемодинамики",
		],
		recommendedAnesthesiaNotes: "Ультракаин Д-С 1:200 000 в минимальной дозировке (1 карпула).",
		icd10Codes: ["Z33"],
		keywords: ["беременность 3 триместр", "3 триместр", "третий триместр", "поздние сроки беременности"],
	},
	{
		id: "hypertension_cvd",
		category: "chronic_somatic",
		severity: "high",
		shortBadge: "❤️ ГИПЕРТОНИЯ / ССЗ: ЛИМИТ АДРЕНАЛИНА (<= 0.04 МГ)",
		titleRu: "Гипертоническая болезнь / ИБС / Кардиоваскулярный риск",
		fullDescription:
			"Пациент страдает артериальной гипертензией (I10–I15), ишемической болезнью сердца, перенес инфаркт миокарда или страдает нарушениями ритма. Адреналин может спровоцировать гипертонический криз, приступ стенокардии или острую аритмию.",
		forbiddenProcedures: [
			"Анестетики с высокой дозой адреналина 1:100 000 (Ультракаин Форте, Септанест 1:100k)",
			"Превышение дозы адреналина свыше 0.04 мг (максимум 2 карпулы 1:100k или 4 карпулы 1:200k)",
			"Лечение при систолическом АД > 160–180 мм рт. ст. (требуется седация и антигипертензивная терапия)",
		],
		mandatoryPrecautions: [
			"Обязательное измерение артериального давления и пульса перед началом анестезии",
			"Аспирационная проба перед каждым введением анестетика (исключение внутрисосудистого попадания)",
		],
		recommendedAnesthesiaNotes: "Препарат первого выбора — Скандонест 3% (Мепивакаин 3% без вазоконстриктора). При необходимости длительного вмешательства — Ультракаин Д-С (1:200 000) до 2 карпул.",
		icd10Codes: ["I10", "I11", "I20", "I25"],
		keywords: ["гипертония", "гипертензия", "давление", "ибс", "инфаркт", "аритмия", "стенокардия", "i10", "i11", "i20"],
	},
	{
		id: "diabetes_mellitus",
		category: "chronic_somatic",
		severity: "high",
		shortBadge: "🩸 САХАРНЫЙ ДИАБЕТ: РИСК ГИПОГЛИКЕМИИ И АЛЬВЕОЛИТА",
		titleRu: "Сахарный диабет 1 / 2 типа",
		fullDescription:
			"Нарушение углеводного обмена, снижение фагоцитарной активности лейкоцитов, микроангиопатия, замедленная регенерация тканей и склонность к гнойно-воспалительным осложнениям (альвеолит лунки). Риск острой гипогликемии на приеме.",
		forbiddenProcedures: [
			"Прием пациента натощак (риск гипогликемической комы)",
			"Назначение длительных приемов во время запланированного приема пищи",
		],
		mandatoryPrecautions: [
			"Запись на утренние часы через 1–1.5 часа после легкого завтрака и приема базовой дозы инсулина/метформина",
			"Наличие быстроусвояемых углеводов (пакетик сахара, раствор 40% глюкозы) в кабинете",
			"Атравматичная хирургическая техника, при объемных вмешательствах — периоперационная антибиотикопрофилактика",
		],
		recommendedAnesthesiaNotes: "Ультракаин Д-С 1:200 000 или Скандонест 3% (избыток адреналина стимулирует гликогенолиз и повышает сахар крови).",
		icd10Codes: ["E10", "E11"],
		keywords: ["диабет", "инсулин", "глюкоза", "сахар крови", "e10", "e11"],
	},
	{
		id: "bronchial_asthma",
		category: "chronic_somatic",
		severity: "high",
		shortBadge: "🫁 БРОНХИАЛЬНАЯ АСТМА: ИНГАЛЯТОР НАГОТОВЕ",
		titleRu: "Бронхиальная астма (J45) / ХОБЛ",
		fullDescription:
			"Хроническое воспаление дыхательных путей с гиперреактивностью бронхов. Стресс, запахи стоматологических мономеров и метабисульфиты в анестетиках могут спровоцировать астматический статус.",
		forbiddenProcedures: [
			"Применение анестетиков с консервантами-сульфитами (Ультракаин Форте, Септанест)",
			"Назначение Аспирина и классических НПВС при наличии аспириновой триады (полипоз + астма + непереносимость НПВС)",
		],
		mandatoryPrecautions: [
			"Индивидуальный ингалятор пациента (Сальбутамол, Беродуал, Вентолин) должен лежать на столике врача в открытом доступе",
			"Использование коффердама для защиты от аэрозолей и пахучих мономеров",
		],
		recommendedAnesthesiaNotes: "Скандонест 3% (Мепивакаин без сульфитов и адреналина) — абсолютный препарат выбора.",
		icd10Codes: ["J45", "J44"],
		keywords: ["астма", "бронхиальная астма", "хобл", "сальбутамол", "беродуал", "j45"],
	},
	{
		id: "epilepsy_seizures",
		category: "chronic_somatic",
		severity: "high",
		shortBadge: "⚡ ЭПИЛЕПСИЯ: ЗАЩИТА ОТ ФОТОСТИМУЛЯЦИИ",
		titleRu: "Эпилепсия / Судорожный синдром (G40)",
		fullDescription:
			"Неврологическое заболевание с риском генерализованных судорожных приступов, провоцируемых фотостимуляцией (яркий свет рефлектора в глаза), эмоциональным стрессом или гипоксией.",
		forbiddenProcedures: [
			"Направление яркого света стоматологического светильника прямо в глаза пациенту",
			"Внезапные резкие звуковые и световые раздражители",
		],
		mandatoryPrecautions: [
			"Защитные темные очки для пациента на протяжении всего приема",
			"Уточнение регулярности приема противоэпилептических препаратов (Вальпроаты, Карбамазепин, Ламотриджин)",
			"Готовность роторасширителя и противосудорожной укладки",
		],
		recommendedAnesthesiaNotes: "Ультракаин Д-С 1:200 000 или Скандонест 3% с эффективной глубокой премедикацией.",
		icd10Codes: ["G40"],
		keywords: ["эпилепсия", "судороги", "припадки", "карбамазепин", "депакин", "вальпроат", "g40"],
	},
	{
		id: "hepatitis_hiv_infection",
		category: "chronic_somatic",
		severity: "high",
		shortBadge: "🛡️ САНПИН: ОСОБЫЙ ИНФЕКЦИОННЫЙ РЕЖИМ",
		titleRu: "Вирусные гепатиты B/C, ВИЧ-инфекция (СанПиН 3.3686-21)",
		fullDescription:
			"Парентеральные вирусные инфекции. Требуют строгого соблюдения правил санитарно-противоэпидемического режима, индивидуальной защиты персонала и осторожности при назначении гепатотоксичных препаратов.",
		forbiddenProcedures: [
			"Нарушение протоколов барьерной защиты и дезинфекции",
			"Назначение высоких доз амидных анестетиков и парацетамола при выраженной печеночной недостаточности (цирроз)",
		],
		mandatoryPrecautions: [
			"Двойные перчатки (кольчужные/защитные при хирургических манипуляциях)",
			"Использование только одноразовых карпульных игл, скальпелей и шовного материала",
			"Наличие укладки «Анти-ВИЧ» в кабинете на случай аварийной ситуации",
		],
		recommendedAnesthesiaNotes: "Артикаин (Ультракаин) — метаболизируется на 90–95% в плазме крови эстеразами, что минимизирует нагрузку на печень (в отличие от Лидокаина и Мепивакаина, метаболизирующихся в печени).",
		icd10Codes: ["B18.1", "B18.2", "B20"],
		keywords: ["гепатит", "гепатит b", "гепатит c", "вич", "спид", "b18", "b20"],
	},
	{
		id: "allergy_penicillin",
		category: "general_allergy",
		severity: "high",
		shortBadge: "💊 АЛЛЕРГИЯ: ПЕНИЦИЛЛИНЫ (ЗАПРЕТ АМОКСИКЛАВА)",
		titleRu: "Аллергия на пенициллины и бета-лактамные антибиотики",
		fullDescription:
			"Гиперчувствительность к пенициллиновому ряду (Амоксициллин, Аугментин, Амоксиклав, Флемоксин). Риск перекрестной аллергии с цефалоспоринами до 5–10%.",
		forbiddenProcedures: [
			"Назначение антибиотиков пенициллинового ряда (Амоксициллин, Амоксиклав, Ампициллин)",
			"С осторожностью — цефалоспорины (Цефтриаксон, Цефалексин)",
		],
		mandatoryPrecautions: [
			"Препараты выбора для антибиотикопрофилактики: Линкозамиды (Клиндамицин 300 мг, Линкомицин) или Макролиды (Азитромицин, Кларитромицин)",
		],
		icd10Codes: ["Z88.0"],
		keywords: ["пенициллин", "амоксициллин", "амоксиклав", "аугментин", "флемоксин", "аллергия на пенициллин"],
	},
	{
		id: "allergy_latex",
		category: "general_allergy",
		severity: "high",
		shortBadge: "🧤 АЛЛЕРГИЯ НА ЛАТЕКС (БЕСЛАТЕКСНЫЙ РЕЖИМ)",
		titleRu: "Аллергия на натуральный латекс",
		fullDescription:
			"Контактная и системная гиперчувствительность к протеинам натурального каучукового латекса. Риск контактного хейлита, стоматита, крапивницы и отека Квинке.",
		forbiddenProcedures: [
			"Использование латексных смотровых и хирургических перчаток",
			"Установка латексных платков коффердама (раббердама)",
			"Использование латексных эластиков и резинок",
		],
		mandatoryPrecautions: [
			"Работа строго в нитриловых, неопреновых или виниловых перчатках",
			"Беслатексный коффердам (Sanctuary Non-Latex, Nic Tone Non-Latex)",
		],
		icd10Codes: ["Z91.0", "T78.4"],
		keywords: ["латекс", "аллергия на латекс", "коффердам", "перчатки"],
	},
	{
		id: "allergy_iodine",
		category: "general_allergy",
		severity: "critical",
		shortBadge: "⛔ АЛЛЕРГИЯ: ЙОД И ЙОДОФОРМ (ЗАПРЕТ БЕТАДИНА/МЕТАПЕКСА)",
		titleRu: "Аллергия на йод, йодоформ и повидон-йод",
		fullDescription:
			"Тяжелая контактная и системная гиперчувствительность к препаратам йода. Категорически противопоказано применение антисептиков на основе йода (Бетадин, Повидон-йод, Раствор Люголя, Йодинол), йодоформсодержащих паст для корневых каналов (Metapex, Апексдент с йодоформом) и хирургических турунд (Альвожил / Alveogyl с йодоформом).",
		forbiddenProcedures: [
			"Ирригация и антисептическая обработка Повидон-йодом (Бетадин, Йодинол, Люголь)",
			"Временное пломбирование каналов пастами с йодоформом (Metapex)",
			"Внесение йодоформных турунд и паст в лунку удаленного зуба (Альвожил / Alveogyl)",
		],
		mandatoryPrecautions: [
			"Применять безиодные антисептики: Хлоргексидин 0.05–0.2%, Мирамистин 0.01%, Октенисепт",
			"Для временной дезинфекции каналов — препараты чистого гидроксида кальция (UltraCal XS, Calcicur, Каласепт)",
			"При альвеолите — кюретаж, коллагеновая губка с хлоргексидином без йодоформа",
		],
		icd10Codes: ["Z88.8", "T78.4"],
		keywords: ["йод", "йодоформ", "повидон-йод", "бетадин", "метапекс", "metapex", "йодинол", "альвожил", "alveogyl", "люголь", "аллергия на йод"],
	},
	{
		id: "pheochromocytoma_catecholamines",
		category: "chronic_somatic",
		severity: "critical",
		shortBadge: "⛔ ФЕОХРОМОЦИТОМА: АБСОЛЮТНЫЙ ЗАПРЕТ ВАЗОКОНСТРИКТОРОВ",
		titleRu: "Феохромоцитома (МКБ-10 C74.1 / D35.0)",
		fullDescription:
			"Гормонально-активная опухоль хромаффинной ткани надпочечников, секретирующая катехоламины. Экзогенное введение адреналина (эпинефрина) категорически противопоказано из-за риска смертельного гипертонического криза, отека легких и фибрилляции желудочков.",
		forbiddenProcedures: [
			"Местная анестезия с вазоконстрикторами (адреналин / эпинефрин 1:100 000 и 1:200 000)",
			"Ретракционные нити с адреналином / эпинефрином",
		],
		mandatoryPrecautions: [
			"Анестезия строго Скандонест 3% (Мепивакаин) без вазоконстриктора",
			"Все плановые стоматологические вмешательства строго после хирургического лечения феохромоцитомы и стабилизации гемодинамики",
		],
		recommendedAnesthesiaNotes: "Скандонест 3% (Мепивакаин без вазоконстриктора).",
		icd10Codes: ["C74.1", "D35.0"],
		keywords: ["феохромоцитома", "феохромоцитом", "опухоль надпочечников", "c74.1", "d35.0"],
	},
	{
		id: "thyrotoxicosis_hyperthyroidism",
		category: "chronic_somatic",
		severity: "critical",
		shortBadge: "⛔ ТИРЕОТОКСИКОЗ: ЗАПРЕТ АДРЕНАЛИНА",
		titleRu: "Тиреотоксикоз / Гипертиреоз (МКБ-10 E05)",
		fullDescription:
			"Повышенная чувствительность миокарда к экзогенным катехоламинам. Экстремальный риск тиреотоксического криза, тахиаритмии и фибрилляции желудочков при введении адреналина.",
		forbiddenProcedures: [
			"Местная анестезия с адреналином / эпинефрином (в любых концентрациях 1:100 000 и 1:200 000)",
			"Ретракционные нити с адреналином",
		],
		mandatoryPrecautions: [
			"Анестезия строго препаратами без вазоконстриктора: Скандонест 3% (Мепивакаин)",
			"Постоянный мониторинг пульса и артериального давления",
		],
		recommendedAnesthesiaNotes: "Скандонест 3% (Мепивакаин без адреналина и без сульфитов).",
		icd10Codes: ["E05", "E05.0", "E05.9"],
		keywords: ["тиреотоксикоз", "гипертиреоз", "базедова", "зоб", "e05"],
	},
	{
		id: "beta_blockers_interaction",
		category: "chronic_somatic",
		severity: "high",
		shortBadge: "⚠️ БЕТА-БЛОКАТОРЫ: РИСК КРИЗА НА АДРЕНАЛИН",
		titleRu: "Прием бета-адреноблокаторов (Бисопролол, Анаприлин)",
		fullDescription:
			"Блокада бета-2-адренорецепторов сосудов при введении адреналина вызывает нескомпенсированную альфа-1-вазоконстрикцию, резкий подъем системного АД и рефлекторную тяжелую брадикардию.",
		forbiddenProcedures: [
			"Высокие концентрации адреналина (1:100 000)",
			"Повторные дозы вазоконстриктора",
		],
		mandatoryPrecautions: [
			"Препарат первого выбора — Скандонест 3% (Мепивакаин)",
			"При острой необходимости адреналина — не более 1 карпулы 1:200 000 с аспирацией",
		],
		recommendedAnesthesiaNotes: "Скандонест 3% (Мепивакаин) без вазоконстриктора.",
		keywords: ["бета-блокатор", "бетаблокатор", "бисопролол", "конкор", "анаприлин", "пропранолол", "метопролол", "соталол"],
	},
	{
		id: "severe_hypertension_stage_3",
		category: "chronic_somatic",
		severity: "critical",
		shortBadge: "⛔ АГ III СТАДИИ: ЗАПРЕТ АДРЕНАЛИНА",
		titleRu: "Артериальная гипертензия III ст. / Кризовое течение (АД > 180/110)",
		fullDescription:
			"Тяжелая гипертензия с высоким риском инсульта, инфаркта миокарда и расслоения аорты при выбросе или экзогенном введении адреналина.",
		forbiddenProcedures: [
			"Анестетики с адреналином 1:100 000 и 1:200 000",
			"Плановые травматичные вмешательства до стабилизации АД",
		],
		mandatoryPrecautions: [
			"Анестезия только Скандонест 3% (Мепивакаин)",
			"Измерение АД до и после анестезии",
		],
		recommendedAnesthesiaNotes: "Скандонест 3% без адреналина.",
		icd10Codes: ["I10", "I15"],
		keywords: ["аг 3", "аг iii", "криз", "тяжелая гипертония"],
	},
];

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
	if (profile.hasIodineAllergy) addFlagFromCatalog("allergy_iodine");

	if (profile.hasAnaphylaxisHistory) {
		activeFlags.push({
			id: "anaphylaxis_history",
			category: "anesthesia_allergy",
			severity: "critical",
			shortBadge: "⛔ АНАФИЛАКСИЯ В АНАМНЕЗЕ",
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

	if (profile.customAllergyNotes && profile.customAllergyNotes.trim()) {
		const rawNotes = profile.customAllergyNotes.trim();
		activeFlags.push({
			id: "custom_allergy_notes",
			category: "anesthesia_allergy",
			severity: "critical",
			shortBadge: `⛔ АЛЛЕРГИЯ: ${rawNotes.toUpperCase()}`,
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
		: "✅ Анамнез не отягощен. Критических стоп-факторов не выявлено.";

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
 * Парсит произвольный текст анамнеза, заметок или сопутствующих патологий
 * и извлекает структурированный профиль безопасности.
 */
export function parseSafetyProfileFromText(text?: string | null | undefined): PatientClinicalSafetyProfile {
	const raw = (text ?? "").toLowerCase();
	if (!raw.trim()) {
		return { pregnancyTrimester: "none" };
	}

	const hasArticaine =
		raw.includes("артикаин") ||
		raw.includes("ультракаин") ||
		raw.includes("септанест") ||
		raw.includes("убистезин");

	const hasLidocaine =
		raw.includes("лидокаин") ||
		raw.includes("ксилокаин");

	const hasEsterAnesthetics =
		raw.includes("дикаин") ||
		raw.includes("тетракаин") ||
		raw.includes("новокаин") ||
		raw.includes("прокаин") ||
		raw.includes("анестезин") ||
		raw.includes("бензокаин");

	const hasMepivacaine =
		raw.includes("мепивакаин") ||
		raw.includes("скандонест") ||
		raw.includes("мепивастезин");

	const hasSulfites =
		raw.includes("сульфит") ||
		raw.includes("дисульфит") ||
		raw.includes("метабисульфит") ||
		raw.includes("пиросульфит") ||
		raw.includes("е223") ||
		raw.includes("e223") ||
		raw.includes("консервант");

	const hasPacemaker =
		raw.includes("кардиостимулятор") ||
		raw.includes("экс") ||
		raw.includes("икд") ||
		raw.includes("пейсмейкер") ||
		raw.includes("водитель ритма") ||
		raw.includes("z95.0");

	const hasBisphosphonates =
		raw.includes("бисфосфонат") ||
		raw.includes("акласта") ||
		raw.includes("зомета") ||
		raw.includes("золедронат") ||
		raw.includes("фосамакс") ||
		raw.includes("алендронат") ||
		raw.includes("бонвива") ||
		raw.includes("пролиа") ||
		raw.includes("деносумаб") ||
		raw.includes("остеонекроз") ||
		raw.includes("бонч") ||
		raw.includes("m87.1");

	const hasAnticoagulants =
		raw.includes("варфарин") ||
		raw.includes("ксарелто") ||
		raw.includes("ривароксабан") ||
		raw.includes("эликвис") ||
		raw.includes("апиксабан") ||
		raw.includes("прадакса") ||
		raw.includes("дабигатран") ||
		raw.includes("плавикс") ||
		raw.includes("клопидогрел") ||
		raw.includes("тромбо асс") ||
		raw.includes("антикоагулянт") ||
		raw.includes("дезагрегант") ||
		raw.includes("z92.1");

	// Беременность по триместрам
	let pregnancyTrimester: PregnancyTrimester = "none";
	if (raw.includes("беременн") || raw.includes("лактац") || raw.includes("триместр") || raw.includes("кормлен") || raw.includes("гв") || raw.includes("z33")) {
		if (raw.includes("1 триместр") || raw.includes("1-й триместр") || raw.includes("первый триместр") || raw.includes("ранние сроки")) {
			pregnancyTrimester = "trimester_1";
		} else if (raw.includes("2 триместр") || raw.includes("2-й триместр") || raw.includes("второй триместр")) {
			pregnancyTrimester = "trimester_2";
		} else if (raw.includes("3 триместр") || raw.includes("3-й триместр") || raw.includes("третий триместр")) {
			pregnancyTrimester = "trimester_3";
		} else if (raw.includes("лактац") || raw.includes("гв") || raw.includes("кормлен")) {
			pregnancyTrimester = "lactation";
		} else {
			pregnancyTrimester = "trimester_2"; // Безопасное среднее предположение
		}
	}

	const hasHypertension =
		raw.includes("гипертон") ||
		raw.includes("гипертенз") ||
		raw.includes("давлен") ||
		raw.includes("аг ") ||
		raw.includes("аг,") ||
		raw.includes("криз") ||
		raw.includes("i10") ||
		raw.includes("i11") ||
		raw.includes("i12") ||
		raw.includes("i13") ||
		raw.includes("i14") ||
		raw.includes("i15");

	const hasIhd =
		raw.includes("ибс") ||
		raw.includes("стенокард") ||
		raw.includes("инфаркт") ||
		raw.includes("постинфаркт") ||
		raw.includes("стентирован") ||
		raw.includes("шунтирован") ||
		raw.includes("i20") ||
		raw.includes("i21") ||
		raw.includes("i22") ||
		raw.includes("i23") ||
		raw.includes("i24") ||
		raw.includes("i25");

	const hasArrhythmia =
		raw.includes("аритми") ||
		raw.includes("мерцательн") ||
		raw.includes("экстрасистол") ||
		raw.includes("тахикарди") ||
		raw.includes("фибрилляц") ||
		raw.includes("пароксизм") ||
		raw.includes("блокад") ||
		raw.includes("i44") ||
		raw.includes("i45") ||
		raw.includes("i47") ||
		raw.includes("i48") ||
		raw.includes("i49");

	const hasCardio =
		hasHypertension ||
		hasIhd ||
		hasArrhythmia ||
		raw.includes("сердеч") ||
		raw.includes("кардио") ||
		raw.includes("пороком сердца") ||
		raw.includes("хсн");

	const hasDiabetes =
		raw.includes("диабет") ||
		raw.includes("инсулин") ||
		raw.includes("глюкоз") ||
		raw.includes("e10") ||
		raw.includes("e11");

	const hasAsthma =
		raw.includes("астма") ||
		raw.includes("астм") ||
		raw.includes("бронхиальн") ||
		raw.includes("сальбутамол") ||
		raw.includes("беродуал") ||
		raw.includes("j45") ||
		raw.includes("j46");

	const hasEpilepsy =
		raw.includes("эпилепс") ||
		raw.includes("судорог") ||
		raw.includes("припад") ||
		raw.includes("g40");

	const hasHepatitis =
		raw.includes("гепатит") ||
		raw.includes("b18");

	const hasHiv =
		raw.includes("вич") ||
		raw.includes("спид") ||
		raw.includes("b20");

	const hasPenicillin =
		raw.includes("пенициллин") ||
		raw.includes("амоксициллин") ||
		raw.includes("амоксиклав") ||
		raw.includes("аугментин") ||
		raw.includes("флемоксин") ||
		raw.includes("z88.0");

	const hasLatex =
		raw.includes("латекс");

	const hasIodine =
		raw.includes("йод") ||
		raw.includes("йодоформ") ||
		raw.includes("повидон-йод") ||
		raw.includes("бетадин") ||
		raw.includes("метапекс") ||
		raw.includes("йодинол") ||
		raw.includes("альвожил") ||
		raw.includes("alveogyl") ||
		raw.includes("люголь");

	const hasPheochromocytoma =
		raw.includes("феохромоцитом") ||
		raw.includes("надпочечник") ||
		raw.includes("c74.1") ||
		raw.includes("d35.0");

	return {
		hasArticaineAllergy: hasArticaine,
		hasLidocaineAllergy: hasLidocaine,
		hasMepivacaineAllergy: hasMepivacaine,
		hasEsterAnestheticsAllergy: hasEsterAnesthetics,
		hasSulfiteAllergy: hasSulfites,
		hasPacemakerExs: hasPacemaker,
		takesBisphosphonates: hasBisphosphonates,
		takesAnticoagulants: hasAnticoagulants,
		pregnancyTrimester,
		hasCardiovascularDisease: hasCardio,
		hasHypertension,
		hasIhd,
		hasArrhythmia,
		hasPheochromocytoma,
		hasDiabetesMellitus: hasDiabetes,
		hasBronchialAsthma: hasAsthma,
		hasEpilepsy: hasEpilepsy,
		hasHepatitis: hasHepatitis,
		hasHiv: hasHiv,
		hasPenicillinAllergy: hasPenicillin,
		hasLatexAllergy: hasLatex,
		hasIodineAllergy: hasIodine,
		customChronicNotes: text ? text : undefined,
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
		items.push(`Сопутствующие соматические заболевания: ${chronic.join(", ")}.`);
	} else {
		items.push("Соматический статус: Хронические заболевания (ССЗ, диабет, астму, гепатиты) отрицает.");
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

	return {
		isAllowed,
		severity,
		warnings,
		alternatives,
	};
}

/**
 * Преобразует профиль безопасности пациента в соматический профиль риска для анестезиологического калькулятора.
 */
export function patientProfileToSomaticRiskProfile(
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined,
): SomaticRiskProfile {
	if (!profile) return {};
	if (typeof profile === "string") {
		const parsed = parseSafetyProfileFromText(profile);
		return patientProfileToSomaticRiskProfile(parsed);
	}

	const hasCardio = Boolean(
		profile.hasCardiovascularDisease ||
		profile.hasHypertension ||
		profile.hasIhd ||
		profile.hasArrhythmia,
	);
	const isPregnant = Boolean(
		profile.pregnancyTrimester && profile.pregnancyTrimester !== "none",
	);

	return {
		hasCardiovascularRisk: hasCardio,
		hasHypertension: Boolean(profile.hasHypertension),
		hasIhd: Boolean(profile.hasIhd),
		hasArrhythmia: Boolean(profile.hasArrhythmia),
		hasSulfiteAllergy: Boolean(profile.hasSulfiteAllergy),
		hasBronchialAsthma: Boolean(profile.hasBronchialAsthma),
		isPregnantOrLactating: isPregnant,
		pregnancyTrimester: profile.pregnancyTrimester,
		customNotes: profile.customChronicNotes || profile.customAllergyNotes,
	};
}

/**
 * Автоматически рассчитывает безопасный анестетик и дозировки на основе профиля пациента (Автопилот безопасности).
 */
export function getAnesthesiaAutopilotForPatient(
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined,
	weightKg?: number | undefined,
	ageYears?: number | null | undefined,
	isPediatric?: boolean | undefined,
): AutopilotResolutionResult {
	const somatic = patientProfileToSomaticRiskProfile(profile);
	return resolveAutopilotAnesthesia({
		somaticProfile: somatic,
		patientWeightKg: weightKg,
		patientAgeYears: ageYears,
		isPediatric,
	});
}

/**
 * Рассчитывает МРД (максимальную разовую дозу) анестетика с учетом кардио-ограничений профиля пациента.
 */
export function calculatePatientMrdForProfile(params: {
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	drugKey: AnesthesiaDrugKey;
	patientWeightKg: number;
	patientAgeYears?: number | null | undefined;
	isPediatric?: boolean | undefined;
}): PatientMrdCalculation {
	const somatic = patientProfileToSomaticRiskProfile(params.profile);
	const hasCardio = Boolean(
		somatic.hasCardiovascularRisk ||
		somatic.hasHypertension ||
		somatic.hasIhd ||
		somatic.hasArrhythmia,
	);

	return calculatePatientMrd({
		drugKey: params.drugKey,
		patientWeightKg: params.patientWeightKg,
		patientAgeYears: params.patientAgeYears,
		isPediatric: params.isPediatric,
		isCardioRestricted: hasCardio,
	});
}

