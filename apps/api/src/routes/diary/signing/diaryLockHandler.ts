import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationAccess, resolveOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { visitDiaries } from "../../../db/schema.js";
import {
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
	const userId: string | null = req.user?.id ?? null;
	const role: string = req.user?.role ?? "assistant";

	if (!isDoctorOrClinicalSigner(role)) {
		return reply.code(403).send({ error: "OnlyDoctorsCanLock", message: DIARY_SIGNING_ROLE_MESSAGE });
	}

	const orgId = await resolveOrganizationId(req);
	if (!orgId) {
		return reply.code(403).send({ error: "OrgRequired", message: DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE });
	}

	const [existing] = await db
		.select()
		.from(visitDiaries)
		.where(and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)));

	if (!existing) {
		return reply.code(404).send({
			error: "NotFound",
			message: "Дневник приёма не найден в этой клинике, подписывать нечего. Откройте приём заново и нажмите «Сохранить черновик».",
		});
	}

	if (existing.isLocked) {
		const incomingPkcs7 = typeof pkcs7Signature === "string" && pkcs7Signature.length > 0 ? pkcs7Signature : null;
		if (!incomingPkcs7) {
			const hasPkcs7 = typeof existing.cryptoSignaturePkcs7 === "string" && existing.cryptoSignaturePkcs7.length > 0;
			return reply.code(409).send({
				error: "AlreadyLocked", hash: existing.diaryHash, lockedAt: lockedAtIsoFrom(existing.lockedAt),
				cryptoSignatureAttached: hasPkcs7, message: DIARY_ALREADY_LOCKED_CANONICAL_MESSAGE,
			});
		}

		const res = await executeReattachCeremony({ id, orgId, userId, incomingPkcs7 });
		if (res.kind === "not_found") return reply.code(404).send({ error: "NotFound", message: "Дневник не найден." });
		if (res.kind === "pin_rejected") return reply.code(403).send({ error: res.code, message: res.message });
		if (res.kind === "already") {
			return reply.code(409).send({
				error: "AlreadyLocked", hash: res.hash, lockedAt: res.lockedAt,
				cryptoSignatureAttached: res.hasPkcs7, message: DIARY_ALREADY_LOCKED_CANONICAL_MESSAGE,
			});
		}
		if (res.kind === "ok") {
			return reply.send({ success: true, hash: res.hash, lockedAt: res.lockedAt, cryptoSignatureAttached: res.attached, reattached: true });
		}
	}

	try {
		const resolvedLock = await resolveSignatureForStorage({
			pkcs7Signature: pkcs7Signature ?? null, userId, organizationId: orgId, diaryHashForMark: existing.diaryHash,
		});
		if (!resolvedLock.ok) {
			const statusCode = resolvedLock.code === "PepDoctorForbidden" ? 422 : 403;
			return reply.code(statusCode).send({ error: resolvedLock.code, message: resolvedLock.message });
		}
		const signing = await db.transaction((tx) =>
			runDiarySigningCeremony(tx, { diaryId: id, organizationId: orgId, userId, pkcs7Signature: resolvedLock.stored }),
		);
		return reply.send({
			success: true, hash: signing.hash, lockedAt: signing.lockedAt.toISOString(),
			cryptoSignatureAttached: Boolean(resolvedLock.stored && String(resolvedLock.stored).length > 0),
		});
	} catch (err) {
		await handleDiarySigningError(err, id, orgId, reply);
	}
}
