/**
 * apps/web/src/components/consents/consentTemplates.ts
 *
 * Канонический реестр стоматологических шаблонов ИДС (323-ФЗ, 152-ФЗ, Приказ 1051н).
 * Поддержка подстановки плейсхолдеров, законных представителей детей до 15 лет и печати А4.
 * Мандаты 8b, 8e, 8x, 8ap.
 */

import {
	CANONICAL_CONSENT_CATALOG,
	generateConsentPrintHtml,
	getConsentDocumentById,
	type ConsentDocumentId,
} from "./consentCatalogData";

export { generateConsentPrintHtml } from "./consentCatalogData";

export type ConsentTemplateKey =
	| "CONSENT_THERAPY"
	| "CONSENT_SURGERY_IMPLANT"
	| "CONSENT_ORTHODONTICS"
	| "CONSENT_ORTHOPEDICS"
	| "CONSENT_HYGIENE_BLEACHING"
	| "CONSENT_ANESTHESIA"
	| "CONSENT_PERSONAL_DATA"
	| "CONSENT_INSPECTION_1051N"
	| "CONSENT_PEDIATRIC"
	| "CONSENT_PERIODONTICS"
	| "CONSENT_SURGERY_EXTRACTION"
	| "CONSENT_IMPLANTOLOGY"
	| "CONSENT_SINUS_LIFT"
	| "CONSENT_OSTEOINTEGRATION_RISKS"
	| "CONSENT_ORTHO_HYGIENE"
	| "CONSENT_SEDATION"
	| "CONSENT_TREATMENT_REFUSAL"
	| "CONSENT_EGISZ_REFUSAL"
	| "CONSENT_WARRANTY_PASSPORT"
	| "CONSENT_WARRANTY_POLICY"
	| "CONSENT_PHOTOPROTOCOL"
	| "CONSENT_HEALTH_QUESTIONNAIRE"
	| "CONSENT_PAID_CONTRACT";

export interface ConsentSection {
	id: string;
	title: string;
	content: string;
	bullets?: string[];
}

export interface ConsentTemplate {
	key: ConsentTemplateKey;
	title: string;
	subtitle: string;
	category: string;
	statutoryBasis: string;
	mandatoryPlaceholders: string[];
	sections: ConsentSection[];
	aftercareInstructions: string[];
	riskFactors: string[];
	alternativeTreatments: string[];
}

export interface ConsentSubstitutionContext {
	patientName?: string;
	birthDate?: string;
	passport?: string;
	phone?: string;
	doctorName?: string;
	clinicName?: string;
	clinicLegalName?: string;
	diagnosisIcd?: string;
	toothNumbers?: string;
	date?: string;
	patientAgeYears?: number;
	guardianName?: string;
	guardianRelation?: string;
	guardianDocument?: string;
	[key: string]: unknown;
}

export interface RenderedConsentTemplate {
	title: string;
	subtitle: string;
	statutoryBasis: string;
	renderedSections: Array<{ id: string; title: string; content: string; bullets?: string[] }>;
	aftercareInstructions: string[];
	riskFactors: string[];
	alternativeTreatments: string[];
	fullTextContent: string;
}

const COMMON_PLACEHOLDERS = ["PATIENT_NAME", "BIRTH_DATE", "DOCTOR_NAME", "CLINIC_NAME"];

export const CONSENT_THERAPY: ConsentTemplate = {
	key: "CONSENT_THERAPY",
	title: "Информированное добровольное согласие на терапевтическое лечение и эндодонтию",
	subtitle: "Лечение кариеса, некариозных поражений, эстетическая реставрация и лечение корневых каналов",
	category: "therapy",
	statutoryBasis: "Федеральный закон № 323-ФЗ ст. 20 • Клинические рекомендации СтАР",
	mandatoryPlaceholders: [...COMMON_PLACEHOLDERS, "DIAGNOSIS_ICD", "TOOTH_NUMBERS"],
	sections: [
		{
			id: "s1",
			title: "1. Суть и цель терапевтического вмешательства",
			content: "Препарирование пораженных кариесом тканей зуба {{TOOTH_NUMBERS}}, медикаментозная обработка полости, изоляция рабочего поля системой коффердам, анатомическое моделирование коронки светоотверждаемым композитом.",
			bullets: [
				"Обязательное применение изолирующей системы коффердам для защиты от ротовой жидкости и бактерий;",
				"Использование адгезивных протоколов последнего поколения;",
				"Оценка индекса разрушения окклюзионной поверхности зуба (ИРОПЗ) при выборе прямой реставрации или ортопедической вкладки.",
			],
		},
		{
			id: "s2",
			title: "2. Возможные сопутствующие риски и особенности заживления",
			content: "Врач разъяснил пациенту вероятность временных реакций окружающих тканей после терапевтического лечения.",
			bullets: [
				"Вероятность возникновения постпломбировочных болей и чувствительности при накусывании в течение 3–7 дней;",
				"Риск скрытого воспаления пульпы при лечении глубокого кариеса с необходимостью последующей эндодонтии;",
				"Возможность микроподтекания при несоблюдении гигиены.",
			],
		},
		{
			id: "s3",
			title: "3. Альтернативные методы и гарантии клиники",
			content: "Пациенту предложены варианты терапевтического и ортопедического восстановления зуба.",
			bullets: [
				"Изготовление керамической вкладки при разрушении коронки более 50% (высокий ИРОПЗ);",
				"Гарантийные обязательства клиники при условии регулярных профилактических осмотров.",
			],
		},
	],
	aftercareInstructions: [
		"Не принимать пищу до полного окончания действия местной анестезии.",
		"Исключить красящие продукты в первые 24 часа после полировки реставрации.",
	],
	riskFactors: [
		"Постпломбировочная чувствительность.",
		"Обострение хронического периодонтита при эндодонтическом лечении.",
	],
	alternativeTreatments: ["Керамическая вкладка", "Ортопедическая коронка"],
};

