/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL PROTOCOLS MASTER CATALOG DATA (CANONICAL SSOT)
 * 448 Authentic Clinical Protocols according to EBM and StAR guidelines.
 * Compliant with Mandates 8b, 8e, 8n, 8x, 8ap, 8bd.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	CANONICAL_OUTPATIENT_TEMPLATES_INDEX,
	type StomxOutpatientTemplateMetadata,
} from "../outpatient/stomtOutpatientCatalog.js";

/** Категории стоматологических протоколов приёма */
export type ClinicalProtocolCategory =
	| "therapy"
	| "endodontics"
	| "surgery"
	| "orthopedics"
	| "periodontics"
	| "pediatric"
	| "orthodontics"
	| "preventive";

export const CLINICAL_CATEGORY_LABELS: Record<ClinicalProtocolCategory, string> = {
	therapy: "Терапия и кариесология",
	endodontics: "Эндодонтия",
	surgery: "Хирургия и имплантация",
	orthopedics: "Ортопедия и протезирование",
	periodontics: "Пародонтология",
	pediatric: "Детская стоматология",
	orthodontics: "Ортодонтия",
	preventive: "Профилактика и гигиена",
};

import type { Order804nServiceItem } from "../pricelist/order804n/types.js";

/** Услуга прейскуранта с точной стоимостью в копейках */
export type ClinicalServiceItem = Order804nServiceItem;

/** Алиас для обратной совместимости вызовов */
export type { Order804nServiceItem };

/** Структурированный протокол приёма быстрого доступа */
export interface Clinical1ClickTemplate {
	readonly id: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly category: ClinicalProtocolCategory;
	readonly icd10Code: string;
	readonly icd10Title: string;
	readonly badge: string;
	readonly icon: string;
	readonly isCore1Click: boolean;
	readonly toothTargetRequired: boolean;
	readonly defaultSubjectiveComplaints: string;
	readonly defaultAnamnesisMorbi: string;
	readonly defaultObjectiveStatus: string;
	readonly defaultPercussion: "negative" | "positive_mild" | "positive_sharp";
	readonly defaultThermalTest: "indifferent" | "transient_pain" | "lingering_sharp_pain" | "pain_relieved_by_cold";
	readonly defaultProbing: "none" | "along_enamel_dentin_border" | "at_cavity_bottom" | "bleeding_orifice";
	readonly defaultEodMicroamperes?: number | null | undefined;
	readonly defaultProcedureProtocol: string;
	readonly defaultAnesthesia: string;
	readonly defaultMaterials: readonly string[];
	readonly defaultRecommendations: string;
	readonly order804nServices: readonly ClinicalServiceItem[];
}

/** 1-Клик физиологическая норма (Мандат 8e / 8n) */
export const PHYSIOLOGICAL_NORM_PRESET: Clinical1ClickTemplate = {
	id: "somatic_healthy_norm",
	title: "Соматически здоров / Физиологическая норма",
	shortTitle: "Физиологическая норма",
	category: "preventive",
	icd10Code: "Z01.2",
	icd10Title: "Стоматологическое обследование / Соматически сохранен",
	badge: "Стандарт",
	icon: "shield",
	isCore1Click: true,
	toothTargetRequired: false,
	defaultSubjectiveComplaints:
		"Жалоб на момент осмотра активно не предъявляет. Обратился с целью планового профилактического осмотра и санации полости рта.",
	defaultAnamnesisMorbi:
		"Соматический анамнез не отягощен. Соматически сохранен, аллергологический статус без особенностей. Перенесенные и сопутствующие соматические заболевания отрицает. Вирусные гепатиты B/C, ВИЧ-инфекцию, туберкулез отрицает. Ранее проходил регулярные профилактические осмотры.",
	defaultObjectiveStatus:
		"Общее состояние удовлетворительное, сознание ясное. Конфигурация лица не изменена, лицо симметрично, открывание рта свободное, безболезненное, в полном объеме. Регионарные лимфатические узлы не пальпируются, безболезненные. Слизистая оболочка полости рта, десен, щек, неба бледно-розовая, умеренно увлажнена, чистая, без патологических элементов. Прикус ортогнатический (физиологическая норма). Зубные ряды интактные / санированные, подвижности нет. Десна интактна, кровоточивости нет (индекс OHI-S = 0). Врач правит только патологию!",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: 2,
	defaultProcedureProtocol:
		"1. Полный клинический осмотр стоматологического пациента (внешний осмотр, пальпация лимфатических узлов, осмотр преддверия и полости рта).\n2. Оценка окклюзии, состояния височно-нижнечелюстных суставов и физиологической нормы прикуса.\n3. Онкоскрининг слизистой оболочки полости рта (визуальный осмотр, пальпация). Патологических изменений слизистой оболочки, пародонта и твердых тканей зубов не выявлено.\n4. Проведена беседа по гигиене полости рта, индивидуальный подбор средств ухода.",
	defaultAnesthesia: "Без анестезии",
	defaultMaterials: [
		"Индивидуальный стерильный смотровой лоток",
		"Стоматологическое зеркало и зонд диагностический",
	],
	defaultRecommendations:
		"Соблюдение правил индивидуальной гигиены полости рта (чистка зубов 2 раза в день фторсодержащей пастой, флосс). Профилактический осмотр у врача-стоматолога через 6 месяцев.",
	order804nServices: [
		{
			code: "B01.065.001",
			nameRu: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 150000,
		},
	],
};

