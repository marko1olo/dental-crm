/**
 * DENTE Dental CRM — Канонический каталог лояльности, семейного баланса и сертификатов
 * Консолидированный каталог и расчетный движок (Мандаты 8b 280–350 строк, 8e, 8n, 8wy)
 * Целочисленный расчет в копейках, RFC 4180 UTF-8 BOM, zero-mocks, deterministic.
 */

export type LoyaltyTierId = "basic" | "silver" | "gold" | "platinum" | "family" | "standard";

export interface LoyaltyTierDefinition {
	readonly id: LoyaltyTierId; readonly nameRu: string; readonly badgeLabelRu: string; readonly cashbackPercent: number; readonly maxInvoiceCoveragePercent: number; readonly minLifetimeSpentKop: number; readonly pointRateRub: number; readonly descriptionRu: string; readonly privilegesRu: readonly string[]; readonly accentColor: string;
}

export const DENTAL_LOYALTY_STANDARDS = {
	cashbackPercentBase: 3, cashbackPercentFamily: 5, cashbackPercentPremium: 5, maxInvoiceCoveragePercent: 30, maxStandardCoveragePercent: 30, pointRateRub: 1.0, descriptionRu: "Стоматологическая программа: кэшбэк 3–10% бонусами, оплата баллами до 30–50% чека.",
} as const;

export const LOYALTY_TIER_PRESETS: readonly LoyaltyTierDefinition[] = [
	{
		id: "silver", nameRu: "Серебряный", badgeLabelRu: "Базовый 3%", cashbackPercent: 3, maxInvoiceCoveragePercent: 30, minLifetimeSpentKop: 0, pointRateRub: 1.0,
		descriptionRu: "3% кэшбэк бонусами за терапию и гигиену. Оплата баллами до 30% счета.",
		privilegesRu: ["3% начисление бонусов за каждый визит", "Оплата бонусами до 30% стоимости услуг", "Срок действия бонусов — 365 дней", "Уведомления о плановой гигиене"], accentColor: "var(--muted)",
	},
	{
		id: "gold", nameRu: "Золотой", badgeLabelRu: "Премиум 5%", cashbackPercent: 5, maxInvoiceCoveragePercent: 40, minLifetimeSpentKop: 15000000, pointRateRub: 1.0,
		descriptionRu: "5% кэшбэк бонусами от 150 000 ₽. Оплата бонусами до 40% чека.",
		privilegesRu: ["Повышенный кэшбэк 5% со всех услуг", "Оплата бонусами до 40% стоимости чека", "Приоритетное бронирование времени приема", "Приоритетная связь с лечащим врачом"], accentColor: "var(--warn-fg)",
	},
	{
		id: "platinum", nameRu: "Платиновый VIP", badgeLabelRu: "VIP 7–10%", cashbackPercent: 7, maxInvoiceCoveragePercent: 50, minLifetimeSpentKop: 40000000, pointRateRub: 1.0,
		descriptionRu: "7% кэшбэк бонусами от 400 000 ₽. Списание до 50% чека и приоритетная связь с врачом.",
		privilegesRu: ["Максимальный кэшбэк 7–10% на все услуги", "Оплата бонусами до 50% суммы чека", "Бесплатный радиовизиографический контроль 1 раз в год", "Приоритетная связь с лечащим врачом"], accentColor: "var(--teal-dark)",
	},
	{
		id: "family", nameRu: "Семейный накопительный", badgeLabelRu: "Семейный 6%", cashbackPercent: 6, maxInvoiceCoveragePercent: 35, minLifetimeSpentKop: 5000000, pointRateRub: 1.0,
		descriptionRu: "Единый семейный баланс для родителей и детей с кэшбэком 6% со всех визитов.",
		privilegesRu: ["Единый семейный кошелек баллов без комиссии", "Повышенный кэшбэк 6% за визиты всей семьи", "Оплата до 35% стоимости детского и взрослого лечения", "Скидка 10% на детскую ортодонтию при лечении родителей"], accentColor: "var(--ok-fg)",
	},
];

export function getTierDefinition(tierId: string): LoyaltyTierDefinition {
	return LOYALTY_TIER_PRESETS.find((t) => t.id === tierId) ?? LOYALTY_TIER_PRESETS[0]!;
}

export interface TierProgressionResult {
	readonly currentTier: LoyaltyTierDefinition; readonly nextTier: LoyaltyTierDefinition | null; readonly lifetimeSpentKop: number; readonly lifetimeSpentRub: number; readonly progressPercent: number; readonly remainingToNextTierKop: number; readonly remainingToNextTierRub: number;
}