export const CONSENT_SURGERY_IMPLANT: ConsentTemplate = {
	key: "CONSENT_SURGERY_IMPLANT",
	title: "Информированное добровольное согласие на хирургическое вмешательство, удаление зубов и дентальную имплантацию",
	subtitle: "Атравматичное удаление зубов, синус-лифтинг, остеопластика и установка дентальных имплантатов",
	category: "surgery",
	statutoryBasis: "Федеральный закон № 323-ФЗ ст. 20 • Протоколы СтАР и ITI",
	mandatoryPlaceholders: [...COMMON_PLACEHOLDERS, "TOOTH_NUMBERS"],
	sections: [
		{
			id: "s1",
			title: "1. План хирургического вмешательства",
			content: "Проведение местной анестезии, разрез слизистой, атравматичное удаление корней или препарирование костного ложа с обильным охлаждением физраствором.",
			bullets: [
				"Остеопластика и открытый/закрытый синус-лифтинг с мобилизацией мембраны Шнайдера при дефиците кости;",
				"Установка титанового имплантата с контролем торка первичной стабильности;",
				"Наложение атравматичных хирургических швов.",
			],
		},
		{
			id: "s2",
			title: "2. Специфические анатомические риски",
			content: "Хирург ознакомил пациента с топографией сосудисто-нервных пучков челюстно-лицевой области по данным 3D КЛКТ.",
			bullets: [
				"Риск кратковременного сдавления или травмы нижнеальвеолярного нерва (IAN) с временным онемением губы;",
				"Риск перфорации слизистой оболочки гайморовой пазухи (мембраны Шнайдера) при синус-лифтинге;",
				"Вероятность биологического отторжения или дезинтеграции имплантата (статистически 1–2%).",
			],
		},
		{
			id: "s3",
			title: "3. Послеоперационный режим",
			content: "Пациент обязуется строго соблюдать предписания врача, принимать антибактериальную терапию и явиться на снятие швов.",
		},
	],
	aftercareInstructions: [
		"Прикладывать холод к щеке интервалами по 15 минут в первые 4 часа.",
		"Исключить бани, сауны, горячую ванну и тяжелые физические нагрузки на 7 дней.",
	],
	riskFactors: [
		"Послеоперационный реактивный отек мягких тканей лица до 3–5 суток.",
		"Риск дезинтеграции имплантата при неудовлетворительной гигиене или курении.",
	],
	alternativeTreatments: ["Мостовидный протез", "Съемное протезирование"],
};

export const CONSENT_ORTHODONTICS: ConsentTemplate = {
	key: "CONSENT_ORTHODONTICS",
	title: "Информированное добровольное согласие на ортодонтическое лечение",
	subtitle: "Исправление аномалий прикуса и положения зубов брекет-системами и элайнерами",
	category: "ortho",
	statutoryBasis: "Федеральный закон № 323-ФЗ ст. 20 • Протоколы Профессионального общества ортодонтов России",
	mandatoryPlaceholders: [...COMMON_PLACEHOLDERS],
	sections: [
		{
			id: "s1",
			title: "1. План аппаратурного перемещения зубов",
			content: "Фиксация брекет-системы или серия элайнеров для нормализации окклюзии и эстетики зубных рядов. Средняя длительность лечения составляет от 12 до 30 месяцев.",
		},
		{
			id: "s2",
			title: "2. Риски при ортодонтическом лечении",
			content: "Ортодонт предупредил пациента о необходимости идеальной гигиены для защиты эмали.",
			bullets: [
				"Риск очаговой деминерализации эмали (белые пятна) вокруг брекетов при недостаточной гигиене;",
				"Риск верхушечной резорбции верхушек корней при индивидуальной реакции костной ткани;",
				"Болезненность зубов после плановой активации аппаратуры в течение 3–5 дней.",
			],
		},
		{
			id: "s3",
			title: "3. Ретенционный период",
			content: "После завершения активного перемещения обязателен ретенционный период, фиксация несъемных проволочных ретейнеров и ношение ночных капп. Ретенционный период предотвращает рецидив смещения зубов.",
		},
	],
	aftercareInstructions: [
		"Использовать ортодонтические ершики, монопучковые щетки и ирригатор после каждого приема пищи.",
		"Являться на контрольные активации строго по графику.",
	],
	riskFactors: ["Рецидив скученности при отказе от ретенционных аппаратов"],
	alternativeTreatments: ["Компромиссная терапия", "Ортогнатическая хирургия при скелетных формах"],
};