export const CARIES_MEDIUM_TEMPLATE: Clinical1ClickTemplate = {
	id: "caries_medium_k02_1",
	title: "Лечение среднего кариеса (К02.1)",
	shortTitle: "Средний кариес",
	category: "therapy",
	icd10Code: "K02.1",
	icd10Title: "Кариес дентина (Caries of dentine)",
	badge: "К02.1",
	icon: "tooth",
	isCore1Click: true,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалобы на наличие кариозной полости, кратковременные боли от температурных раздражителей (холодное, горячее) и сладкого, быстро проходящие после устранения раздражителя, застревание пищи в межзубном промежутке.",
	defaultAnamnesisMorbi:
		"Полость появилась около 1-2 месяцев назад. Кратковременная чувствительность от холодного беспокоит в течение последней недели. Ранее зуб по данному поводу не лечился.",
	defaultObjectiveStatus:
		"При осмотре {TOOTH}: на жевательной/контактной поверхности определяется кариозная полость в пределах средних слоев дентина. Полость выполнена размягченным пигментированным дентином темного цвета. Эмалевые края подрыты. Зондирование эмалево-дентинной границы слабо болезненно, дно полости плотное, полость зуба не вскрыта. Перкуссия зуба безболезненная. Реакция на холод кратковременная (исчезает через 2-3 секунды). ЭОД = 5 мкА (норма). Десна интактна.",
	defaultPercussion: "negative",
	defaultThermalTest: "transient_pain",
	defaultProbing: "along_enamel_dentin_border",
	defaultEodMicroamperes: 5,
	defaultProcedureProtocol:
		"1. Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл. Анестезия наступила через 3 минуты, глубокая, достаточная.\n2. Изоляция операционного поля коффердамом (платок Sanctuary, кламп Tor VM / Brinker B4), антисептическая обработка 0.05% хлоргексидином.\n3. Препарирование кариозной полости алмазными борами с водяным охлаждением. Тщательная некрэктомия твердосплавным шаровидным бором на микромоторе до визуально и тактильно плотного светлого дентина. Формирование скоса эмали 45°.\n4. Медикаментозная обработка полости 0.05% раствором хлоргексидина биглюконата, высушивание слабой струей воздуха без пересушивания дентина.\n5. Адгезивный протокол: селективное протравливание эмали 37% гелем ортофосфорной кислоты (37% H3PO4) 15 сек, смывание водой 15 сек, нанесение универсального адгезива (OptiBond FL / Prime&Bond Universal) с втиранием 20 сек, раздувание до тонкой пленки, фотополимеризация LED 20 сек (1200 мВт/см²).\n6. Послойная реставрация наногибридным светоотверждаемым композитом (Filtek Ultimate / Estelite Asteria, оттенок A2) с анатомическим восстановлением бугров, фиссур и краевого валика. Полимеризация каждого слоя 20 сек.\n7. Шлифовка и финишная полировка мелкозернистыми борами, дисками Sof-Lex, полировочными головками Enhance и пастой Prisma Gloss. Контроль окклюзии артикуляционной бумагой Bausch 40 мкм в статике и динамике.",
	defaultAnesthesia: "Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл",
	defaultMaterials: [
		"Коффердам латексный + кламп",
		"37% гель ортофосфорной кислоты",
		"Адгезивная система OptiBond FL / Prime&Bond",
		"Нанокомпозит Filtek Ultimate / Estelite Asteria (оттенок A2)",
		"Полировочные головки Enhance + паста Prisma Gloss",
		"Артикуляционная бумага Bausch 40 мкм",
	],
	defaultRecommendations:
		"Не принимать пищу до полного отхождения анестезии (1.5-2 часа во избежание прикусывания мягких тканей). Воздержаться от употребления красящих продуктов (кофе, крепкий чай, свекла) в течение 24 часов. Контрольный осмотр через 6 месяцев.",
	order804nServices: [
		{
			code: "A16.07.002.001",
			nameRu: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 350000,
		},
		{
			code: "A16.07.031",
			nameRu: "Препарирование твердых тканей зуба при лечении кариеса",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 80000,
		},
		{
			code: "A11.07.012",
			nameRu: "Глубокое фторирование эмали зуба",
			isMandatory: false,
			defaultQuantity: 1,
			priceKopecks: 50000,
		},
	],
};

export const PULPITIS_ACUTE_TEMPLATE: Clinical1ClickTemplate = {
	id: "pulpitis_acute_k04_0",
	title: "Пульпит (К04.0)",
	shortTitle: "Пульпит",
	category: "endodontics",
	icd10Code: "K04.0",
	icd10Title: "Пульпит (Pulpitis)",
	badge: "К04.0",
	icon: "zap",
	isCore1Click: true,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалобы на острые приступообразные самопроизвольные боли в зубе, усиливающиеся в ночное время, длительные боли от температурных раздражителей (холодного, горячего), иррадиацию болей по ходу ветвей тройничного нерва (в ухо, висок).",
	defaultAnamnesisMorbi:
		"Боли появились 2 суток назад, носят пульсирующий характер с короткими светлыми промежутками. Прием анальгетиков дает временное неполное облегчение.",
	defaultObjectiveStatus:
		"При осмотре {TOOTH}: глубокая кариозная полость, сообщающаяся с полостью зуба в одной точке. Зондирование вскрытой точки резко болезненно, пульпа кровоточит при легком касании. Перкуссия слабо положительная. Термопроба: резкая, длительно не проходящая боль (>1 минуты). ЭОД = 35 мкА. На прицельной RVG: кариозный дефект с вовлечением пульповой камеры, периапикальная щель не расширена.",
	defaultPercussion: "positive_mild",
	defaultThermalTest: "lingering_sharp_pain",
	defaultProbing: "bleeding_orifice",
	defaultEodMicroamperes: 35,
	defaultProcedureProtocol:
		"1. Проводниковая + инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл. Полная хирургическая анестезия через 4 минуты.\n2. Изоляция системой коффердам (платок Sanctuary, кламп W8A), антисептическая обработка 0.05% хлоргексидином.\n3. Раскрытие полости зуба бором Endo-Z, ампутация коронковой пульпы, визуализация устьев корневых каналов.\n4. Витальная экстирпация корневой пульпы, формирование ковровой дорожки ProGlider, определение рабочей длины апекслокатором с RVG-контролем.\n5. Машинное препарирование каналов Ni-Ti ротационной системой WaveOne Gold / ProTaper Gold.\n6. Непрерывный лаваж подогретым 3% NaOCl (20 мл) с ультразвуковой активацией (EndoActivator, 3 цикла по 20 сек) + 17% EDTA 1 мин. Высушивание бумажными штифтами.\n7. Трехмерная обтурация корневых каналов методом непрерывной волны с эпоксидным силером AH Plus.\n8. Контрольная RVG: каналы обтурированы плотно до апекса. Герметизация устьев текучим композитом SDR, временная пломба Cavit / Clip.",
	defaultAnesthesia:
		"Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл",
	defaultMaterials: [
		"Коффердам + кламп W8A",
		"Ni-Ti ротационные файлы WaveOne Gold / ProTaper Gold",
		"3% раствор NaOCl (20 мл) + 17% EDTA",
		"Мастер-штифты гуттаперчи + термопластическая гуттаперча",
		"Эпоксидный силер AH Plus",
		"Текучий композит SDR + временный цемент Cavit",
	],
	defaultRecommendations:
		"Возможна умеренная постпломбировочная чувствительность при накусывании 2-4 дня. При болях: Нимесил 100 мг 1-2 раза в день. Не жевать твердое на стороне зуба до постоянного восстановления коронки. Контрольный осмотр через 7 дней.",
	order804nServices: [
		{
			code: "A16.07.030.003",
			nameRu: "Инструментальная и медикаментозная обработка корневого канала (3-канальный зуб)",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 450000,
		},
		{
			code: "A16.07.008.003",
			nameRu: "Пломбирование корневого канала зуба гуттаперчей (3 канала)",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 400000,
		},
		{
			code: "A16.07.002",
			nameRu: "Восстановление зуба пломбой (наложение пломбы)",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 150000,
		},
		{
			code: "A06.07.007",
			nameRu: "Внутриротовая рентгенография (радиовизиография)",
			isMandatory: true,
			defaultQuantity: 2,
			priceKopecks: 50000,
		},
	],
};

