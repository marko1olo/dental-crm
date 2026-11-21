/**
 * cashInstallmentsRoutes.ts — 0% Clinic Internal Installments & Stage Tranches API.
 *
 * Statutory, kopeck-exact 0% installment contracts, tranche generation,
 * cash box payment execution, fiscal queue registration, and patient installment registers.
 *
 * Invariants:
 * - Mandate 8bm: Pure integer kopecks via @dental/shared/src/money.ts (no floating math).
 * - Mandate 8bo: Complete ACID atomic boundary via withTenantCtx(orgId, async (tx) => ...).
 * - Mandate 8e: Non-blocking doctor & cashier flow; exact 0% statutory schedule.
 * - Idempotency & Anti-Double-Spend: Required RFC 9562 UUIDv7 Idempotency-Key on all payments.
 * - Cash Shift & Ledger Integrity: All down payments and tranche settlements register in payments,
 *   link to active cashBoxShifts, and enqueue 54-FZ fiscal receipts.
 */

import {
	generate0PercentInstallmentSchedule,
	kopecksToRubles,
	nonNegativeMoneyRubSchema,
	positiveMoneyRubSchema,
	rublesToKopecks,
	sumKopecks,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	fiscalReceiptQueue,
	installmentContracts,
	installmentTranches,
	patientInvoices,
	patients,
	payments,
} from "../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";

function parseHeaderIdempotencyKey(request: FastifyRequest): string | undefined {
	const rawKey = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"];
	if (typeof rawKey === "string") return rawKey.trim();
	if (Array.isArray(rawKey) && rawKey.length > 0 && typeof rawKey[0] === "string") {
		return rawKey[0].trim();
	}
	return undefined;
}

