import {
	kopecksToRubles,
	resolveValidIanaTimeZone,
	rublesToKopecks,
	todayDateKeyInTimeZone,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantWriteCtx } from "../../../db/rls.js";
import { dmsGuaranteeLetters } from "../../../db/schema.js";
import { clinicTimeZone } from "../../../services/reports/managerReports/timezone.js";
import { recordUsageBodySchema } from "../types.js";
import { isValidUuid, resolveDbKopecks } from "./guaranteeLetterFormatters.js";

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
			details: parsed.error.issues,
		});
	}

	const amountKop = parsed.data.amountKopecks ?? rublesToKopecks(parsed.data.amountRub ?? 0);
	const amountRub = kopecksToRubles(amountKop);
	const isUrgentCare = Boolean(parsed.data.isEmergency || parsed.data.hasAcutePain || parsed.data.allowOverdraft);

	// Mandate 8zp/8bo: require Idempotency-Key even if called without global plugin in isolated tests
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

	// Mandate 8e: если списание производится для экстренного визита без ГП
	if (letterId === "emergency" || letterId === "emergency_pending_letter" || letterId === "none" || letterId === "acute-pain") {
		const emergencyPayload = {
			success: true,
			letterId,
			debitedAmountRub: amountRub,
			debitedAmountKopecks: amountKop,
			usedAmountRub: amountRub,
			usedAmountKopecks: amountKop,
			remainingCoverageRub: 0,
			remainingCoverageKopecks: 0,
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

	const result = await withTenantWriteCtx(orgId, async (tx) => {
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
				return {
					status: 200,
					data: {
						success: true,
						letterId,
						debitedAmountRub: amountRub,
						debitedAmountKopecks: amountKop,
						usedAmountRub: amountRub,
						usedAmountKopecks: amountKop,
						remainingCoverageRub: 0,
						remainingCoverageKopecks: 0,
						status: "pending_letter",
						warning: "Требуется досылка гарантийного письма ДМС",
						isEmergency: true,
					},
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

		const existingUsedKop = resolveDbKopecks(letter.usedAmountKopecks, letter.usedAmountRub);

		if (letter.status === "cancelled") {
			if (isUrgentCare) {
				return {
					status: 200,
					data: {
						success: true,
						letterId: letter.id,
						debitedAmountRub: amountRub,
						debitedAmountKopecks: amountKop,
						usedAmountRub: kopecksToRubles(existingUsedKop),
						usedAmountKopecks: existingUsedKop,
						remainingCoverageRub: 0,
						remainingCoverageKopecks: 0,
						status: letter.status,
						warning: "Требуется досылка гарантийного письма ДМС",
						isEmergency: true,
					},
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

		const clinicTz = resolveValidIanaTimeZone(await clinicTimeZone(orgId, tx));
		const todayIso = todayDateKeyInTimeZone(clinicTz);
		if (letter.validFrom && letter.validFrom > todayIso) {
			if (isUrgentCare) {
				return {
					status: 200,
					data: {
						success: true,
						letterId: letter.id,
						debitedAmountRub: amountRub,
						debitedAmountKopecks: amountKop,
						usedAmountRub: kopecksToRubles(existingUsedKop),
						usedAmountKopecks: existingUsedKop,
						remainingCoverageRub: 0,
						remainingCoverageKopecks: 0,
						status: letter.status,
						warning: "Требуется досылка гарантийного письма ДМС",
						isEmergency: true,
					},
				};
			}
			return {
				status: 400,
				error: {
					error: "LetterNotYetValid",
					message: `Срок действия гарантийного письма ещё не наступил (${letter.validFrom}).`,
				},
			};
		}

		if (letter.validUntil && letter.validUntil < todayIso) {
			if (isUrgentCare) {
				return {
					status: 200,
					data: {
						success: true,
						letterId: letter.id,
						debitedAmountRub: amountRub,
						debitedAmountKopecks: amountKop,
						usedAmountRub: kopecksToRubles(existingUsedKop),
						usedAmountKopecks: existingUsedKop,
						remainingCoverageRub: 0,
						remainingCoverageKopecks: 0,
						status: letter.status,
						warning: "Требуется досылка гарантийного письма ДМС",
						isEmergency: true,
					},
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

		const maxCoverageKop = resolveDbKopecks(letter.maxCoverageKopecks, letter.maxCoverageRub);
		const currentUsedKop = existingUsedKop;
		const remainingBeforeKop = Math.max(0, maxCoverageKop - currentUsedKop);

		if (letter.status === "exhausted" || remainingBeforeKop <= 0) {
			if (isUrgentCare) {
				// Мандат 8e: при острой боли превышение лимита не блокирует приём
				const newUsedAmountKop = currentUsedKop + amountKop;
				const newUsedAmount = kopecksToRubles(newUsedAmountKop);
				const [updated] = await tx
					.update(dmsGuaranteeLetters)
					.set({
						usedAmountRub: newUsedAmount,
						usedAmountKopecks: BigInt(newUsedAmountKop),
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

				return {
					status: 200,
					data: {
						success: true,
						letterId: updated.id,
						debitedAmountRub: amountRub,
						debitedAmountKopecks: amountKop,
						usedAmountRub: newUsedAmount,
						usedAmountKopecks: newUsedAmountKop,
						remainingCoverageRub: 0,
						remainingCoverageKopecks: 0,
						status: updated.status,
						warning: "Требуется досылка гарантийного письма ДМС",
						isEmergency: true,
					},
				};
			}

			// Mandate 8e: если лимит ГП исчерпан, возвращаем 200 с переносом всей суммы в сооплату пациента
			return {
				status: 200,
				data: {
					success: true,
					letterId: letter.id,
					debitedAmountRub: 0,
					debitedDmsKopecks: 0,
					patientCoPayRub: amountRub,
					patientCoPayKopecks: amountKop,
					usedAmountRub: kopecksToRubles(currentUsedKop),
					usedAmountKopecks: currentUsedKop,
					remainingCoverageRub: 0,
					remainingCoverageKopecks: 0,
					status: "exhausted",
					warning: "Лимит гарантийного письма исчерпан. Сумма перенесена в сооплату пациента.",
				},
			};
		}

		if (amountKop > remainingBeforeKop) {
			// Мандат 8e (Автономия врача): списываем доступный остаток на СК, остальное — в сооплату пациента
			const debitedDmsKop = remainingBeforeKop;
			const patientCoPayKop = amountKop - remainingBeforeKop;
			const newUsedAmountKop = currentUsedKop + debitedDmsKop;
			const newUsedAmount = kopecksToRubles(newUsedAmountKop);

			const [updated] = await tx
				.update(dmsGuaranteeLetters)
				.set({
					usedAmountRub: newUsedAmount,
					usedAmountKopecks: BigInt(newUsedAmountKop),
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

			return {
				status: 200,
				data: {
					success: true,
					letterId: updated.id,
					debitedAmountRub: kopecksToRubles(debitedDmsKop),
					debitedDmsKopecks: debitedDmsKop,
					patientCoPayRub: kopecksToRubles(patientCoPayKop),
					patientCoPayKopecks: patientCoPayKop,
					usedAmountRub: newUsedAmount,
					usedAmountKopecks: newUsedAmountKop,
					remainingCoverageRub: 0,
					remainingCoverageKopecks: 0,
					status: "exhausted",
					warning: "Лимит гарантийного письма исчерпан. Оставшаяся сумма перенесена в сооплату пациента.",
				},
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
				usedAmountKopecks: BigInt(newUsedAmountKop),
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

		return {
			status: 200,
			data: {
				success: true,
				letterId: updated.id,
				debitedAmountRub: amountRub,
				debitedAmountKopecks: amountKop,
				usedAmountRub: newUsedAmount,
				usedAmountKopecks: newUsedAmountKop,
				remainingCoverageRub: kopecksToRubles(remainingCoverageKop),
				remainingCoverageKopecks: remainingCoverageKop,
				status: updated.status,
			},
		};
	});

	if (result.status !== 200) {
		return reply.code(result.status).send(result.error);
	}
	reply.header("Idempotency-Key", idempotencyKey);
	return reply.code(200).send(result.data);
}

export function registerGuaranteeLetterUsageRoutes(app: FastifyInstance) {
	app.post<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId/record-usage",
		{ config: { tenantTxSelfManaged: true } },
		handleRecordGuaranteeLetterUsage,
	);
}
