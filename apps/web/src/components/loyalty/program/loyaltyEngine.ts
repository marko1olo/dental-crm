/**
 * DENTE Dental CRM — Statutory Dental Loyalty, Bonus & Gift Certificate Math Engine
 * Kopeck-Exact Financial Math, 54-FZ Fiscal Receipt Split, Luhn 16-Digit Certificate Serials,
 * Family Balance Pooling, Promo Code Evaluator & RFC 4180 UTF-8 CSV Ledger.
 */

import {
	LOYALTY_TIER_PRESETS,
	GIFT_CERTIFICATE_CATALOG,
	PROMO_CODE_PRESETS,
	LOYALTY_EXCLUSION_RULES,
	type LoyaltyTierId,
	type LoyaltyTierDefinition,
	type GiftCertificatePreset,
	type PromoCodePreset,
} from "./loyaltyPresets";

export interface LoyaltyAccrualInput {
	readonly grossInvoiceKop: number;
	readonly discountKop?: number;
	readonly pointsRedeemedKop?: number;
	readonly certificateRedeemedKop?: number;
	readonly excludedFromAccrualKop?: number;
	readonly tierId: LoyaltyTierId;
	readonly customCashbackPercent?: number;
}

export interface LoyaltyAccrualResult {
	readonly grossInvoiceKop: number;
	readonly totalDeductionsKop: number;
	readonly paidOutOfPocketKop: number;
	readonly excludedFromAccrualKop: number;
	readonly eligibleBaseKop: number;
	readonly cashbackPercent: number;
	readonly accruedPointsKop: number; // in kopecks (e.g. 15000 = 150.00 pts)
	readonly accruedPointsRub: number; // rounded to nearest whole point / ruble for display
	readonly tierId: LoyaltyTierId;
	readonly tierNameRu: string;
}

export interface LoyaltyRedemptionInput {
	readonly grossInvoiceKop: number;
	readonly discountKop?: number;
	readonly excludedFromRedemptionKop?: number;
	readonly availablePointsBalanceRub: number;
	readonly requestedPointsRub: number;
	readonly tierId: LoyaltyTierId;
	readonly customMaxCoveragePercent?: number;
}

export interface Fiscal54FzSplitResult {
	readonly tag1031CashKop: number;
	readonly tag1081ElectronicCardKop: number;
	readonly tag1215AdvancePrepaymentBonusKop: number; // Иные формы оплаты / зачет аванса (бонусы)
	readonly tag1043DiscountKop: number;
	readonly totalGrossKop: number;
	readonly totalNetPayableKop: number;
}

export interface LoyaltyRedemptionResult {
	readonly grossInvoiceKop: number;
	readonly discountKop: number;
	readonly excludedFromRedemptionKop: number;
	readonly redeemableBaseKop: number;
	readonly maxCoveragePercent: number;
	readonly maxAllowedRedemptionKop: number;
	readonly maxAllowedRedemptionRub: number;
	readonly requestedPointsRub: number;
	readonly requestedPointsKop: number;
	readonly actualRedeemedPointsRub: number;
	readonly actualRedeemedPointsKop: number;
	readonly remainingPointsBalanceRub: number;
	readonly remainingPayableKop: number;
	readonly remainingPayableRub: number;
	readonly isMaxLimitReached: boolean;
	readonly isExcludedItemsPresent: boolean;
	readonly fiscal54FzSplit: Fiscal54FzSplitResult;
}

export interface TierProgressionResult {
	readonly currentTier: LoyaltyTierDefinition;
	readonly nextTier: LoyaltyTierDefinition | null;
	readonly lifetimeSpentKop: number;
	readonly lifetimeSpentRub: number;
	readonly progressPercent: number;
	readonly remainingToNextTierKop: number;
	readonly remainingToNextTierRub: number;
}

export interface GiftCertificate {
	readonly id: string;
	readonly serialNumber: string; // 16-digit formatted e.g. "7701-4829-1054-9218"
	readonly nominalKop: number;
	readonly initialBalanceKop: number;
	readonly currentBalanceKop: number;
	readonly status: "active" | "depleted" | "expired" | "cancelled";
	readonly issuedAtIso: string;
	readonly expiresAtIso: string;
	readonly recipientName?: string;
	readonly recipientPhone?: string;
	readonly buyerPatientId?: string;
	readonly buyerPatientName?: string;
	readonly note?: string;
}

