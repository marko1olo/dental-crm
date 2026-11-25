import { kopecksToNumericString, kopecksToRub, parseKopecks } from "@dental/shared";
import { Decimal } from "decimal.js";
import { and, desc, eq } from "drizzle-orm";
import { onTenantTxCommit, withTenantCtx } from "../../../db/rls.js";
import { cashBoxes, cashOperations, familyGroups, fiscalReceiptQueue, payments } from "../../../db/schema.js";
import { FiscalReceiptFactory } from "../../kkt/FiscalReceiptFactory.js";
import { wsBroker } from "../../websocketBroker.js";
import { FamilyWalletError, type FamilyRefundParams, type FamilyRefundResult } from "../familyWalletTypes.js";

export async function processFamilyRefund(params: FamilyRefundParams): Promise<FamilyRefundResult> {
	const { organizationId, familyGroupId, amountRub, amountKopecks, cashBoxId, operatorId, method = "cash", clientMutationId, reasonText } = params;

	if (!organizationId) throw new FamilyWalletError("Не указан ID организации клиники", 400, "MISSING_ORG_ID");
	if (!familyGroupId) throw new FamilyWalletError("Не указан ID семейной группы", 400, "MISSING_FAMILY_ID");
	if (!clientMutationId?.trim()) {
		throw new FamilyWalletError("Ключ операции (clientMutationId) обязателен для защиты от повторных возвратов", 400, "MISSING_IDEMPOTENCY_KEY");
	}
	if (amountKopecks == null && (typeof amountRub !== "number" || !Number.isFinite(amountRub) || Number.isNaN(amountRub))) {
		throw new FamilyWalletError("Сумма возврата должна быть числом", 400, "INVALID_AMOUNT");
	}

	const refundKopecks = params.amountKopecks != null ? Number(params.amountKopecks) : parseKopecks(amountRub);
	if (refundKopecks <= 0) throw new FamilyWalletError("Сумма возврата должна быть больше 0 ₽", 400, "INVALID_AMOUNT");

	return await withTenantCtx(organizationId, async (tx) => {
		const [family] = await tx.select().from(familyGroups).where(and(eq(familyGroups.id, familyGroupId), eq(familyGroups.organizationId, organizationId))).limit(1).for("update");
		if (!family) throw new FamilyWalletError("Семейная группа не найдена", 404, "FAMILY_NOT_FOUND");

		let walletOwnerId = family.headPatientId || family.primaryPatientId;
		if (!walletOwnerId && params.patientId) {
			walletOwnerId = params.patientId;
		}
		if (!walletOwnerId) {
			throw new FamilyWalletError("Семейный кошелек не имеет назначенного владельца (headPatientId)", 400, "MISSING_WALLET_OWNER");
		}

		// DEF-FAM-02: При расторжении договора возврат депозита возвращается строго владельцу счета (главе семьи)
		if (params.patientId && params.patientId !== walletOwnerId) {
			throw new FamilyWalletError(
				"Возврат семейного депозита разрешен строго владельцу счета (главе семьи)",
				403,
				"UNAUTHORIZED_FAMILY_REFUND_RECIPIENT",
			);
		}

		const targetPatientId = walletOwnerId;

		const [existingPayment] = await tx.select().from(payments).where(and(eq(payments.organizationId, organizationId), eq(payments.clientMutationId, clientMutationId.trim()))).limit(1);
		if (existingPayment) {
			const signedExistingKopecks =
				existingPayment.amountKopecks !== null &&
				existingPayment.amountKopecks !== undefined &&
				existingPayment.amountKopecks !== 0n
					? Number(existingPayment.amountKopecks)
					: parseKopecks(existingPayment.amountRub);
			const existingKopecks =
				signedExistingKopecks < 0 ? -signedExistingKopecks : signedExistingKopecks;
			if (existingKopecks !== refundKopecks || existingPayment.status !== "refunded") {
				throw new FamilyWalletError("Клиентская операция уже записала другой возврат.", 409, "IDEMPOTENCY_CONFLICT");
			}
			const curBal = family.balanceKopecks != null ? Number(family.balanceKopecks) : (family.balance ? parseKopecks(family.balance) : 0);
			return {
				success: true,
				payment: existingPayment,
				previousBalanceRub: kopecksToRub(curBal),
				newBalanceRub: kopecksToRub(curBal),
				refundedRub: kopecksToRub(existingKopecks),
				previousBalanceKopecks: curBal,
				newBalanceKopecks: curBal,
				refundedKopecks: existingKopecks,
				duplicate: true,
			};
		}

		const currentBalanceKop = family.balanceKopecks != null ? Number(family.balanceKopecks) : (family.balance ? parseKopecks(family.balance) : 0);
		if (currentBalanceKop < refundKopecks) {
			throw new FamilyWalletError(`Недостаточно средств на семейном балансе для возврата. Доступно: ${kopecksToRub(currentBalanceKop)} ₽, требуется вернуть: ${kopecksToRub(refundKopecks)} ₽`, 400, "INSUFFICIENT_FUNDS");
		}

		const newBalanceKop = new Decimal(currentBalanceKop).minus(refundKopecks).toNumber();
		const newBalanceStr = kopecksToNumericString(newBalanceKop);

		const [updatedFamily] = await tx
			.update(familyGroups)
			.set({
				balance: newBalanceStr,
				balanceKopecks: newBalanceKop,
				updatedAt: new Date(),
			})
			.where(and(eq(familyGroups.id, familyGroupId), eq(familyGroups.organizationId, organizationId)))
			.returning();
		if (!updatedFamily) throw new FamilyWalletError("Не удалось обновить баланс семейной группы", 500, "UPDATE_FAILED");

		let cashOp: typeof cashOperations.$inferSelect | undefined;
		let targetBox: typeof cashBoxes.$inferSelect | undefined;
		if (cashBoxId) {
			const [foundBox] = await tx
				.select()
				.from(cashBoxes)
				.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, organizationId)))
				.for("update")
				.limit(1);
			if (!foundBox) {
				throw new FamilyWalletError("Указанная касса не найдена", 404, "CASHBOX_NOT_FOUND");
			}
			targetBox = foundBox;
		} else if (method === "cash") {
			const [defaultMainBox] = await tx
				.select()
				.from(cashBoxes)
				.where(and(eq(cashBoxes.organizationId, organizationId), eq(cashBoxes.type, "main")))
				.orderBy(desc(cashBoxes.isMain))
				.for("update")
				.limit(1);
			targetBox = defaultMainBox;
		}

		if (targetBox) {
			const boxBalKop = targetBox.balanceKopecks != null ? Number(targetBox.balanceKopecks) : parseKopecks(targetBox.balanceRub || 0);
			if (boxBalKop < refundKopecks) {
				throw new FamilyWalletError(
					`В кассе недостаточно наличных средств для возврата (в кассе: ${kopecksToRub(boxBalKop)} ₽, требуется: ${kopecksToRub(refundKopecks)} ₽)`,
					400,
					"INSUFFICIENT_CASHBOX_BALANCE",
				);
			}
			const refundRub = kopecksToRub(refundKopecks);
			const newBoxBalKop = boxBalKop - refundKopecks;

			await tx.update(cashBoxes).set({
				balanceRub: kopecksToRub(newBoxBalKop),
				balanceKopecks: newBoxBalKop,
				updatedAt: new Date(),
			}).where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, organizationId)));
			const [createdOp] = await tx.insert(cashOperations).values({
				organizationId, cashBoxId: targetBox.id, operationType: "expense", amountRub: refundRub,
				amountKopecks: refundKopecks,
				balanceBeforeRub: targetBox.balanceRub, balanceAfterRub: kopecksToRub(newBoxBalKop),
				reasonText: reasonText || `Возврат неиспользованного семейного депозита: ${family.name || "Семья"}`,
				patientId: targetPatientId, operatorId: operatorId ?? null,
			}).returning();
			cashOp = createdOp;
		}

		const [payment] = await tx.insert(payments).values({
			organizationId, patientId: targetPatientId, amountRub: -kopecksToRub(refundKopecks),
			amountKopecks: -BigInt(refundKopecks), method,
			status: "refunded", clientMutationId: clientMutationId.trim(),
			documentId: familyGroupId,
			note: reasonText?.trim() ? `Возврат с семейного депозита: ${reasonText.trim()}` : "Возврат с семейного депозита",
		}).returning();
		if (!payment) throw new FamilyWalletError("Не удалось создать запись возврата", 500, "REFUND_PAYMENT_CREATION_FAILED");

		const ffdRefundPayload = FiscalReceiptFactory.buildFfd12Receipt({
			patientId: targetPatientId,
			documentId: familyGroupId,
			clientMutationId: `${clientMutationId.trim()}:return`,
			customerContact: "patient@clinic.ru",
			cashierFullName: "Кассир-администратор",
			operationType: "income_return",
			taxationSystem: "usn_income",
			cashKopecks: method === "cash" ? refundKopecks : 0,
			electronicCardKopecks: method !== "cash" ? refundKopecks : 0,
			sbpKopecks: 0,
			totalKopecks: refundKopecks,
			items: [
				{
					name: reasonText?.trim() || "Возврат неиспользованного семейного депозита",
					priceKopecks: refundKopecks,
					quantity: 1,
					amountKopecks: refundKopecks,
					subject: "payment",
					method: "advance",
					vatRate: "vat_none",
					measure: "piece",
				},
			],
		});
		await tx.insert(fiscalReceiptQueue).values({
			organizationId,
			paymentId: payment.id,
			receiptType: "income_return",
			status: "pending_print",
			payloadJson: {
				...ffdRefundPayload,
				clientMutationId: `${clientMutationId.trim()}:return`,
				documentId: familyGroupId,
				method,
				reasonText: reasonText?.trim() || "Возврат неиспользованного семейного депозита",
			},
			retryCount: 0,
		});

		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_BALANCE_UPDATED", payload: { organizationId, familyGroupId, balance: newBalanceStr } });
			wsBroker.broadcastToOrganization(organizationId, { type: "PAYMENT_CREATED", payload: payment });
		});

		return {
			success: true,
			payment,
			previousBalanceRub: kopecksToRub(currentBalanceKop),
			newBalanceRub: kopecksToRub(newBalanceKop),
			refundedRub: kopecksToRub(refundKopecks),
			previousBalanceKopecks: currentBalanceKop,
			newBalanceKopecks: newBalanceKop,
			refundedKopecks: refundKopecks,
			duplicate: false,
			cashOperation: cashOp,
		};
	});
}