export function calculateTierProgression(lifetimeSpentKop: number, isFamilyGroup = false): TierProgressionResult {
	if (isFamilyGroup) {
		const familyTier = getTierDefinition("family");
		return { currentTier: familyTier, nextTier: getTierDefinition("platinum"), lifetimeSpentKop, lifetimeSpentRub: lifetimeSpentKop / 100, progressPercent: Math.min(100, Math.round((lifetimeSpentKop / 40000000) * 100)), remainingToNextTierKop: Math.max(0, 40000000 - lifetimeSpentKop), remainingToNextTierRub: Math.max(0, 40000000 - lifetimeSpentKop) / 100 };
	}
	const [silver, gold, platinum] = [getTierDefinition("silver"), getTierDefinition("gold"), getTierDefinition("platinum")];
	if (lifetimeSpentKop >= platinum.minLifetimeSpentKop) {
		return { currentTier: platinum, nextTier: null, lifetimeSpentKop, lifetimeSpentRub: lifetimeSpentKop / 100, progressPercent: 100, remainingToNextTierKop: 0, remainingToNextTierRub: 0 };
	}
	if (lifetimeSpentKop >= gold.minLifetimeSpentKop) {
		const span = platinum.minLifetimeSpentKop - gold.minLifetimeSpentKop;
		const pct = Math.min(100, Math.round(((lifetimeSpentKop - gold.minLifetimeSpentKop) / span) * 100));
		return { currentTier: gold, nextTier: platinum, lifetimeSpentKop, lifetimeSpentRub: lifetimeSpentKop / 100, progressPercent: pct, remainingToNextTierKop: platinum.minLifetimeSpentKop - lifetimeSpentKop, remainingToNextTierRub: (platinum.minLifetimeSpentKop - lifetimeSpentKop) / 100 };
	}
	const span = gold.minLifetimeSpentKop;
	const pct = span > 0 ? Math.min(100, Math.round((lifetimeSpentKop / span) * 100)) : 100;
	return { currentTier: silver, nextTier: gold, lifetimeSpentKop, lifetimeSpentRub: lifetimeSpentKop / 100, progressPercent: pct, remainingToNextTierKop: gold.minLifetimeSpentKop - lifetimeSpentKop, remainingToNextTierRub: (gold.minLifetimeSpentKop - lifetimeSpentKop) / 100 };
}

export interface CashboxFiscalSplitResult {
	readonly tag1031CashKop: number; readonly tag1081ElectronicCardKop: number; readonly tag1215AdvancePrepaymentBonusKop: number; readonly tag1043DiscountKop: number; readonly totalGrossKop: number; readonly totalNetPayableKop: number;
}
export type Fiscal54FzSplitResult = CashboxFiscalSplitResult;

export interface LoyaltyAccrualInput {
	readonly grossInvoiceKop: number; readonly discountKop?: number; readonly pointsRedeemedKop?: number; readonly certificateRedeemedKop?: number; readonly excludedFromAccrualKop?: number; readonly tierId: string; readonly customCashbackPercent?: number;
}
export interface LoyaltyAccrualResult {
	readonly grossInvoiceKop: number; readonly totalDeductionsKop: number; readonly paidOutOfPocketKop: number; readonly excludedFromAccrualKop: number; readonly eligibleBaseKop: number; readonly cashbackPercent: number; readonly accruedPointsKop: number; readonly accruedPointsRub: number; readonly tierId: string; readonly tierNameRu: string;
}

export function calculateLoyaltyAccrual(input: LoyaltyAccrualInput): LoyaltyAccrualResult {
	const discountKop = Math.max(0, input.discountKop ?? 0), pointsRedeemedKop = Math.max(0, input.pointsRedeemedKop ?? 0), certRedeemedKop = Math.max(0, input.certificateRedeemedKop ?? 0), excludedKop = Math.max(0, input.excludedFromAccrualKop ?? 0);
	const totalDeductionsKop = discountKop + pointsRedeemedKop + certRedeemedKop;
	const paidOutOfPocketKop = Math.max(0, input.grossInvoiceKop - totalDeductionsKop), eligibleBaseKop = Math.max(0, paidOutOfPocketKop - excludedKop);
	const tier = getTierDefinition(input.tierId), cashbackPercent = input.customCashbackPercent ?? tier.cashbackPercent;
	const accruedPointsKop = Math.round((eligibleBaseKop * cashbackPercent) / 100);
	return { grossInvoiceKop: input.grossInvoiceKop, totalDeductionsKop, paidOutOfPocketKop, excludedFromAccrualKop: excludedKop, eligibleBaseKop, cashbackPercent, accruedPointsKop, accruedPointsRub: Math.round(accruedPointsKop / 100), tierId: tier.id, tierNameRu: tier.nameRu };
}

export interface LoyaltyRedemptionInput {
	readonly grossInvoiceKop: number; readonly discountKop?: number; readonly excludedFromRedemptionKop?: number; readonly availablePointsBalanceRub: number; readonly requestedPointsRub: number; readonly tierId: string; readonly isDoctorOverride?: boolean; readonly customMaxCoveragePercent?: number;
}
export interface LoyaltyRedemptionResult {
	readonly grossInvoiceKop: number; readonly discountKop: number; readonly excludedFromRedemptionKop: number; readonly redeemableBaseKop: number; readonly maxCoveragePercent: number; readonly maxAllowedRedemptionKop: number; readonly maxAllowedRedemptionRub: number; readonly requestedPointsRub: number; readonly requestedPointsKop: number; readonly actualRedeemedPointsRub: number; readonly actualRedeemedPointsKop: number; readonly remainingPointsBalanceRub: number; readonly remainingPayableKop: number; readonly remainingPayableRub: number; readonly isMaxLimitReached: boolean; readonly isDoctorOverride?: boolean; readonly isExcludedItemsPresent: boolean; readonly fiscal54FzSplit: CashboxFiscalSplitResult;
}

