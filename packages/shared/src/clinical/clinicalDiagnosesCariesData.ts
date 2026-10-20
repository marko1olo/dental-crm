/**
 * packages/shared/src/clinical/clinicalDiagnosesCariesData.ts
 *
 * DENTE Dental CRM — SSOT Data for Caries (K02) and Pulpitis (K04.0).
 * Strict Mandate 8b & Engineering Invariant: <= 500 lines.
 */

import type { CanonicalClinicalDiagnosis } from "./clinicalDiagnosesSsotTypes.js";

export const CARIES_INITIAL_K020: CanonicalClinicalDiagnosis = {
	id: "diag_caries_initial_k020",
	icd10: "K02.0",
	title: "Кариес эмали (в стадии белого/темного пятна, поверхностный)",
	shortTitle: "Кариес эмали",
	category: "caries",
	toothState: "Watch",
	clinicalNotes: "Очаговая деминерализация эмали без образования полости. Метод выбора — инфильтрация Icon или реминерализация.",
	recommendedServices: [
		{
			id: "srv_k020_remind",
			code804n: "A11.07.012",
			title: "Глубокое фторирование эмали и реминерализующая терапия",
			defaultPriceRub: 1200,
			defaultPriceKopecks: 120000,
			category: "Терапия",
			requiredByDefault: true,
		},
		{
			id: "srv_k020_icon",
			code804n: "A16.07.002.001",
			title: "Инфильтрация эмали кариозного пятна полимерным составом (Icon)",
			defaultPriceRub: 3500,
			defaultPriceKopecks: 350000,
			category: "Терапия",
			requiredByDefault: false,
		},
	],
	soapTemplate: {
		complaints: "Эстетический дефект, белесоватое или темное пятно на поверхности эмали. Боли нет.",
		anamnesis: "Пятно обнаружено пациентом самостоятельно или при профосмотре. Ранее лечение не проводилось.",
		objective: "На поверхности зуба меловидное/пигментированное пятно. Поверхность гладкая или шероховатая, без дефекта дентина. Зондирование безболезненное, ЭОД 2-6 мкА.",
		diagnosisText: "K02.0 Кариес эмали (стадия пятна)",
		treatmentPlan: "Профессиональная гигиена, аппликация реминерализующего препарата / инфильтрация Icon.",
		recommendations: "Контрольный осмотр через 3 месяца. Гигиена с фторидсодержащими пастами (1450 ppm).",
	},
};

