import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	resolveOrganizationId,
	unguardedBypassAllowed,
} from "../../../accessGuard.js";
import { defineTenantMutation } from "../../../core/routeFactories.js";
import type { TenantDb } from "../../../db/client.js";
import { withTenantWriteCtx } from "../../../db/rls.js";
import { visits } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { DiarySigningError } from "../../../services/clinical/DiarySigningCeremonyService.js";
import { extractIdempotencyKey } from "../../../utils/httpIdempotency.js";
import {
	DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE,
	DIARY_SIGNING_ROLE_MESSAGE,
	diaryUpsertSchema,
	isDoctorOrClinicalSigner,
} from "../types.js";
import { type DiaryUpsertData, executeSaveOrSignDiaryTx } from "./saveOrSignDiaryTx.js";

async function runDiaryUpsertCore(params: {
	tx: TenantDb;
	orgId: string;
	userId: string | null;
	data: DiaryUpsertData;
	reply: FastifyReply;
}): Promise<Record<string, unknown> | undefined> {
	const { tx, orgId, userId, data, reply } = params;
	const [visitForDiary] = await tx
		.select({ id: visits.id, patientId: visits.patientId })
		.from(visits)
		.where(and(eq(visits.id, data.visitId), eq(visits.organizationId, orgId)))
		.limit(1);
	if (!visitForDiary) {
		reply.code(403).send({
			error: "VisitNotInClinic",
			message: "Приём не найден в этой клинике — дневник приёма к нему не привязать.",
		});
		return undefined;
	}
	if (visitForDiary.patientId !== data.patientId) {
		reply.code(400).send({
			error: "PatientVisitMismatch",
			message: "Пациент в запросе не совпадает с карточкой этого приёма.",
		});
		return undefined;
	}

	const saved = await executeSaveOrSignDiaryTx({ data, orgId, userId, tx });
	return {
		success: true,
		id: saved.diaryId,
		hash: saved.signing?.hash ?? saved.draftHash ?? null,
	};
}

function handleDiarySigningErrorReply(err: unknown, reply: FastifyReply): boolean {
	if (err instanceof DiarySigningError) {
		if (err.code === "AlreadyLocked") {
			reply.code(403).send({ error: "DiaryLocked", message: err.message });
			return true;
		}
		if (
			[
				"Icd10Required",
				"Icd10Invalid",
				"ToothRequired",
				"ToothInvalid",
				"PepDoctorForbidden",
			].includes(err.code)
		) {
			reply.code(422).send({ error: err.code, message: err.message });
			return true;
		}
		if (err.code === "PinRejected") {
			reply.code(403).send({ error: "PinRejected", message: err.message });
			return true;
		}
		if (err.code === "NotSaved") {
			reply.code(500).send({ error: "DiaryNotSaved", message: err.message });
			return true;
		}
		reply.code(404).send({ error: "NotFound", message: err.message });
		return true;
	}
	return false;
}

export function registerDiaryUpsertRoute(app: FastifyInstance): void {
	defineTenantMutation(app, {
		method: "POST",
		path: "/api/diaries",
		idempotency: "optional_header",
		authOptions: {
			allowAdminSecretBypass: true,
			allowClinicTokenWithoutStaff: true,
			missingOrgPayload: {
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE,
			},
		},
		permission: {
			customCheck: (principal, _request, reply) => {
				const evalAccess = evaluateClinicalAccess(principal.role);
				if (
					!evalAccess.hasClinicalAccess &&
					!unguardedBypassAllowed("DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS")
				) {
					reply.code(403).send({
						error: "PermissionDenied",
						permission: "clinical.diary.write",
						role: principal.role,
						message: `Отказ в записи дневника приёма: ${evalAccess.reason}. Набранный текст остаётся в форме, не закрывайте окно приёма.`,
					});
					return false;
				}
				return true;
			},
		},
		bodySchema: diaryUpsertSchema,
		validationErrorCode: "ValidationError",
		validationErrorMessage:
			"Проверьте поля дневника приёма. Нужны корректные visitId и patientId (UUID).",
		onHandlerError: (err, reply) => handleDiarySigningErrorReply(err, reply),
		handler: async ({
			tx,
			principal,
			organizationId: orgId,
			idempotencyKey,
			body: data,
			reply,
		}) => {
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}
			const userId = principal.userId;
			const role = principal.role || "assistant";
			data.organizationId = orgId;

			if (data.status === "signed" && !isDoctorOrClinicalSigner(role)) {
				reply.code(403).send({
					error: "OnlyDoctorsCanSign",
					message: DIARY_SIGNING_ROLE_MESSAGE,
				});
				return undefined;
			}

			return await runDiaryUpsertCore({ tx, orgId, userId, data, reply });
		},
	});
}

export async function handleDiaryUpsertPost(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	const idempotencyKey = extractIdempotencyKey(req) ?? undefined;
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

	if (data.status === "signed" && !isDoctorOrClinicalSigner(role)) {
		return reply.code(403).send({ error: "OnlyDoctorsCanSign", message: DIARY_SIGNING_ROLE_MESSAGE });
	}

	try {
		const payload = await withTenantWriteCtx(orgId, (tx) =>
			runDiaryUpsertCore({ tx, orgId, userId, data, reply }),
		);
		if (payload && !reply.sent) {
			return reply.send(payload);
		}
	} catch (err) {
		if (!handleDiarySigningErrorReply(err, reply)) {
			throw err;
		}
	}
}