export function calculateLoyaltyRedemption(input: LoyaltyRedemptionInput): LoyaltyRedemptionResult {
	const discountKop = Math.max(0, input.discountKop ?? 0), excludedKop = Math.max(0, input.excludedFromRedemptionKop ?? 0);
	const totalAfterDiscountKop = Math.max(0, input.grossInvoiceKop - discountKop), redeemableBaseKop = Math.max(0, totalAfterDiscountKop - excludedKop);
	const tier = getTierDefinition(input.tierId), maxCoveragePercent = input.isDoctorOverride ? 100 : (input.customMaxCoveragePercent ?? tier.maxInvoiceCoveragePercent);
	const maxAllowedRedemptionKop = Math.min(redeemableBaseKop, Math.round((redeemableBaseKop * maxCoveragePercent) / 100)), maxAllowedRedemptionRub = Math.floor(maxAllowedRedemptionKop / 100);
	const availablePointsKop = Math.max(0, Math.round(input.availablePointsBalanceRub * 100)), requestedPointsKop = Math.max(0, Math.round(input.requestedPointsRub * 100));
	const actualRedeemedPointsKop = Math.min(availablePointsKop, requestedPointsKop, maxAllowedRedemptionKop), actualRedeemedPointsRub = actualRedeemedPointsKop / 100;
	const remainingPointsBalanceRub = Math.max(0, input.availablePointsBalanceRub - actualRedeemedPointsRub), remainingPayableKop = Math.max(0, totalAfterDiscountKop - actualRedeemedPointsKop);
	const fiscal54FzSplit: CashboxFiscalSplitResult = { tag1031CashKop: 0, tag1081ElectronicCardKop: remainingPayableKop, tag1215AdvancePrepaymentBonusKop: actualRedeemedPointsKop, tag1043DiscountKop: discountKop, totalGrossKop: input.grossInvoiceKop, totalNetPayableKop: remainingPayableKop };
	return {
		grossInvoiceKop: input.grossInvoiceKop, discountKop, excludedFromRedemptionKop: excludedKop, redeemableBaseKop, maxCoveragePercent, maxAllowedRedemptionKop, maxAllowedRedemptionRub, requestedPointsRub: input.requestedPointsRub, requestedPointsKop, actualRedeemedPointsRub, actualRedeemedPointsKop, remainingPointsBalanceRub, remainingPayableKop, remainingPayableRub: remainingPayableKop / 100, isMaxLimitReached: requestedPointsKop > actualRedeemedPointsKop && actualRedeemedPointsKop === maxAllowedRedemptionKop, isDoctorOverride: input.isDoctorOverride, isExcludedItemsPresent: excludedKop > 0, fiscal54FzSplit,
	};
}

export interface FamilyMember {
	readonly patientId: string; readonly fullName: string; readonly roleRu: string; readonly individualPointsBalance: number; readonly lifetimeSpentKop: number; readonly isBonusSpendingAllowed: boolean;
}
export interface FamilyPoolBalanceResult {
	readonly familyGroupId: string; readonly familyName: string; readonly memberCount: number; readonly totalPooledPoints: number; readonly totalFamilyLifetimeSpentKop: number; readonly totalFamilyLifetimeSpentRub: number; readonly effectiveTier: LoyaltyTierDefinition; readonly members: readonly FamilyMember[];
}
export type FamilyPool = FamilyPoolBalanceResult;

export function calculateFamilyPoolBalance(familyGroupId: string, familyName: string, members: readonly FamilyMember[]): FamilyPoolBalanceResult {
	let totalPooledPoints = 0, totalFamilyLifetimeSpentKop = 0;
	for (const m of members) { totalPooledPoints += m.individualPointsBalance; totalFamilyLifetimeSpentKop += m.lifetimeSpentKop; }
	const effectiveTier = totalFamilyLifetimeSpentKop >= 40000000 ? (LOYALTY_TIER_PRESETS.find((t) => t.id === "platinum") ?? LOYALTY_TIER_PRESETS[0]!) : (LOYALTY_TIER_PRESETS.find((t) => t.id === "family") ?? LOYALTY_TIER_PRESETS[0]!);
	return { familyGroupId, familyName, memberCount: members.length, totalPooledPoints, totalFamilyLifetimeSpentKop, totalFamilyLifetimeSpentRub: totalFamilyLifetimeSpentKop / 100, effectiveTier, members };
}

export interface DebitFamilySharedBalanceInput {
	readonly familyGroupId: string; readonly familyName: string; readonly sponsorPatientId: string; readonly sponsorFullName: string; readonly targetPatientId: string; readonly targetPatientName: string; readonly targetRoleRu: string; readonly invoiceAmountKop: number; readonly availableFamilyPointsRub: number; readonly requestedPointsRub?: number; readonly maxCoveragePercent?: number; readonly allowFullCoverage?: boolean; readonly staffNameRu?: string; readonly timestampIso?: string;
}
export interface DebitFamilySharedBalanceResult {
	readonly success: boolean; readonly familyGroupId: string; readonly sponsorPatientId: string; readonly sponsorFullName: string; readonly targetPatientId: string; readonly targetPatientName: string; readonly targetRoleRu: string; readonly invoiceAmountKop: number; readonly invoiceAmountRub: number; readonly maxAllowedRedemptionRub: number; readonly debitedPointsRub: number; readonly debitedPointsKop: number; readonly remainingFamilyBalanceRub: number; readonly remainingInvoiceDueKop: number; readonly remainingInvoiceDueRub: number; readonly isOneWalletTransferFree: true; readonly fiscal54FzSplit: CashboxFiscalSplitResult; readonly ledgerEntry: LoyaltyLedgerEntry; readonly messageRu: string; readonly errorMessageRu?: string;
}