export interface GiftCertificateRedemptionResult {
	readonly success: boolean;
	readonly certificateId: string;
	readonly serialNumber: string;
	readonly previousBalanceKop: number;
	readonly redeemedAmountKop: number;
	readonly newBalanceKop: number;
	readonly coveredInvoiceAmountKop: number;
	readonly remainingInvoiceAmountKop: number;
	readonly newStatus: "active" | "depleted" | "expired" | "cancelled";
	readonly errorMessageRu?: string;
}

export interface FamilyMember {
	readonly patientId: string;
	readonly fullName: string;
	readonly roleRu: "Глава семьи" | "Супруг / Супруга" | "Ребенок" | "Родитель" | "Родственник";
	readonly birthDateIso?: string;
	readonly individualPointsBalance: number;
	readonly lifetimeSpentKop: number;
	readonly isBonusSpendingAllowed: boolean;
}

export interface FamilyPoolBalanceResult {
	readonly familyGroupId: string;
	readonly familyName: string;
	readonly memberCount: number;
	readonly totalPooledPoints: number;
	readonly totalFamilyLifetimeSpentKop: number;
	readonly totalFamilyLifetimeSpentRub: number;
	readonly effectiveTier: LoyaltyTierDefinition;
	readonly members: readonly FamilyMember[];
}

export interface LoyaltyLedgerEntry {
	readonly id: string;
	readonly timestampIso: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly operationType: "accrual" | "redemption" | "certificate_purchase" | "certificate_redemption" | "welcome_bonus" | "birthday_bonus" | "manual_adjustment" | "expiry";
	readonly operationTypeRu: string;
	readonly invoiceAmountKop: number;
	readonly pointsDeltaRub: number; // positive for accrual, negative for redemption
	readonly balanceAfterRub: number;
	readonly paymentMethodRu: string;
	readonly fiscalReceiptNumber?: string;
	readonly staffNameRu: string;
	readonly noteRu: string;
}

export interface PromoCodeEvaluationResult {
	readonly isValid: boolean;
	readonly code: string;
	readonly titleRu: string;
	readonly discountKop: number;
	readonly discountRub: number;
	readonly bonusPointsToAddRub: number;
	readonly finalPayableKop: number;
	readonly messageRu: string;
	readonly promoCodePreset?: PromoCodePreset;
}

/**
 * Helper to retrieve tier definition by id
 */
export function getTierDefinition(tierId: LoyaltyTierId): LoyaltyTierDefinition {
	const found = LOYALTY_TIER_PRESETS.find((t) => t.id === tierId);
	return found ?? LOYALTY_TIER_PRESETS[0]!;
}

/**
 * 1. Calculates kopeck-exact bonus accrual on paid invoice
 */
export function calculateLoyaltyAccrual(input: LoyaltyAccrualInput): LoyaltyAccrualResult {
	const discountKop = Math.max(0, input.discountKop ?? 0);
	const pointsRedeemedKop = Math.max(0, input.pointsRedeemedKop ?? 0);
	const certRedeemedKop = Math.max(0, input.certificateRedeemedKop ?? 0);
	const excludedKop = Math.max(0, input.excludedFromAccrualKop ?? 0);

	const totalDeductionsKop = discountKop + pointsRedeemedKop + certRedeemedKop;
	const paidOutOfPocketKop = Math.max(0, input.grossInvoiceKop - totalDeductionsKop);
	const eligibleBaseKop = Math.max(0, paidOutOfPocketKop - excludedKop);

	const tier = getTierDefinition(input.tierId);
	const cashbackPercent = input.customCashbackPercent ?? tier.cashbackPercent;

	const accruedPointsKop = Math.round((eligibleBaseKop * cashbackPercent) / 100);
	const accruedPointsRub = Math.round(accruedPointsKop / 100);

	return {
		grossInvoiceKop: input.grossInvoiceKop,
		totalDeductionsKop,
		paidOutOfPocketKop,
		excludedFromAccrualKop: excludedKop,
		eligibleBaseKop,
		cashbackPercent,
		accruedPointsKop,
		accruedPointsRub,
		tierId: tier.id,
		tierNameRu: tier.nameRu,
	};
}

