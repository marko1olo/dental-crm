import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	compileFamilyBillingDraft,
	calculateSbpMultiTenderSplit,
	resolveDentalTaxDeductionCategory,
	generateDynamicSbpQrPayload,
	type CombinedFamilyBillingDraft,
} from "@dental/shared";
import {
	calculateFamilyAllocation,
	calculateFamilyRefundRouting,
	checkOverdraftStatus,
	formatAvailableForDebitLabel,
	formatFamilyBalanceLabel,
	formatMoneyClean,
	safeFamilyMemberName,
	validateFamilyMemberStatus,
	type FamilyLedgerEntry,
	type FamilyMember,
} from "../familyWalletHelpers";

describe("Web Finance: Family Combined Billing & Dynamic SBP QR Multi-Tender 54-FZ", () => {
	it("1.1 Dynamic SBP QR generation produces valid CRC16 and NSPK URL format", () => {
		const sbp = generateDynamicSbpQrPayload({
			sumRub: 14500,
			orderId: "FAM-9981",
			clinicName: "ООО ДЕНТЕ СТОМАТОЛОГИЯ",
			purpose: "Оплата стоматологических услуг семьи",
		});

		assert.equal(sbp.sumRub, 14500);
		assert.equal(sbp.sumKopecks, 1450000);
		assert.ok(sbp.nspkUrl.startsWith("https://qr.nspk.ru/"));
		assert.ok(sbp.nspkUrl.includes("sum=1450000"));
		assert.ok(sbp.nspkUrl.includes("cur=RUB"));
		assert.equal(typeof sbp.crc16Hex, "string");
		assert.equal(sbp.crc16Hex.length, 4);
		assert.ok(sbp.emvPayload.includes("ru.nspk.sbp"));
	});

	it("1.2 Multi-tender split with family wallet and SBP QR matches exact kopecks", () => {
		const split = calculateSbpMultiTenderSplit({
			totalAmountRub: 52000,
			depositAvailableRub: 20000,
			orderId: "FAM-CHK-1",
			clinicName: "ДЕНТЕ",
		});

		// Total: 52 000 ₽ (5 200 000 kop)
		assert.equal(split.totalAmountRub, 52000);
		assert.equal(split.totalAmountKopecks, 5200000);

		// Tag 1215: 20 000 ₽
		assert.equal(split.depositOffsetRub, 20000);
		assert.equal(split.depositOffsetKopecks, 2000000);

		// Tag 1081: 32 000 ₽
		assert.equal(split.sbpChargeRub, 32000);
		assert.equal(split.sbpChargeKopecks, 3200000);

		// Dynamic QR generated for exact remainder
		assert.ok(split.sbpQr !== null);
		assert.equal(split.sbpQr?.sumRub, 32000);
		assert.equal(split.sbpQr?.sumKopecks, 3200000);
		assert.ok(split.sbpQr?.nspkUrl.includes("sum=3200000"));
	});

	it("1.3 Tax deduction categorization separates Code 01 and Code 02 with full precision", () => {
		const draft: CombinedFamilyBillingDraft = {
			payer: {
				payerId: "pat-parent-1",
				payerFullName: "Кузнецов Владимир Петрович",
				payerInn: "770199887766",
				payerPhone: "+7 (916) 123-45-67",
			},
			familyGroupName: "Семья Кузнецовых",
			availableFamilyWalletRub: 5000,
			items: [
				{
					id: "item-1",
					patientId: "pat-parent-1",
					patientFullName: "Кузнецов Владимир Петрович",
					relationship: "self",
					serviceName: "Дентальная имплантация Astra Tech",
					code804n: "A16.07.054",
					toothNumber: 46,
					priceRub: 55000,
					quantity: 1,
					taxDeductionCategory: resolveDentalTaxDeductionCategory("Дентальная имплантация Astra Tech", "A16.07.054"),
				},
				{
					id: "item-2",
					patientId: "pat-child-1",
					patientFullName: "Кузнецова Алина Владимировна",
					relationship: "child",
					serviceName: "Лечение пульпита молочного зуба с пломбированием",
					code804n: "A16.07.002",
					toothNumber: 74,
					priceRub: 6800,
					quantity: 1,
					taxDeductionCategory: resolveDentalTaxDeductionCategory("Лечение пульпита", "A16.07.002"),
				},
			],
		};

		const result = compileFamilyBillingDraft(draft);

		assert.equal(result.totalAmountRub, 61800);
		assert.equal(result.code02TotalRub, 55000);
		assert.equal(result.code01TotalRub, 6800);
		assert.equal(result.membersCount, 2);

		// Certificates for tax deduction (KND 1151156)
		assert.equal(result.taxDeductionCertificates.length, 2);

		const parentCert = result.taxDeductionCertificates.find((c) => c.patientFnsCode === "1")!;
		assert.equal(parentCert.code02TotalRub, 55000);
		assert.equal(parentCert.code01TotalRub, 0);

		const childCert = result.taxDeductionCertificates.find((c) => c.patientFnsCode === "4")!;
		assert.equal(childCert.code01TotalRub, 6800);
		assert.equal(childCert.code02TotalRub, 0);

		// Split calculation
		assert.equal(result.defaultSplit.familyWalletOffsetRub, 5000);
		assert.equal(result.defaultSplit.remainingDueRub, 56800);
		assert.equal(result.defaultSplit.sbpQr?.sumRub, 56800);
	});
});