export const PERIODONTITIS_CHRONIC_TEMPLATE: Clinical1ClickTemplate = {
	id: "periodontitis_chronic_k04_5",
	title: "Периодонтит (К04.5)",
	shortTitle: "Периодонтит",
	category: "endodontics",
	icd10Code: "K04.5",
	icd10Title: "Хронический апикальный периодонтит (Chronic apical periodontitis)",
	badge: "К04.5",
	icon: "shield",
	isCore1Click: true,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалобы на ноющие боли в зубе, чувство неловкости и дискомфорта при накусывании на зуб (симптом «выросшего зуба»), изменение цвета коронки, неприятный запах из кариозной полости.",
	defaultAnamnesisMorbi:
		"Зуб ранее лечен более 3 лет назад. Периодически отмечает чувство распирания и чувствительность при жевании твердой пищи.",
	defaultObjectiveStatus:
		"При осмотре {TOOTH}: коронковая часть зуба изменена в цвете (сероватый оттенок), дефект старой пломбы. Полость зуба вскрыта, зондирование устьев безболезненное, распад с гнилостным запахом. Перкуссия положительная (+). Термопроба индифферентна. ЭОД = 120 мкА (полный некроз пульпы). На RVG: деструкция костной ткани в периапикальной области верхушки корня с нечеткими контурами диаметром 3-4 мм.",
	defaultPercussion: "positive_mild",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: 120,
	defaultProcedureProtocol:
		"1. Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл.\n2. Изоляция операционного поля коффердамом.\n3. Эндодонтический ретритмент: удаление старого пломбировочного материала, эвакуация некротического распада, создание прямолинейного доступа Endo-Z.\n4. Прохождение корневых каналов ручными файлами C-Pilot, апекслокация рабочей длины с RVG-контролем.\n5. Механическая и медикаментозная обработка Ni-Ti ротационными файлами WaveOne Gold / ProTaper Gold. Непрерывная ирригация 3% NaOCl с ультразвуковой активацией + 17% EDTA. Высушивание бумажными штифтами.\n6. Временная лечебная обтурация каналов высокощелочной пастой гидроксида кальция Ca(OH)2 (Кальсепт / Metapex) под рентген-контролем.\n7. Герметизация устьев СИЦ, наложение временной герметичной повязки Cavit / Clip на 10-14 дней.",
	defaultAnesthesia: "Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл",
	defaultMaterials: [
		"Коффердам латексный + кламп",
		"Эндодонтический ретритмент-набор",
		"3% NaOCl + 17% EDTA",
		"Лечебная паста гидроксида кальция Ca(OH)2 Кальсепт / Metapex",
		"Временный герметичный цемент Cavit / Clip",
	],
	defaultRecommendations:
		"Щадящий режим питания (не жевать твердую пищу на больной зуб). При болях: Нимесил 100 мг. Явка через 10-14 дней для контроля динамики и постоянной обтурации корневых каналов.",
	order804nServices: [
		{
			code: "A16.07.030",
			nameRu: "Инструментальная и медикаментозная обработка корневого канала",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 250000,
		},
		{
			code: "A16.07.091",
			nameRu: "Временное пломбирование лекарственным препаратом корневого канала",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 200000,
		},
		{
			code: "A06.07.007",
			nameRu: "Внутриротовая рентгенография (радиовизиография)",
			isMandatory: true,
			defaultQuantity: 2,
			priceKopecks: 50000,
		},
	],
};

