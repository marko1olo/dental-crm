import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, isNull } from "drizzle-orm";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { electronicPrescriptions } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { signUkepBodySchema } from "./prescriptionSchemas.js";
import { validateUkepSignaturePayload } from "./prescriptionUkepValidator.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SignUkepParams {
	id: string;
}

/**
 * 7. POST /api/prescriptions/:id/sign-ukep
 * Apply Doctor Electronic Digital Signature (УКЭП)
 */
export async function handleSignUkepPrescription(
	request: FastifyRequest<{ Params: SignUkepParams }>,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "sign prescription ukep");
	if (!orgId) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.prescription.sign_ukep",
			role: staffRole,
			message: "Подписание электронных рецептов УКЭП ограничено: требуются права врача.",
		});
	}

	const { id } = request.params;
	if (!UUID_PATTERN.test(id)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор рецепта (ожидается формат UUID).",
		});
	}

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

	const outcome = await withTenantCtx(orgId, async (tx) => {
		const [doc] = await tx
			.select()
			.from(electronicPrescriptions)
			.where(and(eq(electronicPrescriptions.id, id), eq(electronicPrescriptions.organizationId, orgId)))
			.limit(1);

		if (!doc) {
			return { kind: "not_found" as const };
		}
		if (doc.status === "cancelled") {
			return { kind: "cancelled" as const };
		}
		if (doc.cryptoSignaturePkcs7) {
			return { kind: "already_signed" as const };
		}

		const currentSnapshot =
			doc.safetyAuditSnapshotJson && typeof doc.safetyAuditSnapshotJson === "object"
				? (doc.safetyAuditSnapshotJson as Record<string, unknown>)
				: {};
		const [updated] = await tx
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
			return { kind: "already_signed_race" as const };
		}
		return { kind: "signed" as const, id: updated.id, status: updated.status };
	});

	if (outcome.kind === "not_found") {
		return reply.code(404).send({ error: "PrescriptionNotFound", message: "Рецепт не найден." });
	}
	if (outcome.kind === "cancelled") {
		return reply.code(409).send({ error: "Conflict", message: "Подписание УКЭП невозможно: рецепт аннулирован." });
	}
	if (outcome.kind === "already_signed") {
		return reply.code(409).send({ error: "AlreadySigned", message: "Рецепт уже подписан УКЭП врача." });
	}
	if (outcome.kind === "already_signed_race") {
		return reply.code(409).send({ error: "AlreadySigned", message: "Рецепт уже подписан УКЭП." });
	}

	return reply.send({ success: true, id: outcome.id, status: outcome.status, signedAt: new Date().toISOString() });
}
