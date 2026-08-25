/**
 * familyFiscalBillingEngine.ts — Движок комплексного объединения счетов членов семьи
 * (родитель + дети + супруги) с формированием раздельных фискальных строк для налогового вычета
 * (Код 01: стандартное лечение / Код 02: дорогостоящее лечение) по 54-ФЗ и приказу ФНС ЕД-7-11/824@.
 */

import {
	kopecksToNumericString,
	kopecksToRub,
	rubToKopecks,
} from "./kopecksArithmetic.js";
import {
	type SbpDynamicQrResult,
	calculateSbpMultiTenderSplit,
} from "./sbpQrEngine.js";

export type FamilyRelationshipType = "self" | "spouse" | "parent" | "child";

export const FAMILY_RELATIONSHIP_RU: Record<FamilyRelationshipType, string> = {
	self: "Лично (плательщик)",
	spouse: "Супруг / Супруга",
	parent: "Родитель (мать / отец)",
	child: "Ребенок / подопечный (до 18 / 24 лет)",
};

export const FAMILY_RELATIONSHIP_FNS_CODE: Record<FamilyRelationshipType, string> = {
	self: "1",
	spouse: "2",
	parent: "3",
	child: "4",
};

export interface FamilyMemberBillingItem {
	readonly id: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly relationship: FamilyRelationshipType;
	readonly relationshipRu?: string | undefined;
	readonly serviceName: string;
	readonly code804n: string;
	readonly toothNumber?: number | undefined;
	readonly priceRub: number;
	readonly quantity: number;
	readonly discountRub?: number | undefined;
	readonly taxDeductionCategory: "1" | "2"; // 1 = стандартное, 2 = дорогостоящее
	readonly isMarkedItem?: boolean | undefined;
	readonly markingCode?: string | undefined;
}

export interface FamilyBillingPayerProfile {
	readonly payerId: string;
	readonly payerFullName: string;
	readonly payerInn?: string | undefined;
	readonly payerPassport?: string | undefined;
	readonly payerPhone?: string | undefined;
	readonly payerBirthDate?: string | undefined;
}

export interface FamilyMemberBillingSummary {
	readonly patientId: string;
	readonly patientFullName: string;
	readonly relationship: FamilyRelationshipType;
	readonly relationshipRu: string;
	readonly itemsCount: number;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly code01Rub: number;
	readonly code01Kopecks: number;
	readonly code02Rub: number;
	readonly code02Kopecks: number;
}

export interface FamilyTaxDeductionCertificateRecord {
	readonly certificateNumber: string;
	readonly payerFullName: string;
	readonly payerInn?: string | undefined;
	readonly patientFullName: string;
	readonly patientRelationshipRu: string;
	readonly patientFnsCode: string;
	readonly code01TotalRub: number;
	readonly code02TotalRub: number;
	readonly grandTotalRub: number;
	readonly taxYear: number;
	readonly estimatedRefund13Rub: number;
}

export interface CombinedFamilyBillingDraft {
	readonly payer: FamilyBillingPayerProfile;
	readonly familyGroupName?: string | undefined;
	readonly availableFamilyWalletRub?: number | undefined;
	readonly items: readonly FamilyMemberBillingItem[];
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
}

export interface CombinedFamilyBillingResult {
	readonly payer: FamilyBillingPayerProfile;
	readonly items: readonly FamilyMemberBillingItem[];
	readonly totalAmountRub: number;
	readonly totalAmountKopecks: number;
	readonly totalAmountFormattedRu: string;
	readonly code01TotalRub: number;
	readonly code01TotalKopecks: number;
	readonly code02TotalRub: number;
	readonly code02TotalKopecks: number;
	readonly membersSummary: readonly FamilyMemberBillingSummary[];
	readonly membersCount: number;
	readonly taxDeductionCertificates: readonly FamilyTaxDeductionCertificateRecord[];
	readonly defaultSplit: {
		readonly familyWalletOffsetRub: number;
		readonly familyWalletOffsetKopecks: number;
		readonly remainingDueRub: number;
		readonly remainingDueKopecks: number;
		readonly sbpQr: SbpDynamicQrResult | null;
	};
}

/**
 * Resolves whether a given dental procedure falls under Tax Deduction Code 02 (Дорогостоящее лечение:
 * имплантация, костная пластика, синус-лифтинг, сложные хирургические реконструкции) or Code 01 (Стандартное лечение).
 */
export function resolveDentalTaxDeductionCategory(
	serviceName: string,
	code804n: string,
): "1" | "2" {
	const lower = serviceName.toLowerCase();
	const normalizedCode = code804n.trim().toUpperCase();

	// Minzdrav Order 804n codes for surgery & implantology
	if (
		normalizedCode.startsWith("A16.07.054") || // Дентальная имплантация
		normalizedCode.startsWith("A16.07.041") || // Костная пластика челюстно-лицевой области
		normalizedCode.startsWith("A16.07.026") || // Сложные реконструктивные операции на челюстях
		normalizedCode.startsWith("A16.07.055") // Синус-лифтинг
	) {
		return "2";
	}

	// Semantic keyword classification
	if (
		lower.includes("имплант") ||
		lower.includes("синус-лифт") ||
		lower.includes("синуслифт") ||
		lower.includes("костная пластика") ||
		lower.includes("аугментация") ||
		lower.includes("остеопластик") ||
		lower.includes("all-on-4") ||
		lower.includes("all-on-6")
	) {
		return "2";
	}

	return "1";
}

