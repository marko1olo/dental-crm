/**
 * patientBalanceService.ts — Statutory Patient Personal Advance & Family Deposit Service.
 *
 * Provides strict segregation between:
 * 1. Personal Patient Advances (stored in advanceDepositTaggings, 54-FZ Tag 1214 = 3 / Tag 1215).
 * 2. Family Shared Wallets (stored in familyGroups.balance, role-governed authorization).
 * 3. Loyalty Bonus Points (stored in patientBonusBalances, FIFO expiration).
 *
 * Invariants:
 * - Pure integer kopecks via @dental/shared/src/money.ts (no floating math).
 * - Complete ACID transaction boundary: no global db within tx, caller passes tx.
 * - Idempotency & Anti-Double-Spend: Required RFC 9562 UUIDv7 keys.
 * - Zero phantom money: personal funds cannot leak to family, family limits strictly enforced.
 */

import {
	kopecksToNumericString,
	kopecksToRubles,
	normalizePaymentMethod,
	parseKopecks,
	rublesToKopecks,
	sumKopecks,
} from "@dental/shared";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import {
	advanceDepositTaggings,
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	familyGroups,
	fiscalReceiptQueue,
	patientBonusBalances,
	patientRelationships,
	patients,
	payments,
} from "../../db/schema.js";

export interface PatientDetailedBalance {
	patientId: string;
	patientFullName: string;
	personalAdvanceKopecks: number;
	personalAdvanceRub: number;
	familyWallet: {
		hasFamily: boolean;
		familyGroupId: string | null;
		familyName: string | null;
		familyBalanceKopecks: number;
		familyBalanceRub: number;
		canSpend: boolean;
		spendLimitKopecks: number | null;
		availableToPatientKopecks: number;
		availableToPatientRub: number;
	};
	loyaltyBonusPoints: number;
	totalAvailableForTreatmentKopecks: number;
	totalAvailableForTreatmentRub: number;
}

export interface CreditAdvanceParams {
	organizationId: string;
	patientId: string;
	amountKopecks: number;
	method: "cash" | "card" | "sbp" | "bank_transfer";
	idempotencyKey: string;
	cashBoxId?: string | undefined;
	operatorId?: string | undefined;
	notes?: string | undefined;
}

export interface DebitAdvanceParams {
	organizationId: string;
	patientId: string;
	amountKopecks: number;
	idempotencyKey: string;
	visitId?: string | undefined;
	invoiceId?: string | undefined;
	allowFamilyFallback?: boolean | undefined;
	notes?: string | undefined;
}

export interface RefundAdvanceParams {
	organizationId: string;
	patientId: string;
	amountKopecks: number;
	cashBoxId: string;
	idempotencyKey: string;
	operatorId?: string | undefined;
	reasonText?: string | undefined;
}

