/**
 * THERAPY DIARY TEMPLATES — CARIES & ESTHETIC RESTORATIONS
 * Evidence-based dental therapy protocols (Mandate 8b <= 120 lines).
 */
import type { Clinical1ClickTemplate } from "./clinicalDiaryTypes";

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
	defaultSubjectiveComplaints: "Жалобы на наличие кариозной полости, кратковременные боли от температурных раздражителей (холодное, горячее) и сладкого, быстро проходящие после устранения раздражителя, застревание пищи в межзубном промежутке.",
	defaultAnamnesisMorbi: "Полость появилась около 1-2 месяцев назад. Кратковременная чувствительность от холодного беспокоит в течение последней недели. Ранее зуб по данному поводу не лечился.",
	defaultObjectiveStatus: "При осмотре {TOOTH}: на жевательной/контактной поверхности определяется кариозная полость в пределах средних слоев дентина. Полость выполнена размягченным пигментированным дентином темного цвета. Эмалевые края подрыты. Зондирование эмалево-дентинной границы слабо болезненно, дно полости плотное, полость зуба не вскрыта. Перкуссия зуба безболезненная. Реакция на холод кратковременная (исчезает через 2-3 секунды). ЭОД = 5 мкА (норма). Десна интактна.",
	defaultPercussion: "negative",
	defaultThermalTest: "transient_pain",
	defaultProbing: "along_enamel_dentin_border",
	defaultEodMicroamperes: 5,
	defaultProcedureProtocol: "1. Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл. Анестезия наступила через 3 минуты, глубокая, достаточная.\n2. Изоляция операционного поля коффердамом (платок Sanctuary, кламп Tor VM / Brinker B4), антисептическая обработка 0.05% хлоргексидином.\n3. Препарирование кариозной полости алмазными борами с водяным охлаждением. Тщательная некрэктомия твердосплавным шаровидным бором на микромоторе до визуально и тактильно плотного светлого дентина. Формирование скоса эмали 45°.\n4. Медикаментозная обработка полости 0.05% раствором хлоргексидина биглюконата, высушивание слабой струей воздуха без пересушивания дентина.\n5. Адгезивный протокол: селективное протравливание эмали 37% гелем ортофосфорной кислоты (37% H3PO4) 15 сек, смывание водой 15 сек, нанесение универсального адгезива (OptiBond FL / Prime&Bond Universal) с втиранием 20 сек, раздувание до тонкой пленки, фотополимеризация LED 20 сек (1200 мВт/см²).\n6. Послойная реставрация наногибридным светоотверждаемым композитом (Filtek Ultimate / Estelite Asteria, оттенок A2) с анатомическим восстановлением бугров, фиссур и краевого валика. Полимеризация каждого слоя 20 сек.\n7. Шлифовка и финишная полировка мелкозернистыми борами, дисками Sof-Lex, полировочными головками Enhance и пастой Prisma Gloss. Контроль окклюзии артикуляционной бумагой Bausch 40 мкм в статике и динамике.",
	defaultAnesthesia: "Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл",
	defaultMaterials: ["Коффердам латексный + кламп", "37% гель ортофосфорной кислоты", "Адгезивная система OptiBond FL / Prime&Bond", "Нанокомпозит Filtek Ultimate / Estelite Asteria (оттенок A2)", "Полировочные головки Enhance + паста Prisma Gloss", "Артикуляционная бумага Bausch 40 мкм"],
	defaultRecommendations: "Не принимать пищу до полного отхождения анестезии (1.5-2 часа во избежание прикусывания мягких тканей). Воздержаться от употребления красящих продуктов (кофе, крепкий чай, свекла) в течение 24 часов. Контрольный осмотр через 6 месяцев.",
	order804nServices: [
		{ code: "A16.07.002.001", nameRu: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров", isMandatory: true, defaultQuantity: 1, priceKopecks: 350000 },
		{ code: "A16.07.031", nameRu: "Препарирование твердых тканей зуба при лечении кариеса", isMandatory: true, defaultQuantity: 1, priceKopecks: 80000 },
		{ code: "A11.07.012", nameRu: "Глубокое фторирование эмали зуба", isMandatory: false, defaultQuantity: 1, priceKopecks: 50000 },
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
	defaultSubjectiveComplaints: "Жалобы на глубокую кариозную полость, кратковременные боли от температурных раздражителей (холодное, горячее) и механического давления пищи, быстро проходящие после прекращения действия раздражителя.",
	defaultAnamnesisMorbi: "Полость существует около 3-4 месяцев, боли при приеме пищи беспокоят в течение последних двух недель.",
	defaultObjectiveStatus: "При осмотре {TOOTH}: глубокая кариозная полость в пределах околопульпарного дентина. Дно выполнено слоем пигментированного размягченного дентина. Зондирование дна полости болезненно по всему дну, полость зуба не вскрыта. Перкуссия безболезненная. Реакция на холод кратковременная (2-3 сек). ЭОД = 8 мкА. Десна спокойная.",
	defaultPercussion: "negative",
	defaultThermalTest: "transient_pain",
	defaultProbing: "at_cavity_bottom",
	defaultEodMicroamperes: 8,
	defaultProcedureProtocol: "1. Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл.\n2. Изоляция операционного поля коффердамом.\n3. Щадящее препарирование и некрэктомия твердосплавным бором на малых оборотах с обильным водяным охлаждением во избежание перегрева пульпы.\n4. Медикаментозная обработка 2% раствором хлоргексидина.\n5. Наложение лечебной прокладки на основе биокерамики / МТА (Biodentine / ProRoot) на дно полости в проекции рога пульпы + изолирующая прокладка из СИЦ светового отверждения (Fuji II LC).\n6. Адгезивная подготовка OptiBond FL, послойная реставрация нанокомпозитом Filtek Ultimate / Estelite Asteria (оттенок A2).\n7. Шлифовка, полировка, контроль окклюзии Bausch 40 мкм.",
	defaultAnesthesia: "Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл",
	defaultMaterials: ["Коффердам латексный + кламп", "Биокерамика Biodentine / ProRoot MTA", "Стеклоиономерный цемент Fuji II LC", "Адгезив OptiBond FL + нанокомпозит Filtek Ultimate (оттенок A2)"],
	defaultRecommendations: "Не принимать пищу 2 часа. Возможна легкая чувствительность при накусывании 1-2 дня. При усилении болей или появлении ночных приступов немедленно явиться на прием. Контрольный осмотр через 6 месяцев.",
	order804nServices: [
		{ code: "A16.07.002.001", nameRu: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров", isMandatory: true, defaultQuantity: 1, priceKopecks: 400000 },
		{ code: "A16.07.031", nameRu: "Препарирование твердых тканей зуба при лечении кариеса", isMandatory: true, defaultQuantity: 1, priceKopecks: 80000 },
		{ code: "A16.07.002.010", nameRu: "Наложение лечебной прокладки", isMandatory: true, defaultQuantity: 1, priceKopecks: 120000 },
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
	defaultSubjectiveComplaints: "Жалобы на V-образный дефект в пришеечной области зуба, кратковременную гиперчувствительность при чистке зубов и от холодного, эстетический дефект при улыбке.",
	defaultAnamnesisMorbi: "Дефект заметил более 6 месяцев назад, чувствительность постепенно нарастает. В анамнезе использование жесткой зубной щетки с сильным нажимом.",
	defaultObjectiveStatus: "При осмотре {TOOTH}: в пришеечной области вестибулярной поверхности определяется V-образный клиновидный дефект с гладкими плотными блестящими стенками без признаков размягчения. Зондирование вершины дефекта умеренно болезненно. Перкуссия безболезненная. Реакция на холод кратковременная. ЭОД = 4-6 мкА.",
	defaultPercussion: "negative",
	defaultThermalTest: "transient_pain",
	defaultProbing: "at_cavity_bottom",
	defaultEodMicroamperes: 5,
	defaultProcedureProtocol: "1. Аппликационная / инфильтрационная анестезия Sol. Septanesti 1:200000 — 0.8 мл.\n2. Изоляция операционного поля коффердамом с пришеечным клампом Brinker B4 / ретракционной нитью Ultrapack #000.\n3. Минимально-инвазивное микроабразивное освежение стенок дефекта мелкозернистым бором для создания микрорельефа и микрофальца.\n4. Медикаментозная обработка 0.05% хлоргексидином.\n5. Самопротравливающий адгезивный протокол с десенситайзером (OptiBond Versa / Clearfil SE Protect).\n6. Пломбирование эластичным нанокомпозитом с низким модулем упругости (Estelite Flow Quick / Filtek Ultimate Flowable + универсальный нанокомпозит, оттенок A2).\n7. Шлифовка, полировка дисками Sof-Lex и головками Enhance, покрытие фторлаком.",
	defaultAnesthesia: "Инфильтрационная анестезия Sol. Septanesti 1:200000 — 0.8 мл",
	defaultMaterials: ["Пришеечный кламп Brinker B4 / нить Ultrapack #000", "Самопротравливающий адгезив Clearfil SE Protect", "Эластичный нанокомпозит Estelite Flow + Filtek Ultimate (оттенок A2)", "Защитный лак Clinpro White Varnish"],
	defaultRecommendations: "Использовать зубную щетку только с мягкой щетиной (Soft / Ultra Soft), пасты для чувствительных зубов с гидроксиапатитом (Sensodyne / Biorepair). Исключить горизонтальные пилящие движения при чистке зубов. Контрольный осмотр через 6 месяцев.",
	order804nServices: [
		{ code: "A16.07.002.001", nameRu: "Восстановление зуба пломбой V класс по Блэку с использованием материалов из фотополимеров", isMandatory: true, defaultQuantity: 1, priceKopecks: 320000 },
		{ code: "A11.07.012", nameRu: "Глубокое фторирование эмали зуба", isMandatory: true, defaultQuantity: 1, priceKopecks: 50000 },
	],
};

export const THERAPY_DIARY_TEMPLATES: readonly Clinical1ClickTemplate[] = [
	CARIES_MEDIUM_TEMPLATE,
	CARIES_DEEP_TEMPLATE,
	WEDGE_DEFECT_TEMPLATE,
];