export const CROWN_PREP_EMAX_TEMPLATE: Clinical1ClickTemplate = {
	id: "crown_prep_emax_k08_1",
	title: "Препарирование под коронку E.max",
	shortTitle: "Коронка E.max",
	category: "orthopedics",
	icd10Code: "K08.1",
	icd10Title: "Потеря зубов вследствие удаления, травмы или разрушения",
	badge: "E.max",
	icon: "crown",
	isCore1Click: true,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалобы на разрушение твердых тканей коронковой части зуба более 50%, нарушение жевательной эффективности, эстетический дефект зубного ряда.",
	defaultAnamnesisMorbi:
		"Зуб ранее эндодонтически пролечен, восстановлен культевой вкладкой/композитом. Направлен на изготовление цельнокерамической коронки IPS e.max.",
	defaultObjectiveStatus:
		"При осмотре {TOOTH}: коронковая часть зуба разрушена (ИРОПЗ > 0.6). Корневые каналы качественно обтурированы до верхушки, периапикальные ткани без патологических изменений. Слизистая оболочка маргинальной десны интактна.",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol:
		"1. Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл.\n2. Препарирование зуба под цельнокерамическую коронку IPS e.max с формированием уступа Chamfer 0.8-1.0 мм на уровне десневого края. Сглаживание углов и граней.\n3. Двухниточная ретракция десны (нити Ultrapack #000 и #0 с гемостатиком ViscoStat Clear).\n4. Снятие высокоточного рабочего оттиска А-силиконом / интраоральное 3D сканирование. Регистрация окклюзии Futar D, слепок антагонистов.\n5. Изготовление провизорной временной коронки прямым методом из Protemp 4 / Luxatemp, полировка, фиксация на Temp-Bond NE.\n6. Контроль окклюзионных контактов артикуляционной фольгой 8 мкм.",
	defaultAnesthesia: "Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл",
	defaultMaterials: [
		"Ретракционные нити Ultrapack #000, #0 + ViscoStat Clear",
		"А-силикон Honigum / Express XT",
		"Регистрат окклюзии Futar D",
		"Бис-акрил Protemp 4 / Luxatemp",
		"Временный цемент Temp-Bond NE",
	],
	defaultRecommendations:
		"Исключить вязкую и чрезмерно твердую пищу в области временной коронки. При расцементировке немедленно обратиться в клинику. Явка на примерку постоянной коронки через 5-7 дней.",
	order804nServices: [
		{
			code: "A16.07.004",
			nameRu: "Восстановление зуба коронкой",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 1800000,
		},
		{
			code: "A16.07.031.001",
			nameRu: "Препарирование зуба под коронку",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 250000,
		},
		{
			code: "A02.07.010",
			nameRu: "Снятие оттиска с одной челюсти",
			isMandatory: true,
			defaultQuantity: 2,
			priceKopecks: 200000,
		},
		{
			code: "A16.07.004.001",
			nameRu: "Изготовление временной коронки прямым методом",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 250000,
		},
	],
};

export const IMPLANT_PLACEMENT_TEMPLATE: Clinical1ClickTemplate = {
	id: "implant_placement_k08_1",
	title: "Установка имплантата",
	shortTitle: "Имплантация",
	category: "surgery",
	icd10Code: "K08.1",
	icd10Title: "Потеря зубов вследствие удаления, травмы или других причин",
	badge: "Имплант",
	icon: "implant",
	isCore1Click: true,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалобы на отсутствие зуба, затрудненное пережевывание пищи, эстетический дефект зубного ряда.",
	defaultAnamnesisMorbi:
		"Удаление зуба более 3-6 месяцев назад. Противопоказаний к дентальной имплантации нет. По данным КЛКТ: объем и плотность костной ткани альвеолярного отростка достаточны (тип кости D2-D3).",
	defaultObjectiveStatus:
		"При осмотре области отсутствующего {TOOTH}: слизистая оболочка альвеолярного гребня бледно-розовая, без воспаления, ширина зоны прикрепленной кератинизированной десны более 4 мм. Костный гребень достаточной ширины и высоты.",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol:
		"1. Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл.\n2. Антисептическая обработка операционного поля 0.05% хлоргексидином.\n3. Разрез по центру гребня альвеолярного отростка, отслаивание лоскута распатором.\n4. Разметка точки позиционирования. Внутрикостная дентальная имплантация: последовательное препарирование ложа сверлами с охлаждением стерильным 0.9% NaCl.\n5. Установка дентального имплантата с усилием торка 35-45 Н·см, субкрестальное позиционирование 0.5 мм (стабильность ISQ > 70).\n6. Установка винта-заглушки / формирователя десны.\n7. Мобилизация лоскута, глухое ушивание раны швами Prolene / Vicryl 4-0 без натяжения.\n8. Контрольная радиовизиограмма (RVG): позиция имплантата правильная.",
	defaultAnesthesia:
		"Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл",
	defaultMaterials: [
		"Дентальный имплантат + формирователь десны",
		"Стерильный физиологический раствор 0.9% NaCl",
		"Шовный материал Prolene / Vicryl 4-0",
	],
	defaultRecommendations:
		"Холод местно на щеку 15 мин первые 3 часа. Не принимать горячую пищу 24 часа. Исключить спорт и сауну на 10 дней. Ротовые ванночки 0.05% хлоргексидином. Амоксиклав 875+125 мг 2 раза в день 7 дней, Нимесил 100 мг при болях. Снятие швов через 10-12 дней.",
	order804nServices: [
		{
			code: "A16.07.054",
			nameRu: "Внутрикостная дентальная имплантация",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 3500000,
		},
		{
			code: "A16.07.054.001",
			nameRu: "Установка формирователя десны",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 500000,
		},
		{
			code: "A06.07.007",
			nameRu: "Внутриротовая рентгенография (радиовизиография)",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 50000,
		},
	],
};

