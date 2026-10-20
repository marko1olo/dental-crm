/**
 * packages/shared/src/clinical/clinicalDiagnosesPeriodontalData.ts
 *
 * DENTE Dental CRM — SSOT Data for Periodontitis, Gingivitis, Stomatitis,
 * Non-carious lesions (K03) and Edentulism (K08.1).
 * Strict Mandate 8b & Engineering Invariant: <= 500 lines.
 */

import type { CanonicalClinicalDiagnosis } from "./clinicalDiagnosesSsotTypes.js";

export const PERIODONTITIS_ACUTE_K044: CanonicalClinicalDiagnosis = {
	id: "diag_periodontitis_acute_k044",
	icd10: "K04.4",
	title: "Острый апикальный периодонтит пульпарного происхождения",
	shortTitle: "Острый периодонтит",
	category: "periodontitis",
	toothState: "Periodontitis",
	clinicalNotes: "Острое воспаление тканей периодонта в области верхушки корня. Симптом «выросшего зуба», резкая боль при накусывании.",
	recommendedServices: [
		{
			id: "srv_k044_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная / проводниковая",
			defaultPriceRub: 1200,
			defaultPriceKopecks: 120000,
			category: "Анестезия",
			requiredByDefault: true,
		},
		{
			id: "srv_k044_unseal",
			code804n: "A16.07.082",
			title: "Распломбирование / механическая дезинфекция каналов",
			defaultPriceRub: 2500,
			defaultPriceKopecks: 250000,
			category: "Эндодонтия",
			requiredByDefault: true,
		},
		{
			id: "srv_k044_caoh2",
			code804n: "A16.07.091",
			title: "Временная обтурация корневого канала гидроксидом кальция",
			defaultPriceRub: 1800,
			defaultPriceKopecks: 180000,
			category: "Эндодонтия",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Постоянная локализованная ноющая боль в зубе, резко усиливающаяся при накусывании. Ощущение «выросшего зуба».",
		anamnesis: "Зуб ранее лечен или была острая боль. Текущее обострение 1-2 дня.",
		objective: "Резко положительная вертикальная перкуссия. Пальпация по переходной складке болезненна. ЭОД > 100 мкА. На RVG расширение периодонтальной щели.",
		diagnosisText: "K04.4 Острый апикальный периодонтит",
		treatmentPlan: "Анестезия, раскрытие полости, эвакуация экссудата, ирригация NaOCl 3%, гидроксид кальция под герметичную повязку.",
		recommendations: "Щадящий режим нагрузки, НПВП при боли. Повторный визит через 10-14 дней.",
	},
};

export const PERIODONTITIS_CHRONIC_K045: CanonicalClinicalDiagnosis = {
	id: "diag_periodontitis_chronic_k045",
	icd10: "K04.5",
	title: "Хронический апикальный периодонтит (гранулирующий, гранулематозный)",
	shortTitle: "Хронический периодонтит",
	category: "periodontitis",
	toothState: "Periodontitis",
	clinicalNotes: "Хронический деструктивный процесс костной ткани у верхушки корня (гранулема, кистогранулема).",
	recommendedServices: [
		{
			id: "srv_k045_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная / проводниковая",
			defaultPriceRub: 1200,
			defaultPriceKopecks: 120000,
			category: "Анестезия",
			requiredByDefault: true,
		},
		{
			id: "srv_k045_cofferdam",
			code804n: "A16.07.002.001",
			title: "Наложение коффердама",
			defaultPriceRub: 800,
			defaultPriceKopecks: 80000,
			category: "Терапия",
			requiredByDefault: true,
		},
		{
			id: "srv_k045_prep",
			code804n: "A16.07.030.002",
			title: "Механическая и медикаментозная обработка корневого канала",
			defaultPriceRub: 3300,
			defaultPriceKopecks: 330000,
			category: "Эндодонтия",
			requiredByDefault: true,
		},
		{
			id: "srv_k045_caoh2",
			code804n: "A16.07.091",
			title: "Временная обтурация корневого канала гидроксидом кальция (Ca(OH)2)",
			defaultPriceRub: 1800,
			defaultPriceKopecks: 180000,
			category: "Эндодонтия",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Бессимптомное течение или чувство неловкости при накусывании на зуб. Возможно появление свища на десне.",
		anamnesis: "Зуб ранее лечен эндодонтически или депульпирован давно.",
		objective: "Коронка темная, дефект пломбы. На КЛКТ/RVG очаг деструкции костной ткани у верхушки корня.",
		diagnosisText: "K04.5 Хронический апикальный периодонтит",
		treatmentPlan: "Ревизия корневых каналов, ирригация, лечебная повязка с гидроксидом кальция на 14-21 день.",
		recommendations: "Контрольный осмотр и постоянная обтурация через 2-3 недели. Рентген-контроль через 6 месяцев.",
	},
};

export const GINGIVITIS_ACUTE_K050: CanonicalClinicalDiagnosis = {
	id: "diag_gingivitis_acute_k050",
	icd10: "K05.0",
	title: "Острый гингивит (катаральный, язвенно-некротический)",
	shortTitle: "Острый гингивит",
	category: "periodontal_disease",
	toothState: "Healthy",
	clinicalNotes: "Острое воспаление десны без нарушения целостности зубодесневого прикрепления.",
	recommendedServices: [
		{
			id: "srv_k050_hyg",
			code804n: "A16.07.050.001",
			title: "Ультразвуковое удаление зубных отложений (скейлинг)",
			defaultPriceRub: 2500,
			defaultPriceKopecks: 250000,
			category: "Гигиена",
			requiredByDefault: true,
		},
		{
			id: "srv_k050_antisept",
			code804n: "A11.07.012",
			title: "Антисептическая обработка пародонтальных карманов и аппликация геля",
			defaultPriceRub: 800,
			defaultPriceKopecks: 80000,
			category: "Пародонтология",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Боль и жжение в деснах, резкая кровоточивость при чистке зубов и приеме пищи.",
		anamnesis: "Началось остро после перенесенного ОРВИ или травмы десны.",
		objective: "Десневой край гиперемирован, отечен, кровоточит при легком зондировании. Зубодесневое прикрепление сохранено.",
		diagnosisText: "K05.0 Острый гингивит",
		treatmentPlan: "Устранение травмирующих факторов, профессиональная гигиена, аппликации антисептиков.",
		recommendations: "Полоскания антисептиками 5-7 дней, мягкая зубная щетка.",
	},
};

export const GINGIVITIS_CHRONIC_K051: CanonicalClinicalDiagnosis = {
	id: "diag_gingivitis_chronic_k051",
	icd10: "K05.1",
	title: "Хронический гингивит (простой маргинальный, гипертрофический)",
	shortTitle: "Хронический гингивит",
	category: "periodontal_disease",
	toothState: "Healthy",
	clinicalNotes: "Хроническое воспаление краевой десны, вызванное зубными отложениями.",
	recommendedServices: [
		{
			id: "srv_k051_ultrasound",
			code804n: "A16.07.050.001",
			title: "Ультразвуковое удаление зубных отложений (скейлинг)",
			defaultPriceRub: 2500,
			defaultPriceKopecks: 250000,
			category: "Гигиена",
			requiredByDefault: true,
		},
		{
			id: "srv_k051_airflow",
			code804n: "A16.07.050.002",
			title: "Удаление пигментированного налета аппаратом Air-Flow",
			defaultPriceRub: 2200,
			defaultPriceKopecks: 220000,
			category: "Гигиена",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Кровоточивость десен при чистке зубов, неприятный запах изо рта, наличие зубного камня.",
		anamnesis: "Кровоточивость в течение нескольких месяцев/лет.",
		objective: "Десна застойной гиперемии, отечна. Обильные наддесневые и поддесневые зубные отложения. Глубина бороздки до 2 мм.",
		diagnosisText: "K05.1 Хронический гингивит",
		treatmentPlan: "Профессиональная гигиена (УЗ-скейлинг + Air-Flow), полировка абразивными пастами, обучение гигиене.",
		recommendations: "Контрольный осмотр через 10-14 дней. Профгигиена каждые 6 месяцев.",
	},
};

export const PERIODONTITIS_CHRONIC_K053: CanonicalClinicalDiagnosis = {
	id: "diag_periodontitis_chronic_k053",
	icd10: "K05.3",
	title: "Хронический пародонтит (локализованный, генерализованный)",
	shortTitle: "Хронический пародонтит",
	category: "periodontal_disease",
	toothState: "Healthy",
	clinicalNotes: "Деструктивное воспаление опорного аппарата зуба: пародонтальные карманы, резорбция кости.",
	recommendedServices: [
		{
			id: "srv_k053_ultrasound",
			code804n: "A16.07.050.001",
			title: "Ультразвуковое удаление зубных отложений (скейлинг)",
			defaultPriceRub: 2500,
			defaultPriceKopecks: 250000,
			category: "Гигиена",
			requiredByDefault: true,
		},
		{
			id: "srv_k053_curettage",
			code804n: "A16.07.039",
			title: "Закрытый кюретаж пародонтальных карманов",
			defaultPriceRub: 2800,
			defaultPriceKopecks: 280000,
			category: "Пародонтология",
			requiredByDefault: true,
		},
		{
			id: "srv_k053_polish",
			code804n: "A16.07.050.003",
			title: "Полировка корней зубов и антисептическая обработка карманов",
			defaultPriceRub: 1200,
			defaultPriceKopecks: 120000,
			category: "Пародонтология",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Кровоточивость десен, оголение шеек зубов, подвижность зубов, неприятный запах изо рта.",
		anamnesis: "Заболевание протекает волнообразно в течение нескольких лет.",
		objective: "Пародонтальные карманы глубиной 3-6 мм. Рецессия десны 1-3 мм. Подвижность зубов I-II степени. На рентгенограмме резорбция перегородок.",
		diagnosisText: "K05.3 Хронический пародонтит",
		treatmentPlan: "Скейлинг, закрытый кюретаж карманов, медикаментозная обработка, шинирование по показаниям.",
		recommendations: "Поддерживающая терапия 1 раз в 3 месяца. Ирригатор, межзубные ершики.",
	},
};

export const STOMATITIS_APHTHOUS_K120: CanonicalClinicalDiagnosis = {
	id: "diag_stomatitis_aphthous_k120",
	icd10: "K12.0",
	title: "Рецидивирующие афты полости рта (хронический афтозный стоматит)",
	shortTitle: "Афтозный стоматит",
	category: "mucosa_stomatitis",
	toothState: "Healthy",
	clinicalNotes: "Эрозивно-язвенное поражение слизистой оболочки рта с образованием болезненных афт с фибринозным налетом.",
	recommendedServices: [
		{
			id: "srv_k120_mucosa",
			code804n: "A16.07.050",
			title: "Медикаментозная обработка патологических элементов слизистой оболочки рта",
			defaultPriceRub: 1200,
			defaultPriceKopecks: 120000,
			category: "Терапия",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Резкая боль при разговоре и приеме пищи, жжение слизистой оболочки рта.",
		anamnesis: "Рецидивы несколько раз в год, связаны со стрессом, микротравмой.",
		objective: "На слизистой щеки/губы афты округлой формы с ярко-красным ободком гиперемии и фибринозным налетом. Резко болезненны при пальпации.",
		diagnosisText: "K12.0 Рецидивирующие афты полости рта",
		treatmentPlan: "Обезболивание слизистой, антисептическая обработка, кератопластики (Асепта/Солкосерил).",
		recommendations: "Исключение раздражающей пищи, аппликации ранозаживляющих гелей 3-4 раза в день.",
	},
};

export const STOMATITIS_CATARRHAL_K121: CanonicalClinicalDiagnosis = {
	id: "diag_stomatitis_catarrhal_k121",
	icd10: "K12.1",
	title: "Другие формы стоматита (катаральный, травматический стоматит)",
	shortTitle: "Катаральный стоматит",
	category: "mucosa_stomatitis",
	toothState: "Healthy",
	clinicalNotes: "Воспаление слизистой оболочки полости рта без дефектов эпителия, часто на фоне зубных отложений или травм.",
	recommendedServices: [
		{
			id: "srv_k121_antisept",
			code804n: "A11.07.012",
			title: "Антисептическая санация слизистой оболочки рта",
			defaultPriceRub: 900,
			defaultPriceKopecks: 90000,
			category: "Терапия",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Чувство сухости, стянутости или жжения в полости рта, дискомфорт при приеме пищи.",
		anamnesis: "Возникло после ношения неудобного протеза или термического раздражения.",
		objective: "Слизистая оболочка щек гиперемирована, отечна, видны отпечатки зубов. Налета и эрозий нет.",
		diagnosisText: "K12.1 Другие формы стоматита",
		treatmentPlan: "Устранение травмирующего фактора, антисептические орошения, кератопластики.",
		recommendations: "Щадящая диета, полоскания антисептиками 5 дней.",
	},
};

export const WEDGE_DEFECT_K031: CanonicalClinicalDiagnosis = {
	id: "diag_wedge_defect_k031",
	icd10: "K03.1",
	title: "Сошлифовывание зубов (клиновидный дефект твердых тканей)",
	shortTitle: "Клиновидный дефект",
	category: "non_carious",
	toothState: "Watch",
	clinicalNotes: "Некариозный клиновидный дефект твердых тканей в области шейки зуба на вестибулярной поверхности.",
	recommendedServices: [
		{
			id: "srv_k031_restoration",
			code804n: "A16.07.002.010",
			title: "Восстановление зуба микрогибридным/текучим композитом при клиновидном дефекте",
			defaultPriceRub: 3500,
			defaultPriceKopecks: 350000,
			category: "Терапия",
			requiredByDefault: true,
		},
		{
			id: "srv_k031_desens",
			code804n: "A11.07.012",
			title: "Глубокое фторирование и десенситайзинг шейки зуба",
			defaultPriceRub: 900,
			defaultPriceKopecks: 90000,
			category: "Терапия",
			requiredByDefault: false,
		},
	],
	soapTemplate: {
		complaints: "Эстетический дефект в области шейки зуба, чувствительность к холодному и при чистке зубов.",
		anamnesis: "Дефект формировался медленно, пациент отмечает сильное сжатие зубов ночью.",
		objective: "На вестибулярной поверхности V-образный дефект с гладкими плотными стенками. Зондирование безболезненное.",
		diagnosisText: "K03.1 Сошлифовывание зубов (клиновидный дефект)",
		treatmentPlan: "Адгезивная реставрация дефекта эластичным микронаполненным композитом.",
		recommendations: "Исключение жестких щеток, консультация ортопеда/гнатолога.",
	},
};

export const HYPERESTHESIA_K038: CanonicalClinicalDiagnosis = {
	id: "diag_hyperesthesia_k038",
	icd10: "K03.8",
	title: "Другие уточненные болезни твердых тканей зубов (гиперестезия дентина/эмали)",
	shortTitle: "Гиперестезия эмали",
	category: "non_carious",
	toothState: "Healthy",
	clinicalNotes: "Повышенная чувствительность твердых тканей зуба к температурным и тактильным раздражителям без видимого дефекта.",
	recommendedServices: [
		{
			id: "srv_k038_fluor",
			code804n: "A11.07.012",
			title: "Аппликация десенситайзера и глубокое фторирование эмали",
			defaultPriceRub: 1200,
			defaultPriceKopecks: 120000,
			category: "Терапия",
			requiredByDefault: true,
		},
	],
	soapTemplate: {
		complaints: "Резкая кратковременная боль при приеме холодной, горячей, кислой пищи или при вдыхании холодного воздуха.",
		anamnesis: "Появилась после профгигиены или на фоне рецессии десны.",
		objective: "Видимых кариозных полостей нет. Воздушная струя вызывает резкую кратковременную боль. ЭОД 2-6 мкА.",
		diagnosisText: "K03.8 Гиперестезия твердых тканей зубов",
		treatmentPlan: "Покрытие десенситайзером, глубокое фторирование, курс реминерализирующей терапии.",
		recommendations: "Пасты для чувствительных зубов, ограничение кислых напитков.",
	},
};

export const EDENTULISM_PARTIAL_K081: CanonicalClinicalDiagnosis = {
	id: "diag_edentulism_partial_k081",
	icd10: "K08.1",
	title: "Потеря зубов вследствие удаления, травмы или локализованного пародонтита",
	shortTitle: "Вторичная адентия",
	category: "edentulism",
	toothState: "Missing",
	clinicalNotes: "Отсутствие зуба в зубном ряду. Показание к дентальной имплантации или ортопедическому протезированию.",
	recommendedServices: [
		{
			id: "srv_k081_implant",
			code804n: "A16.07.006",
			title: "Установка внутрикостного дентального имплантата",
			defaultPriceRub: 35000,
			defaultPriceKopecks: 3500000,
			category: "Хирургия",
			requiredByDefault: true,
		},
		{
			id: "srv_k081_crown",
			code804n: "A16.07.004",
			title: "Восстановление зуба коронкой постоянной на имплантате",
			defaultPriceRub: 28000,
			defaultPriceKopecks: 2800000,
			category: "Ортопедия",
			requiredByDefault: false,
		},
	],
	soapTemplate: {
		complaints: "Отсутствие зуба, нарушение жевательной функции, смещение соседних зубов, эстетический дефект.",
		anamnesis: "Зуб удален ранее по поводу осложненного кариеса / периодонтита.",
		objective: "Дефект зубного ряда. Слизистая оболочка бледно-розовая. На КЛКТ достаточный объем альвеолярного гребня.",
		diagnosisText: "K08.1 Частичная вторичная адентия",
		treatmentPlan: "3D-планирование имплантации, установка имплантата с формирователем, коронка из диоксида циркония.",
		recommendations: "Профессиональная гигиена полости рта перед хирургическим этапом.",
	},
};

export const PERIODONTAL_AND_OTHER_DIAGNOSES: readonly CanonicalClinicalDiagnosis[] = [
	PERIODONTITIS_ACUTE_K044,
	PERIODONTITIS_CHRONIC_K045,
	GINGIVITIS_ACUTE_K050,
	GINGIVITIS_CHRONIC_K051,
	PERIODONTITIS_CHRONIC_K053,
	STOMATITIS_APHTHOUS_K120,
	STOMATITIS_CATARRHAL_K121,
	WEDGE_DEFECT_K031,
	HYPERESTHESIA_K038,
	EDENTULISM_PARTIAL_K081,
];
