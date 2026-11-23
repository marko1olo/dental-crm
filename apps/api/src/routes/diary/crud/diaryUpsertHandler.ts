import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { computePayloadHash } from "@dental/shared";
import {
	requireClinicalMutationAccess,
	resolveOrganizationId,
	unguardedBypassAllowed,
} from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { visits } from "../../../db/schema.js";
import { idempotencyKeys } from "../../../db/schema/idempotency.js";
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

	if (idempotencyKey) {
		try {
			const [existingKey] = await db
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				)
				.limit(1);

			if (existingKey) {
				if (existingKey.status === "completed" && existingKey.responseBody) {
					reply.header("Idempotent-Replay", "true");
					return reply.code(existingKey.responseCode || 200).send(existingKey.responseBody);
				}
				if (existingKey.status === "in_flight") {
					reply.header("Retry-After", "1");
					return reply.code(409).send({
						error: "Conflict",
						message: "Операция сохранения дневника приёма уже выполняется в фоновом режиме. Повторите запрос через секунду.",
					});
				}
			}

			await db
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: idempotencyKey,
					status: "in_flight",
					payloadHash: computePayloadHash(req.body ?? {}),
					responseCode: 0,
					responseBody: null,
					lockedAt: new Date(),
				})
				.onConflictDoNothing();
		} catch (idemErr) {
			req.log.warn({ err: idemErr, idempotencyKey }, "[diaryUpsertHandler] Предупреждение проверки idempotencyKeys");
		}
	}

	const identity = getRequestIdentity(req);
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
		const responsePayload = {
			success: true,
			id: outcome.diaryId,
			hash: outcome.signing?.hash ?? outcome.draftHash ?? null,
		};

		if (idempotencyKey) {
			try {
				await db
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(req.body ?? {}),
						responseBody: responsePayload,
						responseCode: 200,
						lockedAt: new Date(),
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: responsePayload,
							responseCode: 200,
							lockedAt: new Date(),
						},
					});
			} catch (idemSaveErr) {
				req.log.warn({ err: idemSaveErr, idempotencyKey }, "[diaryUpsertHandler] Ошибка сохранения результата в idempotencyKeys");
			}
		}

		return reply.send(responsePayload);
	} catch (err) {
		if (idempotencyKey) {
			try {
				await db
					.delete(idempotencyKeys)
					.where(
						and(
							eq(idempotencyKeys.clinicId, orgId),
							eq(idempotencyKeys.key, idempotencyKey),
							eq(idempotencyKeys.status, "in_flight"),
						),
					);
			} catch (cleanErr) {
				req.log.warn({ err: cleanErr, idempotencyKey }, "[diaryUpsertHandler] Ошибка снятия in_flight замка при сбое");
			}
		}

		if (err instanceof DiarySigningError) {
			if (err.code === "AlreadyLocked") {
				return reply.code(403).send({ error: "DiaryLocked", message: err.message });
			}
			if (["Icd10Required", "Icd10Invalid", "ToothRequired", "ToothInvalid", "PepDoctorForbidden"].includes(err.code)) {
				return reply.code(422).send({ error: err.code, message: err.message });
			}
			if (err.code === "InsufficientStock") {
				req.log.warn({ err }, "Складской овердрафт при сохранении дневника приёма — разрешён мягкий минус (Мандаты 8e, 8v, 8aa)");
				const overdraftPayload = {
					success: true,
					id: data.visitId,
					warning: "InsufficientStockOverdraft",
					message: "Дневник приёма сохранён. Склад переведён в режим мягкого овердрафта.",
				};

				if (idempotencyKey) {
					try {
						await db
							.insert(idempotencyKeys)
							.values({
								clinicId: orgId,
								key: idempotencyKey,
								status: "completed",
								payloadHash: computePayloadHash(req.body ?? {}),
								responseBody: overdraftPayload,
								responseCode: 200,
								lockedAt: new Date(),
							})
							.onConflictDoUpdate({
								target: [idempotencyKeys.clinicId, idempotencyKeys.key],
								set: {
									status: "completed",
									responseBody: overdraftPayload,
									responseCode: 200,
									lockedAt: new Date(),
								},
							});
					} catch (idemSaveErr) {
						req.log.warn({ err: idemSaveErr, idempotencyKey }, "[diaryUpsertHandler] Ошибка сохранения overdraft в idempotencyKeys");
					}
				}

				return reply.send(overdraftPayload);
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