/**
 * Combines multiple family members' accounts and invoices into a unified billing draft:
 * 1. Groups items with patient prefixes and 804n codes.
 * 2. Classifies each line item into Tax Deduction Code 01 vs Code 02.
 * 3. Pre-calculates available family balance offset and generates dynamic SBP QR code for the remainder.
 * 4. Produces statutory tax deduction certificates (KND 1151156).
 */
export function compileFamilyBillingDraft(
	draft: CombinedFamilyBillingDraft,
): CombinedFamilyBillingResult {
	const items = draft.items;
	let totalAmountKopecks = 0;
	let code01TotalKopecks = 0;
	let code02TotalKopecks = 0;

	const memberMap = new Map<
		string,
		{
			patientId: string;
			patientFullName: string;
			relationship: FamilyRelationshipType;
			itemsCount: number;
			totalKopecks: number;
			code01Kopecks: number;
			code02Kopecks: number;
		}
	>();

	for (const item of items) {
		const unitPriceKop = Math.max(0, rubToKopecks(item.priceRub || 0));
		const discountKop = item.discountRub ? Math.max(0, rubToKopecks(item.discountRub)) : 0;
		const effectivePriceKop = Math.max(0, unitPriceKop - discountKop);
		const qty = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
		const lineTotalKop = Math.round(effectivePriceKop * qty);

		totalAmountKopecks += lineTotalKop;

		if (item.taxDeductionCategory === "2") {
			code02TotalKopecks += lineTotalKop;
		} else {
			code01TotalKopecks += lineTotalKop;
		}

		const existing = memberMap.get(item.patientId);
		if (existing) {
			existing.itemsCount += 1;
			existing.totalKopecks += lineTotalKop;
			if (item.taxDeductionCategory === "2") {
				existing.code02Kopecks += lineTotalKop;
			} else {
				existing.code01Kopecks += lineTotalKop;
			}
		} else {
			memberMap.set(item.patientId, {
				patientId: item.patientId,
				patientFullName: item.patientFullName,
				relationship: item.relationship,
				itemsCount: 1,
				totalKopecks: lineTotalKop,
				code01Kopecks: item.taxDeductionCategory === "2" ? 0 : lineTotalKop,
				code02Kopecks: item.taxDeductionCategory === "2" ? lineTotalKop : 0,
			});
		}
	}

	const membersSummary: FamilyMemberBillingSummary[] = Array.from(memberMap.values()).map(
		(m) => ({
			patientId: m.patientId,
			patientFullName: m.patientFullName,
			relationship: m.relationship,
			relationshipRu: FAMILY_RELATIONSHIP_RU[m.relationship] || "Член семьи",
			itemsCount: m.itemsCount,
			totalRub: kopecksToRub(m.totalKopecks),
			totalKopecks: m.totalKopecks,
			code01Rub: kopecksToRub(m.code01Kopecks),
			code01Kopecks: m.code01Kopecks,
			code02Rub: kopecksToRub(m.code02Kopecks),
			code02Kopecks: m.code02Kopecks,
		}),
	);

	// Generate Tax Deduction Certificates
	const currentYear = new Date().getFullYear();
	const taxDeductionCertificates: FamilyTaxDeductionCertificateRecord[] = membersSummary.map(
		(m, idx) => {
			const code01Rub = m.code01Rub;
			const code02Rub = m.code02Rub;
			const grandTotalRub = m.totalRub;

			// Code 01 max statutory limit is 150 000 ₽ per year (19 500 ₽ refund)
			// Code 02 is unlimited expensive treatment
			const code01EligibleRub = Math.min(150000, code01Rub);
			const estimatedRefund13Rub = Math.round((code01EligibleRub + code02Rub) * 0.13 * 100) / 100;

			return {
				certificateNumber: `СПР-${currentYear}/${idx + 101}`,
				payerFullName: draft.payer.payerFullName,
				payerInn: draft.payer.payerInn,
				patientFullName: m.patientFullName,
				patientRelationshipRu: m.relationshipRu,
				patientFnsCode: FAMILY_RELATIONSHIP_FNS_CODE[m.relationship] || "1",
				code01TotalRub: code01Rub,
				code02TotalRub: code02Rub,
				grandTotalRub,
				taxYear: currentYear,
				estimatedRefund13Rub,
			};
		},
	);

	// Multi-tender split calculation (Family wallet deposit Tag 1215 + Dynamic SBP QR Tag 1081)
	const totalAmountRub = kopecksToRub(totalAmountKopecks);
	const availableWalletRub = Math.max(0, draft.availableFamilyWalletRub || 0);

	const splitResult = calculateSbpMultiTenderSplit({
		totalAmountRub,
		depositAvailableRub: availableWalletRub,
		orderId: `FAM-${Date.now().toString().slice(-6)}`,
		purpose: `Оплата семейного лечения (${membersSummary.map((m) => m.patientFullName.split(" ")[0]).join(", ")})`,
		clinicName: draft.clinicName,
	});

	return {
		payer: draft.payer,
		items,
		totalAmountRub,
		totalAmountKopecks,
		totalAmountFormattedRu: `${kopecksToNumericString(totalAmountKopecks)} ₽`,
		code01TotalRub: kopecksToRub(code01TotalKopecks),
		code01TotalKopecks,
		code02TotalRub: kopecksToRub(code02TotalKopecks),
		code02TotalKopecks,
		membersSummary,
		membersCount: membersSummary.length,
		taxDeductionCertificates,
		defaultSplit: {
			familyWalletOffsetRub: splitResult.depositOffsetRub,
			familyWalletOffsetKopecks: splitResult.depositOffsetKopecks,
			remainingDueRub: splitResult.sbpChargeRub,
			remainingDueKopecks: splitResult.sbpChargeKopecks,
			sbpQr: splitResult.sbpQr,
		},
	};
}
