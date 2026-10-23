import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationAccess, resolveOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
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
	if (!(await requireClinicalMutationAccess(req, reply, "write diary"))) return;

	const orgId = await resolveOrganizationId(req);
	if (!orgId) return reply.code(403).send({ error: "OrgRequired", message: DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE });

	const identity = getRequestIdentity(req);
	const staffRole = identity.role ?? req.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
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
	const userId: string | null = req.user?.id ?? null;
	const role: string = req.user?.role ?? "assistant";
	data.organizationId = orgId;

	const [visitForDiary] = await db
		.select({ id: visits.id, patientId: visits.patientId })
		.from(visits)
		.where(and(eq(visits.id, data.visitId), eq(visits.organizationId, orgId)))
		.limit(1);
	if (!visitForDiary) {
		return reply.code(403).send({
			error: "VisitNotInClinic",
			message: "Приём не найден в этой клинике — дневник приёма к нему не привязать.",
		});
	}
	if (visitForDiary.patientId !== data.patientId) {
		return reply.code(400).send({
			error: "PatientVisitMismatch",
			message: "Пациент в запросе не совпадает с карточкой этого приёма.",
		});
	}

	const isSigning = data.status === "signed";
	if (isSigning && !isDoctorOrClinicalSigner(role)) {
		return reply.code(403).send({ error: "OnlyDoctorsCanSign", message: DIARY_SIGNING_ROLE_MESSAGE });
	}

	try {
		const outcome = await executeSaveOrSignDiaryTx({ data, orgId, userId });
		return reply.send({
			success: true,
			id: outcome.diaryId,
			hash: outcome.signing?.hash ?? outcome.draftHash ?? null,
		});
	} catch (err) {
		if (err instanceof DiarySigningError) {
			if (err.code === "AlreadyLocked") {
				return reply.code(403).send({ error: "DiaryLocked", message: err.message });
			}
			if (["Icd10Required", "Icd10Invalid", "ToothRequired", "ToothInvalid", "PepDoctorForbidden"].includes(err.code)) {
				return reply.code(422).send({ error: err.code, message: err.message });
			}
			if (err.code === "InsufficientStock") {
				return reply.code(400).send({ error: "TransactionFailed", message: err.message });
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
