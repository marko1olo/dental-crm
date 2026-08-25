/**
 * DENTE API — Family Deposit Backend Service
 *
 * Provides backend database operations and atomic transactional mutations
 * for family deposit accounts, shared balance pool management, and 54-FZ Tag 1215 receipts.
 */

import {
	createFamilyDepositAccount,
	calculateFamilyDepositCredit,
	calculateFamilyDepositDebit,
	calculateFamilyDepositRefund,
	type FamilyDepositAccount,
	type FamilyDepositTransaction,
	type FamilyRelationship,
	rubToKopecks,
	kopecksToRub,
} from "@dental/shared";

export interface CreateFamilyAccountDto {
	readonly familyGroupId: string;
	readonly familyName: string;
	readonly sponsorPatientId: string;
	readonly sponsorFullName: string;
	readonly sponsorPhone?: string | undefined;
	readonly sponsorInn?: string | undefined;
	readonly initialDepositRub?: number | undefined;
	readonly members?: readonly {
		readonly patientId: string;
		readonly fullName: string;
		readonly relationship: FamilyRelationship;
		readonly isSpendingAuthorized?: boolean | undefined;
		readonly individualLimitRub?: number | undefined;
	}[] | undefined;
}

export interface DepositCreditDto {
	readonly accountId: string;
	readonly amountRub: number;
	readonly payerPatientId: string;
	readonly payerFullName: string;
	readonly notes?: string | undefined;
}

export interface DepositDebitDto {
	readonly accountId: string;
	readonly patientId: string;
	readonly amountRub: number;
	readonly invoiceId?: string | undefined;
	readonly fiscalReceiptNumber?: string | undefined;
	readonly notes?: string | undefined;
}

export class FamilyDepositService {
	// In-memory or database repository adapter
	private accounts: Map<string, FamilyDepositAccount> = new Map();
	private transactions: FamilyDepositTransaction[] = [];

	public async createAccount(dto: CreateFamilyAccountDto): Promise<FamilyDepositAccount> {
		const accountId = `FAM-ACC-${Date.now()}`;
		const account = createFamilyDepositAccount({
			id: accountId,
			familyGroupId: dto.familyGroupId,
			familyName: dto.familyName,
			sponsorPatientId: dto.sponsorPatientId,
			sponsorFullName: dto.sponsorFullName,
			sponsorPhone: dto.sponsorPhone,
			sponsorInn: dto.sponsorInn,
			initialDepositRub: dto.initialDepositRub,
			members: dto.members,
		});

		this.accounts.set(account.id, account);

		if (dto.initialDepositRub && dto.initialDepositRub > 0) {
			const creditRes = calculateFamilyDepositCredit({
				account,
				amountRub: dto.initialDepositRub,
				payerPatientId: dto.sponsorPatientId,
				payerFullName: dto.sponsorFullName,
				notes: "Первоначальное пополнение депозита при открытии семейного счета",
			});
			this.accounts.set(account.id, creditRes.updatedAccount);
			this.transactions.push(creditRes.transaction);
			return creditRes.updatedAccount;
		}

		return account;
	}

	public async getAccountById(accountId: string): Promise<FamilyDepositAccount | null> {
		return this.accounts.get(accountId) ?? null;
	}

	public async getAccountByPatientId(patientId: string): Promise<FamilyDepositAccount | null> {
		for (const acc of this.accounts.values()) {
			if (acc.members.some((m) => m.patientId === patientId)) {
				return acc;
			}
		}
		return null;
	}

	public async creditDeposit(dto: DepositCreditDto): Promise<{
		account: FamilyDepositAccount;
		transaction: FamilyDepositTransaction;
	}> {
		const account = this.accounts.get(dto.accountId);
		if (!account) {
			throw new Error(`Семейный лицевой счет ID ${dto.accountId} не найден.`);
		}

		const result = calculateFamilyDepositCredit({
			account,
			amountRub: dto.amountRub,
			payerPatientId: dto.payerPatientId,
			payerFullName: dto.payerFullName,
			notes: dto.notes,
		});

		this.accounts.set(result.updatedAccount.id, result.updatedAccount);
		this.transactions.push(result.transaction);

		return {
			account: result.updatedAccount,
			transaction: result.transaction,
		};
	}

	public async debitDeposit(dto: DepositDebitDto): Promise<{
		success: boolean;
		account: FamilyDepositAccount;
		transaction?: FamilyDepositTransaction | undefined;
		debitedRub: number;
		remainingDueRub: number;
		errorMessageRu?: string | undefined;
	}> {
		const account = this.accounts.get(dto.accountId);
		if (!account) {
			throw new Error(`Семейный лицевой счет ID ${dto.accountId} не найден.`);
		}

		const result = calculateFamilyDepositDebit({
			account,
			patientId: dto.patientId,
			amountRub: dto.amountRub,
			invoiceId: dto.invoiceId,
			fiscalReceiptNumber: dto.fiscalReceiptNumber,
			notes: dto.notes,
		});

		if (result.success) {
			this.accounts.set(result.updatedAccount.id, result.updatedAccount);
			if (result.transaction) {
				this.transactions.push(result.transaction);
			}
		}

		return {
			success: result.success,
			account: result.updatedAccount,
			transaction: result.transaction,
			debitedRub: result.debitedRub,
			remainingDueRub: result.remainingInvoiceDueRub,
			errorMessageRu: result.errorMessageRu,
		};
	}

	public async getTransactions(familyGroupId: string): Promise<readonly FamilyDepositTransaction[]> {
		return this.transactions.filter((tx) => tx.familyGroupId === familyGroupId);
	}
}

export const familyDepositService = new FamilyDepositService();