export const CONSENT_ORTHOPEDICS: ConsentTemplate = {
	key: "CONSENT_ORTHOPEDICS",
	title: "Информированное добровольное согласие на ортопедическое лечение и протезирование",
	subtitle: "Восстановление дефектов зубных рядов коронками, винирами, вкладками и протезами",
	category: "ortho",
	statutoryBasis: "Федеральный закон № 323-ФЗ ст. 20 • Протоколы ортопедической секции СтАР",
	mandatoryPlaceholders: [...COMMON_PLACEHOLDERS, "TOOTH_NUMBERS"],
	sections: [
		{
			id: "s1",
			title: "1. Ортопедический протокол восстановления",
			content: "Препарирование твердых тканей опорных зубов с формированием кругового уступа, получение прецизионных оттисков, изготовление и фиксация коронок/протезов.",
			bullets: [
				"Необходимость сошлифовывания определенного слоя эмали и дентина при препарировании;",
				"Возможность депульпирования зуба по строгим ортопедическим показаниям при выраженном наклоне;",
				"Временная фиксация провизорных пластмассовых коронок для защиты витальных культей.",
			],
		},
		{
			id: "s2",
			title: "2. Эксплуатационные риски и адаптация",
			content: "Период адаптации к ортопедической конструкции составляет от 3 до 14 дней.",
			bullets: [
				"Риск скола керамической облицовки при бруксизме или травматической перегрузке;",
				"Вероятна рецессия десны в пришеечной зоне опорного зуба с течением времени;",
				"Необходимость регулярной профессиональной чистки протезов.",
			],
		},
		{
			id: "s3",
			title: "3. Гарантии и обязательства",
			content: "Клиника предоставляет гарантию на целостность протеза при условии посещения плановых осмотров раз в 6 месяцев.",
		},
	],
	aftercareInstructions: [
		"Использовать суперфлосс и межзубные ершики для промывных зон мостовидных протезов.",
		"При появлении дискомфорта в прикусе незамедлительно обратиться для коррекции.",
	],
	riskFactors: ["Скол керамики при парафункциях жевательных мышц"],
	alternativeTreatments: ["Терапевтическая композитная реставрация", "Имплантация"],
};

export const CONSENT_HYGIENE_BLEACHING: ConsentTemplate = {
	key: "CONSENT_HYGIENE_BLEACHING",
	title: "Информированное добровольное согласие на профессиональную гигиену и отбеливание",
	subtitle: "Ультразвуковой скейлинг, Air-Flow, полировка эмали и клиническое отбеливание зубов",
	category: "therapy",
	statutoryBasis: "Федеральный закон № 323-ФЗ ст. 20 • Профилактические рекомендации СтАР",
	mandatoryPlaceholders: [...COMMON_PLACEHOLDERS],
	sections: [
		{
			id: "s1",
			title: "1. Процедура комплексной гигиены и осветления",
			content: "Снятие минерализованных над- и поддесневых зубных отложений ультразвуком, воздушно-абразивная обработка порошком на основе глицина/эритритола, фторирование.",
			bullets: [
				"Возможная кратковременная гиперестезия и повышенная чувствительность шеек зубов на холодное/горячее 24–48 часов;",
				"Строгое соблюдение белой (прозрачной) диеты в течение 48 часов после клинического отбеливания;",
				"Незначительная кровоточивость воспаленной маргинальной десны в день процедуры.",
			],
		},
		{
			id: "s2",
			title: "2. Ограничения процедуры",
			content: "Отбеливание осветляет только натуральные ткани зубов и не меняет цвет ранее установленных пломб и коронок.",
		},
		{
			id: "s3",
			title: "3. Индивидуальный уход",
			content: "Врач подобрал средства индивидуальной гигиены и обучил правильной технике чистки зубов.",
		},
	],
	aftercareInstructions: [
		"Соблюдать белую диету (исключить кофе, чай, свеклу, ягоды, красное вино, соевый соус) на 48 часов.",
		"Заменить зубную щетку на новую мягкую после процедуры.",
	],
	riskFactors: ["Кратковременная гиперестезия зубов"],
	alternativeTreatments: ["Домашнее отбеливание в индивидуальных каппах"],
};

export const CONSENT_ANESTHESIA: ConsentTemplate = {
	key: "CONSENT_ANESTHESIA",
	title: "Информированное добровольное согласие на местное обезболивание (анестезию)",
	subtitle: "Инфильтрационная, проводниковая, интралигаментарная анестезия артикаиновым рядом",
	category: "therapy",
	statutoryBasis: "Федеральный закон № 323-ФЗ ст. 20 • Клинические рекомендации Федерации анестезиологов",
	mandatoryPlaceholders: [...COMMON_PLACEHOLDERS],
	sections: [
		{
			id: "s1",
			title: "1. Метод местного обезболивания",
			content: "Введение современных амидных анестетиков артикаинового ряда с вазоконстриктором (эпинефрином) карпульным инъектором для полного блокирования болевых рецепторов.",
			bullets: [
				"Ощущение полного онемения губы, щеки, языка и десны на период от 2 до 5 часов;",
				"Вероятность образования гематомы в месте вкола иглы;",
				"Возможное учащение сердцебиения (тахикардия) из-за действия эпинефрина;",
				"Кратковременный тризм (затруднение широкого открывания рта) при проводниковой анестезии на нижней челюсти.",
			],
		},
		{
			id: "s2",
			title: "2. Меры безопасности пациента",
			content: "Категорически запрещается принимать горячую пищу и напитки до полного восстановления чувствительности во избежание термических ожогов и тяжелого прикусывания онемевших тканей.",
		},
		{
			id: "s3",
			title: "3. Контроль состояния",
			content: "При сохранении онемения более 6 часов пациент обязуется связаться с лечащим врачом клиники.",
		},
	],
	aftercareInstructions: [
		"Не принимать пищу до восстановления чувствительности мягких тканей.",
		"Не растирать и не массировать место инъекции.",
	],
	riskFactors: ["Гематома в области вкола", "Индивидуальная реакция на адреналин"],
	alternativeTreatments: ["Лечение под седацией ЗАКС", "Общая анестезия в условиях стационара"],
};