/**
 * 2. Calculates kopeck-exact bonus redemption with maximum coverage limits and 54-FZ split
 */
export function calculateLoyaltyRedemption(input: LoyaltyRedemptionInput): LoyaltyRedemptionResult {
	const discountKop = Math.max(0, input.discountKop ?? 0);
	const excludedKop = Math.max(0, input.excludedFromRedemptionKop ?? 0);

	const totalAfterDiscountKop = Math.max(0, input.grossInvoiceKop - discountKop);
	const redeemableBaseKop = Math.max(0, totalAfterDiscountKop - excludedKop);

	const tier = getTierDefinition(input.tierId);
	const maxCoveragePercent = input.customMaxCoveragePercent ?? tier.maxInvoiceCoveragePercent;

	// Calculate maximum permissible points in kopecks
	const maxAllowedRedemptionKop = Math.min(
		redeemableBaseKop,
		Math.round((redeemableBaseKop * maxCoveragePercent) / 100)
	);
	const maxAllowedRedemptionRub = Math.floor(maxAllowedRedemptionKop / 100);

	const availablePointsKop = Math.max(0, Math.round(input.availablePointsBalanceRub * 100));
	const requestedPointsKop = Math.max(0, Math.round(input.requestedPointsRub * 100));

	const actualRedeemedPointsKop = Math.min(
		availablePointsKop,
		requestedPointsKop,
		maxAllowedRedemptionKop
	);
	const actualRedeemedPointsRub = actualRedeemedPointsKop / 100;

	const remainingPointsBalanceRub = Math.max(
		0,
		input.availablePointsBalanceRub - actualRedeemedPointsRub
	);
	const remainingPayableKop = Math.max(0, totalAfterDiscountKop - actualRedeemedPointsKop);
	const remainingPayableRub = remainingPayableKop / 100;

	const isMaxLimitReached =
		requestedPointsKop > actualRedeemedPointsKop &&
		actualRedeemedPointsKop === maxAllowedRedemptionKop;

	const isExcludedItemsPresent = excludedKop > 0;

	// 54-FZ Fiscal receipt split
	const fiscal54FzSplit: Fiscal54FzSplitResult = {
		tag1031CashKop: 0, // default split to electronic
		tag1081ElectronicCardKop: remainingPayableKop,
		tag1215AdvancePrepaymentBonusKop: actualRedeemedPointsKop,
		tag1043DiscountKop: discountKop,
		totalGrossKop: input.grossInvoiceKop,
		totalNetPayableKop: remainingPayableKop,
	};

	return {
		grossInvoiceKop: input.grossInvoiceKop,
		discountKop,
		excludedFromRedemptionKop: excludedKop,
		redeemableBaseKop,
		maxCoveragePercent,
		maxAllowedRedemptionKop,
		maxAllowedRedemptionRub,
		requestedPointsRub: input.requestedPointsRub,
		requestedPointsKop,
		actualRedeemedPointsRub,
		actualRedeemedPointsKop,
		remainingPointsBalanceRub,
		remainingPayableKop,
		remainingPayableRub,
		isMaxLimitReached,
		isExcludedItemsPresent,
		fiscal54FzSplit,
	};
}

/**
 * 3. Determines patient tier progression and next tier requirements
 */
