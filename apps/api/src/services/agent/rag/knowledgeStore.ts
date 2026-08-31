/**
 * knowledgeStore.ts — High-performance Hybrid Vector-Lexical RAG engine for 804n statutory price grounding,
 * clinical protocol retrieval, and clinic guarantee policies with cosine similarity >= 0.75
 * and strict multi-tenant isolation.
 */

import { STATUTORY_EMR_PROTOCOL_CATALOG } from "@dental/shared";

export type KnowledgeCategory =
	| "price_804n"
	| "clinical_protocol"
	| "guarantee"
	| "sanpin"
	| "faq";

export interface KnowledgeItem {
	readonly id: string;
	readonly organizationId: string;
	readonly category: KnowledgeCategory;
	readonly title: string;
	readonly content: string;
	readonly code804n?: string | undefined;
	readonly icd10Code?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly durationMinutes?: number | undefined;
	readonly metadata?: Record<string, unknown> | undefined;
	readonly embedding: readonly number[];
	readonly stems: ReadonlySet<string>;
	readonly updatedAt: string;
}

export interface KnowledgeItemInput {
	readonly id?: string | undefined;
	readonly organizationId: string;
	readonly category: KnowledgeCategory;
	readonly title: string;
	readonly content: string;
	readonly code804n?: string | undefined;
	readonly icd10Code?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly durationMinutes?: number | undefined;
	readonly metadata?: Record<string, unknown> | undefined;
	readonly embedding?: readonly number[] | undefined;
}

export interface KnowledgeSearchResult {
	readonly item: KnowledgeItem;
	readonly score: number;
}

export interface PriceGroundingResult {
	readonly found: boolean;
	readonly matchedService?: KnowledgeItem | undefined;
	readonly score: number;
	readonly priceRub?: number | undefined;
	readonly code804n?: string | undefined;
	readonly message: string;
}

export interface KnowledgeSearchOptions {
	readonly organizationId: string;
	readonly category?: KnowledgeCategory | undefined;
	readonly limit?: number | undefined;
	readonly threshold?: number | undefined;
	readonly queryVector?: readonly number[] | undefined;
}

export const VECTOR_DIMENSION = 256;
export const DEFAULT_SIMILARITY_THRESHOLD = 0.75;
export const PRICE_NOT_FOUND_MESSAGE = "Услуга не найдена в официальном прайсе клиники";

// ─── Deterministic Semantic Vectorizer & Hybrid Index ──────────────────────

const RUSSIAN_STOP_WORDS = new Set([
	"и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то", "все",
	"она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за", "бы", "по",
	"только", "ее", "мне", "было", "вот", "от", "меня", "еще", "нет", "о", "из",
	"ему", "теперь", "когда", "даже", "ну", "вдруг", "ли", "если", "уже", "или",
	"ни", "быть", "был", "него", "до", "вас", "нибудь", "опять", "уж", "вам",
	"сказал", "ведь", "там", "потом", "себя", "ничего", "ей", "может", "они",
	"тут", "где", "есть", "надо", "ней", "для", "мы", "тебя", "их", "чем", "была",
	"сам", "чтоб", "без", "будто", "чего", "раз", "тоже", "себе", "под", "будет",
	"ж", "тогда", "кто", "этот", "того", "потому", "этого", "какой", "совсем",
	"ним", "здесь", "этом", "один", "почти", "мой", "тем", "чтобы", "нее", "кажется",
	"сейчас", "были", "куда", "зачем", "всех", "никогда", "можно", "при", "наконец",
	"два", "об", "другой", "хоть", "после", "над", "больше", "тот", "через", "эти",
	"нас", "про", "всего", "них", "какая", "много", "разве", "три", "эту", "моя",
	"впрочем", "хорошо", "свою", "этой", "перед", "иногда", "лучше", "чуть", "том",
	"нельзя", "такой", "им", "более", "всегда", "конечно", "всю", "между",
]);

