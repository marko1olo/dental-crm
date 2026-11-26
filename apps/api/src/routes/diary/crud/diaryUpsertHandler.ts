import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	resolveOrganizationId,
	unguardedBypassAllowed,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { visits } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { DiarySigningError } from "../../../services/clinical/DiarySigningCeremonyService.js";
import {
	DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE,
	DIARY_SIGNING_ROLE_MESSAGE,
	diaryUpsertSchema,
	isDoctorOrClinicalSigner,
} from "../types.js";
import { executeSaveOrSignDiaryTx } from "./saveOrSignDiaryTx.js";

export async function handleDiaryUpsertPost(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	const bodyKey = (req.body && typeof req.body === "object")
		? ((req.body as Record<string, unknown>).idempotencyKey ?? (req.body as Record<string, unknown>).clientMutationId)
		: undefined;
	const rawIdempotencyKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || bodyKey) as string | undefined;
	const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	if (!(await requireClinicalMutationAccess(req, reply, "write diary"))) return;

	const orgId = await resolveOrganizationId(req);
	if (!orgId) return reply.code(403).send({ error: "OrgRequired", message: DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE });

	const identity = getRequestIdentity(req);
	if (!identity.verified) {
		return reply.code(401).send({
			error: "UnverifiedOrganizationCannotMutate",
			message:
				"Заголовок x-organization-id не подтверждён подписанным токеном клиники.",
		});
	}
	const staffRole = identity.role ?? req.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess && !unguardedBypassAllowed("DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS")) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.diary.write",
			role: staffRole,
			message: `Отказ в записи дневника приёма: ${evalAccess.reason}. Набранный текст остаётся в форме, не закрывайте окно приёма.`,
		});
	}

	const parsedUpsert = diaryUpsertSchema.safeParse(req.body);
	if (!parsedUpsert.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Проверьте поля дневника приёма. Нужны корректные visitId и patientId (UUID).",
		});
	}
	const data = parsedUpsert.data;
	const userId: string | null = identity.userId ?? req.user?.id ?? null;
	const role: string = identity.role ?? req.user?.role ?? "assistant";
	data.organizationId = orgId;

	const isSigning = data.status === "signed";
	if (isSigning && !isDoctorOrClinicalSigner(role)) {
		return reply.code(403).send({ error: "OnlyDoctorsCanSign", message: DIARY_SIGNING_ROLE_MESSAGE });
	}

	try {
		const outcome = await withTenantCtx(orgId, async (tx) => {
			const [visitForDiary] = await tx
				.select({ id: visits.id, patientId: visits.patientId })
				.from(visits)
				.where(and(eq(visits.id, data.visitId), eq(visits.organizationId, orgId)))
				.limit(1);
			if (!visitForDiary) {
				return {
					ok: false as const,
					status: 403 as const,
					body: {
						error: "VisitNotInClinic",
						message: "Приём не найден в этой клинике — дневник приёма к нему не привязать.",
					},
				};
			}
			if (visitForDiary.patientId !== data.patientId) {
				return {
					ok: false as const,
					status: 400 as const,
					body: {
						error: "PatientVisitMismatch",
						message: "Пациент в запросе не совпадает с карточкой этого приёма.",
					},
				};
			}

			const saved = await executeSaveOrSignDiaryTx({ data, orgId, userId, tx });
			return { ok: true as const, saved };
		});

		if (!outcome.ok) {
			return reply.code(outcome.status).send(outcome.body);
		}

		const responsePayload = {
			success: true,
			id: outcome.saved.diaryId,
			hash: outcome.saved.signing?.hash ?? outcome.saved.draftHash ?? null,
		};

		return reply.send(responsePayload);
	} catch (err) {
		if (err instanceof DiarySigningError) {
			if (err.code === "AlreadyLocked") {
				return reply.code(403).send({ error: "DiaryLocked", message: err.message });
			}
			if (["Icd10Required", "Icd10Invalid", "ToothRequired", "ToothInvalid", "PepDoctorForbidden"].includes(err.code)) {
				return reply.code(422).send({ error: err.code, message: err.message });
			}
			if (err.code === "PinRejected") {
				return reply.code(403).send({ error: "PinRejected", message: err.message });
			}
			if (err.code === "NotSaved") {
				return reply.code(500).send({ error: "DiaryNotSaved", message: err.message });
			}
			return reply.code(404).send({ error: "NotFound", message: err.message });
		}
		throw err;
	}
}
