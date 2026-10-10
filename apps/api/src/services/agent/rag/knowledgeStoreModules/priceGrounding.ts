/**
 * priceGrounding.ts — Statutory 804n Price Grounding & Anti-Hallucination Barrier.
 * Official statutory 804n nomenclature seeds, clinic guarantee policies, and deterministic price validation.
 */

import {
	DEFAULT_SIMILARITY_THRESHOLD,
	type KnowledgeItemInput,
	type KnowledgeSearchResult,
	PRICE_NOT_FOUND_MESSAGE,
	type PriceGroundingResult,
} from "./types.js";

// ─── Statutory Seed Catalog (804n, Protocols, Guarantees) ──────────────────

export const STATUTORY_804N_SEED_ITEMS: ReadonlyArray<
	Omit<KnowledgeItemInput, "organizationId">
> = [
	{
		id: "price_804n_a16_07_002_001",
		category: "price_804n",
		code804n: "A16.07.002.001",
		title: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров",
		content:
			"Восстановление зуба пломбой I, V, VI класс по Блэку светоотверждаемым нанокомпозитом (Filtek Ultimate / Estelite Asteria) при лечении кариеса и некариозных поражений эмали и дентина. Включает изоляцию коффердам, некрэктомию, адгезивный протокол, послойное пломбирование, окклюзионную шлифовку и зеркальную полировку.",
		priceRub: 4500,
		durationMinutes: 45,
		metadata: { specialty: "therapy", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_a16_07_002_002",
		category: "price_804n",
		code804n: "A16.07.002.002",
		title: "Восстановление зуба пломбой II, III класс по Блэку с использованием материалов из фотополимеров",
		content:
			"Восстановление контактной/апроксимальной поверхности зуба пломбой II, III класс по Блэку фотополимерным композитом при лечении кариеса с установкой секционной матричной системы и клиньев (Tor VM / Garrison) для создания анатомического контактного пункта.",
		priceRub: 5200,
		durationMinutes: 60,
		metadata: { specialty: "therapy", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_a16_07_002_003",
		category: "price_804n",
		code804n: "A16.07.002.003",
		title: "Восстановление зуба пломбой IV класс по Блэку с использованием материалов из фотополимеров (эстетическая реставрация угла)",
		content:
			"Художественная прямая эстетическая реставрация зуба IV класса по Блэку с восстановлением угла режущего края, прозрачности эмали и мамелонов дентина нанокомпозитом светового отверждения при лечении кариеса и травм.",
		priceRub: 6000,
		durationMinutes: 75,
		metadata: { specialty: "therapy", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_a16_07_031",
		category: "price_804n",
		code804n: "A16.07.031",
		title: "Препарирование твердых тканей зуба при лечении кариеса",
		content:
			"Атравматичное механическое препарирование и некрэктомия кариозных тканей зуба с водно-воздушным охлаждением и формированием полости по Блэку под контролем кариес-маркера.",
		priceRub: 1200,
		durationMinutes: 20,
		metadata: { specialty: "therapy", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_a11_07_012",
		category: "price_804n",
		code804n: "A11.07.012",
		title: "Глубокое фторирование эмали зуба",
		content:
			"Глубокое фторирование и реминерализирующая терапия твердых тканей зуба с использованием двухкомпонентного эмаль-герметизирующего ликвида (Tiefenfluorid / Clinpro White Varnish).",
		priceRub: 1500,
		durationMinutes: 15,
		metadata: { specialty: "therapy", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_a16_07_030_003",
		category: "price_804n",
		code804n: "A16.07.030.003",
		title: "Инструментальная и медикаментозная обработка корневого канала (3-канальный зуб)",
		content:
			"Эндодонтическая обработка 3 корневых каналов моляра/премоляра: машинное расширение никель-титановыми инструментами (WaveOne Gold / ProTaper Gold), ультразвуковая активация ирригантов 3% NaOCl и 17% EDTA, апекслокация.",
		priceRub: 7500,
		durationMinutes: 60,
		metadata: { specialty: "endodontics", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_a16_07_008_003",
		category: "price_804n",
		code804n: "A16.07.008.003",
		title: "Пломбирование корневого канала зуба гуттаперчей / биокерамикой (3 канала)",
		content:
			"Трехмерная герметичная обтурация 3 корневых каналов методом горячей вертикальной конденсации гуттаперчи с эпоксидным силером AH Plus под рентген-контролем.",
		priceRub: 5800,
		durationMinutes: 45,
		metadata: { specialty: "endodontics", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_a16_07_004",
		category: "price_804n",
		code804n: "A16.07.004",
		title: "Профессиональная гигиена полости рта и зубов (комплексная)",
		content:
			"Комплексная профгигиена полости рта: ультразвуковое удаление зубного камня, воздушно-абразивная полировка Air-Flow порошком на основе глицина, полировка щетками с пастой и покрытие фторлаком.",
		priceRub: 4900,
		durationMinutes: 60,
		metadata: { specialty: "hygiene", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_a16_07_006",
		category: "price_804n",
		code804n: "A16.07.006",
		title: "Удаление постоянного зуба (простое)",
		content:
			"Атравматичное простое удаление подвижного или однокорневого постоянного зуба под местной проводниковой/инфильтрационной анестезией с гемостазом альвеолы.",
		priceRub: 3200,
		durationMinutes: 30,
		metadata: { specialty: "surgery", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_a16_07_024",
		category: "price_804n",
		code804n: "A16.07.024",
		title: "Операция удаления ретинированного, дистопированного зуба (зуб мудрости)",
		content:
			"Сложное хирургическое удаление ретинированного / полуретинированного зуба мудрости (восьмерки) с выкраиванием слизисто-надкостничного лоскута, фрагментацией бормашиной, гемостазом Альвостазом и наложением швов.",
		priceRub: 8900,
		durationMinutes: 60,
		metadata: { specialty: "surgery", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_a16_07_054",
		category: "price_804n",
		code804n: "A16.07.054",
		title: "Внутрикостная дентальная имплантация (установка имплантата)",
		content:
			"Хирургическая установка титанового винтового дентального имплантата (Dentium SuperLine / Straumann BLT / Osstem TSIII) с местной анестезией, остеотомией ложа, контролем торка и установкой заглушки/формирователя десны.",
		priceRub: 38000,
		durationMinutes: 60,
		metadata: { specialty: "surgery", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_a06_07_007",
		category: "price_804n",
		code804n: "A06.07.007",
		title: "Внутриротовая рентгенография (радиовизиография прицельная)",
		content:
			"Цифровой прицельный радиовизиографический снимок 1-2 зубов в параллельной технике с позиционером для контроля кариеса, каналов и периапикальных тканей.",
		priceRub: 650,
		durationMinutes: 10,
		metadata: { specialty: "imaging", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
	{
		id: "price_804n_b01_065_001",
		category: "price_804n",
		code804n: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
		content:
			"Первичный клинический осмотр врача-стоматолога-терапевта: сбор анамнеза, зондирование, перкуссия, холодовая проба, заполнение зубной формулы FDI, предварительный план лечения.",
		priceRub: 1000,
		durationMinutes: 30,
		metadata: { specialty: "consultation", statutoryRef: "Приказ Минздрава РФ № 804н" },
	},
];

export const STATUTORY_GUARANTEE_SEED_ITEMS: ReadonlyArray<
	Omit<KnowledgeItemInput, "organizationId">
> = [
	{
		id: "guarantee_therapy_composite",
		category: "guarantee",
		title: "Гарантийные обязательства на терапевтическое лечение и пломбы из светоотверждаемого композита",
		content:
			"Клиника предоставляет гарантию на светоотверждаемые композитные реставрации (пломбы I-VI классов по Блэку) сроком 12–24 месяца. Обязательным условием сохранения гарантии является соблюдение пациентом индивидуальной гигиены полости рта и прохождение бесплатного профилактического осмотра и профессиональной гигиены не реже 1 раза в 6 месяцев. Гарантия не распространяется при разрушении твердых тканей зуба более 50% без покрытия коронкой.",
		metadata: { specialty: "therapy", statutoryLaw: "Закон РФ «О защите прав потребителей» ст. 29, Положение СтАР" },
	},
	{
		id: "guarantee_endodontics_root_canals",
		category: "guarantee",
		title: "Гарантийные сроки и обязательства на эндодонтическое лечение корневых каналов",
		content:
			"Гарантия на качество инструментальной и медикаментозной обработки и пломбирования корневых каналов составляет 12 месяцев. Прогноз эндодонтического лечения считается благоприятным при отсутствии периапикальных деструктивных изменений на контрольной визиограмме. Пациент обязан покрыть депульпированный жевательный зуб коронкой или керамической вкладкой в течение 30 календарных дней после пломбирования каналов во избежание фрактуры корня.",
		metadata: { specialty: "endodontics", statutoryLaw: "Клинические рекомендации СтАР «Пульпит / Периодонтит»" },
	},
	{
		id: "guarantee_orthopedics_crowns_veneers",
		category: "guarantee",
		title: "Гарантия на ортопедические конструкции (металлокерамические и циркониевые коронки, виниры)",
		content:
			"Гарантийный срок на несъемные ортопедические конструкции (коронки из диоксида циркония E.max, металлокерамику, керамические виниры) составляет от 24 до 36 месяцев со дня постоянной фиксации. Гарантия распространяется на целостность каркаса и керамической облицовки при отсутствии парафункций (бруксизма) без использования защитной ночной каппы.",
		metadata: { specialty: "orthopedics", statutoryLaw: "Закон РФ «О защите прав потребителей»" },
	},
	{
		id: "guarantee_surgery_dental_implants",
		category: "guarantee",
		title: "Гарантия на хирургическую установку дентальных имплантатов и остеоинтеграцию",
		content:
			"На сами титановые имплантаты производитель (Dentium, Straumann, Osstem) предоставляет пожизненную гарантию на материал. Клиника предоставляет гарантию на работу врача по установке имплантата сроком 36 месяцев. В случае отторжения имплантата в период остеоинтеграции (до протезирования) клиника производит повторную установку бесплатно при условии соблюдения пациентом назначений врача и отсутствия некомпенсированного сахарного диабета или курения >20 сигарет/сутки.",
		metadata: { specialty: "surgery", statutoryLaw: "Положение о гарантиях клиники DENTE" },
	},
	{
		id: "guarantee_preventive_hygiene",
		category: "guarantee",
		title: "Гарантии и регламент профессиональной гигиены полости рта",
		content:
			"Профессиональная гигиена полости рта является биологической гигиенической процедурой. Качество выполнения услуги оценивается в день приема (полное удаление зубных отложений и налета, индекс гигиены Грина-Вермиллиона = 0). Срок повторного образования налета индивидуален и зависит от домашней гигиены и диеты пациента. Рекомендуемый интервал повторной профгигиены — 6 месяцев.",
		metadata: { specialty: "hygiene", statutoryLaw: "СанПиН 3.3686-21" },
	},
];

/**
 * Evaluates matched search results for 804n price grounding and formats the result.
 */
export function resolvePriceGrounding(
	matches: readonly KnowledgeSearchResult[],
	threshold = DEFAULT_SIMILARITY_THRESHOLD,
): PriceGroundingResult {
	const topMatch = matches[0];
	if (!topMatch || topMatch.score < threshold || topMatch.item.priceRub === undefined) {
		return {
			found: false,
			score: topMatch?.score ?? 0,
			message: PRICE_NOT_FOUND_MESSAGE,
		};
	}

	return {
		found: true,
		matchedService: topMatch.item,
		score: topMatch.score,
		priceRub: topMatch.item.priceRub,
		code804n: topMatch.item.code804n,
		message: `Найдена позиция прейскуранта: «${topMatch.item.title}» (${topMatch.item.code804n ? `код: ${topMatch.item.code804n}` : "без кода"}) — ${topMatch.item.priceRub} ₽ (сходство: ${(topMatch.score * 100).toFixed(1)}%)`,
	};
}