export function debitFamilySharedBalance(input: DebitFamilySharedBalanceInput): DebitFamilySharedBalanceResult {
	const invoiceAmountKop = Math.max(0, input.invoiceAmountKop), invoiceAmountRub = invoiceAmountKop / 100, availablePointsRub = Math.max(0, input.availableFamilyPointsRub);
	const coveragePercent = input.allowFullCoverage ? 100 : (input.maxCoveragePercent ?? 30), maxCoverageRub = Math.floor((invoiceAmountRub * coveragePercent) / 100);
	const maxAllowedRedemptionRub = Math.min(availablePointsRub, maxCoverageRub), requestedRub = input.requestedPointsRub !== undefined ? Math.max(0, input.requestedPointsRub) : maxAllowedRedemptionRub;
	const debitedPointsRub = Math.min(requestedRub, maxAllowedRedemptionRub), debitedPointsKop = Math.round(debitedPointsRub * 100);
	const remainingFamilyBalanceRub = Math.max(0, availablePointsRub - debitedPointsRub), remainingInvoiceDueKop = Math.max(0, invoiceAmountKop - debitedPointsKop);
	const timestampIso = input.timestampIso ?? new Date().toLocaleString("ru-RU");
	const fiscal54FzSplit: CashboxFiscalSplitResult = { tag1031CashKop: 0, tag1081ElectronicCardKop: remainingInvoiceDueKop, tag1215AdvancePrepaymentBonusKop: debitedPointsKop, tag1043DiscountKop: 0, totalGrossKop: invoiceAmountKop, totalNetPayableKop: remainingInvoiceDueKop };
	const ledgerEntry: LoyaltyLedgerEntry = {
		id: `fam-tx-${Date.now().toString().slice(-4)}`, timestampIso, patientId: input.targetPatientId, patientName: input.targetPatientName, medicalCardNumber: "", operationType: "redemption", operationTypeRu: "Оплата с семейного баланса", invoiceAmountKop, pointsDeltaRub: -debitedPointsRub, balanceAfterRub: remainingFamilyBalanceRub, paymentMethodRu: "Семейный баланс (1 кошелек)", staffNameRu: input.staffNameRu ?? "Администратор / Касса", noteRu: `Оплата лечения за: ${input.targetPatientName} (${input.targetRoleRu}) из семейного кошелька «${input.familyName}» (Плательщик: ${input.sponsorFullName})`,
	};
	const messageRu = debitedPointsRub > 0 ? `Списано ${debitedPointsRub} бонусов с семейного баланса за пациента «${input.targetPatientName}». К доплате: ${(remainingInvoiceDueKop / 100).toLocaleString("ru-RU")} ₽` : `Семейный баланс не списан (доступно 0 ₽ или счет оплачен).`;
	return { success: debitedPointsRub > 0 || invoiceAmountKop === 0, familyGroupId: input.familyGroupId, sponsorPatientId: input.sponsorPatientId, sponsorFullName: input.sponsorFullName, targetPatientId: input.targetPatientId, targetPatientName: input.targetPatientName, targetRoleRu: input.targetRoleRu, invoiceAmountKop, invoiceAmountRub, maxAllowedRedemptionRub, debitedPointsRub, debitedPointsKop, remainingFamilyBalanceRub, remainingInvoiceDueKop, remainingInvoiceDueRub: remainingInvoiceDueKop / 100, isOneWalletTransferFree: true, fiscal54FzSplit, ledgerEntry, messageRu };
}

export interface CreditFamilySharedBalanceInput {
	readonly familyGroupId: string; readonly familyName: string; readonly payerPatientId: string; readonly payerFullName: string; readonly currentFamilyBalanceRub: number; readonly amountToAddRub: number; readonly reasonRu?: string; readonly staffNameRu?: string;
}
export interface CreditFamilySharedBalanceResult {
	readonly familyGroupId: string; readonly payerPatientId: string; readonly payerFullName: string; readonly creditedPointsRub: number; readonly newFamilyBalanceRub: number; readonly ledgerEntry: LoyaltyLedgerEntry; readonly messageRu: string;
}

export function creditFamilySharedBalance(input: CreditFamilySharedBalanceInput): CreditFamilySharedBalanceResult {
	const amountToAddRub = Math.max(0, input.amountToAddRub), newFamilyBalanceRub = input.currentFamilyBalanceRub + amountToAddRub, timestampIso = new Date().toLocaleString("ru-RU");
	const ledgerEntry: LoyaltyLedgerEntry = {
		id: `fam-cr-${Date.now().toString().slice(-4)}`, timestampIso, patientId: input.payerPatientId, patientName: input.payerFullName, medicalCardNumber: "", operationType: "accrual", operationTypeRu: "Пополнение семейного баланса", invoiceAmountKop: 0, pointsDeltaRub: amountToAddRub, balanceAfterRub: newFamilyBalanceRub, paymentMethodRu: "Пополнение семейного кошелька", staffNameRu: input.staffNameRu ?? "Администратор", noteRu: input.reasonRu ?? `Пополнение общего семейного счета «${input.familyName}» плательщиком ${input.payerFullName}`,
	};
	return { familyGroupId: input.familyGroupId, payerPatientId: input.payerPatientId, payerFullName: input.payerFullName, creditedPointsRub: amountToAddRub, newFamilyBalanceRub, ledgerEntry, messageRu: `Семейный баланс «${input.familyName}» пополнен на ${amountToAddRub.toLocaleString("ru-RU")} ₽. Доступно: ${newFamilyBalanceRub.toLocaleString("ru-RU")} ₽` };
}