export const CONSENT_PERSONAL_DATA: ConsentTemplate = {
	key: "CONSENT_PERSONAL_DATA",
	title: "Согласие на обработку персональных данных",
	subtitle: "Сбор, систематизация, хранение медицинской тайны и передача в защищенные государственные контуры",
	category: "legal",
	statutoryBasis: "Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных» (ст. 6, 9, 10) • Приказ Минздрава РФ № 1051н",
	mandatoryPlaceholders: [...COMMON_PLACEHOLDERS, "PASSPORT"],
	sections: [
		{
			id: "s1",
			title: "1. Цели и объем обработки данных",
			content: "Оформление медицинской карты приёма, организация приема, смс-оповещения о визитах, исполнение договора и передача сведений в единую государственную систему ЕГИСЗ и подсистему ФРЭМД в соответствии с законодательством РФ.",
		},
		{
			id: "s2",
			title: "2. Срок действия и конфиденциальность",
			content: "Сведения составляют врачебную тайну, хранятся в защищенном контуре клиники в течение 25 лет согласно сроку архивного хранения медицинской карты приёма и не подлежат распространению третьим лицам без законных оснований.",
		},
		{
			id: "s3",
			title: "3. Права субъекта персональных данных",
			content: "Субъект персональных данных имеет право на доступ к своим данным и отзыв согласия в предусмотренном законом порядке.",
		},
	],
	aftercareInstructions: [],
	riskFactors: [],
	alternativeTreatments: [],
};

export const CONSENT_INSPECTION_1051N: ConsentTemplate = {
	key: "CONSENT_INSPECTION_1051N",
	title: "Информированное добровольное согласие на первичный осмотр и обследование",
	subtitle: "Базовое информированное согласие на амбулаторный прием и диагностику",
	category: "statutory",
	statutoryBasis: "Приказ Минздрава России от 12.11.2021 № 1051н • Федеральный закон № 323-ФЗ ст. 20",
	mandatoryPlaceholders: [...COMMON_PLACEHOLDERS],
	sections: [
		{
			id: "s1",
			title: "1. Объем диагностических мероприятий",
			content: "Сбор жалоб и анамнеза, визуальный осмотр полости рта, пальпация, перкуссия зубов, зондирование пародонтальных карманов, прицельная цифровая визиография.",
		},
		{
			id: "s2",
			title: "2. Информирование пациента",
			content: "Врач разъяснил предварительный диагноз, план обследования и ответил на все интересующие вопросы понятным языком.",
		},
		{
			id: "s3",
			title: "3. Добровольное решение",
			content: "Пациент подтверждает согласие на проведение первичного осмотра и диагностических манипуляций.",
		},
	],
	aftercareInstructions: [],
	riskFactors: [],
	alternativeTreatments: [],
};

export const CONSENT_PEDIATRIC: ConsentTemplate = {
	key: "CONSENT_PEDIATRIC",
	title: "Информированное добровольное согласие законного представителя на детское стоматологическое лечение",
	subtitle: "Оказание стоматологической помощи несовершеннолетнему гражданину в возрасте до 15 лет",
	category: "pediatric",
	statutoryBasis: "Приказ Минздрава РФ № 1051н • Федеральный закон № 323-ФЗ ст. 20 ч. 2",
	mandatoryPlaceholders: [...COMMON_PLACEHOLDERS],
	sections: [
		{
			id: "s1",
			title: "1. Полномочия законного представителя",
			content: "Настоящее согласие дается родителем, усыновителем или опекуном, действующим в качестве законного представителя несовершеннолетнего гражданина. Я, являясь законным представителем ребенка, подтверждаю согласие на стоматологическое обследование и терапевтическое лечение.",
		},
		{
			id: "s2",
			title: "2. Предупреждение о травмах после анестезии",
			content: "Родитель предупрежден о необходимости непрерывного контроля за ребенком до отхождения анестезии во избежание травматического прикусывания онемевших губ, языка и щек.",
			bullets: [
				"Высокий риск глубокого прикусывания онемевших губ, языка и щек ребенком до крови;",
				"Категорический запрет на прием твердой и горячей пищи до полного восстановления чувствительности;",
				"Необходимость бережного психологического контакта с ребенком.",
			],
		},
		{
			id: "s3",
			title: "3. Рекомендации по адаптации",
			content: "Прием проводится в доброжелательной обстановке с психологической поддержкой ребенка.",
		},
	],
	aftercareInstructions: [
		"Не спускать глаз с ребенка до восстановления чувствительности губ во избежание прикусывания.",
	],
	riskFactors: ["Случайное самоприкусывание онемевшей губы ребенком"],
	alternativeTreatments: ["Лечение с применением седации ЗАКС"],
};

