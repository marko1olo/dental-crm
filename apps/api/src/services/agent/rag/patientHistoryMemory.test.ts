/**
 * patientHistoryMemory.test.ts — Comprehensive Test Suite for 5-Year Patient EHR Semantic Memory,
 * Vectorizer, Clinical Intent Parser, BM25/Cosine Hybrid Ranking, and clinical.search_patient_history Tool.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import type { AgentContext } from "../context.js";
import { ToolRegistry } from "../tools/registry.js";
import {
	buildPatientHistoryMemoryIndex,
	computeDenseEmbeddingVector,
	cosineSimilarity,
	extractFdiTeethFromText,
	extractNormalizedKeywords,
	extractTimestampFromUuidV7,
	type MemoryMatchResult,
	parseClinicalHistoryQuery,
	type PatientHistoryMemoryChunk,
	searchPatientHistoryMemory,
	searchPatientHistoryTool,
	stemRussianDentalWord,
} from "./patientHistoryMemory.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000003";
const PATIENT_ID = "00000000-0000-7000-8000-000000000004";

function createTestContext(
	// biome-ignore lint/suspicious/noExplicitAny: Test DB mock
	dbMock: any = null,
	overrides: Partial<AgentContext> = {},
): AgentContext {
	const registry = new ToolRegistry();
	registry.register(searchPatientHistoryTool, "clinical");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: USER_ID,
		sessionId: "test-session-ehr-memory",
		mode: "autonomous",
		permissions: ["clinical.read", "clinical.write"],
		tools: registry,
		db: dbMock,
		...overrides,
	};
}

// ─── SYNTHETIC 5-YEAR CLINICAL FIXTURES ──────────────────────────────────────

const MOCK_PATIENT_CHUNKS: PatientHistoryMemoryChunk[] = [
	{
		id: "chunk_visit_001",
		patientId: PATIENT_ID,
		organizationId: ORG_ID,
		category: "visit_diary_043u",
		date: "2023-04-12T10:30:00.000Z",
		toothNumber: 36,
		toothCodes: ["36"],
		doctorUserId: "doc_barabash",
		doctorFullName: "Барабаш С.В.",
		visitId: "visit_001",
		diagnosisCode: "K04.0",
		diagnosisTitle: "Острый пульпит",
		materials: [
			"Filtek Ultimate A2",
			"эндомотор Protaper Next",
			"гуттаперча с силером AH Plus",
			"коффердам Sanctuary",
		],
		anesthesia:
			"Ультракаин Д-С форте 1:100000 1.7 мл (инфильтрационная и проводниковая)",
		complications: undefined,
		summary:
			"Прием от 12.04.2023 (Врач: Барабаш С.В.); Зуб FDI 36; Диагноз: K04.0 Пульпит; Материалы: Filtek Ultimate A2, эндомотор Protaper Next, гуттаперча с силером AH Plus, коффердам Sanctuary; Анестезия: Ультракаин Д-С форте 1:100000 1.7 мл; Итог: Депульпирование и трехмерная обтурация 3 каналов 36 зуба",
		rawContent:
			"Жалобы на ночные боли в 36 зубе. Диагноз: K04.0. Проведена экстирпация, механическая обработка Protaper Next, пломбирование каналов гуттаперчей, реставрация Filtek Ultimate.",
		keywords: extractNormalizedKeywords(
			"36 пульпит k04.0 барабаш filtek protaper гуттаперча ультракаин коффердам депульпирование",
		),
		vector: computeDenseEmbeddingVector(
			"36 пульпит k04.0 барабаш filtek protaper гуттаперча ультракаин депульпирование",
		),
	},
	{
		id: "chunk_visit_002",
		patientId: PATIENT_ID,
		organizationId: ORG_ID,
		category: "visit_diary_043u",
		date: "2022-08-15T14:00:00.000Z",
		toothNumber: 47,
		toothCodes: ["47"],
		doctorUserId: "doc_smirnova",
		doctorFullName: "Смирнова Е.А.",
		visitId: "visit_002",
		diagnosisCode: "K02.1",
		diagnosisTitle: "Кариес дентина глубокий",
		materials: [
			"Estelite Asteria A3B",
			"лечебная прокладка TheraCal LC",
			"OptiBond FL",
		],
		anesthesia: "Артикаин с эпинефрином 1:100000 (1.8 мл)",
		complications:
			"Кратковременный вазовагальный обморок / головокружение после введения анестетика. Купировано ингаляцией кислорода и положением Тренделенбурга.",
		summary:
			"Прием от 15.08.2022 (Врач: Смирнова Е.А.); Зуб FDI 47; Диагноз: K02.1 Кариес дентина; Материалы: Estelite Asteria A3B, TheraCal LC; Анестезия: Артикаин с эпинефрином; Осложнения: Кратковременный вазовагальный обморок после анестезии",
		rawContent:
			"Лечение глубокого кариеса 47 зуба. После проводниковой анестезии артикаином — резкая слабость, головокружение, реакция на адреналин. Прокладка TheraCal LC, пломба Estelite Asteria.",
		keywords: extractNormalizedKeywords(
			"47 кариес k02.1 смирнова estelite theracal артикаин обморок головокружение осложнение анестезия",
		),
		vector: computeDenseEmbeddingVector(
			"47 кариес k02.1 смирнова estelite theracal артикаин обморок головокружение осложнение анестезия",
		),
	},
	{
		id: "chunk_comp_002",
		patientId: PATIENT_ID,
		organizationId: ORG_ID,
		category: "complication_event",
		date: "2022-08-15T14:00:00.000Z",
		toothNumber: 47,
		doctorFullName: "Смирнова Е.А.",
		visitId: "visit_002",
		anesthesia: "Артикаин с адреналином 1:100 000",
		complications:
			"Кратковременный вазовагальный обморок / головокружение после введения анестетика с адреналином.",
		summary:
			"Осложнение на приеме 15.08.2022 (Смирнова Е.А.): Кратковременный вазовагальный обморок / реакция на адреналиновый компонент анестетика при лечении 47 зуба",
		rawContent:
			"Осложнение анестезии: артикаин 1:100000 вызвал сосудистый коллапс и головокружение. Рекомендован скандонест без вазоконстриктора.",
		keywords: extractNormalizedKeywords(
			"осложнение анестезия артикаин адреналин обморок головокружение смирнова 47",
		),
		vector: computeDenseEmbeddingVector(
			"осложнение анестезия артикаин адреналин обморок головокружение смирнова 47",
		),
	},
	{
		id: "chunk_allergy_001",
		patientId: PATIENT_ID,
		organizationId: ORG_ID,
		category: "allergy_anamnesis",
		date: "2021-03-10T00:00:00.000Z",
		summary:
			"Аллергия / Непереносимость: Бета-лактамные антибиотики (МНН: Amoxicillin), тяжесть: critical, проявления: Анафилактоидная реакция, отек Квинке [Триада Самтера / Аспириновая астма: нет]. Прим: В анамнезе госпитализация в 2019 г.",
		rawContent:
			"Аллергия на пенициллины, амоксициллин, ампициллин. Отек Квинке, крапивница. Категорически противопоказан амоксиклав и аугментин.",
		keywords: extractNormalizedKeywords(
			"аллергия пенициллин амоксициллин амоксиклав отек квинке анафилаксия непереносимость",
		),
		vector: computeDenseEmbeddingVector(
			"аллергия пенициллин амоксициллин амоксиклав отек квинке анафилаксия непереносимость",
		),
	},
	{
		id: "chunk_img_001",
		patientId: PATIENT_ID,
		organizationId: ORG_ID,
		category: "imaging_xray",
		date: "2024-01-20T11:15:00.000Z",
		summary:
			"Рентген-исследование (CBCT / КЛКТ) от 20.01.2024: КЛКТ обеих челюстей 12х9 см HD, область: челюстно-лицевая область. AI-анализ: Деструкция костной ткани в области верхушки корня 16 зуба (периодонтит), ретенция зуба 38 и 48.",
		rawContent:
			"Конусно-лучевая компьютерная томография (КЛКТ) 2024 год. Очаг деструкции кости у зуба 16, дистопия восьмерок 38 и 48.",
		keywords: extractNormalizedKeywords(
			"снимки клкт кт 2024 рентген челюсти деструкция кость 16 38 48",
		),
		vector: computeDenseEmbeddingVector(
			"снимки клкт кт 2024 рентген челюсти деструкция кость 16 38 48",
		),
	},
	{
		id: "chunk_tooth_hist_001",
		patientId: PATIENT_ID,
		organizationId: ORG_ID,
		category: "odontogram_tooth_state",
		date: "2023-04-12T10:30:00.000Z",
		toothNumber: 36,
		doctorFullName: "Барабаш С.В.",
		summary:
			"Зуб FDI 36: изменение статуса от 12.04.2023 (Барабаш С.В.) — с 'caries' на 'pulpitis_treated' (эндодонтическое лечение). Причина: Острый пульпит",
		rawContent:
			"Одонтограмма: зуб 36 пролечен эндодонтически, 3 канала запломбированы, установлена постоянная пломба.",
		keywords: extractNormalizedKeywords(
			"зуб 36 одонтограмма pulpitis эндодонтия барабаш",
		),
		vector: computeDenseEmbeddingVector(
			"зуб 36 одонтограмма pulpitis эндодонтия барабаш",
		),
	},
	{
		id: "chunk_item_001",
		patientId: PATIENT_ID,
		organizationId: ORG_ID,
		category: "treatment_item",
		date: "2024-05-18T16:00:00.000Z",
		toothNumber: 46,
		toothCodes: ["46"],
		doctorFullName: "Петров И.Н.",
		summary:
			"Выполненная процедура от 18.05.2024 (зуб FDI 46): Установка цельнокерамической коронки E.max CAD — 32000 ₽ (врач: Петров И.Н.). Заметка: Фиксация на Variolink Esthetic DC",
		rawContent:
			"Ортопедический прием: коронка e.max на 46 зуб, цемент Variolink Esthetic, цвет А2.",
		keywords: extractNormalizedKeywords(
			"46 коронка e.max variolink петров ортопедия 2024",
		),
		vector: computeDenseEmbeddingVector(
			"46 коронка e.max variolink петров ортопедия 2024",
		),
	},
];

// ─── TEST SUITES ─────────────────────────────────────────────────────────────

describe("1. Dental Morphology, Stemmer & Tokenizer", () => {
	test("stemRussianDentalWord normalizes various grammatical cases of dental roots", () => {
		assert.strictEqual(stemRussianDentalWord("пульпита"), "пульпит");
		assert.strictEqual(stemRussianDentalWord("пульпитом"), "пульпит");
		assert.strictEqual(stemRussianDentalWord("кариесом"), "кариес");
		assert.strictEqual(stemRussianDentalWord("периодонтиту"), "периодонтит");
		assert.strictEqual(stemRussianDentalWord("анестезией"), "анестези");
		assert.strictEqual(stemRussianDentalWord("артикаина"), "артикаин");
		assert.strictEqual(stemRussianDentalWord("коронку"), "коронк");
		assert.strictEqual(stemRussianDentalWord("коронками"), "коронк");
		assert.strictEqual(stemRussianDentalWord("гуттаперчей"), "гуттаперч");
		assert.strictEqual(stemRussianDentalWord("снимка"), "снимок");
	});

	test("extractNormalizedKeywords filters stop words and preserves alphanumeric codes", () => {
		const text =
			"Пациент обратился с острой болью в 36 зубе, диагноз K04.0 пульпит, применялся Filtek A2.";
		const keywords = extractNormalizedKeywords(text);

		assert.ok(keywords.includes("36"), "Should contain tooth code 36");
		assert.ok(
			keywords.includes("k04.0") || keywords.includes("k04"),
			"Should contain diagnosis code",
		);
		assert.ok(
			keywords.includes("пульпит"),
			"Should contain normalized root 'пульпит'",
		);
		assert.ok(
			keywords.includes("filtek"),
			"Should contain material name 'filtek'",
		);
		assert.ok(!keywords.includes("в"), "Should filter stop word 'в'");
		assert.ok(!keywords.includes("с"), "Should filter stop word 'с'");
		assert.ok(!keywords.includes("зуб"), "Should filter generic stop word 'зуб'");
	});

	test("extractTimestampFromUuidV7 accurately extracts milliseconds timestamp from RFC 9562 UUIDv7", () => {
		// Timestamp: 1711200000000 ms (2024-03-23T13:20:00.000Z)
		// Hex: (1711200000000).toString(16) -> "18e69d78f00" -> padded 12 chars "018e69d78f00"
		const testUuidV7 = "018e69d7-8f00-7000-8000-000000000000";
		const extractedDate = extractTimestampFromUuidV7(testUuidV7);

		assert.ok(extractedDate !== null, "Extracted date must not be null");
		assert.strictEqual(extractedDate?.getTime(), 1711172718336);
		assert.strictEqual(
			extractedDate?.toISOString(),
			"2024-03-23T05:45:18.336Z",
		);

		// Invalid or non-UUIDv7 inputs return null
		assert.strictEqual(extractTimestampFromUuidV7(null), null);
		assert.strictEqual(extractTimestampFromUuidV7(""), null);
		assert.strictEqual(
			extractTimestampFromUuidV7("00000000-0000-4000-8000-000000000000"), // UUIDv4
			null,
		);
	});
});

describe("2. Dense 128-Dimensional Vectorizer & Cosine Similarity", () => {
	test("computeDenseEmbeddingVector generates normalized 128-dimensional unit vector", () => {
		const vec = computeDenseEmbeddingVector("Лечение пульпита 36 зуба");
		assert.strictEqual(vec.length, 128);

		// Calculate L2 norm
		let normSq = 0;
		for (const val of vec) normSq += val * val;
		const norm = Math.sqrt(normSq);

		assert.ok(
			Math.abs(norm - 1.0) < 1e-4,
			`Vector must be unit-normalized, got norm = ${norm}`,
		);
	});

	test("Deterministic embedding: identical strings produce identical vectors", () => {
		const text = "Острый апикальный периодонтит 46 зуба";
		const vec1 = computeDenseEmbeddingVector(text);
		const vec2 = computeDenseEmbeddingVector(text);

		assert.deepStrictEqual(vec1, vec2);
		assert.ok(
			Math.abs(cosineSimilarity(vec1, vec2) - 1.0) < 1e-5,
			"Cosine similarity of identical vectors must be 1.0",
		);
	});

	test("Cosine similarity ranks semantically related dental texts significantly higher than unrelated", () => {
		const query = computeDenseEmbeddingVector("лечение пульпита зуб 36");
		const relevantDoc = computeDenseEmbeddingVector(
			"Депульпирование 36 зуба, пульпит K04.0, пломбирование каналов",
		);
		const unrelatedDoc = computeDenseEmbeddingVector(
			"Оплата счета за коммунальные услуги и аренду помещения клиники",
		);

		const simRelevant = cosineSimilarity(query, relevantDoc);
		const simUnrelated = cosineSimilarity(query, unrelatedDoc);

		assert.ok(
			simRelevant > 0.25,
			`Expected solid similarity for relevant doc, got ${simRelevant}`,
		);
		assert.ok(
			simUnrelated < 0.35,
			`Expected low similarity for unrelated doc, got ${simUnrelated}`,
		);
		assert.ok(
			simRelevant > simUnrelated * 1.5,
			"Relevant doc must score significantly higher than unrelated doc",
		);
	});
});

describe("3. Clinical Query Intent & Entity Parser", () => {
	test("Parses tooth history query with FDI numbers and Russian inflections", () => {
		const q1 = parseClinicalHistoryQuery("Когда лечили 36 зуб?");
		assert.strictEqual(q1.intent, "tooth_treatment_history");
		assert.deepStrictEqual(q1.extractedTeeth, [36]);
		assert.strictEqual(q1.targetCategory, "visit_diary_043u");

		const q2 = parseClinicalHistoryQuery("Что делали с сорок седьмым зубом?");
		assert.strictEqual(q2.intent, "tooth_treatment_history");
		assert.deepStrictEqual(q2.extractedTeeth, [47]);
	});

	test("Parses anesthesia complications query", () => {
		const q = parseClinicalHistoryQuery(
			"Были ли осложнения или аллергия после анестезии?",
		);
		assert.ok(
			q.intent === "anesthesia_complications" || q.intent === "allergy_check",
		);
		assert.ok(q.extractedKeywords.includes("анестези"));
	});

	test("Parses allergy anamnesis inquiry", () => {
		const q = parseClinicalHistoryQuery("Есть ли аллергия на пенициллин?");
		assert.strictEqual(q.intent, "allergy_check");
		assert.strictEqual(q.targetCategory, "allergy_anamnesis");
		assert.ok(q.extractedKeywords.includes("пенициллин"));
	});

	test("Parses imaging query with target year extraction", () => {
		const q = parseClinicalHistoryQuery(
			"Какие снимки или КЛКТ делали в 2024 году?",
		);
		assert.strictEqual(q.intent, "imaging_search");
		assert.strictEqual(q.targetCategory, "imaging_xray");
		assert.strictEqual(q.targetYear, 2024);
	});

	test("Parses restorative materials query", () => {
		const q = parseClinicalHistoryQuery(
			"Какие пломбировочные материалы и композиты использовались?",
		);
		assert.strictEqual(q.intent, "materials_used");
		assert.strictEqual(q.targetCategory, "treatment_item");
	});
});

describe("4. 5-Year Semantic Memory Search Engine (Hybrid Cosine + BM25 + FDI)", () => {
	test("Scenario A: 'Когда лечили 36 зуб?' returns exact date, doctor Барабаш, and K04.0", async () => {
		const result = await searchPatientHistoryMemory({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			query: "Когда лечили 36 зуб?",
			preloadedChunks: MOCK_PATIENT_CHUNKS,
		});

		assert.strictEqual(result.patientId, PATIENT_ID);
		assert.ok(result.matchesCount >= 1);

		const topMatch = result.matches[0];
		assert.strictEqual(topMatch.toothNumber, 36);
		assert.strictEqual(topMatch.doctorFullName, "Барабаш С.В.");
		assert.strictEqual(topMatch.diagnosis?.code, "K04.0");
		assert.strictEqual(topMatch.relevance, "high");
		assert.ok(
			topMatch.materials?.some((m) => m.includes("Filtek")),
			"Should contain Filtek composite material",
		);

		// Verifies Russian synthesized answer
		assert.ok(
			result.synthesizedAnswerRu.includes("36"),
			"Synthesis must mention tooth 36",
		);
		assert.ok(
			result.synthesizedAnswerRu.includes("12.04.2023"),
			"Synthesis must contain exact date 12.04.2023",
		);
		assert.ok(
			result.synthesizedAnswerRu.includes("Барабаш"),
			"Synthesis must name doctor Барабаш",
		);
		assert.ok(
			result.synthesizedAnswerRu.includes("K04.0"),
			"Synthesis must mention ICD diagnosis K04.0",
		);
	});

	test("Scenario B: 'Были ли осложнения после анестезии?' finds vasovagal event from 2022", async () => {
		const result = await searchPatientHistoryMemory({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			query: "Были ли осложнения после анестезии?",
			preloadedChunks: MOCK_PATIENT_CHUNKS,
		});

		assert.ok(result.matchesCount >= 1);
		const compMatch = result.matches.find(
			(m) =>
				m.category === "complication_event" ||
				(m.complications && m.complications.length > 0),
		);

		assert.ok(
			compMatch !== undefined,
			"Must find the complication event chunk",
		);
		assert.strictEqual(compMatch?.doctorFullName, "Смирнова Е.А.");
		assert.ok(
			compMatch?.summary.includes("обморок") ||
				compMatch?.summary.includes("головокружение"),
		);

		// Russian synthesized alert check
		assert.ok(
			result.synthesizedAnswerRu.includes("Внимание") ||
				result.synthesizedAnswerRu.includes("осложнения"),
			"Must produce warning synthesis for complications",
		);
		assert.ok(
			result.synthesizedAnswerRu.includes("15.08.2022"),
			"Must pinpoint exact date of complication",
		);
	});

	test("Scenario C: 'Есть ли аллергия на пенициллин или амоксициллин?' detects critical penicillin allergy", async () => {
		const result = await searchPatientHistoryMemory({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			query: "Есть ли аллергия на пенициллин или амоксициллин?",
			preloadedChunks: MOCK_PATIENT_CHUNKS,
		});

		assert.ok(result.matchesCount >= 1);
		const allergyMatch = result.matches.find(
			(m) => m.category === "allergy_anamnesis",
		);

		assert.ok(allergyMatch !== undefined, "Must retrieve allergy chunk");
		assert.ok(allergyMatch?.summary.includes("Бета-лактамные антибиотики"));
		assert.ok(allergyMatch?.summary.includes("Amoxicillin"));

		assert.ok(
			result.synthesizedAnswerRu.includes("Аллергоанамнез"),
			"Must synthesize allergy warning in Russian",
		);
		assert.ok(
			result.synthesizedAnswerRu.includes("Amoxicillin") ||
				result.synthesizedAnswerRu.includes("Бета-лактамные"),
		);
	});

	test("Scenario D: 'Какие снимки делали в 2024 году?' finds 2024 CBCT CT study", async () => {
		const result = await searchPatientHistoryMemory({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			query: "Какие снимки делали в 2024 году?",
			preloadedChunks: MOCK_PATIENT_CHUNKS,
		});

		assert.ok(result.matchesCount >= 1);
		const top = result.matches[0];
		assert.strictEqual(top.category, "imaging_xray");
		assert.ok(top.summary.includes("КЛКТ"));
		assert.ok(top.summary.includes("20.01.2024"));
	});

	test("Scenario E: 'Какая коронка установлена на 46 зуб?' retrieves E.max crown by doctor Петров", async () => {
		const result = await searchPatientHistoryMemory({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			query: "Какая коронка установлена на 46 зуб?",
			preloadedChunks: MOCK_PATIENT_CHUNKS,
		});

		assert.ok(result.matchesCount >= 1);
		const crownMatch = result.matches.find((m) => m.toothNumber === 46);
		assert.ok(crownMatch !== undefined, "Must find tooth 46 record");
		assert.ok(
			crownMatch?.summary.includes("E.max") ||
				crownMatch?.summary.includes("коронки"),
		);
		assert.strictEqual(crownMatch?.doctorFullName, "Петров И.Н.");
	});
});

describe("5. Agent Tool 'clinical.search_patient_history' Execution & Validation", () => {
	test("Tool definition metadata, parameters schema, and permissions", () => {
		assert.strictEqual(searchPatientHistoryTool.name, "search_patient_history");
		assert.strictEqual(searchPatientHistoryTool.category, "read");
		assert.deepStrictEqual(searchPatientHistoryTool.permissions, [
			"clinical.read",
		]);

		// Parameter schema validation
		const validParams = {
			patientId: "00000000-0000-7000-8000-000000000004",
			query: "Когда лечили 36 зуб?",
			toothNumber: 36,
			maxAgeYears: 5,
			limit: 10,
		};
		const parsed =
			searchPatientHistoryTool.parameters.safeParse(validParams);
		assert.ok(parsed.success, "Valid parameters must pass Zod schema");

		// Rejects invalid UUID
		const invalidUuid = {
			patientId: "invalid-uuid",
			query: "Когда лечили 36 зуб?",
		};
		const failedUuid =
			searchPatientHistoryTool.parameters.safeParse(invalidUuid);
		assert.ok(!failedUuid.success, "Invalid UUID must be rejected");

		// Rejects empty query
		const emptyQuery = {
			patientId: "00000000-0000-7000-8000-000000000004",
			query: "",
		};
		const failedQuery =
			searchPatientHistoryTool.parameters.safeParse(emptyQuery);
		assert.ok(!failedQuery.success, "Empty query must be rejected");
	});

	test("Tool invocation via ToolRegistry with mocked DB client", async () => {
		// Mock Drizzle DB client that returns patient
		const mockDb = {
			select: (_fields?: unknown) => ({
				from: (_table: unknown) => {
					const makeChain = (data: unknown[]) => {
						const promiseObj: any = Promise.resolve(data);
						promiseObj.where = () => makeChain(data);
						promiseObj.limit = () => Promise.resolve(data);
						promiseObj.orderBy = () => makeChain(data);
						return promiseObj;
					};
					return makeChain([
						{ id: PATIENT_ID, fullName: "Барабаш Сергей Владимирович" },
					]);
				},
			}),
		};

		const ctx = createTestContext(mockDb);

		const result = await ctx.tools.call(
			ctx,
			"clinical.search_patient_history",
			{
				patientId: PATIENT_ID,
				query: "Когда лечили 36 зуб?",
				toothNumber: 36,
			},
		);

		assert.strictEqual(result.ok, true, `Tool call must succeed: ${result.error}`);
		assert.ok(result.data !== undefined);

		// biome-ignore lint/suspicious/noExplicitAny: Data inspection
		const data = result.data as any;
		assert.strictEqual(data.patientId, PATIENT_ID);
		assert.strictEqual(data.patientFullName, "Барабаш Сергей Владимирович");
		assert.strictEqual(data.query, "Когда лечили 36 зуб?");
		assert.strictEqual(data.intent, "tooth_treatment_history");
		assert.deepStrictEqual(data.extractedTeeth, [36]);
		assert.ok(typeof data.synthesizedAnswerRu === "string");
	});

	test("Tool rejects patient not belonging to active tenant organization", async () => {
		// Mock DB returning no patient for this organization
		const mockDb = {
			select: (_fields?: unknown) => ({
				from: (_table: unknown) => {
					const makeChain = (data: unknown[]) => {
						const promiseObj: any = Promise.resolve(data);
						promiseObj.where = () => makeChain(data);
						promiseObj.limit = () => Promise.resolve(data);
						promiseObj.orderBy = () => makeChain(data);
						return promiseObj;
					};
					return makeChain([]); // Empty array = patient not found in tenant
				},
			}),
		};

		const ctx = createTestContext(mockDb);

		const result = await ctx.tools.call(
			ctx,
			"clinical.search_patient_history",
			{
				patientId: "00000000-0000-7000-8000-000000000999",
				query: "Когда лечили 36 зуб?",
			},
		);

		assert.strictEqual(result.ok, false);
		assert.ok(
			result.error?.includes("не найден в клинике"),
			`Expected tenant isolation error, got ${result.error}`,
		);
	});

	test("Tool respects RBAC permissions check", async () => {
		const ctx = createTestContext(null, {
			permissions: ["schedule.read"], // Missing clinical.read
		});

		const result = await ctx.tools.call(
			ctx,
			"clinical.search_patient_history",
			{
				patientId: PATIENT_ID,
				query: "Когда лечили 36 зуб?",
			},
		);

		assert.strictEqual(result.ok, false);
		assert.ok(
			result.error?.includes("permission denied"),
			`Expected permission error, got ${result.error}`,
		);
	});
});
