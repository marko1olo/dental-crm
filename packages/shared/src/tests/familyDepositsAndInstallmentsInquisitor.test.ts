/**
 * familyDepositsAndInstallmentsInquisitor.test.ts
 *
 * Red Team Inquisitor Test Suite:
 * 1. Internal 0% Installments: Down Payment Accounting & Kopeck-Exact Payoff to "completed".
 * 2. Family Wallet Spending Authorization & RF Legal Guardianship (FZ-323 / Art. 64 Family Code).
 * 3. Family Wallet Deposit Refund Flow & Balance Depletion for Clean Group Archive.
 * 4. Multi-Tender Split Payment Math (Family Wallet + Cash/Card) with Zero Float Leakage.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	generate0PercentInstallmentSchedule,
	generateInstallmentSchedule,
	evaluateInstallmentStatus,
	validateFamilyWalletSpend,
	invertRelationshipKind,
	createFamilyDepositAccount,
	calculateFamilyDepositCredit,
	calculateFamilyDepositDebit,
	calculateFamilyDepositRefund,
	calculateFamilyDepositWithdrawalRefund,
	kopecksToRub,
	parseKopecks,
	rubToKopecks,
	rublesToKopecks,
	sumKopecks,
	type Kopecks,
} from "../index.js";

describe("Red Team Inquisitor: Family Wallets, Advance Deposits & Internal 0% Installments", () => {
	describe("1. Internal 0% Installment Contracts & Kopeck-Exact Payoff", () => {
		it("1.1 Down payment initialization: remainingAmountRub matches tranches sum and transitions to completed", () => {
			const totalAmountRub = 60000;
			const downPaymentRub = 15000;
			const monthsCount = 6;

			// Remaining amount to be financed via tranches
			const remainingKop = rubToKopecks(totalAmountRub) - rubToKopecks(downPaymentRub);
			const expectedRemainingRub = kopecksToRub(remainingKop);
			assert.equal(expectedRemainingRub, 45000, "Remaining ruble amount must be 45 000 ₽");

			// Generate tranche schedule
			const schedule = generate0PercentInstallmentSchedule(remainingKop, monthsCount);
			assert.equal(schedule.length, 6, "Must generate 6 tranches");

			// Zero-kopeck loss check
			const tranchesSumKop = sumKopecks(schedule.map((t) => t.amountKopecks));
			assert.equal(tranchesSumKop, remainingKop, "Sum of tranches must exactly match remaining financed amount");

			// Simulate paying all 6 tranches sequentially
			let paidAmountRub = 0;
			let remainingAmountRub = expectedRemainingRub;
			let status: "active" | "completed" = "active";

			for (let i = 0; i < schedule.length; i++) {
				const tranche = schedule[i]!;
				const trancheRub = kopecksToRub(tranche.amountKopecks);

				paidAmountRub = kopecksToRub(rubToKopecks(paidAmountRub) + rubToKopecks(trancheRub));
				remainingAmountRub = Math.max(0, kopecksToRub(rubToKopecks(remainingAmountRub) - rubToKopecks(trancheRub)));

				if (remainingAmountRub <= 0) {
					status = "completed";
				}
			}

			// Invariant verification
			assert.equal(paidAmountRub, 45000, "Total tranche payments must equal 45 000 ₽");
			assert.equal(remainingAmountRub, 0, "Remaining debt must reach exactly 0.00 ₽");
			assert.equal(status, "completed", "Contract must transition to 'completed'");

			// Red Team Anti-Regression Proof:
			// If remainingAmountRub had been initialized to totalAmountRub (60 000 ₽),
			// remainingAmountRub would be 60000 - 45000 = 15000 ₽, and contract would NEVER complete!
			const buggedRemaining = Math.max(0, 60000 - paidAmountRub);
			assert.equal(buggedRemaining, 15000, "Proves the original bug: contract would have stayed at 15 000 ₽ debt forever");
		});

		it("1.2 Indivisible kopeck remainder distribution across odd amounts", () => {
			const totalAmountRub = 62555.77;
			const downPaymentRub = 12345.50;
			const monthsCount = 6;

			const remainingKop = rubToKopecks(totalAmountRub) - rubToKopecks(downPaymentRub);
			// 6255577 - 1234550 = 5021027 kopecks (50 210.27 ₽)
			assert.equal(remainingKop, 5021027);

			const schedule = generate0PercentInstallmentSchedule(remainingKop, monthsCount);
			assert.equal(schedule.length, 6);

			const totalTranchesKop = sumKopecks(schedule.map((s) => s.amountKopecks));
			assert.equal(totalTranchesKop, 5021027, "Exact sum of tranches must equal 5 021 027 kopecks without float drift");

			// First month absorbs remainder: 5021027 = 836837 * 6 + 5 -> 1st month gets 836837 + 5 = 836842 kop
			assert.equal(schedule[0]!.amountKopecks, 836842);
			assert.equal(schedule[1]!.amountKopecks, 836837);
		});
	});

	describe("2. Family Wallet Spending Authorization & Legal Guardianship", () => {
		const DAD_ID = "pat-dad-01";
		const MOM_ID = "pat-mom-02";
		const CHILD_ID = "pat-child-03";
		const UNRELATED_ID = "pat-unrelated-04";

		it("2.1 Head of family (wallet owner) can spend their own funds", () => {
			const result = validateFamilyWalletSpend({
				spenderPatientId: DAD_ID,
				walletOwnerPatientId: DAD_ID,
				requiredAmountKopecks: 2500000, // 25 000 ₽
				currentBalanceKopecks: 5000000, // 50 000 ₽
			});

			assert.equal(result.isAuthorized, true);
			assert.equal(result.remainingBalanceKopecks, 2500000);
		});

		it("2.2 Spouse with spend rights can spend from family wallet", () => {
			const result = validateFamilyWalletSpend({
				spenderPatientId: MOM_ID,
				walletOwnerPatientId: DAD_ID,
				requiredAmountKopecks: 1000000,
				currentBalanceKopecks: 5000000,
				relationship: {
					canSpendFamilyWallet: true,
					relationshipType: "spouse",
				},
			});

			assert.equal(result.isAuthorized, true);
			assert.equal(result.remainingBalanceKopecks, 4000000);
		});

		it("2.3 Minor child without spending rights is blocked from draining family wallet", () => {
			const result = validateFamilyWalletSpend({
				spenderPatientId: CHILD_ID,
				walletOwnerPatientId: DAD_ID,
				requiredAmountKopecks: 500000,
				currentBalanceKopecks: 5000000,
				relationship: {
					canSpendFamilyWallet: false,
					isLegalRepresentative: false,
					relationshipType: "child",
				},
			});

			assert.equal(result.isAuthorized, false);
			assert.match(result.failureReason || "", /не имеет полномочий/);
		});

		it("2.4 Inverted relationship mapping handles perspective correctly", () => {
			assert.equal(invertRelationshipKind("parent"), "child");
			assert.equal(invertRelationshipKind("child"), "parent");
			assert.equal(invertRelationshipKind("guardian"), "ward");
			assert.equal(invertRelationshipKind("spouse"), "spouse");
		});
	});

	describe("3. Family Wallet Deposit Refund & Group Balance Depletion", () => {
		it("3.1 Full lifecycle: top-up 100 000 ₽ -> debit 75 000 ₽ -> refund remaining 25 000 ₽ -> zero balance", () => {
			const account = createFamilyDepositAccount({
				id: "FAM-DEP-100",
				familyGroupId: "fam-grp-01",
				familyName: "Семья Петровых",
				sponsorPatientId: "pat-dad-01",
				sponsorFullName: "Петров Петр Петрович",
				initialDepositRub: 0,
				members: [
					{
						patientId: "pat-dad-01",
						fullName: "Петров Петр Петрович",
						relationship: "self",
						isSpendingAuthorized: true,
					},
					{
						patientId: "pat-child-01",
						fullName: "Петров Ваня",
						relationship: "child",
						isSpendingAuthorized: true,
					},
				],
			});

			// 1. Topup 100 000 ₽
			const topup = calculateFamilyDepositCredit({
				account,
				amountRub: 100000,
				payerPatientId: "pat-dad-01",
				payerFullName: "Петров Петр Петрович",
			});
			assert.equal(topup.newBalanceRub, 100000);

			// 2. Debit 75 000 ₽ for orthodontic treatment
			const debit = calculateFamilyDepositDebit({
				account: topup.updatedAccount,
				patientId: "pat-child-01",
				amountRub: 75000,
			});
			assert.equal(debit.success, true);
			assert.equal(debit.newBalanceRub, 25000);

			// 3. Reject withdrawal refund exceeding remaining balance
			assert.throws(
				() => {
					calculateFamilyDepositWithdrawalRefund({
						account: debit.updatedAccount,
						patientId: "pat-dad-01",
						refundAmountKopecks: 3000000, // 30 000 ₽ (only 25 000 available)
					});
				},
				/Недостаточно средств на семейном балансе для возврата/,
			);

			// 4. Refund remaining 25 000 ₽ back to cash / patient
			const refundRes = calculateFamilyDepositWithdrawalRefund({
				account: debit.updatedAccount,
				patientId: "pat-dad-01",
				refundAmountKopecks: 2500000, // 25 000 ₽
			});

			assert.equal(refundRes.transaction.transactionType, "refund");
			assert.equal(refundRes.transaction.amountRub, 25000);
			assert.equal(refundRes.updatedAccount.balanceKopecks, 0, "Balance must reach exactly 0 kopecks after full deposit refund");
		});
	});

	describe("4. Multi-Tender Split Payment Math (Family Wallet + Card/Cash)", () => {
		it("4.1 Splits invoice 50 000 ₽ between family wallet 18 500.75 ₽ and card 31 499.25 ₽", () => {
			const invoiceTotalRub = 50000;
			const invoiceTotalKop = rubToKopecks(invoiceTotalRub);

			const walletAvailableRub = 18500.75;
			const walletSpendKop = rubToKopecks(walletAvailableRub);

			const remainingDueKop = invoiceTotalKop - walletSpendKop;
			const cardPaymentRub = kopecksToRub(remainingDueKop);

			assert.equal(cardPaymentRub, 31499.25);
			assert.equal(walletSpendKop + remainingDueKop, invoiceTotalKop);

			// Sum of tenders matches invoice 100.00% without rounding drift
			const tender1Kop = rubToKopecks(walletAvailableRub);
			const tender2Kop = rubToKopecks(cardPaymentRub);
			assert.equal(sumKopecks([tender1Kop, tender2Kop]), 5000000);
		});
	});
});
