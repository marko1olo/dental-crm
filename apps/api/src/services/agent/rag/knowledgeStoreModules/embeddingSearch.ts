/**
 * embeddingSearch.ts — Deterministic Semantic Vectorizer & Hybrid Index.
 * Vector projection, cosine similarity, Russian clinical stemming, and lexical overlap calculation.
 */

import {
	type KnowledgeItem,
	type SemanticCluster,
	VECTOR_DIMENSION,
} from "./types.js";

export const RUSSIAN_STOP_WORDS: ReadonlySet<string> = new Set([
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

export const CONVERSATIONAL_QUERY_PREFIXES: ReadonlySet<string> = new Set([
	"скольк", "стоит", "поставит", "цен", "почем", "рубл", "руб", "услуг", "процедур",
	"кака", "какой", "какие", "скажит", "подскажит", "хотел", "нужн", "надо", "804н", "804",
]);

export const DENTAL_SEMANTIC_CLUSTERS: readonly SemanticCluster[] = [
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

export function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^a-zа-я0-9\s._-]/gi, " ")
		.trim();
}

export function stemRussianWord(word: string): string {
	if (word.length <= 3) return word;
	return word
		.replace(/(ов|ев|ей|ями|ами|ом|ем|ой|ей|ью|ях|ах|ам|ям|ому|ему|ых|их|ую|юю|ая|яя|ое|ее|ые|ие|ый|ий|ой|ем|им|ым)$/i, "")
		.replace(/(а|я|о|е|у|ю|ы|и|ь|ъ)$/i, "");
}

export function extractUniqueStems(text: string): Set<string> {
	const normalized = normalizeText(text);
	const words = normalized.split(/\s+/).filter(Boolean);
	const set = new Set<string>();
	for (const w of words) {
		if (RUSSIAN_STOP_WORDS.has(w) && w.length < 4) continue;
		set.add(stemRussianWord(w));
	}
	return set;
}

export function hashString32(str: string, seed = 0x9747b28c): number {
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

export function stemMatches(queryStem: string, itemStem: string): boolean {
	if (queryStem === itemStem) return true;
	if (queryStem.length >= 4 && itemStem.length >= 4) {
		return itemStem.includes(queryStem) || queryStem.includes(itemStem);
	}
	return false;
}

export function computeClinicalStemOverlap(
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

/**
 * Computes hybrid vector-lexical match score between a candidate knowledge item and query.
 */
export function calculateHybridMatchScore(
	item: KnowledgeItem,
	queryVec: readonly number[],
	queryStems: ReadonlySet<string>,
	normalizedQuery: string,
): number {
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

	return score;
}
