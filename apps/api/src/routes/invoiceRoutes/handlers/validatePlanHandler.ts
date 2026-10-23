import { validatePlanToInvoice } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { getActivePriceFreezeToken } from "../../../db/priceFreezeTokensQuery.js";
import { getServiceCatalogForOrganization } from "../../../db/pricelistQuery.js";
import {
	buildValidatePlanPayload,
	mapCatalogRowsToLookup,
} from "../invoiceCalculationHelpers.js";
import {
	type PriceFreezeTokenResult,
	validatePlanBodySchema,
} from "../types.js";

/**
 * POST /api/invoices/validate-plan
 * Pre-billing validation of prices and obsolete services
 */
export async function handleValidatePlan(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	if (reply.sent) return;
	const context = await requireClinicalReadContext(
		request,
		reply,
		"invoices validate plan",
	);
	if (!context) return;
	const orgId = context.organizationId;

	const parsed = validatePlanBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "InvoicePlanValidationError",
			message: "Ошибка валидации входных данных плана лечения.",
			details: parsed.error.issues,
		});
	}

	const catalogRows = await getServiceCatalogForOrganization(orgId);
	const catalogLookup = mapCatalogRowsToLookup(catalogRows);

	let freezeTokenForValidation: PriceFreezeTokenResult = null;
	if (parsed.data.planId) {
		freezeTokenForValidation = await getActivePriceFreezeToken(
			db,
			orgId,
			parsed.data.planId,
		);
	}

	const validationPayload = buildValidatePlanPayload(
		parsed.data,
		catalogLookup,
		freezeTokenForValidation,
	);

	const report = validatePlanToInvoice(validationPayload);
	return reply.code(200).send(report);
}