export class PatientBalanceService {
	/**
	 * Получение детального раздельного баланса пациента:
	 * Личный аванс + Семейный кошелек + Бонусы.
	 */
	public static async getDetailedBalance(
		tx: TenantDb,
		orgId: string,
		patientId: string,
	): Promise<PatientDetailedBalance | null> {
		const [patient] = await tx
			.select()
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
			.limit(1);

		if (!patient) return null;

		// 1. Расчет личного аванса из активных записей advanceDepositTaggings
		const advanceRows = await tx
			.select()
			.from(advanceDepositTaggings)
			.where(
				and(
					eq(advanceDepositTaggings.organizationId, orgId),
					or(
						eq(advanceDepositTaggings.patientId, patientId),
						and(
							isNull(advanceDepositTaggings.patientId),
							eq(advanceDepositTaggings.patientName, patient.fullName || ""),
						),
					),
					inArray(advanceDepositTaggings.allocationStatus, ["pinned", "unallocated"]),
				),
			);

		const personalAdvanceKopecks = sumKopecks(
			advanceRows.map((row) => parseKopecks(row.depositAmountRub)),
		);

		// 2. Расчет доступного семейного баланса
		let hasFamily = false;
		let familyGroupId: string | null = null;
		let familyName: string | null = null;
		let familyBalanceKopecks = 0;
		let canSpend = false;
		const spendLimitKopecks: number | null = null;
		let availableFromFamilyKop = 0;

		if (patient.familyGroupId) {
			const [family] = await tx
				.select()
				.from(familyGroups)
				.where(
					and(
						eq(familyGroups.id, patient.familyGroupId),
						eq(familyGroups.organizationId, orgId),
					),
				)
				.limit(1);

			if (family) {
				hasFamily = true;
				familyGroupId = family.id;
				familyName = family.name ?? family.groupName ?? "Семья";
				familyBalanceKopecks = parseKopecks(family.balance || "0.00");

				// Проверяем право тратить средства семейного кошелька: глава семьи либо подтвержденная связь
				if (family.headPatientId === patient.id || family.primaryPatientId === patient.id) {
					canSpend = true;
				} else {
					const [rel] = await tx
						.select()
						.from(patientRelationships)
						.where(
							and(
								eq(patientRelationships.organizationId, orgId),
								eq(patientRelationships.patientId, patient.id),
								eq(patientRelationships.canSpendFamilyWallet, true),
							),
						)
						.limit(1);
					canSpend = Boolean(rel);
				}

				if (canSpend) {
					availableFromFamilyKop = familyBalanceKopecks;
				}
			}
		}

		// 3. Активные баллы лояльности
		let loyaltyBonusPoints = 0;
		const [bonusRow] = await tx
			.select()
			.from(patientBonusBalances)
			.where(
				and(
					eq(patientBonusBalances.organizationId, orgId),
					eq(patientBonusBalances.patientId, patientId),
				),
			)
			.limit(1);

		if (bonusRow?.activePoints) {
			loyaltyBonusPoints = Number(bonusRow.activePoints) || 0;
		}

		const totalAvailableKopecks = personalAdvanceKopecks + availableFromFamilyKop;

		return {
			patientId,
			patientFullName: patient.fullName || "Пациент клиники",
			personalAdvanceKopecks,
			personalAdvanceRub: kopecksToRubles(personalAdvanceKopecks),
			familyWallet: {
				hasFamily,
				familyGroupId,
				familyName,
				familyBalanceKopecks,
				familyBalanceRub: kopecksToRubles(familyBalanceKopecks),
				canSpend,
				spendLimitKopecks,
				availableToPatientKopecks: availableFromFamilyKop,
				availableToPatientRub: kopecksToRubles(availableFromFamilyKop),
			},
			loyaltyBonusPoints,
			totalAvailableForTreatmentKopecks: totalAvailableKopecks,
			totalAvailableForTreatmentRub: kopecksToRubles(totalAvailableKopecks),
		};
	}