describe("Web Finance: Subagent 2 Family Wallet, Cross-Patient Ledger & Deposit Inquisitor", () => {
	it("2.1 Parent-Child Deposit Allocation: parent deposits 50,000 ₽, debits child treatment with exact kopecks", () => {
		// Parent deposits 50,000 ₽. Child receives care: 14,350.50 ₽
		const allocation = calculateFamilyAllocation({
			depositAvailableRub: 50000,
			totalDueRub: 14350.5,
		});

		assert.equal(allocation.allocatedDepositRub, 14350.5);
		assert.equal(allocation.allocatedDepositKopecks, 1435050);
		assert.equal(allocation.remainingDueRub, 0);
		assert.equal(allocation.remainingDueKopecks, 0);
		assert.equal(allocation.overdraftRub, 0);
		assert.equal(allocation.exceedsLimit, false);

		// Remaining balance: 50,000 - 14,350.50 = 35,649.50 ₽
		const remainingBalKop = 5000000 - allocation.allocatedDepositKopecks;
		assert.equal(remainingBalKop, 3564950);
	});

	it("2.2 Child individual limit blocks excessive debit and routes remainder to co-pay", () => {
		// Deposit 40,000 ₽, but child has individual spending limit 10,000 ₽
		// Treatment cost: 13,500.00 ₽
		const allocation = calculateFamilyAllocation({
			depositAvailableRub: 40000,
			totalDueRub: 13500,
			individualLimitRub: 10000,
			overdraftAllowed: false,
		});

		assert.equal(allocation.allocatedDepositRub, 10000);
		assert.equal(allocation.allocatedDepositKopecks, 1000000);
		assert.equal(allocation.remainingDueRub, 3500);
		assert.equal(allocation.remainingDueKopecks, 350000);
		assert.equal(allocation.exceedsLimit, true);
	});

	it("2.3 Family Ledger Structure: records who deposited, for whom debited, act/visit number", () => {
		const entry: FamilyLedgerEntry = {
			id: "ledger-001",
			createdAt: "2026-09-29T10:00:00.000Z",
			entryType: "debit",
			amountRub: 14350.5,
			amountKopecks: 1435050,
			payerPatientId: "pat-parent-01",
			payerFullName: "Иванов Сергей Петрович",
			targetPatientId: "pat-child-02",
			targetPatientFullName: "Иванов Артем Сергеевич",
			visitId: "vis-8821",
			actNumber: "АКТ-2026/09-44",
			fiscalReceiptNumber: "ФД-77182",
			notes: "Лечение осложненного кариеса молочного моляра 75",
			clientMutationId: "mut-fam-001",
		};

		assert.equal(entry.amountRub, 14350.5);
		assert.equal(entry.amountKopecks, 1435050);
		assert.equal(entry.payerFullName, "Иванов Сергей Петрович");
		assert.equal(entry.targetPatientFullName, "Иванов Артем Сергеевич");
		assert.equal(entry.actNumber, "АКТ-2026/09-44");
		assert.equal(entry.clientMutationId, "mut-fam-001");
	});

	it("2.4 Refund Routing: cancelled treatment routes strictly back to family deposit without cash leak", () => {
		// Treatment paid from family wallet is cancelled
		const depositRefund = calculateFamilyRefundRouting({
			originalPaymentMethod: "family_wallet",
			originalFamilyGroupId: "fam-grp-01",
			refundAmountRub: 8500,
			requestCashPayout: false,
		});

		assert.equal(depositRefund.destination, "family_deposit");
		assert.equal(depositRefund.requiresFiscalReceipt54Fz, false);
		assert.match(depositRefund.description, /на общий семейный депозит/i);

		// If payer demands cash payout from clinic desk, 54-FZ return of income receipt is mandatory
		const cashRefund = calculateFamilyRefundRouting({
			originalPaymentMethod: "family_wallet",
			originalFamilyGroupId: "fam-grp-01",
			refundAmountRub: 8500,
			requestCashPayout: true,
		});

		assert.equal(cashRefund.destination, "cash_payout");
		assert.equal(cashRefund.requiresFiscalReceipt54Fz, true);
		assert.equal(cashRefund.receiptType, "return_of_income");
	});

	it("2.5 Merged and Archived Family Members Protection: funds never disappear upon patient merge", () => {
		const mergedMember: FamilyMember = {
			id: "pat-dup-99",
			fullName: "Иванова Мария (дубликат)",
			phone: "+7 (900) 111-22-33",
			isArchived: false,
			mergedIntoPatientId: "pat-orig-01",
			mergedIntoPatientName: "Иванова Мария Сергеевна",
		};

		const statusMerged = validateFamilyMemberStatus(mergedMember);
		assert.equal(statusMerged.isValid, true);
		assert.equal(statusMerged.isMerged, true);
		assert.equal(statusMerged.redirectPatientId, "pat-orig-01");
		assert.match(statusMerged.warning || "", /Баланс сохранен/i);

		const archivedMember: FamilyMember = {
			id: "pat-old-03",
			fullName: "Иванов Петр Николаевич",
			phone: "+7 (900) 222-33-44",
			isArchived: true,
		};

		const statusArchived = validateFamilyMemberStatus(archivedMember);
		assert.equal(statusArchived.isValid, true);
		assert.equal(statusArchived.isArchived, true);
		assert.match(statusArchived.warning || "", /Семейный баланс не утерян/i);
	});

	it("2.6 Overdraft Protection: strict zero overdraft vs soft warning with head debt tracking", () => {
		// Strict overdraft ban: balance 10,000 ₽, debit 15,000 ₽
		const strictCheck = checkOverdraftStatus(10000, 15000, false);
		assert.equal(strictCheck.canDebit, false);
		assert.equal(strictCheck.overdraftAmountRub, 5000);
		assert.match(strictCheck.warningMessage || "", /Овердрафт запрещен/i);

		// Soft overdraft enabled with limit 10,000 ₽: debit 15,000 ₽ allowed with warning
		const softCheck = checkOverdraftStatus(10000, 15000, true, 10000);
		assert.equal(softCheck.canDebit, true);
		assert.equal(softCheck.overdraftAmountRub, 5000);
		assert.match(softCheck.warningMessage || "", /Задолженность фиксируется за главой семьи/i);

		// Exceeding soft overdraft limit
		const softExceeded = checkOverdraftStatus(10000, 25000, true, 10000);
		assert.equal(softExceeded.canDebit, false);
		assert.match(softExceeded.warningMessage || "", /Превышен допустимый лимит мягкого овердрафта/i);
	});

	it("2.7 Clean UI Formatting: exact badges with head of family and zero undefined/null/NaN leaks", () => {
		// Badge: Семейный баланс
		const badgeWithHead = formatFamilyBalanceLabel(42150, "Иванов С.П.");
		assert.match(badgeWithHead, /Семейный баланс:\s*42\s*150\s*₽\s*\(Глава семьи:\s*Иванов С\.П\.\)/);

		const availableBadge = formatAvailableForDebitLabel(42150);
		assert.match(availableBadge, /Доступно для списания:\s*42\s*150\s*₽/);

		// Safe name guarantees no "undefined member" or "null"
		assert.equal(safeFamilyMemberName(null), "Член семьи");
		assert.equal(safeFamilyMemberName({ fullName: "" }), "Член семьи");
		assert.equal(safeFamilyMemberName({ fullName: "null" }), "Член семьи");
		assert.equal(safeFamilyMemberName({ fullName: "undefined" }), "Член семьи");
		assert.equal(safeFamilyMemberName({ fullName: "Смирнова А.В." }), "Смирнова А.В.");

		// Safe money guarantees no "NaN ₽"
		assert.equal(formatMoneyClean(NaN), "0 ₽");
		assert.equal(formatMoneyClean(null), "0 ₽");
		assert.equal(formatMoneyClean(undefined), "0 ₽");
		assert.match(formatMoneyClean(1500.5), /1\s*500[,.]50\s*₽/);
	});
});
