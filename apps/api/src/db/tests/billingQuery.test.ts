import assert from "node:assert";
import { after, before, describe, test } from "node:test";
import {
	applyPaymentRefundSettlementsInDb,
	createPaymentInDb,
	findPaymentByClientMutationIdInDb,
	getDefaultOrganizationId,
	getDocumentForBilling,
	getPatientForBilling,
	getPaymentsByPatientIdInDb,
	getVisitForBilling,
} from "../billingQuery.js";
import { withSuperuserBypass } from "../rls.js";
import * as schema from "../schema.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../../tests/support/fixtureOrganizations.js";

const NAMESPACE = "m3.billingQuery.test.ts";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const FOREIGN_ORG_ID = fixtureUuid(NAMESPACE, 2);

const PATIENT_1_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_2_ID = fixtureUuid(NAMESPACE, 11);
const FOREIGN_PATIENT_ID = fixtureUuid(NAMESPACE, 12);

const VISIT_1_ID = fixtureUuid(NAMESPACE, 20);
const DOC_1_ID = fixtureUuid(NAMESPACE, 30);

describe("billingQuery integration tests (Real PostgreSQL 18)", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORG_ID, FOREIGN_ORG_ID]);

		// Seed root organizations under superuser bypass
		await withSuperuserBypass(async (tx) => {
			await tx.insert(schema.organizations).values([
				{ id: ORG_ID, name: "M3 Billing Primary Clinic" },
				{ id: FOREIGN_ORG_ID, name: "M3 Billing Foreign Clinic" },
			]);
		});

		// Seed primary organization entities inside tenant context
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(schema.patients).values([
				{ id: PATIENT_1_ID, organizationId: ORG_ID, fullName: "Ivanov Ivan" },
				{ id: PATIENT_2_ID, organizationId: ORG_ID, fullName: "Petrov Petr" },
			]);
			await tx.insert(schema.visits).values([
				{ id: VISIT_1_ID, organizationId: ORG_ID, patientId: PATIENT_1_ID },
			]);
			await tx.insert(schema.generatedDocuments).values([
				{
					id: DOC_1_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					kind: "completed_works_act",
					title: "Act #101",
				},
			]);
		});

		// Seed foreign organization entities inside foreign tenant context
		await withFixtureTenant(FOREIGN_ORG_ID, async (tx) => {
			await tx.insert(schema.patients).values([
				{
					id: FOREIGN_PATIENT_ID,
					organizationId: FOREIGN_ORG_ID,
					fullName: "Sidorov Sidor",
				},
			]);
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID, FOREIGN_ORG_ID]);
	});

	describe("createPaymentInDb", () => {
		test("successfully creates a payment in real PostgreSQL DB", async () => {
			const payment = await withFixtureTenant(ORG_ID, async () => {
				return createPaymentInDb(ORG_ID, {
					patientId: PATIENT_1_ID,
					visitId: VISIT_1_ID,
					documentId: DOC_1_ID,
					amountRub: 2500.75,
					method: "card",
					clientMutationId: "mut-m3-001",
					taxDeductionCode: "1",
					payerFullName: "Ivanov Ivan",
				});
			});

			assert.ok(payment.id);
			assert.strictEqual(payment.organizationId, ORG_ID);
			assert.strictEqual(payment.patientId, PATIENT_1_ID);
			assert.strictEqual(payment.visitId, VISIT_1_ID);
			assert.strictEqual(payment.documentId, DOC_1_ID);
			assert.strictEqual(payment.amountRub, 2500.75);
			assert.strictEqual(payment.status, "paid");
			assert.strictEqual(payment.taxDeductionCode, "1");
			assert.strictEqual(payment.payerFullName, "Ivanov Ivan");
		});

		test("throws error when patient does not exist", async () => {
			const NON_EXISTENT_PATIENT = fixtureUuid(NAMESPACE, 999);
			await assert.rejects(
				() =>
					withFixtureTenant(ORG_ID, async () => {
						return createPaymentInDb(ORG_ID, {
							patientId: NON_EXISTENT_PATIENT,
							amountRub: 1000,
							method: "cash",
						});
					}),
				/not found or locked by another transaction/,
			);
		});

		test("prevents creating payment for a patient belonging to another organization (RLS isolation)", async () => {
			await assert.rejects(
				() =>
					withFixtureTenant(ORG_ID, async () => {
						return createPaymentInDb(ORG_ID, {
							patientId: FOREIGN_PATIENT_ID,
							amountRub: 1000,
							method: "cash",
						});
					}),
				/not found or locked by another transaction/,
			);
		});
	});

	describe("billing read & lookup queries", () => {
		test("getDefaultOrganizationId returns an existing organization ID", async () => {
			const defaultOrgId = await getDefaultOrganizationId();
			assert.ok(defaultOrgId);
			assert.strictEqual(typeof defaultOrgId, "string");
		});

		test("findPaymentByClientMutationIdInDb finds payment idempotently", async () => {
			const found = await withFixtureTenant(ORG_ID, async () => {
				return findPaymentByClientMutationIdInDb(ORG_ID, "mut-m3-001");
			});
			assert.ok(found);
			assert.strictEqual(found?.clientMutationId, "mut-m3-001");

			const notFound = await withFixtureTenant(ORG_ID, async () => {
				return findPaymentByClientMutationIdInDb(ORG_ID, "non-existent-mut");
			});
			assert.strictEqual(notFound, null);

			const nullMutation = await withFixtureTenant(ORG_ID, async () => {
				return findPaymentByClientMutationIdInDb(ORG_ID, null);
			});
			assert.strictEqual(nullMutation, null);
		});

		test("getPatientForBilling, getVisitForBilling, getDocumentForBilling return entities correctly", async () => {
			await withFixtureTenant(ORG_ID, async () => {
				const p = await getPatientForBilling(ORG_ID, PATIENT_1_ID);
				assert.ok(p);
				assert.strictEqual(p?.fullName, "Ivanov Ivan");

				const v = await getVisitForBilling(ORG_ID, VISIT_1_ID);
				assert.ok(v);
				assert.strictEqual(v?.id, VISIT_1_ID);

				const d = await getDocumentForBilling(ORG_ID, DOC_1_ID);
				assert.ok(d);
				assert.strictEqual(d?.title, "Act #101");

				// Cross-tenant lookup returns null due to RLS / explicit organizationId predicate
				const foreignP = await getPatientForBilling(ORG_ID, FOREIGN_PATIENT_ID);
				assert.strictEqual(foreignP, null);
			});
		});

		test("getPaymentsByPatientIdInDb returns all payments for a patient", async () => {
			const patientPayments = await withFixtureTenant(ORG_ID, async () => {
				return getPaymentsByPatientIdInDb(ORG_ID, PATIENT_1_ID);
			});
			assert.ok(patientPayments.length >= 1);
			assert.strictEqual(patientPayments[0].patientId, PATIENT_1_ID);
		});
	});

	describe("applyPaymentRefundSettlementsInDb", () => {
		test("updates payment status to refunded and restores back to paid", async () => {
			// 1. Create a payment to refund
			const paymentToRefund = await withFixtureTenant(ORG_ID, async () => {
				return createPaymentInDb(ORG_ID, {
					patientId: PATIENT_2_ID,
					amountRub: 500,
					method: "cash",
					clientMutationId: "mut-m3-refund-test",
				});
			});

			// 2. Apply refund settlement (fullyRefunded: true)
			const refundResult = await withFixtureTenant(ORG_ID, async () => {
				return applyPaymentRefundSettlementsInDb(ORG_ID, [
					{ paymentId: paymentToRefund.id, fullyRefunded: true },
				]);
			});
			assert.deepStrictEqual(refundResult.refunded, [paymentToRefund.id]);
			assert.deepStrictEqual(refundResult.restored, []);

			// Verify status in DB is "refunded"
			const refundedPayment = await withFixtureTenant(ORG_ID, async () => {
				const [p] = await getPaymentsByPatientIdInDb(ORG_ID, PATIENT_2_ID);
				return p;
			});
			assert.strictEqual(refundedPayment.status, "refunded");

			// 3. Restore payment settlement (fullyRefunded: false)
			const restoreResult = await withFixtureTenant(ORG_ID, async () => {
				return applyPaymentRefundSettlementsInDb(ORG_ID, [
					{ paymentId: paymentToRefund.id, fullyRefunded: false },
				]);
			});
			assert.deepStrictEqual(restoreResult.refunded, []);
			assert.deepStrictEqual(restoreResult.restored, [paymentToRefund.id]);

			// Verify status in DB is restored to "paid"
			const restoredPayment = await withFixtureTenant(ORG_ID, async () => {
				const [p] = await getPaymentsByPatientIdInDb(ORG_ID, PATIENT_2_ID);
				return p;
			});
			assert.strictEqual(restoredPayment.status, "paid");
		});
	});
});