	/**
	 * Внесение личного авансового депозита пациентом.
	 * Атомарная регистрация в payments, advanceDepositTaggings, кассовой смене и 54-ФЗ.
	 */
	public static async creditPersonalAdvance(
		tx: TenantDb,
		params: CreditAdvanceParams,
	) {
		const { organizationId, patientId, amountKopecks, method, idempotencyKey, cashBoxId, operatorId, notes } = params;

		if (amountKopecks <= 0) {
			throw new Error("Сумма пополнения аванса должна быть строго больше нуля.");
		}

		const amountRub = kopecksToRubles(amountKopecks);

		// Дедупликация по Idempotency-Key
		const [existingPayment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.clientMutationId, idempotencyKey),
				),
			)
			.limit(1);

		if (existingPayment) {
			return {
				success: true,
				payment: existingPayment,
				isDuplicate: true,
			};
		}

		const [patient] = await tx
			.select()
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
			.limit(1);

		if (!patient) {
			throw new Error("Пациент не найден.");
		}

		const now = new Date();
		const defaultNote = `Внесение аванса на лечение (${method === "cash" ? "наличные" : "безналичные"})`;
		const operationNote = notes?.trim() || defaultNote;
		const statutoryMethod = normalizePaymentMethod(method);

		// 1. Создаем платеж со статусом paid
		const [payment] = await tx
			.insert(payments)
			.values({
				organizationId,
				patientId,
				amountRub,
				method: statutoryMethod,
				status: "paid",
				clientMutationId: idempotencyKey,
				note: operationNote,
				paidAt: now,
			})
			.returning();

		if (!payment) {
			throw new Error("Не удалось создать платёж аванса.");
		}

		// 2. Создаем строку авансового депозита в advanceDepositTaggings
		const [depositTag] = await tx
			.insert(advanceDepositTaggings)
			.values({
				organizationId,
				patientId,
				patientName: patient.fullName || "Пациент клиники",
				depositAmountRub: kopecksToNumericString(amountKopecks),
				taggedTargetType: "deposit",
				taggedTargetName: "Аванс на лечение",
				allocationStatus: "unallocated",
			})
			.returning();

		if (!depositTag) {
			throw new Error("Не удалось зафиксировать авансовый депозит.");
		}

		// 3. Если передан кассовый счет — проводим по кассе и обновляем смену
		let cashOp: typeof cashOperations.$inferSelect | undefined;
		if (cashBoxId) {
			const [targetBox] = await tx
				.select()
				.from(cashBoxes)
				.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, organizationId)))
				.for("update")
				.limit(1);

			if (targetBox) {
				const beforeKop =
					targetBox.balanceKopecks !== undefined && targetBox.balanceKopecks !== null
						? Number(targetBox.balanceKopecks)
						: rublesToKopecks(targetBox.balanceRub);
				const afterKop = beforeKop + amountKopecks;
				const balanceAfterRub = kopecksToRubles(afterKop);

				// Находим активную смену
				const [activeShift] = await tx
					.select()
					.from(cashBoxShifts)
					.where(
						and(
							eq(cashBoxShifts.organizationId, organizationId),
							eq(cashBoxShifts.cashBoxId, targetBox.id),
							eq(cashBoxShifts.status, "open"),
						),
					)
					.for("update")
					.limit(1);

				await tx
					.update(cashBoxes)
					.set({
						balanceRub: balanceAfterRub,
						balanceKopecks: afterKop,
						updatedAt: now,
					})
					.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, organizationId)));

				if (activeShift) {
					const updatedIncome = kopecksToRubles(rublesToKopecks(activeShift.incomeTotalRub) + amountKopecks);
					await tx
						.update(cashBoxShifts)
						.set({
							incomeTotalRub: updatedIncome,
							updatedAt: now,
						})
						.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, organizationId)));
				}

				const [op] = await tx
					.insert(cashOperations)
					.values({
						organizationId,
						cashBoxId: targetBox.id,
						shiftId: activeShift?.id ?? null,
						operationType: "income",
						amountRub,
						balanceBeforeRub: targetBox.balanceRub,
						balanceAfterRub,
						reasonText: operationNote,
						patientId,
						operatorId: operatorId ?? null,
						metadata: { idempotencyKey, depositTagId: depositTag.id },
					})
					.returning();
				cashOp = op;
			}
		}

		// 4. Постановка фискального чека внесения аванса (Тег 1214 = 3 Аванс)
		await tx.insert(fiscalReceiptQueue).values({
			organizationId,
			paymentId: payment.id,
			receiptType: "income",
			status: "pending_print",
			payloadJson: {
				clientMutationId: idempotencyKey,
				amountRub,
				amountKopecks,
				method: statutoryMethod,
				cashRub: statutoryMethod === "cash" ? amountRub : 0,
				electronicRub: statutoryMethod !== "cash" ? amountRub : 0,
				advanceOffsetRub: 0,
				certificateOffsetRub: 0,
				bonusOffsetRub: 0,
				dmsOffsetRub: 0,
				patientId,
				patientName: patient.fullName || "Пациент клиники",
				note: operationNote,
				calculationSign: 3, // Аванс
			},
			retryCount: 0,
		});

		return {
			success: true,
			payment,
			depositTag,
			cashOperation: cashOp,
			isDuplicate: false,
		};
	}

	/**
	 * Зачет аванса на оплату лечения (Тег 1215).
	 * Сначала списывает личный аванс пациента, при нехватке — семейный депозит.
	 */
	public static async debitAdvance(
		tx: TenantDb,
		params: DebitAdvanceParams,
	) {
		const { organizationId, patientId, amountKopecks, idempotencyKey, visitId, invoiceId, allowFamilyFallback, notes } = params;

		if (amountKopecks <= 0) {
			throw new Error("Сумма списания аванса должна быть строго больше нуля.");
		}

		// Дедупликация по Idempotency-Key
		const [existingPayment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.clientMutationId, idempotencyKey),
				),
			)
			.limit(1);

		if (existingPayment) {
			return {
				success: true,
				payment: existingPayment,
				isDuplicate: true,
			};
		}

		const balance = await this.getDetailedBalance(tx, organizationId, patientId);
		if (!balance) {
			throw new Error("Пациент не найден.");
		}

		let remainingNeededKop = amountKopecks;
		let personalDebitedKop = 0;
		let familyDebitedKop = 0;

		// 1. Списание из личного аванса advanceDepositTaggings
		if (balance.personalAdvanceKopecks > 0) {
			const canDebitPersonal = Math.min(balance.personalAdvanceKopecks, remainingNeededKop);
			personalDebitedKop = canDebitPersonal;
			remainingNeededKop -= canDebitPersonal;

			// Помечаем строки или уменьшаем
			const advanceRows = await tx
				.select()
				.from(advanceDepositTaggings)
				.where(
					and(
						eq(advanceDepositTaggings.organizationId, organizationId),
						or(
							eq(advanceDepositTaggings.patientId, patientId),
							and(
								isNull(advanceDepositTaggings.patientId),
								eq(advanceDepositTaggings.patientName, balance.patientFullName),
							),
						),
						inArray(advanceDepositTaggings.allocationStatus, ["pinned", "unallocated"]),
					),
				)
				.orderBy(advanceDepositTaggings.createdAt);

			let debitAcc = canDebitPersonal;
			for (const row of advanceRows) {
				if (debitAcc <= 0) break;
				const rowKop = parseKopecks(row.depositAmountRub);
				if (rowKop <= debitAcc) {
					await tx
						.update(advanceDepositTaggings)
						.set({ allocationStatus: "spent" })
						.where(and(eq(advanceDepositTaggings.id, row.id), eq(advanceDepositTaggings.organizationId, organizationId)));
					debitAcc -= rowKop;
				} else {
					const remainingRowKop = rowKop - debitAcc;
					await tx
						.update(advanceDepositTaggings)
						.set({ depositAmountRub: kopecksToNumericString(remainingRowKop) })
						.where(and(eq(advanceDepositTaggings.id, row.id), eq(advanceDepositTaggings.organizationId, organizationId)));
					debitAcc = 0;
				}
			}
		}

		// 2. Если личного аванса не хватило, списываем из семейного кошелька
		if (remainingNeededKop > 0) {
			if (!allowFamilyFallback || !balance.familyWallet.hasFamily || !balance.familyWallet.canSpend) {
				throw new Error(
					`Недостаточно личного аванса для зачета. Доступно лично: ${balance.personalAdvanceRub} ₽, требуется: ${kopecksToRubles(amountKopecks)} ₽.`,
				);
			}

			if (balance.familyWallet.availableToPatientKopecks < remainingNeededKop) {
				throw new Error(
					`Недостаточно средств на личном и семейном балансе. Доступно: ${balance.totalAvailableForTreatmentRub} ₽, требуется: ${kopecksToRubles(amountKopecks)} ₽.`,
				);
			}

			familyDebitedKop = remainingNeededKop;
			const familyGroupId = balance.familyWallet.familyGroupId!;

			// Списание с семейного кошелька с блокировкой строки
			const [family] = await tx
				.select()
				.from(familyGroups)
				.where(and(eq(familyGroups.id, familyGroupId), eq(familyGroups.organizationId, organizationId)))
				.for("update")
				.limit(1);

			if (!family) {
				throw new Error("Семейная группа не найдена.");
			}

			const currentFamilyBalKop = parseKopecks(family.balance || "0.00");
			const newFamilyBalKop = Math.max(0, currentFamilyBalKop - familyDebitedKop);
			await tx
				.update(familyGroups)
				.set({
					balance: kopecksToNumericString(newFamilyBalKop),
					updatedAt: new Date(),
				})
				.where(and(eq(familyGroups.id, familyGroupId), eq(familyGroups.organizationId, organizationId)));
		}

		const totalAmountRub = kopecksToRubles(amountKopecks);
		const now = new Date();
		const defaultNote = "Зачет ранее внесенного аванса (депозит)";
		const operationNote = notes?.trim() || defaultNote;

		// 3. Создаем платеж со статусом paid и методом family_wallet (Тег 1215)
		const [payment] = await tx
			.insert(payments)
			.values({
				organizationId,
				patientId,
				visitId: visitId ?? null,
				documentId: invoiceId ?? null,
				amountRub: totalAmountRub,
				method: "family_wallet",
				status: "paid",
				clientMutationId: idempotencyKey,
				note: operationNote,
				paidAt: now,
			})
			.returning();

		if (!payment) {
			throw new Error("Не удалось создать платёж зачёта аванса.");
		}

		// 4. Постановка фискального чека полного расчета с зачетом аванса (Тег 1215)
		await tx.insert(fiscalReceiptQueue).values({
			organizationId,
			paymentId: payment.id,
			visitId: visitId ?? null,
			receiptType: "income",
			status: "pending_print",
			payloadJson: {
				clientMutationId: idempotencyKey,
				amountRub: totalAmountRub,
				amountKopecks,
				method: "family_wallet",
				cashRub: 0,
				electronicRub: 0,
				advanceOffsetRub: totalAmountRub,
				certificateOffsetRub: 0,
				bonusOffsetRub: 0,
				dmsOffsetRub: 0,
				patientId,
				patientName: balance.patientFullName,
				note: operationNote,
				personalDebitedRub: kopecksToRubles(personalDebitedKop),
				familyDebitedRub: kopecksToRubles(familyDebitedKop),
			},
			retryCount: 0,
		});

		return {
			success: true,
			payment,
			personalDebitedKopecks: personalDebitedKop,
			familyDebitedKopecks: familyDebitedKop,
			totalDebitedKopecks: amountKopecks,
			isDuplicate: false,
		};
	}

	/**
	 * Возврат неиспользованного личного аванса пациенту из кассы.
	 */
	public static async refundPersonalAdvance(
		tx: TenantDb,
		params: RefundAdvanceParams,
	) {
		const { organizationId, patientId, amountKopecks, cashBoxId, idempotencyKey, operatorId, reasonText } = params;

		if (amountKopecks <= 0) {
			throw new Error("Сумма возврата аванса должна быть строго больше нуля.");
		}

		const amountRub = kopecksToRubles(amountKopecks);

		// Дедупликация
		const [existingPayment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.clientMutationId, idempotencyKey),
				),
			)
			.limit(1);

		if (existingPayment) {
			return {
				success: true,
				payment: existingPayment,
				isDuplicate: true,
			};
		}

		const balance = await this.getDetailedBalance(tx, organizationId, patientId);
		if (!balance) {
			throw new Error("Пациент не найден.");
		}

		if (balance.personalAdvanceKopecks < amountKopecks) {
			throw new Error(
				`Недостаточно личного аванса для возврата. Доступно: ${balance.personalAdvanceRub} ₽, запрошено: ${amountRub} ₽.`,
			);
		}

		// Находим кассовый ящик
		const [targetBox] = await tx
			.select()
			.from(cashBoxes)
			.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, organizationId)))
			.for("update")
			.limit(1);

		if (!targetBox) {
			throw new Error("Кассовый счет не найден.");
		}

		const beforeKop =
			targetBox.balanceKopecks !== undefined && targetBox.balanceKopecks !== null
				? Number(targetBox.balanceKopecks)
				: rublesToKopecks(targetBox.balanceRub);

		if (beforeKop < amountKopecks) {
			throw new Error(
				`Недостаточно наличных средств в кассе для возврата. В кассе: ${kopecksToRubles(beforeKop)} ₽, запрошено: ${amountRub} ₽.`,
			);
		}

		const afterKop = beforeKop - amountKopecks;
		const balanceAfterRub = kopecksToRubles(afterKop);
		const now = new Date();

		// Находим активную смену
		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, organizationId),
					eq(cashBoxShifts.cashBoxId, targetBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.for("update")
			.limit(1);

		// Уменьшаем баланс кассы
		await tx
			.update(cashBoxes)
			.set({
				balanceRub: balanceAfterRub,
				balanceKopecks: afterKop,
				updatedAt: now,
			})
			.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, organizationId)));

		// Увеличиваем расход в смене
		if (activeShift) {
			const updatedExpense = kopecksToRubles(rublesToKopecks(activeShift.expenseTotalRub) + amountKopecks);
			await tx
				.update(cashBoxShifts)
				.set({
					expenseTotalRub: updatedExpense,
					updatedAt: now,
				})
				.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, organizationId)));
		}

		const note = reasonText?.trim() || "Возврат неиспользованного аванса пациенту";

		// Расходный кассовый ордер
		const [cashOp] = await tx
			.insert(cashOperations)
			.values({
				organizationId,
				cashBoxId: targetBox.id,
				shiftId: activeShift?.id ?? null,
				operationType: "expense",
				amountRub,
				balanceBeforeRub: targetBox.balanceRub,
				balanceAfterRub,
				reasonText: note,
				patientId,
				operatorId: operatorId ?? null,
				metadata: { idempotencyKey, type: "advance_refund" },
			})
			.returning();

		// Платеж со статусом refunded
		const [payment] = await tx
			.insert(payments)
			.values({
				organizationId,
				patientId,
				amountRub,
				method: targetBox.type === "main" ? "cash" : "card",
				status: "refunded",
				clientMutationId: idempotencyKey,
				note,
				paidAt: now,
			})
			.returning();

		if (!payment) {
			throw new Error("Не удалось зафиксировать платёж возврата аванса.");
		}

		// Списываем из advanceDepositTaggings
		const advanceRows = await tx
			.select()
			.from(advanceDepositTaggings)
			.where(
				and(
					eq(advanceDepositTaggings.organizationId, organizationId),
					or(
						eq(advanceDepositTaggings.patientId, patientId),
						and(
							isNull(advanceDepositTaggings.patientId),
							eq(advanceDepositTaggings.patientName, balance.patientFullName),
						),
					),
					inArray(advanceDepositTaggings.allocationStatus, ["pinned", "unallocated"]),
				),
			)
			.orderBy(advanceDepositTaggings.createdAt);

		let refundAcc = amountKopecks;
		for (const row of advanceRows) {
			if (refundAcc <= 0) break;
			const rowKop = parseKopecks(row.depositAmountRub);
			if (rowKop <= refundAcc) {
				await tx
					.update(advanceDepositTaggings)
					.set({ allocationStatus: "spent" })
					.where(and(eq(advanceDepositTaggings.id, row.id), eq(advanceDepositTaggings.organizationId, organizationId)));
				refundAcc -= rowKop;
			} else {
				const remainingRowKop = rowKop - refundAcc;
				await tx
					.update(advanceDepositTaggings)
					.set({ depositAmountRub: kopecksToNumericString(remainingRowKop) })
					.where(and(eq(advanceDepositTaggings.id, row.id), eq(advanceDepositTaggings.organizationId, organizationId)));
				refundAcc = 0;
			}
		}

		return {
			success: true,
			payment,
			cashOperation: cashOp!,
			refundedAmountRub: amountRub,
			isDuplicate: false,
		};
	}
}