export const CONSENT_PERIODONTICS: ConsentTemplate = {
	key: "CONSENT_PERIODONTICS",
	title: "Информированное добровольное согласие на пародонтологическое лечение",
	subtitle: "Консервативная и хирургическая пародонтология, вектор-терапия, закрытый кюретаж",
	category: "periodontics",
	statutoryBasis: "Клинические рекомендации СтАР по пародонтологии",
	mandatoryPlaceholders: ["Ф.И.О. пациента", "Дата рождения пациента", "Ф.И.О. лечащего врача"],
	sections: [
		{
			id: "s1",
			title: "1. Суть и цели пародонтологического вмешательства",
			content: "Устранение поддесневой микробной биопленки, минерализованных зубных отложений и грануляций для купирования воспалительного процесса в тканях пародонта.",
			bullets: [
				"Ультразвуковой поддесневой скейлинг и Vector-полировка корней;",
				"Медикаментозная антисептическая обработка пародонтальных карманов;",
				"Обучение гигиене и подбор индивидуальных средств ухода.",
			],
		},
		{
			id: "s2",
			title: "2. Возможные реакции и необходимость диспансерного наблюдения",
			content: "Возможна кратковременная гиперестезия шеек зубов и незначительная ретракция десневого края. Хронический пародонтит требует поддерживающей терапии каждые 3–4 месяца.",
		},
	],
	aftercareInstructions: [
		"Использовать антисептические ополаскиватели по назначению врача.",
		"Соблюдать атравматичную технику чистки мягкой щеткой.",
		"Явиться на контрольный осмотр через 14 дней.",
	],
	riskFactors: ["Повышенная чувствительность шеек зубов", "Рецессия десны при убыли костной ткани"],
	alternativeTreatments: ["Хирургическое лоскутное вмешательство при глубоких карманах"],
};

export const CONSENT_SURGERY_EXTRACTION: ConsentTemplate = {
	key: "CONSENT_SURGERY_EXTRACTION",
	title: "Информированное добровольное согласие на хирургическую операцию удаления зуба",
	subtitle: "Простое, сложное или атипичное удаление зуба, резекция верхушки корня",
	category: "surgery",
	statutoryBasis: "Клинические рекомендации СтАР по хирургической стоматологии",
	mandatoryPlaceholders: ["Ф.И.О. пациента", "Дата рождения пациента", "Ф.И.О. лечащего врача"],
	sections: [
		{
			id: "s1",
			title: "1. Показания и характер хирургического вмешательства",
			content: "Атравматичное удаление зуба по медицинским показаниям с сохранением костных стенок альвеолы.",
			bullets: [
				"Местная проводниковая или инфильтрационная анестезия;",
				"Бережная люксация корней без компрессии кости;",
				"Ревизия лунки, медикаментозная обработка и наложение швов при необходимости.",
			],
		},
		{
			id: "s2",
			title: "2. Послеоперационный режим и риски",
			content: "Возможен послеоперационный отек мягких тканей до 3 суток, болезненность и гематома. Категорически запрещено полоскать рот в первые сутки во избежание вымывания сгустка.",
		},
	],
	aftercareInstructions: [
		"Не принимать пищу 2 часа после операции, не пить горячее в день удаления.",
		"Не полоскать полость рта, не прогревать область вмешательства.",
		"Принимать назначенные врачом препараты.",
	],
	riskFactors: ["Послеоперационный отек и болезненность", "Риск альвеолита при раннем вымывании сгустка"],
	alternativeTreatments: ["Попытка зубосохраняющего эндодонтического перелечивания (если допустимо)"],
};

export const CONSENT_IMPLANTOLOGY: ConsentTemplate = {
	...CONSENT_SURGERY_IMPLANT,
	key: "CONSENT_IMPLANTOLOGY",
	title: "Информированное добровольное согласие на дентальную имплантацию",
};

export const CONSENT_SINUS_LIFT: ConsentTemplate = {
	...CONSENT_SURGERY_IMPLANT,
	key: "CONSENT_SINUS_LIFT",
	title: "Информированное добровольное согласие на операцию синус-лифтинга и костной пластики",
	subtitle: "Открытый или закрытый субантральный аугментационный протокол",
};

export const CONSENT_OSTEOINTEGRATION_RISKS: ConsentTemplate = {
	...CONSENT_SURGERY_IMPLANT,
	key: "CONSENT_OSTEOINTEGRATION_RISKS",
	title: "Информированное согласие с разъяснением рисков остеоинтеграции имплантатов",
};

export const CONSENT_ORTHO_HYGIENE: ConsentTemplate = {
	...CONSENT_HYGIENE_BLEACHING,
	key: "CONSENT_ORTHO_HYGIENE",
	title: "Информированное добровольное согласие на профессиональную гигиену при ортодонтическом лечении",
};

export const CONSENT_SEDATION: ConsentTemplate = {
	key: "CONSENT_SEDATION",
	title: "Информированное добровольное согласие на проведение ингаляционной седации (ЗАКС)",
	subtitle: "Снятие эмоционального напряжения смесью закиси азота и кислорода",
	category: "anesthesia",
	statutoryBasis: "Стандарты безопасности седации в амбулаторной стоматологии",
	mandatoryPlaceholders: ["Ф.И.О. пациента", "Дата рождения пациента", "Ф.И.О. лечащего врача"],
	sections: [
		{
			id: "s1",
			title: "1. Суть методики седации закисью азота",
			content: "Ингаляционная подача смеси через носовую маску. Пациент находится в полном сознании, сохраняя защитные рефлексы и способность контакта с врачом.",
		},
		{
			id: "s2",
			title: "2. Быстрое восстановление",
			content: "Препарат полностью элиминируется легкими в течение 5 минут дыхания 100% кислородом в завершении процедуры.",
		},
	],
	aftercareInstructions: ["Пациент может вернуться к обычному распорядку сразу после окончания приема."],
	riskFactors: ["Легкое головокружение в первые минуты"],
	alternativeTreatments: ["Лечение под местной анестезией без седации"],
};

