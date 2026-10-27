import { kopecksToNumericString, kopecksToRub, parseKopecks } from "@dental/shared";
import { Decimal } from "decimal.js";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { familyGroups, patients, payments } from "../../../db/schema.js";
import { wsBroker } from "../../websocketBroker.js";
import { FamilyWalletError, type FamilyTopupParams, type FamilyTopupResult } from "../familyWalletTypes.js";

export async function processFamilyTopup(params: FamilyTopupParams): Promise<FamilyTopupResult> {
	const { organizationId, familyGroupId, amountRub, method = "cash", clientMutationId } = params;
	const targetPatientId = params.payerPatientId || params.patientId;

	if (!organizationId) throw new FamilyWalletError("Не указан ID организации клиники", 400, "MISSING_ORG_ID");
	if (!familyGroupId) throw new FamilyWalletError("Не указан ID семейной группы", 400, "MISSING_FAMILY_ID");
	if (!targetPatientId) throw new FamilyWalletError("Не указан ID плательщика", 400, "MISSING_PATIENT_ID");
	if (!clientMutationId?.trim()) {
		throw new FamilyWalletError("Ключ операции (clientMutationId) обязателен для защиты от повторных зачислений", 400, "MISSING_IDEMPOTENCY_KEY");
	}

	const creditKopecks = parseKopecks(amountRub);
	if (creditKopecks <= 0) throw new FamilyWalletError("Сумма пополнения должна быть больше 0 ₽", 400, "INVALID_AMOUNT");
	if (creditKopecks > 10_000_000_00) throw new FamilyWalletError("Сумма одного пополнения не может превышать 10 000 000 ₽", 400, "AMOUNT_EXCEEDS_LIMIT");

	return await db.transaction(async (tx) => {
		const [patient] = await tx.select().from(patients).where(and(eq(patients.id, targetPatientId), eq(patients.organizationId, organizationId))).limit(1);
		if (!patient || patient.familyGroupId !== familyGroupId) {
			throw new FamilyWalletError("Плательщик не найден в семейной группе клиники", 404, "PATIENT_NOT_IN_FAMILY");
		}

		const [family] = await tx.select().from(familyGroups).where(and(eq(familyGroups.id, familyGroupId), eq(familyGroups.organizationId, organizationId))).limit(1).for("update");
		if (!family) throw new FamilyWalletError("Семейная группа не найдена", 404, "FAMILY_NOT_FOUND");

		const [existingPayment] = await tx.select().from(payments).where(and(eq(payments.organizationId, organizationId), eq(payments.clientMutationId, clientMutationId.trim()))).limit(1);
		if (existingPayment) {
			if (parseKopecks(existingPayment.amountRub) !== creditKopecks || (targetPatientId && existingPayment.patientId !== targetPatientId) || (method && existingPayment.method !== method)) {
				throw new FamilyWalletError("Клиентская операция уже записала другое пополнение.", 409, "IDEMPOTENCY_CONFLICT");
			}
			const prevBal = parseKopecks(family.balance);
			return { success: true, payment: existingPayment, previousBalanceRub: kopecksToRub(prevBal), newBalanceRub: kopecksToRub(prevBal), creditedRub: kopecksToRub(parseKopecks(existingPayment.amountRub)), duplicate: true };
		}

		const prevBalanceKop = parseKopecks(family.balance);
		const newBalanceKop = new Decimal(prevBalanceKop).plus(creditKopecks).toNumber();
		const newBalanceStr = kopecksToNumericString(newBalanceKop);

		const [updatedFamily] = await tx.update(familyGroups).set({ balance: newBalanceStr, updatedAt: new Date() }).where(and(eq(familyGroups.id, familyGroupId), eq(familyGroups.organizationId, organizationId))).returning();
		if (!updatedFamily) throw new FamilyWalletError("Не удалось обновить баланс семейной группы", 500, "UPDATE_FAILED");

		const [payment] = await tx.insert(payments).values({
			organizationId, patientId: targetPatientId, amountRub: kopecksToRub(creditKopecks),
			method, status: "planned", clientMutationId: clientMutationId.trim(),
			note: params.notes?.trim() || `Пополнение семейного депозита (${method})`,
		}).returning();
		if (!payment) throw new FamilyWalletError("Не удалось создать запись платежа", 500, "PAYMENT_CREATION_FAILED");

		wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_BALANCE_UPDATED", payload: { organizationId, familyGroupId, balance: newBalanceStr } });
		wsBroker.broadcastToOrganization(organizationId, { type: "PAYMENT_CREATED", payload: payment });

		return { success: true, payment, previousBalanceRub: kopecksToRub(prevBalanceKop), newBalanceRub: kopecksToRub(newBalanceKop), creditedRub: kopecksToRub(creditKopecks), duplicate: false };
	});
}
