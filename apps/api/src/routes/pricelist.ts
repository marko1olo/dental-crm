import {
	type DentalSpecialty,
	type ServiceCategory,
	dentalPricelistAnalysisRequestSchema,
	dentalPricelistAnalysisResponseSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	createServiceCatalogItemInDb,
	getServiceCatalogForOrganization,
	seedBaseline804nServicesInDb,
	ServiceCatalogItemNotFoundError,
	ServiceCatalogStorageDisabledError,
	updateServiceCatalogItemInDb,
} from "../db/pricelistQuery.js";
import { analyzePricelist } from "../pricelist/analyzer.js";
import {
	ingestPriceList,
	priceListIngestionRequestSchema,
	priceListIngestionResponseSchema,
} from "../services/ai/priceListIngestionService.js";

type PricelistPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

const pricelistValidationMessage =
	"Ошибка валидации: прайс-лист или запрос не соответствуют формату.";

function parsePricelistPayload<T>(
	schema: PricelistPayloadSchema<T>,
	value: unknown,
) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	return parsed.data;
}

// ─── Валидация и нормализация категорий стоматологических услуг ─────────────

export const VALID_SERVICE_CATEGORIES = [
	"therapy",
	"prosthetics",
	"surgery",
	"orthodontics",
	"hygiene",
	"periodontology",
	"imaging",
	"consultation",
	"documents",
	"other",
] as const;

export function isValidServiceCategory(category: string): boolean {
	const c = (category || "").toLowerCase().trim();
	return (VALID_SERVICE_CATEGORIES as readonly string[]).includes(c) ||
		[
			"терапия",
			"ортопедия",
			"хирургия",
			"ортодонтия",
			"гигиена",
			"пародонтология",
			"диагностика",
			"рентген",
			"консультация",
			"документы",
			"протезирование",
			"orthopedics",
		].includes(c);
}

export function normalizeCategory(cat: string): ServiceCategory {
	const c = (cat || "").toLowerCase().trim();
	if (
		c === "therapy" ||
		c === "терапия" ||
		c.includes("кариес") ||
		c.includes("пульпит") ||
		c.includes("эндодонт")
	)
		return "therapy";
	if (
		c === "surgery" ||
		c === "хирургия" ||
		c.includes("удален") ||
		c.includes("имплант") ||
		c.includes("синус")
	)
		return "surgery";
	if (
		c === "orthopedics" ||
		c === "prosthetics" ||
		c === "ортопедия" ||
		c === "протезирование" ||
		c.includes("корон") ||
		c.includes("винир") ||
		c.includes("протез")
	)
		return "prosthetics";
	if (
		c === "orthodontics" ||
		c === "ортодонтия" ||
		c.includes("брекет") ||
		c.includes("элайн")
	)
		return "orthodontics";
	if (
		c === "hygiene" ||
		c === "гигиена" ||
		c.includes("чистк") ||
		c.includes("air-flow") ||
		c.includes("отбел")
	)
		return "hygiene";
	if (c === "periodontology" || c === "пародонтология" || c.includes("пародонт"))
		return "periodontology";
	if (
		c === "diagnostics" ||
		c === "imaging" ||
		c === "диагностика" ||
		c.includes("рентген") ||
		c.includes("сним") ||
		c.includes("оптг") ||
		c.includes("кт")
	)
		return "imaging";
	if (
		c === "consultation" ||
		c === "консультация" ||
		c.includes("консульт") ||
		c.includes("осмотр") ||
		c.includes("прием")
	)
		return "consultation";
	if (c === "documents" || c === "документы" || c.includes("справк") || c.includes("вычет"))
		return "documents";
	return "other";
}