export const CONSENT_TREATMENT_REFUSAL: ConsentTemplate = {
	key: "CONSENT_TREATMENT_REFUSAL",
	title: "Отказ от медицинского вмешательства",
	subtitle: "Информированный отказ пациента или законного представителя от предложенного объема лечения",
	category: "legal",
	statutoryBasis: "Статья 20 Федерального закона от 21.11.2011 № 323-ФЗ",
	mandatoryPlaceholders: ["Ф.И.О. пациента", "Дата рождения пациента", "Ф.И.О. лечащего врача"],
	sections: [
		{
			id: "s1",
			title: "1. Осознанный отказ",
			content: "Мне в доступной форме разъяснены диагноз, цели и характер медицинского вмешательства, а также возможные риски и последствия отказа от него.",
		},
		{
			id: "s2",
			title: "2. Риски прогрессирования заболевания",
			content: "Я предупрежден, что отказ от лечения может повлечь развитие острых гнойно-воспалительных процессов, разрушение зуба и его последующую утрату.",
		},
	],
	aftercareInstructions: ["При возникновении боли незамедлительно обратиться в клинику."],
	riskFactors: ["Прогрессирование заболевания", "Потеря зуба", "Одонтогенные осложнения"],
	alternativeTreatments: ["Проведение рекомендованного врачом лечения"],
};

export const CONSENT_EGISZ_REFUSAL: ConsentTemplate = {
	...CONSENT_TREATMENT_REFUSAL,
	key: "CONSENT_EGISZ_REFUSAL",
	title: "Отказ от передачи сведений в ЕГИСЗ",
	subtitle: "Заявление о запрете передачи персональных медицинских данных в сторонние информационные системы",
};

export const CONSENT_WARRANTY_PASSPORT: ConsentTemplate = {
	...CONSENT_THERAPY,
	key: "CONSENT_WARRANTY_PASSPORT",
	title: "Гарантийный паспорт стоматологического пациента",
	subtitle: "Условия и сроки сохранения гарантии на выполненные ортопедические и терапевтические конструкции",
	category: "legal",
};

export const CONSENT_WARRANTY_POLICY: ConsentTemplate = {
	...CONSENT_WARRANTY_PASSPORT,
	key: "CONSENT_WARRANTY_POLICY",
	title: "Положение о гарантийных обязательствах клиники",
};

export const CONSENT_PHOTOPROTOCOL: ConsentTemplate = {
	key: "CONSENT_PHOTOPROTOCOL",
	title: "Согласие на проведение диагностического фотопротокола",
	subtitle: "Дентальная фото- и видеосъемка этапов лечения для контроля качества и консилиумов",
	category: "legal",
	statutoryBasis: "Статья 152.1 Гражданского кодекса РФ",
	mandatoryPlaceholders: ["Ф.И.О. пациента", "Дата рождения пациента", "Ф.И.О. лечащего врача"],
	sections: [
		{
			id: "s1",
			title: "1. Цели фотопротокола",
			content: "Проведение внутриротовой и портретной фотосъемки до, в процессе и после завершения лечения для оценки динамики и планирования реставраций.",
		},
	],
	aftercareInstructions: [],
	riskFactors: [],
	alternativeTreatments: [],
};

export const CONSENT_HEALTH_QUESTIONNAIRE: ConsentTemplate = {
	key: "CONSENT_HEALTH_QUESTIONNAIRE",
	title: "Анкета о состоянии соматического здоровья пациента",
	subtitle: "Опросник общего анамнеза, хронических заболеваний и сопутствующей фармакотерапии",
	category: "legal",
	statutoryBasis: "Приказ Минздрава России № 804н",
	mandatoryPlaceholders: ["Ф.И.О. пациента", "Дата рождения пациента"],
	sections: [
		{
			id: "s1",
			title: "1. Полнота и достоверность сведений",
			content: "Пациент подтверждает достоверность сообщенных сведений об аллергических реакциях, перенесенных операциях и принимаемых лекарствах.",
		},
	],
	aftercareInstructions: ["Своевременно информировать врача об изменении состояния здоровья."],
	riskFactors: [],
	alternativeTreatments: [],
};

export const CONSENT_PAID_CONTRACT: ConsentTemplate = {
	key: "CONSENT_PAID_CONTRACT",
	title: "Согласие с условиями договора на оказание платных медицинских услуг",
	subtitle: "Договор с клиникой, порядок расчетов, гарантии и налоговый вычет",
	category: "legal",
	statutoryBasis: "Постановление Правительства РФ от 11.05.2023 № 736",
	mandatoryPlaceholders: ["Ф.И.О. пациента", "Дата рождения пациента"],
	sections: [
		{
			id: "s1",
			title: "1. Порядок оказания и оплаты услуг",
			content: "Клиника оказывает медицинские услуги, соответствующие стандартам, а Пациент оплачивает их согласно прейскуранту с выдачей кассового чека.",
		},
		{
			id: "s2",
			title: "2. Налоговый вычет",
			content: "По заявлению пациента клиника выдает комплект документов и справку об оплате медицинских услуг по форме КНД 1151156 для ФНС.",
		},
	],
	aftercareInstructions: ["Сохранять чеки и договор для оформления социального налогового вычета."],
	riskFactors: [],
	alternativeTreatments: [],
};

