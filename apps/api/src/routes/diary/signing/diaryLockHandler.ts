import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationAccess, resolveOrganizationId } from "../../../accessGuard.js";
import { withTenantWriteCtx } from "../../../db/rls.js";
import { visitDiaries } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import {
	isCertifiedUkepSignature,
	resolveSignatureForStorage,
	runDiarySigningCeremony,
} from "../../../services/clinical/DiarySigningCeremonyService.js";
import {
	DIARY_ALREADY_LOCKED_CANONICAL_MESSAGE,
	DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE,
	DIARY_SIGNING_ROLE_MESSAGE,
	diaryIdParamsSchema,
	diaryLockBodySchema,
	isDoctorOrClinicalSigner,
} from "../types.js";
import { executeReattachCeremony, lockedAtIsoFrom } from "./diaryReattachCeremony.js";
import { handleDiarySigningError } from "./handleSigningError.js";

export async function handleDiaryLockPost(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	if (!(await requireClinicalMutationAccess(req, reply, "lock diary"))) return;
	const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
	if (!parsedIdParams.success) {
		return reply.code(400).send({ error: "ValidationError", message: "Идентификатор дневника в адресе должен быть UUID (id)." });
	}
	const { id } = parsedIdParams.data;
	const parsedLockBody = diaryLockBodySchema.safeParse(req.body ?? {});
	if (!parsedLockBody.success) {
		return reply.code(400).send({ error: "ValidationError", message: "Тело запроса подписания дневника должно быть JSON-объектом." });
	}
	const pkcs7Signature = typeof parsedLockBody.data.pkcs7Signature === "string" ? parsedLockBody.data.pkcs7Signature : undefined;
	const identity = getRequestIdentity(req);
	const userId: string | null = identity.userId ?? req.user?.id ?? null;
	const role: string = identity.role ?? req.user?.role ?? "assistant";

	if (!isDoctorOrClinicalSigner(role)) {
		return reply.code(403).send({ error: "OnlyDoctorsCanLock", message: DIARY_SIGNING_ROLE_MESSAGE });
	}

	const orgId = await resolveOrganizationId(req);
	if (!orgId) {
		return reply.code(403).send({ error: "OrgRequired", message: DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE });
	}
	if (!identity.verified) {
		return reply.code(401).send({
			error: "UnverifiedOrganizationCannotMutate",
			message:
				"Заголовок x-organization-id не подтверждён подписанным токеном клиники.",
		});
	}

	try {
		const outcome = await withTenantWriteCtx(orgId, async (tx) => {
			const [existing] = await tx
				.select()
				.from(visitDiaries)
				.where(and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)))
				.for("update");

			if (!existing) {
				return {
					status: 404 as const,
					body: {
						error: "NotFound",
						message: "Дневник приёма не найден в этой клинике, подписывать нечего. Откройте приём заново и нажмите «Сохранить черновик».",
					},
				};
			}

			if (existing.isLocked) {
				const incomingPkcs7 = typeof pkcs7Signature === "string" && pkcs7Signature.length > 0 ? pkcs7Signature : null;
				if (!incomingPkcs7) {
					const hasPkcs7 = isCertifiedUkepSignature(existing.cryptoSignaturePkcs7);
					return {
						status: 409 as const,
						body: {
							error: "AlreadyLocked",
							hash: existing.diaryHash,
							lockedAt: lockedAtIsoFrom(existing.lockedAt),
							cryptoSignatureAttached: hasPkcs7,
							message: DIARY_ALREADY_LOCKED_CANONICAL_MESSAGE,
						},
					};
				}

				const res = await executeReattachCeremony({ id, orgId, userId, incomingPkcs7, tx });
				if (res.kind === "not_found") {
					return { status: 404 as const, body: { error: "NotFound", message: "Дневник не найден." } };
				}
				if (res.kind === "pin_rejected") {
					return { status: 403 as const, body: { error: res.code, message: res.message } };
				}
				if (res.kind === "already") {
					return {
						status: 409 as const,
						body: {
							error: "AlreadyLocked",
							hash: res.hash,
							lockedAt: res.lockedAt,
							cryptoSignatureAttached: res.hasPkcs7,
							message: DIARY_ALREADY_LOCKED_CANONICAL_MESSAGE,
						},
					};
				}
				if (res.kind === "ok") {
					return {
						status: 200 as const,
						body: {
							success: true,
							hash: res.hash,
							lockedAt: res.lockedAt,
							cryptoSignatureAttached: res.attached,
							reattached: true,
						},
					};
				}
			}

			const resolvedLock = await resolveSignatureForStorage({
				pkcs7Signature: pkcs7Signature ?? null,
				userId,
				organizationId: orgId,
				diaryHashForMark: existing.diaryHash,
				executor: tx,
			});
			if (!resolvedLock.ok) {
				const statusCode = resolvedLock.code === "PepDoctorForbidden" ? 422 : 403;
				return {
					status: statusCode as 422 | 403,
					body: { error: resolvedLock.code, message: resolvedLock.message },
				};
			}
			const signing = await runDiarySigningCeremony(tx, {
				diaryId: id,
				organizationId: orgId,
				userId,
				pkcs7Signature: resolvedLock.stored,
			});
			return {
				status: 200 as const,
				body: {
					success: true,
					hash: signing.hash,
					lockedAt: signing.lockedAt.toISOString(),
					cryptoSignatureAttached: isCertifiedUkepSignature(resolvedLock.stored),
				},
			};
		});

		return reply.code(outcome.status).send(outcome.body);
	} catch (err) {
		await handleDiarySigningError(err, id, orgId, reply);
	}
}