export const CARIES_DENTIN_K021: CanonicalClinicalDiagnosis = {
	id: "diag_caries_dentin_k021",
	icd10: "K02.1",
	title: "Кариес дентина (средний и глубокий кариес)",
	shortTitle: "Кариес дентина",
	category: "caries",
	toothState: "Caries",
	clinicalNotes: "Поражение эмали и дентина с образованием кариозной полости. Препарирование и световая реставрация.",
	recommendedServices: [
		{
			id: "srv_k021_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная / проводниковая",
			defaultPriceRub: 1200,
			defaultPriceKopecks: 120000,
			category: "Анестезия",
			requiredByDefault: true,
		},
		{
			id: "srv_k021_cofferdam",
			code804n: "A16.07.002.001",
			title: "Наложение коффердама (раббердама)",
			defaultPriceRub: 800,
			defaultPriceKopecks: 80000,
			category: "Терапия",
			requiredByDefault: true,
		},
		{
			id: "srv_k021_prep",
			code804n: "A16.07.002",
			title: "Препарирование кариозной полости",
			defaultPriceRub: 1000,
			defaultPriceKopecks: 100000,
			category: "Терапия",
			requiredByDefault: true,
		},
		{
			id: "srv_k021_restoration",
			code804n: "A16.07.002.010",
			title: "Восстановление зуба пломбой светового отверждения (I, II, III класс)",
			defaultPriceRub: 4000,
			defaultPriceKopecks: 400000,
			category: "Терапия",
			requiredByDefault: true,
		},
		{
			id: "srv_k021_polish",
			code804n: "A16.07.002.011",
			title: "Шлифовка и полировка пломбы",
			defaultPriceRub: 500,
			defaultPriceKopecks: 50000,
			category: "Терапия",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Кратковременные боли от температурных и химических раздражителей, быстро проходящие после устранения причины, застревание пищи.",
		anamnesis: "Полость появилась несколько месяцев назад, медленно прогрессирует.",
		objective: "Кариозная полость с размягченным дентином. Зондирование болезненно по стенкам/дну. Перкуссия безболезненна. ЭОД 2-6 мкА.",
		diagnosisText: "K02.1 Кариес дентина",
		treatmentPlan: "Местная анестезия, коффердам, препарирование, адгезивный протокол, пломба светового отверждения, полировка.",
		recommendations: "Щадящая диета 2 часа, контрольный осмотр через 6 месяцев.",
	},
};

export const CARIES_CEMENTUM_K022: CanonicalClinicalDiagnosis = {
	id: "diag_caries_cementum_k022",
	icd10: "K02.2",
	title: "Кариес цемента (пришеечный кариес и кариес корня зуба)",
	shortTitle: "Кариес цемента",
	category: "caries",
	toothState: "Caries",
	clinicalNotes: "Кариозное поражение в области шейки и обнаженного корня зуба у пациентов с рецессией десны.",
	recommendedServices: [
		{
			id: "srv_k022_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная",
			defaultPriceRub: 1200,
			defaultPriceKopecks: 120000,
			category: "Анестезия",
			requiredByDefault: true,
		},
		{
			id: "srv_k022_restoration",
			code804n: "A16.07.002.010",
			title: "Восстановление пришеечной полости композитным/стеклоиономерным материалом (V класс)",
			defaultPriceRub: 3500,
			defaultPriceKopecks: 350000,
			category: "Терапия",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Чувствительность в пришеечной области при чистке зубов и от холодного, косметический дефект у десны.",
		anamnesis: "Рецессия десны в течение нескольких лет, полость в пришеечной области.",
		objective: "В пришеечной зоне обнаженного корня определяется дефект твердых тканей с размягченным дентином. Зондирование слабоболезненное.",
		diagnosisText: "K02.2 Кариес цемента",
		treatmentPlan: "Анестезия, щадящее препарирование, СИЦ-лайнер или нанокомпозит светового отверждения, полировка.",
		recommendations: "Мягкая зубная щетка, паста для чувствительных зубов, обучение атравматичной технике чистки.",
	},
};

export const CARIES_ARRESTED_K023: CanonicalClinicalDiagnosis = {
	id: "diag_caries_arrested_k023",
	icd10: "K02.3",
	title: "Приостановившийся кариес зубов",
	shortTitle: "Приостановившийся кариес",
	category: "caries",
	toothState: "Watch",
	clinicalNotes: "Стабилизированный кариозный процесс с плотным пигментированным дном, не требующий инвазивного препарирования.",
	recommendedServices: [
		{
			id: "srv_k023_fluor",
			code804n: "A11.07.012",
			title: "Глубокое фторирование эмали и реминерализация",
			defaultPriceRub: 1000,
			defaultPriceKopecks: 100000,
			category: "Терапия",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Жалоб нет. Пигментированное темное пятно.",
		anamnesis: "Пятно существует длительное время без динамики.",
		objective: "На поверхности зуба темное пигментированное пятно. Дно плотное, зонд скользит, зондирование безболезненное. Перкуссия отрицательная.",
		diagnosisText: "K02.3 Приостановившийся кариес зубов",
		treatmentPlan: "Диспансерное наблюдение, аппликация фторлака / реминерализующая терапия.",
		recommendations: "Динамическое наблюдение 1 раз в 6 месяцев.",
	},
};

export const CARIES_OTHER_K028: CanonicalClinicalDiagnosis = {
	id: "diag_caries_other_k028",
	icd10: "K02.8",
	title: "Другой уточненный кариес зубов",
	shortTitle: "Другой кариес",
	category: "caries",
	toothState: "Caries",
	clinicalNotes: "Циркулярный, множественный кариес или вторичный кариес под ранее наложенной пломбой.",
	recommendedServices: [
		{
			id: "srv_k028_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная",
			defaultPriceRub: 1200,
			defaultPriceKopecks: 120000,
			category: "Анестезия",
			requiredByDefault: true,
		},
		{
			id: "srv_k028_refill",
			code804n: "A16.07.002.010",
			title: "Замена дефектной пломбы и световая реставрация",
			defaultPriceRub: 4200,
			defaultPriceKopecks: 420000,
			category: "Терапия",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Застревание пищи вокруг старой пломбы, нарушение краевого прилегания, кратковременный дискомфорт.",
		anamnesis: "Пломба поставлена более 5 лет назад.",
		objective: "Нарушение краевого прилегания реставрации, пигментация по границе, под пломбой размягченный дентин.",
		diagnosisText: "K02.8 Другой уточненный кариес зубов (вторичный кариес)",
		treatmentPlan: "Снятие старой пломбы, некрэктомия, адгезивный протокол, световая реставрация.",
		recommendations: "Контроль окклюзии через 24 часа при необходимости.",
	},
};

export const CARIES_UNSPECIFIED_K029: CanonicalClinicalDiagnosis = {
	id: "diag_caries_unspecified_k029",
	icd10: "K02.9",
	title: "Кариес зубов неуточненный",
	shortTitle: "Кариес неуточненный",
	category: "caries",
	toothState: "Caries",
	clinicalNotes: "Кариозное поражение зуба на этапе предварительного осмотра до уточнения локализации и глубины.",
	recommendedServices: [
		{
			id: "srv_k029_consult",
			code804n: "B01.065.001",
			title: "Прием (осмотр, консультация) врача-стоматолога первичный",
			defaultPriceRub: 1500,
			defaultPriceKopecks: 150000,
			category: "Консультация",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Жалобы на дефект зуба, дискомфорт при приеме пищи.",
		anamnesis: "Выявлен при плановом обращении.",
		objective: "Визуально определяется кариозная полость твердых тканей зуба.",
		diagnosisText: "K02.9 Кариес зубов неуточненный",
		treatmentPlan: "Рентгенодиагностика (RVG), инструментальное обследование, составление плана лечения.",
		recommendations: "Проведение санации полости рта.",
	},
};

export const PULPITIS_ACUTE_K040: CanonicalClinicalDiagnosis = {
	id: "diag_pulpitis_acute_k040",
	icd10: "K04.0",
	title: "Острый пульпит (начальный, серозный, гнойный)",
	shortTitle: "Острый пульпит",
	category: "pulpitis",
	toothState: "Pulpitis",
	clinicalNotes: "Острое воспаление сосудисто-нервного пучка зуба. Требует депульпирования, обработки каналов и обтурации.",
	recommendedServices: [
		{
			id: "srv_k040_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная / проводниковая",
			defaultPriceRub: 1200,
			defaultPriceKopecks: 120000,
			category: "Анестезия",
			requiredByDefault: true,
		},
		{
			id: "srv_k040_cofferdam",
			code804n: "A16.07.002.001",
			title: "Наложение коффердама",
			defaultPriceRub: 800,
			defaultPriceKopecks: 80000,
			category: "Терапия",
			requiredByDefault: true,
		},
		{
			id: "srv_k040_extirp",
			code804n: "A16.07.030.001",
			title: "Экстирпация пульпы (депульпирование)",
			defaultPriceRub: 2000,
			defaultPriceKopecks: 200000,
			category: "Эндодонтия",
			requiredByDefault: true,
		},
		{
			id: "srv_k040_prep_canals",
			code804n: "A16.07.030.002",
			title: "Механическая и медикаментозная обработка корневого канала",
			defaultPriceRub: 3300,
			defaultPriceKopecks: 330000,
			category: "Эндодонтия",
			requiredByDefault: true,
		},
		{
			id: "srv_k040_temp_fill",
			code804n: "A16.07.030.004",
			title: "Временное пломбирование корневого канала лекарственным препаратом / Временная пломба",
			defaultPriceRub: 1500,
			defaultPriceKopecks: 150000,
			category: "Эндодонтия",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Острые приступообразные самопроизвольные боли, усиливающиеся ночью, иррадиация по тройничному нерву. Длительная боль от холодного и горячего.",
		anamnesis: "Боли начались 1-2 дня назад, интенсивность нарастает.",
		objective: "Глубокая кариозная полость с истонченным дном. Резкая боль при зондировании точки вскрытия пульпы. ЭОД 20-40 мкА.",
		diagnosisText: "K04.0 Острый пульпит",
		treatmentPlan: "Анестезия, коффердам, раскрытие полости, экстирпация пульпы, антисептическая обработка каналов, временная повязка с Ca(OH)2.",
		recommendations: "НПВП при болях. Повторный визит через 7-14 дней для постоянной обтурации каналов.",
	},
};

export const PULPITIS_CHRONIC_K0403: CanonicalClinicalDiagnosis = {
	id: "diag_pulpitis_chronic_k0403",
	icd10: "K04.03",
	title: "Хронический пульпит (фиброзный, гангренозный, гипертрофический)",
	shortTitle: "Хронический пульпит",
	category: "pulpitis",
	toothState: "Pulpitis",
	clinicalNotes: "Хроническое продуктивное или деструктивное воспаление пульпы зуба.",
	recommendedServices: [
		{
			id: "srv_k0403_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная / проводниковая",
			defaultPriceRub: 1200,
			defaultPriceKopecks: 120000,
			category: "Анестезия",
			requiredByDefault: true,
		},
		{
			id: "srv_k0403_endo",
			code804n: "A16.07.030",
			title: "Инструментальная и антисептическая обработка корневых каналов",
			defaultPriceRub: 3500,
			defaultPriceKopecks: 350000,
			category: "Эндодонтия",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Ноющие боли от температурных раздражителей (особенно горячего), медленно проходящие. Неприятный запах изо рта.",
		anamnesis: "Ранее зуб болел остро, затем боли стихли.",
		objective: "Широкая кариозная полость, сообщение с полостью зуба. Пульпа кровоточит или некротизирована. ЭОД 40-60 мкА.",
		diagnosisText: "K04.03 Хронический пульпит",
		treatmentPlan: "Экстирпация пульпы, ультразвуковая ирригация NaOCl 3%, временная обтурация Ca(OH)2.",
		recommendations: "Явка на второй этап эндодонтии через 10-14 дней.",
	},
};

export const CARIES_AND_PULPITIS_DIAGNOSES: readonly CanonicalClinicalDiagnosis[] = [
	CARIES_INITIAL_K020,
	CARIES_DENTIN_K021,
	CARIES_CEMENTUM_K022,
	CARIES_ARRESTED_K023,
	CARIES_OTHER_K028,
	CARIES_UNSPECIFIED_K029,
	PULPITIS_ACUTE_K040,
	PULPITIS_CHRONIC_K0403,
];