export function calculateTierProgression(
	lifetimeSpentKop: number,
	isFamilyGroup: boolean = false
): TierProgressionResult {
	if (isFamilyGroup) {
		const familyTier = getTierDefinition("family");
		return {
			currentTier: familyTier,
			nextTier: getTierDefinition("platinum"),
			lifetimeSpentKop,
			lifetimeSpentRub: lifetimeSpentKop / 100,
			progressPercent: Math.min(100, Math.round((lifetimeSpentKop / 40000000) * 100)),
			remainingToNextTierKop: Math.max(0, 40000000 - lifetimeSpentKop),
			remainingToNextTierRub: Math.max(0, 40000000 - lifetimeSpentKop) / 100,
		};
	}

	const platinum = getTierDefinition("platinum");
	const gold = getTierDefinition("gold");
	const silver = getTierDefinition("silver");

	if (lifetimeSpentKop >= platinum.minLifetimeSpentKop) {
		return {
			currentTier: platinum,
			nextTier: null,
			lifetimeSpentKop,
			lifetimeSpentRub: lifetimeSpentKop / 100,
			progressPercent: 100,
			remainingToNextTierKop: 0,
			remainingToNextTierRub: 0,
		};
	}

	if (lifetimeSpentKop >= gold.minLifetimeSpentKop) {
		const span = platinum.minLifetimeSpentKop - gold.minLifetimeSpentKop;
		const progress = lifetimeSpentKop - gold.minLifetimeSpentKop;
		const pct = Math.min(100, Math.round((progress / span) * 100));
		return {
			currentTier: gold,
			nextTier: platinum,
			lifetimeSpentKop,
			lifetimeSpentRub: lifetimeSpentKop / 100,
			progressPercent: pct,
			remainingToNextTierKop: platinum.minLifetimeSpentKop - lifetimeSpentKop,
			remainingToNextTierRub: (platinum.minLifetimeSpentKop - lifetimeSpentKop) / 100,
		};
	}

	const span = gold.minLifetimeSpentKop;
	const pct = Math.min(100, Math.round((lifetimeSpentKop / span) * 100));
	return {
		currentTier: silver,
		nextTier: gold,
		lifetimeSpentKop,
		lifetimeSpentRub: lifetimeSpentKop / 100,
		progressPercent: pct,
		remainingToNextTierKop: gold.minLifetimeSpentKop - lifetimeSpentKop,
		remainingToNextTierRub: (gold.minLifetimeSpentKop - lifetimeSpentKop) / 100,
	};
}

/**
 * 4. Generates a 16-digit gift certificate serial number with Luhn check digit
 * Format: 7701-XXXX-XXXX-XXXC (7701 is Moscow Dental Clinic prefix)
 */
export function generateGiftCertificateSerial(randomSeed?: number): string {
	const prefix = "7701";
	let digits = prefix;

	for (let i = 0; i < 11; i++) {
		const rand = randomSeed !== undefined ? (randomSeed * (i + 1) * 7) % 10 : Math.floor(Math.random() * 10);
		digits += rand.toString();
	}

	// Compute Luhn checksum digit
	let sum = 0;
	for (let i = 0; i < 15; i++) {
		let d = parseInt(digits[i]!, 10);
		if (i % 2 === 0) {
			d *= 2;
			if (d > 9) d -= 9;
		}
		sum += d;
	}
	const checkDigit = (10 - (sum % 10)) % 10;
	digits += checkDigit.toString();

	// Format into 4-4-4-4
	return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
}

/**
 * Validates 16-digit gift certificate serial number using Luhn algorithm
 */
export function validateGiftCertificateSerial(formattedSerial: string): boolean {
	const cleaned = formattedSerial.replace(/[\s-]/g, "");
	if (!/^\d{16}$/.test(cleaned)) {
		return false;
	}

	let sum = 0;
	for (let i = 0; i < 16; i++) {
		let d = parseInt(cleaned[i]!, 10);
		if (i % 2 === 0) {
			d *= 2;
			if (d > 9) d -= 9;
		}
		sum += d;
	}
	return sum % 10 === 0;
}

/**
 * 5. Redeems a gift certificate for an invoice (partial or full)
 */
