import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_EMBEDDING_DIMENSION,
	EmbeddingService,
	computeDeterministicEmbedding,
	computeL2Norm,
	cosineSimilarity,
	embeddingService,
	normalizeL2,
} from "./embeddingService.js";

describe("EmbeddingService & L2 Vector Math (SQUAD MU)", () => {
	it("computeL2Norm calculates correct Euclidean norm", () => {
		const norm34 = computeL2Norm([3, 4]);
		assert.equal(norm34, 5);

		const norm111 = computeL2Norm([1, 1, 1, 1]);
		assert.equal(norm111, 2);

		const normZero = computeL2Norm([0, 0, 0]);
		assert.equal(normZero, 0);
	});

	it("normalizeL2 produces unit-length vector (norm == 1.0)", () => {
		const vec = [3, 4];
		const normalized = normalizeL2(vec);
		assert.equal(normalized.length, 2);
		assert.ok(Math.abs(normalized[0]! - 0.6) < 1e-6);
		assert.ok(Math.abs(normalized[1]! - 0.8) < 1e-6);
		assert.ok(Math.abs(computeL2Norm(normalized) - 1.0) < 1e-6);

		// Zero vector returns zero array safely
		const zeroNorm = normalizeL2([0, 0, 0]);
		assert.deepEqual(zeroNorm, [0, 0, 0]);
	});

	it("cosineSimilarity computes exact dot product of normalized vectors", () => {
		const v1 = normalizeL2([1, 0, 0]);
		const v2 = normalizeL2([1, 0, 0]);
		const v3 = normalizeL2([0, 1, 0]);
		const v4 = normalizeL2([-1, 0, 0]);

		assert.ok(Math.abs(cosineSimilarity(v1, v2) - 1.0) < 1e-6, "Identical vectors similarity == 1.0");
		assert.ok(Math.abs(cosineSimilarity(v1, v3) - 0.0) < 1e-6, "Orthogonal vectors similarity == 0.0");
		assert.ok(Math.abs(cosineSimilarity(v1, v4) - -1.0) < 1e-6, "Opposite vectors similarity == -1.0");

		// Edge cases: empty vectors
		assert.equal(cosineSimilarity([], []), 0);
		assert.equal(cosineSimilarity([1, 2], []), 0);
	});

	it("computeDeterministicEmbedding generates 1536-dim unit vector", () => {
		const text = "A16.07.002 Восстановление зуба пломбой с нарушением формы 804н";
		const embedding = computeDeterministicEmbedding(text);

		assert.equal(embedding.length, DEFAULT_EMBEDDING_DIMENSION);
		const norm = computeL2Norm(embedding);
		assert.ok(Math.abs(norm - 1.0) < 1e-6, `Norm must be 1.0, got ${norm}`);
	});

	it("computeDeterministicEmbedding is strictly deterministic", () => {
		const text = "Пациент Смирнова Е.В. — аллергия на лидокаин, диагноз К04.0 Пульпит";
		const emb1 = computeDeterministicEmbedding(text);
		const emb2 = computeDeterministicEmbedding(text);

		assert.deepEqual(emb1, emb2, "Identical inputs must yield identical vectors");
	});

	it("computeDeterministicEmbedding exhibits semantic/lexical affinity for clinical terms", () => {
		const textA = "Кариес зуба 16 средний, полость I класс Блэка";
		const textB = "Глубокий кариес зуба 16, лечение и пломбирование композитом светового отверждения";
		const textC = "Стерилизация наконечников в сухожаровом шкафу СанПиН 3.3686-21 крафт-пакет";

		const embA = computeDeterministicEmbedding(textA);
		const embB = computeDeterministicEmbedding(textB);
		const embC = computeDeterministicEmbedding(textC);

		const simAB = cosineSimilarity(embA, embB);
		const simAC = cosineSimilarity(embA, embC);

		assert.ok(
			simAB > simAC,
			`Clinical caries texts (similarity: ${simAB.toFixed(4)}) should have higher affinity than unrelated SanPin sterilization (similarity: ${simAC.toFixed(4)})`,
		);
	});

	it("EmbeddingService resolves providers and handles local fallback", async () => {
		const service = new EmbeddingService();
		assert.equal(service.getDimension(), 1536);

		const localProvider = service.resolveProvider({ provider: "local" });
		assert.equal(localProvider, "local");

		const singleEmb = await service.generateEmbedding("Тестовый клинический протокол эндодонтии", {
			provider: "local",
		});
		assert.equal(singleEmb.length, 1536);
		assert.ok(Math.abs(computeL2Norm(singleEmb) - 1.0) < 1e-6);

		const batchTexts = [
			"Номенклатура 804н A16.07.001",
			"Удаление ретинированного дистопированного зуба 38",
			"Справка для налогового вычета 1151156",
		];
		const batchResult = await service.generateBatchEmbeddings(batchTexts, { provider: "local" });

		assert.equal(batchResult.length, 3);
		for (const emb of batchResult) {
			assert.equal(emb.length, 1536);
			assert.ok(Math.abs(computeL2Norm(emb) - 1.0) < 1e-6);
		}
	});

	it("EmbeddingService fallback on external provider errors", async () => {
		const service = new EmbeddingService();

		// Calling openai with a non-existent fake endpoint/key will fail network and gracefully fall back to local embedding
		const fallbackEmbedding = await service.generateEmbedding("Клинический диагноз K02.1 Кариес дентина", {
			provider: "openai",
			apiKey: "sk-fake-key-for-test-fallback",
			baseUrl: "http://127.0.0.1:54399/invalid",
			timeoutMs: 500,
		});

		assert.equal(fallbackEmbedding.length, 1536);
		assert.ok(Math.abs(computeL2Norm(fallbackEmbedding) - 1.0) < 1e-6);

		// With strictExternal: true, it should throw
		await assert.rejects(
			async () => {
				await service.generateEmbedding("Клинический диагноз K02.1 Кариес дентина", {
					provider: "openai",
					apiKey: "sk-fake-key-for-test-fallback",
					baseUrl: "http://127.0.0.1:54399/invalid",
					timeoutMs: 500,
					strictExternal: true,
				});
			},
			(err: unknown) => err instanceof Error,
		);
	});

	it("Singleton embeddingService instance is exported and operational", async () => {
		assert.ok(embeddingService instanceof EmbeddingService);
		const emb = await embeddingService.generateEmbedding("Тест синглтона", { provider: "local" });
		assert.equal(emb.length, 1536);
	});

	it("handles custom dimensions properly", () => {
		const emb512 = computeDeterministicEmbedding("Кариес", 512);
		assert.equal(emb512.length, 512);
		assert.ok(Math.abs(computeL2Norm(emb512) - 1.0) < 1e-6);

		const emb768 = computeDeterministicEmbedding("Пульпит", 768);
		assert.equal(emb768.length, 768);
		assert.ok(Math.abs(computeL2Norm(emb768) - 1.0) < 1e-6);
	});

	it("cosineSimilarity is symmetric and bounded strictly in [-1, 1]", () => {
		const vA = computeDeterministicEmbedding("Анестезия инфильтрационная Артикаин 1:100000");
		const vB = computeDeterministicEmbedding("Пломбирование корневого канала гуттаперчей");

		const simAB = cosineSimilarity(vA, vB);
		const simBA = cosineSimilarity(vB, vA);

		assert.equal(simAB, simBA, "Cosine similarity must be symmetric");
		assert.ok(simAB >= -1.0 && simAB <= 1.0, "Cosine similarity must be bounded in [-1, 1]");
	});

	it("handles empty or blank texts gracefully without NaN", async () => {
		const service = new EmbeddingService();
		const emptyEmb = computeDeterministicEmbedding("");
		assert.equal(emptyEmb.length, 1536);
		assert.equal(computeL2Norm(emptyEmb), 0);

		const blankBatch = await service.generateBatchEmbeddings(["", "   ", "\n\t"], { provider: "local" });
		assert.equal(blankBatch.length, 3);
		for (const emb of blankBatch) {
			assert.equal(emb.length, 1536);
			assert.ok(!emb.some((x) => Number.isNaN(x)), "No NaN in embeddings");
		}
	});
});