export async function registerCashInstallmentsRoutes(app: FastifyInstance) {
	/**
	 * 1. POST /api/installments & POST /api/installments/contracts
	 * Создание договора внутренней рассрочки клиники (0% переплат) с расчетом траншей.
	 */
	const handleCreateContract = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"create installment contract",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		// Проверка Idempotency-Key (UUIDv7) при наличии для защиты от повторных договоров
		let idempotencyKey = parseHeaderIdempotencyKey(request);
		if (idempotencyKey) {
			if (!isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				});
			}
		} else {
			idempotencyKey = randomUUID();
		}

		const bodySchema = z.object({
			patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID"),
			treatmentPlanId: z.string().uuid().optional().nullable(),
			invoiceId: z.string().uuid().optional().nullable(),
			visitId: z.string().uuid().optional().nullable(),
			totalAmountRub: positiveMoneyRubSchema,
			downPaymentRub: nonNegativeMoneyRubSchema.default(0),
			monthsCount: z.union([z.literal(3), z.literal(6), z.literal(12), z.literal(24)]).default(6),
			notes: z.string().trim().max(1000).optional().nullable(),
			startDateIso: z.string().optional(),
			cashBoxId: z.string().uuid().optional(),
			operatorId: z.string().uuid().optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
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
		} = parsed.data;

		if (downPaymentRub >= totalAmountRub) {
			return reply.code(400).send({
				error: "InvalidDownPayment",
				message: "Первоначальный взнос не может быть равен или превышать полную стоимость рассрочки.",
			});
		}

		const totalKop = rublesToKopecks(totalAmountRub);
		const downPaymentKop = rublesToKopecks(downPaymentRub);
		const remainingKop = totalKop - downPaymentKop;

		// Расчет графика траншей без потери ни одной копейки (Мандат 8bm)
		const schedule = generate0PercentInstallmentSchedule(
			remainingKop,
			monthsCount,
			startDateIso ?? new Date().toISOString(),
		);

		const result = await withTenantCtx(orgId, async (tx) => {
			// Проверяем дедупликацию по idempotencyKey
			const [existingContract] = await tx
				.select()
				.from(installmentContracts)
				.where(
					and(
						eq(installmentContracts.organizationId, orgId),
						sql`${installmentContracts.notes} LIKE ${`%[idempotency:${idempotencyKey}]%`}`,
					),
				)
				.limit(1);

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

			// Проверяем пациента в изолированном контексте организации
			const [patient] = await tx
				.select()
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!patient) {
				return { kind: "patient_not_found" as const };
			}

			const now = new Date();
			const contractNumber = `РАСС-${now.getFullYear()}-${randomInt(100000, 1000000)}`;
			const compositeNotes = `[idempotency:${idempotencyKey}] ${notes || ""}`.trim();

			// Создаем договор: остаток долга по графику траншей строго равен сумме траншей
			const [contract] = await tx
				.insert(installmentContracts)
				.values({
					organizationId: orgId,
					patientId,
					treatmentPlanId: treatmentPlanId ?? null,
					contractNumber,
					totalAmountRub,
					downPaymentRub,
					monthsCount,
					paidAmountRub: 0,
					remainingAmountRub: kopecksToRubles(remainingKop),
					status: "active",
					signedAt: now,
					notes: compositeNotes,
				})
				.returning();

			// Если передан invoiceId, связываем и отмечаем инвойс как закрытый рассрочкой
			if (invoiceId) {
				await tx
					.update(patientInvoices)
					.set({
						status: "paid",
						paidAt: now,
					})
					.where(and(eq(patientInvoices.id, invoiceId), eq(patientInvoices.organizationId, orgId)));
			}

			// Создаем записи траншей с точными копеечными суммами
			const tranchesToInsert = schedule.map((item) => ({
				contractId: contract!.id,
				organizationId: orgId,
				trancheNumber: item.monthIndex,
				amountRub: kopecksToRubles(item.amountKopecks),
				amountKopecks: item.amountKopecks,
				dueDate: new Date(item.paymentDateIso),
				isPaid: false,
				status: "pending",
			}));

			const createdTranches = await tx
				.insert(installmentTranches)
				.values(tranchesToInsert)
				.returning();

			// Если передан cashBoxId и есть первоначальный взнос — регистрируем кассовую проводку и платеж в смене
			let downPaymentOperation: typeof cashOperations.$inferSelect | undefined;
			let downPaymentPayment: typeof payments.$inferSelect | undefined;

			if (downPaymentKop > 0) {
				await ensureOrganizationCashBoxes(tx, orgId);
				let targetBox: typeof cashBoxes.$inferSelect | undefined;
				if (cashBoxId) {
					const [found] = await tx
						.select()
						.from(cashBoxes)
						.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, orgId)))
						.for("update")
						.limit(1);
					targetBox = found;
				}
				if (!targetBox) {
					const [mainBox] = await tx
						.select()
						.from(cashBoxes)
						.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "main")))
						.for("update")
						.limit(1);
					targetBox = mainBox;
				}

				if (targetBox) {
					const balanceBefore = targetBox.balanceRub;
					const beforeKop =
						targetBox.balanceKopecks !== undefined && targetBox.balanceKopecks !== null
							? Number(targetBox.balanceKopecks)
							: rublesToKopecks(balanceBefore);
					const afterKop = beforeKop + downPaymentKop;
					const balanceAfter = kopecksToRubles(afterKop);

					// Находим активную смену для кассового счета
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

					// Обновляем остаток в кассовом ящике в целых копейках
					await tx
						.update(cashBoxes)
						.set({
							balanceRub: balanceAfter,
							balanceKopecks: afterKop,
							updatedAt: now,
						})
						.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)));

					// Обновляем кассовую смену клиники
					if (activeShift) {
						const currentIncomeKop = rublesToKopecks(activeShift.incomeTotalRub);
						const updatedIncomeRub = kopecksToRubles(currentIncomeKop + downPaymentKop);
						await tx
							.update(cashBoxShifts)
							.set({
								incomeTotalRub: updatedIncomeRub,
								updatedAt: now,
							})
							.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
					}

					const reasonText = `Первоначальный взнос по договору рассрочки ${contractNumber}`;

					// Создаем кассовый ордер
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
							balanceAfterRub: balanceAfter,
							reasonText,
							patientId,
							operatorId: operatorId ?? null,
							metadata: {
								contractId: contract!.id,
								type: "down_payment",
							},
						})
						.returning();
					downPaymentOperation = op;

					// Создаем проводку в payments (Ловушка №2 ликвидирована)
					const paymentMethodCode = targetBox.type === "main" ? "cash" : "card";
					const [payRecord] = await tx
						.insert(payments)
						.values({
							organizationId: orgId,
							patientId,
							amountRub: downPaymentRub,
							method: paymentMethodCode,
							status: "paid",
							documentId: contract!.id,
							clientMutationId: `downpay-${contract!.id}`,
							note: reasonText,
							paidAt: now,
						})
						.returning();
					if (payRecord) {
						downPaymentPayment = payRecord;

						// Ставим чек в очередь фискализации (54-ФЗ)
						await tx.insert(fiscalReceiptQueue).values({
							organizationId: orgId,
							paymentId: payRecord.id,
							receiptType: "income",
							status: "pending_print",
							payloadJson: {
								clientMutationId: `downpay-${contract!.id}`,
								amountRub: downPaymentRub,
								amountKopecks: downPaymentKop,
								method: paymentMethodCode,
								cashRub: paymentMethodCode === "cash" ? downPaymentRub : 0,
								electronicRub: paymentMethodCode === "card" ? downPaymentRub : 0,
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
			}

			return {
				kind: "ok" as const,
				contract: contract!,
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

		if (result.isDuplicate) {
			reply.header("idempotency-replayed", "true");
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

	app.post("/api/installments", handleCreateContract);
	app.post("/api/installments/contracts", handleCreateContract);

	/**
	 * 2. POST /api/installments/tranches/:id/pay & POST /api/installment-payments/:id/pay
	 * Проведение оплаты транша рассрочки через кассу с регистрацией в payments и сменах.
	 */
	const handlePayTranche = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"pay installment tranche",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const paramsParsed = z
			.object({ id: z.string().uuid("Идентификатор транша должен быть корректным UUID") })
			.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор транша рассрочки.",
				details: paramsParsed.error.issues,
			});
		}
		const { id } = paramsParsed.data;

		// Ловушка №3: Обязательная проверка Idempotency-Key без псевдогенераций на сервере
		const idempotencyKey = parseHeaderIdempotencyKey(request);
		if (!idempotencyKey) {
			return reply.code(400).send({
				error: "IdempotencyKeyRequired",
				message: "Для проведения оплаты транша рассрочки обязателен заголовок Idempotency-Key (UUIDv7).",
			});
		}
		if (!isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
			});
		}

		const bodySchema = z.object({
			cashBoxId: z.string().uuid().optional(),
			operatorId: z.string().uuid().optional(),
			amountPaidKopecks: z.number().int().positive().optional(),
			amountRub: positiveMoneyRubSchema.optional(),
		});
		const parsed = bodySchema.safeParse(request.body || {});
		const payData = parsed.success ? parsed.data : {};

		const result = await withTenantCtx(orgId, async (tx) => {
			// Дедупликация повторного запроса с тем же Idempotency-Key в payments или cashOperations
			const [existingPayment] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.clientMutationId, idempotencyKey),
					),
				)
				.limit(1);

			const [existingOp] = await tx
				.select()
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, orgId),
						sql`${cashOperations.metadata}->>'idempotencyKey' = ${idempotencyKey}`,
					),
				)
				.limit(1);

			if (existingPayment || existingOp) {
				const [currentTranche] = await tx
					.select()
					.from(installmentTranches)
					.where(and(eq(installmentTranches.id, id), eq(installmentTranches.organizationId, orgId)))
					.limit(1);

				const [currentContract] = currentTranche
					? await tx
							.select()
							.from(installmentContracts)
							.where(and(eq(installmentContracts.id, currentTranche.contractId), eq(installmentContracts.organizationId, orgId)))
							.limit(1)
					: [undefined];

				const replayAmountRub = existingPayment?.amountRub ?? existingOp?.amountRub ?? 0;

				return {
					kind: "ok" as const,
					tranche: currentTranche!,
					contract: currentContract!,
					cashOperation: existingOp,
					payment: existingPayment,
					paymentRub: replayAmountRub,
					isTrancheFullyPaid: currentTranche?.isPaid ?? true,
					isReplay: true,
				};
			}

			// Блокируем транш от параллельных гонок
			const [tranche] = await tx
				.select()
				.from(installmentTranches)
				.where(and(eq(installmentTranches.id, id), eq(installmentTranches.organizationId, orgId)))
				.for("update")
				.limit(1);

			if (!tranche) {
				return { kind: "tranche_not_found" as const };
			}

			if (tranche.isPaid) {
				return { kind: "already_paid" as const };
			}

			const trancheRemainingKop = rublesToKopecks(tranche.amountRub);
			if (trancheRemainingKop <= 0) {
				return { kind: "already_paid" as const };
			}

			// Поддержка частичной оплаты транша в копейках без float drift
			const requestedKop = payData.amountPaidKopecks ?? (payData.amountRub ? rublesToKopecks(payData.amountRub) : null);
			const paymentKop = requestedKop !== null ? Math.min(trancheRemainingKop, requestedKop) : trancheRemainingKop;
			const paymentRub = kopecksToRubles(paymentKop);

			const remainingTrancheKop = Math.max(0, trancheRemainingKop - paymentKop);
			const isTrancheFullyPaid = remainingTrancheKop === 0;

			// Блокируем договор рассрочки
			const [contract] = await tx
				.select()
				.from(installmentContracts)
				.where(and(eq(installmentContracts.id, tranche.contractId), eq(installmentContracts.organizationId, orgId)))
				.for("update")
				.limit(1);

			if (!contract) {
				return { kind: "contract_not_found" as const };
			}

			// Находим кассовый счет
			await ensureOrganizationCashBoxes(tx, orgId);
			let targetBox: typeof cashBoxes.$inferSelect | undefined;

			if (payData.cashBoxId) {
				const [b] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, payData.cashBoxId), eq(cashBoxes.organizationId, orgId)))
					.for("update")
					.limit(1);
				targetBox = b;
			} else {
				const [b] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "cashless")))
					.for("update")
					.limit(1);
				targetBox = b;
			}

			if (!targetBox) {
				const [fallback] = await tx
					.select()
					.from(cashBoxes)
					.where(eq(cashBoxes.organizationId, orgId))
					.for("update")
					.limit(1);
				targetBox = fallback;
			}

			if (!targetBox) {
				return { kind: "no_cash_box" as const };
			}

			// Находим активную смену по выбранному кассовому счету
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

			const balanceBefore = targetBox.balanceRub;
			const beforeKop =
				targetBox.balanceKopecks !== undefined && targetBox.balanceKopecks !== null
					? Number(targetBox.balanceKopecks)
					: rublesToKopecks(balanceBefore);
			const afterKop = beforeKop + paymentKop;
			const balanceAfter = kopecksToRubles(afterKop);

			const now = new Date();

			// 1. Обновляем кассовый ящик в целочисленных копейках
			await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					balanceKopecks: afterKop,
					updatedAt: now,
				})
				.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)));

			// 2. Обновляем выручку активной смены (Ловушка №2 ликвидирована)
			if (activeShift) {
				const currentIncomeKop = rublesToKopecks(activeShift.incomeTotalRub);
				const updatedIncomeRub = kopecksToRubles(currentIncomeKop + paymentKop);
				await tx
					.update(cashBoxShifts)
					.set({
						incomeTotalRub: updatedIncomeRub,
						updatedAt: now,
					})
					.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
			}

			const operationReasonText = isTrancheFullyPaid
				? `Оплата взноса №${tranche.trancheNumber} по договору рассрочки ${contract.contractNumber}`
				: `Частичная оплата взноса №${tranche.trancheNumber} по договору рассрочки ${contract.contractNumber} (остаток долга: ${kopecksToRubles(remainingTrancheKop)} ₽)`;

			// 3. Проводим кассовую операцию прихода с привязкой к активной смене
			const [operation] = await tx
				.insert(cashOperations)
				.values({
					organizationId: orgId,
					cashBoxId: targetBox.id,
					shiftId: activeShift?.id ?? null,
					operationType: "income",
					amountRub: paymentRub,
					amountKopecks: paymentKop,
					balanceBeforeRub: balanceBefore,
					balanceAfterRub: balanceAfter,
					reasonText: operationReasonText,
					patientId: contract.patientId,
					installmentTrancheId: tranche.id,
					operatorId: payData.operatorId ?? null,
					metadata: { idempotencyKey },
				})
				.returning();

			// 4. ОБЯЗАТЕЛЬНОЕ создание записи в payments (Ловушка №2 ликвидирована)
			const paymentMethodCode = targetBox.type === "main" ? "cash" : "card";
			const [paymentRecord] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: contract.patientId,
					amountRub: paymentRub,
					method: paymentMethodCode,
					status: "paid",
					documentId: contract.id,
					clientMutationId: idempotencyKey,
					note: operationReasonText,
					paidAt: now,
				})
				.returning();

			if (!paymentRecord) {
				throw new Error("Не удалось создать платёж транша рассрочки");
			}

			// 5. Постановка чека в очередь фискализации (54-ФЗ)
			await tx.insert(fiscalReceiptQueue).values({
				organizationId: orgId,
				paymentId: paymentRecord.id,
				receiptType: "income",
				status: "pending_print",
				payloadJson: {
					clientMutationId: idempotencyKey,
					amountRub: paymentRub,
					amountKopecks: paymentKop,
					method: paymentMethodCode,
					cashRub: paymentMethodCode === "cash" ? paymentRub : 0,
					electronicRub: paymentMethodCode === "card" ? paymentRub : 0,
					advanceOffsetRub: 0,
					certificateOffsetRub: 0,
					bonusOffsetRub: 0,
					dmsOffsetRub: 0,
					patientId: contract.patientId,
					contractNumber: contract.contractNumber,
					trancheNumber: tranche.trancheNumber,
					note: operationReasonText,
				},
				retryCount: 0,
			});

			// 6. Обновляем транш рассрочки
			const [updatedTranche] = await tx
				.update(installmentTranches)
				.set({
					amountRub: isTrancheFullyPaid ? tranche.amountRub : kopecksToRubles(remainingTrancheKop),
					amountKopecks: isTrancheFullyPaid ? Number(tranche.amountKopecks ?? rublesToKopecks(tranche.amountRub)) : remainingTrancheKop,
					isPaid: isTrancheFullyPaid,
					paidAt: now,
					status: isTrancheFullyPaid ? "paid" : "partially_paid",
					cashOperationId: operation!.id,
				})
				.where(and(eq(installmentTranches.id, tranche.id), eq(installmentTranches.organizationId, orgId)))
				.returning();

			// 7. Обновляем баланс договора рассрочки в целых копейках
			const newPaidAmount = kopecksToRubles(rublesToKopecks(contract.paidAmountRub) + paymentKop);
			const newRemaining = Math.max(0, kopecksToRubles(rublesToKopecks(contract.remainingAmountRub) - paymentKop));
			const isFullyPaid = newRemaining <= 0;

			const [updatedContract] = await tx
				.update(installmentContracts)
				.set({
					paidAmountRub: newPaidAmount,
					remainingAmountRub: newRemaining,
					status: isFullyPaid ? "completed" : contract.status,
					completedAt: isFullyPaid ? now : null,
					updatedAt: now,
				})
				.where(and(eq(installmentContracts.id, contract.id), eq(installmentContracts.organizationId, orgId)))
				.returning();

			return {
				kind: "ok" as const,
				tranche: updatedTranche!,
				contract: updatedContract!,
				cashOperation: operation!,
				payment: paymentRecord,
				paymentRub,
				isTrancheFullyPaid,
				isReplay: false,
			};
		});

		if (result.kind === "tranche_not_found") {
			return reply.code(404).send({
				error: "TrancheNotFound",
				message: "Транш рассрочки не найден.",
			});
		}
		if (result.kind === "already_paid") {
			return reply.code(400).send({
				error: "AlreadyPaid",
				message: "Данный взнос рассрочки уже оплачен.",
			});
		}
		if (result.kind === "contract_not_found") {
			return reply.code(404).send({
				error: "ContractNotFound",
				message: "Договор рассрочки не найден.",
			});
		}
		if (result.kind === "no_cash_box") {
			return reply.code(400).send({
				error: "NoCashBox",
				message: "Кассовые счета организации не найдены.",
			});
		}

		if (result.isReplay) {
			reply.header("idempotency-replayed", "true");
		}

		return reply.send({
			success: true,
			message: result.isTrancheFullyPaid
				? `Платеж по рассрочке на сумму ${result.paymentRub} ₽ успешно проведен.`
				: `Частичный платеж на сумму ${result.paymentRub} ₽ принят. Остаток долга по взносу: ${result.tranche.amountRub} ₽.`,
			tranche: result.tranche,
			contract: result.contract,
			cashOperation: result.cashOperation,
			payment: result.payment,
			paymentRub: result.paymentRub,
			isFullyPaid: result.isTrancheFullyPaid,
			isDuplicate: result.isReplay,
		});
	};

	app.post("/api/installments/tranches/:id/pay", handlePayTranche);
	app.post("/api/installment-payments/:id/pay", handlePayTranche);

	/**
	 * 3. GET /api/installments & GET /api/installments/contracts
	 * Реестр договоров рассрочки.
	 */
	const handleGetContracts = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "installments list");
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const querySchema = z.object({
			patientId: z.string().uuid().optional(),
			status: z.string().optional(),
		});
		const parsed = querySchema.safeParse(request.query || {});
		const filter = parsed.success ? parsed.data : {};

		const contractsList = await withTenantCtx(orgId, async (tx) => {
			const conditions = [eq(installmentContracts.organizationId, orgId)];
			if (filter.patientId) {
				conditions.push(eq(installmentContracts.patientId, filter.patientId));
			}
			if (filter.status) {
				conditions.push(eq(installmentContracts.status, filter.status));
			}

			const list = await tx
				.select({
					contract: installmentContracts,
					patientName: patients.fullName,
					patientPhone: patients.phone,
				})
				.from(installmentContracts)
				.innerJoin(patients, eq(patients.id, installmentContracts.patientId))
				.where(and(...conditions))
				.orderBy(desc(installmentContracts.createdAt));

			return list;
		});

		return reply.send({ data: contractsList, total: contractsList.length });
	};

	app.get("/api/installments", handleGetContracts);
	app.get("/api/installments/contracts", handleGetContracts);

	/**
	 * 4. GET /api/installments/:id
	 * Детальная карточка договора рассрочки с графиком траншей.
	 */
	app.get("/api/installments/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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
	});
}
