import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { computePayloadHash } from "@dental/shared";
import { requireClinicalMutationAccess, resolveOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { idempotencyKeys } from "../../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../../security/identity.js";
import {
	DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE,
	DIARY_NOT_FOUND_REVISE_MESSAGE,
	diaryIdParamsSchema,
	diaryReviseBodySchema,
	isDoctorOrClinicalSigner,
} from "../types.js";
import { executeDiaryReviseTx } from "./diaryReviseTransaction.js";
import type { ReviseInputData } from "./revisionsTypes.js";

export async function handleDiaryRevisePost(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	const bodyKey = (req.body && typeof req.body === "object")
		? ((req.body as Record<string, unknown>).idempotencyKey ?? (req.body as Record<string, unknown>).clientMutationId)
		: undefined;
	const rawIdempotencyKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || bodyKey) as string | undefined;
	const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	if (!(await requireClinicalMutationAccess(req, reply, "revise locked diary"))) return;

	const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
	if (!parsedIdParams.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Идентификатор дневника в адресе должен быть UUID (id).",
		});
	}
	const { id } = parsedIdParams.data;

	const parsedReviseBody = diaryReviseBodySchema.safeParse(req.body ?? {});
	if (!parsedReviseBody.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Тело запроса ревизии дневника должно быть JSON-объектом.",
		});
	}
	const identity = getRequestIdentity(req);
	const userId: string | null = identity.userId ?? req.user?.id ?? null;
	const role: string = identity.role ?? req.user?.role ?? "assistant";

	if (!isDoctorOrClinicalSigner(role)) {
		return reply.code(403).send({
			error: "DoctorOrClinicalSignerRequired",
			message:
				"Исправить уже подписанный дневник приёма может лечащий врач или администратор клиники. Обратитесь к лечащему врачу или администратору клиники — он внесёт правку с пометкой «Исправленному верить», а прежний текст надёжно сохранится в истории версий.",
		});
	}

	const orgId = await resolveOrganizationId(req);
	if (!orgId) {
		return reply.code(403).send({
			error: "OrgRequired",
			message: DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE,
		});
	}

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
						message: "Операция исправления дневника приёма уже выполняется в фоновом режиме. Повторите запрос через секунду.",
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
			req.log.warn({ err: idemErr, idempotencyKey }, "[diaryReviseHandler] Предупреждение проверки idempotencyKeys");
		}
	}

	const body: ReviseInputData = {
		complaint: typeof parsedReviseBody.data.complaint === "string" ? parsedReviseBody.data.complaint : undefined,
		anamnesis: typeof parsedReviseBody.data.anamnesis === "string" ? parsedReviseBody.data.anamnesis : undefined,
		statusLocalis: typeof parsedReviseBody.data.statusLocalis === "string" ? parsedReviseBody.data.statusLocalis : undefined,
		diagnosisIcd10: typeof parsedReviseBody.data.diagnosisIcd10 === "string" ? parsedReviseBody.data.diagnosisIcd10 : undefined,
		diagnosisTooth: typeof parsedReviseBody.data.diagnosisTooth === "string" ? parsedReviseBody.data.diagnosisTooth : undefined,
		treatmentDescription: typeof parsedReviseBody.data.treatmentDescription === "string" ? parsedReviseBody.data.treatmentDescription : undefined,
		complications: typeof parsedReviseBody.data.complications === "string" ? parsedReviseBody.data.complications : undefined,
		comorbidities: typeof parsedReviseBody.data.comorbidities === "string" ? parsedReviseBody.data.comorbidities : undefined,
		instrumentTrayBarcode: typeof parsedReviseBody.data.instrumentTrayBarcode === "string" ? parsedReviseBody.data.instrumentTrayBarcode : undefined,
		revisionReason: typeof parsedReviseBody.data.revisionReason === "string" ? parsedReviseBody.data.revisionReason : undefined,
	};

	try {
		const reviseResult = await executeDiaryReviseTx({ id, orgId, userId, role, body });

		if (reviseResult.kind === "not_found") {
			if (idempotencyKey) {
				await db.delete(idempotencyKeys).where(and(eq(idempotencyKeys.clinicId, orgId), eq(idempotencyKeys.key, idempotencyKey), eq(idempotencyKeys.status, "in_flight"))).catch(() => {});
			}
			return reply.code(404).send({ error: "NotFound", message: DIARY_NOT_FOUND_REVISE_MESSAGE });
		}
		if (reviseResult.kind === "not_locked") {
			if (idempotencyKey) {
				await db.delete(idempotencyKeys).where(and(eq(idempotencyKeys.clinicId, orgId), eq(idempotencyKeys.key, idempotencyKey), eq(idempotencyKeys.status, "in_flight"))).catch(() => {});
			}
			return reply.code(409).send({ error: "NotLocked", message: "Дневник не подписан — просто редактируйте его." });
		}
		if (reviseResult.kind === "forbidden") {
			if (idempotencyKey) {
				await db.delete(idempotencyKeys).where(and(eq(idempotencyKeys.clinicId, orgId), eq(idempotencyKeys.key, idempotencyKey), eq(idempotencyKeys.status, "in_flight"))).catch(() => {});
			}
			return reply.code(403).send({
				error: "DoctorOrClinicalSignerRequired",
				message: "Исправить уже подписанный дневник приёма может лечащий врач или администратор клиники.",
			});
		}
		if (reviseResult.kind === "update_lost") {
			if (idempotencyKey) {
				await db.delete(idempotencyKeys).where(and(eq(idempotencyKeys.clinicId, orgId), eq(idempotencyKeys.key, idempotencyKey), eq(idempotencyKeys.status, "in_flight"))).catch(() => {});
			}
			return reply.code(409).send({
				error: "ReviseConflict",
				message: "Исправление подписанного дневника не применилось: запись уже изменилась или снята с подписи. Откройте приём заново и повторите исправление.",
			});
		}

		const responsePayload = {
			success: true,
			hash: reviseResult.hash,
			revisionCount: reviseResult.revisionCount,
			cryptoSignatureAttached: false,
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
				req.log.warn({ err: idemSaveErr, idempotencyKey }, "[diaryReviseHandler] Ошибка сохранения результата в idempotencyKeys");
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
				req.log.warn({ err: cleanErr, idempotencyKey }, "[diaryReviseHandler] Ошибка очистки in_flight Idempotency-Key");
			}
		}
		throw err;
	}
}
