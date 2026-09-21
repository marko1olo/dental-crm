import {
	type DentalSpecialty,
	type ServiceCategory,
	dentalPricelistAnalysisRequestSchema,
	dentalPricelistAnalysisResponseSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import {
	createServiceCatalogItemInDb,
	getServiceCatalogForOrganization,
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

function normalizeCategory(cat: string): ServiceCategory {
	const c = (cat || "").toLowerCase();
	if (c === "therapy" || c === "терапия") return "therapy";
	if (c === "surgery" || c === "хирургия") return "surgery";
	if (c === "orthopedics" || c === "prosthetics" || c === "ортопедия")
		return "prosthetics";
	if (c === "orthodontics" || c === "ортодонтия") return "orthodontics";
	if (c === "hygiene" || c === "гигиена") return "hygiene";
	if (c === "periodontology" || c === "пародонтология")
		return "periodontology";
	if (c === "diagnostics" || c === "imaging" || c === "диагностика")
		return "imaging";
	if (c === "consultation" || c === "консультация") return "consultation";
	if (c === "documents" || c === "документы") return "documents";
	return "other";
}

function normalizeSpecialty(spec: string): DentalSpecialty {
	const s = (spec || "").toLowerCase();
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

export async function registerPricelistRoutes(app: FastifyInstance) {
	app.post(
		"/api/pricelist/analyze",
		{
			bodyLimit: 5 * 1024 * 1024,
		},
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(request, reply, "pricelist analysis"))
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
			// БЫЛО: getDefaultOrganizationId() — прайс сравнивался с каталогом услуг
			// ПЕРВОЙ организации в базе. Клиника получала анализ по чужим ценам.
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
				for (const item of itemsToCommit) {
					try {
						if (
							item.suggestedAction === "update_existing" &&
							item.matchedExistingServiceId
						) {
							await updateServiceCatalogItemInDb(
								orgId,
								item.matchedExistingServiceId,
								{
									code: item.code804n,
									title: item.cleanedTitle,
									basePriceRub: item.priceRub,
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
									code: item.code804n,
									basePriceRub: item.priceRub,
								},
							);
							committedCount++;
						} else if (
							item.suggestedAction === "create_new" ||
							!item.matchedExistingServiceId
						) {
							await createServiceCatalogItemInDb(orgId, {
								code: item.code804n || "A16.07.000",
								title: item.cleanedTitle,
								category: normalizeCategory(item.category),
								specialty: normalizeSpecialty(item.specialty),
								basePriceRub: item.priceRub,
								durationMinutes: 30,
								taxDeductible: true,
								active: true,
							});
							committedCount++;
						}
					} catch (error) {
						request.log.warn(
							{ err: error, itemId: item.id },
							"Не удалось зафиксировать услугу при импорте прейскуранта",
						);
					}
				}
				ingestionResult.committedCount = committedCount;
			}

			return reply
				.code(200)
				.send(priceListIngestionResponseSchema.parse(ingestionResult));
		},
	);
}
