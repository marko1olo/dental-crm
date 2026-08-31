/**
 * knowledgeStore.test.ts — Test suite for 804n Statutory Price Grounding,
 * Clinical Protocols Vector Retrieval, Anti-Hallucination Barrier, and Tenant Isolation.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import type { AgentContext } from "../context.js";
import { ToolRegistry } from "../tools/registry.js";
import { registerRagTools, searchKnowledgeBaseTool } from "../tools/ragTools.js";
import {
	computeSemanticEmbedding,
	cosineSimilarity,
	DEFAULT_SIMILARITY_THRESHOLD,
	KnowledgeStore,
	PRICE_NOT_FOUND_MESSAGE,
	VECTOR_DIMENSION,
} from "./knowledgeStore.js";

const ORG_A = "00000000-0000-7000-8000-000000000001";
const ORG_B = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000003";

function createTestContext(
	orgId: string = ORG_A,
	overrides: Partial<AgentContext> = {},
): AgentContext {
	const registry = new ToolRegistry();
	registerRagTools(registry, "internal");

	return {
		organizationId: orgId,
		clinicId: "00000000-0000-7000-8000-000000000004",
		userId: USER_ID,
		sessionId: "test-session-rag",
		mode: "autonomous",
		permissions: ["clinical.read"],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("1. Vector Embedding & Cosine Similarity Math", () => {
	test("computeSemanticEmbedding produces normalized 256-dimensional dense vectors", () => {
		const text = "Лечение кариеса дентина пломбированием светоотверждаемым композитом";
		const vec = computeSemanticEmbedding(text);

		assert.strictEqual(vec.length, VECTOR_DIMENSION);

		// Verify unit norm (sum of squares ≈ 1.0)
		let normSq = 0;
		for (const v of vec) {
			normSq += v * v;
		}
		assert.ok(
			Math.abs(normSq - 1.0) < 1e-3,
			`Vector norm should be approx 1.0, got ${normSq}`,
		);
	});

	test("cosineSimilarity returns 1.0 for identical vectors", () => {
		const text = "Восстановление зуба пломбой из фотополимеров";
		const vec1 = computeSemanticEmbedding(text);
		const vec2 = computeSemanticEmbedding(text);

		const sim = cosineSimilarity(vec1, vec2);
		assert.ok(
			sim >= 0.999,
			`Identical vectors must have similarity >= 0.999, got ${sim}`,
		);
	});

	test("cosineSimilarity yields high score >= 0.75 for semantically synonymous queries", () => {
		const doc = "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров";
		const query = "поставить световую пломбу из фотополимера при кариесе";

		const docVec = computeSemanticEmbedding(doc);
		const queryVec = computeSemanticEmbedding(query);

		const sim = cosineSimilarity(docVec, queryVec);
		assert.ok(
			sim >= DEFAULT_SIMILARITY_THRESHOLD,
			`Synonymous query should score >= ${DEFAULT_SIMILARITY_THRESHOLD}, got ${sim}`,
		);
	});

	test("cosineSimilarity yields low score (< 0.40) for completely unrelated topics", () => {
		const doc = "Внутрикостная дентальная имплантация титанового имплантата";
		const unrelatedQuery = "бухгалтерский баланс налог на прибыль НДС 20%";

		const docVec = computeSemanticEmbedding(doc);
		const queryVec = computeSemanticEmbedding(unrelatedQuery);

		const sim = cosineSimilarity(docVec, queryVec);
		assert.ok(
			sim < 0.4,
			`Unrelated text must have similarity < 0.40, got ${sim}`,
		);
	});
});

describe("2. 804n Statutory Price Grounding & Anti-Hallucination", () => {
	test("KnowledgeStore seeds official 804n nomenclature price catalog", () => {
		const store = new KnowledgeStore();
		const items = store.listItems(ORG_A, "price_804n");

		assert.ok(items.length >= 10, "Should contain at least 10 statutory 804n items");
		assert.ok(items.some((i) => i.code804n === "A16.07.002.001"));
		assert.ok(items.some((i) => i.code804n === "A16.07.054"));
		assert.ok(items.some((i) => i.code804n === "A16.07.004"));
	});

	test("groundPrice804n retrieves exact price and code for composite filling", async () => {
		const store = new KnowledgeStore();
		const result = await store.groundPrice804n(
			"Сколько стоит поставить световую пломбу при кариесе фотополимер",
			ORG_A,
		);

		assert.strictEqual(result.found, true);
		assert.ok(
			result.code804n?.startsWith("A16.07.002"),
			`Expected 804n photopolymer series A16.07.002.*, got ${result.code804n}`,
		);
		assert.ok(result.priceRub && result.priceRub >= 4500);
		assert.ok(result.score >= DEFAULT_SIMILARITY_THRESHOLD);
		assert.ok(result.message.includes("₽"));
	});

	test("groundPrice804n retrieves dental implant surgery price", async () => {
		const store = new KnowledgeStore();
		const result = await store.groundPrice804n(
			"стоимость дентальной имплантации установка имплантата",
			ORG_A,
		);

		assert.strictEqual(result.found, true);
		assert.strictEqual(result.code804n, "A16.07.054");
		assert.strictEqual(result.priceRub, 38000);
		assert.ok(result.message.includes("38000 ₽"));
	});

	test("groundPrice804n retrieves professional hygiene price", async () => {
		const store = new KnowledgeStore();
		const result = await store.groundPrice804n(
			"профессиональная гигиена чистка зубов air-flow ультразвук",
			ORG_A,
		);

		assert.strictEqual(result.found, true);
		assert.strictEqual(result.code804n, "A16.07.004");
		assert.strictEqual(result.priceRub, 4900);
	});

	test("Anti-hallucination: uncataloged or hallucinated procedure returns standard refusal message", async () => {
		const store = new KnowledgeStore();
		const hallucinatedQuery = "квантовая телепортация зуба в открытый космос лазером";

		const result = await store.groundPrice804n(hallucinatedQuery, ORG_A);

		assert.strictEqual(result.found, false);
		assert.strictEqual(result.priceRub, undefined);
		assert.strictEqual(result.message, PRICE_NOT_FOUND_MESSAGE);
	});
});

describe("3. Multi-Tenant Knowledge Base Isolation", () => {
	test("Custom items added to Org A are strictly invisible to Org B", async () => {
		const store = new KnowledgeStore();

		// Org A adds custom unique service
		store.upsertItem({
			organizationId: ORG_A,
			category: "price_804n",
			code804n: "A16.07.999.001",
			title: "VIP Авторское лазерное отбеливание зубов Beyond Polus Advanced",
			content: "Эксклюзивное бережное отбеливание эмали холодным светом Beyond Polus с ремотерапией",
			priceRub: 35000,
			durationMinutes: 90,
		});

		// Org A searches for it -> Found
		const matchOrgA = await store.search(
			"VIP Авторское лазерное отбеливание зубов Beyond Polus",
			{ organizationId: ORG_A },
		);
		assert.ok(matchOrgA.length >= 1);
		assert.strictEqual(matchOrgA[0]?.item.code804n, "A16.07.999.001");
		assert.strictEqual(matchOrgA[0]?.item.priceRub, 35000);

		// Org B searches for it -> NOT Found (Tenant Isolation Guard)
		const matchOrgB = await store.search(
			"VIP Авторское лазерное отбеливание зубов Beyond Polus",
			{ organizationId: ORG_B, threshold: 0.85 },
		);
		assert.strictEqual(
			matchOrgB.some((m) => m.item.code804n === "A16.07.999.001"),
			false,
			"Org B must never see Org A custom catalog item",
		);

		// Org B price grounding returns standard refusal
		const groundingOrgB = await store.groundPrice804n(
			"VIP Авторское лазерное отбеливание зубов Beyond Polus",
			ORG_B,
			0.85,
		);
		assert.strictEqual(groundingOrgB.found, false);
		assert.strictEqual(groundingOrgB.message, PRICE_NOT_FOUND_MESSAGE);
	});
});

describe("4. Clinical Protocols & Guarantee Policies Retrieval", () => {
	test("Retrieves statutory clinical protocol by ICD-10 and symptoms", async () => {
		const store = new KnowledgeStore();
		const results = await store.search(
			"острый пульпит ночная приступообразная боль коффердам экстирпация каналы",
			{ organizationId: ORG_A, category: "clinical_protocol" },
		);

		assert.ok(results.length >= 1);
		assert.strictEqual(results[0]?.item.icd10Code, "K04.0");
		assert.ok(/пульпит/i.test(results[0]?.item.content ?? ""));
	});

	test("Retrieves clinic guarantee policies with terms and conditions", async () => {
		const store = new KnowledgeStore();
		const results = await store.search(
			"какая гарантия на пломбу и терапевтическое лечение зубов",
			{ organizationId: ORG_A, category: "guarantee" },
		);

		assert.ok(results.length >= 1);
		assert.ok(results[0]?.item.content.includes("12–24 месяца"));
		assert.ok(/гигиен/i.test(results[0]?.item.content ?? ""));
	});
});

describe("5. ToolRegistry Chokepoint & RAG Tool Invocation", () => {
	test("searchKnowledgeBaseTool executes through ToolRegistry chokepoint", async () => {
		const ctx = createTestContext(ORG_A);

		const result = (await ctx.tools.call(ctx, "internal.search_knowledge_base", {
			query: "Сколько стоит пломба при кариесе фотополимер 804н",
			category: "price_804n",
		})) as any;

		assert.strictEqual(result.ok, true);
		assert.strictEqual(result.data.found, true);
		assert.strictEqual(result.data.category, "price_804n");
		assert.ok(
			result.data.grounding.code804n?.startsWith("A16.07.002"),
			`Expected A16.07.002 series, got ${result.data.grounding.code804n}`,
		);
		assert.ok(result.data.grounding.priceRub >= 4500);
		assert.ok(result.data.results.length >= 1);
	});

	test("searchKnowledgeBaseTool blocks price hallucinations with exact refusal message", async () => {
		const ctx = createTestContext(ORG_A);

		const result = (await ctx.tools.call(ctx, "internal.search_knowledge_base", {
			query: "пересадка искусственной челюсти робота-киборга",
			category: "price_804n",
		})) as any;

		assert.strictEqual(result.ok, true);
		assert.strictEqual(result.data.found, false);
		assert.strictEqual(result.data.message, PRICE_NOT_FOUND_MESSAGE);
		assert.deepStrictEqual(result.data.results, []);
	});

	test("searchKnowledgeBaseTool retrieves general clinical protocols via tool", async () => {
		const ctx = createTestContext(ORG_A);

		const result = (await ctx.tools.call(ctx, "internal.search_knowledge_base", {
			query: "протокол лечения кариеса дентина K02.1",
			category: "clinical_protocol",
		})) as any;

		assert.strictEqual(result.ok, true);
		assert.strictEqual(result.data.found, true);
		assert.ok(result.data.results.some((r: any) => r.icd10Code === "K02.1"));
	});
});
