import type { FastifyReply, FastifyRequest } from "fastify";
import {
	CONTROLLED_DRUG_PRESETS,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	PREFERENTIAL_BENEFIT_CATEGORIES,
	PREFERENTIAL_DRUG_PRESETS,
	PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG,
	PRESCRIPTION_DOSAGE_FORMS_CATALOG,
	PRESCRIPTION_VALIDITY_RULES,
	renderPrescriptionUniversalHtml,
} from "@dental/shared";
import { requireResolvedOrganizationId } from "../../accessGuard.js";

/**
 * 1. GET /api/prescriptions/reference-catalog
 * Complete statutory pharmacopeia & prescription reference dictionary
 */
export async function handlePrescriptionReferenceCatalog(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	return reply.send({
		success: true,
		dosageForms: PRESCRIPTION_DOSAGE_FORMS_CATALOG,
		administrationRoutes: PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG,
		preferentialBenefitCategories: PREFERENTIAL_BENEFIT_CATEGORIES,
		catalog: DENTAL_PRESCRIPTION_DRUG_CATALOG,
		controlledPkuPresets: CONTROLLED_DRUG_PRESETS,
		preferentialPresets: PREFERENTIAL_DRUG_PRESETS,
		validityRules: PRESCRIPTION_VALIDITY_RULES,
	});
}

/**
 * 3. POST /api/prescriptions/preview-html
 * Generate print-ready HTML preview for statutory prescription
 */
export async function handlePrescriptionPreviewHtml(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const body = request.body as
		| Parameters<typeof renderPrescriptionUniversalHtml>[0]
		| null
		| undefined;
	if (!body || typeof body !== "object") {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Данные рецепта обязательны для генерации печатной формы.",
		});
	}

	const html = renderPrescriptionUniversalHtml(body);
	reply.type("text/html; charset=utf-8");
	return reply.send(html);
}
