/**
 * redteamFinancePayroll1cRegression.test.ts — PG18 Integration Suite for Red Team Finance, Cashbox, Refunds, IDENT Payroll & 1C CommerceML Fixes.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { eq } from "drizzle-orm";
import {
	DEFAULT_1C_CHART_OF_ACCOUNTS,
	type OneCClinicProfile,
} from "@dental/shared";
import { db } from "../../db/client.js";
import {
	advanceDepositTaggings,
	appointments,
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	doctorCommissions,
	doctorPayrollStatements,
	familyGroups,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patientInvoices,
	patients,
	payments,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { buildPatientLedger, clinicOwesPatientKopecks } from "../../money/patientDebtLedger.js";
import { reconcileInvoiceBalanceInDb } from "../../routes/billingRoutes/invoiceBalanceReconciler.js";
import { processCashboxPayment } from "../../routes/cashbox/cashboxPaymentProcessor.js";
import { executeCashRefundTransaction } from "../../routes/cashbox/refundModules/refundExecutionEngine.js";
import { calculateShiftTenderTotals } from "../../routes/cashbox/cashboxShiftModules/shiftReconciliationEngine.js";
import { applyCashBoxFiscalReceipt } from "../../routes/fiscal/receiptRoutes/receiptCashBoxLedger.js";
import { fetchDoctorPayrollDataset } from "../../routes/payrollModules/payrollDatasetQuery.js";
import { computePayrollPeriodKey } from "../../routes/payrollModules/payrollTypesAndQueries.js";
import {
	fetchAndBuildPayrollDocument,
	fetchAndBuildWriteoffDocument,
} from "../../services/finance/commerceMl/modules/materialsAndPayrollReconciliation.js";
import { fetchAndReconcilePayments } from "../../services/finance/commerceMl/modules/paymentReconciliation.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

describe("Red Team Finance, Cashbox, Refunds, IDENT Payroll & 1C PG18 Integration", () => {
	it("P0-1 & P0-2: personal advance topup + spend does not double-count paid in ledger and does not hijack into family group", async () => {
		const orgId = fixtureUuid("rtFinP0", 1);
		const patientId = fixtureUuid("rtFinP0", 2);
		const familyId = fixtureUuid("rtFinP0", 3);
		const visit1Id = fixtureUuid("rtFinP0", 4);
		const visit2Id = fixtureUuid("rtFinP0", 5);
		const inv1Id = fixtureUuid("rtFinP0", 6);
		const inv2Id = fixtureUuid("rtFinP0", 7);

		await purgeFixtureOrganizations([orgId]);
		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({ id: orgId, name: "RT P0 Clinic" });
				await tx.insert(familyGroups).values({
					id: familyId,
					organizationId: orgId,
					name: "Семья (0 руб)",
					balance: "0.00",
					balanceKopecks: 0,
					headPatientId: patientId,
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Авансова Мария Ивановна",
					phone: "+79001112233",
					familyGroupId: familyId,
				});
				await tx.insert(visits).values([
					{ id: visit1Id, organizationId: orgId, patientId, status: "signed" },
					{ id: visit2Id, organizationId: orgId, patientId, status: "signed" },
				]);
				await tx.insert(patientInvoices).values([
					{
						id: inv1Id,
						organizationId: orgId,
						patientId,
						visitId: visit1Id,
						totalRub: "10000",
						totalAmountRub: 10000,
						totalPriceKopecks: 1000000n,
						status: "issued",
					},
					{
						id: inv2Id,
						organizationId: orgId,
						patientId,
						visitId: visit2Id,
						totalRub: "10000",
						totalAmountRub: 10000,
						totalPriceKopecks: 1000000n,
						status: "issued",
					},
				]);
				await tx.insert(treatmentItems).values([
					{
						organizationId: orgId,
						patientId,
						visitId: visit1Id,
						invoiceId: inv1Id,
						title: "Пломба 1",
						quantity: 1,
						unitPriceRub: 10000,
						unitPriceKopecks: 1000000n,
						priceRub: 10000,
						priceKopecks: 1000000n,
						discountRub: 0,
						discountKopecks: 0n,
						status: "completed",
					},
					{
						organizationId: orgId,
						patientId,
						visitId: visit2Id,
						invoiceId: inv2Id,
						title: "Пломба 2",
						quantity: 1,
						unitPriceRub: 10000,
						unitPriceKopecks: 1000000n,
						priceRub: 10000,
						priceKopecks: 1000000n,
						discountRub: 0,
						discountKopecks: 0n,
						status: "completed",
					},
				]);
			});

			// 1. Top up personal advance 10 000 ₽ cash
			const topup = await processCashboxPayment(orgId, {
				patientId,
				amountRub: 10000,
				method: "cash",
				isAdvanceDeposit: true,
				clientMutationId: randomUUID(),
			});
			assert.equal(topup.statusCode, 200);

			// 2. Pay invoice 1 (10 000 ₽) using method="deposit" even though patient belongs to 0₽ familyGroup!
			const pay1 = await processCashboxPayment(orgId, {
				patientId,
				invoiceId: inv1Id,
				visitId: visit1Id,
				amountRub: 10000,
				method: "deposit",
				clientMutationId: randomUUID(),
			});
			assert.equal(pay1.statusCode, 200, "Personal advance must not be hijacked by 0₽ family group");

			// Verify patient ledger owes 10 000 ₽ (for visit 2), clinic owes patient 0 ₽ (not 10k phantom overpayment)
			const ledgerCheck = await withFixtureTenant(orgId, async (tx) => {
				const charges = await tx
					.select()
					.from(treatmentItems)
					.where(eq(treatmentItems.patientId, patientId));
				const pays = await tx
					.select()
					.from(payments)
					.where(eq(payments.patientId, patientId));
				return buildPatientLedger(patientId, charges, pays, { organizationId: orgId });
			});
			assert.equal(clinicOwesPatientKopecks(ledgerCheck), 0);
			assert.equal(ledgerCheck.paidKopecks, 1000000);
			assert.equal(ledgerCheck.balanceKopecks, 1000000);

			// 3. Second visit payment with empty personal deposit and empty family group must fail with 402
			const pay2 = await processCashboxPayment(orgId, {
				patientId,
				invoiceId: inv2Id,
				visitId: visit2Id,
				amountRub: 10000,
				method: "deposit",
				clientMutationId: randomUUID(),
			});
			assert.equal(pay2.statusCode, 402);
			assert.ok(
				pay2.body.error === "InsufficientDepositBalance" ||
					pay2.body.error === "InsufficientFamilyBalance",
				`Expected 402 deposit/family insufficient error, got ${String(pay2.body.error)}`,
			);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("P1-1, P1-2, P1-8 & P2: refund sets invoice status='refunded', payment status='refunded', reverts selected items, and warranty/lock guard voided & partially paid invoices", async () => {
		const orgId = fixtureUuid("rtFinP1Ref", 1);
		const patientId = fixtureUuid("rtFinP1Ref", 2);
		const visitId = fixtureUuid("rtFinP1Ref", 3);
		const invId = fixtureUuid("rtFinP1Ref", 4);
		const voidInvId = fixtureUuid("rtFinP1Ref", 5);
		const item1Id = fixtureUuid("rtFinP1Ref", 6);
		const item2Id = fixtureUuid("rtFinP1Ref", 7);

		await purgeFixtureOrganizations([orgId]);
		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({ id: orgId, name: "RT P1 Refund Clinic" });
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Возвратов Сергей Петрович",
					phone: "+79002223344",
				});
				await tx.insert(visits).values({ id: visitId, organizationId: orgId, patientId, status: "signed" });
				await tx.insert(patientInvoices).values([
					{
						id: invId,
						organizationId: orgId,
						patientId,
						visitId,
						totalRub: "10000",
						totalAmountRub: 10000,
						totalPriceKopecks: 1000000n,
						status: "issued",
					},
					{
						id: voidInvId,
						organizationId: orgId,
						patientId,
						visitId,
						totalRub: "5000",
						totalAmountRub: 5000,
						totalPriceKopecks: 500000n,
						status: "voided",
					},
				]);
				await tx.insert(treatmentItems).values([
					{
						id: item1Id,
						organizationId: orgId,
						patientId,
						visitId,
						invoiceId: invId,
						title: "Услуга 1",
						quantity: 1,
						unitPriceRub: 6000,
						unitPriceKopecks: 600000n,
						priceRub: 6000,
						priceKopecks: 600000n,
						status: "completed",
					},
					{
						id: item2Id,
						organizationId: orgId,
						patientId,
						visitId,
						invoiceId: invId,
						title: "Услуга 2",
						quantity: 1,
						unitPriceRub: 4000,
						unitPriceKopecks: 400000n,
						priceRub: 4000,
						priceKopecks: 400000n,
						status: "completed",
					},
				]);
			});

			// Voided invoice must be rejected by both normal payment and warranty
			const payVoid = await processCashboxPayment(orgId, {
				patientId,
				invoiceId: voidInvId,
				amountRub: 5000,
				method: "cash",
				clientMutationId: randomUUID(),
			});
			assert.equal(payVoid.statusCode, 409);

			const warrantyVoid = await processCashboxPayment(orgId, {
				patientId,
				invoiceId: voidInvId,
				amountRub: 0,
				method: "warranty",
				isWarranty: true,
				clientMutationId: randomUUID(),
			});
			assert.equal(warrantyVoid.statusCode, 409);

			// Partial pay 6 000 ₽, then reject overpayment of 5 000 ₽ (remaining is 4 000 ₽)
			const partPay = await processCashboxPayment(orgId, {
				patientId,
				invoiceId: invId,
				visitId,
				amountRub: 6000,
				method: "card",
				clientMutationId: randomUUID(),
			});
			assert.equal(partPay.statusCode, 200);

			const overPay = await processCashboxPayment(orgId, {
				patientId,
				invoiceId: invId,
				visitId,
				amountRub: 5000,
				method: "card",
				clientMutationId: randomUUID(),
			});
			assert.equal(overPay.statusCode, 400);
			assert.equal(overPay.body.error, "InvoiceOverpaymentError");

			// Complete remaining 4 000 ₽
			const restPay = await processCashboxPayment(orgId, {
				patientId,
				invoiceId: invId,
				visitId,
				amountRub: 4000,
				method: "sbp",
				clientMutationId: randomUUID(),
			});
			assert.equal(restPay.statusCode, 200);
			const restPaymentId = String(restPay.body.data.id);

			// Partial refund 4 000 ₽ via sbp referencing item2Id -> invoice becomes "partially_refunded", restPaymentId becomes "refunded", item2Id reverted to "approved", item1Id stays "completed"
			const partialRefund = await executeCashRefundTransaction(orgId, {
				refundKop: 400000,
				amountRub: 4000,
				method: "sbp",
				invoiceId: invId,
				paymentId: restPaymentId,
				patientId,
				refundedItemIds: [item2Id],
				effectiveMutationId: randomUUID(),
			});
			assert.equal(partialRefund.kind, "ok");

			await withFixtureTenant(orgId, async (tx) => {
				const [invAfterPartial] = await tx.select().from(patientInvoices).where(eq(patientInvoices.id, invId));
				assert.equal(invAfterPartial?.status, "partially_refunded");

				const [restPayRow] = await tx.select().from(payments).where(eq(payments.id, restPaymentId));
				assert.equal(restPayRow?.status, "refunded");
				assert.equal(restPayRow?.fiscalReceipt?.refundedInPlace, true);

				const [t1] = await tx.select().from(treatmentItems).where(eq(treatmentItems.id, item1Id));
				const [t2] = await tx.select().from(treatmentItems).where(eq(treatmentItems.id, item2Id));
				assert.equal(t1?.status, "completed");
				assert.equal(t2?.status, "approved");

				// Also verify reconcileInvoiceBalanceInDb preserves "partially_refunded"
				await reconcileInvoiceBalanceInDb(tx, orgId, invId);
				const [invReconciledPartial] = await tx.select().from(patientInvoices).where(eq(patientInvoices.id, invId));
				assert.equal(invReconciledPartial?.status, "partially_refunded");
			});

			// Refund remaining 6 000 ₽ -> invoice must become "refunded" (NEVER "draft"!)
			const fullRefund = await executeCashRefundTransaction(orgId, {
				refundKop: 600000,
				amountRub: 6000,
				method: "card",
				invoiceId: invId,
				patientId,
				effectiveMutationId: randomUUID(),
			});
			assert.equal(fullRefund.kind, "ok");

			await withFixtureTenant(orgId, async (tx) => {
				await reconcileInvoiceBalanceInDb(tx, orgId, invId);
				const [invAfterFull] = await tx.select().from(patientInvoices).where(eq(patientInvoices.id, invId));
				assert.equal(invAfterFull?.status, "refunded");
				const [voidAfter] = await tx.select().from(patientInvoices).where(eq(patientInvoices.id, voidInvId));
				assert.equal(voidAfter?.status, "voided");
			});
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("P1-4 & P1-5: receiptCashBoxLedger splits cash vs card+SBP with explicit cashBoxId, and solo main shift counts card/SBP", async () => {
		const orgId = fixtureUuid("rtFinShift", 1);
		const userId = fixtureUuid("rtFinShift", 2);
		const mainBoxId = fixtureUuid("rtFinShift", 3);
		const cashlessBoxId = fixtureUuid("rtFinShift", 4);
		const shiftId = fixtureUuid("rtFinShift", 5);
		const patientId = fixtureUuid("rtFinShift", 6);

		await purgeFixtureOrganizations([orgId]);
		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({ id: orgId, name: "RT Shift & Box Clinic" });
				await tx.insert(users).values({
					id: userId,
					organizationId: orgId,
					fullName: "Кассир Соло",
					role: "owner",
					isActive: true,
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Плательщик Сплит",
					phone: "+79003334455",
				});
				await tx.insert(cashBoxes).values([
					{
						id: mainBoxId,
						organizationId: orgId,
						name: "Основная касса",
						type: "main",
						isMain: true,
						isCashless: false,
						balanceRub: 1000,
						balanceKopecks: 100000,
					},
					{
						id: cashlessBoxId,
						organizationId: orgId,
						name: "Эквайринг / СБП",
						type: "cashless",
						isMain: false,
						isCashless: true,
						balanceRub: 0,
						balanceKopecks: 0,
					},
				]);
				await tx.insert(cashBoxShifts).values({
					id: shiftId,
					organizationId: orgId,
					cashBoxId: mainBoxId,
					openedByUserId: userId,
					status: "open",
					startBalanceRub: 1000,
					startBalanceKopecks: 100000,
				});

				await applyCashBoxFiscalReceipt(
					tx,
					orgId,
					{
						cashBoxId: mainBoxId,
						patientId,
						totalKopecks: 2000000,
						cashKopecks: 500000,
						electronicCardKopecks: 1000000,
						sbpKopecks: 500000,
						prepaidKopecks: 0,
						creditKopecks: 0,
						cashierFullName: "Кассир Соло",
						clientMutationId: randomUUID(),
					},
					{
						fiscalDocumentNumber: "101",
						ofdVerificationUrl: "https://ofd.test/101",
					},
					{ skipDuplicatePaymentCheck: true },
				);

				const [mainBoxAfter] = await tx.select().from(cashBoxes).where(eq(cashBoxes.id, mainBoxId));
				const [cashlessBoxAfter] = await tx.select().from(cashBoxes).where(eq(cashBoxes.id, cashlessBoxId));
				assert.equal(mainBoxAfter?.balanceKopecks, 600000, "Main box receives only 5 000 ₽ cash (+1 000 ₽ start = 6 000 ₽)");
				assert.equal(cashlessBoxAfter?.balanceKopecks, 1500000, "Cashless box receives 10 000 ₽ card + 5 000 ₽ SBP");

				// Also insert paid card & SBP payments to verify solo main shift absorbs them when only main shift is open
				await tx.insert(payments).values([
					{
						organizationId: orgId,
						patientId,
						amountRub: 10000,
						amountKopecks: 1000000n,
						method: "card",
						status: "paid",
						paidAt: new Date(),
						clientMutationId: randomUUID(),
					},
					{
						organizationId: orgId,
						patientId,
						amountRub: 5000,
						amountKopecks: 500000n,
						method: "online",
						status: "paid",
						paidAt: new Date(),
						clientMutationId: randomUUID(),
					},
				]);

				const [mainShift] = await tx.select().from(cashBoxShifts).where(eq(cashBoxShifts.id, shiftId));
				assert.ok(mainShift);
				const totals = await calculateShiftTenderTotals(tx, orgId, mainShift, mainBoxAfter);
				assert.equal(totals.incomeCashRub, 5000);
				assert.equal(totals.incomeElectronicRub, 10000);
				assert.equal(totals.incomeSbpRub, 5000);
			});
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("P1-6 & P1-9: IDENT payroll attributes invoice-linked payments (visitId=null), sub-month period keys, storno order & 1C CommerceML filters/taxes", async () => {
		const orgId = fixtureUuid("rtFinPay1C", 1);
		const docId = fixtureUuid("rtFinPay1C", 2);
		const patientId = fixtureUuid("rtFinPay1C", 3);
		const apptId = fixtureUuid("rtFinPay1C", 4);
		const visitId = fixtureUuid("rtFinPay1C", 5);
		const invId = fixtureUuid("rtFinPay1C", 6);
		const itemInvId = fixtureUuid("rtFinPay1C", 7);

		assert.equal(computePayrollPeriodKey("2026-10-01", "2026-10-31"), "2026-10");
		assert.equal(computePayrollPeriodKey("2026-10-01", "2026-10-15"), "2026-10-01..2026-10-15");

		await purgeFixtureOrganizations([orgId]);
		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({ id: orgId, name: "RT Payroll & 1C Clinic" });
				await tx.insert(users).values({
					id: docId,
					organizationId: orgId,
					fullName: "Врач Идентов",
					role: "doctor",
					isActive: true,
				});
				await tx.insert(doctorCommissions).values({
					organizationId: orgId,
					userId: docId,
					commissionPercent: "30",
					commissionPct: "30",
					isActive: true,
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Зарплатный Пациент",
					phone: "+79005556677",
				});
				const paidDate = new Date("2026-10-12T10:00:00.000Z");
				await tx.insert(appointments).values({
					id: apptId,
					organizationId: orgId,
					patientId,
					doctorId: docId,
					doctorUserId: docId,
					startsAt: paidDate,
					endsAt: new Date("2026-10-12T11:00:00.000Z"),
					status: "completed",
				});
				await tx.insert(visits).values({
					id: visitId,
					organizationId: orgId,
					patientId,
					doctorId: docId,
					appointmentId: apptId,
					status: "signed",
					createdAt: paidDate,
				});
				await tx.insert(patientInvoices).values({
					id: invId,
					organizationId: orgId,
					patientId,
					visitId,
					totalRub: "20000",
					totalAmountRub: 20000,
					totalPriceKopecks: 2000000n,
					status: "paid",
					paidAt: paidDate,
				});
				await tx.insert(treatmentItems).values({
					organizationId: orgId,
					patientId,
					visitId,
					invoiceId: invId,
					title: "Имплант",
					quantity: 1,
					unitPriceRub: 20000,
					unitPriceKopecks: 2000000n,
					priceRub: 20000,
					priceKopecks: 2000000n,
					status: "completed",
				});
				// Payment has visitId = NULL, linked only via documentId -> patientInvoices.visitId!
				await tx.insert(payments).values({
					organizationId: orgId,
					patientId,
					visitId: null,
					documentId: invId,
					amountRub: 20000,
					amountKopecks: 2000000n,
					method: "card",
					status: "paid",
					paidAt: paidDate,
					clientMutationId: randomUUID(),
				});
				// Closed negative prior period statement -> must carry over 120 000 kop debt
				await tx.insert(doctorPayrollStatements).values({
					organizationId: orgId,
					doctorId: docId,
					period: "2026-09",
					grossRevenueKopecks: 1000000,
					categoryPercent: 30,
					totalAccruedKopecks: 300000,
					ndfl13Kopecks: 0,
					netPayoutKopecks: -120000,
					isFinalized: true,
				});
				// Inventory: receipt (incoming purchase, must be ignored by 1C writeoffs) + storno + usage (storno must cancel matching usage regardless of order)
				await tx.insert(inventoryItems).values({
					id: itemInvId,
					organizationId: orgId,
					name: "Имплант Титановый",
					unit: "шт",
					quantity: 10,
					unitCostRub: 5000,
					unitCostKopecks: 500000,
				});
				await tx.insert(inventoryTransactions).values([
					{
						organizationId: orgId,
						itemId: itemInvId,
						inventoryItemId: itemInvId,
						transactionType: "receipt",
						qty: 10,
						quantityChanged: 10,
						unitCostRub: 5000,
						unitCostKopecks: 500000,
						createdAt: paidDate,
					},
					{
						organizationId: orgId,
						itemId: itemInvId,
						inventoryItemId: itemInvId,
						visitId,
						transactionType: "storno",
						qty: 1,
						quantityChanged: 1,
						unitCostRub: 5000,
						unitCostKopecks: 500000,
						createdAt: new Date("2026-10-12T10:01:00.000Z"),
					},
					{
						organizationId: orgId,
						itemId: itemInvId,
						inventoryItemId: itemInvId,
						visitId,
						transactionType: "auto_deduct",
						qty: 1,
						quantityChanged: -1,
						unitCostRub: 5000,
						unitCostKopecks: 500000,
						createdAt: new Date("2026-10-12T10:02:00.000Z"),
					},
				]);

				const dataset = await fetchDoctorPayrollDataset({
					orgId,
					resolvedDocId: docId,
					fromStr: "2026-10-01",
					toStr: "2026-10-31",
					fromDate: new Date("2026-10-01T00:00:00.000Z"),
					toDate: new Date("2026-10-31T23:59:59.999Z"),
					tx,
				});
				assert.equal(dataset.orders.length, 1);
				assert.equal(dataset.orders[0]?.paidKopecks, 2000000, "Payment with visitId=null linked via invoice must be attributed");
				assert.equal(dataset.orders[0]?.materialCostKopecks, 0, "Storno + auto_deduct net out to 0 regardless of timestamp order");
				assert.equal(dataset.priorDebtCarryOverKop, 120000, "Negative closed period debt must carry over");

				const clinicProfile: OneCClinicProfile = {
					id: orgId,
					name: "Тест",
					fullName: "ООО Тест",
					inn: "7701234567",
					kpp: null,
					ogrn: null,
					address: "Москва",
					phone: "+79000000000",
					email: null,
					bankAccount: null,
					bankBik: null,
					bankName: null,
					bankCorrAccount: null,
					chiefDoctorName: null,
					chiefAccountantName: null,
					defaultWarehouseName: "Склад",
					defaultCashRegisterName: "Касса",
					prefix1C: "DN",
				};

				const writeoffDoc = await fetchAndBuildWriteoffDocument(tx, {
					orgId,
					startTimestamp: new Date("2026-10-01T00:00:00.000Z"),
					endTimestamp: new Date("2026-10-31T23:59:59.999Z"),
					cleanDate: "20261012",
					startDateIso: "2026-10-12",
					prefix: "DN",
					clinic: clinicProfile,
					chartOfAccounts: DEFAULT_1C_CHART_OF_ACCOUNTS,
				});
				assert.equal(writeoffDoc.items.length, 0, "Incoming warehouse receipts and netted-out stornos must produce 0 writeoffs");

				const payrollDoc = await fetchAndBuildPayrollDocument(tx, {
					orgId,
					cleanDate: "20260901",
					startDateIso: "2026-09-01",
					endDateIso: "2026-09-30",
					prefix: "DN",
					chartOfAccounts: DEFAULT_1C_CHART_OF_ACCOUNTS,
				});
				assert.ok(payrollDoc);
				assert.equal(payrollDoc.employees[0]?.socialInsuranceTaxesKopecks, 0, "Self-employed (0 NDFL) must not carry 30% social insurance");
				assert.equal(payrollDoc.employees[0]?.netPayoutKopecks, -120000, "Negative payout carry-over preserved in 1C export");

				// Negative refund day export check
				await tx.insert(payments).values({
					organizationId: orgId,
					patientId,
					amountRub: -5000,
					amountKopecks: -500000n,
					method: "cash",
					status: "refunded",
					paidAt: new Date("2026-10-13T12:00:00.000Z"),
					clientMutationId: randomUUID(),
				});
				const payRec = await fetchAndReconcilePayments(tx, {
					orgId,
					startTimestamp: new Date("2026-10-13T00:00:00.000Z"),
					endTimestamp: new Date("2026-10-13T23:59:59.999Z"),
					cleanDate: "20261013",
					clinic: clinicProfile,
					chartOfAccounts: DEFAULT_1C_CHART_OF_ACCOUNTS,
				});
				assert.equal(payRec.totalPaymentsKop, -500000, "Negative refund day must be exported cleanly instead of skipped");
			});
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
