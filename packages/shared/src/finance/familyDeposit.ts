/**
 * DENTE Dental CRM — Family Shared Deposit & Balance Management Engine
 *
 * Provides statutory, kopeck-exact pooled family deposit accounts:
 * 1. Head of household (sponsor) maintains a unified pre-paid deposit.
 * 2. Family members (children, spouses, elderly parents) debit medical treatments from the shared balance.
 * 3. Configurable spending authorization and optional per-member debit limits.
 * 4. Zero floating-point drift (all internal state in integer kopecks).
 * 5. Full 54-FZ FFD 1.2 Tag 1215 (advance offset / зачет аванса) audit trail.
 */

import { kopecksToNumericString, kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";

export type FamilyRelationship = "self" | "spouse" | "child" | "parent" | "relative";

export const FAMILY_RELATIONSHIP_NAMES_RU: Record<FamilyRelationship, string> = {
	self: "Глава семьи (плательщик)",
	spouse: "Супруг / Супруга",
	child: "Ребенок",
	parent: "Родитель",
	relative: "Родственник / подопечный",
};

export interface FamilyMemberProfile {
	readonly patientId: string;
	readonly fullName: string;
	readonly relationship: FamilyRelationship;
	readonly isSpendingAuthorized: boolean;
	readonly individualLimitKopecks?: number | undefined; // Optional spending ceiling
	readonly individualSpentKopecks: number;
}

export interface FamilyDepositAccount {
	readonly id: string;
	readonly familyGroupId: string;
	readonly familyName: string;
	readonly sponsorPatientId: string;
	readonly sponsorFullName: string;
	readonly sponsorPhone?: string | undefined;
	readonly sponsorInn?: string | undefined;
	readonly balanceKopecks: number;
	readonly totalDepositedKopecks: number;
	readonly totalSpentKopecks: number;
	readonly members: readonly FamilyMemberProfile[];
	readonly createdAtIso: string;
	readonly updatedAtIso: string;
}

export interface FamilyDepositTransaction {
	readonly id: string;
	readonly familyGroupId: string;
	readonly transactionType: "deposit" | "debit" | "refund" | "transfer";
	readonly patientId: string;
	readonly patientFullName: string;
	readonly payerPatientId: string;
	readonly amountKopecks: number;
	readonly amountRub: number;
	readonly balanceBeforeKopecks: number;
	readonly balanceAfterKopecks: number;
	readonly invoiceId?: string | undefined;
	readonly fiscalReceiptNumber?: string | undefined;
	readonly timestampIso: string;
	readonly notes?: string | undefined;
}

export interface FamilyDepositCreditInput {
	readonly account: FamilyDepositAccount;
	readonly amountRub?: number | undefined;
	readonly amountKopecks?: number | undefined;
	readonly payerPatientId: string;
	readonly payerFullName: string;
	readonly notes?: string | undefined;
	readonly timestampIso?: string | undefined;
}

export interface FamilyDepositCreditResult {
	readonly updatedAccount: FamilyDepositAccount;
	readonly transaction: FamilyDepositTransaction;
	readonly creditedKopecks: number;
	readonly creditedRub: number;
	readonly newBalanceKopecks: number;
	readonly newBalanceRub: number;
}

export interface FamilyDepositDebitInput {
	readonly account: FamilyDepositAccount;
	readonly patientId: string;
	readonly amountRub?: number | undefined;
	readonly amountKopecks?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly fiscalReceiptNumber?: string | undefined;
	readonly notes?: string | undefined;
	readonly timestampIso?: string | undefined;
}

export interface FamilyDepositDebitResult {
	readonly success: boolean;
	readonly updatedAccount: FamilyDepositAccount;
	readonly transaction?: FamilyDepositTransaction | undefined;
	readonly debitedKopecks: number;
	readonly debitedRub: number;
	readonly remainingInvoiceDueKopecks: number;
	readonly remainingInvoiceDueRub: number;
	readonly newBalanceKopecks: number;
	readonly newBalanceRub: number;
	readonly errorMessageRu?: string | undefined;
}

/**
 * Initializes a new Family Deposit Account for a family group.
 */
export function createFamilyDepositAccount(params: {
	id: string;
	familyGroupId: string;
	familyName: string;
	sponsorPatientId: string;
	sponsorFullName: string;
	sponsorPhone?: string | undefined;
	sponsorInn?: string | undefined;
	initialDepositRub?: number | undefined;
	initialDepositKopecks?: number | undefined;
	members?:
		| readonly {
				readonly patientId: string;
				readonly fullName: string;
				readonly relationship: FamilyRelationship;
				readonly isSpendingAuthorized?: boolean | undefined;
				readonly individualLimitRub?: number | undefined;
		  }[]
		| undefined;
}): FamilyDepositAccount {
	const initialDepositKop =
		params.initialDepositKopecks !== undefined
			? Math.max(0, Math.round(params.initialDepositKopecks))
			: params.initialDepositRub !== undefined
				? Math.max(0, rubToKopecks(params.initialDepositRub))
				: 0;

	const nowIso = new Date().toISOString();

	const members: FamilyMemberProfile[] = (params.members ?? []).map((m) => ({
		patientId: m.patientId,
		fullName: m.fullName,
		relationship: m.relationship,
		isSpendingAuthorized: m.isSpendingAuthorized ?? true,
		individualLimitKopecks:
			m.individualLimitRub !== undefined ? rubToKopecks(m.individualLimitRub) : undefined,
		individualSpentKopecks: 0,
	}));

	// Ensure sponsor is in the members list
	const hasSponsor = members.some((m) => m.patientId === params.sponsorPatientId);
	if (!hasSponsor) {
		members.unshift({
			patientId: params.sponsorPatientId,
			fullName: params.sponsorFullName,
			relationship: "self",
			isSpendingAuthorized: true,
			individualSpentKopecks: 0,
		});
	}

	return {
		id: params.id,
		familyGroupId: params.familyGroupId,
		familyName: params.familyName,
		sponsorPatientId: params.sponsorPatientId,
		sponsorFullName: params.sponsorFullName,
		sponsorPhone: params.sponsorPhone,
		sponsorInn: params.sponsorInn,
		balanceKopecks: initialDepositKop,
		totalDepositedKopecks: initialDepositKop,
		totalSpentKopecks: 0,
		members,
		createdAtIso: nowIso,
		updatedAtIso: nowIso,
	};
}

/**
 * Credits money into the family deposit account.
 */
export function calculateFamilyDepositCredit(
	input: FamilyDepositCreditInput,
): FamilyDepositCreditResult {
	const creditKop =
		input.amountKopecks !== undefined
			? Math.max(0, Math.round(input.amountKopecks))
			: input.amountRub !== undefined
				? Math.max(0, rubToKopecks(input.amountRub))
				: 0;

	if (creditKop <= 0) {
		throw new Error("Сумма пополнения семейного депозита должна быть строго положительной.");
	}

	const balanceBeforeKopecks = input.account.balanceKopecks;
	const newBalanceKopecks = balanceBeforeKopecks + creditKop;
	const newTotalDepositedKopecks = input.account.totalDepositedKopecks + creditKop;
	const nowIso = input.timestampIso ?? new Date().toISOString();

	const transaction: FamilyDepositTransaction = {
		id: `TX-DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
		familyGroupId: input.account.familyGroupId,
		transactionType: "deposit",
		patientId: input.payerPatientId,
		patientFullName: input.payerFullName,
		payerPatientId: input.payerPatientId,
		amountKopecks: creditKop,
		amountRub: kopecksToRub(creditKop),
		balanceBeforeKopecks,
		balanceAfterKopecks: newBalanceKopecks,
		timestampIso: nowIso,
		notes: input.notes ?? `Пополнение семейного депозита «${input.account.familyName}»`,
	};

	const updatedAccount: FamilyDepositAccount = {
		...input.account,
		balanceKopecks: newBalanceKopecks,
		totalDepositedKopecks: newTotalDepositedKopecks,
		updatedAtIso: nowIso,
	};

	return {
		updatedAccount,
		transaction,
		creditedKopecks: creditKop,
		creditedRub: kopecksToRub(creditKop),
		newBalanceKopecks,
		newBalanceRub: kopecksToRub(newBalanceKopecks),
	};
}

/**
 * Debits medical treatment costs from the shared family deposit.
 * Validates spending authorization and optional individual spending limits.
 */
export function calculateFamilyDepositDebit(
	input: FamilyDepositDebitInput,
): FamilyDepositDebitResult {
	const requestedKop =
		input.amountKopecks !== undefined
			? Math.max(0, Math.round(input.amountKopecks))
			: input.amountRub !== undefined
				? Math.max(0, rubToKopecks(input.amountRub))
				: 0;

	if (requestedKop <= 0) {
		return {
			success: false,
			updatedAccount: input.account,
			debitedKopecks: 0,
			debitedRub: 0,
			remainingInvoiceDueKopecks: 0,
			remainingInvoiceDueRub: 0,
			newBalanceKopecks: input.account.balanceKopecks,
			newBalanceRub: kopecksToRub(input.account.balanceKopecks),
			errorMessageRu: "Сумма списания должна быть больше 0.",
		};
	}

	const member = input.account.members.find((m) => m.patientId === input.patientId);
	if (!member) {
		return {
			success: false,
			updatedAccount: input.account,
			debitedKopecks: 0,
			debitedRub: 0,
			remainingInvoiceDueKopecks: requestedKop,
			remainingInvoiceDueRub: kopecksToRub(requestedKop),
			newBalanceKopecks: input.account.balanceKopecks,
			newBalanceRub: kopecksToRub(input.account.balanceKopecks),
			errorMessageRu: `Пациент ID ${input.patientId} не зарегистрирован в семейной группе «${input.account.familyName}».`,
		};
	}

	if (!member.isSpendingAuthorized) {
		return {
			success: false,
			updatedAccount: input.account,
			debitedKopecks: 0,
			debitedRub: 0,
			remainingInvoiceDueKopecks: requestedKop,
			remainingInvoiceDueRub: kopecksToRub(requestedKop),
			newBalanceKopecks: input.account.balanceKopecks,
			newBalanceRub: kopecksToRub(input.account.balanceKopecks),
			errorMessageRu: `Списание средств для ${member.fullName} запрещено главой семьи.`,
		};
	}

	// Check individual spending limit if configured
	let maxAllowedForMemberKop = input.account.balanceKopecks;
	if (member.individualLimitKopecks !== undefined) {
		const remainingLimitKop = Math.max(0, member.individualLimitKopecks - member.individualSpentKopecks);
		maxAllowedForMemberKop = Math.min(maxAllowedForMemberKop, remainingLimitKop);
	}

	if (maxAllowedForMemberKop <= 0) {
		return {
			success: false,
			updatedAccount: input.account,
			debitedKopecks: 0,
			debitedRub: 0,
			remainingInvoiceDueKopecks: requestedKop,
			remainingInvoiceDueRub: kopecksToRub(requestedKop),
			newBalanceKopecks: input.account.balanceKopecks,
			newBalanceRub: kopecksToRub(input.account.balanceKopecks),
			errorMessageRu:
				input.account.balanceKopecks <= 0
					? "Недостаточно средств на семейном депозите (баланс: 0 ₽)."
					: `Исчерпан индивидуальный лимит списаний для ${member.fullName}.`,
		};
	}

	const debitedKopecks = Math.min(requestedKop, maxAllowedForMemberKop);
	const remainingInvoiceDueKopecks = requestedKop - debitedKopecks;
	const balanceBeforeKopecks = input.account.balanceKopecks;
	const newBalanceKopecks = balanceBeforeKopecks - debitedKopecks;
	const nowIso = input.timestampIso ?? new Date().toISOString();

	const transaction: FamilyDepositTransaction = {
		id: `TX-DEB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
		familyGroupId: input.account.familyGroupId,
		transactionType: "debit",
		patientId: member.patientId,
		patientFullName: member.fullName,
		payerPatientId: input.account.sponsorPatientId,
		amountKopecks: debitedKopecks,
		amountRub: kopecksToRub(debitedKopecks),
		balanceBeforeKopecks,
		balanceAfterKopecks: newBalanceKopecks,
		invoiceId: input.invoiceId,
		fiscalReceiptNumber: input.fiscalReceiptNumber,
		timestampIso: nowIso,
		notes: input.notes ?? `Оплата лечения: ${member.fullName} (Зачет аванса Тег 1215)`,
	};

	const updatedMembers = input.account.members.map((m) =>
		m.patientId === member.patientId
			? { ...m, individualSpentKopecks: m.individualSpentKopecks + debitedKopecks }
			: m,
	);

	const updatedAccount: FamilyDepositAccount = {
		...input.account,
		balanceKopecks: newBalanceKopecks,
		totalSpentKopecks: input.account.totalSpentKopecks + debitedKopecks,
		members: updatedMembers,
		updatedAtIso: nowIso,
	};

	return {
		success: true,
		updatedAccount,
		transaction,
		debitedKopecks,
		debitedRub: kopecksToRub(debitedKopecks),
		remainingInvoiceDueKopecks,
		remainingInvoiceDueRub: kopecksToRub(remainingInvoiceDueKopecks),
		newBalanceKopecks,
		newBalanceRub: kopecksToRub(newBalanceKopecks),
	};
}

/**
 * Refunds a previous debit back into the family deposit.
 */
export function calculateFamilyDepositRefund(params: {
	account: FamilyDepositAccount;
	patientId: string;
	refundAmountKopecks: number;
	invoiceId?: string | undefined;
	notes?: string | undefined;
}): {
	updatedAccount: FamilyDepositAccount;
	transaction: FamilyDepositTransaction;
} {
	const refundKop = Math.max(0, Math.round(params.refundAmountKopecks));
	if (refundKop <= 0) {
		throw new Error("Сумма возврата на семейный депозит должна быть больше 0.");
	}

	const member = params.account.members.find((m) => m.patientId === params.patientId);
	const patientFullName = member?.fullName ?? `Пациент ID ${params.patientId}`;
	const balanceBeforeKopecks = params.account.balanceKopecks;
	const newBalanceKopecks = balanceBeforeKopecks + refundKop;
	const nowIso = new Date().toISOString();

	const transaction: FamilyDepositTransaction = {
		id: `TX-REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
		familyGroupId: params.account.familyGroupId,
		transactionType: "refund",
		patientId: params.patientId,
		patientFullName,
		payerPatientId: params.account.sponsorPatientId,
		amountKopecks: refundKop,
		amountRub: kopecksToRub(refundKop),
		balanceBeforeKopecks,
		balanceAfterKopecks: newBalanceKopecks,
		invoiceId: params.invoiceId,
		timestampIso: nowIso,
		notes: params.notes ?? `Возврат на семейный депозит за лечение: ${patientFullName}`,
	};

	const updatedMembers = params.account.members.map((m) =>
		m.patientId === params.patientId
			? { ...m, individualSpentKopecks: Math.max(0, m.individualSpentKopecks - refundKop) }
			: m,
	);

	const updatedAccount: FamilyDepositAccount = {
		...params.account,
		balanceKopecks: newBalanceKopecks,
		totalSpentKopecks: Math.max(0, params.account.totalSpentKopecks - refundKop),
		members: updatedMembers,
		updatedAtIso: nowIso,
	};

	return {
		updatedAccount,
		transaction,
	};
}
