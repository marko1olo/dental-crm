import type { CashboxFiscalSplitResult, LoyaltyLedgerEntry } from "./loyaltyTypes";
import type {
	DebitFamilySharedBalanceInput,
	DebitFamilySharedBalanceResult,
} from "./familyPoolTypes";

export function debitFamilySharedBalance(
	input: DebitFamilySharedBalanceInput
): DebitFamilySharedBalanceResult {
	const invoiceAmountKop = Math.max(0, input.invoiceAmountKop);
	const invoiceAmountRub = invoiceAmountKop / 100;
	const availablePointsRub = Math.max(0, input.availableFamilyPointsRub);

	const coveragePercent = input.allowFullCoverage
		? 100
		: (input.maxCoveragePercent ?? 30); // 30% clean dental standard

	const maxCoverageRub = Math.floor((invoiceAmountRub * coveragePercent) / 100);
	const maxAllowedRedemptionRub = Math.min(availablePointsRub, maxCoverageRub);

	const requestedRub = input.requestedPointsRub !== undefined
		? Math.max(0, input.requestedPointsRub)
		: maxAllowedRedemptionRub;

	const debitedPointsRub = Math.min(requestedRub, maxAllowedRedemptionRub);
	const debitedPointsKop = Math.round(debitedPointsRub * 100);

	const remainingFamilyBalanceRub = Math.max(0, availablePointsRub - debitedPointsRub);
	const remainingInvoiceDueKop = Math.max(0, invoiceAmountKop - debitedPointsKop);
	const remainingInvoiceDueRub = remainingInvoiceDueKop / 100;

	const timestampIso = input.timestampIso ?? new Date().toLocaleString("ru-RU");

	const fiscal54FzSplit: CashboxFiscalSplitResult = {
		tag1031CashKop: 0,
		tag1081ElectronicCardKop: remainingInvoiceDueKop,
		tag1215AdvancePrepaymentBonusKop: debitedPointsKop,
		tag1043DiscountKop: 0,
		totalGrossKop: invoiceAmountKop,
		totalNetPayableKop: remainingInvoiceDueKop,
	};

	const ledgerEntry: LoyaltyLedgerEntry = {
		id: `fam-tx-${Date.now().toString().slice(-4)}`,
		timestampIso,
		patientId: input.targetPatientId,
		patientName: input.targetPatientName,
		medicalCardNumber: "",
		operationType: "redemption",
		operationTypeRu: "Оплата с семейного баланса",
		invoiceAmountKop,
		pointsDeltaRub: -debitedPointsRub,
		balanceAfterRub: remainingFamilyBalanceRub,
		paymentMethodRu: "Семейный баланс (1 кошелек)",
		staffNameRu: input.staffNameRu ?? "Администратор / Касса",
		noteRu: `Оплата лечения за: ${input.targetPatientName} (${input.targetRoleRu}) из семейного кошелька «${input.familyName}» (Плательщик: ${input.sponsorFullName})`,
	};

	const messageRu = debitedPointsRub > 0
		? `Списано ${debitedPointsRub} бонусов с семейного баланса за пациента «${input.targetPatientName}». К доплате: ${remainingInvoiceDueRub.toLocaleString("ru-RU")} ₽`
		: `Семейный баланс не списан (доступно 0 ₽ или счет оплачен).`;

	return {
		success: debitedPointsRub > 0 || invoiceAmountKop === 0,
		familyGroupId: input.familyGroupId,
		sponsorPatientId: input.sponsorPatientId,
		sponsorFullName: input.sponsorFullName,
		targetPatientId: input.targetPatientId,
		targetPatientName: input.targetPatientName,
		targetRoleRu: input.targetRoleRu,
		invoiceAmountKop,
		invoiceAmountRub,
		maxAllowedRedemptionRub,
		debitedPointsRub,
		debitedPointsKop,
		remainingFamilyBalanceRub,
		remainingInvoiceDueKop,
		remainingInvoiceDueRub,
		isOneWalletTransferFree: true,
		fiscal54FzSplit,
		ledgerEntry,
		messageRu,
	};
}
