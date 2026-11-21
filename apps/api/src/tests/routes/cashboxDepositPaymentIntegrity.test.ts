/**
 * apps/api/src/tests/routes/cashboxDepositPaymentIntegrity.test.ts
 *
 * Red Team Integration Tests for Defect [FIN-05]:
 * Blocking Unauthorized Deposit Spendings with 400 Bad Request InsufficientDepositBalance.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	advanceDepositTaggings,
	cashBoxes,
	cashOperations,
	familyGroups,
	fiscalReceiptQueue,
	organizations,
	payments,
	patients,
	patientRelationships,
	users,
} from "../../db/schema.js";
import { processCashboxPayment } from "../../routes/cashbox/cashboxPaymentProcessor.js";
import { processFamilyRefund } from "../../services/familyWallet/modules/familyRefundOperation.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

describe("FIN-05: Cashbox Deposit Integrity & Unauthorized Spend Blocking", () => {
	it("blocks deposit payment with 400 InsufficientDepositBalance when patient has 0 balance", async () => {
		const orgId = fixtureUuid("fin05Zero", 1);
		const patientId = fixtureUuid("fin05Zero", 2);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Без Депозитов Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Бедняков Василий Васильевич",
					phone: "+79009998877",
				});
			});

			// Пациент пытается «оплатить с депозита» 25 000 ₽, имея баланс 0 ₽
			const outcome = await processCashboxPayment(orgId, {
				patientId,
				amountRub: 25000,
				method: "deposit",
				clientMutationId: `mut-dep-zero-${Date.now()}`,
			});

			assert.equal(outcome.statusCode, 400, "Must return HTTP 400 Bad Request");
			assert.equal(outcome.body.error, "InsufficientDepositBalance");
			assert.ok(
				outcome.body.message.includes("Недостаточно средств на депозите пациента"),
				`Message must explain shortage, got: ${outcome.body.message}`,
			);
			assert.ok(
				outcome.body.message.includes("Доступно: 0.00 ₽"),
				`Message must show 0.00 ₽ available, got: ${outcome.body.message}`,
			);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("successfully executes deposit payment when patient has family wallet balance and decrements it", async () => {
		const orgId = fixtureUuid("fin05Family", 1);
		const patientId = fixtureUuid("fin05Family", 2);
		const familyId = fixtureUuid("fin05Family", 3);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Семейных Депозитов Тест",
				});
				await tx.insert(familyGroups).values({
					id: familyId,
					organizationId: orgId,
					name: "Семья Ивановых",
					balance: "50000.00",
					headPatientId: patientId,
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Иванов Иван Иванович",
					phone: "+79005556677",
					familyGroupId: familyId,
				});
			});

			// Оплата 20 000 ₽ методом deposit
			const outcome = await processCashboxPayment(orgId, {
				patientId,
				amountRub: 20000,
				method: "deposit",
				clientMutationId: `mut-dep-fam-${Date.now()}`,
				cashierFullName: "Кассир Петрова",
			});

			assert.equal(outcome.statusCode, 200, "Must return HTTP 200 OK");
			if (outcome.statusCode === 200) {
				assert.equal(outcome.body.success, true);
				assert.equal(outcome.body.data.amountRub, 20000);
				assert.equal(outcome.body.data.method, "family_wallet");
			}

			// Проверяем, что семейный баланс уменьшился ровно на 20 000 ₽ (стал 30 000 ₽)
			const [updatedFamily] = await db
				.select()
				.from(familyGroups)
				.where(eq(familyGroups.id, familyId));
			assert.equal(Number(updatedFamily?.balance), 30000, "Family balance must be 30 000 ₽");

			// Проверяем фиксацию в кассовом аудите cashOperations
			const [op] = await db
				.select()
				.from(cashOperations)
				.where(eq(cashOperations.patientId, patientId));
			assert.ok(op, "Cash operation must be recorded");
			assert.equal(Number(op?.amountRub), 20000);
			assert.ok(op?.reasonText?.includes("Зачёт аванса/депозита"));
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("successfully executes deposit payment from advanceDepositTaggings and marks it spent", async () => {
		const orgId = fixtureUuid("fin05Advance", 1);
		const patientId = fixtureUuid("fin05Advance", 2);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Авансовых Депозитов Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Смирнова Елена Сергеевна",
					phone: "+79007778899",
				});
				// Зачисляем аванс 15 000 ₽
				await tx.insert(advanceDepositTaggings).values({
					organizationId: orgId,
					patientName: "Смирнова Елена Сергеевна",
					depositAmountRub: "15000.00",
					taggedTargetType: "patient_deposit",
					taggedTargetName: "Аванс за ортодонтию",
					allocationStatus: "unallocated",
				});
			});

			// Оплачиваем 10 000 ₽ методом deposit
			const outcome = await processCashboxPayment(orgId, {
				patientId,
				amountRub: 10000,
				method: "deposit",
				clientMutationId: `mut-dep-adv-${Date.now()}`,
			});

			assert.equal(outcome.statusCode, 200);

			// Проверяем, что остаток аванса уменьшился до 5 000 ₽
			const [adv] = await db
				.select()
				.from(advanceDepositTaggings)
				.where(eq(advanceDepositTaggings.patientName, "Смирнова Елена Сергеевна"));
			assert.equal(Number(adv?.depositAmountRub), 5000, "Remaining advance must be 5 000 ₽");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("blocks split payment when deposit component exceeds available deposit balance", async () => {
		const orgId = fixtureUuid("fin05SplitShortage", 1);
		const patientId = fixtureUuid("fin05SplitShortage", 2);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Сплит Депозитов Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Петров Сергей Николаевич",
					phone: "+79004445566",
				});
				// У пациента аванс 5 000 ₽
				await tx.insert(advanceDepositTaggings).values({
					organizationId: orgId,
					patientName: "Петров Сергей Николаевич",
					depositAmountRub: "5000.00",
					taggedTargetType: "patient_deposit",
					taggedTargetName: "Аванс 5 000 ₽",
					allocationStatus: "unallocated",
				});
			});

			// Попытка сплит-оплаты: 10 000 ₽ нал + 15 000 ₽ депозит (при доступных 5 000 ₽)
			const outcome = await processCashboxPayment(orgId, {
				patientId,
				amountRub: 25000,
				method: "split",
				cashAmountKopecks: 1000000,
				depositAmountKopecks: 1500000, // требуется 15 000 ₽, а доступно только 5 000 ₽
				clientMutationId: `mut-split-fail-${Date.now()}`,
			});

			assert.equal(outcome.statusCode, 400);
			assert.equal(outcome.body.error, "InsufficientDepositBalance");
			assert.ok(outcome.body.message.includes("Доступно: 5000.00 ₽"));
			assert.ok(outcome.body.message.includes("требуется: 15000.00 ₽"));
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("allows 100% warranty payments with 0 ₽ without touching deposit balances (Mandate 8e)", async () => {
		const orgId = fixtureUuid("fin05Warranty", 1);
		const patientId = fixtureUuid("fin05Warranty", 2);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Врачебной Автономии Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Соколова Анна Михайловна",
					phone: "+79001239876",
				});
			});

			const outcome = await processCashboxPayment(orgId, {
				patientId,
				amountRub: 0,
				method: "warranty",
				isWarranty: true,
				note: "Гарантийная переделка пломбы зуба 46",
				clientMutationId: `mut-warr-${Date.now()}`,
			});

			assert.equal(outcome.statusCode, 200);
			if (outcome.statusCode === 200) {
				assert.equal(outcome.body.data.method, "warranty");
				assert.equal(outcome.body.data.amountRub, 0);
			}
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("enqueues receipt to fiscalReceiptQueue with pending_print status on commercial payment", async () => {
		const orgId = fixtureUuid("fin05Fiscal", 1);
		const patientId = fixtureUuid("fin05Fiscal", 2);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Фискальной Очереди Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Петров Петр Петрович",
					phone: "+79007778899",
				});
			});

			const clientMutationId = `mut-fisc-${Date.now()}`;
			const outcome = await processCashboxPayment(orgId, {
				patientId,
				amountRub: 5500,
				method: "card",
				clientMutationId,
			});

			assert.equal(outcome.statusCode, 200);
			if (outcome.statusCode === 200) {
				assert.equal(outcome.body.data.status, "paid");
				assert.ok(outcome.body.data.fiscalReceiptQueueId, "Must return fiscalReceiptQueueId");

				const [queueItem] = await db
					.select()
					.from(fiscalReceiptQueue)
					.where(eq(fiscalReceiptQueue.id, String(outcome.body.data.fiscalReceiptQueueId)));

				assert.ok(queueItem, "Receipt must be enqueued in database table fiscalReceiptQueue");
				assert.equal(queueItem.status, "pending_print");
				assert.equal(queueItem.receiptType, "income");
				assert.equal(queueItem.organizationId, orgId);
				assert.equal((queueItem.payloadJson as Record<string, unknown>).amountRub, 5500);
			}
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("blocks deposit payment with 403 UnauthorizedFamilySpend when member has canSpendFamilyWallet === false (DEF-FAM-01)", async () => {
		const orgId = fixtureUuid("fin05BannedMember", 1);
		const headPatientId = fixtureUuid("fin05BannedMember", 2);
		const memberPatientId = fixtureUuid("fin05BannedMember", 3);
		const familyId = fixtureUuid("fin05BannedMember", 4);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Запрета Семейных Трат Тест",
				});
				await tx.insert(familyGroups).values({
					id: familyId,
					organizationId: orgId,
					name: "Семья Петровых",
					balance: "100000.00",
					headPatientId: headPatientId,
				});
				await tx.insert(patients).values([
					{
						id: headPatientId,
						organizationId: orgId,
						fullName: "Петров Петр Петрович",
						phone: "+79001110011",
						familyGroupId: familyId,
					},
					{
						id: memberPatientId,
						organizationId: orgId,
						fullName: "Петров Младший Петрович",
						phone: "+79001110022",
						familyGroupId: familyId,
					},
				]);
				// Явный запрет на списание семейного кошелька
				await tx.insert(patientRelationships).values({
					organizationId: orgId,
					patientId: memberPatientId,
					relatedPatientId: headPatientId,
					relationshipType: "child",
					canSpendFamilyWallet: false,
				});
			});

			const outcome = await processCashboxPayment(orgId, {
				patientId: memberPatientId,
				amountRub: 5000,
				method: "deposit",
				clientMutationId: `mut-banned-member-${Date.now()}`,
			});

			assert.equal(outcome.statusCode, 403, "Must return HTTP 403 Forbidden");
			assert.equal(outcome.body.error, "UnauthorizedFamilySpend");
			assert.ok(
				outcome.body.message.includes("canSpendFamilyWallet = false"),
				`Message must indicate explicit spending ban, got: ${outcome.body.message}`,
			);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("blocks deposit payment with 403 UnauthorizedFamilySpend when spend limit is exceeded (DEF-FAM-01 / DEF-FAM-04)", async () => {
		const orgId = fixtureUuid("fin05LimitExceeded", 1);
		const headPatientId = fixtureUuid("fin05LimitExceeded", 2);
		const memberPatientId = fixtureUuid("fin05LimitExceeded", 3);
		const familyId = fixtureUuid("fin05LimitExceeded", 4);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Лимитов Семейных Трат Тест",
				});
				await tx.insert(familyGroups).values({
					id: familyId,
					organizationId: orgId,
					name: "Семья Сидоровых",
					balance: "100000.00",
					headPatientId: headPatientId,
				});
				await tx.insert(patients).values([
					{
						id: headPatientId,
						organizationId: orgId,
						fullName: "Сидоров Сидор Сидорович",
						phone: "+79002220011",
						familyGroupId: familyId,
					},
					{
						id: memberPatientId,
						organizationId: orgId,
						fullName: "Сидорова Светлана Сидоровна",
						phone: "+79002220022",
						familyGroupId: familyId,
					},
				]);
				// Лимит 10 000 ₽ (1 000 000 копеек)
				await tx.insert(patientRelationships).values({
					organizationId: orgId,
					patientId: memberPatientId,
					relatedPatientId: headPatientId,
					relationshipType: "child",
					canSpendFamilyWallet: true,
					spendLimitKopecks: 1000000,
				});
			});

			// Попытка списать 15 000 ₽ при лимите 10 000 ₽
			const outcome = await processCashboxPayment(orgId, {
				patientId: memberPatientId,
				amountRub: 15000,
				method: "deposit",
				clientMutationId: `mut-limit-exceeded-${Date.now()}`,
			});

			assert.equal(outcome.statusCode, 403, "Must return HTTP 403 Forbidden");
			assert.equal(outcome.body.error, "UnauthorizedFamilySpend");
			assert.ok(
				outcome.body.message.includes("Превышен установленный лимит списания"),
				`Message must indicate spend limit breach, got: ${outcome.body.message}`,
			);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("blocks deposit payment with 403 UnauthorizedFamilySpend when non-member has no kinship or family link (DEF-FAM-01)", async () => {
		const orgId = fixtureUuid("fin05Unrelated", 1);
		const headPatientId = fixtureUuid("fin05Unrelated", 2);
		const unrelatedPatientId = fixtureUuid("fin05Unrelated", 3);
		const familyId = fixtureUuid("fin05Unrelated", 4);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Чужака Тест",
				});
				await tx.insert(familyGroups).values({
					id: familyId,
					organizationId: orgId,
					name: "Семья Кузнецовых",
					balance: "80000.00",
					headPatientId: headPatientId,
				});
				await tx.insert(patients).values([
					{
						id: headPatientId,
						organizationId: orgId,
						fullName: "Кузнецов Кузьма Кузьмич",
						phone: "+79003330011",
						familyGroupId: familyId,
					},
					{
						id: unrelatedPatientId,
						organizationId: orgId,
						fullName: "Посторонний Прохор Прохорович",
						phone: "+79003330099",
						// Не состоит в семье!
					},
				]);
			});

			// Чужак пытается списать средства с депозита (указывая deposit), но у него нет ни своего депозита, ни связи
			const outcome = await processCashboxPayment(orgId, {
				patientId: unrelatedPatientId,
				amountRub: 3000,
				method: "deposit",
				clientMutationId: `mut-unrelated-${Date.now()}`,
			});

			// Должен вернуть либо 400 (нет баланса), либо 403 (если пытался адресовать семью)
			assert.ok(
				outcome.statusCode === 400 || outcome.statusCode === 403,
				`Must reject unauthorized deposit spend with 400 or 403, got ${outcome.statusCode}`,
			);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("processFamilyRefund rejects refund when requested patient is not head of family (DEF-FAM-02)", async () => {
		const orgId = fixtureUuid("fin05RefundTarget", 1);
		const headPatientId = fixtureUuid("fin05RefundTarget", 2);
		const memberPatientId = fixtureUuid("fin05RefundTarget", 3);
		const familyId = fixtureUuid("fin05RefundTarget", 4);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Возврата Депозита Тест",
				});
				await tx.insert(familyGroups).values({
					id: familyId,
					organizationId: orgId,
					name: "Семья Волковых",
					balance: "50000.00",
					headPatientId: headPatientId,
				});
				await tx.insert(patients).values([
					{
						id: headPatientId,
						organizationId: orgId,
						fullName: "Волков Владимир Владимирович",
						phone: "+79004440011",
						familyGroupId: familyId,
					},
					{
						id: memberPatientId,
						organizationId: orgId,
						fullName: "Волков Младший Владимирович",
						phone: "+79004440022",
						familyGroupId: familyId,
					},
				]);
			});

			// Попытка оформить возврат остатка депозита на имя члена семьи (не главы)
			await assert.rejects(
				async () => {
					await processFamilyRefund({
						organizationId: orgId,
						familyGroupId: familyId,
						amountRub: 10000,
						patientId: memberPatientId, // НЕ ГЛАВА!
						clientMutationId: `mut-refund-not-owner-${Date.now()}`,
						reasonText: "Возврат по требованию члена семьи",
					});
				},
				(err: any) => {
					assert.equal(err.code, "UNAUTHORIZED_FAMILY_REFUND_RECIPIENT");
					assert.equal(err.statusCode, 403);
					assert.ok(
						err.message.includes("Возврат семейного депозита разрешен строго владельцу счета"),
					);
					return true;
				},
			);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
