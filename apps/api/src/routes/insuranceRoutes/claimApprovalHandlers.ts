import {
	calculateDmsGuaranteeSplit,
	computePayloadHash,
	kopecksToRubles,
	rublesToKopecks,
	type DmsGuaranteeLetter,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { dmsGuaranteeLetters, insuranceContracts, patients } from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import {
	preAuthRequestBodySchema,
	splitInvoiceBodySchema,
	transitionStatusBodySchema,
} from "./types.js";

export async function registerClaimApprovalRoutes(app: FastifyInstance) {
	// POST /api/insurance/split-invoice: calculate exact split between DMS share and patient co-pay
	app.post("/api/insurance/split-invoice", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance split invoice",
		);
		if (!orgId) return;

		const parsed = splitInvoiceBodySchema.safeParse(request.body);
		if (!parsed.success) {
			const msg = parsed.error.issues[0]?.message ?? "Проверьте перечень услуг для разделения счёта.";
			return reply.code(400).send({
				error: "ValidationError",
				message: msg,
			});
		}

		const { letterId, contractId, visitDate, items } = parsed.data;

		// 1. Поиск гарантийного письма из базы данных PostgreSQL
		let letter: DmsGuaranteeLetter | null = null;
		if (letterId) {
			const [foundLetter] = await db
				.select()
				.from(dmsGuaranteeLetters)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.limit(1);

			if (foundLetter) {
				letter = {
					id: foundLetter.id,
					organizationId: foundLetter.organizationId,
					contractId: foundLetter.contractId,
					patientId: foundLetter.patientId,
					patientFullName: foundLetter.patientFullName,
					patientBirthDate: foundLetter.patientBirthDate,
					policyNumber: foundLetter.policyNumber,
					insurerKey: foundLetter.insurerKey,
					insurerName: foundLetter.insurerName,
					letterNumber: foundLetter.letterNumber,
					issueDate: foundLetter.issueDate,
					validFrom: foundLetter.validFrom,
					validUntil: foundLetter.validUntil,
					maxCoverageRub: Number(foundLetter.maxCoverageRub),
					usedAmountRub: Number(foundLetter.usedAmountRub),
					franchisePct: Number(foundLetter.franchisePct),
					franchiseType: (foundLetter.franchiseType as "percent" | "fixed_rub") || "percent",
					franchiseFixedRub: Number(foundLetter.franchiseFixedRub),
					programExclusions: (foundLetter.programExclusions as string[]) || [],
					approvedServiceCodes: (foundLetter.approvedServiceCodes as string[]) || [],
					approvedServiceCodes804n: (foundLetter.approvedServiceCodes as string[]) || [],
					approvedTeethFdi: (foundLetter.approvedTeethFdi as string[]) || [],
					approvedDiagnosisCodes: (foundLetter.approvedDiagnosisCodes as string[]) || [],
					approvedDiagnosisMkb10: (foundLetter.approvedDiagnosisCodes as string[]) || [],
					curatorFullName: foundLetter.curatorFullName,
					curatorPhone: foundLetter.curatorPhone,
					notes: foundLetter.notes,
					status: (foundLetter.status as DmsGuaranteeLetter["status"]) || "active",
					createdAt: foundLetter.createdAt.toISOString(),
					updatedAt: foundLetter.updatedAt.toISOString(),
				};
			}
		}

		// 2. Поиск договора ДМС (если передан contractId)
		let contract: {
			coverageTherapyPct: number;
			coverageSurgeryPct: number;
			coverageOrthoPct: number;
			coverageHygienePct: number;
			annualLimitRub: number | null;
		} | null = null;

		if (contractId) {
			const [found] = await db
				.select()
				.from(insuranceContracts)
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.limit(1);

			if (found && found.isActive) {
				contract = {
					coverageTherapyPct: Number(found.coverageTherapyPct),
					coverageSurgeryPct: Number(found.coverageSurgeryPct),
					coverageOrthoPct: Number(found.coverageOrthoPct),
					coverageHygienePct: Number(found.coverageHygienePct),
					annualLimitRub: found.annualLimitRub != null ? Number(found.annualLimitRub) : null,
				};
			}
		}

		const splitResult = calculateDmsGuaranteeSplit(letter, items, {
			visitDate: visitDate || new Date().toISOString().slice(0, 10),
			contract,
			isEmergency: parsed.data.isEmergency,
			hasAcutePain: parsed.data.hasAcutePain,
		});

		return reply.code(200).send(splitResult);
	});

	// POST /api/insurance/claims/transition-status: atomically transition guarantee letter state in PostgreSQL
	app.post("/api/insurance/claims/transition-status", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"insurance status transition",
		);
		if (!orgId) return;

		const parsed = transitionStatusBodySchema.safeParse(request.body);
		if (!parsed.success) {
			const msg = parsed.error.issues[0]?.message ?? "Проверьте параметры перехода статуса гарантийного письма.";
			return reply.code(400).send({
				error: "ValidationError",
				message: msg,
			});
		}

		// Mandate 8zp/8bo: Idempotency-Key support
		const rawBodyMutationId = (request.body as { clientMutationId?: unknown; idempotencyKey?: unknown })?.clientMutationId ||
			(request.body as { clientMutationId?: unknown; idempotencyKey?: unknown })?.idempotencyKey;
		const rawIdemKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined) ||
			(typeof rawBodyMutationId === "string" ? rawBodyMutationId : undefined);
		const idempotencyKey =
			typeof rawIdemKey === "string" && rawIdemKey.trim().length > 0
				? rawIdemKey.trim()
				: undefined;

		if (idempotencyKey) {
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
						message: "Операция смены статуса гарантийного письма с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		const { letterId, status, notes, resolutionReason } = parsed.data;

		const txResult = await db.transaction(async (tx) => {
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
				return {
					status: 404,
					error: {
						error: "LetterNotFound",
						message: "Гарантийное письмо не найдено в вашей клинике.",
					},
				};
			}

			let updatedNotes = letter.notes || "";
			if (resolutionReason) {
				const timestamp = new Date().toLocaleString("ru-RU");
				updatedNotes = updatedNotes
					? `${updatedNotes}\n[${timestamp}] Смена статуса на "${status}": ${resolutionReason}`
					: `[${timestamp}] Смена статуса на "${status}": ${resolutionReason}`;
			}
			if (notes) {
				updatedNotes = updatedNotes ? `${updatedNotes}\n${notes}` : notes;
			}

			const [updated] = await tx
				.update(dmsGuaranteeLetters)
				.set({
					status,
					notes: updatedNotes,
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
						message: "Гарантийное письмо не найдено или не принадлежит организации",
					},
				};
			}

			const responsePayload = {
				success: true,
				letterId: updated.id,
				status: updated.status,
				notes: updated.notes,
				updatedAt: updated.updatedAt.toISOString(),
			};

			if (idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: responsePayload,
						responseCode: 200,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: responsePayload,
							responseCode: 200,
						},
					});
			}

			return {
				status: 200,
				data: responsePayload,
			};
		});

		if (txResult.status !== 200 || !txResult.data) {
			return reply.code(txResult.status).send(txResult.error);
		}

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.code(200).send(txResult.data);
	});

	// POST /api/insurance/pre-auth/request: record or dispatch pre-authorization request to insurance curator
	app.post("/api/insurance/pre-auth/request", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"insurance pre-auth request",
		);
		if (!orgId) return;

		const parsed = preAuthRequestBodySchema.safeParse(request.body);
		if (!parsed.success) {
			const msg = parsed.error.issues[0]?.message ?? "Проверьте данные запроса на предварительное согласование.";
			return reply.code(400).send({
				error: "ValidationError",
				message: msg,
			});
		}

		// Mandate 8zp/8bo: Idempotency-Key support
		const rawBodyMutationId = (request.body as { clientMutationId?: unknown; idempotencyKey?: unknown })?.clientMutationId ||
			(request.body as { clientMutationId?: unknown; idempotencyKey?: unknown })?.idempotencyKey;
		const rawIdemKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined) ||
			(typeof rawBodyMutationId === "string" ? rawBodyMutationId : undefined);
		const idempotencyKey =
			typeof rawIdemKey === "string" && rawIdemKey.trim().length > 0
				? rawIdemKey.trim()
				: undefined;

		if (idempotencyKey) {
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
						message: "Операция предварительного согласования ДМС с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		const d = parsed.data;

		if (d.letterId) {
			// Update existing letter to pending_approval in ACID transaction
			const txResult = await db.transaction(async (tx) => {
				const [existing] = await tx
					.select()
					.from(dmsGuaranteeLetters)
					.where(
						and(
							eq(dmsGuaranteeLetters.id, d.letterId as string),
							eq(dmsGuaranteeLetters.organizationId, orgId),
						),
					)
					.for("update")
					.limit(1);

				if (!existing) {
					return {
						status: 404,
						error: {
							error: "LetterNotFound",
							message: "Гарантийное письмо для согласования не найдено.",
						},
					};
				}

				const updatePayload: Partial<typeof dmsGuaranteeLetters.$inferInsert> = {
					status: "pending_approval",
					updatedAt: new Date(),
				};
				if (d.curatorFullName) updatePayload.curatorFullName = d.curatorFullName.trim();
				if (d.curatorPhone) updatePayload.curatorPhone = d.curatorPhone.trim();
				if (d.serviceCodes && d.serviceCodes.length > 0) updatePayload.approvedServiceCodes = d.serviceCodes;
				if (d.teethFdi && d.teethFdi.length > 0) updatePayload.approvedTeethFdi = d.teethFdi;
				if (d.diagnosisCodes && d.diagnosisCodes.length > 0) updatePayload.approvedDiagnosisCodes = d.diagnosisCodes;
				if (d.notes) {
					const existingNotes = existing.notes ? `${existing.notes}\n` : "";
					updatePayload.notes = `${existingNotes}[Запрос согласования] ${d.notes}`;
				}

				const [updated] = await tx
					.update(dmsGuaranteeLetters)
					.set(updatePayload)
					.where(
						and(
							eq(dmsGuaranteeLetters.id, d.letterId as string),
							eq(dmsGuaranteeLetters.organizationId, orgId),
						),
					)
					.returning();

				if (!updated) {
					return {
						status: 404,
						error: {
							error: "guarantee_letter_not_found",
							message: "Гарантийное письмо не найдено или не принадлежит организации",
						},
					};
				}

				const responsePayload = {
					success: true,
					letterId: updated.id,
					status: updated.status,
					curatorFullName: updated.curatorFullName,
					curatorPhone: updated.curatorPhone,
					message: "Запрос на предварительное согласование отправлен куратору страховой компании.",
				};

				if (idempotencyKey) {
					await tx
						.insert(idempotencyKeys)
						.values({
							clinicId: orgId,
							key: idempotencyKey,
							status: "completed",
							payloadHash: computePayloadHash(request.body ?? {}),
							responseBody: responsePayload,
							responseCode: 200,
						})
						.onConflictDoUpdate({
							target: [idempotencyKeys.clinicId, idempotencyKeys.key],
							set: {
								status: "completed",
								responseBody: responsePayload,
								responseCode: 200,
							},
						});
				}

				return {
					status: 200,
					data: responsePayload,
				};
			});

			if (txResult.status !== 200 || !txResult.data) {
				return reply.code(txResult.status).send(txResult.error);
			}

			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			return reply.code(200).send(txResult.data);
		} else {
			// Create a draft pre-auth letter in pending_approval in ACID transaction
			const todayIso = new Date().toISOString().slice(0, 10);
			const nextMonthIso = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

			const txResult = await db.transaction(async (tx) => {
				// Mandate 8z/8bd: BOLA/IDOR protection - verify patient belongs to current clinic organization
				const [patientRecord] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.id, d.patientId),
							eq(patients.organizationId, orgId),
						),
					)
					.limit(1);

				if (!patientRecord) {
					return {
						status: 404,
						error: {
							error: "PatientNotFound",
							message: "Пациент не найден в вашей клинике.",
						},
					};
				}

				if (d.contractId) {
					const [contractRecord] = await tx
						.select({ id: insuranceContracts.id })
						.from(insuranceContracts)
						.where(
							and(
								eq(insuranceContracts.id, d.contractId),
								eq(insuranceContracts.organizationId, orgId),
							),
						)
						.limit(1);

					if (!contractRecord) {
						return {
							status: 404,
							error: {
								error: "ContractNotFound",
								message: "Договор ДМС не найден в вашей клинике.",
							},
						};
					}
				}

				const estimatedCostKop = d.estimatedCostKopecks ?? (d.estimatedCostRub ? rublesToKopecks(d.estimatedCostRub) : 5000000);
				const estimatedCostRub = kopecksToRubles(estimatedCostKop);

				const [created] = await tx
					.insert(dmsGuaranteeLetters)
					.values({
						organizationId: orgId,
						contractId: d.contractId ?? null,
						patientId: d.patientId,
						patientFullName: d.patientFullName?.trim() || "Пациент ДМС",
						patientBirthDate: d.patientBirthDate ?? null,
						policyNumber: d.policyNumber?.trim() || "СОГЛАСОВАНИЕ",
						insurerKey: d.insurerKey || "custom",
						insurerName: d.insurerName?.trim() || "Страховая компания",
						letterNumber: `REQ-${Date.now().toString(36).toUpperCase()}`,
						issueDate: todayIso,
						validFrom: todayIso,
						validUntil: nextMonthIso,
						maxCoverageRub: estimatedCostRub,
						maxCoverageKopecks: BigInt(estimatedCostKop),
						usedAmountRub: 0,
						usedAmountKopecks: 0n,
						franchisePct: 0,
						franchiseType: "percent",
						franchiseFixedRub: 0,
						franchiseFixedKopecks: 0n,
						programExclusions: [],
						approvedServiceCodes: d.serviceCodes ?? [],
						approvedTeethFdi: d.teethFdi ?? [],
						approvedDiagnosisCodes: d.diagnosisCodes ?? [],
						curatorFullName: d.curatorFullName?.trim() ?? null,
						curatorPhone: d.curatorPhone?.trim() ?? null,
						notes: d.notes ? `[Предварительное согласование] ${d.notes}` : "Запрос на предварительное согласование",
						status: "pending_approval",
					})
					.returning();

				if (!created) {
					return {
						status: 500,
						error: {
							error: "guarantee_letter_creation_failed",
							message: "Не удалось создать гарантийное письмо",
						},
					};
				}

				const responsePayload = {
					success: true,
					letterId: created.id,
					status: created.status,
					curatorFullName: created.curatorFullName,
					curatorPhone: created.curatorPhone,
					message: "Создан запрос на предварительное согласование со статусом ожидания ответа куратора.",
				};

				if (idempotencyKey) {
					await tx
						.insert(idempotencyKeys)
						.values({
							clinicId: orgId,
							key: idempotencyKey,
							status: "completed",
							payloadHash: computePayloadHash(request.body ?? {}),
							responseBody: responsePayload,
							responseCode: 201,
						})
						.onConflictDoUpdate({
							target: [idempotencyKeys.clinicId, idempotencyKeys.key],
							set: {
								status: "completed",
								responseBody: responsePayload,
								responseCode: 201,
							},
						});
				}

				return {
					status: 201,
					data: responsePayload,
				};
			});

			if (txResult.status !== 201 || !txResult.data) {
				return reply.code(txResult.status).send(txResult.error);
			}

			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			return reply.code(201).send(txResult.data);
		}
	});
}
