/**
 * installmentContractsRoutes.ts — Contract Creation (with 54-FZ Down Payment) & Queries.
 */

import {
	generate0PercentInstallmentSchedule,
	kopecksToRubles,
	nonNegativeMoneyRubSchema,
	positiveMoneyRubSchema,
	rublesToKopecks,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomInt } from "node:crypto";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	fiscalReceiptQueue,
	idempotencyKeys,
	installmentContracts,
	installmentTranches,
	patientInvoices,
	patients,
	payments,
} from "../../../db/schema.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import {
	parseHeaderIdempotencyKey,
	resolveCashBoxPaymentMethod,
	resolveLockedCashBoxForInstallment,
	resolveSafeKopecks,
} from "./installmentHelpers.js";

const createContractBodySchema = z
	.object({
		patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID"),
		treatmentPlanId: z.string().uuid().optional().nullable(),
		invoiceId: z.string().uuid().optional().nullable(),
		visitId: z.string().uuid().optional().nullable(),
		totalAmountRub: positiveMoneyRubSchema,
		downPaymentRub: nonNegativeMoneyRubSchema.default(0),
		monthsCount: z
			.union([
				z.literal(3),
				z.literal(6),
				z.literal(10),
				z.literal(12),
				z.literal(18),
				z.literal(24),
			])
			.default(6),
		notes: z.string().trim().max(1000).optional().nullable(),
		startDateIso: z.string().optional(),
		cashBoxId: z.string().uuid().optional(),
		operatorId: z.string().uuid().optional(),
		clientMutationId: z.string().trim().optional(),
		idempotencyKey: z.string().trim().optional(),
	})
	.strict();

const listContractsQuerySchema = z
	.object({
		patientId: z.string().uuid().optional(),
		status: z.string().trim().max(64).optional(),
	})
	.strict();

