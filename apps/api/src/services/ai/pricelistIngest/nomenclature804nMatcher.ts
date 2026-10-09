/**
 * DENTE Dental CRM — Statutory Minzdrav Order 804n Nomenclature Knowledge Base & Semantic Matcher
 * Layer 1: Pure Domain Classification & Statutory Nomenclature Matching (0 side effects)
 */

import type {
	PriceListConfidenceKind,
	StatutoryNomenclatureEntry,
	NomenclatureMatchResult,
} from "./types.js";

// =============================================================================
// ORDER 804N NOMENCLATURE KNOWLEDGE BASE
// =============================================================================

export const ORDER_804N_STATUTORY_REGISTRY: readonly StatutoryNomenclatureEntry[] = [
	// ─── Терапевтическая стоматология (A16.07.002, A16.07.008, A16.07.030, etc.)
	{
		code: "A16.07.002",
		title: "Восстановление зуба пломбой",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/кариес/i,
			/пломб/i,
			/реставрац/i,
			/светоотвержд/i,
			/фотополимер/i,
			/эмаль/i,
			/герметизац/i,
			/композит/i,
			/клиновидн/i,
			/эстетическ.*реставрац/i,
		],
		secondaryKeywords: [/дентин/i, /изолирующ.*прокладк/i, /лечебн.*прокладк/i],
		defaultPriceRub: 4500,
	},
	{
		code: "A16.07.008",
		title: "Пломбирование корневого канала зуба",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/пульпит/i,
			/периодонтит/i,
			/корнев.*канал/i,
			/эндодонт/i,
			/депульпир/i,
			/обтурац/i,
			/гуттаперч/i,
			/пломбирование.*канал/i,
			/латеральн.*конденсац/i,
		],
		secondaryKeywords: [/апекслокац/i, /лечение.*канал/i, /биокерамик/i],
		defaultPriceRub: 5500,
	},
	{
		code: "A16.07.030",
		title: "Инструментальная и медикаментозная обработка корневого канала",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/механическ.*обработк.*канал/i,
			/инструментальн.*обработк.*канал/i,
			/медикаментозн.*обработк.*канал/i,
			/расширение.*канал/i,
			/прохождение.*канал/i,
		],
		secondaryKeywords: [/эндомотор/i, /протейпер/i, /хлоргекисидин/i],
		defaultPriceRub: 3500,
	},
	{
		code: "A16.07.031",
		title: "Препарирование твердых тканей зуба при лечении кариеса",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/препарирован/i,
			/некрэктоми/i,
			/раскрытие.*полост/i,
		],
		secondaryKeywords: [/формирование.*полост/i],
		defaultPriceRub: 1200,
	},
	{
		code: "A16.07.091",
		title: "Временное пломбирование лекарственным препаратом корневого канала",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/временн.*пломбирован.*канал/i,
			/каласепт/i,
			/метапекс/i,
			/кальци/i,
			/гидроокис.*кальци/i,
			/лечебн.*повязк.*канал/i,
		],
		secondaryKeywords: [/паста.*канал/i],
		defaultPriceRub: 2000,
	},
	{
		code: "A16.07.082",
		title: "Распломбирование корневого канала",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/распломбиров/i,
			/перелечиван.*канал/i,
			/извлечение.*штифт/i,
			/извлечение.*вкладк/i,
		],
		secondaryKeywords: [/резорцин/i, /фосфат.*цемент/i],
		defaultPriceRub: 2500,
	},

	// ─── Хирургическая стоматология (A16.07.001, A16.07.024, A16.07.017, etc.)
	{
		code: "A16.07.001",
		title: "Удаление зуба",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/удалени.*зуб/i,
			/экстракц.*зуб/i,
			/удаление.*постоянн.*зуб/i,
			/удаление.*корн/i,
			/удаление.*сложн/i,
			/простое.*удаление/i,
		],
		secondaryKeywords: [/щипцы/i, /элеватор/i, /люксатор/i, /альвеол/i],
		defaultPriceRub: 3500,
	},
	{
		code: "A16.07.024",
		title: "Удаление ретинированного, дистопированного или сверхкомплектного зуба",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/ретинирован/i,
			/дистопирован/i,
			/зуб.*мудрост/i,
			/восьмерк/i,
			/полуретинирован/i,
			/сверхкомплектн/i,
			/атипичн.*удален/i,
		],
		secondaryKeywords: [/выпиливание/i, /разъединение.*корней/i],
		defaultPriceRub: 8500,
	},
	{
		code: "A16.07.017",
		title: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/периостотоми/i,
			/вскрытие.*абсцесс/i,
			/дренирован.*очаг/i,
			/дренаж/i,
			/разрез.*по.*переходн/i,
		],
		secondaryKeywords: [/флюс/i, /гнойник/i],
		defaultPriceRub: 3000,
	},
	{
		code: "A16.07.016",
		title: "Цистотомия или цистэктомия в области челюсти",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/цистэктоми/i,
			/цистотоми/i,
			/кист.*челюст/i,
			/удаление.*кист/i,
		],
		secondaryKeywords: [/оболочк.*кист/i],
		defaultPriceRub: 7500,
	},
	{
		code: "A16.07.007",
		title: "Резекция верхушки корня",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/резекци.*верхушк/i,
			/апикоэктоми/i,
			/ретроградн.*пломбирован/i,
		],
		secondaryKeywords: [/апикальн/i],
		defaultPriceRub: 8000,
	},
	{
		code: "A16.07.097",
		title: "Наложение шва на слизистую оболочку рта",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/наложение.*шв/i,
			/шов/i,
			/ушивание/i,
			/викрил/i,
			/пролен/i,
			/кетгут/i,
		],
		secondaryKeywords: [/снятие.*шв/i],
		defaultPriceRub: 1500,
	},

	// ─── Дентальная имплантация (A16.07.054, A16.07.055, A16.07.041)
	{
		code: "A16.07.054",
		title: "Внутрикостная дентальная имплантация",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/имплант/i,
			/имплантат/i,
			/установк.*имплант/i,
			/дентальн.*имплантац/i,
			/straumann/i,
			/nobel/i,
			/osstem/i,
			/dentium/i,
			/astra.*tech/i,
			/anyridge/i,
			/neodent/i,
			/mis\b/i,
			/sgs\b/i,
			/hi-tec/i,
			/ankylos/i,
		],
		secondaryKeywords: [/хирургическ.*этап/i, /навигационн.*шаблон/i, /титан.*имплант/i],
		defaultPriceRub: 35000,
	},
	{
		code: "A16.07.054.005",
		title: "Установка формирователя десны",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/формировател.*десн/i,
			/установк.*фдм/i,
			/\bфдм\b/i,
			/десневой.*формировател/i,
		],
		secondaryKeywords: [/второй.*этап.*имплант/i],
		defaultPriceRub: 4500,
	},
	{
		code: "A16.07.055",
		title: "Синус-лифтинг",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/синус[-\s]?лифтинг/i,
			/субантральн.*аугментац/i,
			/поднятие.*дна.*гайморов/i,
			/открыт.*синус/i,
			/закрыт.*синус/i,
		],
		secondaryKeywords: [/гайморов.*пазух/i, /мембран.*шнайдер/i],
		defaultPriceRub: 30000,
	},
	{
		code: "A16.07.041",
		title: "Костная пластика челюстно-лицевой области",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/костн.*пластик/i,
			/аугментац.*кост/i,
			/остеопластик/i,
			/направленн.*костн.*регенерирац/i,
			/нкр/i,
			/bio[-\s]?oss/i,
			/костн.*материал/i,
			/мембран.*коллаген/i,
		],
		secondaryKeywords: [/костн.*стружк/i, /титанов.*сетк/i],
		defaultPriceRub: 25000,
	},

	// ─── Ортопедическая стоматология (A16.07.004, A16.07.005, A16.07.006, etc.)
	{
		code: "A16.07.004",
		title: "Восстановление зуба коронкой постоянной",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/коронк/i,
			/металлокерамик/i,
			/диоксид.*циркони/i,
			/циркони/i,
			/e[-\s]?max/i,
			/цельнокерамическ/i,
			/цельнолит/i,
			/\bмк\b/i,
			/мостовидн.*протез/i,
		],
		secondaryKeywords: [/колпачок/i, /эмаль.*глазурь/i, /культев.*вкладк/i],
		defaultPriceRub: 18000,
	},
	{
		code: "A16.07.004.002",
		title: "Изготовление и фиксация временной провизорной коронки",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/временн.*коронк/i,
			/провизорн.*коронк/i,
			/коронк.*pmma/i,
			/пластмассов.*коронк/i,
		],
		secondaryKeywords: [/luxatemp/i, /прямой.*метод/i],
		defaultPriceRub: 2500,
	},
	{
		code: "A16.07.005",
		title: "Восстановление зуба виниром, полукоронкой",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/винир/i,
			/люминир/i,
			/керамическ.*накладк/i,
			/полукоронк/i,
			/вкладк.*overlay/i,
			/вкладк.*inlay/i,
		],
		secondaryKeywords: [/полевошпат/i, /рефрактор/i],
		defaultPriceRub: 22000,
	},
	{
		code: "A16.07.006",
		title: "Протезирование съемными бюгельными протезами",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/бюгельн.*протез/i,
			/бюгел/i,
			/кламмерн.*фиксац/i,
			/замков.*бюгел/i,
			/аттачмен/i,
		],
		secondaryKeywords: [/дуга.*протез/i],
		defaultPriceRub: 42000,
	},
	{
		code: "A16.07.023",
		title: "Протезирование зубов полными съемными пластиночными протезами",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/полн.*съемн/i,
			/частичн.*съемн.*протез/i,
			/пластиночн.*протез/i,
			/акри-фри/i,
			/acry[-\s]?free/i,
			/нейлонов.*протез/i,
			/акрилов.*протез/i,
		],
		secondaryKeywords: [/базис.*протез/i, /искусственн.*зубы/i],
		defaultPriceRub: 28000,
	},
	{
		code: "A02.07.010",
		title: "Снятие оттиска с одной челюсти",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/оттиск/i,
			/слепок/i,
			/альгинат/i,
			/силикон/i,
			/а[-\s]?силикон/i,
			/с[-\s]?силикон/i,
			/интраоральн.*сканирован/i,
		],
		secondaryKeywords: [/ложка.*слепочн/i],
		defaultPriceRub: 1500,
	},
	{
		code: "A16.07.049",
		title: "Фиксация на постоянный цемент несъемных ортопедических конструкций",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/фиксаци.*коронк/i,
			/постоянн.*цемент/i,
			/fuji/i,
			/цементировк/i,
			/фиксация.*протез/i,
		],
		secondaryKeywords: [/стеклоиономерн.*цемент/i],
		defaultPriceRub: 1800,
	},

	// ─── Профессиональная гигиена и пародонтология (A16.07.051, A16.07.020, etc.)
	{
		code: "A16.07.051",
		title: "Профессиональная гигиена полости рта и зубов",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/профессиональн.*гигиен/i,
			/профгигиен/i,
			/комплексн.*чистк/i,
			/чистк.*зуб/i,
			/снятие.*налет/i,
			/гигиеническ.*чистк/i,
		],
		secondaryKeywords: [/пациент.*гигиен/i, /мотивация/i],
		defaultPriceRub: 4500,
	},
	{
		code: "A16.07.020",
		title: "Удаление наддесневых и поддесневых зубных отложений ультразвуком",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/ультразвук/i,
			/скейлинг/i,
			/удаление.*камн/i,
			/зубн.*камен/i,
			/наддеснев.*отложен/i,
			/поддеснев.*отложен/i,
		],
		secondaryKeywords: [/пьезо/i, /кюрет/i],
		defaultPriceRub: 2500,
	},
	{
		code: "A16.07.051.001",
		title: "Воздушно-абразивная обработка зубов (AirFlow)",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/air[-\s]?flow/i,
			/аир[-\s]?флоу/i,
			/воздушно[-\s]?абразивн/i,
			/порошк.*чистк/i,
		],
		secondaryKeywords: [/глицин/i, /сода/i],
		defaultPriceRub: 2500,
	},
	{
		code: "A11.07.012",
		title: "Глубокое фторирование эмали зуба",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/фторирован/i,
			/фторлак/i,
			/реминерализац/i,
			/эмаль[-\s]?герметизирующ/i,
			/глубок.*фторир/i,
		],
		secondaryKeywords: [/бифлюорид/i, /аппликация.*фтор/i],
		defaultPriceRub: 1200,
	},
	{
		code: "A16.07.050",
		title: "Профессиональное отбеливание зубов",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/отбеливан/i,
			/zoom/i,
			/amazing.*white/i,
			/flash\b/i,
			/клиническ.*отбеливан/i,
			/капп.*для.*отбеливан/i,
		],
		secondaryKeywords: [/пероксид/i, /коффердам/i],
		defaultPriceRub: 25000,
	},
	{
		code: "A16.07.019",
		title: "Временное шинирование при заболеваниях пародонта",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/шинирован/i,
			/гласспан/i,
			/ribbond/i,
			/стекловолоконн.*шин/i,
			/подвижност.*зуб/i,
		],
		secondaryKeywords: [/пародонтит/i],
		defaultPriceRub: 2200,
	},

	// ─── Диагностика и консультации (A06.07.007, A06.07.010, A06.07.013, B01.065.001)
	{
		code: "A06.07.007",
		title: "Внутриротовая рентгенография (прицельный снимок / визиограф)",
		category: "diagnostics",
		specialty: "radiologist",
		primaryKeywords: [
			/прицельн.*снимок/i,
			/визиограф/i,
			/\brvg\b/i,
			/радиовизиограф/i,
			/внутриротов.*рентген/i,
			/дентальн.*снимок/i,
		],
		secondaryKeywords: [/рентген.*зуб/i],
		defaultPriceRub: 600,
	},
	{
		code: "A06.07.010",
		title: "Панорамная рентгенография челюстей (ОПТГ)",
		category: "diagnostics",
		specialty: "radiologist",
		primaryKeywords: [
			/\bоптг\b/i,
			/панорамн.*снимок/i,
			/ортопантомограмм/i,
			/обзорн.*снимок/i,
		],
		secondaryKeywords: [/челюст/i],
		defaultPriceRub: 1500,
	},
	{
		code: "A06.07.013",
		title: "Компьютерная томография челюстно-лицевой области (КЛКТ / КТ)",
		category: "diagnostics",
		specialty: "radiologist",
		primaryKeywords: [
			/\bклкт\b/i,
			/\bкт\b.*челюст/i,
			/компьютерн.*томограф/i,
			/3d[-\s]?снимок/i,
			/томографи.*чло/i,
		],
		secondaryKeywords: [/dicom/i, /сегмент/i],
		defaultPriceRub: 3500,
	},
	{
		code: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "consultation",
		specialty: "therapist",
		primaryKeywords: [
			/первичн.*консультац/i,
			/осмотр.*стоматолог/i,
			/консультаци.*врач/i,
			/первичный.*прием/i,
			/план.*лечени/i,
		],
		secondaryKeywords: [/анкета/i, /составление.*план/i],
		defaultPriceRub: 1000,
	},
	{
		code: "B01.065.002",
		title: "Прием (осмотр, консультация) врача-стоматолога повторный",
		category: "consultation",
		specialty: "therapist",
		primaryKeywords: [
			/повторн.*консультац/i,
			/повторн.*осмотр/i,
			/повторный.*прием/i,
		],
		secondaryKeywords: [/контрольн.*осмотр/i],
		defaultPriceRub: 500,
	},

	// ─── Анестезиология (B01.003.004.005, B01.003.004.004, B01.003.004.001)
	{
		code: "B01.003.004.005",
		title: "Инфильтрационная анестезия",
		category: "anesthesia",
		specialty: "anesthesiologist",
		primaryKeywords: [
			/инфильтрационн.*анестези/i,
			/ультракаин/i,
			/септанест/i,
			/убистезин/i,
			/артикаин/i,
			/карпул/i,
		],
		secondaryKeywords: [/обезболиван/i],
		defaultPriceRub: 800,
	},
	{
		code: "B01.003.004.004",
		title: "Проводниковая анестезия",
		category: "anesthesia",
		specialty: "anesthesiologist",
		primaryKeywords: [
			/проводников.*анестези/i,
			/торусальн.*анестези/i,
			/мандибулярн.*анестези/i,
			/мандибулярк/i,
		],
		secondaryKeywords: [/блокад/i],
		defaultPriceRub: 950,
	},
	{
		code: "B01.003.004.001",
		title: "Аппликационная анестезия",
		category: "anesthesia",
		specialty: "anesthesiologist",
		primaryKeywords: [
			/аппликационн.*анестези/i,
			/гель.*обезболив/i,
			/лидокаин.*спрей/i,
			/дисилан/i,
		],
		secondaryKeywords: [/смазывание/i],
		defaultPriceRub: 400,
	},

	// ─── Ортодонтия (A16.07.048)
	{
		code: "A16.07.048",
		title: "Ортодонтическая коррекция с применением брекет-систем",
		category: "orthodontics",
		specialty: "orthodontist",
		primaryKeywords: [
			/брекет/i,
			/элайнер/i,
			/ортодонтическ.*пластинк/i,
			/активаци.*дуг/i,
			/фиксаци.*брекет/i,
			/снятие.*брекет/i,
			/ретейнер/i,
			/ортодонт/i,
		],
		secondaryKeywords: [/каппа.*исправлен/i, /трейнер/i],
		defaultPriceRub: 35000,
	},

	// ─── Детская стоматология (A16.07.002.009)
	{
		code: "A16.07.002.009",
		title: "Лечение кариеса временного (молочного) зуба",
		category: "pediatric",
		specialty: "pediatric",
		primaryKeywords: [
			/детск.*стоматолог/i,
			/молочн.*зуб/i,
			/временн.*зуб.*пломб/i,
			/лечение.*кариес.*дет/i,
			/серебрение/i,
			/цветн.*пломб/i,
		],
		secondaryKeywords: [/адаптационный.*прием/i],
		defaultPriceRub: 3000,
	},
];

