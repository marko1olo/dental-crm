import { kopecksToNumericString, kopecksToRub, parseKopecks } from "@dental/shared";
import { Decimal } from "decimal.js";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { familyGroups, patients, payments } from "../../../db/schema.js";
import { wsBroker } from "../../websocketBroker.js";
import { FamilyWalletError, type FamilyDebitParams, type FamilyDebitResult } from "../familyWalletTypes.js";
import { verifyFamilySpendAuthorization } from "./familySpendAuthorization.js";
import { verifyServicePriceIntegrity } from "./familyPriceGuard.js";

export async function processFamilyDebit(params: FamilyDebitParams): Promise<FamilyDebitResult> {
	const { organizationId, familyGroupId, patientId, amountRub, clientMutationId, documentId, visitId } = params;

	if (!organizationId) throw new FamilyWalletError("Не указан ID организации клиники", 400, "MISSING_ORG_ID");
	if (!familyGroupId) throw new FamilyWalletError("Не указан ID семейной группы", 400, "MISSING_FAMILY_ID");
	if (!patientId) throw new FamilyWalletError("Не указан ID пациента", 400, "MISSING_PATIENT_ID");
	if (!clientMutationId?.trim()) {
		throw new FamilyWalletError("Ключ операции (clientMutationId) обязателен для защиты от двойных списаний", 400, "MISSING_IDEMPOTENCY_KEY");
	}
	if (typeof amountRub !== "number" || !Number.isFinite(amountRub) || Number.isNaN(amountRub)) {
		throw new FamilyWalletError("Сумма списания должна быть числом", 400, "INVALID_AMOUNT");
	}

	const debitKopecks = parseKopecks(amountRub);
	if (debitKopecks <= 0) throw new FamilyWalletError("Сумма списания должна быть больше 0 ₽", 400, "INVALID_AMOUNT");

	return await db.transaction(async (tx) => {
		const [patient] = await tx.select().from(patients).where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId))).limit(1);
		if (!patient || patient.familyGroupId !== familyGroupId) {
			throw new FamilyWalletError("Пациент не найден в семейной группе клиники", 404, "PATIENT_NOT_IN_FAMILY");
		}

		await verifyServicePriceIntegrity({ tx, organizationId, debitParams: params, debitKopecks });

		const [family] = await tx.select().from(familyGroups).where(and(eq(familyGroups.id, familyGroupId), eq(familyGroups.organizationId, organizationId))).limit(1).for("update");
		if (!family) throw new FamilyWalletError("Семейная группа не найдена", 404, "FAMILY_NOT_FOUND");

		await verifyFamilySpendAuthorization({ tx, organizationId, family, patientId, payerPatientId: params.payerPatientId, debitKopecks });

		const [existingPayment] = await tx.select().from(payments).where(and(eq(payments.organizationId, organizationId), eq(payments.clientMutationId, clientMutationId.trim()))).limit(1);
		if (existingPayment) {
			if (parseKopecks(existingPayment.amountRub) !== debitKopecks || existingPayment.patientId !== patientId || existingPayment.method !== "family_wallet") {
				throw new FamilyWalletError("Клиентская операция уже записала другую оплату.", 409, "IDEMPOTENCY_CONFLICT");
			}
			const currentBal = parseKopecks(family.balance);
			return { success: true, payment: existingPayment, previousBalanceRub: kopecksToRub(currentBal), newBalanceRub: kopecksToRub(currentBal), debitedRub: kopecksToRub(parseKopecks(existingPayment.amountRub)), duplicate: true };
		}

		const currentBalanceKop = parseKopecks(family.balance);
		if (currentBalanceKop < debitKopecks) {
			throw new FamilyWalletError(`Недостаточно средств на семейном балансе. Доступно: ${kopecksToRub(currentBalanceKop)} ₽, требуется: ${kopecksToRub(debitKopecks)} ₽`, 402, "INSUFFICIENT_FUNDS");
		}

		const newBalanceKop = new Decimal(currentBalanceKop).minus(debitKopecks).toNumber();
		const newBalanceStr = kopecksToNumericString(newBalanceKop);

		const [updatedFamily] = await tx.update(familyGroups).set({ balance: newBalanceStr, updatedAt: new Date() }).where(and(eq(familyGroups.id, familyGroupId), eq(familyGroups.organizationId, organizationId))).returning();
		if (!updatedFamily) throw new FamilyWalletError("Не удалось списать средства с семейного счета", 500, "DEBIT_FAILED");

		const [payment] = await tx.insert(payments).values({
			organizationId, patientId, amountRub: kopecksToRub(debitKopecks), method: "family_wallet",
			status: "paid", documentId: documentId ?? null, visitId: visitId ?? null, clientMutationId: clientMutationId.trim(),
		}).returning();
		if (!payment) throw new FamilyWalletError("Не удалось создать запись платежа", 500, "PAYMENT_CREATION_FAILED");

		wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_BALANCE_UPDATED", payload: { organizationId, familyGroupId, balance: newBalanceStr } });
		wsBroker.broadcastToOrganization(organizationId, { type: "PAYMENT_CREATED", payload: payment });

		return { success: true, payment, previousBalanceRub: kopecksToRub(currentBalanceKop), newBalanceRub: kopecksToRub(newBalanceKop), debitedRub: kopecksToRub(debitKopecks), duplicate: false };
	});
}