export const TOOTH_EXTRACTION_SIMPLE_TEMPLATE: Clinical1ClickTemplate = {
	id: "tooth_extraction_k08_1",
	title: "Простое удаление зуба (К08.1 / К04.5)",
	shortTitle: "Удаление зуба",
	category: "surgery",
	icd10Code: "K08.1",
	icd10Title: "Потеря зубов вследствие удаления (Loss of teeth due to extraction)",
	badge: "Удаление",
	icon: "scissors",
	isCore1Click: true,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалобы на полное разрушение коронки зуба, периодические ноющие боли, травмирование слизистой оболочки языка и щеки острыми краями корня.",
	defaultAnamnesisMorbi:
		"Зуб неоднократно лечен. Коронковая часть полностью разрушена ниже уровня десны. По заключению терапевта/ортопеда зуб не подлежит восстановлению (ИРОПЗ > 0.9).",
	defaultObjectiveStatus:
		"При осмотре {TOOTH}: коронковая часть разрушена полностью ниже уровня десны, ткани корня размягчены, пигментированы. Перкуссия остатков корня слабо чувствительна. Слизистая десны умеренно гиперемирована. На RVG: периапикальный очаг деструкции 3-4 мм.",
	defaultPercussion: "positive_mild",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol:
		"1. Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7-3.4 мл.\n2. Антисептическая обработка операционного поля 0.05% хлоргексидином.\n3. Синдесмотомия круговой связки зуба распатором на глубину 3-4 мм.\n4. Атравматичная люксация корней элеватором и экстракция щипцами с сохранением кортикальных пластинок альвеолы.\n5. Ревизионный кюретаж лунки острой ложкой Люкаса, удаление грануляций.\n6. Антисептический лаваж 0.05% хлоргексидином, сжатие краев лунки, внесение гемостатической губки Альвостим.\n7. Наложение сближающего шва Викрил 4-0. Гемостаз полный, устойчивый.",
	defaultAnesthesia:
		"Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7-3.4 мл",
	defaultMaterials: [
		"Элеваторы и корневые щипцы",
		"Гемостатическая губка Альвостим",
		"Шовный материал Викрил 4-0",
	],
	defaultRecommendations:
		"Марлевый шарик сплюнуть через 20 минут. Не принимать пищу 2 часа. Не полоскать рот активно. Исключить горячее, сауну и спорт на 3 дня. При болях: Нимесил 100 мг. Контрольный осмотр через 7 дней.",
	order804nServices: [
		{
			code: "A16.07.001",
			nameRu: "Удаление постоянного зуба",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 250000,
		},
		{
			code: "A16.07.097",
			nameRu: "Наложение швов на слизистую оболочку полости рта",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 100000,
		},
	],
};

export const HYGIENE_AIRFLOW_TEMPLATE: Clinical1ClickTemplate = {
	id: "hygiene_airflow_k05_3",
	title: "Профгигиена Air-Flow",
	shortTitle: "Профгигиена Air-Flow",
	category: "periodontics",
	icd10Code: "K05.3",
	icd10Title: "Хронический пародонтит / Зубные отложения",
	badge: "Air-Flow",
	icon: "sparkles",
	isCore1Click: true,
	toothTargetRequired: false,
	defaultSubjectiveComplaints:
		"Жалобы на кровоточивость десен при чистке зубов, наличие плотного пигментированного налета («налет курильщика / кофемана»), шероховатость зубов, неприятный запах изо рта.",
	defaultAnamnesisMorbi:
		"Профессиональная гигиена полости рта проводилась более 1 года назад. Индивидуальная гигиена нерегулярная, межзубные ершики использует редко.",
	defaultObjectiveStatus:
		"При осмотре полости рта: слизистая оболочка десневого края гиперемирована, отечна, кровоточит при зондировании (BOP = 30%, PBI = 2 балла). Во всех секстантах определяются массивные наддесневые и поддесневые зубные отложения, плотный пигментированный налет в пришеечной зоне. Индекс OHI-S = 2.4.",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol:
		"1. Аппликационная анестезия десневого края гелем Лидоксор.\n2. Индикация биопленки 2-цветным индикатором Mira-2-Ton.\n3. Ультразвуковой скейлинг аппаратом EMS Piezon Master: удаление над- и поддесневого зубного камня во всех секстантах под водяным охлаждением.\n4. Воздушно-абразивная обработка Air-Flow мелкодисперсным порошком глицина (25 мкм, Air-Flow Plus) для деликатного удаления биопленки и пигмента.\n5. Очистка проксимальных поверхностей абразивными штрипсами и флоссом.\n6. Финишная полировка всех зубов пастой Cleanic полировочными чашечками и щеточками до зеркального блеска.\n7. Антисептическая обработка десны 0.05% хлоргексидином, аппликация геля Метрогил Дента.\n8. Глубокое фторирование: нанесение защитного фторлака Clinpro White Varnish на все зубы.\n9. Индивидуальный подбор средств гигиены (щетка Soft, ершики Prime).",
	defaultAnesthesia: "Аппликационная анестезия гелем Лидоксор",
	defaultMaterials: [
		"Индикатор налета Mira-2-Ton",
		"Порошок Air-Flow глицин (Plus 25 мкм)",
		"Полировочная паста Cleanic",
		"Фторлак Clinpro White Varnish",
		"Гель Метрогил Дента",
	],
	defaultRecommendations:
		"«Белая диета» в течение 48 часов: исключить красящие продукты (кофе, чай, красное вино, ягоды, свеклу) и курение. Заменить зубную щетку на новую. Аппликации геля Метрогил Дента 2 раза в день 5 дней. Повторный осмотр и гигиена через 6 месяцев.",
	order804nServices: [
		{
			code: "A16.07.051",
			nameRu: "Профессиональная гигиена полости рта и зубов",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 500000,
		},
		{
			code: "A16.07.051.001",
			nameRu: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 250000,
		},
		{
			code: "A16.07.051.002",
			nameRu: "Воздушно-абразивная обработка зубов (Air-Flow)",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 200000,
		},
		{
			code: "A11.07.012",
			nameRu: "Глубокое фторирование эмали зуба",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 100000,
		},
	],
};

