import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./auth.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ЮРИДИЧЕСКИЙ ДОКУМЕНТООБОРОТ И БИБЛИОТЕКА БЛАНКОВ DENTE CRM (STOMX REVERSE)
 * 1. document_template_categories — 10 рубрик бланков Минздрава РФ
 * 2. document_templates — 49 государственных бланков (ИДС, договоры, акты)
 * 3. document_template_variables — 74 стандартизированных токена подстановки
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * 1. Категории шаблонов документов (10 рубрик: Общее, Терапия, Ортопедия...)
 */
export const documentTemplateCategories = pgTable(
	"document_template_categories",
	{
		id: integer("id").primaryKey(),
		name: text("name").notNull(),
		order: integer("order").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orderIdx: index("doc_tpl_categories_order_idx").on(t.order),
	}),
);

export type DocumentTemplateCategory =
	typeof documentTemplateCategories.$inferSelect;
export type NewDocumentTemplateCategory =
	typeof documentTemplateCategories.$inferInsert;

/**
 * 2. Шаблоны документов (49 бланков ИДС, договоров, гарантий, согласий)
 */
export const documentTemplates = pgTable(
	"document_templates",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		stomxId: integer("stomx_id").unique(),
		organizationId: uuid("organization_id").references(
			() => organizations.id,
			{ onDelete: "cascade" },
		),
		categoryId: integer("category_id")
			.notNull()
			.references(() => documentTemplateCategories.id, {
				onDelete: "restrict",
			}),
		name: text("name").notNull(),
		systemAlias: text("system_alias").notNull(),
		type: text("type").notNull().default("common"), // "common" | "special"
		contentHtml: text("content_html").notNull().default(""),
		isEgisz: boolean("is_egisz").notNull().default(false),
		esiaRequired: boolean("esia_required").notNull().default(false),
		isXrayIds: boolean("is_xray_ids").notNull().default(false),
		isBlock: boolean("is_block").notNull().default(false),
		printConfig: jsonb("print_config")
			.$type<{
				orientation?: "portrait" | "landscape";
				margins?: { top: number; right: number; bottom: number; left: number };
				fontSize?: string;
				header?: string;
				footer?: string;
				showWatermark?: boolean;
			}>()
			.default({}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		categoryIdIdx: index("doc_templates_category_id_idx").on(t.categoryId),
		systemAliasIdx: index("doc_templates_system_alias_idx").on(t.systemAlias),
		stomxIdIdx: index("doc_templates_stomx_id_idx").on(t.stomxId),
		organizationIdIdx: index("doc_templates_organization_id_idx").on(
			t.organizationId,
		),
	}),
);

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type NewDocumentTemplate = typeof documentTemplates.$inferInsert;

/**
 * 3. Реестр токенов подстановки шаблонизатора (74+ переменных)
 */
export const documentTemplateVariables = pgTable(
	"document_template_variables",
	{
		token: text("token").primaryKey(), // "Пациент.ФИО", "Клиника.Название" и т.д.
		domain: text("domain").notNull(), // "patient" | "representative" | "doctor" | "clinic" | "appointment" | ...
		name: text("name").notNull(),
		description: text("description").notNull().default(""),
		exampleValue: text("example_value").notNull().default(""),
		resolverPath: text("resolver_path").notNull().default(""),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		domainIdx: index("doc_tpl_variables_domain_idx").on(t.domain),
	}),
);

export type DocumentTemplateVariable =
	typeof documentTemplateVariables.$inferSelect;
export type NewDocumentTemplateVariable =
	typeof documentTemplateVariables.$inferInsert;

/**
 * Отношения Drizzle ORM
 */
export const documentTemplateCategoriesRelations = relations(
	documentTemplateCategories,
	({ many }) => ({
		templates: many(documentTemplates),
	}),
);

export const documentTemplatesRelations = relations(
	documentTemplates,
	({ one }) => ({
		category: one(documentTemplateCategories, {
			fields: [documentTemplates.categoryId],
			references: [documentTemplateCategories.id],
		}),
		organization: one(organizations, {
			fields: [documentTemplates.organizationId],
			references: [organizations.id],
		}),
	}),
);
