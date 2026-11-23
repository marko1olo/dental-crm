import {
	computePayloadHash,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { dmsGuaranteeLetters } from "../../../db/schema.js";
import { idempotencyKeys } from "../../../db/schema/idempotency.js";
import { recordUsageBodySchema } from "../types.js";
import { isValidUuid } from "./guaranteeLetterFormatters.js";

export async function handleRecordGuaranteeLetterUsage(
	request: FastifyRequest<{ Params: { letterId: string } }>,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"insurance guarantee letter record usage",
	);
	if (!orgId) return;

	const { letterId } = request.params;
	const parsed = recordUsageBodySchema.safeParse(request.body);
	if (!parsed.success) {
		const msg = parsed.error.issues[0]?.message ?? "Укажите корректную сумму списания по ГП.";
		return reply.code(400).send({
			error: "ValidationError",
			message: msg,
		});
	}

	const amountKop = parsed.data.amountKopecks ?? rublesToKopecks(parsed.data.amountRub ?? 0);
	const amountRub = kopecksToRubles(amountKop);
	const isUrgentCare = Boolean(parsed.data.isEmergency || parsed.data.hasAcutePain || parsed.data.allowOverdraft);

	// Mandate 8zp/8bo: Idempotency-Key is strictly required on money/stock/debit mutations
	const rawBodyMutationId = (request.body as { clientMutationId?: unknown })?.clientMutationId;
	const rawIdemKey =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined) ||
		(typeof rawBodyMutationId === "string" ? rawBodyMutationId : undefined);
	const idempotencyKey =
		typeof rawIdemKey === "string" && rawIdemKey.trim().length > 0
			? rawIdemKey.trim()
			: undefined;

	if (!idempotencyKey) {
		return reply.code(400).send({
			error: "IdempotencyKeyRequired",
			message: "Заголовок Idempotency-Key (UUIDv7) обязателен для списания средств по гарантийному письму (Мандаты 8zp/8bo).",
		});
	}

	// Check idempotency cache
	const [existingRecord] = await db
		.select()
		.from(idempotencyKeys)
		.where(
			and(
				eq(idempotencyKeys.clinicId, orgId),
				eq(idempotencyKeys.key, idempotencyKey),
			),
		)
		.limit(1);

	if (existingRecord) {
		if (existingRecord.status === "completed" && existingRecord.responseBody) {
			reply.header("Idempotency-Key", idempotencyKey);
			reply.header("idempotency-replayed", "true");
			reply.header("x-idempotency-replayed", "true");
			return reply.code(existingRecord.responseCode || 200).send(existingRecord.responseBody);
		}
		if (existingRecord.status === "in_flight") {
			return reply.code(409).header("Retry-After", "1").send({
				error: "Conflict",
				message: "Операция списания по гарантийному письму с данным Idempotency-Key уже выполняется.",
			});
		}
	}

	// Mandate 8e: если списание производится для экстренного визита без ГП
	if (letterId === "emergency" || letterId === "emergency_pending_letter" || letterId === "none" || letterId === "acute-pain") {
		const emergencyPayload = {
			success: true,
			letterId,
			debitedAmountRub: amountRub,
			usedAmountRub: amountRub,
			remainingCoverageRub: 0,
			status: "pending_letter",
			warning: "Требуется досылка гарантийного письма ДМС",
			isEmergency: true,
		};
		reply.header("Idempotency-Key", idempotencyKey);
		return reply.code(200).send(emergencyPayload);
	}

	if (!isValidUuid(letterId)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Параметр letterId должен быть валидным UUID.",
		});
	}

	const result = await db.transaction(async (tx) => {
		// Advisory transaction lock per organization and idempotencyKey to prevent TOCTOU double-spend
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${orgId}), hashtext(${idempotencyKey}))`,
		);

		// Re-check idempotency record inside transaction under lock
		const [txExistingRecord] = await tx
			.select()
			.from(idempotencyKeys)
			.where(
				and(
					eq(idempotencyKeys.clinicId, orgId),
					eq(idempotencyKeys.key, idempotencyKey),
				),
			)
			.for("update")
			.limit(1);

		if (txExistingRecord) {
			if (txExistingRecord.status === "completed" && txExistingRecord.responseBody) {
				return {
					status: txExistingRecord.responseCode || 200,
					data: txExistingRecord.responseBody,
					isReplayed: true,
				};
			}
			if (txExistingRecord.status === "in_flight") {
				return {
					status: 409,
					error: {
						error: "Conflict",
						message: "Операция списания по гарантийному письму с данным Idempotency-Key уже выполняется.",
					},
				};
			}
		}

		const [letter] = await tx
			.select()
			.from(dmsGuaranteeLetters)
			.where(
				and(
					eq(dmsGuaranteeLetters.id, letterId),
					eq(dmsGuaranteeLetters.organizationId, orgId),
				),
			)
			.for("update")
			.limit(1);

		if (!letter) {
			if (isUrgentCare) {
				const emergencyData = {
					success: true,
					letterId,
					debitedAmountRub: amountRub,
					usedAmountRub: amountRub,
					remainingCoverageRub: 0,
					status: "pending_letter",
					warning: "Требуется досылка гарантийного письма ДМС",
					isEmergency: true,
				};
				return {
					status: 200,
					data: emergencyData,
				};
			}
			return {
				status: 404,
				error: {
					error: "LetterNotFound",
					message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
				},
			};
		}

		if (letter.status === "cancelled") {
			if (isUrgentCare) {
				const emergencyData = {
					success: true,
					letterId: letter.id,
					debitedAmountRub: amountRub,
					usedAmountRub: Number(letter.usedAmountRub),
					remainingCoverageRub: 0,
					status: letter.status,
					warning: "Требуется досылка гарантийного письма ДМС",
					isEmergency: true,
				};
				return {
					status: 200,
					data: emergencyData,
				};
			}
			return {
				status: 400,
				error: {
					error: "LetterCancelled",
					message: "Гарантийное письмо аннулировано и не может быть использовано для списания.",
				},
			};
		}

		const todayIso = new Date().toISOString().slice(0, 10);
		if (letter.validUntil && letter.validUntil < todayIso) {
			if (isUrgentCare) {
				const emergencyData = {
					success: true,
					letterId: letter.id,
					debitedAmountRub: amountRub,
					usedAmountRub: Number(letter.usedAmountRub),
					remainingCoverageRub: 0,
					status: letter.status,
					warning: "Требуется досылка гарантийного письма ДМС",
					isEmergency: true,
				};
				return {
					status: 200,
					data: emergencyData,
				};
			}
			return {
				status: 400,
				error: {
					error: "LetterExpired",
					message: `Срок действия гарантийного письма истёк (${letter.validUntil}).`,
				},
			};
		}

		const maxCoverageKop = rublesToKopecks(Number(letter.maxCoverageRub));
		const currentUsedKop = rublesToKopecks(Number(letter.usedAmountRub));
		const amountKop = rublesToKopecks(amountRub);
		const remainingBeforeKop = Math.max(0, maxCoverageKop - currentUsedKop);
		const remainingBeforeRub = kopecksToRubles(remainingBeforeKop);

		if (letter.status === "exhausted" || remainingBeforeKop <= 0) {
			if (isUrgentCare) {
				// Мандат 8e: при острой боли превышение лимита не блокирует приём
				const newUsedAmountKop = currentUsedKop + amountKop;
				const newUsedAmount = kopecksToRubles(newUsedAmountKop);
				const [updated] = await tx
					.update(dmsGuaranteeLetters)
					.set({
						usedAmountRub: newUsedAmount,
						status: "exhausted",
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(dmsGuaranteeLetters.id, letterId),
							eq(dmsGuaranteeLetters.organizationId, orgId),
						),
					)
					.returning();

				if (!updated) {
					return {
						status: 404,
						error: {
							error: "guarantee_letter_not_found",
							message: "Гарантийное письмо не найдено в транзакции",
						},
					};
				}

				const overdraftData = {
					success: true,
					letterId: updated.id,
					debitedAmountRub: amountRub,
					usedAmountRub: Number(updated.usedAmountRub),
					remainingCoverageRub: 0,
					status: updated.status,
					warning: "Требуется досылка гарантийного письма ДМС",
					isEmergency: true,
				};

				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: overdraftData,
						responseCode: 200,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: overdraftData,
							responseCode: 200,
						},
					});

				return {
					status: 200,
					data: overdraftData,
				};
			}

			return {
				status: 400,
				error: {
					error: "LetterExhausted",
					message: "Лимит гарантийного письма уже полностью исчерпан.",
				},
			};
		}

		if (amountKop > remainingBeforeKop) {
			// Мандат 8e (Автономия врача): если сумма списания превышает остаток по письму,
			// тихо списываем доступный остаток на СК, переводим письмо в "exhausted",
			// а разницу переносим в сооплату пациента в кассу (patientCoPayKopecks) без блокировки приёма.
			const debitedDmsKop = remainingBeforeKop;
			const patientCoPayKop = amountKop - remainingBeforeKop;
			const newUsedAmountKop = currentUsedKop + debitedDmsKop;
			const newUsedAmount = kopecksToRubles(newUsedAmountKop);

			const [updated] = await tx
				.update(dmsGuaranteeLetters)
				.set({
					usedAmountRub: newUsedAmount,
					status: "exhausted",
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.returning();

			if (!updated) {
				return {
					status: 404,
					error: {
						error: "guarantee_letter_not_found",
						message: "Гарантийное письмо не найдено в транзакции",
					},
				};
			}

			const softSplitData = {
				success: true,
				letterId: updated.id,
				debitedAmountRub: kopecksToRubles(debitedDmsKop),
				debitedDmsKopecks: debitedDmsKop,
				patientCoPayRub: kopecksToRubles(patientCoPayKop),
				patientCoPayKopecks: patientCoPayKop,
				usedAmountRub: Number(updated.usedAmountRub),
				remainingCoverageRub: 0,
				remainingCoverageKopecks: 0,
				status: "exhausted",
				warning: "Лимит гарантийного письма исчерпан. Оставшаяся сумма перенесена в сооплату пациента.",
			};

			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: idempotencyKey,
					status: "completed",
					payloadHash: computePayloadHash(request.body ?? {}),
					responseBody: softSplitData,
					responseCode: 200,
				})
				.onConflictDoUpdate({
					target: [idempotencyKeys.clinicId, idempotencyKeys.key],
					set: {
						status: "completed",
						responseBody: softSplitData,
						responseCode: 200,
					},
				});

			return {
				status: 200,
				data: softSplitData,
			};
		}

		const newUsedAmountKop = currentUsedKop + amountKop;
		const newUsedAmount = kopecksToRubles(newUsedAmountKop);
		let newStatus = letter.status;
		if (newUsedAmountKop >= maxCoverageKop) {
			newStatus = "exhausted";
		}

		const [updated] = await tx
			.update(dmsGuaranteeLetters)
			.set({
				usedAmountRub: newUsedAmount,
				status: newStatus,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(dmsGuaranteeLetters.id, letterId),
					eq(dmsGuaranteeLetters.organizationId, orgId),
				),
			)
			.returning();

		if (!updated) {
			return {
				status: 404,
				error: {
					error: "guarantee_letter_not_found",
					message: "Гарантийное письмо не найдено в транзакции",
				},
			};
		}

		const remainingCoverageKop = Math.max(0, maxCoverageKop - newUsedAmountKop);

		const successData = {
			success: true,
			letterId: updated.id,
			debitedAmountRub: amountRub,
			usedAmountRub: Number(updated.usedAmountRub),
			remainingCoverageRub: kopecksToRubles(remainingCoverageKop),
			status: updated.status,
		};

		await tx
			.insert(idempotencyKeys)
			.values({
				clinicId: orgId,
				key: idempotencyKey,
				status: "completed",
				payloadHash: computePayloadHash(request.body ?? {}),
				responseBody: successData,
				responseCode: 200,
			})
			.onConflictDoUpdate({
				target: [idempotencyKeys.clinicId, idempotencyKeys.key],
				set: {
					status: "completed",
					responseBody: successData,
					responseCode: 200,
				},
			});

		return {
			status: 200,
			data: successData,
		};
	});

	if (result.status !== 200) {
		return reply.code(result.status).send(result.error);
	}
	reply.header("Idempotency-Key", idempotencyKey);
	if ("isReplayed" in result && result.isReplayed) {
		reply.header("idempotency-replayed", "true");
		reply.header("x-idempotency-replayed", "true");
	}
	return reply.code(200).send(result.data);
}

export function registerGuaranteeLetterUsageRoutes(app: FastifyInstance) {
	app.post<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId/record-usage",
		handleRecordGuaranteeLetterUsage,
	);
}