export const CARIES_DEEP_TEMPLATE: Clinical1ClickTemplate = {
	id: "caries_deep_k02_1",
	title: "Глубокий кариес (К02.1)",
	shortTitle: "Глубокий кариес",
	category: "therapy",
	icd10Code: "K02.1",
	icd10Title: "Кариес дентина (глубокий кариес)",
	badge: "Глуб. кариес",
	icon: "tooth",
	isCore1Click: false,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалобы на глубокую кариозную полость, кратковременные боли от температурных раздражителей (холодное, горячее) и механического давления пищи, быстро проходящие после прекращения действия раздражителя.",
	defaultAnamnesisMorbi:
		"Полость существует около 3-4 месяцев, боли при приеме пищи беспокоят в течение последних двух недель.",
	defaultObjectiveStatus:
		"При осмотре {TOOTH}: глубокая кариозная полость в пределах околопульпарного дентина. Дно выполнено слоем пигментированного размягченного дентина. Зондирование дна полости болезненно по всему дну, полость зуба не вскрыта. Перкуссия безболезненная. Реакция на холод кратковременная (2-3 сек). ЭОД = 8 мкА. Десна спокойная.",
	defaultPercussion: "negative",
	defaultThermalTest: "transient_pain",
	defaultProbing: "at_cavity_bottom",
	defaultEodMicroamperes: 8,
	defaultProcedureProtocol:
		"1. Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл.\n2. Изоляция операционного поля коффердамом.\n3. Щадящее препарирование и некрэктомия твердосплавным бором на малых оборотах с обильным водяным охлаждением во избежание перегрева пульпы.\n4. Медикаментозная обработка 2% раствором хлоргексидина.\n5. Наложение лечебной прокладки на основе биокерамики / МТА (Biodentine / ProRoot) на дно полости в проекции рога пульпы + изолирующая прокладка из СИЦ светового отверждения (Fuji II LC).\n6. Адгезивная подготовка OptiBond FL, послойная реставрация нанокомпозитом Filtek Ultimate / Estelite Asteria (оттенок A2).\n7. Шлифовка, полировка, контроль окклюзии Bausch 40 мкм.",
	defaultAnesthesia: "Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл",
	defaultMaterials: [
		"Коффердам латексный + кламп",
		"Биокерамика Biodentine / ProRoot MTA",
		"Стеклоиономерный цемент Fuji II LC",
		"Адгезив OptiBond FL + нанокомпозит Filtek Ultimate (оттенок A2)",
	],
	defaultRecommendations:
		"Не принимать пищу 2 часа. Возможна легкая чувствительность при накусывании 1-2 дня. При усилении болей или появлении ночных приступов немедленно явиться на прием. Контрольный осмотр через 6 месяцев.",
	order804nServices: [
		{
			code: "A16.07.002.001",
			nameRu: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 400000,
		},
		{
			code: "A16.07.031",
			nameRu: "Препарирование твердых тканей зуба при лечении кариеса",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 80000,
		},
		{
			code: "A16.07.002.010",
			nameRu: "Наложение лечебной прокладки",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 120000,
		},
	],
};

export const CROWN_CEMENTATION_TEMPLATE: Clinical1ClickTemplate = {
	id: "crown_cementation_k08_1",
	title: "Фиксация постоянной коронки",
	shortTitle: "Фиксация коронки",
	category: "orthopedics",
	icd10Code: "K08.1",
	icd10Title: "Потеря зубов вследствие разрушения / Протезирование",
	badge: "Фиксация",
	icon: "gem",
	isCore1Click: false,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалоб на момент осмотра активно не предъявляет. Явился на плановую примерку и постоянную фиксацию изготовленной ортопедической коронки.",
	defaultAnamnesisMorbi:
		"Зуб ранее отпрепарирован под постоянную коронку, сняты оттиски, зафиксирована временная коронка.",
	defaultObjectiveStatus:
		"При осмотре {TOOTH}: временная коронка сохранена, десневой край бледно-розовый, без признаков воспаления. Препарированный культевой уступ интактен.",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol:
		"1. Снятие временной коронки, очистка культи зуба от остатков временного цемента щеткой с пастой без фтора.\n2. Примерка готовой постоянной цельнокерамической коронки IPS e.max: оценка краевого прилегания, точности посадки, аппроксимальных контактов и цвета.\n3. Коррекция окклюзии фольгой 8 мкм. Пациент полностью удовлетворен формой и цветом коронки.\n4. Протокол адгезивной фиксации: протравливание внутренней поверхности коронки 5% плавиковой кислотой (HF) 20 сек, силан Monobond Plus 60 сек. Обработка культи зуба 37% H3PO4 15 сек, смывание, адгезив.\n5. Постоянная фиксация коронки на композитный цемент двойного отверждения (RelyX Ultimate / Variolink Esthetic), удаление излишков, полимеризация под гелем Oxiguard.\n6. Финишная полировка границы перехода реставрации, контроль суперфлоссом.",
	defaultAnesthesia: "Без анестезии (депульпированный зуб) / Аппликационная анестезия",
	defaultMaterials: [
		"5% плавиковая кислота + силан Monobond Plus",
		"Композитный цемент RelyX Ultimate / Variolink Esthetic",
		"Глицериновый гель Oxiguard",
		"Артикуляционная фольга 8 мкм",
	],
	defaultRecommendations:
		"Не принимать жесткую пищу в течение 2 часов. Соблюдение индивидуальной гигиены с использованием суперфлосса. Контрольный осмотр через 14 дней.",
	order804nServices: [
		{
			code: "A16.07.004",
			nameRu: "Восстановление зуба коронкой (фиксация)",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 300000,
		},
		{
			code: "A16.07.025",
			nameRu: "Избирательное пришлифовывание и полирование твердых тканей зуба",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 100000,
		},
	],
};

export const PEDIATRIC_PULPOTOMY_TEMPLATE: Clinical1ClickTemplate = {
	id: "pediatric_pulpotomy_k04_0",
	title: "Детский прием: Пульпит молочного зуба (Пульпотомия)",
	shortTitle: "Пульпотомия молочного зуба",
	category: "pediatric",
	icd10Code: "K04.0",
	icd10Title: "Пульпит временного зуба",
	badge: "Дети: Пульпит",
	icon: "baby",
	isCore1Click: false,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалобы со слов родителей на боли в зубе у ребенка во время приема пищи (особенно сладкого и холодного), застревание пищи, беспокойство во время еды.",
	defaultAnamnesisMorbi:
		"Боли появились около недели назад при попадании пищи в полость. Ночных самопроизвольных болей не отмечалось.",
	defaultObjectiveStatus:
		"При осмотре временного {TOOTH}: глубокая кариозная полость, полость зуба вскрыта, зондирование слабо болезненно. Перкуссия безболезненная. Слизистая переходной складки без признаков воспаления. На RVG: резорбция корней не превышает 1/3, периапикальных изменений нет.",
	defaultPercussion: "negative",
	defaultThermalTest: "transient_pain",
	defaultProbing: "at_cavity_bottom",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol:
		"1. Аппликационная анестезия с приятным вкусом + инфильтрационная анестезия Sol. Septanesti 1:200000 — 0.8 мл.\n2. Изоляция коффердамом / валиками.\n3. Раскрытие полости зуба, ампутация коронковой пульпы шаровидным бором на малых оборотах.\n4. Гемостаз устьев корневых каналов тампоном с физраствором 2-3 минуты. Гемостаз полный.\n5. Наложение на устья биосовместимого МТА (Biodentine / ProRoot).\n6. Восстановление коронковой части зуба СИЦ светового отверждения (Fuji II LC / Vitremer) / детской коронкой.\n7. Шлифовка, полировка, защитный лак.",
	defaultAnesthesia:
		"Аппликационная + инфильтрационная анестезия Sol. Septanesti 1:200000 — 0.8 мл",
	defaultMaterials: [
		"Биокерамика Biodentine / ProRoot MTA",
		"СИЦ Vitremer / Fuji II LC",
		"Детская стандартная коронка (при показаниях)",
	],
	defaultRecommendations:
		"Не принимать пищу 1.5 часа. Контроль родителями чистки зубов 2 раза в день. Профилактический осмотр через 3 месяца.",
	order804nServices: [
		{
			code: "A16.07.009",
			nameRu: "Пульпотомия (ампутация коронковой пульпы)",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 300000,
		},
		{
			code: "A16.07.002",
			nameRu: "Восстановление зуба пломбой (детский прием)",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 250000,
		},
	],
};