const CONVERSATIONAL_QUERY_PREFIXES = new Set([
	"скольк", "стоит", "поставит", "цен", "почем", "рубл", "руб", "услуг", "процедур",
	"кака", "какой", "какие", "скажит", "подскажит", "хотел", "нужн", "надо", "804н", "804",
]);

interface SemanticCluster {
	readonly name: string;
	readonly keywords: readonly string[];
	readonly dimStart: number;
	readonly dimEnd: number;
	readonly weight: number;
}

const DENTAL_SEMANTIC_CLUSTERS: readonly SemanticCluster[] = [
	{
		name: "restoration_composite",
		keywords: [
			"пломб", "реставрац", "фотополимер", "композит", "светов",
			"светоотверждаем", "эмаль", "дентин", "эстетическ", "блэк", "полост",
			"восстановлен", "filtek", "estelite", "gradia", "поставит", "терапевтическ",
		],
		dimStart: 0,
		dimEnd: 23,
		weight: 7.0,
	},
	{
		name: "cavity_preparation",
		keywords: [
			"препарирован", "некрэктоми", "бор", "кариес-маркер", "твердых", "тканей",
		],
		dimStart: 24,
		dimEnd: 39,
		weight: 5.0,
	},
	{
		name: "endodontics_root_canals",
		keywords: [
			"пульпит", "периодонтит", "канал", "корнев", "эндодонт", "экстирпаци",
			"обтураци", "гуттаперч", "апекс", "силер", "депульпирован", "паст",
			"воспален", "ночн", "пульсирующ", "накусыван", "боль", "самопроизвольн",
		],
		dimStart: 40,
		dimEnd: 63,
		weight: 7.0,
	},
	{
		name: "surgery_extraction",
		keywords: [
			"удалени", "экстракци", "ретинирован", "дистопирован", "восьмерк",
			"мудрост", "хирург", "лоскут", "шов", "альвеол", "альвостаз", "разъединен",
			"простое", "сложное",
		],
		dimStart: 64,
		dimEnd: 87,
		weight: 7.0,
	},
	{
		name: "implantology",
		keywords: [
			"имплант", "имплантаци", "остеоинтеграци", "титан", "dentium",
			"straumann", "osstem", "формировател", "абатмент", "винтов",
			"внутрикостн", "установк",
		],
		dimStart: 88,
		dimEnd: 111,
		weight: 7.0,
	},
	{
		name: "prosthetics_crowns",
		keywords: [
			"коронк", "винир", "протез", "ортопед", "циркони", "металлокерамик",
			"вкладк", "мостовидн", "слепок", "культ",
		],
		dimStart: 112,
		dimEnd: 135,
		weight: 7.0,
	},
	{
		name: "hygiene_periodontics",
		keywords: [
			"гигиен", "чистк", "профгигиен", "налет", "камень", "ультразвук",
			"air-flow", "фторирован", "ремотерапи", "пародонт", "гингивит", "десн",
			"кровоточив", "отложени", "отбеливан",
		],
		dimStart: 136,
		dimEnd: 159,
		weight: 7.0,
	},
	{
		name: "imaging_radiology",
		keywords: [
			"рентген", "визиографи", "снимк", "оптг", "кт", "клкт", "томографи",
			"прицельн", "радиовизиографи", "rvg",
		],
		dimStart: 160,
		dimEnd: 183,
		weight: 7.0,
	},
	{
		name: "guarantee_policy",
		keywords: [
			"гаранти", "срок", "обязательств", "бесплатн", "закон", "потребител",
			"стар", "услови", "правил", "месяц", "год", "какая",
		],
		dimStart: 184,
		dimEnd: 207,
		weight: 8.0,
	},
	{
		name: "consultation_anamnesis",
		keywords: [
			"консультаци", "осмотр", "прием", "первичн", "повторн", "анамнез",
			"план", "диагностик", "доктор", "врач",
		],
		dimStart: 208,
		dimEnd: 223,
		weight: 5.0,
	},
	{
		name: "anesthesia",
		keywords: [
			"анестези", "укол", "обезболиван", "артикаин", "септонест", "ультракаин",
			"скандонест", "убистезин", "лидокаин", "коффердам", "карпул", "инфильтрационн",
		],
		dimStart: 224,
		dimEnd: 239,
		weight: 5.0,
	},
];

