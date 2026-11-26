import { type SQL, and, asc, eq, ilike, isNull, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	documentTemplateCategories,
	documentTemplates,
	documentTemplateVariables,
} from "../../db/schema.js";
import {
	ALL_DOCUMENT_TEMPLATE_VARIABLES,
	resolveFallbackStatutoryTemplateByIdentifier,
} from "./defaultStatutoryTemplates.js";
import {
	UUID_REGEX,
	documentTemplateIdParamsSchema,
	documentTemplatesCatalogQuerySchema,
} from "./typesAndSchemas.js";

/**
 * Маршруты каталога переменных, списка 10 рубрик Минздрава РФ и чтения шаблона документа
 */
export async function registerTemplateCrudRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * GET /api/document-templates/variables
	 * Реестр доступных 74+ токенов подстановки для редактора шаблонов
	 */
	app.get(
		"/api/document-templates/variables",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"document template variables",
			);
			if (!organizationId) return;

			// Чтение переменных из базы под tenant context
			const dbVariables = await withTenantCtx(organizationId, async (tx) =>
				tx
					.select()
					.from(documentTemplateVariables)
					.orderBy(
						asc(documentTemplateVariables.domain),
						asc(documentTemplateVariables.name),
					),
			);

			const list =
				dbVariables.length > 0 ? dbVariables : ALL_DOCUMENT_TEMPLATE_VARIABLES;

			// Группировка по доменам
			const domainsMap: Record<string, (typeof list)[number][]> = {};
			for (const item of list) {
				const d = item.domain || "general";
				if (!domainsMap[d]) domainsMap[d] = [];
				domainsMap[d].push(item);
			}

			const domains = Object.keys(domainsMap).map((d) => ({
				domain: d,
				count: domainsMap[d]?.length ?? 0,
				variables: domainsMap[d] ?? [],
			}));

			return reply.send({
				ok: true,
				totalCount: list.length,
				domains,
				variables: list,
			});
		},
	);

	/**
	 * GET /api/document-templates
	 * Каталог шаблонов с группировкой по 10 рубрикам Минздрава РФ
	 */
	app.get(
		"/api/document-templates",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"document templates catalog",
			);
			if (!organizationId) return;

			const parsedQuery = documentTemplatesCatalogQuerySchema.safeParse(
				request.query ?? {},
			);
			if (!parsedQuery.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры фильтрации каталога шаблонов.",
					details: parsedQuery.error.format(),
				});
			}
			const query = parsedQuery.data;

			return await withTenantCtx(organizationId, async (tx) => {
				// Загрузка 10 рубрик
				const categories = await tx
					.select()
					.from(documentTemplateCategories)
					.orderBy(asc(documentTemplateCategories.order));

				// Построение условий фильтрации: системные (organizationId IS NULL) либо принадлежащие клинике
				const conditions: SQL[] = [];
				const orgOrSystem = or(
					eq(documentTemplates.organizationId, organizationId),
					isNull(documentTemplates.organizationId),
				);
				if (orgOrSystem) conditions.push(orgOrSystem);

				if (query.categoryId) {
					const catIdNum = Number.parseInt(query.categoryId, 10);
					if (!Number.isNaN(catIdNum)) {
						conditions.push(eq(documentTemplates.categoryId, catIdNum));
					}
				}

				if (query.systemAlias) {
					conditions.push(
						eq(documentTemplates.systemAlias, query.systemAlias.trim()),
					);
				}

				if (query.type) {
					conditions.push(eq(documentTemplates.type, query.type.trim()));
				}

				if (query.isEgisz !== undefined) {
					const egiszBool = query.isEgisz === "true";
					conditions.push(eq(documentTemplates.isEgisz, egiszBool));
				}

				if (query.search && query.search.trim()) {
					const searchTerm = `%${query.search.trim()}%`;
					const searchCondition = or(
						ilike(documentTemplates.name, searchTerm),
						ilike(documentTemplates.systemAlias, searchTerm),
					);
					if (searchCondition) conditions.push(searchCondition);
				}

				const whereClause =
					conditions.length > 0 ? and(...conditions) : undefined;

				const templatesList = await tx
					.select()
					.from(documentTemplates)
					.where(whereClause)
					.orderBy(asc(documentTemplates.name));

				// Группировка по 10 категориям
				const categoriesWithTemplates = categories.map((cat) => {
					const catTemplates = templatesList.filter(
						(t) => t.categoryId === cat.id,
					);
					return {
						id: cat.id,
						name: cat.name,
						order: cat.order,
						count: catTemplates.length,
						templates: catTemplates,
					};
				});

				return reply.send({
					ok: true,
					totalCount: templatesList.length,
					categories: categoriesWithTemplates,
					templates: templatesList,
				});
			});
		},
	);

	/**
	 * GET /api/document-templates/:id
	 * Получение одного шаблона по UUID, числовому externalTemplateId или systemAlias
	 */
	app.get(
		"/api/document-templates/:id",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"document template get",
			);
			if (!organizationId) return;

			const parsedParams = documentTemplateIdParamsSchema.safeParse(
				request.params,
			);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "MissingId",
					message: "Не указан или некорректен идентификатор шаблона документа.",
				});
			}
			const identifier = parsedParams.data.id;

			const conditions: SQL[] = [];
			if (UUID_REGEX.test(identifier)) {
				conditions.push(eq(documentTemplates.id, identifier));
			} else if (/^\d+$/.test(identifier)) {
				conditions.push(
					eq(
						documentTemplates.externalTemplateId,
						Number.parseInt(identifier, 10),
					),
				);
			} else {
				conditions.push(eq(documentTemplates.systemAlias, identifier));
			}

			const tenantFilter =
				or(
					eq(documentTemplates.organizationId, organizationId),
					isNull(documentTemplates.organizationId),
				) ?? eq(documentTemplates.organizationId, organizationId);

			return await withTenantCtx(organizationId, async (tx) => {
				const [template] = await tx
					.select()
					.from(documentTemplates)
					.where(and(or(...conditions), tenantFilter))
					.limit(1);

				if (!template) {
					const fallbackTemplate =
						resolveFallbackStatutoryTemplateByIdentifier(identifier);
					if (fallbackTemplate) {
						return reply.send({
							ok: true,
							template: fallbackTemplate,
						});
					}

					return reply.code(404).send({
						error: "TemplateNotFound",
						message: `Шаблон документа с идентификатором «${identifier}» не найден в библиотеке клиники.`,
					});
				}

				// Получение названия категории
				let categoryName = "Общее";
				if (template.categoryId) {
					const [cat] = await tx
						.select()
						.from(documentTemplateCategories)
						.where(eq(documentTemplateCategories.id, template.categoryId))
						.limit(1);
					if (cat) categoryName = cat.name;
				}

				return reply.send({
					ok: true,
					template: {
						...template,
						externalTemplateId: template.externalTemplateId ?? null,
						stomxId: template.externalTemplateId ?? null,
						categoryName,
					},
				});
			});
		},
	);
}