export const FISSURE_SEALING_TEMPLATE: Clinical1ClickTemplate = {
	id: "fissure_sealing_k02_0",
	title: "Неинвазивная герметизация фиссур",
	shortTitle: "Герметизация фиссур",
	category: "preventive",
	icd10Code: "Z01.2",
	icd10Title: "Стоматологическое обследование / Профилактика кариеса",
	badge: "Герметизация",
	icon: "shield",
	isCore1Click: false,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалоб на момент осмотра активно не предъявляет. Обратился с целью первичной профилактики кариеса недавно прорезавшегося постоянного моляра.",
	defaultAnamnesisMorbi:
		"Постоянный зуб прорезался около 4-6 месяцев назад. Кариозных поражений нет.",
	defaultObjectiveStatus:
		"При осмотре {TOOTH}: окклюзионные фиссуры глубокие, интактные, без пигментации и деминерализации. Зондирование фиссур безболезненное, зонд не застревает. Перкуссия безболезненная. Реакция на холод индифферентна. ЭОД = 2-3 мкА.",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: 2,
	defaultProcedureProtocol:
		"1. Профессиональное очищение окклюзионной поверхности ротационной щеточкой с полировочной пастой без фтора.\n2. Изоляция коффердамом / ватными валиками, высушивание воздухом.\n3. Протравливание фиссур 37% гелем ортофосфорной кислоты 20 секунд, смывание водой, высушивание до матового белого оттенка.\n4. Нанесение текучего герметика фиссур с выделением фтора (Clinpro Sealant / Fissurit FX).\n5. Фотополимеризация LED-лампой 30 секунд.\n6. Контроль окклюзии артикуляционной бумагой Bausch 40 мкм, пришлифовывание излишков, полировка.",
	defaultAnesthesia: "Без анестезии",
	defaultMaterials: [
		"Полировочная паста без фтора Cleanic",
		"37% ортофосфорная кислота",
		"Светоотверждаемый герметик Clinpro Sealant / Fissurit FX",
	],
	defaultRecommendations:
		"Регулярная индивидуальная гигиена полости рта фторсодержащими пастами. Контрольный осмотр сохранности герметика через 6 месяцев.",
	order804nServices: [
		{
			code: "A16.07.057",
			nameRu: "Запечатывание фиссуры зуба герметиком (неинвазивная герметизация)",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 180000,
		},
		{
			code: "A11.07.012",
			nameRu: "Глубокое фторирование эмали зуба",
			isMandatory: false,
			defaultQuantity: 1,
			priceKopecks: 50000,
		},
	],
};

export const WEDGE_DEFECT_TEMPLATE: Clinical1ClickTemplate = {
	id: "wedge_defect_k03_1",
	title: "Клиновидный дефект (К03.1)",
	shortTitle: "Клиновидный дефект",
	category: "therapy",
	icd10Code: "K03.1",
	icd10Title: "Сошлифовывание зубов / Клиновидный дефект",
	badge: "К03.1",
	icon: "activity",
	isCore1Click: false,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалобы на V-образный дефект в пришеечной области зуба, кратковременную гиперчувствительность при чистке зубов и от холодного, эстетический дефект при улыбке.",
	defaultAnamnesisMorbi:
		"Дефект заметил более 6 месяцев назад, чувствительность постепенно нарастает. В анамнезе использование жесткой зубной щетки с сильным нажимом.",
	defaultObjectiveStatus:
		"При осмотре {TOOTH}: в пришеечной области вестибулярной поверхности определяется V-образный клиновидный дефект с гладкими плотными блестящими стенками без признаков размягчения. Зондирование вершины дефекта умеренно болезненно. Перкуссия безболезненная. Реакция на холод кратковременная. ЭОД = 4-6 мкА.",
	defaultPercussion: "negative",
	defaultThermalTest: "transient_pain",
	defaultProbing: "at_cavity_bottom",
	defaultEodMicroamperes: 5,
	defaultProcedureProtocol:
		"1. Аппликационная / инфильтрационная анестезия Sol. Septanesti 1:200000 — 0.8 мл.\n2. Изоляция операционного поля коффердамом с пришеечным клампом Brinker B4 / ретракционной нитью Ultrapack #000.\n3. Минимально-инвазивное микроабразивное освежение стенок дефекта мелкозернистым бором для создания микрорельефа и микрофальца.\n4. Медикаментозная обработка 0.05% хлоргексидином.\n5. Самопротравливающий адгезивный протокол с десенситайзером (OptiBond Versa / Clearfil SE Protect).\n6. Пломбирование эластичным нанокомпозитом с низким модулем упругости (Estelite Flow Quick / Filtek Ultimate Flowable + универсальный нанокомпозит, оттенок A2).\n7. Шлифовка, полировка дисками Sof-Lex и головками Enhance, покрытие фторлаком.",
	defaultAnesthesia: "Инфильтрационная анестезия Sol. Septanesti 1:200000 — 0.8 мл",
	defaultMaterials: [
		"Пришеечный кламп Brinker B4 / нить Ultrapack #000",
		"Самопротравливающий адгезив Clearfil SE Protect",
		"Эластичный нанокомпозит Estelite Flow + Filtek Ultimate (оттенок A2)",
		"Защитный лак Clinpro White Varnish",
	],
	defaultRecommendations:
		"Использовать зубную щетку только с мягкой щетиной (Soft / Ultra Soft), пасты для чувствительных зубов с гидроксиапатитом (Sensodyne / Biorepair). Исключить горизонтальные пилящие движения при чистке зубов. Контрольный осмотр через 6 месяцев.",
	order804nServices: [
		{
			code: "A16.07.002.001",
			nameRu: "Восстановление зуба пломбой V класс по Блэку с использованием материалов из фотополимеров",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 320000,
		},
		{
			code: "A11.07.012",
			nameRu: "Глубокое фторирование эмали зуба",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 50000,
		},
	],
};