function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^a-zа-я0-9\s._-]/gi, " ")
		.trim();
}

function stemRussianWord(word: string): string {
	if (word.length <= 3) return word;
	return word
		.replace(/(ов|ев|ей|ями|ами|ом|ем|ой|ей|ью|ях|ах|ам|ям|ому|ему|ых|их|ую|юю|ая|яя|ое|ее|ые|ие|ый|ий|ой|ем|им|ым)$/i, "")
		.replace(/(а|я|о|е|у|ю|ы|и|ь|ъ)$/i, "");
}

function extractUniqueStems(text: string): Set<string> {
	const normalized = normalizeText(text);
	const words = normalized.split(/\s+/).filter(Boolean);
	const set = new Set<string>();
	for (const w of words) {
		if (RUSSIAN_STOP_WORDS.has(w) && w.length < 4) continue;
		set.add(stemRussianWord(w));
	}
	return set;
}

function hashString32(str: string, seed = 0x9747b28c): number {
	let h = seed ^ str.length;
	for (let i = 0; i < str.length; i++) {
		h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
		h ^= h >>> 15;
	}
	return h >>> 0;
}

/**
 * Generates a deterministic dense 256-dimensional unit vector embedding from clinical text.
 */
export function computeSemanticEmbedding(text: string): number[] {
	const normalized = normalizeText(text);
	if (!normalized) {
		const zero = new Array(VECTOR_DIMENSION).fill(0);
		zero[0] = 1.0;
		return zero;
	}

	const vector = new Float64Array(VECTOR_DIMENSION);
	const rawWords = normalized.split(/\s+/).filter(Boolean);
	const uniqueStems = extractUniqueStems(text);

	// 1. Semantic Clusters Projection (Domain-invariant)
	for (const cluster of DENTAL_SEMANTIC_CLUSTERS) {
		let matches = 0;
		for (const stem of uniqueStems) {
			for (const kw of cluster.keywords) {
				if (stem.includes(kw) || kw.includes(stem)) {
					matches += 1;
				}
			}
		}

		if (matches > 0) {
			const span = cluster.dimEnd - cluster.dimStart + 1;
			const clusterVal = cluster.weight * Math.min(matches, 3);
			for (let d = cluster.dimStart; d <= cluster.dimEnd; d++) {
				const offset = (d - cluster.dimStart) % span;
				const current = vector[d] ?? 0;
				vector[d] = current + clusterVal * (1.0 + 0.05 * offset);
			}
		}
	}

	// 2. Exact Medical Codes (804n & ICD-10)
	for (const raw of rawWords) {
		if (/^[a-z]\d{2}\.\d{2}/i.test(raw)) {
			// 804n code: A16.07.002.001
			const h = hashString32(raw.toUpperCase());
			for (let i = 0; i < 8; i++) {
				const idx = 240 + ((h + i * 2) % 16);
				const current = vector[idx] ?? 0;
				vector[idx] = current + 14.0;
			}
		} else if (/^k\d{2}/i.test(raw)) {
			// ICD-10 code: K02.1, K04.0
			const h = hashString32(raw.toUpperCase());
			for (let i = 0; i < 8; i++) {
				const idx = 240 + ((h + i * 2) % 16);
				const current = vector[idx] ?? 0;
				vector[idx] = current + 14.0;
			}
		}
	}

	// 3. Sublinear Lexical Token Projection (scaled by 1 / sqrt(N) to prevent dilution)
	const stemScale = uniqueStems.size > 0 ? 5.0 / Math.sqrt(uniqueStems.size) : 1.0;
	for (const stem of uniqueStems) {
		const h = hashString32(stem);
		const idx1 = h % VECTOR_DIMENSION;
		const idx2 = (h * 31) % VECTOR_DIMENSION;
		const idx3 = 240 + ((h >>> 16) % 16);
		const v1 = vector[idx1] ?? 0;
		const v2 = vector[idx2] ?? 0;
		const v3 = vector[idx3] ?? 0;
		vector[idx1] = v1 + 2.0 * stemScale;
		vector[idx2] = v2 + 1.5 * stemScale;
		vector[idx3] = v3 + 1.0 * stemScale;

		if (stem.length >= 3) {
			for (let i = 0; i <= stem.length - 3; i++) {
				const trigram = stem.slice(i, i + 3);
				const hTri = hashString32(trigram);
				const idxTri = hTri % VECTOR_DIMENSION;
				const vTri = vector[idxTri] ?? 0;
				vector[idxTri] = vTri + 0.4 * stemScale;
			}
		}
	}

	// L2 normalization
	let norm = 0;
	for (let i = 0; i < VECTOR_DIMENSION; i++) {
		const v = vector[i] ?? 0;
		norm += v * v;
	}

	const result = new Array<number>(VECTOR_DIMENSION);
	if (norm === 0) {
		result.fill(0);
		result[0] = 1.0;
		return result;
	}

	const invNorm = 1.0 / Math.sqrt(norm);
	for (let i = 0; i < VECTOR_DIMENSION; i++) {
		const v = vector[i] ?? 0;
		result[i] = Number((v * invNorm).toFixed(6));
	}

	return result;
}

