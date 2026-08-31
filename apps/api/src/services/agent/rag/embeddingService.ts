/**
 * embeddingService.ts — Industrial-grade Vector Embedding Service for Clinical Knowledge RAG.
 * Supports OpenAI text-embedding-3-small (1536 dim), Gemini Embeddings, and Deterministic L2 Local Fallback.
 * SQUAD MU — PGVECTOR SCHEMA, HNSW INDEXES & EMBEDDING SERVICE.
 */

import { createHash } from "node:crypto";
import { fetchWithProviderTimeout, selectProviderKey } from "../../../speech/keyPool.js";

export const DEFAULT_EMBEDDING_DIMENSION = 1536;
export const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_GEMINI_EMBEDDING_MODEL = "text-embedding-004";

export type EmbeddingProvider = "openai" | "gemini" | "local" | "auto";

export interface EmbeddingOptions {
	readonly provider?: EmbeddingProvider;
	readonly model?: string;
	readonly dimensions?: number;
	readonly apiKey?: string;
	readonly baseUrl?: string;
	readonly timeoutMs?: number;
	readonly strictExternal?: boolean; // If true, throws on external API error instead of fallback
}

/**
 * Computes L2 (Euclidean) norm of a numeric vector: sqrt(sum(x_i^2)).
 */
export function computeL2Norm(vector: readonly number[]): number {
	let sum = 0;
	for (let i = 0; i < vector.length; i += 1) {
		const val = vector[i] ?? 0;
		sum += val * val;
	}
	return Math.sqrt(sum);
}

/**
 * Normalizes a numeric vector to unit length (L2 norm = 1.0).
 * If the vector has zero length or zero norm, returns a zero vector of the same dimension.
 */
export function normalizeL2(vector: readonly number[]): number[] {
	const norm = computeL2Norm(vector);
	if (norm === 0 || !Number.isFinite(norm)) {
		return new Array(vector.length).fill(0);
	}
	const result = new Array<number>(vector.length);
	for (let i = 0; i < vector.length; i += 1) {
		result[i] = (vector[i] ?? 0) / norm;
	}
	return result;
}

/**
 * Computes Cosine Similarity between two vectors: (A . B) / (||A|| * ||B||).
 * Returns a value in [-1.0, 1.0].
 */
export function cosineSimilarity(
	a: readonly number[],
	b: readonly number[],
): number {
	if (a.length === 0 || b.length === 0) return 0;
	const len = Math.min(a.length, b.length);
	let dot = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < len; i += 1) {
		const valA = a[i] ?? 0;
		const valB = b[i] ?? 0;
		dot += valA * valB;
		normA += valA * valA;
		normB += valB * valB;
	}

	const denominator = Math.sqrt(normA) * Math.sqrt(normB);
	if (denominator === 0 || !Number.isFinite(denominator)) return 0;
	const similarity = dot / denominator;
	// Clamp float rounding jitter
	return Math.max(-1, Math.min(1, similarity));
}

/**
 * Generates a deterministic, high-entropy 1536-dimensional L2-normalized vector from text.
 * Uses subword n-gram hashing and positional projection for semantic-lexical affinity.
 * Essential for offline clinical environments, tests, and API network failure fallbacks.
 */