export const TOOTH_EXTRACTION_COMPLEX_TEMPLATE: Clinical1ClickTemplate = {
	id: "tooth_extraction_complex_k01_1",
	title: "Сложное удаление зуба / Ретенция (К01.1)",
	shortTitle: "Сложное удаление зуба",
	category: "surgery",
	icd10Code: "K01.1",
	icd10Title: "Ретенированные и дистопированные зубы (Impacted teeth)",
	badge: "К01.1",
	icon: "scissors",
	isCore1Click: false,
	toothTargetRequired: true,
	defaultSubjectiveComplaints:
		"Жалобы на затрудненное болезненное прорезывание зуба, распирающие боли в челюсти с иррадиацией в ухо и висок, отек десны, болезненность при открывании рта и глотании, прикусывание слизистой капюшона.",
	defaultAnamnesisMorbi:
		"Симптомы нарастают в течение 3-5 дней. По данным КЛКТ/ОПТГ: зуб ретенирован, дистопирован, корни изогнуты, близкое анатомическое прилегание к нижнечелюстному каналу.",
	defaultObjectiveStatus:
		"При осмотре {TOOTH}: зуб ретенирован / полуретенирован, коронковая часть частично перекрыта воспаленным десневым капюшоном. Слизистая гиперемирована, отечна. Зондирование под капюшоном болезненно. Открывание рта ограничено (тризм I-II степени).",
	defaultPercussion: "positive_sharp",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol:
		"1. Проводниковая + инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл.\n2. Антисептическая обработка 0.05% хлоргексидином.\n3. Разрез слизистой, отслаивание слизисто-надкостничного лоскута распатором.\n4. Костный доступ фиссурным бором Lindemann с непрерывным охлаждением 0.9% NaCl.\n5. Межкорневая сепарация корней турбинным наконечником и атравматичная люксация элеваторами Бейна.\n6. Ревизионный кюретаж лунки ложкой Люкаса, сглаживание костных краев фрезой, лаваж 0.05% хлоргексидином, гемостатическая губка Альвостим с йодоформом.\n7. Глухое ушивание раны швами Викрил 4-0 без натяжения. Гемостаз полный, устойчивый.",
	defaultAnesthesia:
		"Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл",
	defaultMaterials: [
		"Хирургический распатор и элеваторы Бейна",
		"Хирургические боры Lindemann",
		"Стерильный физиологический раствор 0.9% NaCl",
		"Гемостатическая губка Альвостим с йодоформом",
		"Шовный материал Викрил 4-0",
	],
	defaultRecommendations:
		"Холод на щеку по 15 мин каждые 30 мин первые 3 часа. Не греть, не полоскать рот в первые сутки. Исключить горячее, баню и спорт на 7 дней. Антибиотики и НПВС по схеме. Снятие швов через 8-10 дней.",
	order804nServices: [
		{
			code: "A16.07.001.002",
			nameRu: "Удаление зуба сложное с разъединением корней",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 500000,
		},
		{
			code: "A16.07.001.003",
			nameRu: "Удаление ретенированного, дистопированного зуба",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 650000,
		},
		{
			code: "A16.07.097",
			nameRu: "Наложение швов на слизистую оболочку полости рта",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 100000,
		},
		{
			code: "A06.07.007",
			nameRu: "Внутриротовая рентгенография (радиовизиография)",
			isMandatory: true,
			defaultQuantity: 1,
			priceKopecks: 50000,
		},
	],
};

/**
 * Канонический реестр 1-Click клинических протоколов приёма.
 * Первые 7 элементов входят в быстрый доступ (isCore1Click: true).
 */
export const CLINICAL_1CLICK_TEMPLATES_CATALOG: readonly Clinical1ClickTemplate[] = [
	// ── 7 Ключевых протоколов быстрого доступа ──
	CARIES_MEDIUM_TEMPLATE,
	PULPITIS_ACUTE_TEMPLATE,
	PERIODONTITIS_CHRONIC_TEMPLATE,
	CROWN_PREP_EMAX_TEMPLATE,
	IMPLANT_PLACEMENT_TEMPLATE,
	TOOTH_EXTRACTION_SIMPLE_TEMPLATE,
	HYGIENE_AIRFLOW_TEMPLATE,
	// ── Расширенный клинический каталог ──
	CARIES_DEEP_TEMPLATE,
	CROWN_CEMENTATION_TEMPLATE,
	PEDIATRIC_PULPOTOMY_TEMPLATE,
	FISSURE_SEALING_TEMPLATE,
	WEDGE_DEFECT_TEMPLATE,
	TOOTH_EXTRACTION_COMPLEX_TEMPLATE,
];

/**
 * Канонический реестр всех 448 аутентичных протоколов по МКБ-10.
 */
export const CANONICAL_448_CLINICAL_PROTOCOLS: readonly StomxOutpatientTemplateMetadata[] =
	CANONICAL_OUTPATIENT_TEMPLATES_INDEX;