export interface GiftCertificate {
	readonly id: string; readonly serialNumber: string; readonly nominalRub: number; readonly initialBalanceKop: number; readonly currentBalanceKop: number; readonly status: "active" | "depleted" | "expired" | "cancelled"; readonly issuedAtIso: string; readonly expiresAtIso: string; readonly recipientName?: string; readonly noteRu?: string;
}
export interface GiftCertificatePreset {
	readonly id: string; readonly nominalKop: number; readonly nominalRub: number; readonly titleRu: string; readonly validityDays: number; readonly isCustomNominal: boolean; readonly badgeRu: string; readonly descriptionRu: string;
}

export const GIFT_CERTIFICATE_CATALOG: readonly GiftCertificatePreset[] = [
	{ id: "cert_5k", nominalKop: 500000, nominalRub: 5000, titleRu: "Подарочный сертификат 5 000 ₽", validityDays: 365, isCustomNominal: false, badgeRu: "Популярный подарок", descriptionRu: "Для профессиональной гигиены или отбеливания." },
	{ id: "cert_10k", nominalKop: 1000000, nominalRub: 10000, titleRu: "Подарочный сертификат 10 000 ₽", validityDays: 365, isCustomNominal: false, badgeRu: "Терапия и эстетика", descriptionRu: "Терапевтическое лечение кариеса и реставрация." },
	{ id: "cert_25k", nominalKop: 2500000, nominalRub: 25000, titleRu: "Подарочный сертификат 25 000 ₽", validityDays: 365, isCustomNominal: false, badgeRu: "Премиум уход", descriptionRu: "Комплексная санация, коронки E.max или ортодонтия." },
	{ id: "cert_50k", nominalKop: 5000000, nominalRub: 50000, titleRu: "Подарочный сертификат 50 000 ₽", validityDays: 365, isCustomNominal: false, badgeRu: "VIP / Комплекс", descriptionRu: "Для дентальной имплантации и элайнеров." },
	{ id: "cert_custom", nominalKop: 0, nominalRub: 0, titleRu: "Сертификат со свободным номиналом", validityDays: 365, isCustomNominal: true, badgeRu: "Индивидуальный", descriptionRu: "Сумма сертификата указывается на кассе." },
];

export function generateGiftCertificateSerial(randomSeed?: number): string {
	const prefix = "7701"; let digits = prefix, cryptoBytes: Uint8Array | null = null;
	if (randomSeed === undefined && typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		cryptoBytes = new Uint8Array(11); crypto.getRandomValues(cryptoBytes);
	}
	for (let i = 0; i < 11; i++) {
		const rand = randomSeed !== undefined ? (randomSeed * (i + 1) * 7) % 10 : cryptoBytes ? cryptoBytes[i]! % 10 : Math.abs(((Date.now() + i * 17) ^ (i * 31)) % 10);
		digits += rand.toString();
	}
	let sum = 0;
	for (let i = 0; i < 15; i++) {
		let d = parseInt(digits[i]!, 10); if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; } sum += d;
	}
	digits += ((10 - (sum % 10)) % 10).toString();
	return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
}

export function validateGiftCertificateSerial(formattedSerial: string): boolean {
	const cleaned = formattedSerial.replace(/[\s-]/g, "");
	if (!/^\d{16}$/.test(cleaned)) return false;
	let sum = 0;
	for (let i = 0; i < 16; i++) {
		let d = parseInt(cleaned[i]!, 10); if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; } sum += d;
	}
	return sum % 10 === 0;
}

export interface GiftCertificateRedemptionResult {
	readonly success: boolean; readonly certificateId: string; readonly serialNumber: string; readonly previousBalanceKop: number; readonly redeemedAmountKop: number; readonly newBalanceKop: number; readonly coveredInvoiceAmountKop: number; readonly remainingInvoiceAmountKop: number; readonly newStatus: "active" | "depleted" | "expired" | "cancelled"; readonly errorMessageRu?: string;
}

export function redeemGiftCertificate(certificate: GiftCertificate, invoiceAmountKop: number, currentDateIso: string = new Date().toISOString().slice(0, 10)): GiftCertificateRedemptionResult {
	if (!validateGiftCertificateSerial(certificate.serialNumber)) return { success: false, certificateId: certificate.id, serialNumber: certificate.serialNumber, previousBalanceKop: certificate.currentBalanceKop, redeemedAmountKop: 0, newBalanceKop: certificate.currentBalanceKop, coveredInvoiceAmountKop: 0, remainingInvoiceAmountKop: invoiceAmountKop, newStatus: certificate.status, errorMessageRu: "Недействительный номер сертификата (ошибка контрольной суммы)" };
	if (certificate.status === "depleted") return { success: false, certificateId: certificate.id, serialNumber: certificate.serialNumber, previousBalanceKop: 0, redeemedAmountKop: 0, newBalanceKop: 0, coveredInvoiceAmountKop: 0, remainingInvoiceAmountKop: invoiceAmountKop, newStatus: "depleted", errorMessageRu: "Баланс сертификата полностью исчерпан" };
	if (certificate.status === "cancelled") return { success: false, certificateId: certificate.id, serialNumber: certificate.serialNumber, previousBalanceKop: certificate.currentBalanceKop, redeemedAmountKop: 0, newBalanceKop: certificate.currentBalanceKop, coveredInvoiceAmountKop: 0, remainingInvoiceAmountKop: invoiceAmountKop, newStatus: "cancelled", errorMessageRu: "Сертификат аннулирован администрацией клиники" };
	if (currentDateIso > certificate.expiresAtIso) return { success: false, certificateId: certificate.id, serialNumber: certificate.serialNumber, previousBalanceKop: certificate.currentBalanceKop, redeemedAmountKop: 0, newBalanceKop: certificate.currentBalanceKop, coveredInvoiceAmountKop: 0, remainingInvoiceAmountKop: invoiceAmountKop, newStatus: "expired", errorMessageRu: `Срок действия сертификата истек ${certificate.expiresAtIso}` };
	const redeemedAmountKop = Math.min(certificate.currentBalanceKop, Math.max(0, invoiceAmountKop));
	const newBalanceKop = certificate.currentBalanceKop - redeemedAmountKop;
	return { success: true, certificateId: certificate.id, serialNumber: certificate.serialNumber, previousBalanceKop: certificate.currentBalanceKop, redeemedAmountKop, newBalanceKop, coveredInvoiceAmountKop: redeemedAmountKop, remainingInvoiceAmountKop: Math.max(0, invoiceAmountKop - redeemedAmountKop), newStatus: newBalanceKop === 0 ? "depleted" : "active" };
}