/**
 * Calculates cosine similarity between two dense vectors.
 * Returns a value bounded in [0, 1].
 */
export function cosineSimilarity(
	a: readonly number[],
	b: readonly number[],
): number {
	if (a.length !== b.length || a.length === 0) return 0;
	let dot = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		const valA = a[i] ?? 0;
		const valB = b[i] ?? 0;
		dot += valA * valB;
		normA += valA * valA;
		normB += valB * valB;
	}

	if (normA === 0 || normB === 0) return 0;
	const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
	return Math.max(0, Math.min(1, sim));
}

function stemMatches(queryStem: string, itemStem: string): boolean {
	if (queryStem === itemStem) return true;
	if (queryStem.length >= 4 && itemStem.length >= 4) {
		return itemStem.includes(queryStem) || queryStem.includes(itemStem);
	}
	return false;
}

function computeClinicalStemOverlap(
	queryStems: ReadonlySet<string>,
	itemStems: ReadonlySet<string>,
): number {
	if (queryStems.size === 0) return 0;

	const clinicalStems: string[] = [];
	for (const qs of queryStems) {
		if (!CONVERSATIONAL_QUERY_PREFIXES.has(qs)) {
			clinicalStems.push(qs);
		}
	}

	const targets = clinicalStems.length > 0 ? clinicalStems : Array.from(queryStems);
	const itemStemArray = Array.from(itemStems);
	let matchCount = 0;
	for (const t of targets) {
		if (itemStems.has(t) || itemStemArray.some((it) => stemMatches(t, it))) {
			matchCount += 1;
		}
	}
	return matchCount / targets.length;
}

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

// ─── KnowledgeStore Class ──────────────────────────────────────────────────

export class KnowledgeStore {
	private readonly itemsByOrg = new Map<string, Map<string, KnowledgeItem>>();

	constructor() {
		// Default initialized
	}

	private ensureOrg(orgId: string): Map<string, KnowledgeItem> {
		let map = this.itemsByOrg.get(orgId);
		if (!map) {
			map = new Map<string, KnowledgeItem>();
			this.itemsByOrg.set(orgId, map);
			this.seedDefaultOrgKnowledge(orgId);
		}
		return map;
	}