export function normalizeSpecialty(spec: string): DentalSpecialty {
	const s = (spec || "").toLowerCase().trim();
	if (s === "therapist" || s === "терапевт") return "therapist";
	if (s === "orthopedist" || s === "ортопед") return "orthopedist";
	if (s === "surgeon" || s === "хирург") return "surgeon";
	if (s === "orthodontist" || s === "ортодонт") return "orthodontist";
	if (s === "periodontist" || s === "пародонтолог") return "periodontist";
	if (s === "hygienist" || s === "гигиенист") return "hygienist";
	if (s === "pediatric" || s === "детский") return "pediatric";
	if (s === "implantologist" || s === "имплантолог") return "implantologist";
	if (s === "radiologist" || s === "рентгенолог") return "radiologist";
	return "universal";
}

// ─── Эталонные коды номенклатуры 804н и клиническая длительность ────────────
// Никаких моков A16.07.000: только реальные реестровые позиции Минздрава РФ.
export const STATUTORY_CATEGORY_CODES: Record<ServiceCategory, string> = {
	therapy: "A16.07.002", // Восстановление зуба пломбой
	prosthetics: "A16.07.004", // Восстановление зуба коронкой
	surgery: "A16.07.001", // Удаление зуба
	orthodontics: "A16.07.048", // Ортодонтическая коррекция
	hygiene: "A16.07.051", // Профессиональная гигиена полости рта и зубов
	periodontology: "A16.07.018", // Пособие при пародонтологических вмешательствах
	imaging: "A06.07.007", // Внутриротовая прицельная рентгенография
	consultation: "B01.065.001", // Прием (осмотр, консультация) врача-стоматолога
	documents: "B01.065.001", // Официальные медицинские документы / Форма 043/у
	other: "A16.07.002",
};

export const STATUTORY_CATEGORY_DURATIONS: Record<ServiceCategory, number> = {
	therapy: 45,
	prosthetics: 60,
	surgery: 45,
	orthodontics: 30,
	hygiene: 60,
	periodontology: 45,
	imaging: 15,
	consultation: 30,
	documents: 15,
	other: 30,
};

export const SERVICE_CATEGORIES_METADATA = [
	{
		id: "therapy" as const,
		label: "Терапевтическая стоматология",
		shortLabel: "Терапия",
		statutoryCodePrefix: "A16.07.002",
		specialty: "therapist",
		description:
			"Лечение кариеса, пульпита, периодонтита, эстетическая реставрация и эндодонтия.",
	},
	{
		id: "prosthetics" as const,
		label: "Ортопедическая стоматология",
		shortLabel: "Ортопедия",
		statutoryCodePrefix: "A16.07.004",
		specialty: "orthopedist",
		description:
			"Протезирование, коронки, виниры, мостовидные протезы, вкладки и накладки.",
	},
	{
		id: "surgery" as const,
		label: "Хирургическая стоматология и имплантология",
		shortLabel: "Хирургия",
		statutoryCodePrefix: "A16.07.001",
		specialty: "surgeon",
		description:
			"Удаление зубов, дентальная имплантация, синус-лифтинг, костная пластика.",
	},
	{
		id: "orthodontics" as const,
		label: "Ортодонтия",
		shortLabel: "Ортодонтия",
		statutoryCodePrefix: "A16.07.048",
		specialty: "orthodontist",
		description:
			"Исправление прикуса, брекет-системы, элайнеры, ретейнеры.",
	},
	{
		id: "hygiene" as const,
		label: "Профессиональная гигиена и профилактика",
		shortLabel: "Гигиена",
		statutoryCodePrefix: "A16.07.051",
		specialty: "hygienist",
		description:
			"Ультразвуковая чистка, Air-Flow, полировка, реминерализация, отбеливание.",
	},
	{
		id: "periodontology" as const,
		label: "Пародонтология",
		shortLabel: "Пародонтология",
		statutoryCodePrefix: "A16.07.018",
		specialty: "periodontist",
		description:
			"Лечение гингивита, пародонтита, кюретаж, шинирование зубов.",
	},
	{
		id: "imaging" as const,
		label: "Лучевая диагностика и рентгенология",
		shortLabel: "Диагностика",
		statutoryCodePrefix: "A06.07.007",
		specialty: "radiologist",
		description:
			"Прицельная визиография RVG, панорамная ОПТГ, КЛКТ 3D, ТРГ черепа.",
	},
	{
		id: "consultation" as const,
		label: "Консультация и прием врача",
		shortLabel: "Консультация",
		statutoryCodePrefix: "B01.065.001",
		specialty: "universal",
		description:
			"Первичный и повторный осмотр, составление плана лечения, консилиум.",
	},
	{
		id: "documents" as const,
		label: "Официальные медицинские документы",
		shortLabel: "Документы",
		statutoryCodePrefix: "B01.065.001",
		specialty: "universal",
		description:
			"Форма 043/у, справки в налоговую для вычета НДФЛ (КНД 1151156), выписки.",
	},
	{
		id: "other" as const,
		label: "Прочие стоматологические услуги",
		shortLabel: "Прочее",
		statutoryCodePrefix: "A16.07.002",
		specialty: "universal",
		description:
			"Анестезия, изолирующие системы коффердам, сервисное обслуживание.",
	},
] as const;

