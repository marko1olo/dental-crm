/**
 * storeManager.ts — Multi-tenant Knowledge Base store, memory caching, protocol indexing, and search manager.
 */

import { randomUUID } from "node:crypto";
import { STATUTORY_EMR_PROTOCOL_CATALOG } from "@dental/shared";
import {
	calculateHybridMatchScore,
	computeSemanticEmbedding,
	extractUniqueStems,
	normalizeText,
} from "./embeddingSearch.js";
import {
	resolvePriceGrounding,
	STATUTORY_804N_SEED_ITEMS,
	STATUTORY_GUARANTEE_SEED_ITEMS,
} from "./priceGrounding.js";
import {
	DEFAULT_SIMILARITY_THRESHOLD,
	type KnowledgeCategory,
	type KnowledgeItem,
	type KnowledgeItemInput,
	type KnowledgeSearchOptions,
	type KnowledgeSearchResult,
	type PriceGroundingResult,
	VECTOR_DIMENSION,
} from "./types.js";

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
		const id = input.id || `item_${Date.now()}_${randomUUID().slice(0, 8)}`;
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

			const score = calculateHybridMatchScore(
				item,
				queryVec,
				queryStems,
				normalizedQuery,
			);

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

		return resolvePriceGrounding(matches, threshold);
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