export interface ReferralRewardPreset {
	readonly id: string; readonly titleRu: string; readonly referrerRewardKop: number; readonly referrerRewardRub: number; readonly referredFriendDiscountKop: number; readonly referredFriendDiscountRub: number; readonly minFriendSpendKop: number; readonly descriptionRu: string; readonly minInvoiceSpendKop?: number; readonly referrerBonusKop?: number; readonly invitedDiscountKop?: number;
}

export const REFERRAL_HYGIENE_1000_PRESET: ReferralRewardPreset = {
	id: "ref_friend_hygiene_1000", titleRu: "Приведи друга — обоим по 1000 бонусов на чистку", referrerRewardKop: 100000, referrerRewardRub: 1000, referrerBonusKop: 100000, referredFriendDiscountKop: 100000, referredFriendDiscountRub: 1000, invitedDiscountKop: 100000, minFriendSpendKop: 250000, minInvoiceSpendKop: 250000, descriptionRu: "«Приведи друга — обоим по 1000 бонусов на чистку»: начисление 1 000 бонусов рекомендателю и 1 000 бонусов приглашенному другу на комплексную гигиену полости рта.",
};
export const DEFAULT_REFERRAL_PRESET: ReferralRewardPreset = {
	id: "ref_friend_standard", titleRu: "Привёл друга / Члена семьи", referrerRewardKop: 50000, referrerRewardRub: 500, referrerBonusKop: 50000, referredFriendDiscountKop: 50000, referredFriendDiscountRub: 500, invitedDiscountKop: 50000, minFriendSpendKop: 250000, minInvoiceSpendKop: 250000, descriptionRu: "Начисление 500 бонусов пациенту за приведённого первичного друга или родственника + 500 ₽ скидка другу на первый приём.",
};
export const REFERRAL_PROGRAM_PRESETS: readonly ReferralRewardPreset[] = [
	REFERRAL_HYGIENE_1000_PRESET, DEFAULT_REFERRAL_PRESET,
	{ id: "ref_family_premium", titleRu: "Семейная рекомендация (Имплантация / Ортопедия)", referrerRewardKop: 150000, referrerRewardRub: 1500, referredFriendDiscountKop: 150000, referredFriendDiscountRub: 1500, minFriendSpendKop: 1000000, descriptionRu: "Премиальное вознаграждение 1 500 бонусов при рекомендации комплексного хирургического или ортопедического лечения." },
];

export interface PatientReferralRecord {
	readonly id: string; readonly referrerPatientId: string; readonly referrerPatientName?: string; readonly referredPatientName?: string; readonly invitedPatientName?: string; readonly invitedPhone?: string; readonly status: "invited" | "visited" | "reward_credited" | "completed"; readonly statusRu?: string; readonly isRewardCredited?: boolean; readonly rewardedAtIso?: string; readonly rewardRub?: number; readonly rewardPreset?: ReferralRewardPreset; readonly firstVisitInvoiceKop?: number;
}

export function calculateReferralReward(inputOrKop: { friendInvoicePaidKop: number; minSpendKop?: number; customRewardKop?: number } | number, presetOverride?: ReferralRewardPreset) {
	const friendInvoicePaidKop = typeof inputOrKop === "number" ? inputOrKop : inputOrKop.friendInvoicePaidKop;
	const preset = presetOverride ?? DEFAULT_REFERRAL_PRESET, minSpend = typeof inputOrKop === "object" && inputOrKop.minSpendKop !== undefined ? inputOrKop.minSpendKop : preset.minFriendSpendKop;
	const referrerRewardKop = typeof inputOrKop === "object" && inputOrKop.customRewardKop !== undefined ? inputOrKop.customRewardKop : preset.referrerRewardKop;
	const invitedDiscountKop = preset.referredFriendDiscountKop, referrerBonusRub = Math.round(referrerRewardKop / 100), invitedDiscountRub = Math.round(invitedDiscountKop / 100);

	if (friendInvoicePaidKop < minSpend) {
		const missingSpendKop = minSpend - friendInvoicePaidKop;
		const explanationRu = `Сумма первого чека друга (${Math.round(friendInvoicePaidKop / 100)} ₽) не достигла порога (${Math.round(minSpend / 100)} ₽). Не хватает ${Math.round(missingSpendKop / 100)} ₽.`;
		return { isEligible: false, rewardKop: 0, rewardRub: 0, referrerBonusKop: 0, referrerBonusRub: 0, invitedDiscountKop: 0, invitedDiscountRub: 0, missingSpendKop, explanationRu, messageRu: explanationRu };
	}
	const explanationRu = `Условия рекомендации выполнены: начислено ${referrerBonusRub} ₽ бонусов рекомендателю и ${invitedDiscountRub} ₽ скидки другу.`;
	return { isEligible: true, rewardKop: referrerRewardKop, rewardRub: referrerBonusRub, referrerBonusKop: referrerRewardKop, referrerBonusRub, invitedDiscountKop, invitedDiscountRub, missingSpendKop: 0, explanationRu, messageRu: explanationRu };
}

