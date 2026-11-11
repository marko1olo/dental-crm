/**
 * apps/api/src/routes/cashbox/cashboxPaymentProcessor.ts
 *
 * Dedicated Cashbox Payment Transaction Processor (54-FZ & Clinical Autonomy).
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (100% warranty discounts, no hard blocks).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Integer Kopeck Math: Strict integer kopecks (amountKopecks: bigint).
 * - Idempotency & Financial Resilience: clientMutationId & idempotencyKey.
 */

import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { kopecksToRub, normalizePaymentMethod, rubToKopecks } from "@dental/shared";
import { withTenantCtx } from "../../db/rls.js";
import {
	advanceDepositTaggings,
	cashBoxes,
	cashOperations,
	familyGroups,
	fiscalReceiptQueue,
	patientInvoices,
	payments,
	patients,
	treatmentItems,
	visits,
} from "../../db/schema.js";
import { buildPatientLedger, clinicOwesPatientKopecks } from "../../money/patientDebt.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";
import { normalizePatientAdministrativeProfile } from "../../utils/patientAdministrativeProfile.js";
import { cashboxPaymentRequestSchema } from "./cashboxSchemas.js";

export type CashboxPaymentOutcome =
	| {
			statusCode: 200;
			body: {
				success: true;
				data: Record<string, unknown>;
			};
	  }
	| {
			statusCode: 400;
			body: {
				error: string;
				message: string;
				details?: unknown;
			};
	  }
	| {
			statusCode: 404;
			body: {
				error: string;
				message: string;
				invoiceId?: string;
			};
	  }
	| {
			statusCode: 409;
			body: {
				error: string;
				message: string;
				invoiceId?: string;
			};
	  };

