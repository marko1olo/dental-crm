/**
 * apps/api/src/tests/routes/cashboxCertificatePayment.test.ts
 *
 * Dedicated Cashbox 54-FZ Gift Certificate Payment & Split Verification Test.
 * Validates:
 * 1. Single tender checkout with method: "certificate" and Luhn-16 serial.
 * 2. Balance deduction, status transition to "depleted", and cashOperations audit log.
 * 3. Tag 1215 Advance Offset aggregation in fiscalReceiptQueue.
 * 4. Split checkout: certificate + card.
 * 5. Luhn-16 checksum failure rejection with 400 InvalidCertificateNumber.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { generateLuhn16Certificate } from "@dental/shared";
import {
	cashOperations,
	fiscalReceiptQueue,
	giftCertificates,
	organizations,
	patientInvoices,
	patients,
	payments,
} from "../../db/schema.js";
import { processCashboxPayment } from "../../routes/cashbox/cashboxPaymentProcessor.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

describe("Cashbox 54-FZ Gift Certificate Payment & Fiscalization", () => {
	it("executes single tender payment with method 'certificate' and fiscalizes as tag 1215 advance offset", async () => {
		const orgId = fixtureUuid("certPayTest", 1);
		const patientId = fixtureUuid("certPayTest", 2);
		const invoiceId = fixtureUuid("certPayTest", 3);
		await purgeFixtureOrganizations([orgId]);

		try {
			const validSerial = generateLuhn16Certificate(77);

			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Подарочных Сертификатов Кассы",
				});

				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Белова Анна Сергеевна",
					phone: "+79031112233",
					status: "active",
				});

				await tx.insert(patientInvoices).values({
					id: invoiceId,
					organizationId: orgId,
					patientId,
					totalRub: "5000.00",
					status: "issued",
				});

				await tx.insert(giftCertificates).values({
					organizationId: orgId,
					serialNumber: validSerial,
					nominalKopecks: 500000,
					initialBalanceKopecks: 500000,
					currentBalanceKopecks: 500000,
					purchaserPatientId: patientId,
					purchaserName: "Белова Анна Сергеевна",
					status: "active",
					expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
				});
			});

			const outcome = await processCashboxPayment(orgId, {
				patientId,
				invoiceId,
				amountRub: 5000,
				method: "certificate",
				certificateNumber: validSerial,
				clientMutationId: `mut-cert-single-${Date.now()}`,
				cashierFullName: "Кассир Иванова",
			});

			assert.equal(outcome.statusCode, 200, "Certificate payment must succeed with 200 OK");
			assert.equal(outcome.body.success, true);
			const paymentData = (outcome.body as any).data;
			assert.ok(paymentData.id, "Must return payment ID");
			assert.equal(paymentData.status, "paid");
			assert.equal(paymentData.certificateAmountKopecks, 500000);

			// Verify giftCertificates DB state: status -> depleted, currentBalanceKopecks -> 0
			await withFixtureTenant(orgId, async (tx) => {
				const [updatedCert] = await tx
					.select()
					.from(giftCertificates)
					.where(and(eq(giftCertificates.organizationId, orgId), eq(giftCertificates.serialNumber, validSerial)))
					.limit(1);

				assert.ok(updatedCert);
				assert.equal(updatedCert.status, "depleted", "Certificate status must be depleted");
				assert.equal(Number(updatedCert.currentBalanceKopecks), 0, "Balance must be 0 kopecks");

				// Verify fiscalReceiptQueue payload
				const [receipt] = await tx
					.select()
					.from(fiscalReceiptQueue)
					.where(and(eq(fiscalReceiptQueue.organizationId, orgId), eq(fiscalReceiptQueue.paymentId, paymentData.id)))
					.limit(1);

				assert.ok(receipt);
				const payload = receipt.payloadJson as Record<string, unknown>;
				assert.equal(payload.advanceOffsetRub, 5000, "Tag 1215 advance offset must match certificate amount");
				assert.equal(payload.certificateNumber, validSerial);

				// Verify cashOperations record
				const [cashOp] = await tx
					.select()
					.from(cashOperations)
					.where(and(eq(cashOperations.organizationId, orgId), eq(cashOperations.patientId, patientId)))
					.limit(1);

				assert.ok(cashOp);
				assert.equal(Number(cashOp.amountRub), 5000);
				assert.ok(cashOp.reasonText?.includes("Зачёт аванса"));
			});
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("rejects invalid certificate number failing Luhn algorithm", async () => {
		const orgId = fixtureUuid("certPayFail", 1);
		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Ошибок Сертификатов",
				});
			});

			const outcome = await processCashboxPayment(orgId, {
				amountRub: 3000,
				method: "certificate",
				certificateNumber: "7701-1234-5678-9999", // Invalid Luhn checksum
				clientMutationId: `mut-cert-invalid-${Date.now()}`,
			});

			assert.equal(outcome.statusCode, 400);
			assert.equal(outcome.body.error, "InvalidCertificateNumber");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("executes split payment with certificate and bank card", async () => {
		const orgId = fixtureUuid("certSplit", 1);
		const patientId = fixtureUuid("certSplit", 2);
		await purgeFixtureOrganizations([orgId]);

		try {
			const validSerial = generateLuhn16Certificate(88);

			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Сплит Оплаты Сертификатом",
				});

				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Волков Денис Игоревич",
					status: "active",
				});

				await tx.insert(giftCertificates).values({
					organizationId: orgId,
					serialNumber: validSerial,
					nominalKopecks: 300000,
					initialBalanceKopecks: 300000,
					currentBalanceKopecks: 300000,
					status: "active",
					expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
				});
			});

			// Чек 10 000 ₽: 3 000 ₽ сертификатом + 7 000 ₽ картой
			const outcome = await processCashboxPayment(orgId, {
				patientId,
				amountRub: 10000,
				method: "split",
				certificateNumber: validSerial,
				certificateAmountRub: 3000,
				electronicAmountRub: 7000,
				clientMutationId: `mut-split-cert-${Date.now()}`,
			});

			assert.equal(outcome.statusCode, 200);
			const paymentData = (outcome.body as any).data;
			assert.equal(paymentData.certificateAmountKopecks, 300000);

			await withFixtureTenant(orgId, async (tx) => {
				const [updatedCert] = await tx
					.select()
					.from(giftCertificates)
					.where(and(eq(giftCertificates.organizationId, orgId), eq(giftCertificates.serialNumber, validSerial)))
					.limit(1);

				assert.equal(updatedCert?.status, "depleted");
				assert.equal(Number(updatedCert?.currentBalanceKopecks), 0);

				const [receipt] = await tx
					.select()
					.from(fiscalReceiptQueue)
					.where(and(eq(fiscalReceiptQueue.organizationId, orgId), eq(fiscalReceiptQueue.paymentId, paymentData.id)))
					.limit(1);

				const payload = receipt?.payloadJson as Record<string, unknown>;
				assert.equal(payload.electronicRub, 7000, "Card tender must be 7 000 ₽");
				assert.equal(payload.advanceOffsetRub, 3000, "Certificate advance offset must be 3 000 ₽");
			});
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
