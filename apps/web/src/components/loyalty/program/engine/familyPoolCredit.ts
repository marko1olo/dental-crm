import type { LoyaltyLedgerEntry } from "./loyaltyTypes";
import type {
	CreditFamilySharedBalanceInput,
	CreditFamilySharedBalanceResult,
} from "./familyPoolTypes";

export function creditFamilySharedBalance(
	input: CreditFamilySharedBalanceInput
): CreditFamilySharedBalanceResult {
	const amountToAddRub = Math.max(0, input.amountToAddRub);
	const newFamilyBalanceRub = input.currentFamilyBalanceRub + amountToAddRub;
	const timestampIso = new Date().toLocaleString("ru-RU");

	const ledgerEntry: LoyaltyLedgerEntry = {
		id: `fam-cr-${Date.now().toString().slice(-4)}`,
		timestampIso,
		patientId: input.payerPatientId,
		patientName: input.payerFullName,
		medicalCardNumber: "",
		operationType: "accrual",
		operationTypeRu: "Пополнение семейного баланса",
		invoiceAmountKop: 0,
		pointsDeltaRub: amountToAddRub,
		balanceAfterRub: newFamilyBalanceRub,
		paymentMethodRu: "Пополнение семейного кошелька",
		staffNameRu: input.staffNameRu ?? "Администратор",
		noteRu: input.reasonRu ?? `Пополнение общего семейного счета «${input.familyName}» плательщиком ${input.payerFullName}`,
	};

	return {
		familyGroupId: input.familyGroupId,
		payerPatientId: input.payerPatientId,
		payerFullName: input.payerFullName,
		creditedPointsRub: amountToAddRub,
		newFamilyBalanceRub,
		ledgerEntry,
		messageRu: `Семейный баланс «${input.familyName}» пополнен на ${amountToAddRub.toLocaleString("ru-RU")} ₽. Доступно: ${newFamilyBalanceRub.toLocaleString("ru-RU")} ₽`,
	};
}