export async function processCashboxPayment(
	orgId: string,
	rawBody: unknown,
	headerIdemp?: string,
): Promise<CashboxPaymentOutcome> {
	const parsed = cashboxPaymentRequestSchema.safeParse(rawBody || {});
	if (!parsed.success) {
		return {
			statusCode: 400,
			body: {
				error: "ValidationError",
				message: "Некорректные параметры платежа",
				details: parsed.error.issues,
			},
		};
	}

	const body = parsed.data;
	const effectiveMutationId =
		body.clientMutationId?.trim() ||
		body.idempotencyKey?.trim() ||
		headerIdemp?.trim() ||
		`cbx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	// Честная сумма: платеж без суммы невозможен, за исключением 100% гарантии врача (Мандаты 8e п. 7, 8n).
	// Гарантийный расчёт оформляется закрытием счёта без фискального чека.
	const isWarrantyPayment =
		body.method === "warranty" ||
		body.isWarranty === true ||
		Boolean(
			body.note &&
				/(гаранти|передел|скидк.*100|100%|безвозмездн|warranty)/i.test(body.note),
		);

	let totalKopecks = 0n;
	if (body.amountKopecks !== undefined) {
		totalKopecks = BigInt(body.amountKopecks);
	} else if (body.amountRub !== undefined) {
		totalKopecks = BigInt(Math.round(body.amountRub * 100));
	}
	if (totalKopecks <= 0n && !isWarrantyPayment) {
		return {
			statusCode: 400,
			body: {
				error: "ZeroAmountPayment",
				message:
					"Сумма платежа обязана быть больше нуля. Для гарантийной переделки со скидкой 100% укажите метод «warranty» или передайте флаг isWarranty.",
			},
		};
	}
	if (isWarrantyPayment && totalKopecks <= 0n) {
		totalKopecks = 0n;
	}

	// [FIN-05] Вычисление требуемой суммы списания с депозита
	let requiredDepositKopecks = 0n;
	if (body.method === "deposit" || body.method === "family_wallet") {
		requiredDepositKopecks = totalKopecks;
	} else if (body.depositAmountKopecks !== undefined && body.depositAmountKopecks > 0) {
		requiredDepositKopecks = BigInt(body.depositAmountKopecks);
	}

	// Честная атрибуция: при розничной продаже (Walk-In payment) по ст. 1.2 и 4.7 54-ФЗ
	// кассовый чек для физлица не требует обязательного заведения карты пациента или ИНН.
	if (!body.patientId && requiredDepositKopecks > 0n && !isWarrantyPayment) {
		return {
			statusCode: 400,
			body: {
				error: "DepositRequiresPatient",
				message:
					"Списание с депозита или семейного баланса возможно только для зарегистрированного пациента.",
			},
		};
	}
	const requestedPatientId: string | undefined = body.patientId ?? undefined;
	const amountRubNumber = Number(totalKopecks) / 100;

	const result = await withTenantCtx(orgId, async (tx) => {
		// ACID pg_advisory_xact_lock на clientMutationId для защиты от состояния гонки
		if (effectiveMutationId) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cashbox_payment:' || ${effectiveMutationId}))`,
			);
		}

		// Проверка идемпотентности
		const [existingPayment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					eq(payments.clientMutationId, effectiveMutationId),
				),
			)
			.limit(1);

		if (existingPayment) {
			return {
				id: existingPayment.id,
				amountKopecks: Math.round(Number(existingPayment.amountRub) * 100),
				amountRub: Number(existingPayment.amountRub),
				method: existingPayment.method,
				status: existingPayment.status,
				fiscalReceiptNumber: existingPayment.fiscalReceiptNumber,
				clientMutationId: existingPayment.clientMutationId,
				isReplay: true,
			};
		}

		// Проверка существования пациента или обеспечение системного розничного покупателя (54-ФЗ ст. 1.2, 4.7)
		let resolvedPatientId = "";
		let patientName = "Розничный покупатель";
		let patientRow: { id: string; fullName: string | null; familyGroupId: string | null } | null = null;

		if (requestedPatientId) {
			const [found] = await tx
				.select({
					id: patients.id,
					fullName: patients.fullName,
					familyGroupId: patients.familyGroupId,
				})
				.from(patients)
				.where(and(eq(patients.id, requestedPatientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!found) {
				return {
					kind: "patient_not_found" as const,
				};
			}
			patientRow = found;
			resolvedPatientId = found.id;
			patientName = found.fullName || "Пациент клиники";
		} else {
			// Розничная продажа / свободный чек (Walk-In payment) по ст. 1.2 и 4.7 54-ФЗ.
			// По закону кассовый чек для физлица при розничной продаже не требует ФИО/ИНН.
			// Обеспечиваем системную запись покупателя для внешнего ключа payments.patientId.
			const [existingRetail] = await tx
				.select({
					id: patients.id,
					fullName: patients.fullName,
					familyGroupId: patients.familyGroupId,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, orgId),
						eq(patients.fullName, "Розничный покупатель"),
					),
				)
				.limit(1);

			if (existingRetail) {
				resolvedPatientId = existingRetail.id;
				patientName = existingRetail.fullName || "Розничный покупатель";
				patientRow = existingRetail;
			} else {
				const [createdRetail] = await tx
					.insert(patients)
					.values({
						organizationId: orgId,
						fullName: "Розничный покупатель",
						notes: "Системная запись для свободных кассовых чеков и розничных продаж (54-ФЗ ст. 1.2, 4.7)",
						administrativeProfile: normalizePatientAdministrativeProfile({ isAnonymous: true }),
					})
					.returning({ id: patients.id, fullName: patients.fullName, familyGroupId: patients.familyGroupId });
				resolvedPatientId = createdRetail?.id ?? "";
				patientName = createdRetail?.fullName || "Розничный покупатель";
				patientRow = createdRetail ?? null;
			}
		}

		// [FIN-05] Проверка и блокировка несанкционированного списания с несуществующего депозита
		let lockedFamilyGroup: typeof familyGroups.$inferSelect | null = null;
		let advanceRows: (typeof advanceDepositTaggings.$inferSelect)[] = [];
		let familyBalanceKop = 0n;

		if (requiredDepositKopecks > 0n && !isWarrantyPayment && patientRow) {
			// 1. Поиск и блокировка семейного баланса familyGroups
			let targetFamilyGroupId = patientRow.familyGroupId || null;
			if (!targetFamilyGroupId) {
				const [headFamily] = await tx
					.select({ id: familyGroups.id })
					.from(familyGroups)
					.where(
						and(
							eq(familyGroups.headPatientId, resolvedPatientId),
							eq(familyGroups.organizationId, orgId),
						),
					)
					.limit(1);
				if (headFamily) {
					targetFamilyGroupId = headFamily.id;
				}
			}

			if (targetFamilyGroupId) {
				const [fg] = await tx
					.select()
					.from(familyGroups)
					.where(
						and(
							eq(familyGroups.id, targetFamilyGroupId),
							eq(familyGroups.organizationId, orgId),
						),
					)
					.for("update")
					.limit(1);
				lockedFamilyGroup = fg ?? null;
			}
			familyBalanceKop = lockedFamilyGroup
				? BigInt(rubToKopecks(Number(lockedFamilyGroup.balance || 0)))
				: 0n;

			// 2. Поиск и блокировка целевых авансов advanceDepositTaggings (реляционная привязка по patientId с fallback по patientName)
			advanceRows = await tx
				.select()
				.from(advanceDepositTaggings)
				.where(
					and(
						eq(advanceDepositTaggings.organizationId, orgId),
						or(
							eq(advanceDepositTaggings.patientId, resolvedPatientId),
							and(
								isNull(advanceDepositTaggings.patientId),
								eq(advanceDepositTaggings.patientName, patientRow.fullName || ""),
							),
						),
						inArray(advanceDepositTaggings.allocationStatus, [
							"unallocated",
							"pinned",
							"active",
						]),
					),
				)
				.for("update");

			let advanceTotalKop = 0n;
			for (const adv of advanceRows) {
				advanceTotalKop += BigInt(rubToKopecks(Number(adv.depositAmountRub || 0)));
			}

			// 3. Расчёт фактического сальдо лицевого счета (переплата / авансы по леджеру)
			const [patientCharges, patientPayments] = await Promise.all([
				tx
					.select({
						patientId: treatmentItems.patientId,
						status: treatmentItems.status,
						unitPriceRub: treatmentItems.unitPriceRub,
						quantity: treatmentItems.quantity,
						discountRub: treatmentItems.discountRub,
					})
					.from(treatmentItems)
					.where(
						and(
							eq(treatmentItems.organizationId, orgId),
							eq(treatmentItems.patientId, resolvedPatientId),
						),
					),
				tx
					.select({
						patientId: payments.patientId,
						status: payments.status,
						amountRub: payments.amountRub,
					})
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.patientId, resolvedPatientId),
						),
					),
			]);
			const ledger = buildPatientLedger(
				resolvedPatientId,
				patientCharges,
				patientPayments,
				{
					organizationId: orgId,
				},
			);
			const ledgerOverpaidKop = BigInt(clinicOwesPatientKopecks(ledger));

			const personalAvailableKop =
				advanceTotalKop > ledgerOverpaidKop ? advanceTotalKop : ledgerOverpaidKop;
			const totalAvailableDepositKop = personalAvailableKop + familyBalanceKop;

			if (totalAvailableDepositKop < requiredDepositKopecks) {
				const availableRub = (Number(totalAvailableDepositKop) / 100).toFixed(2);
				const requiredRub = (Number(requiredDepositKopecks) / 100).toFixed(2);
				return {
					kind: "insufficient_deposit" as const,
					availableRub,
					requiredRub,
				};
			}

			// Списание с депозита: сначала с размеченных авансов
			let remainingToDeductKop = requiredDepositKopecks;
			for (const adv of advanceRows) {
				if (remainingToDeductKop <= 0n) break;
				const advKop = BigInt(rubToKopecks(Number(adv.depositAmountRub || 0)));
				if (advKop <= remainingToDeductKop) {
					remainingToDeductKop -= advKop;
					await tx
						.update(advanceDepositTaggings)
						.set({ allocationStatus: "spent" })
						.where(eq(advanceDepositTaggings.id, adv.id));
				} else {
					const nextAdvKop = advKop - remainingToDeductKop;
					remainingToDeductKop = 0n;
					await tx
						.update(advanceDepositTaggings)
						.set({ depositAmountRub: (Number(nextAdvKop) / 100).toFixed(2) })
						.where(eq(advanceDepositTaggings.id, adv.id));
				}
			}

			// Если осталась сумма для списания, списываем из семейного баланса familyGroups
			if (remainingToDeductKop > 0n && lockedFamilyGroup) {
				const deductFromFamilyKop =
					remainingToDeductKop <= familyBalanceKop
						? remainingToDeductKop
						: familyBalanceKop;
				const newFamilyBalKop = familyBalanceKop - deductFromFamilyKop;
				remainingToDeductKop -= deductFromFamilyKop;
				await tx
					.update(familyGroups)
					.set({
						balance: (Number(newFamilyBalKop) / 100).toFixed(2),
						updatedAt: new Date(),
					})
					.where(eq(familyGroups.id, lockedFamilyGroup.id));
			}
		}

		// [FIN-02] Пессимистическая блокировка инвойса от двойной оплаты и связывание с приёмом
		let effectiveVisitId = body.visitId || null;
		let lockedInvoice: typeof patientInvoices.$inferSelect | null = null;
		if (body.invoiceId) {
			const [inv] = await tx
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.id, body.invoiceId),
						eq(patientInvoices.organizationId, orgId),
					),
				)
				.for("update")
				.limit(1);

			if (!inv) {
				return { kind: "invoice_not_found" as const, invoiceId: body.invoiceId };
			}
			if (inv.status === "paid" || inv.status === "paid_warranty") {
				return {
					kind: "invoice_already_paid" as const,
					invoiceId: inv.id,
					status: inv.status,
				};
			}
			lockedInvoice = inv;
			if (!effectiveVisitId && inv.visitId) {
				effectiveVisitId = inv.visitId;
			}
		}

		if (!effectiveVisitId && resolvedPatientId) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const [latestVisit] = await tx
				.select({ id: visits.id })
				.from(visits)
				.where(
					and(
						eq(visits.patientId, resolvedPatientId),
						eq(visits.organizationId, orgId),
						gte(visits.createdAt, today),
					),
				)
				.orderBy(desc(visits.createdAt))
				.limit(1);
			if (latestVisit?.id) {
				effectiveVisitId = latestVisit.id;
			}
		}

		// Генерируем номер кассового чека (при гарантии 100% чек не пробивается)
		const receiptNumber = isWarrantyPayment ? null : `ФД-${Date.now().toString().slice(-6)}`;
		const issuedAt = isWarrantyPayment ? null : new Date().toISOString();

		// 1. Фиксация платежа в таблице payments с обязательным visitId и documentId
		const [newPayment] = await tx
			.insert(payments)
			.values({
				organizationId: orgId,
				patientId: resolvedPatientId,
				visitId: effectiveVisitId,
				documentId: body.invoiceId || null,
				clientMutationId: effectiveMutationId,
				amountRub: amountRubNumber,
				method: normalizePaymentMethod(body.method),
				status: "paid",
				paidAt: new Date(),
				fiscalReceiptNumber: receiptNumber,
				fiscalReceiptIssuedAt: issuedAt,
				payerFullName: body.cashierFullName || "Кассир",
				note:
					body.note ||
					(isWarrantyPayment
						? "Гарантийный расчёт (скидка 100%)"
						: `Оплата через кассу (${body.method || "card"})`),
			})
			.returning();

		if (!newPayment) {
			throw new Error("Не удалось зафиксировать платёж в базе данных");
		}

		// 2. Списание счетов и визита в статус paid_warranty при гарантийном закрытии
		if (isWarrantyPayment) {
			if (body.invoiceId) {
				await tx
					.update(patientInvoices)
					.set({
						status: "paid_warranty",
						paidAt: new Date(),
					})
					.where(
						and(
							eq(patientInvoices.id, body.invoiceId),
							eq(patientInvoices.organizationId, orgId),
						),
					);
			}
			if (effectiveVisitId) {
				await tx
					.update(patientInvoices)
					.set({
						status: "paid_warranty",
						paidAt: new Date(),
					})
					.where(
						and(
							eq(patientInvoices.visitId, effectiveVisitId),
							eq(patientInvoices.organizationId, orgId),
						),
					);

				await tx
					.update(visits)
					.set({ updatedAt: new Date() })
					.where(and(eq(visits.id, effectiveVisitId), eq(visits.organizationId, orgId)));
			}

			return {
				id: newPayment.id,
				amountKopecks: 0,
				amountRub: 0,
				method: "warranty",
				status: "paid_warranty",
				isWarranty: true,
				fiscalReceiptNumber: null,
				clientMutationId: effectiveMutationId,
				note: newPayment.note,
			};
		}

		// Если передан invoiceId или visitId для обычного платежа — закрываем счёт со статусом paid
		if (body.invoiceId) {
			await tx
				.update(patientInvoices)
				.set({
					status: "paid",
					paidAt: new Date(),
				})
				.where(
					and(
						eq(patientInvoices.id, body.invoiceId),
						eq(patientInvoices.organizationId, orgId),
					),
				);
		}
		if (effectiveVisitId) {
			await tx
				.update(patientInvoices)
				.set({
					status: "paid",
					paidAt: new Date(),
				})
				.where(
					and(
						eq(patientInvoices.visitId, effectiveVisitId),
						eq(patientInvoices.organizationId, orgId),
					),
				);

			await tx
				.update(visits)
				.set({ updatedAt: new Date() })
				.where(and(eq(visits.id, effectiveVisitId), eq(visits.organizationId, orgId)));
		}

		// 3. Инициализируем и находим кассовые счета клиники с упорядоченной блокировкой строк
		await ensureOrganizationCashBoxes(tx, orgId);
		const boxes = await tx
			.select()
			.from(cashBoxes)
			.where(eq(cashBoxes.organizationId, orgId))
			.orderBy(cashBoxes.id)
			.for("update");

		const cashDeskBox =
			boxes.find((b) => b.type === "main" || b.type === "cash_desk") ||
			boxes.find((b) => b.isMain && !b.isCashless) ||
			boxes.find((b) => !b.isCashless) ||
			boxes[0];
		const cashlessBox =
			boxes.find((b) => b.type === "cashless" || b.type === "bank_account") ||
			boxes.find((b) => b.isCashless) ||
			boxes[1] ||
			cashDeskBox;

		// 4. Кассовые проводки в cashOperations
		const resolvedCashKop =
			body.cashAmountKopecks ??
			(body.method === "cash" ? Number(totalKopecks) : 0);
		const resolvedElecKop =
			body.electronicAmountKopecks ??
			(["card", "sbp", "online"].includes(body.method || "")
				? Number(totalKopecks)
				: 0);

		if (resolvedCashKop > 0 && cashDeskBox) {
			const curBalKop = rubToKopecks(cashDeskBox.balanceRub || 0);
			const newBalKop = curBalKop + resolvedCashKop;
			const curBal = kopecksToRub(curBalKop);
			const addRub = kopecksToRub(resolvedCashKop);
			const newBal = kopecksToRub(newBalKop);

			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashDeskBox.id,
				operationType: "income",
				amountRub: addRub,
				balanceBeforeRub: curBal,
				balanceAfterRub: newBal,
				patientId: resolvedPatientId,
				kkmDocNumber: receiptNumber,
				reasonText: `Приход наличных в кассу: оплата стоматологических услуг (${receiptNumber})`,
				operatorName: body.cashierFullName || "Кассир",
			});

			await tx
				.update(cashBoxes)
				.set({ balanceRub: newBal, updatedAt: new Date() })
				.where(eq(cashBoxes.id, cashDeskBox.id));
		}

		if (resolvedElecKop > 0 && cashlessBox) {
			const curBalKop = rubToKopecks(cashlessBox.balanceRub || 0);
			const newBalKop = curBalKop + resolvedElecKop;
			const curBal = kopecksToRub(curBalKop);
			const addRub = kopecksToRub(resolvedElecKop);
			const newBal = kopecksToRub(newBalKop);

			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashlessBox.id,
				operationType: "income",
				amountRub: addRub,
				balanceBeforeRub: curBal,
				balanceAfterRub: newBal,
				patientId: resolvedPatientId,
				kkmDocNumber: receiptNumber,
				reasonText: `Безналичное поступление: оплата стоматологических услуг (${receiptNumber})`,
				operatorName: body.cashierFullName || "Кассир",
			});

			await tx
				.update(cashBoxes)
				.set({ balanceRub: newBal, updatedAt: new Date() })
				.where(eq(cashBoxes.id, cashlessBox.id));
		}

		if (requiredDepositKopecks > 0n && cashDeskBox) {
			const depositRub = Number(requiredDepositKopecks) / 100;
			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashDeskBox.id,
				operationType: "income",
				amountRub: depositRub,
				balanceBeforeRub: cashDeskBox.balanceRub || 0,
				balanceAfterRub: cashDeskBox.balanceRub || 0,
				patientId: resolvedPatientId,
				kkmDocNumber: receiptNumber,
				reasonText: `Зачёт аванса/депозита пациента: оплата стоматологических услуг (${receiptNumber || "б/н"})`,
				operatorName: body.cashierFullName || "Кассир",
			});
		}

		// 5. Постановка чека в очередь фискализации (physical KKT printer spooler)
		let enqueuedReceiptId: string | null = null;
		if (!isWarrantyPayment && totalKopecks > 0n) {
			const [enqueued] = await tx
				.insert(fiscalReceiptQueue)
				.values({
					organizationId: orgId,
					paymentId: newPayment.id,
					visitId: effectiveVisitId,
					receiptType: "income",
					status: "pending_print",
					payloadJson: {
						clientMutationId: effectiveMutationId,
						amountRub: amountRubNumber,
						amountKopecks: Number(totalKopecks),
						method: normalizePaymentMethod(body.method),
						cashRub: kopecksToRub(resolvedCashKop),
						electronicRub: kopecksToRub(resolvedElecKop),
						advanceOffsetRub: kopecksToRub(Number(requiredDepositKopecks)),
						fiscalReceiptNumber: receiptNumber,
						patientId: resolvedPatientId,
						patientName: patientRow?.fullName || patientName,
						cashierFullName: body.cashierFullName || "Кассир",
						invoiceId: body.invoiceId || null,
						note: newPayment.note,
					},
					retryCount: 0,
				})
				.returning({ id: fiscalReceiptQueue.id });
			if (enqueued) {
				enqueuedReceiptId = enqueued.id;
			}
		}

		return {
			id: newPayment.id,
			amountKopecks: Number(totalKopecks),
			amountRub: amountRubNumber,
			method: newPayment.method,
			status: "paid",
			fiscalReceiptNumber: receiptNumber,
			fiscalReceiptQueueId: enqueuedReceiptId,
			clientMutationId: effectiveMutationId,
		};
	});

	if ("kind" in result && result.kind === "patient_not_found") {
		return {
			statusCode: 400,
			body: {
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике — платёж не проведён.",
			},
		};
	}

	if ("kind" in result && result.kind === "invoice_not_found") {
		return {
			statusCode: 404,
			body: {
				error: "InvoiceNotFound",
				message: `Счёт с идентификатором ${result.invoiceId} не найден в данной клинике.`,
				invoiceId: result.invoiceId,
			},
		};
	}

	if ("kind" in result && result.kind === "invoice_already_paid") {
		return {
			statusCode: 409,
			body: {
				error: "InvoiceAlreadyPaidConflict",
				message: `Счёт ${result.invoiceId} уже был полностью оплачен. Повторное списание средств отклонено для исключения задвоения чеков.`,
				invoiceId: result.invoiceId,
			},
		};
	}

	if ("kind" in result && result.kind === "insufficient_deposit") {
		return {
			statusCode: 400,
			body: {
				error: "InsufficientDepositBalance",
				message: `Недостаточно средств на депозите пациента. Доступно: ${result.availableRub} ₽, требуется: ${result.requiredRub} ₽`,
			},
		};
	}

	return {
		statusCode: 200,
		body: {
			success: true,
			data: result,
		},
	};
}