// ─── Единый обработчик сидирования базового прейскуранта 804н ───────────────
// Исключает дублирование ручек и обеспечивает соблюдение Мандатов 8e, 8k, 8n.

const seedBodySchema = z.object({
	replace: z.boolean().optional(),
});

export async function handleSeedBaseline804n(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalMutationAccess(
			request,
			reply,
			"pricelist seed baseline",
		))
	) {
		return;
	}

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"pricelist seed baseline",
	);
	if (!orgId) return;

	const parseResult = seedBodySchema.safeParse(request.body ?? {});
	if (!parseResult.success) {
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: "Некорректный формат параметров сидирования 804н.",
		});
	}

	const replace = Boolean(parseResult.data.replace);

	try {
		const result = await seedBaseline804nServicesInDb(orgId, { replace });
		return reply.code(200).send(result);
	} catch (error) {
		if (error instanceof ServiceCatalogStorageDisabledError) {
			return reply.code(503).send({
				error: "ServiceCatalogStorageDisabled",
				message:
					"Хранилище прейскуранта отключено: настройте базу данных для сохранения услуг.",
			});
		}
		request.log.error(
			{ err: error },
			"Ошибка при наполнении базового прейскуранта 804н",
		);
		return reply.code(500).send({
			error: "PricelistSeedBaselineError",
			message:
				(error as Error).message ||
				"Не удалось наполнить базовый прейскурант 804н",
		});
	}
}

// ─── Регистрация маршрутов прейскуранта ──────────────────────────────────────