export function registerInstallmentContractsRoutes(app: FastifyInstance): void {
	const handleCreateContract = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"create installment contract",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const parsed = createContractBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры договора рассрочки.",
				details: parsed.error.issues,
			});
		}

		const {
			patientId,
			treatmentPlanId,
			invoiceId,
			visitId,
			totalAmountRub,
			downPaymentRub,
			monthsCount,
			notes,
			startDateIso,
			cashBoxId,
			operatorId,
			clientMutationId,
			idempotencyKey: bodyIdempotencyKey,
		} = parsed.data;

		const rawKey =
			parseHeaderIdempotencyKey(request) ||
			clientMutationId ||
			bodyIdempotencyKey;

		if (!rawKey) {
			return reply.code(400).send({
				error: "IdempotencyKeyRequired",
				message:
					"Для оформления договора рассрочки обязателен заголовок Idempotency-Key или поле clientMutationId.",
			});
		}

		const baseKey = rawKey.includes("#") ? rawKey.split("#")[0] : rawKey;
		if (!isValidUuid(baseKey || "")) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
			});
		}
		const idempotencyKey = rawKey;

		reply.header("Idempotency-Key", idempotencyKey);
		reply.header("X-Idempotency-Key", idempotencyKey);

		if (downPaymentRub >= totalAmountRub) {
			return reply.code(400).send({
				error: "InvalidDownPayment",
				message: "Первоначальный взнос не может быть равен или превышать полную стоимость рассрочки.",
			});
		}

		const totalKop = rublesToKopecks(totalAmountRub);
		const downPaymentKop = rublesToKopecks(downPaymentRub);
		const remainingKop = totalKop - downPaymentKop;

		const schedule = generate0PercentInstallmentSchedule(
			remainingKop,
			monthsCount,
			startDateIso ?? new Date().toISOString(),
		);

		const result = await withTenantCtx(orgId, async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':installment_contract:' || ${idempotencyKey}))`,
			);

			const [existingKey] = await tx
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				)
				.limit(1);

			let existingContract: typeof installmentContracts.$inferSelect | undefined;
			if (
				existingKey?.responseBody &&
				typeof existingKey.responseBody === "object" &&
				"contractId" in existingKey.responseBody &&
				typeof existingKey.responseBody.contractId === "string"
			) {
				const [foundContract] = await tx
					.select()
					.from(installmentContracts)
					.where(
						and(
							eq(installmentContracts.id, existingKey.responseBody.contractId),
							eq(installmentContracts.organizationId, orgId),
						),
					)
					.limit(1);
				existingContract = foundContract;
			}

			if (!existingContract) {
				const idempTag = `[idempotency:${idempotencyKey}]`;
				const [byNotes] = await tx
					.select()
					.from(installmentContracts)
					.where(
						and(
							eq(installmentContracts.organizationId, orgId),
							sql`strpos(coalesce(${installmentContracts.notes}, ''), ${idempTag}) > 0`,
						),
					)
					.limit(1);
				existingContract = byNotes;
			}

			if (existingContract) {
				const existingTranches = await tx
					.select()
					.from(installmentTranches)
					.where(
						and(
							eq(installmentTranches.contractId, existingContract.id),
							eq(installmentTranches.organizationId, orgId),
						),
					)
					.orderBy(installmentTranches.trancheNumber);

				return {
					kind: "ok" as const,
					contract: existingContract,
					tranches: existingTranches,
					downPaymentOperation: undefined,
					downPaymentPayment: undefined,
					isDuplicate: true,
				};
			}

			const [patient] = await tx
				.select()
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!patient) {
				return { kind: "patient_not_found" as const };
			}

			let lockedInvoiceId: string | null = null;
			if (invoiceId) {
				const [inv] = await tx
					.select({ id: patientInvoices.id })
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.id, invoiceId),
							eq(patientInvoices.organizationId, orgId),
						),
					)
					.for("update")
					.limit(1);
				if (!inv) {
					return { kind: "invoice_not_found" as const, invoiceId };
				}
				lockedInvoiceId = inv.id;
			}

			// Проверяем и блокируем кассовый счет заранее (при наличии первоначального взноса)
			let targetBox: typeof cashBoxes.$inferSelect | undefined;
			if (downPaymentKop > 0) {
				const boxRes = await resolveLockedCashBoxForInstallment(tx, orgId, cashBoxId, "main");
				if (!boxRes.ok) {
					return { kind: boxRes.kind };
				}
				targetBox = boxRes.box;
			}

			const now = new Date();
			const contractNumber = `РАСС-${now.getFullYear()}-${randomInt(100000, 1000000)}`;
			const compositeNotes = `[idempotency:${idempotencyKey}] ${notes || ""}`.trim();

			const [contract] = await tx
				.insert(installmentContracts)
				.values({
					organizationId: orgId,
					patientId,
					treatmentPlanId: treatmentPlanId ?? null,
					contractNumber,
					totalAmountRub,
					totalAmountKopecks: BigInt(totalKop),
					downPaymentRub,
					downPaymentKopecks: BigInt(downPaymentKop),
					monthsCount,
					paidAmountRub: 0,
					paidAmountKopecks: 0n,
					remainingAmountRub: kopecksToRubles(remainingKop),
					remainingAmountKopecks: BigInt(remainingKop),
					status: "active",
					signedAt: now,
					notes: compositeNotes,
				})
				.returning();

			if (!contract) {
				throw new Error("Не удалось создать договор рассрочки");
			}

			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: idempotencyKey,
					status: "completed",
					responseBody: { contractId: contract.id, contractNumber: contract.contractNumber },
					responseCode: 201,
				})
				.onConflictDoNothing();

			if (lockedInvoiceId) {
				await tx
					.update(patientInvoices)
					.set({
						status: "paid",
						paidAt: now,
					})
					.where(and(eq(patientInvoices.id, lockedInvoiceId), eq(patientInvoices.organizationId, orgId)));
			}

			const tranchesToInsert: Array<typeof installmentTranches.$inferInsert> = [];

			if (downPaymentKop > 0) {
				tranchesToInsert.push({
					contractId: contract.id,
					organizationId: orgId,
					trancheNumber: 0,
					amountRub: downPaymentRub,
					amountKopecks: BigInt(downPaymentKop),
					paidAmountKopecks: downPaymentKop,
					dueDate: now,
					paidAt: now,
					isPaid: true,
					status: "paid",
				});
			}

			tranchesToInsert.push(
				...schedule.map((item) => ({
					contractId: contract.id,
					organizationId: orgId,
					trancheNumber: item.monthIndex,
					amountRub: kopecksToRubles(item.amountKopecks),
					amountKopecks: BigInt(item.amountKopecks),
					paidAmountKopecks: 0,
					dueDate: new Date(item.paymentDateIso),
					isPaid: false,
					status: "pending",
				})),
			);

			const createdTranches = await tx
				.insert(installmentTranches)
				.values(tranchesToInsert)
				.returning();

			let downPaymentOperation: typeof cashOperations.$inferSelect | undefined;
			let downPaymentPayment: typeof payments.$inferSelect | undefined;

			if (downPaymentKop > 0 && targetBox) {
				const beforeKop = resolveSafeKopecks(targetBox.balanceKopecks, targetBox.balanceRub);
				const afterKop = beforeKop + downPaymentKop;
				const balanceBefore = kopecksToRubles(beforeKop);
				const balanceAfter = kopecksToRubles(afterKop);

				const [activeShift] = await tx
					.select()
					.from(cashBoxShifts)
					.where(
						and(
							eq(cashBoxShifts.organizationId, orgId),
							eq(cashBoxShifts.cashBoxId, targetBox.id),
							eq(cashBoxShifts.status, "open"),
						),
					)
					.for("update")
					.limit(1);

				await tx
					.update(cashBoxes)
					.set({
						balanceRub: balanceAfter,
						balanceKopecks: afterKop,
						updatedAt: now,
					})
					.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)));

				if (activeShift) {
					const prevIncomeKop = resolveSafeKopecks(
						activeShift.incomeTotalKopecks,
						activeShift.incomeTotalRub,
					);
					const nextIncomeKop = prevIncomeKop + downPaymentKop;
					await tx
						.update(cashBoxShifts)
						.set({
							incomeTotalRub: kopecksToRubles(nextIncomeKop),
							incomeTotalKopecks: nextIncomeKop,
							updatedAt: now,
						})
						.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
				}

				const reasonText = `Первоначальный взнос по договору рассрочки ${contractNumber}`;

				const [op] = await tx
					.insert(cashOperations)
					.values({
						organizationId: orgId,
						cashBoxId: targetBox.id,
						shiftId: activeShift?.id ?? null,
						operationType: "income",
						amountRub: downPaymentRub,
						amountKopecks: downPaymentKop,
						balanceBeforeRub: balanceBefore,
						balanceBeforeKopecks: BigInt(beforeKop),
						balanceAfterRub: balanceAfter,
						balanceAfterKopecks: BigInt(afterKop),
						reasonText,
						patientId,
						operatorId: operatorId ?? null,
						metadata: {
							contractId: contract.id,
							type: "down_payment",
							idempotencyKey,
						},
					})
					.returning();
				downPaymentOperation = op;

				const paymentMethodCode = resolveCashBoxPaymentMethod(targetBox);
				const [payRecord] = await tx
					.insert(payments)
					.values({
						organizationId: orgId,
						patientId,
						visitId: visitId ?? null,
						amountRub: downPaymentRub,
						amountKopecks: BigInt(downPaymentKop),
						method: paymentMethodCode,
						status: "paid",
						documentId: contract.id,
						clientMutationId: `downpay-${contract.id}`,
						note: reasonText,
						paidAt: now,
					})
					.returning();
				if (payRecord) {
					downPaymentPayment = payRecord;

					await tx.insert(fiscalReceiptQueue).values({
						organizationId: orgId,
						paymentId: payRecord.id,
						visitId: visitId ?? null,
						receiptType: "income",
						status: "pending_print",
						payloadJson: {
							clientMutationId: `downpay-${contract.id}`,
							amountRub: downPaymentRub,
							amountKopecks: downPaymentKop,
							method: paymentMethodCode,
							cashRub: paymentMethodCode === "cash" ? downPaymentRub : 0,
							cashKopecks: paymentMethodCode === "cash" ? downPaymentKop : 0,
							electronicRub: paymentMethodCode !== "cash" ? downPaymentRub : 0,
							electronicKopecks: paymentMethodCode !== "cash" ? downPaymentKop : 0,
							electronicCardKopecks: paymentMethodCode === "card" ? downPaymentKop : 0,
							sbpKopecks: paymentMethodCode === "online" ? downPaymentKop : 0,
							advanceOffsetRub: 0,
							certificateOffsetRub: 0,
							bonusOffsetRub: 0,
							dmsOffsetRub: 0,
							patientId,
							contractNumber,
							note: reasonText,
						},
						retryCount: 0,
					});
				}
			}

			if (downPaymentOperation && downPaymentKop > 0) {
				await tx
					.update(installmentTranches)
					.set({ cashOperationId: downPaymentOperation.id })
					.where(
						and(
							eq(installmentTranches.contractId, contract.id),
							eq(installmentTranches.organizationId, orgId),
							eq(installmentTranches.trancheNumber, 0),
						),
					);
				const tr0 = createdTranches.find((t) => t.trancheNumber === 0);
				if (tr0) {
					tr0.cashOperationId = downPaymentOperation.id;
				}
			}

			return {
				kind: "ok" as const,
				contract,
				tranches: createdTranches,
				downPaymentOperation,
				downPaymentPayment,
				isDuplicate: false,
			};
		});

		if (result.kind === "patient_not_found") {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент для оформления рассрочки не найден.",
			});
		}
		if (result.kind === "invoice_not_found") {
			return reply.code(404).send({
				error: "InvoiceNotFound",
				message: `Счёт (${result.invoiceId}) для привязки рассрочки не найден.`,
			});
		}
		if (result.kind === "explicit_box_not_found" || result.kind === "no_cash_box") {
			return reply.code(404).send({
				error: "CashBoxNotFound",
				message: "Указанный кассовый счет для первоначального взноса не найден.",
			});
		}
		if (result.kind !== "ok") {
			return reply.code(500).send({
				error: "InstallmentCreateError",
				message: "Не удалось оформить договор рассрочки.",
			});
		}

		if (result.isDuplicate) {
			reply.header("idempotency-replayed", "true");
			reply.header("x-idempotency-replayed", "true");
		}

		return reply.code(result.isDuplicate ? 200 : 201).send({
			success: true,
			message: `Договор рассрочки ${result.contract.contractNumber} на ${monthsCount} мес. успешно оформлен.`,
			contract: result.contract,
			tranches: result.tranches,
			downPaymentOperation: result.downPaymentOperation,
			downPaymentPayment: result.downPaymentPayment,
			isDuplicate: Boolean(result.isDuplicate),
		});
	};

	const contractRouteOpts = {
		config: { tenantTxSelfManaged: true },
		schema: {
			description: "Create installment contract with mandatory Idempotency-Key",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					organizationid: { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
	};
	app.post("/api/installments", contractRouteOpts, handleCreateContract);
	app.post("/api/installments/contracts", contractRouteOpts, handleCreateContract);

	const handleGetContracts = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "installments list");
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const parsed = listContractsQuerySchema.safeParse(request.query || {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фильтрации договоров рассрочки.",
				details: parsed.error.issues,
			});
		}
		const filter = parsed.data;

		const contractsList = await withTenantCtx(orgId, async (tx) => {
			const conditions = [eq(installmentContracts.organizationId, orgId)];
			if (filter.patientId) {
				conditions.push(eq(installmentContracts.patientId, filter.patientId));
			}
			if (filter.status) {
				conditions.push(eq(installmentContracts.status, filter.status));
			}

			return tx
				.select({
					contract: installmentContracts,
					patientName: patients.fullName,
					patientPhone: patients.phone,
				})
				.from(installmentContracts)
				.innerJoin(patients, eq(patients.id, installmentContracts.patientId))
				.where(and(...conditions))
				.orderBy(desc(installmentContracts.createdAt));
		});

		return reply.send({ data: contractsList, total: contractsList.length });
	};

	app.get("/api/installments", handleGetContracts);
	app.get("/api/installments/contracts", handleGetContracts);

	app.get(
		"/api/installments/:id",
		async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "installment contract read");
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const paramsParsed = z
				.object({ id: z.string().uuid("Идентификатор договора рассрочки должен быть корректным UUID") })
				.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор договора рассрочки.",
					details: paramsParsed.error.issues,
				});
			}
			const { id } = paramsParsed.data;

			const result = await withTenantCtx(orgId, async (tx) => {
				const [contract] = await tx
					.select({
						contract: installmentContracts,
						patientName: patients.fullName,
						patientPhone: patients.phone,
					})
					.from(installmentContracts)
					.innerJoin(patients, eq(patients.id, installmentContracts.patientId))
					.where(and(eq(installmentContracts.id, id), eq(installmentContracts.organizationId, orgId)))
					.limit(1);

				if (!contract) return null;

				const tranches = await tx
					.select()
					.from(installmentTranches)
					.where(
						and(
							eq(installmentTranches.contractId, contract.contract.id),
							eq(installmentTranches.organizationId, orgId),
						),
					)
					.orderBy(installmentTranches.trancheNumber);

				return {
					...contract,
					tranches,
				};
			});

			if (!result) {
				return reply.code(404).send({
					error: "InstallmentNotFound",
					message: "Договор рассрочки не найден.",
				});
			}

			return reply.send({ data: result });
		},
	);
}