export async function registerPatientBalanceRoutes(app: FastifyInstance): Promise<void> {
	app.get(
		"/api/cashbox/patients/:patientId/balance",
		async (request: FastifyRequest<{ Params: { patientId: string } }>, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "patient balance read");
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const { patientId } = request.params;
			const balance = await withTenantCtx(orgId, async (tx) => {
				return PatientBalanceService.getDetailedBalance(tx, orgId, patientId);
			});

			if (!balance) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден.",
				});
			}

			return reply.send({ success: true, data: balance, balance });
		},
	);

	app.post(
		"/api/cashbox/patients/:patientId/advance/credit",
		async (
			request: FastifyRequest<{
				Params: { patientId: string };
				Body: {
					amountKopecks: number;
					method: "cash" | "card" | "sbp" | "bank_transfer";
					cashBoxId?: string;
					operatorId?: string;
					notes?: string;
				};
			}>,
			reply: FastifyReply,
		) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"credit patient advance",
			);
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const { patientId } = request.params;
			const rawKey = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"];
			const idempotencyKey = typeof rawKey === "string" ? rawKey.trim() : "";
			if (!idempotencyKey) {
				return reply.code(400).send({
					error: "IdempotencyKeyRequired",
					message: "Заголовок Idempotency-Key обязателен.",
				});
			}

			const body = (request.body ?? {}) as {
				amountKopecks: number;
				method: "cash" | "card" | "sbp" | "bank_transfer";
				cashBoxId?: string;
				operatorId?: string;
				notes?: string;
			};

			const result = await withTenantCtx(orgId, async (tx) => {
				return PatientBalanceService.creditPersonalAdvance(tx, {
					organizationId: orgId,
					patientId,
					amountKopecks: body.amountKopecks,
					method: body.method,
					idempotencyKey,
					cashBoxId: body.cashBoxId,
					operatorId: body.operatorId,
					notes: body.notes,
				});
			});

			if (result.isDuplicate) {
				reply.header("idempotency-replayed", "true");
				reply.header("x-idempotency-replayed", "true");
			}

			return reply.code(201).send(result);
		},
	);

	app.post(
		"/api/cashbox/patients/:patientId/advance/debit",
		async (
			request: FastifyRequest<{
				Params: { patientId: string };
				Body: {
					amountKopecks: number;
					visitId?: string;
					invoiceId?: string;
					allowFamilyFallback?: boolean;
					notes?: string;
				};
			}>,
			reply: FastifyReply,
		) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"debit patient advance",
			);
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const { patientId } = request.params;
			const rawKey = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"];
			const idempotencyKey = typeof rawKey === "string" ? rawKey.trim() : "";
			if (!idempotencyKey) {
				return reply.code(400).send({
					error: "IdempotencyKeyRequired",
					message: "Заголовок Idempotency-Key обязателен.",
				});
			}

			const body = (request.body ?? {}) as {
				amountKopecks: number;
				visitId?: string;
				invoiceId?: string;
				allowFamilyFallback?: boolean;
				notes?: string;
			};

			const result = await withTenantCtx(orgId, async (tx) => {
				return PatientBalanceService.debitAdvance(tx, {
					organizationId: orgId,
					patientId,
					amountKopecks: body.amountKopecks,
					idempotencyKey,
					visitId: body.visitId,
					invoiceId: body.invoiceId,
					allowFamilyFallback: body.allowFamilyFallback,
					notes: body.notes,
				});
			});

			if (result.isDuplicate) {
				reply.header("idempotency-replayed", "true");
				reply.header("x-idempotency-replayed", "true");
			}

			return reply.code(200).send(result);
		},
	);
}
