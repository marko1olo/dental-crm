/**
 * ragTools.ts — RAG Knowledge Base Retrieval & 804n Price Grounding Tool.
 *
 * Provides single-chokepoint access to statutory 804n price catalogs,
 * ICD-10 clinical protocols, and clinic guarantee policies.
 * Enforces strict anti-hallucination rules for medical pricing.
 */

import { z } from "zod";
import type { AgentContext } from "../context.js";
import {
	DEFAULT_SIMILARITY_THRESHOLD,
	getKnowledgeStore,
	PRICE_NOT_FOUND_MESSAGE,
} from "../rag/knowledgeStore.js";
import type { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./tool.js";

// ─── 1. search_knowledge_base ──────────────────────────────────────────────

export const searchKnowledgeBaseSchema = z.object({
	query: z
		.string()
		.min(1, "Поисковый запрос не может быть пустым")
		.describe("Вопрос или поисковый запрос (услуга, номенклатура 804н, протокол МКБ-10, гарантии клиники)"),
	category: z
		.enum(["all", "price_804n", "clinical_protocol", "guarantee", "sanpin", "faq"])
		.optional()
		.default("all")
		.describe("Категория базы знаний для фильтрации"),
	limit: z
		.number()
		.int()
		.min(1)
		.max(20)
		.optional()
		.default(5)
		.describe("Максимальное количество возвращаемых записей"),
	threshold: z
		.number()
		.min(0)
		.max(1)
		.optional()
		.default(DEFAULT_SIMILARITY_THRESHOLD)
		.describe("Порог косинусного сходства (по умолчанию 0.75)"),
});

export const searchKnowledgeBaseTool: ToolDefinition<
	typeof searchKnowledgeBaseSchema
> = {
	name: "search_knowledge_base",
	description:
		"Семантический поиск по клинической базе знаний, официальному прайсу номенклатуры 804н и гарантийным обязательствам клиники с защитой от галлюцинаций цен.",
	parameters: searchKnowledgeBaseSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx: AgentContext, args) => {
		const store = getKnowledgeStore();
		const threshold = args.threshold ?? DEFAULT_SIMILARITY_THRESHOLD;
		const queryLower = args.query.toLowerCase();
		const isPriceOrGuaranteeQuery =
			args.category === "price_804n" ||
			args.category === "guarantee" ||
			/почем|цена|стоимость|прайс|руб|сколько стоит|804н|гаранти|гарантия/i.test(
				queryLower,
			);

		// Price Grounding Path
		if (
			args.category === "price_804n" ||
			(/почем|цена|стоимость|прайс|руб|сколько стоит|804н/i.test(queryLower) &&
				args.category !== "guarantee")
		) {
			const grounding = await store.groundPrice804n(
				args.query,
				ctx.organizationId,
				threshold,
			);
			const matches = await store.search(args.query, {
				organizationId: ctx.organizationId,
				category: "price_804n",
				limit: args.limit,
				threshold,
			});

			if (!grounding.found && matches.length === 0) {
				return {
					query: args.query,
					found: false,
					category: "price_804n",
					message: PRICE_NOT_FOUND_MESSAGE,
					results: [],
				};
			}

			return {
				query: args.query,
				found: true,
				category: "price_804n",
				grounding,
				message: grounding.found
					? grounding.message
					: PRICE_NOT_FOUND_MESSAGE,
				results: matches.map((m) => ({
					id: m.item.id,
					title: m.item.title,
					code804n: m.item.code804n,
					priceRub: m.item.priceRub,
					durationMinutes: m.item.durationMinutes,
					content: m.item.content,
					score: m.score,
				})),
			};
		}

		// General / Clinical Protocol / Guarantee / FAQ Search Path
		const matches = await store.search(args.query, {
			organizationId: ctx.organizationId,
			category: args.category === "all" ? undefined : args.category,
			limit: args.limit,
			threshold,
		});

		if (matches.length === 0) {
			const emptyMessage =
				isPriceOrGuaranteeQuery && args.category === "guarantee"
					? PRICE_NOT_FOUND_MESSAGE
					: "По вашему запросу релевантных материалов в базе знаний не найдено";

			return {
				query: args.query,
				found: false,
				category: args.category,
				message: emptyMessage,
				results: [],
			};
		}

		return {
			query: args.query,
			found: true,
			category: args.category,
			count: matches.length,
			results: matches.map((m) => ({
				id: m.item.id,
				category: m.item.category,
				title: m.item.title,
				code804n: m.item.code804n,
				icd10Code: m.item.icd10Code,
				priceRub: m.item.priceRub,
				durationMinutes: m.item.durationMinutes,
				content: m.item.content,
				score: m.score,
			})),
		};
	},
};

/**
 * Registers RAG tools into the specified ToolRegistry under module name.
 */
export function registerRagTools(
	registry: ToolRegistry,
	moduleName = "internal",
): void {
	registry.register(searchKnowledgeBaseTool, moduleName);
}