export const CONSENT_TEMPLATES: Record<ConsentTemplateKey, ConsentTemplate> = {
	CONSENT_THERAPY,
	CONSENT_SURGERY_IMPLANT,
	CONSENT_ORTHODONTICS,
	CONSENT_ORTHOPEDICS,
	CONSENT_HYGIENE_BLEACHING,
	CONSENT_ANESTHESIA,
	CONSENT_PERSONAL_DATA,
	CONSENT_INSPECTION_1051N,
	CONSENT_PEDIATRIC,
	CONSENT_PERIODONTICS,
	CONSENT_SURGERY_EXTRACTION,
	CONSENT_IMPLANTOLOGY,
	CONSENT_SINUS_LIFT,
	CONSENT_OSTEOINTEGRATION_RISKS,
	CONSENT_ORTHO_HYGIENE,
	CONSENT_SEDATION,
	CONSENT_TREATMENT_REFUSAL,
	CONSENT_EGISZ_REFUSAL,
	CONSENT_WARRANTY_PASSPORT,
	CONSENT_WARRANTY_POLICY,
	CONSENT_PHOTOPROTOCOL,
	CONSENT_HEALTH_QUESTIONNAIRE,
	CONSENT_PAID_CONTRACT,
};

export function getAllConsentTemplates(): ConsentTemplate[] {
	return [
		CONSENT_THERAPY,
		CONSENT_SURGERY_IMPLANT,
		CONSENT_ORTHODONTICS,
		CONSENT_ORTHOPEDICS,
		CONSENT_HYGIENE_BLEACHING,
		CONSENT_ANESTHESIA,
		CONSENT_PERSONAL_DATA,
		CONSENT_INSPECTION_1051N,
		CONSENT_PEDIATRIC,
	];
}

export function getConsentTemplate(key: string): ConsentTemplate {
	if (key in CONSENT_TEMPLATES) {
		return CONSENT_TEMPLATES[key as ConsentTemplateKey];
	}
	const lower = String(key || "").toLowerCase();
	const all = Object.values(CONSENT_TEMPLATES);
	const exactMatch = all.find((t) => t.key.toLowerCase() === lower);
	if (exactMatch) return exactMatch;

	const partialMatch = all.find(
		(t) =>
			t.key.toLowerCase().includes(lower) ||
			lower.includes(t.key.toLowerCase().replace("consent_", "")) ||
			lower.includes(t.category),
	);
	return partialMatch || CONSENT_THERAPY;
}

export function getMissingRequiredPlaceholders(
	template: ConsentTemplate,
	context: ConsentSubstitutionContext = {},
): string[] {
	const missing: string[] = [];
	if (!context.patientName) missing.push("Ф.И.О. пациента");
	if (!context.birthDate) missing.push("Дата рождения пациента");
	if (!context.doctorName) missing.push("Ф.И.О. лечащего врача");
	return missing;
}

export function substitutePlaceholders(text: string, context: ConsentSubstitutionContext = {}): string {
	if (!text) return "";
	let result = text;

	// Подстановка данных несовершеннолетнего и законного представителя
	if (context.guardianName && context.patientAgeYears !== undefined && context.patientAgeYears < 15) {
		const repPhrase = `Я, ${context.guardianName}, являясь законным представителем несовершеннолетнего ${context.patientName || ""},`;
		result = result.replace(/Я,\s*\{\{PATIENT_NAME\}\},/g, repPhrase);
	}

	result = result.replace(/\{\{PATIENT_NAME\}\}/g, String(context.patientName || "—"));
	result = result.replace(/\{\{BIRTH_DATE\}\}/g, String(context.birthDate || "—"));
	result = result.replace(/\{\{PASSPORT\}\}/g, String(context.passport || "—"));
	result = result.replace(/\{\{DOCTOR_NAME\}\}/g, String(context.doctorName || "—"));
	result = result.replace(/\{\{CLINIC_NAME\}\}/g, String(context.clinicName || "—"));
	result = result.replace(/\{\{CLINIC_LEGAL_NAME\}\}/g, String(context.clinicLegalName || context.clinicName || "—"));
	result = result.replace(/\{\{DIAGNOSIS_ICD\}\}/g, String(context.diagnosisIcd || "—"));
	result = result.replace(/\{\{TOOTH_NUMBERS\}\}/g, String(context.toothNumbers || "—"));
	result = result.replace(/\{\{DATE\}\}/g, String(context.date || new Date().toLocaleDateString("ru-RU")));

	return result;
}