export function redeemGiftCertificate(
	certificate: GiftCertificate,
	invoiceAmountKop: number,
	currentDateIso: string = new Date().toISOString().slice(0, 10)
): GiftCertificateRedemptionResult {
	if (!validateGiftCertificateSerial(certificate.serialNumber)) {
		return {
			success: false,
			certificateId: certificate.id,
			serialNumber: certificate.serialNumber,
			previousBalanceKop: certificate.currentBalanceKop,
			redeemedAmountKop: 0,
			newBalanceKop: certificate.currentBalanceKop,
			coveredInvoiceAmountKop: 0,
			remainingInvoiceAmountKop: invoiceAmountKop,
			newStatus: certificate.status,
			errorMessageRu: "Недействительный номер сертификата (ошибка контрольной суммы)",
		};
	}

	if (certificate.status === "depleted") {
		return {
			success: false,
			certificateId: certificate.id,
			serialNumber: certificate.serialNumber,
			previousBalanceKop: 0,
			redeemedAmountKop: 0,
			newBalanceKop: 0,
			coveredInvoiceAmountKop: 0,
			remainingInvoiceAmountKop: invoiceAmountKop,
			newStatus: "depleted",
			errorMessageRu: "Баланс сертификата полностью исчерпан",
		};
	}

	if (certificate.status === "cancelled") {
		return {
			success: false,
			certificateId: certificate.id,
			serialNumber: certificate.serialNumber,
			previousBalanceKop: certificate.currentBalanceKop,
			redeemedAmountKop: 0,
			newBalanceKop: certificate.currentBalanceKop,
			coveredInvoiceAmountKop: 0,
			remainingInvoiceAmountKop: invoiceAmountKop,
			newStatus: "cancelled",
			errorMessageRu: "Сертификат аннулирован администрацией клиники",
		};
	}

	if (currentDateIso > certificate.expiresAtIso) {
		return {
			success: false,
			certificateId: certificate.id,
			serialNumber: certificate.serialNumber,
			previousBalanceKop: certificate.currentBalanceKop,
			redeemedAmountKop: 0,
			newBalanceKop: certificate.currentBalanceKop,
			coveredInvoiceAmountKop: 0,
			remainingInvoiceAmountKop: invoiceAmountKop,
			newStatus: "expired",
			errorMessageRu: `Срок действия сертификата истек ${certificate.expiresAtIso}`,
		};
	}

	const redeemedAmountKop = Math.min(certificate.currentBalanceKop, Math.max(0, invoiceAmountKop));
	const newBalanceKop = certificate.currentBalanceKop - redeemedAmountKop;
	const remainingInvoiceAmountKop = Math.max(0, invoiceAmountKop - redeemedAmountKop);
	const newStatus = newBalanceKop === 0 ? "depleted" : "active";

	return {
		success: true,
		certificateId: certificate.id,
		serialNumber: certificate.serialNumber,
		previousBalanceKop: certificate.currentBalanceKop,
		redeemedAmountKop,
		newBalanceKop,
		coveredInvoiceAmountKop: redeemedAmountKop,
		remainingInvoiceAmountKop,
		newStatus,
	};
}

/**
 * 6. Aggregates Family Group pooled bonus balance and metrics
 */
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
			? getTierDefinition("platinum")
			: getTierDefinition("family");

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

/**
 * 7. Evaluates promo codes against invoice amounts and category exclusions
 */