export function creditReferralBonus(paramsOrReferral: { readonly currentBalanceRub: number; readonly referral: PatientReferralRecord; readonly staffNameRu?: string } | PatientReferralRecord, optionalBalanceRub?: number) {
	const isObjectParam = "referral" in paramsOrReferral, referral = isObjectParam ? paramsOrReferral.referral : paramsOrReferral;
	const currentBalanceRub = isObjectParam ? paramsOrReferral.currentBalanceRub : (optionalBalanceRub ?? 0);
	const bonusRub = referral.rewardRub ?? (referral.rewardPreset?.referrerRewardRub ?? 500), updatedBalanceRub = currentBalanceRub + bonusRub;
	const timestampIso = new Date().toLocaleString("ru-RU"), friendName = referral.referredPatientName || referral.invitedPatientName || "Приглашенный пациент";
	const updatedReferral: PatientReferralRecord = { ...referral, status: "reward_credited", statusRu: "Бонус начислен", isRewardCredited: true, rewardedAtIso: timestampIso };
	const ledgerEntry: LoyaltyLedgerEntry = {
		id: `ref-tx-${Date.now().toString().slice(-4)}`, timestampIso, patientId: referral.referrerPatientId, patientName: referral.referrerPatientName || "Пациент", medicalCardNumber: "", operationType: "referral_reward", operationTypeRu: "Бонус «Привёл друга»", invoiceAmountKop: referral.firstVisitInvoiceKop ?? 0, pointsDeltaRub: bonusRub, balanceAfterRub: updatedBalanceRub, paymentMethodRu: "Реферальная программа", staffNameRu: isObjectParam ? paramsOrReferral.staffNameRu ?? "Администратор" : "Администратор", noteRu: `Вознаграждение за рекомендацию: ${friendName}`,
	};
	return { updatedBalanceRub, newBalanceRub: updatedBalanceRub, updatedReferral, ledgerEntry, bonusRub };
}

export interface PromoCodePreset {
	readonly code: string; readonly titleRu: string; readonly discountType: "percentage" | "fixed_rub" | "welcome_bonus_points"; readonly value: number; readonly minInvoiceAmountKop: number; readonly applicableCategories: readonly string[]; readonly excludedServiceCodes: readonly string[]; readonly descriptionRu: string; readonly validityLabelRu: string;
}

export const PROMO_CODE_PRESETS: readonly PromoCodePreset[] = [
	{ code: "HYGIENE15", titleRu: "Сезонная гигиена -15%", discountType: "percentage", value: 15, minInvoiceAmountKop: 400000, applicableCategories: ["hygiene"], excludedServiceCodes: ["A16.07.051"], descriptionRu: "Скидка 15% на комплексную чистку зубов ультразвуком и Air-Flow.", validityLabelRu: "Действует до конца текущего месяца" },
	{ code: "FIRST20", titleRu: "Первичный прием терапевта -20%", discountType: "percentage", value: 20, minInvoiceAmountKop: 300000, applicableCategories: ["therapy", "consultation"], excludedServiceCodes: [], descriptionRu: "Скидка 20% на первичную консультацию и первое лечение кариеса новому пациенту.", validityLabelRu: "Только для новых пациентов клиники" },
	{ code: "BIRTHDAY1000", titleRu: "День рождения (+1 000 бонусов)", discountType: "welcome_bonus_points", value: 1000, minInvoiceAmountKop: 0, applicableCategories: ["all"], excludedServiceCodes: [], descriptionRu: "Подарок 1 000 бонусных рублей к дню рождения пациента (активны 30 дней).", validityLabelRu: "Начисляется за 7 дней до ДР, действует 30 дней" },
	{ code: "IMPLANT5000", titleRu: "Имплантация Nobel/Osstem (-5 000 ₽)", discountType: "fixed_rub", value: 5000, minInvoiceAmountKop: 4500000, applicableCategories: ["surgery", "implantology"], excludedServiceCodes: [], descriptionRu: "Фиксированная скидка 5 000 ₽ при установке дентального имплантата.", validityLabelRu: "При установке от 1 имплантата" },
];

