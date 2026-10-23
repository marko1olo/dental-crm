import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, isNull } from "drizzle-orm";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { electronicPrescriptions } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { signUkepBodySchema } from "./prescriptionSchemas.js";
import { validateUkepSignaturePayload } from "./prescriptionUkepValidator.js";

/**
 * 7. POST /api/prescriptions/:id/sign-ukep
 * Apply Doctor Electronic Digital Signature (УКЭП)
 */
export async function handleSignUkepPrescription(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "sign prescription ukep");
	if (!orgId) return;

	const identity = getRequestIdentity(request);
	const staffRole =
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.prescription.sign_ukep",
			role: staffRole,
			message: "Подписание электронных рецептов УКЭП ограничено: требуются права врача.",
		});
	}

	const { id } = request.params as { id: string };
	const parsedBody = signUkepBodySchema.safeParse(request.body);
	if (!parsedBody.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "pkcs7Signature обязательна для подписания УКЭП.",
			details: parsedBody.error.format(),
		});
	}

	const validation = validateUkepSignaturePayload(parsedBody.data);
	if (!validation.valid) {
		return reply.code(validation.statusCode ?? 400).send({
			error: validation.error,
			errorCode: validation.errorCode,
			message: validation.message,
		});
	}

	const [doc] = await db
		.select()
		.from(electronicPrescriptions)
		.where(and(eq(electronicPrescriptions.id, id), eq(electronicPrescriptions.organizationId, orgId)))
		.limit(1);

	if (!doc) {
		return reply.code(404).send({ error: "PrescriptionNotFound", message: "Рецепт не найден." });
	}
	if (doc.status === "cancelled") {
		return reply.code(409).send({ error: "Conflict", message: "Подписание УКЭП невозможно: рецепт аннулирован." });
	}
	if (doc.cryptoSignaturePkcs7) {
		return reply.code(409).send({ error: "AlreadySigned", message: "Рецепт уже подписан УКЭП врача." });
	}

	const currentSnapshot = (doc.safetyAuditSnapshotJson as Record<string, unknown>) || {};
	const [updated] = await db
		.update(electronicPrescriptions)
		.set({
			cryptoSignaturePkcs7: parsedBody.data.pkcs7Signature,
			status: "signed",
			safetyAuditSnapshotJson: { ...currentSnapshot, ukepSignature: validation.meta },
			updatedAt: new Date(),
		})
		.where(and(eq(electronicPrescriptions.id, id), eq(electronicPrescriptions.organizationId, orgId), isNull(electronicPrescriptions.cryptoSignaturePkcs7)))
		.returning();

	if (!updated) {
		return reply.code(409).send({ error: "AlreadySigned", message: "Рецепт уже подписан УКЭП." });
	}

	return reply.send({ success: true, id: updated.id, status: updated.status, signedAt: new Date().toISOString() });
}