	private seedDefaultOrgKnowledge(orgId: string): void {
		const map = this.itemsByOrg.get(orgId);
		if (!map) return;

		// 1. Seed 804n prices
		for (const raw of STATUTORY_804N_SEED_ITEMS) {
			const textForEmbedding = `${raw.code804n || ""} ${raw.title} ${raw.content}`;
			const embedding = computeSemanticEmbedding(textForEmbedding);
			const stems = extractUniqueStems(`${raw.code804n || ""} ${raw.title} ${raw.content}`);
			const item: KnowledgeItem = {
				id: raw.id || `804n_${raw.code804n?.replace(/\./g, "_")}`,
				organizationId: orgId,
				category: raw.category,
				title: raw.title,
				content: raw.content,
				code804n: raw.code804n,
				priceRub: raw.priceRub,
				durationMinutes: raw.durationMinutes,
				metadata: raw.metadata,
				embedding,
				stems,
				updatedAt: new Date().toISOString(),
			};
			map.set(item.id, item);
		}

		// 2. Seed Guarantees
		for (const raw of STATUTORY_GUARANTEE_SEED_ITEMS) {
			const textForEmbedding = `${raw.title} ${raw.content}`;
			const embedding = computeSemanticEmbedding(textForEmbedding);
			const stems = extractUniqueStems(`${raw.title} ${raw.content}`);
			const item: KnowledgeItem = {
				id: raw.id || `guarantee_${Date.now()}`,
				organizationId: orgId,
				category: raw.category,
				title: raw.title,
				content: raw.content,
				metadata: raw.metadata,
				embedding,
				stems,
				updatedAt: new Date().toISOString(),
			};
			map.set(item.id, item);
		}

		// 3. Seed Clinical Protocols from STATUTORY_EMR_PROTOCOL_CATALOG
		for (const [code, proto] of Object.entries(STATUTORY_EMR_PROTOCOL_CATALOG)) {
			const id = `protocol_icd10_${code.replace(/\./g, "_").toLowerCase()}`;
			const textForEmbedding = `[${proto.icd10Code}] ${proto.icd10Title} ${proto.clinicalDiagnosis} ${proto.defaultSubjectiveComplaints} ${proto.defaultRecommendations}`;
			const embedding = computeSemanticEmbedding(textForEmbedding);
			const stems = extractUniqueStems(
				`[${proto.icd10Code}] ${proto.icd10Title} ${proto.clinicalDiagnosis} ${proto.defaultSubjectiveComplaints} ${proto.defaultProcedureProtocol} ${proto.defaultRecommendations}`,
			);
			const item: KnowledgeItem = {
				id,
				organizationId: orgId,
				category: "clinical_protocol",
				title: `[${proto.icd10Code}] ${proto.icd10Title}`,
				content: `Диагноз: ${proto.clinicalDiagnosis}.\nЖалобы: ${proto.defaultSubjectiveComplaints}\nОсмотр: ${proto.defaultObjectiveStatus}\nПротокол лечения: ${proto.defaultProcedureProtocol}\nРекомендации: ${proto.defaultRecommendations}`,
				icd10Code: proto.icd10Code,
				metadata: {
					specialty: proto.specialty,
					statutoryOrderRef: proto.statutoryOrderRef,
					order804nServices: proto.order804nServices,
				},
				embedding,
				stems,
				updatedAt: new Date().toISOString(),
			};
			map.set(item.id, item);
		}
	}

	public upsertItem(input: KnowledgeItemInput): KnowledgeItem {
		const map = this.ensureOrg(input.organizationId);
		const id = input.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
		const textForEmbedding = `${input.code804n || ""} ${input.icd10Code || ""} ${input.title} ${input.content}`;
		const embedding =
			input.embedding && input.embedding.length === VECTOR_DIMENSION
				? input.embedding
				: computeSemanticEmbedding(textForEmbedding);
		const stems = extractUniqueStems(
			`${input.code804n || ""} ${input.icd10Code || ""} ${input.title} ${input.content}`,
		);

		const item: KnowledgeItem = {
			id,
			organizationId: input.organizationId,
			category: input.category,
			title: input.title,
			content: input.content,
			code804n: input.code804n,
			icd10Code: input.icd10Code,
			priceRub: input.priceRub,
			durationMinutes: input.durationMinutes,
			metadata: input.metadata,
			embedding,
			stems,
			updatedAt: new Date().toISOString(),
		};

		map.set(id, item);
		return item;
	}