export function evaluatePromoCode(code: string, invoiceAmountKop: number, serviceCategories: readonly string[] = ["therapy"], serviceCodes: readonly string[] = []) {
	const normalizedCode = code.trim().toUpperCase(), preset = PROMO_CODE_PRESETS.find((p) => p.code.toUpperCase() === normalizedCode);
	if (!preset) return { isValid: false, code: normalizedCode, titleRu: "Промокод не найден", discountKop: 0, discountRub: 0, bonusPointsToAddRub: 0, finalPayableKop: invoiceAmountKop, messageRu: "Указанный промокод не зарегистрирован в маркетинговой системе клиники." };
	if (invoiceAmountKop < preset.minInvoiceAmountKop) return { isValid: false, code: preset.code, titleRu: preset.titleRu, discountKop: 0, discountRub: 0, bonusPointsToAddRub: 0, finalPayableKop: invoiceAmountKop, messageRu: `Минимальная сумма чека для применения акции: ${(preset.minInvoiceAmountKop / 100).toLocaleString("ru-RU")} ₽.`, promoCodePreset: preset };
	if (!preset.applicableCategories.includes("all") && !preset.applicableCategories.some((c) => serviceCategories.includes(c))) return { isValid: false, code: preset.code, titleRu: preset.titleRu, discountKop: 0, discountRub: 0, bonusPointsToAddRub: 0, finalPayableKop: invoiceAmountKop, messageRu: `Промокод «${preset.code}» применим только к услугам категорий: ${preset.applicableCategories.join(", ")}.`, promoCodePreset: preset };
	if (preset.excludedServiceCodes.some((ex) => serviceCodes.includes(ex))) return { isValid: false, code: preset.code, titleRu: preset.titleRu, discountKop: 0, discountRub: 0, bonusPointsToAddRub: 0, finalPayableKop: invoiceAmountKop, messageRu: "В счете присутствуют позиции, исключенные из данной маркетинговой акции.", promoCodePreset: preset };
	let discountKop = 0, bonusPointsToAddRub = 0;
	if (preset.discountType === "percentage") discountKop = Math.round((invoiceAmountKop * preset.value) / 100);
	else if (preset.discountType === "fixed_rub") discountKop = Math.min(invoiceAmountKop, preset.value * 100);
	else if (preset.discountType === "welcome_bonus_points") bonusPointsToAddRub = preset.value;
	return { isValid: true, code: preset.code, titleRu: preset.titleRu, discountKop, discountRub: discountKop / 100, bonusPointsToAddRub, finalPayableKop: Math.max(0, invoiceAmountKop - discountKop), messageRu: preset.descriptionRu, promoCodePreset: preset };
}

export interface LoyaltyExclusionRule {
	readonly id: string; readonly categoryNameRu: string; readonly isExcludedFromBonusRedemption: boolean; readonly isExcludedFromBonusAccrual: boolean; readonly reasonRu: string;
}

export const LOYALTY_EXCLUSION_RULES: readonly LoyaltyExclusionRule[] = [
	{ id: "excl_lab", categoryNameRu: "Лабораторные расходы зуботехника (CAD/CAM, цирконий, E.max)", isExcludedFromBonusRedemption: true, isExcludedFromBonusAccrual: false, reasonRu: "Прямые затраты на стороннюю лабораторию не могут компенсироваться бонусами клиники." },
	{ id: "excl_implant_hardware", categoryNameRu: "Титановые имплантаты и абатменты (Nobel, Straumann, Osstem)", isExcludedFromBonusRedemption: true, isExcludedFromBonusAccrual: false, reasonRu: "Стоимость закупки титанового винта и формирователя десны исключается из базы списания баллов." },
	{ id: "excl_promo_bundle", categoryNameRu: "Услуги по спецпредложениям и акционным пакетам", isExcludedFromBonusRedemption: true, isExcludedFromBonusAccrual: false, reasonRu: "Скидка по акции и оплата бонусами не суммируются на одну и ту же позицию прейскуранта." },
	{ id: "excl_retail_oral_care", categoryNameRu: "Аптечная витрина и товары для домашней гигиены (Curaprox, Marvis)", isExcludedFromBonusRedemption: false, isExcludedFromBonusAccrual: true, reasonRu: "За покупку зубных щеток и паст бонусы не начисляются ввиду минимальной торговой наценки." },
];

export const QUICK_REDEMPTION_PRESETS_RUB: readonly number[] = [500, 1000, 2000, 5000];

export interface LoyaltyLedgerEntry {
	readonly id: string; readonly timestampIso: string; readonly patientId: string; readonly patientName: string; readonly medicalCardNumber?: string; readonly operationType: string; readonly operationTypeRu: string; readonly invoiceAmountKop: number; readonly pointsDeltaRub: number; readonly balanceAfterRub: number; readonly paymentMethodRu?: string; readonly fiscalReceiptNumber?: string; readonly staffNameRu?: string; readonly noteRu?: string;
}

export function exportLoyaltyLedgerToCsv(entries: readonly LoyaltyLedgerEntry[]): string {
	const BOM = "\uFEFF", headers = ["ID операции", "Дата и время", "Пациент", "Номер медкарты", "Тип операции", "Сумма счета (руб)", "Изменение баллов (+/-)", "Баланс баллов после", "Способ оплаты", "Кассовый чек", "Сотрудник / Кассир", "Примечание"];
	function escapeCsv(value: string | number | undefined | null): string {
		if (value === undefined || value === null) return '""';
		return `"${String(value).replace(/"/g, '""')}"`;
	}
	const rows: string[] = [headers.map((h) => `"${h}"`).join(";")];
	for (const entry of entries) {
		const invoiceRub = (entry.invoiceAmountKop / 100).toFixed(2), deltaStr = entry.pointsDeltaRub > 0 ? `+${entry.pointsDeltaRub}` : `${entry.pointsDeltaRub}`;
		rows.push([escapeCsv(entry.id), escapeCsv(entry.timestampIso), escapeCsv(entry.patientName), escapeCsv(entry.medicalCardNumber), escapeCsv(entry.operationTypeRu), escapeCsv(invoiceRub), escapeCsv(deltaStr), escapeCsv(entry.balanceAfterRub.toFixed(0)), escapeCsv(entry.paymentMethodRu), escapeCsv(entry.fiscalReceiptNumber ?? "—"), escapeCsv(entry.staffNameRu), escapeCsv(entry.noteRu)].join(";"));
	}
	return BOM + rows.join("\r\n");
}