// =============================================================================
// STATUTORY ORDER 804N CLASSIFIER & MATCHER
// =============================================================================

/**
 * Matches a commercial title / line to statutory Minzdrav Order 804n nomenclature.
 */
export function matchOrder804nNomenclature(
	rawLine: string,
	cleanedTitle: string,
): NomenclatureMatchResult {
	const combinedText = `${rawLine} ${cleanedTitle}`;

	// 1. Check for explicit 804n code in text (Latin or Cyrillic A/B: A16.07.002 or А16.07.002)
	const explicitCodeRegex = /\b([A-ZА-Я]\d{2}\.\d{2}\.\d{3}(?:\.\d{3})?)\b/i;
	const explicitMatch = combinedText.match(explicitCodeRegex);

	if (explicitMatch && explicitMatch[1]) {
		const rawCode = explicitMatch[1].toUpperCase();
		// Normalize Cyrillic 'А' / 'В' to Latin 'A' / 'B'
		const normalizedCode = rawCode.replace(/^А/, "A").replace(/^В/, "B");

		// Find in statutory registry
		const entry = ORDER_804N_STATUTORY_REGISTRY.find(
			(e) => e.code === normalizedCode || normalizedCode.startsWith(e.code),
		);

		// Strip detected code from title
		let title = cleanedTitle.replace(new RegExp(explicitMatch[1], "i"), "").trim();
		title = title.replace(/^[\s\-–—:=.]+/, "").trim();

		if (entry) {
			return {
				code804n: normalizedCode,
				statutoryTitle804n: entry.title,
				category: entry.category,
				specialty: entry.specialty,
				confidence: 0.98,
				confidenceKind: "exact_code",
				cleanedTitle: title || entry.title,
			};
		}

		// Unknown explicit code but valid format
		return {
			code804n: normalizedCode,
			statutoryTitle804n: title || `Медицинская услуга по номенклатуре ${normalizedCode}`,
			category: "therapy",
			specialty: "therapist",
			confidence: 0.92,
			confidenceKind: "exact_code",
			cleanedTitle: title,
		};
	}

	// 2. High-precision keyword matching against statutory entries
	let bestEntry: StatutoryNomenclatureEntry | null = null;
	let highestScore = 0;
	let matchedKind: PriceListConfidenceKind = "fallback";

	for (const entry of ORDER_804N_STATUTORY_REGISTRY) {
		let score = 0;

		// Primary keywords give major weight
		for (const pkw of entry.primaryKeywords) {
			if (pkw.test(cleanedTitle)) {
				score += 50;
			}
		}

		// Secondary keywords give minor weight
		for (const skw of entry.secondaryKeywords) {
			if (skw.test(cleanedTitle)) {
				score += 15;
			}
		}

		if (score > highestScore) {
			highestScore = score;
			bestEntry = entry;
		}
	}

	if (bestEntry && highestScore >= 50) {
		const confidence = Math.min(0.95, 0.75 + (highestScore / 200));
		matchedKind = confidence >= 0.85 ? "high_keyword" : "medium_keyword";

		return {
			code804n: bestEntry.code,
			statutoryTitle804n: bestEntry.title,
			category: bestEntry.category,
			specialty: bestEntry.specialty,
			confidence,
			confidenceKind: matchedKind,
			cleanedTitle,
		};
	}

	if (bestEntry && highestScore > 0) {
		return {
			code804n: bestEntry.code,
			statutoryTitle804n: bestEntry.title,
			category: bestEntry.category,
			specialty: bestEntry.specialty,
			confidence: 0.65,
			confidenceKind: "low_keyword",
			cleanedTitle,
		};
	}

	// 3. Fallback to general therapy / consultation (statutory code A16.07.002 per Minzdrav Order 804n)
	return {
		code804n: "A16.07.002",
		statutoryTitle804n: "Восстановление зуба пломбой (терапевтическая стоматология)",
		category: "therapy",
		specialty: "therapist",
		confidence: 0.40,
		confidenceKind: "fallback",
		cleanedTitle,
	};
}