export function evaluatePromoCode(
	code: string,
	invoiceAmountKop: number,
	serviceCategories: readonly string[] = ["therapy"],
	serviceCodes: readonly string[] = []
): PromoCodeEvaluationResult {
	const normalizedCode = code.trim().toUpperCase();
	const preset = PROMO_CODE_PRESETS.find((p) => p.code.toUpperCase() === normalizedCode);

	if (!preset) {
		return {
			isValid: false,
			code: normalizedCode,
			titleRu: "Промокод не найден",
			discountKop: 0,
			discountRub: 0,
			bonusPointsToAddRub: 0,
			finalPayableKop: invoiceAmountKop,
			messageRu: "Указанный промокод не зарегистрирован в маркетинговой системе клиники.",
		};
	}

	// Check min amount
	if (invoiceAmountKop < preset.minInvoiceAmountKop) {
		const minRub = preset.minInvoiceAmountKop / 100;
		return {
			isValid: false,
			code: preset.code,
			titleRu: preset.titleRu,
			discountKop: 0,
			discountRub: 0,
			bonusPointsToAddRub: 0,
			finalPayableKop: invoiceAmountKop,
			messageRu: `Минимальная сумма чека для применения акции: ${minRub.toLocaleString("ru-RU")} ₽.`,
			promoCodePreset: preset,
		};
	}

	// Check category applicability
	const hasApplicableCategory =
		preset.applicableCategories.includes("all") ||
		preset.applicableCategories.some((cat) => serviceCategories.includes(cat));

	if (!hasApplicableCategory) {
		return {
			isValid: false,
			code: preset.code,
			titleRu: preset.titleRu,
			discountKop: 0,
			discountRub: 0,
			bonusPointsToAddRub: 0,
			finalPayableKop: invoiceAmountKop,
			messageRu: `Промокод «${preset.code}» применим только к услугам категорий: ${preset.applicableCategories.join(", ")}.`,
			promoCodePreset: preset,
		};
	}

	// Check excluded service codes
	const hasExcludedCode = preset.excludedServiceCodes.some((exCode) =>
		serviceCodes.includes(exCode)
	);
	if (hasExcludedCode) {
		return {
			isValid: false,
			code: preset.code,
			titleRu: preset.titleRu,
			discountKop: 0,
			discountRub: 0,
			bonusPointsToAddRub: 0,
			finalPayableKop: invoiceAmountKop,
			messageRu: "В счете присутствуют позиции, исключенные из данной маркетинговой акции.",
			promoCodePreset: preset,
		};
	}

	let discountKop = 0;
	let bonusPointsToAddRub = 0;

	if (preset.discountType === "percentage") {
		discountKop = Math.round((invoiceAmountKop * preset.value) / 100);
	} else if (preset.discountType === "fixed_rub") {
		discountKop = Math.min(invoiceAmountKop, preset.value * 100);
	} else if (preset.discountType === "welcome_bonus_points") {
		bonusPointsToAddRub = preset.value;
	}

	const finalPayableKop = Math.max(0, invoiceAmountKop - discountKop);

	return {
		isValid: true,
		code: preset.code,
		titleRu: preset.titleRu,
		discountKop,
		discountRub: discountKop / 100,
		bonusPointsToAddRub,
		finalPayableKop,
		messageRu: preset.descriptionRu,
		promoCodePreset: preset,
	};
}

/**
 * 8. Exports Loyalty Ledger to RFC 4180 CSV format with UTF-8 BOM
 */
export function exportLoyaltyLedgerToCsv(entries: readonly LoyaltyLedgerEntry[]): string {
	const BOM = "\uFEFF";
	const headers = [
		"ID операции",
		"Дата и время",
		"Пациент",
		"Номер медкарты",
		"Тип операции",
		"Сумма счета (руб)",
		"Изменение баллов (+/-)",
		"Баланс баллов после",
		"Способ оплаты",
		"Фискальный чек 54-ФЗ",
		"Сотрудник / Кассир",
		"Примечание",
	];

	function escapeCsv(value: string | number | undefined | null): string {
		if (value === undefined || value === null) return '""';
		const str = String(value).replace(/"/g, '""');
		return `"${str}"`;
	}

	const rows: string[] = [headers.map((h) => `"${h}"`).join(";")];

	for (const entry of entries) {
		const invoiceRub = (entry.invoiceAmountKop / 100).toFixed(2);
		const deltaStr = entry.pointsDeltaRub > 0 ? `+${entry.pointsDeltaRub}` : `${entry.pointsDeltaRub}`;
		const balanceStr = entry.balanceAfterRub.toFixed(0);

		const row = [
			escapeCsv(entry.id),
			escapeCsv(entry.timestampIso),
			escapeCsv(entry.patientName),
			escapeCsv(entry.medicalCardNumber),
			escapeCsv(entry.operationTypeRu),
			escapeCsv(invoiceRub),
			escapeCsv(deltaStr),
			escapeCsv(balanceStr),
			escapeCsv(entry.paymentMethodRu),
			escapeCsv(entry.fiscalReceiptNumber ?? "—"),
			escapeCsv(entry.staffNameRu),
			escapeCsv(entry.noteRu),
		];
		rows.push(row.join(";"));
	}

	return BOM + rows.join("\r\n");
}