export function renderConsentTemplate(
	template: ConsentTemplate,
	context: ConsentSubstitutionContext = {},
): RenderedConsentTemplate {
	const renderedSections = template.sections.map((section, idx) => {
		let content = substitutePlaceholders(section.content, context);
		if (idx === 0 && context.guardianName && context.patientAgeYears !== undefined && context.patientAgeYears < 15) {
			if (!content.includes(context.guardianName)) {
				content = `Я, ${context.guardianName}, являясь законным представителем (мать/отец/опекун) несовершеннолетнего ${context.patientName || ""}, даю информированное согласие. ` + content;
			}
		}
		return {
			id: section.id,
			title: substitutePlaceholders(section.title, context),
			content,
			bullets: section.bullets?.map((b) => substitutePlaceholders(b, context)),
		};
	});

	const lines: string[] = [];
	lines.push(template.title);
	lines.push(template.subtitle);
	if (context.patientName) lines.push(`Пациент: ${context.patientName}`);
	if (context.toothNumbers) lines.push(`Зубы: ${context.toothNumbers}`);
	if (context.guardianName) lines.push(`Законный представитель: ${context.guardianName}`);

	for (const s of renderedSections) {
		lines.push(s.title);
		lines.push(s.content);
		if (s.bullets && s.bullets.length > 0) {
			for (const b of s.bullets) {
				lines.push(`• ${b}`);
			}
		}
	}

	const fullTextContent = lines.join("\n\n");

	return {
		title: template.title,
		subtitle: template.subtitle,
		statutoryBasis: template.statutoryBasis,
		renderedSections,
		aftercareInstructions: template.aftercareInstructions || [],
		riskFactors: template.riskFactors || [],
		alternativeTreatments: template.alternativeTreatments || [],
		fullTextContent,
	};
}

export function printHtmlViaWindowOrIframe(html: string): void {
	if (typeof window === "undefined") return;
	const win = window.open("", "_blank");
	if (win) {
		win.document.open();
		win.document.write(html);
		win.document.close();
		setTimeout(() => win.print(), 250);
	}
}

export function generateMinorConsentPrintHtml(params: {
	clinicName?: string;
	representativeName?: string;
	childName?: string;
	doctorName?: string;
	date?: string;
}): string {
	const clinicName = params?.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const repName = params?.representativeName || "______________________________";
	const childName = params?.childName || "______________________________";
	const docName = params?.doctorName || "Детский врач-стоматолог";
	const dateStr = params?.date || new Date().toLocaleDateString("ru-RU");

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>ИДС на лечение несовершеннолетнего</title>
<style>@page { size: A4 portrait; margin: 15mm; } body { font-family: sans-serif; font-size: 10pt; line-height: 1.4; color: #0f172a; margin: 0; }
.header { border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 12px; } h1 { font-size: 13pt; font-weight: 700; margin: 6px 0 2px; }
.meta { background: #fdf2f8; border: 1px solid #fbcfe8; padding: 8px; border-radius: 6px; margin: 10px 0; } .sig { margin-top: 20px; display: flex; justify-content: space-between; }</style></head>
<body><div class="header"><div>${clinicName}</div><h1>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ</h1><div>(на медицинское вмешательство несовершеннолетнему гражданину)</div></div>
<div class="meta"><strong>Законный представитель:</strong> ${repName}<br><strong>Ребенок:</strong> ${childName}<br><strong>Врач:</strong> ${docName} • Дата: ${dateStr}</div>
<p>Я, являясь законным представителем несовершеннолетнего, даю согласие на стоматологическое лечение в соответствии с законодательством РФ.</p>
<div class="sig"><div>Подпись представителя: ________________ / ${repName} /</div><div>Подпись врача: ________________ / ${docName} /</div></div>
</body></html>`;
}

export function generateSingleConsentTemplatePrintHtml(
	templateKey: string,
	options?: { context?: ConsentSubstitutionContext },
): string {
	const doc = getConsentDocumentById(templateKey as any);
	const ctx = options?.context;
	return generateConsentPrintHtml(doc, {
		patientName: ctx?.patientName || "________________________________________________",
		birthDate: ctx?.birthDate || "____.____.________",
		passport: ctx?.passport || "серия ______ № ________ выдан ________________________",
		phone: ctx?.phone,
		clinicName: ctx?.clinicLegalName || ctx?.clinicName || "Стоматологическая клиника «DENTE»",
		doctorName: ctx?.doctorName || "Лечащий врач-стоматолог",
		date: ctx?.date || new Date().toLocaleDateString("ru-RU"),
		guardianName: ctx?.guardianName,
		guardianPassport: ctx?.guardianDocument,
		guardianRelation: ctx?.guardianRelation,
		toothOrArea: ctx?.toothNumbers,
		diagnosisText: ctx?.diagnosisIcd,
	});
}

export function generateConsentPackagePrintHtml(
	packageKey: string,
	options?: { context?: ConsentSubstitutionContext },
): string {
	return generateSingleConsentTemplatePrintHtml(packageKey, options);
}

export function printBlankConsentPackage(packageKey: string, clinicDefaults?: unknown): void {
	printHtmlViaWindowOrIframe(generateConsentPackagePrintHtml(packageKey));
}

export function printFilledConsentPackage(packageKey: string, context: ConsentSubstitutionContext, options?: unknown): void {
	printHtmlViaWindowOrIframe(generateConsentPackagePrintHtml(packageKey, { context }));
}

export function printBlankConsentTemplate(templateKey: string, clinicDefaults?: unknown): void {
	printHtmlViaWindowOrIframe(generateSingleConsentTemplatePrintHtml(templateKey));
}

export function printFilledConsentTemplate(templateKey: string, context: ConsentSubstitutionContext, options?: unknown): void {
	printHtmlViaWindowOrIframe(generateSingleConsentTemplatePrintHtml(templateKey, { context }));
}

export default printHtmlViaWindowOrIframe;
