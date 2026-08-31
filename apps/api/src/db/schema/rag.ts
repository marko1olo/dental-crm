import { sql } from "drizzle-orm";
import {
	customType,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./auth.js";

/**
 * Custom Drizzle type for PostgreSQL pgvector extension (vector(1536)).
 * Converts between JavaScript number[] arrays and PostgreSQL vector string representations.
 */
export const vector = customType<{
	data: number[];
	config: { dimensions?: number };
	driverData: string;
}>({
	dataType(config) {
		return `vector(${config?.dimensions ?? 1536})`;
	},
	toDriver(value: number[]): string {
		return JSON.stringify(value);
	},
	fromDriver(value: string | number[]): number[] {
		if (Array.isArray(value)) return value;
		if (typeof value === "string") {
			const trimmed = value.trim();
			if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
				return trimmed
					.slice(1, -1)
					.split(",")
					.map((v) => Number.parseFloat(v.trim()))
					.filter((v) => !Number.isNaN(v));
			}
		}
		return [];
	},
});

export type KnowledgeCategory =
	| "price_804n"
	| "clinical_protocol"
	| "patient_ehr"
	| "memo";

/**
 * clinical_knowledge_embeddings — Vector knowledge base for clinical RAG, 804n nomenclature,
 * clinical protocols, and patient EHR memory.
 * Indexed via HNSW (vector_cosine_ops) with strict RLS tenant isolation.
 */
export const clinicalKnowledgeEmbeddings = pgTable(
	"clinical_knowledge_embeddings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		category: text("category").notNull().$type<KnowledgeCategory>(),
		title: text("title").notNull(),
		content: text("content").notNull(),
		embedding: vector("embedding", { dimensions: 1536 }),
		metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("clinical_knowledge_embeddings_org_idx").on(t.organizationId),
		orgCategoryIdx: index("clinical_knowledge_embeddings_org_category_idx").on(
			t.organizationId,
			t.category,
		),
		vectorIdx: index("clinical_knowledge_embeddings_vector_idx").using(
			"hnsw",
			sql`${t.embedding} vector_cosine_ops`,
		),
	}),
);
