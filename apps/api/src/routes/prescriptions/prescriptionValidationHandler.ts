import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { verifyPrescriptionStatutoryValidity } from "@dental/shared";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { electronicPrescriptionItems, electronicPrescriptions } from "../../db/schema.js";
import { FORBIDDEN_NARCOTIC_INN_PATTERNS } from "./prescriptionSchemas.js";

/**
 * 2. POST /api/prescriptions/validate
 * Statutory rules engine validation per Order 1094n
 */
export async function handleValidatePrescription(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const body = request.body as Parameters<typeof verifyPrescriptionStatutoryValidity>[0] | null | undefined;
	if (!body || typeof body !== "object") {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Тело запроса для валидации рецепта обязательно.",
		});
	}

	let result = verifyPrescriptionStatutoryValidity(body);
	const narcoticErrors: string[] = [];
	if (Array.isArray(body.items)) {
		for (const item of body.items) {
			const itemObj = item as { latinName?: string; tradeName?: string } | null;
			const name = itemObj?.latinName || itemObj?.tradeName || "";
			if (name && FORBIDDEN_NARCOTIC_INN_PATTERNS.some((p) => p.test(name))) {
				narcoticErrors.push(
					`Препарат «${name}» относится к наркотическим средствам Списка II/III. В амбулаторной стоматологии применяются ненаркотические анальгетики (НПВП: Нимесил, Кетанов, Дексалгин).`,
				);
			}
		}
	}
	if (narcoticErrors.length > 0) {
		result = {
			...result,
			isValid: false,
			errors: [...result.errors, ...narcoticErrors],
		};
	}

	return reply.send({ success: true, validation: result });
}

/**
 * 8. POST /api/prescriptions/:id/verify
 * Verify statutory validity and expiration status
 */
export async function handleVerifyPrescription(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const { id } = request.params as { id: string };
	const [presc] = await db
		.select()
		.from(electronicPrescriptions)
		.where(and(eq(electronicPrescriptions.id, id), eq(electronicPrescriptions.organizationId, orgId)))
		.limit(1);

	if (!presc) {
		return reply.code(404).send({ error: "PrescriptionNotFound", message: "Рецепт не найден." });
	}

	const items = await db
		.select()
		.from(electronicPrescriptionItems)
		.where(and(eq(electronicPrescriptionItems.prescriptionId, presc.id), eq(electronicPrescriptionItems.organizationId, orgId)));

	const validityDaysNum =
		presc.validityPeriod === "days_15"
			? 15
			: presc.validityPeriod === "days_30"
				? 30
				: presc.validityPeriod === "year_1"
					? 365
					: 60;

	const validation = verifyPrescriptionStatutoryValidity({
		formType: presc.formType,
		prescriptionDate: presc.issuedAt?.toISOString().slice(0, 10) || presc.createdAt.toISOString().slice(0, 10),
		validityDays: validityDaysNum,
		isChronicSpecialCare: presc.isSpecialChronicIndication,
		chronicPeriodicity: presc.chronicDispenseFrequencyNotes,
		items: items.map((i) => ({ latinName: i.innLatin })),
	});

	return reply.send({
		success: true,
		prescriptionId: presc.id,
		prescriptionNumber: presc.prescriptionNumber,
		isSignedUkep: Boolean(presc.cryptoSignaturePkcs7),
		status: presc.status,
		validation,
	});
}