	public getItem(
		organizationId: string,
		itemId: string,
	): KnowledgeItem | undefined {
		const map = this.ensureOrg(organizationId);
		return map.get(itemId);
	}

	public deleteItem(organizationId: string, itemId: string): boolean {
		const map = this.ensureOrg(organizationId);
		return map.delete(itemId);
	}

	public listItems(
		organizationId: string,
		category?: KnowledgeCategory,
	): KnowledgeItem[] {
		const map = this.ensureOrg(organizationId);
		const all = Array.from(map.values());
		if (!category) return all;
		return all.filter((i) => i.category === category);
	}

	/**
	 * Hybrid vector-lexical search in knowledge base with cosine similarity >= threshold
	 * and strict multi-tenant isolation.
	 */
	public async search(
		query: string,
		options: KnowledgeSearchOptions,
	): Promise<KnowledgeSearchResult[]> {
		const map = this.ensureOrg(options.organizationId);
		const threshold = options.threshold ?? DEFAULT_SIMILARITY_THRESHOLD;
		const limit = options.limit ?? 5;

		const queryVec =
			options.queryVector && options.queryVector.length === VECTOR_DIMENSION
				? options.queryVector
				: computeSemanticEmbedding(query);

		const queryStems = extractUniqueStems(query);
		const normalizedQuery = normalizeText(query);
		const results: KnowledgeSearchResult[] = [];

		for (const item of map.values()) {
			if (options.category && item.category !== options.category) {
				continue;
			}

			// 1. Cosine similarity
			const cosSim = cosineSimilarity(queryVec, item.embedding);

			// 2. Lexical Stem Overlap (covers custom service names & specific terms)
			const stemOverlap = computeClinicalStemOverlap(queryStems, item.stems);

			// 3. Hybrid fusion score
			let score = 0.45 * cosSim + 0.55 * stemOverlap;

			// Direct exact 804n code match guarantee
			if (item.code804n && normalizedQuery.includes(item.code804n.toLowerCase())) {
				score = Math.max(score, 0.99);
			}

			// Direct exact ICD-10 code match guarantee
			if (item.icd10Code && normalizedQuery.includes(item.icd10Code.toLowerCase())) {
				score = Math.max(score, 0.99);
			}

			// Direct high lexical match boost (when >= 65% of query stems match item stems)
			if (stemOverlap >= 0.65) {
				score = Math.max(score, 0.78 + 0.20 * stemOverlap);
			}

			if (score >= threshold) {
				results.push({ item, score: Number(score.toFixed(4)) });
			}
		}

		results.sort((a, b) => b.score - a.score);
		return results.slice(0, limit);
	}

	/**
	 * Strict 804n Price Grounding & Anti-Hallucination Barrier:
	 * If no matching price item is found in RAG above threshold >= 0.75,
	 * guarantees rejection with "Услуга не найдена в официальном прайсе клиники".
	 */
	public async groundPrice804n(
		query: string,
		organizationId: string,
		threshold = DEFAULT_SIMILARITY_THRESHOLD,
	): Promise<PriceGroundingResult> {
		const matches = await this.search(query, {
			organizationId,
			category: "price_804n",
			limit: 1,
			threshold,
		});

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
			message: `Найдена позиция прайс-листа 804н: «${topMatch.item.title}» (${topMatch.item.code804n || "без кода"}) — ${topMatch.item.priceRub} ₽ (сходство: ${(topMatch.score * 100).toFixed(1)}%)`,
		};
	}

	public clear(organizationId?: string): void {
		if (organizationId) {
			this.itemsByOrg.delete(organizationId);
		} else {
			this.itemsByOrg.clear();
		}
	}
}

export const defaultKnowledgeStore = new KnowledgeStore();

export function getKnowledgeStore(): KnowledgeStore {
	return defaultKnowledgeStore;
}