export function computeDeterministicEmbedding(
	text: string,
	dimensions = DEFAULT_EMBEDDING_DIMENSION,
): number[] {
	const vector = new Array<number>(dimensions).fill(0);
	const normalizedText = (text || "").trim().toLowerCase();
	if (!normalizedText) {
		return vector;
	}

	// Tokenize into words and character n-grams (3-grams, 4-grams, 5-grams)
	const words = normalizedText.split(/[\s,.;:!?()[\]{}"'\\/+-]+/i).filter(Boolean);
	const ngrams: string[] = [...words];

	for (let i = 0; i < normalizedText.length - 2; i += 1) {
		ngrams.push(normalizedText.slice(i, i + 3));
		if (i < normalizedText.length - 3) {
			ngrams.push(normalizedText.slice(i, i + 4));
		}
	}

	// Project each token/n-gram onto dimensions using multiple cryptographic hash slices
	for (let idx = 0; idx < ngrams.length; idx += 1) {
		const token = ngrams[idx] ?? "";
		const hash = createHash("sha256").update(`${token}_${idx % 7}`).digest();

		for (let offset = 0; offset < hash.length - 3; offset += 4) {
			const rawUint = hash.readUInt32LE(offset);
			const targetDim = rawUint % dimensions;
			const sign = (rawUint & 0x80000000) === 0 ? 1 : -1;
			const weight = ((rawUint & 0x7fffffff) / 0x7fffffff) * (1 / (1 + idx * 0.05));
			vector[targetDim] = (vector[targetDim] ?? 0) + sign * weight;
		}
	}

	return normalizeL2(vector);
}

/**
 * Industrial-grade Vector Embedding Service.
 */
export class EmbeddingService {
	private readonly defaultDimension = DEFAULT_EMBEDDING_DIMENSION;

	public getDimension(): number {
		return this.defaultDimension;
	}

	/**
	 * Resolves the active provider based on options and available environment variables.
	 */
	public resolveProvider(options?: EmbeddingOptions): "openai" | "gemini" | "local" {
		const requested = options?.provider ?? "auto";
		if (requested !== "auto") return requested;

		const openaiKey =
			options?.apiKey ||
			process.env.OPENAI_API_KEY ||
			selectProviderKey("openai_transcribe")?.value;
		if (openaiKey) return "openai";

		const geminiKey =
			options?.apiKey ||
			process.env.GEMINI_API_KEY ||
			process.env.GOOGLE_API_KEY;
		if (geminiKey) return "gemini";

		return "local";
	}

	/**
	 * Generates a 1536-dimensional L2-normalized embedding for a single text string.
	 */
	public async generateEmbedding(
		text: string,
		options?: EmbeddingOptions,
	): Promise<number[]> {
		const results = await this.generateBatchEmbeddings([text], options);
		return results[0] ?? computeDeterministicEmbedding(text, options?.dimensions ?? this.defaultDimension);
	}

	/**
	 * Generates 1536-dimensional L2-normalized embeddings for a batch of text strings.
	 */
	public async generateBatchEmbeddings(
		texts: readonly string[],
		options?: EmbeddingOptions,
	): Promise<number[][]> {
		if (texts.length === 0) return [];
		const targetDimensions = options?.dimensions ?? this.defaultDimension;
		const provider = this.resolveProvider(options);

		if (provider === "local") {
			return texts.map((t) => computeDeterministicEmbedding(t, targetDimensions));
		}

		if (provider === "openai") {
			try {
				return await this.fetchOpenAiEmbeddings(texts, options);
			} catch (error) {
				if (options?.strictExternal) throw error;
				console.warn(
					`[EmbeddingService] OpenAI embedding failed (${(error as Error).message}). Falling back to deterministic local embedding.`,
				);
				return texts.map((t) => computeDeterministicEmbedding(t, targetDimensions));
			}
		}

		if (provider === "gemini") {
			try {
				return await this.fetchGeminiEmbeddings(texts, options);
			} catch (error) {
				if (options?.strictExternal) throw error;
				console.warn(
					`[EmbeddingService] Gemini embedding failed (${(error as Error).message}). Falling back to deterministic local embedding.`,
				);
				return texts.map((t) => computeDeterministicEmbedding(t, targetDimensions));
			}
		}

		return texts.map((t) => computeDeterministicEmbedding(t, targetDimensions));
	}

	/**
	 * Calls OpenAI Embeddings API (text-embedding-3-small).
	 */
	private async fetchOpenAiEmbeddings(
		texts: readonly string[],
		options?: EmbeddingOptions,
	): Promise<number[][]> {
		const apiKey =
			options?.apiKey ||
			process.env.OPENAI_API_KEY ||
			selectProviderKey("openai_transcribe")?.value;
		if (!apiKey) {
			throw new Error("OpenAI API key not configured");
		}

		const baseUrl =
			options?.baseUrl ||
			process.env.OPENAI_BASE_URL ||
			"https://api.openai.com/v1";
		const model = options?.model || process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_OPENAI_EMBEDDING_MODEL;
		const targetDimensions = options?.dimensions ?? this.defaultDimension;

		// Clean up texts (empty strings cause 400 in OpenAI)
		const sanitizedTexts = texts.map((t) => (t && t.trim() ? t : " "));

		const payload = {
			input: sanitizedTexts,
			model,
			dimensions: targetDimensions,
		};

		const response = await fetchWithProviderTimeout(
			`${baseUrl}/embeddings`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			},
			options?.timeoutMs ?? 30_000,
		);

		if (!response.ok) {
			const errorBody = await response.text().catch(() => "");
			throw new Error(
				`OpenAI API HTTP ${response.status} ${response.statusText}: ${errorBody.slice(0, 300)}`,
			);
		}

		const data = (await response.json()) as {
			data?: Array<{ embedding: number[]; index: number }>;
		};

		if (!data.data || !Array.isArray(data.data)) {
			throw new Error("Invalid response format from OpenAI embeddings API");
		}

		const sorted = [...data.data].sort((a, b) => a.index - b.index);
		return sorted.map((item) => normalizeL2(item.embedding));
	}

	/**
	 * Calls Google Gemini Embeddings API (text-embedding-004).
	 */
	private async fetchGeminiEmbeddings(
		texts: readonly string[],
		options?: EmbeddingOptions,
	): Promise<number[][]> {
		const apiKey =
			options?.apiKey ||
			process.env.GEMINI_API_KEY ||
			process.env.GOOGLE_API_KEY;
		if (!apiKey) {
			throw new Error("Gemini API key not configured");
		}

		const model = options?.model || DEFAULT_GEMINI_EMBEDDING_MODEL;
		const targetDimensions = options?.dimensions ?? this.defaultDimension;
		const results: number[][] = [];

		// Gemini embedContent API takes individual items or batchEmbedContents
		for (const text of texts) {
			const cleanText = (text || "").trim() || " ";
			const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

			const response = await fetchWithProviderTimeout(
				url,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						model: `models/${model}`,
						content: {
							parts: [{ text: cleanText }],
						},
						outputDimensionality: targetDimensions,
					}),
				},
				options?.timeoutMs ?? 30_000,
			);

			if (!response.ok) {
				const errorBody = await response.text().catch(() => "");
				throw new Error(
					`Gemini API HTTP ${response.status} ${response.statusText}: ${errorBody.slice(0, 300)}`,
				);
			}

			const data = (await response.json()) as {
				embedding?: { values?: number[] };
			};

			const values = data.embedding?.values;
			if (!values || !Array.isArray(values)) {
				throw new Error("Invalid response format from Gemini embeddings API");
			}

			results.push(normalizeL2(values));
		}

		return results;
	}
}

export const embeddingService = new EmbeddingService();