export async function registerPricelistRoutes(app: FastifyInstance) {
	/**
	 * GET /api/pricelist/categories
	 * Справочник валидных клинических категорий услуг со статьями 804н и описанием.
	 */
	app.get("/api/pricelist/categories", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"pricelist categories",
			))
		)
			return;

		return reply.code(200).send({
			success: true,
			categories: SERVICE_CATEGORIES_METADATA,
		});
	});

	/**
	 * POST /api/pricelist/analyze
	 * Анализ и сопоставление прейскуранта с номенклатурой Минздрава 804н.
	 */
	app.post(
		"/api/pricelist/analyze",
		{
			bodyLimit: 5 * 1024 * 1024,
		},
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"pricelist analysis",
				))
			)
				return;
			const input = parsePricelistPayload(
				dentalPricelistAnalysisRequestSchema,
				request.body,
			);
			if (!input) {
				return reply.code(400).send({
					error: "PricelistValidationError",
					message: pricelistValidationMessage,
				});
			}

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"pricelist analysis",
			);
			if (!orgId) return;
			const catalog = await getServiceCatalogForOrganization(orgId);
			return dentalPricelistAnalysisResponseSchema.parse(
				await analyzePricelist(input, catalog),
			);
		},
	);

	/**
	 * POST /api/pricelist/ingest
	 * Интеллектуальный разбор и пакетная фиксация прейскуранта в БД (ACID-транзакция).
	 */
	app.post(
		"/api/pricelist/ingest",
		{
			bodyLimit: 10 * 1024 * 1024,
		},
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"pricelist ingestion",
				))
			)
				return;

			const input = parsePricelistPayload(
				priceListIngestionRequestSchema,
				request.body,
			);
			if (!input) {
				return reply.code(400).send({
					error: "PricelistValidationError",
					message:
						"Ошибка валидации: параметры ингестии прейскуранта не соответствуют формату.",
				});
			}

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"pricelist ingestion",
			);
			if (!orgId) return;

			const existingCatalog = await getServiceCatalogForOrganization(orgId);
			const ingestionResult = await ingestPriceList(input, existingCatalog);

			if (input.commit) {
				if (
					!(await requireClinicalMutationAccess(
						request,
						reply,
						"pricelist ingestion commit",
					))
				) {
					return;
				}

				const itemsToCommit =
					input.approvedItems && input.approvedItems.length > 0
						? input.approvedItems
						: ingestionResult.proposals.filter((p) => p.isApproved);

				let committedCount = 0;

				// Дефект 4 (ACID): Пакетная фиксация услуг строго внутри транзакции
				try {
					await db.transaction(async () => {
						for (const item of itemsToCommit) {
							const category = normalizeCategory(item.category);
							const specialty = normalizeSpecialty(item.specialty);
							const statutoryCode =
								item.code804n &&
								item.code804n !== "A16.07.000" &&
								item.code804n.trim().length > 0
									? item.code804n
									: STATUTORY_CATEGORY_CODES[category] || "A16.07.002";
							const durationMinutes =
								STATUTORY_CATEGORY_DURATIONS[category] || 30;

							if (
								item.suggestedAction === "update_existing" &&
								item.matchedExistingServiceId
							) {
								await updateServiceCatalogItemInDb(
									orgId,
									item.matchedExistingServiceId,
									{
										code: statutoryCode,
										title: item.cleanedTitle,
										basePriceRub: item.priceRub,
										category,
										specialty,
									},
								);
								committedCount++;
							} else if (
								item.suggestedAction === "link_existing" &&
								item.matchedExistingServiceId
							) {
								await updateServiceCatalogItemInDb(
									orgId,
									item.matchedExistingServiceId,
									{
										code: statutoryCode,
										basePriceRub: item.priceRub,
									},
								);
								committedCount++;
							} else if (
								item.suggestedAction === "create_new" ||
								!item.matchedExistingServiceId
							) {
								await createServiceCatalogItemInDb(orgId, {
									code: statutoryCode,
									title: item.cleanedTitle,
									category,
									specialty,
									basePriceRub: item.priceRub,
									durationMinutes,
									taxDeductible: true,
									active: true,
								});
								committedCount++;
							}
						}
					});
				} catch (commitError) {
					if (commitError instanceof ServiceCatalogStorageDisabledError) {
						return reply.code(503).send({
							error: "ServiceCatalogStorageDisabled",
							message:
								"Хранилище прейскуранта отключено: настройте постоянную базу данных для сохранения услуг.",
						});
					}
					request.log.error(
						{ err: commitError },
						"Транзакционный сбой при пакетном сохранении прейскуранта",
					);
					return reply.code(500).send({
						error: "PricelistCommitTransactionError",
						message: `Не удалось зафиксировать изменения прейскуранта: ${(commitError as Error).message}`,
					});
				}

				ingestionResult.committedCount = committedCount;
			}

			return reply
				.code(200)
				.send(priceListIngestionResponseSchema.parse(ingestionResult));
		},
	);

	/**
	 * 1-клик быстрое наполнение прейскуранта базовым набором 804н (30 услуг).
	 * Доступно для соло-врача и клиники (Мандаты 8e, 8k, 8n).
	 * Устранено дублирование: канонический эндпоинт и алиасы вызывают единый обработчик handleSeedBaseline804n.
	 */
	app.post("/api/pricelist/seed-baseline-804n", handleSeedBaseline804n);
	app.post("/api/pricelist/seed-baseline", handleSeedBaseline804n);
	app.post("/api/pricelist/seed", handleSeedBaseline804n);
}
