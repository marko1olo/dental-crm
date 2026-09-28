import {
	LOYALTY_TIER_PRESETS,
	type LoyaltyTierDefinition,
} from "./loyaltyPresets";

export interface Fiscal54FzSplitResult {
	readonly tag1031CashKop: number;
	readonly tag1081ElectronicCardKop: number;
	readonly tag1215AdvancePrepaymentBonusKop: number;
	readonly tag1043DiscountKop: number;
	readonly totalGrossKop: number;
	readonly totalNetPayableKop: number;
}

export interface LoyaltyLedgerEntry {
	readonly id: string;
	readonly timestampIso: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly operationType:
		| "accrual"
		| "redemption"
		| "certificate_purchase"
		| "certificate_redemption"
		| "welcome_bonus"
		| "birthday_bonus"
		| "referral_reward"
		| "manual_adjustment"
		| "expiry"
		| "expiration"
		| "adjustment";
	readonly operationTypeRu: string;
	readonly invoiceAmountKop: number;
	readonly pointsDeltaRub: number;
	readonly balanceAfterRub: number;
	readonly paymentMethodRu: string;
	readonly fiscalReceiptNumber?: string;
	readonly staffNameRu: string;
	readonly noteRu: string;
}

export interface FamilyMember {
	readonly patientId: string;
	readonly fullName: string;
	readonly roleRu: "Глава семьи" | "Супруг / Супруга" | "Ребенок" | "Родитель" | "Родственник";
	readonly birthDateIso?: string;
	readonly individualPointsBalance: number;
	readonly lifetimeSpentKop: number;
	readonly isBonusSpendingAllowed?: boolean;
	readonly canDebitSharedPool?: boolean;
}

export interface FamilyPoolBalanceResult {
	readonly familyGroupId: string;
	readonly familyName: string;
	readonly memberCount: number;
	readonly totalPooledPoints: number;
	readonly totalFamilyLifetimeSpentKop: number;
	readonly totalFamilyLifetimeSpentRub: number;
	readonly sharedPoolTierId?: string | undefined;
	readonly sharedPoolTierName?: string | undefined;
	readonly effectiveTier: LoyaltyTierDefinition;
	readonly members: readonly FamilyMember[];
}


export type FamilyPoolResult = FamilyPoolBalanceResult;
export type FamilyPointsPool = FamilyPoolBalanceResult;


export interface DebitFamilySharedBalanceInput {
	readonly familyGroupId: string;
	readonly familyName: string;
	readonly sponsorPatientId: string;
	readonly sponsorFullName: string;
	readonly targetPatientId: string;
	readonly targetPatientName: string;
	readonly targetRoleRu: "Глава семьи" | "Супруг / Супруга" | "Ребенок" | "Родитель" | "Родственник";
	readonly invoiceAmountKop: number;
	readonly availableFamilyPointsRub: number;
	readonly requestedPointsRub?: number;
	readonly maxCoveragePercent?: number; // default 30% by clean dental standard
	readonly allowFullCoverage?: boolean; // Doctor override / 100% parental payment
	readonly staffNameRu?: string;
	readonly timestampIso?: string;
}

export interface DebitFamilySharedBalanceResult {
	readonly success: boolean;
	readonly familyGroupId: string;
	readonly sponsorPatientId: string;
	readonly sponsorFullName: string;
	readonly targetPatientId: string;
	readonly targetPatientName: string;
	readonly targetRoleRu: string;
	readonly invoiceAmountKop: number;
	readonly invoiceAmountRub: number;
	readonly maxAllowedRedemptionRub: number;
	readonly debitedPointsRub: number;
	readonly debitedPointsKop: number;
	readonly remainingFamilyBalanceRub: number;
	readonly remainingInvoiceDueKop: number;
	readonly remainingInvoiceDueRub: number;
	readonly isOneWalletTransferFree: true; // 1 кошелек на семью — родитель оплачивает без ручной переброски
	readonly fiscal54FzSplit: Fiscal54FzSplitResult;
	readonly ledgerEntry: LoyaltyLedgerEntry;
	readonly messageRu: string;
}

export interface CreditFamilySharedBalanceInput {
	readonly familyGroupId: string;
	readonly familyName: string;
	readonly payerPatientId: string;
	readonly payerFullName: string;
	readonly currentFamilyBalanceRub: number;
	readonly amountToAddRub: number;
	readonly reasonRu?: string;
	readonly staffNameRu?: string;
}

export interface CreditFamilySharedBalanceResult {
	readonly familyGroupId: string;
	readonly payerPatientId: string;
	readonly payerFullName: string;
	readonly creditedPointsRub: number;
	readonly newFamilyBalanceRub: number;
	readonly ledgerEntry: LoyaltyLedgerEntry;
	readonly messageRu: string;
}

export function calculateFamilyPoolBalance(
	familyGroupId: string,
	familyName: string,
	members: readonly FamilyMember[]
): FamilyPoolBalanceResult {
	let totalPooledPoints = 0;
	let totalFamilyLifetimeSpentKop = 0;

	for (const m of members) {
		totalPooledPoints += m.individualPointsBalance;
		totalFamilyLifetimeSpentKop += m.lifetimeSpentKop;
	}

	// Family tier is default, or upgraded to Platinum if family lifetime spent exceeds 400k RUB
	const effectiveTier =
		totalFamilyLifetimeSpentKop >= 40000000
			? (LOYALTY_TIER_PRESETS.find((t) => t.id === "platinum") ?? LOYALTY_TIER_PRESETS[0]!)
			: (LOYALTY_TIER_PRESETS.find((t) => t.id === "family") ?? LOYALTY_TIER_PRESETS[0]!);

	return {
		familyGroupId,
		familyName,
		memberCount: members.length,
		totalPooledPoints,
		totalFamilyLifetimeSpentKop,
		totalFamilyLifetimeSpentRub: totalFamilyLifetimeSpentKop / 100,
		effectiveTier,
		members,
	};
}

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

	const fiscal54FzSplit: Fiscal54FzSplitResult = {
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
