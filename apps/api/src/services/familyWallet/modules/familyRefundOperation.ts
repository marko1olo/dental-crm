import { kopecksToNumericString, kopecksToRub, parseKopecks } from "@dental/shared";
import { Decimal } from "decimal.js";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { cashBoxes, cashOperations, familyGroups, payments } from "../../../db/schema.js";
import { wsBroker } from "../../websocketBroker.js";
import { FamilyWalletError, type FamilyRefundParams, type FamilyRefundResult } from "../familyWalletTypes.js";

export async function processFamilyRefund(params: FamilyRefundParams): Promise<FamilyRefundResult> {
	const { organizationId, familyGroupId, amountRub, cashBoxId, operatorId, method = "cash", clientMutationId, reasonText } = params;

	if (!organizationId) throw new FamilyWalletError("Не указан ID организации клиники", 400, "MISSING_ORG_ID");
	if (!familyGroupId) throw new FamilyWalletError("Не указан ID семейной группы", 400, "MISSING_FAMILY_ID");
	if (!clientMutationId?.trim()) {
		throw new FamilyWalletError("Ключ операции (clientMutationId) обязателен для защиты от повторных возвратов", 400, "MISSING_IDEMPOTENCY_KEY");
	}
	if (typeof amountRub !== "number" || !Number.isFinite(amountRub) || Number.isNaN(amountRub)) {
		throw new FamilyWalletError("Сумма возврата должна быть числом", 400, "INVALID_AMOUNT");
	}

	const refundKopecks = parseKopecks(amountRub);
	if (refundKopecks <= 0) throw new FamilyWalletError("Сумма возврата должна быть больше 0 ₽", 400, "INVALID_AMOUNT");

	return await db.transaction(async (tx) => {
		const [family] = await tx.select().from(familyGroups).where(and(eq(familyGroups.id, familyGroupId), eq(familyGroups.organizationId, organizationId))).limit(1).for("update");
		if (!family) throw new FamilyWalletError("Семейная группа не найдена", 404, "FAMILY_NOT_FOUND");

		const targetPatientId = params.patientId || family.headPatientId || family.primaryPatientId;
		if (!targetPatientId) throw new FamilyWalletError("Не указан пациент-получатель возврата депозита", 400, "MISSING_PATIENT_ID");

		const [existingPayment] = await tx.select().from(payments).where(and(eq(payments.organizationId, organizationId), eq(payments.clientMutationId, clientMutationId.trim()))).limit(1);
		if (existingPayment) {
			if (parseKopecks(existingPayment.amountRub) !== refundKopecks || existingPayment.status !== "refunded") {
				throw new FamilyWalletError("Клиентская операция уже записала другой возврат.", 409, "IDEMPOTENCY_CONFLICT");
			}
			const curBal = parseKopecks(family.balance);
			return { success: true, payment: existingPayment, previousBalanceRub: kopecksToRub(curBal), newBalanceRub: kopecksToRub(curBal), refundedRub: kopecksToRub(parseKopecks(existingPayment.amountRub)), duplicate: true };
		}

		const currentBalanceKop = parseKopecks(family.balance);
		if (currentBalanceKop < refundKopecks) {
			throw new FamilyWalletError(`Недостаточно средств на семейном балансе для возврата. Доступно: ${kopecksToRub(currentBalanceKop)} ₽, требуется вернуть: ${kopecksToRub(refundKopecks)} ₽`, 400, "INSUFFICIENT_FUNDS");
		}

		const newBalanceKop = new Decimal(currentBalanceKop).minus(refundKopecks).toNumber();
		const newBalanceStr = kopecksToNumericString(newBalanceKop);

		const [updatedFamily] = await tx.update(familyGroups).set({ balance: newBalanceStr, updatedAt: new Date() }).where(and(eq(familyGroups.id, familyGroupId), eq(familyGroups.organizationId, organizationId))).returning();
		if (!updatedFamily) throw new FamilyWalletError("Не удалось обновить баланс семейной группы", 500, "UPDATE_FAILED");

		let cashOp: typeof cashOperations.$inferSelect | undefined;
		if (cashBoxId) {
			const [targetBox] = await tx.select().from(cashBoxes).where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, organizationId))).for("update").limit(1);
			if (targetBox) {
				const boxBalKop = parseKopecks(targetBox.balanceRub);
				const refundRub = kopecksToRub(refundKopecks);
				const newBoxBalKop = Math.max(0, boxBalKop - refundKopecks);

				await tx.update(cashBoxes).set({ balanceRub: kopecksToRub(newBoxBalKop), updatedAt: new Date() }).where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, organizationId)));
				const [createdOp] = await tx.insert(cashOperations).values({
					organizationId, cashBoxId: targetBox.id, operationType: "expense", amountRub: refundRub,
					balanceBeforeRub: targetBox.balanceRub, balanceAfterRub: kopecksToRub(newBoxBalKop),
					reasonText: reasonText || `Возврат неиспользованного семейного депозита: ${family.name || "Семья"}`,
					patientId: targetPatientId, operatorId: operatorId ?? null,
				}).returning();
				cashOp = createdOp;
			}
		}

		const [payment] = await tx.insert(payments).values({
			organizationId, patientId: targetPatientId, amountRub: kopecksToRub(refundKopecks), method,
			status: "refunded", clientMutationId: clientMutationId.trim(),
			note: reasonText?.trim() ? `Возврат с семейного депозита: ${reasonText.trim()}` : "Возврат с семейного депозита",
		}).returning();
		if (!payment) throw new FamilyWalletError("Не удалось создать запись возврата", 500, "REFUND_PAYMENT_CREATION_FAILED");

		wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_BALANCE_UPDATED", payload: { organizationId, familyGroupId, balance: newBalanceStr } });
		wsBroker.broadcastToOrganization(organizationId, { type: "PAYMENT_CREATED", payload: payment });

		return { success: true, payment, previousBalanceRub: kopecksToRub(currentBalanceKop), newBalanceRub: kopecksToRub(newBalanceKop), refundedRub: kopecksToRub(refundKopecks), duplicate: false, cashOperation: cashOp };
	});
}
