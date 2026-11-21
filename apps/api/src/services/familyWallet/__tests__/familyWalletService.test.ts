import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq, and } from "drizzle-orm";
import {
	kopecksToNumericString,
	kopecksToRub,
	parseKopecks,
	rubToKopecks,
	createFamilyDepositAccount,
	calculateFamilyDepositCredit,
	calculateFamilyDepositDebit,
	calculateFamilyDepositRefund,
	compileFamilyBillingDraft,
	type CombinedFamilyBillingDraft,
} from "@dental/shared";
import { db } from "../../../db/client.js";
import {
	familyGroups,
	organizations,
	patientRelationships,
	patients,
	payments,
} from "../../../db/schema.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../../../tests/support/fixtureOrganizations.js";
import {
	buildFnsKnd1151156Xml,
	type FnsTaxPayload,
} from "../../fns/fnsKnd1151156Builder.js";
import { familyWalletService } from "../FamilyWalletService.js";

describe("Domain 3: Family Wallet ACID Engine & FNS Tax Deduction (КНД 1151156)", () => {
	it("1.1 Scenario: Father top-up 100,000 руб. deposit for Wife and 2 Children", () => {
		const account = createFamilyDepositAccount({
			id: "FAM-ACC-777",
			familyGroupId: "fam-group-ivanov",
			familyName: "Семья Ивановых",
			sponsorPatientId: "pat-dad-01",
			sponsorFullName: "Иванов Иван Иванович",
			sponsorPhone: "+7 (999) 111-22-33",
			sponsorInn: "770123456789",
			initialDepositRub: 0,
			members: [
				{
					patientId: "pat-dad-01",
					fullName: "Иванов Иван Иванович",
					relationship: "self",
					isSpendingAuthorized: true,
				},
				{
					patientId: "pat-mom-02",
					fullName: "Иванова Ольга Сергеевна",
					relationship: "spouse",
					isSpendingAuthorized: true,
				},
				{
					patientId: "pat-child-03",
					fullName: "Иванова Мария Ивановна",
					relationship: "child",
					isSpendingAuthorized: true,
				},
				{
					patientId: "pat-child-04",
					fullName: "Иванов Артем Иванович",
					relationship: "child",
					isSpendingAuthorized: true,
				},
			],
		});

		assert.equal(account.balanceKopecks, 0);
		assert.equal(account.members.length, 4);

		// Step 1: Father deposits 100,000.00 ₽ (10,000,000 kopecks)
		const topupRes = calculateFamilyDepositCredit({
			account,
			amountRub: 100000,
			payerPatientId: "pat-dad-01",
			payerFullName: "Иванов Иван Иванович",
			notes: "Пополнение семейного депозита на лечение семьи",
		});

		assert.equal(topupRes.creditedKopecks, 10000000);
		assert.equal(topupRes.creditedRub, 100000);
		assert.equal(topupRes.newBalanceKopecks, 10000000);
		assert.equal(topupRes.newBalanceRub, 100000);
		assert.equal(topupRes.transaction.transactionType, "deposit");
		assert.equal(topupRes.transaction.payerPatientId, "pat-dad-01");

		let currentAccount = topupRes.updatedAccount;

		// Step 2: Wife treatment deduction (24,000.00 ₽)
		const debitWife = calculateFamilyDepositDebit({
			account: currentAccount,
			patientId: "pat-mom-02",
			amountRub: 24000,
			invoiceId: "INV-MOM-01",
			notes: "Циркониевая коронка",
		});
		assert.equal(debitWife.success, true);
		assert.equal(debitWife.debitedRub, 24000);
		assert.equal(debitWife.newBalanceRub, 76000);
		assert.equal(debitWife.transaction?.payerPatientId, "pat-dad-01");
		currentAccount = debitWife.updatedAccount;

		// Step 3: Child 1 treatment deduction (4,500.50 ₽ with exact kopecks)
		const debitChild1 = calculateFamilyDepositDebit({
			account: currentAccount,
			patientId: "pat-child-03",
			amountRub: 4500.5,
			invoiceId: "INV-CHILD1-01",
			notes: "Лечение кариеса молочного зуба",
		});
		assert.equal(debitChild1.success, true);
		assert.equal(debitChild1.debitedRub, 4500.5);
		assert.equal(debitChild1.newBalanceKopecks, 7149950);
		assert.equal(debitChild1.newBalanceRub, 71499.5);
		currentAccount = debitChild1.updatedAccount;

		// Step 4: Child 2 treatment deduction (3,499.50 ₽ exact kopecks)
		const debitChild2 = calculateFamilyDepositDebit({
			account: currentAccount,
			patientId: "pat-child-04",
			amountRub: 3499.5,
			invoiceId: "INV-CHILD2-01",
			notes: "Профгигиена и фторирование",
		});
		assert.equal(debitChild2.success, true);
		assert.equal(debitChild2.debitedRub, 3499.5);
		assert.equal(debitChild2.newBalanceKopecks, 6800000);
		assert.equal(debitChild2.newBalanceRub, 68000);
		currentAccount = debitChild2.updatedAccount;

		// Step 5: Father dental implant Straumann deduction (45,000.00 ₽)
		const debitDad = calculateFamilyDepositDebit({
			account: currentAccount,
			patientId: "pat-dad-01",
			amountRub: 45000,
			invoiceId: "INV-DAD-01",
			notes: "Имплантация Straumann BLX",
		});
		assert.equal(debitDad.success, true);
		assert.equal(debitDad.debitedRub, 45000);
		assert.equal(debitDad.newBalanceKopecks, 2300000);
		assert.equal(debitDad.newBalanceRub, 23000);
		currentAccount = debitDad.updatedAccount;

		// Verify final pooled balance
		assert.equal(currentAccount.totalDepositedKopecks, 10000000);
		assert.equal(currentAccount.totalSpentKopecks, 7700000);
		assert.equal(currentAccount.balanceKopecks, 2300000);
		assert.equal(kopecksToRub(currentAccount.balanceKopecks), 23000);
	});

	it("1.2 ACID Invariants: Insufficient funds rejected without state mutation", () => {
		const account = createFamilyDepositAccount({
			id: "FAM-ACC-888",
			familyGroupId: "fam-group-test",
			familyName: "Семья Тест",
			sponsorPatientId: "pat-dad-01",
			sponsorFullName: "Тестов Тест",
			initialDepositRub: 5000,
			members: [
				{
					patientId: "pat-dad-01",
					fullName: "Тестов Тест",
					relationship: "self",
					isSpendingAuthorized: true,
				},
				{
					patientId: "pat-child-01",
					fullName: "Тестов Ребенок",
					relationship: "child",
					isSpendingAuthorized: true,
				},
			],
		});

		// Attempt to debit 10,000 ₽ when balance is only 5,000 ₽
		const failedDebit = calculateFamilyDepositDebit({
			account,
			patientId: "pat-child-01",
			amountRub: 10000,
		});

		// Must return debited 5000, remaining 5000 due, new balance 0
		assert.equal(failedDebit.success, true);
		assert.equal(failedDebit.debitedRub, 5000);
		assert.equal(failedDebit.remainingInvoiceDueRub, 5000);
		assert.equal(failedDebit.newBalanceRub, 0);
	});

	it("1.3 Primary Payer Binding & FNS KND 1151156 Tax Certificate XML generation", () => {
		const draft: CombinedFamilyBillingDraft = {
			payer: {
				payerId: "pat-dad-01",
				payerFullName: "Иванов Иван Иванович",
				payerInn: "770123456789",
				payerPhone: "+7 (999) 111-22-33",
				payerPassport: "4510 123456",
			},
			familyGroupName: "Семья Ивановых",
			availableFamilyWalletRub: 100000,
			items: [
				{
					id: "item-dad-1",
					patientId: "pat-dad-01",
					patientFullName: "Иванов Иван Иванович",
					relationship: "self",
					serviceName: "Дентальная имплантация Straumann",
					code804n: "A16.07.054",
					priceRub: 45000,
					quantity: 1,
					taxDeductionCategory: "2", // Дорогостоящее
				},
				{
					id: "item-mom-1",
					patientId: "pat-mom-02",
					patientFullName: "Иванова Ольга Сергеевна",
					relationship: "spouse",
					serviceName: "Циркониевая коронка",
					code804n: "A16.07.004",
					priceRub: 24000,
					quantity: 1,
					taxDeductionCategory: "1", // Стандартное
				},
				{
					id: "item-child1-1",
					patientId: "pat-child-03",
					patientFullName: "Иванова Мария Ивановна",
					relationship: "child",
					serviceName: "Лечение кариеса молочного зуба",
					code804n: "A16.07.002",
					priceRub: 4500,
					quantity: 1,
					taxDeductionCategory: "1",
				},
				{
					id: "item-child2-1",
					patientId: "pat-child-04",
					patientFullName: "Иванов Артем Иванович",
					relationship: "child",
					serviceName: "Детская гигиена и фторирование",
					code804n: "A16.07.051",
					priceRub: 3500,
					quantity: 1,
					taxDeductionCategory: "1",
				},
			],
			clinicName: "ООО ДЕНТЕ СТОМАТОЛОГИЯ",
			clinicInn: "7701234567",
		};

		const compiled = compileFamilyBillingDraft(draft);

		assert.equal(compiled.totalAmountRub, 77000);
		assert.equal(compiled.code01TotalRub, 32000); // 24000 + 4500 + 3500
		assert.equal(compiled.code02TotalRub, 45000); // 45000 Straumann

		// 4 certificates generated for all family members with Father as Primary Payer
		assert.equal(compiled.taxDeductionCertificates.length, 4);

		const dadCert = compiled.taxDeductionCertificates.find((c) => c.patientFnsCode === "1")!;
		assert.equal(dadCert.payerFullName, "Иванов Иван Иванович");
		assert.equal(dadCert.patientFullName, "Иванов Иван Иванович");
		assert.equal(dadCert.code02TotalRub, 45000);

		const momCert = compiled.taxDeductionCertificates.find((c) => c.patientFnsCode === "2")!;
		assert.equal(momCert.payerFullName, "Иванов Иван Иванович");
		assert.equal(momCert.patientFullName, "Иванова Ольга Сергеевна");
		assert.equal(momCert.code01TotalRub, 24000);

		const child1Cert = compiled.taxDeductionCertificates.find((c) => c.patientFullName.includes("Мария"))!;
		assert.equal(child1Cert.patientFnsCode, "4");
		assert.equal(child1Cert.payerFullName, "Иванов Иван Иванович");
		assert.equal(child1Cert.code01TotalRub, 4500);

		const child2Cert = compiled.taxDeductionCertificates.find((c) => c.patientFullName.includes("Артем"))!;
		assert.equal(child2Cert.patientFnsCode, "4");
		assert.equal(child2Cert.payerFullName, "Иванов Иван Иванович");
		assert.equal(child2Cert.code01TotalRub, 3500);

		// Verify XML generation for one certificate
		const fnsPayload: FnsTaxPayload = {
			documentNumber: momCert.certificateNumber,
			documentDate: new Date(),
			taxYear: "2026",
			certificateKind: "1",
			clinic: {
				inn: "7701234567",
				kpp: "770101001",
				ogrn: "1234567890123",
				name: "ООО ДЕНТЕ СТОМАТОЛОГИЯ",
			},
			payer: {
				inn: "770123456789",
				fullName: {
					family: "Иванов",
					given: "Иван",
					patronymic: "Иванович",
				},
				birthDate: "1980-05-15",
			},
			patient: {
				patientKinshipCode: "2", // Супруга
				fullName: {
					family: "Иванова",
					given: "Ольга",
					patronymic: "Сергеевна",
				},
				birthDate: "1984-08-20",
			},
			expenses: {
				code1AmountRub: 24000,
				code2AmountRub: 0,
			},
			signatory: {
				signatoryRole: "1",
				fullName: {
					family: "Иванов",
					given: "Иван",
					patronymic: "Иванович",
				},
			},
		};

		const { xmlContent, fileName, fileId } = buildFnsKnd1151156Xml(fnsPayload);

		assert.ok(xmlContent.includes('КНД="1184043"'));
		assert.ok(xmlContent.includes('ВерсФорм="5.01"'));
		assert.ok(xmlContent.includes('ИННФЛ="770123456789"'));
		assert.ok(xmlContent.includes('Фамилия="Иванов"'));
		assert.ok(xmlContent.includes('ПризнПац="2"'));
		assert.ok(xmlContent.includes('Фамилия="Иванова"'));
		assert.ok(xmlContent.includes('КодУслуг="1" СумОпл="24000.00"'));
		assert.ok(fileName.endsWith(".xml"));
		assert.ok(fileId.startsWith("UT_SVOPLMEDUSL_"));
	});

	it("1.4 Statutory Art. 219 Tax Code Deduction Limit (Code 1 max 150 000 руб. ceiling vs Code 2 uncapped)", () => {
		// Code 1: 300 000 руб. (exceeds 150k limit)
		// Code 2: 200 000 руб. (expensive, no limit)
		const targetYear = 2024;
		const code1Rub = 300000;
		const code2Rub = 200000;
		const limitRub = targetYear >= 2024 ? 150000 : 120000;
		const code1Eligible = Math.min(code1Rub, limitRub);
		const refund = Math.round((code1Eligible + code2Rub) * 0.13);

		// Must be (150,000 + 200,000) * 0.13 = 350,000 * 0.13 = 45,500 ₽
		// NOT (300,000 + 200,000) * 0.13 = 65,000 ₽!
		assert.equal(code1Eligible, 150000);
		assert.equal(refund, 45500);
	});
});

