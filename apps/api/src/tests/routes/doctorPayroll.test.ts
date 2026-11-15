/**
 * apps/api/src/tests/routes/doctorPayroll.test.ts
 *
 * Comprehensive Integration & Unit Tests for Doctor Payroll, Commissions & Worksheets (SSOT):
 * - Cash method vs appointment visit date period sampling (DEFECT 1).
 * - Multi-type inventory transactions inclusion (auto_deduct, usage, write_off, emergency_overdraft, shift_batch_deduction) (DEFECT 2).
 * - Exclusion of general clinic overhead items (inventoryItems.isOverhead = true).
 * - Exact integer kopeck calculations without float drift (Mandate 8wy).
 * - Specialty and clinical category normalization.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	normalizeClinicalCategory,
	fetchDoctorPayrollDataset,
	fetchClosedPayrollStatements,
} from "../../routes/doctorPayrollDbQueries.js";
import {
	appointments,
	doctorPayrollStatements,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patients,
	payments,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

describe("Doctor Payroll SSOT & DbQueries Integration", () => {
	it("1. Normalizes clinical categories and specialty fallbacks accurately", () => {
		assert.equal(normalizeClinicalCategory("prosthetics"), "orthopedics");
		assert.equal(normalizeClinicalCategory("surgery"), "surgery");
		assert.equal(normalizeClinicalCategory("orthodontics"), "orthodontics");
		assert.equal(normalizeClinicalCategory("hygiene"), "hygiene");
		assert.equal(normalizeClinicalCategory("retail"), "retail_hygiene");
		assert.equal(normalizeClinicalCategory("pediatric"), "pediatric");
		assert.equal(normalizeClinicalCategory("therapy"), "therapy");
		assert.equal(normalizeClinicalCategory(null, "orthopedist"), "orthopedics");
		assert.equal(normalizeClinicalCategory(null, "implantologist"), "surgery");
		assert.equal(normalizeClinicalCategory(null, "hygienist"), "hygiene");
		assert.equal(normalizeClinicalCategory(null, "pediatric"), "pediatric");
		assert.equal(normalizeClinicalCategory(null, "orthodontist"), "orthodontics");
		assert.equal(normalizeClinicalCategory(null, "unknown_specialty"), "therapy");
	});

	it("2. Accurately samples appointments by cash method (payments.paidAt) and deductions (inArray)", async () => {
		const orgId = fixtureUuid("doctorPayrollTest", 1);
		const doctorId = fixtureUuid("doctorPayrollTest", 2);
		const patientId = fixtureUuid("doctorPayrollTest", 3);
		const apptJuneId = fixtureUuid("doctorPayrollTest", 4);
		const visitJuneId = fixtureUuid("doctorPayrollTest", 5);
		const treatJuneId = fixtureUuid("doctorPayrollTest", 6);
		const paymentJulyId = fixtureUuid("doctorPayrollTest", 7);
		const itemDirectId = fixtureUuid("doctorPayrollTest", 8);
		const itemOverheadId = fixtureUuid("doctorPayrollTest", 9);
		const txUsageId = fixtureUuid("doctorPayrollTest", 10);
		const txAutoId = fixtureUuid("doctorPayrollTest", 11);
		const txOverheadId = fixtureUuid("doctorPayrollTest", 12);

		await purgeFixtureOrganizations([orgId]);

		const juneDate = new Date("2026-06-15T10:00:00Z");
		const julyDate = new Date("2026-07-10T14:30:00Z");

		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(organizations).values({
				id: orgId,
				name: "Клиника Зарплат Тест",
			});

			await tx.insert(users).values({
				id: doctorId,
				organizationId: orgId,
				email: `doctor-${Date.now()}@dente.ru`,
				passwordHash: "hash",
				fullName: "Барабаш С.В.",
				role: "doctor",
				specialties: ["therapy"],
				isActive: true,
			});

			await tx.insert(patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "Смирнова Е.А.",
				administrativeProfile: {
					cardNumber: "К-1234",
					medicalCardNumber: "К-1234",
				},
			});

			// Appointment in June
			await tx.insert(appointments).values({
				id: apptJuneId,
				organizationId: orgId,
				patientId,
				doctorUserId: doctorId,
				startsAt: juneDate,
				endsAt: new Date("2026-06-15T11:00:00Z"),
				status: "completed",
			});

			// Visit linked to June appointment
			await tx.insert(visits).values({
				id: visitJuneId,
				organizationId: orgId,
				appointmentId: apptJuneId,
				patientId,
				doctorId,
				status: "signed",
			});

			// Treatment item on June visit: 10 000 руб
			await tx.insert(treatmentItems).values({
				id: treatJuneId,
				organizationId: orgId,
				patientId,
				visitId: visitJuneId,
				title: "Лечение кариеса зуба 36",
				priceRub: 10000,
				unitPriceRub: 10000,
				quantity: 1,
			});

			// Payment in July (Cash method)
			await tx.insert(payments).values({
				id: paymentJulyId,
				organizationId: orgId,
				patientId,
				visitId: visitJuneId,
				amountRub: 10000,
				status: "paid",
				paidAt: julyDate,
				fiscalReceiptNumber: "ЧЕК-54ФЗ-9988",
			});

			// Direct Material
			await tx.insert(inventoryItems).values({
				id: itemDirectId,
				organizationId: orgId,
				name: "Композит Filtek Ultimate",
				unit: "шприц",
				isOverhead: false,
			});

			// Overhead Item
			await tx.insert(inventoryItems).values({
				id: itemOverheadId,
				organizationId: orgId,
				name: "Перчатки латексные смотровые",
				unit: "пара",
				isOverhead: true,
			});

			// Transaction 1: Direct material with 'usage' type: 1 * 500 rub = 500 rub
			await tx.insert(inventoryTransactions).values({
				id: txUsageId,
				organizationId: orgId,
				visitId: visitJuneId,
				itemId: itemDirectId,
				inventoryItemId: itemDirectId,
				transactionType: "usage",
				quantityChanged: -1,
				unitCostRub: 500,
			});

			// Transaction 2: Direct material with 'emergency_overdraft' type: 1 * 300 rub = 300 rub
			await tx.insert(inventoryTransactions).values({
				id: txAutoId,
				organizationId: orgId,
				visitId: visitJuneId,
				itemId: itemDirectId,
				inventoryItemId: itemDirectId,
				transactionType: "emergency_overdraft",
				quantityChanged: -1,
				unitCostRub: 300,
			});

			// Transaction 3: Overhead item: 1 * 100 rub = 100 rub (must be excluded!)
			await tx.insert(inventoryTransactions).values({
				id: txOverheadId,
				organizationId: orgId,
				visitId: visitJuneId,
				itemId: itemOverheadId,
				inventoryItemId: itemOverheadId,
				transactionType: "auto_deduct",
				quantityChanged: -1,
				unitCostRub: 100,
			});
		});

		try {
			// Query for JULY (2026-07-01 to 2026-07-31)
			const fromDate = new Date("2026-07-01T00:00:00Z");
			const toDate = new Date("2026-07-31T23:59:59Z");
			const result = await withFixtureTenant(orgId, async () => {
				return fetchDoctorPayrollDataset({
					orgId,
					resolvedDocId: doctorId,
					fromStr: "2026-07-01",
					toStr: "2026-07-31",
					fromDate,
					toDate,
				});
			});

			// 1. June appointment is included because it was PAID in July (Cash Method sync!)
			assert.equal(result.orders.length, 1, "Should find June appointment paid in July");
			const order = result.orders[0];
			assert.ok(order);
			assert.equal(order.grossKopecks, 1000000, "Gross should be 10,000 руб in kopecks (1,000,000 kop)");
			assert.equal(order.paidKopecks, 1000000, "Paid kopecks should be 1,000,000 kop");
			assert.equal(order.isPaid54Fz, true, "Must have isPaid54Fz = true");

			// 2. Multi-type material deductions included: 500 руб + 300 руб = 800 руб (80,000 kop). Overhead (100 rub) excluded!
			assert.equal(order.materialCostKopecks, 80000, "Material cost must sum 'usage' and 'emergency_overdraft' (800 rub) and exclude overhead");

			// 3. Completed service items match
			assert.equal(result.completedServices.length, 1);
			const service = result.completedServices[0];
			assert.ok(service);
			assert.equal(service.actuallyPaidGrossKop, 1000000);
			assert.equal(service.fiscalReceiptNumber, "ЧЕК-54ФЗ-9988");
			assert.equal(service.materialCostKop, 80000);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("3. Correctly retrieves closed statements and maps kopecks to rubles", async () => {
		const orgId = fixtureUuid("doctorPayrollTest", 20);
		const doctorId = fixtureUuid("doctorPayrollTest", 21);
		const stmtId = fixtureUuid("doctorPayrollTest", 22);

		await purgeFixtureOrganizations([orgId]);

		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(organizations).values({
				id: orgId,
				name: "Клиника Ведомостей Тест",
			});

			await tx.insert(users).values({
				id: doctorId,
				organizationId: orgId,
				email: `doctor-stmt-${Date.now()}@dente.ru`,
				passwordHash: "hash",
				fullName: "Барабаш С.В.",
				role: "doctor",
				specialties: ["therapy"],
				isActive: true,
			});

			await tx.insert(doctorPayrollStatements).values({
				id: stmtId,
				organizationId: orgId,
				doctorId,
				period: "2026-06",
				grossRevenueKopecks: 50000000,
				labCostKopecks: 5000000,
				materialsCostKopecks: 2000000,
				grossRevenueRub: 500000,
				labCostRub: 50000,
				materialsCostRub: 20000,
				netBaseRevenueRub: 430000,
				netPayoutKopecks: 12900000,
				netPayoutRub: 129000,
				payoutModel: "percentage",
				categoryPercent: 30,
				paidAt: new Date("2026-07-01T12:00:00Z"),
			});
		});

		try {
			const { closedPeriods } = await withFixtureTenant(orgId, async () => {
				return fetchClosedPayrollStatements(orgId, doctorId, "Барабаш С.В.");
			});
			assert.equal(closedPeriods.length, 1);
			const p = closedPeriods[0];
			assert.ok(p);
			assert.equal(p.periodLabelRu, "2026-06");
			assert.equal(p.grossKopecks, 50000000);
			assert.equal(p.labCostKopecks, 5000000);
			assert.equal(p.materialCostKopecks, 2000000);
			assert.equal(p.payoutKopecks, 12900000);
			assert.equal(p.isPaidRko, true);
			assert.ok(p.rkoReceiptNumber.startsWith("РКО-"));
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