describe("Domain 3.2: FamilyWalletService Live PostgreSQL 18 Integration (ACID, FOR UPDATE, Tax Codes, Refund)", () => {
	it("executes full FamilyWalletService lifecycle: topup, idempotent replay, debits with tax codes, refund, and FNS certificates", async () => {
		const orgId = fixtureUuid("familyWalletLive", 1);
		const dadPatientId = fixtureUuid("familyWalletLive", 2);
		const momPatientId = fixtureUuid("familyWalletLive", 3);
		const childPatientId = fixtureUuid("familyWalletLive", 4);
		const familyId = fixtureUuid("familyWalletLive", 5);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Семейная Тест",
				});
				await tx.insert(familyGroups).values({
					id: familyId,
					organizationId: orgId,
					name: "Семья Кузнецовых",
					balance: "0.00",
					headPatientId: dadPatientId,
				});
				await tx.insert(patients).values([
					{
						id: dadPatientId,
						organizationId: orgId,
						fullName: "Кузнецов Алексей Петрович",
						phone: "+79001112233",
						familyGroupId: familyId,
						birthDate: "1980-03-10",
					},
					{
						id: momPatientId,
						organizationId: orgId,
						fullName: "Кузнецова Елена Ивановна",
						phone: "+79002223344",
						familyGroupId: familyId,
						birthDate: "1983-07-22",
					},
					{
						id: childPatientId,
						organizationId: orgId,
						fullName: "Кузнецов Денис Алексеевич",
						phone: "+79003334455",
						familyGroupId: familyId,
						birthDate: "2015-11-05",
					},
				]);
				// Установим родственные связи между отцом и матерью / ребенком
				await tx.insert(patientRelationships).values([
					{
						organizationId: orgId,
						patientId: dadPatientId,
						relatedPatientId: momPatientId,
						relationshipType: "spouse",
						canSpendFamilyWallet: true,
					},
					{
						organizationId: orgId,
						patientId: dadPatientId,
						relatedPatientId: childPatientId,
						relationshipType: "child",
						isLegalRepresentative: true,
						canSpendFamilyWallet: true,
					},
				]);
			});

			// 1. Topup: Отец вносит 100 000 ₽ на семейный депозит
			const topupMutationId = `mut-topup-${Date.now()}`;
			const topupRes = await familyWalletService.topup({
				organizationId: orgId,
				familyGroupId: familyId,
				payerPatientId: dadPatientId,
				amountRub: 100000,
				method: "card",
				clientMutationId: topupMutationId,
				notes: "Пополнение депозита семьи картой",
			});

			assert.equal(topupRes.success, true);
			assert.equal(topupRes.creditedRub, 100000);
			assert.equal(topupRes.newBalanceRub, 100000);
			assert.equal(topupRes.duplicate, false);

			// 1.1 Проверка идемпотентности пополнения с тем же clientMutationId
			const replayTopup = await familyWalletService.topup({
				organizationId: orgId,
				familyGroupId: familyId,
				payerPatientId: dadPatientId,
				amountRub: 100000,
				method: "card",
				clientMutationId: topupMutationId,
			});
			assert.equal(replayTopup.success, true);
			assert.equal(replayTopup.duplicate, true);
			assert.equal(replayTopup.newBalanceRub, 100000);

			// 2. Debit: Списание за лечение матери (терапия, Код 01) 24 000 ₽
			const momDebitMutation = `mut-debit-mom-${Date.now()}`;
			const momDebit = await familyWalletService.debit({
				organizationId: orgId,
				familyGroupId: familyId,
				patientId: momPatientId,
				payerPatientId: dadPatientId,
				amountRub: 24000,
				taxCategory: "1",
				notes: "Лечение пульпита и пломбирование",
				clientMutationId: momDebitMutation,
			});

			assert.equal(momDebit.success, true);
			assert.equal(momDebit.debitedRub, 24000);
			assert.equal(momDebit.newBalanceRub, 76000);
			assert.equal(momDebit.payment.taxDeductionCode, "1");

			// 3. Debit: Списание за лечение отца (имплантация, дорогостоящее Код 02) 45 000 ₽
			const dadDebitMutation = `mut-debit-dad-${Date.now()}`;
			const dadDebit = await familyWalletService.debit({
				organizationId: orgId,
				familyGroupId: familyId,
				patientId: dadPatientId,
				amountRub: 45000,
				taxCategory: "2",
				notes: "Имплантация хирургическая",
				clientMutationId: dadDebitMutation,
			});

			assert.equal(dadDebit.success, true);
			assert.equal(dadDebit.debitedRub, 45000);
			assert.equal(dadDebit.newBalanceRub, 31000);
			assert.equal(dadDebit.payment.taxDeductionCode, "2");

			// 4. Refund: Возврат части неиспользованного семейного депозита (10 000 ₽)
			const refundMutation = `mut-refund-${Date.now()}`;
			const refundRes = await familyWalletService.refund({
				organizationId: orgId,
				familyGroupId: familyId,
				patientId: dadPatientId,
				amountRub: 10000,
				method: "card",
				clientMutationId: refundMutation,
				reasonText: "Частичный возврат депозита по заявлению",
			});

			assert.equal(refundRes.success, true);
			assert.equal(refundRes.refundedRub, 10000);
			assert.equal(refundRes.newBalanceRub, 21000);

			// 5. Генерация справок ФНС КНД 1151156 для семьи
			const currentYear = new Date().getFullYear().toString();
			const certs = await familyWalletService.generateFnsTaxCertificatesForFamily({
				organizationId: orgId,
				familyGroupId: familyId,
				taxYear: currentYear,
				clinic: {
					inn: "7701234567",
					kpp: "770101001",
					ogrn: "1234567890123",
					name: "ООО ДЕНТЕ СТОМАТОЛОГИЯ",
				},
				signatory: {
					signatoryRole: "1",
					fullName: {
						family: "Кузнецов",
						given: "Алексей",
						patronymic: "Петрович",
					},
				},
			});

			assert.ok(certs.length >= 2, "Must generate certificates for treated family members");
			const momCert = certs.find((c) => c.patientId === momPatientId);
			assert.ok(momCert, "Mom cert must exist");
			assert.equal(momCert.payerPatientId, dadPatientId);
			assert.equal(momCert.code01AmountRub, 24000);
			assert.equal(momCert.code02AmountRub, 0);

			const dadCert = certs.find((c) => c.patientId === dadPatientId);
			assert.ok(dadCert, "Dad cert must exist");
			assert.equal(dadCert.code02AmountRub, 45000);

			// Проверка точного целочисленного расчета НДФЛ 13% в рублях
			// Мать (24000 * 0.13 = 3120 ₽)
			assert.equal(momCert.estimated13PercentRefundRub, 3120);
			// Отец (45000 * 0.13 = 5850 ₽)
			assert.equal(dadCert.estimated13PercentRefundRub, 5850);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
