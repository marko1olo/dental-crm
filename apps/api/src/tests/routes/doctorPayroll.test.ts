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
import { eq } from "drizzle-orm";
import { resolveDoctorPreset } from "@dental/shared";
import {
	normalizeClinicalCategory,
	fetchDoctorPayrollDataset,
	fetchClosedPayrollStatements,
} from "../../routes/doctorPayrollDbQueries.js";
import { closeSettlementPeriodInDb } from "../../routes/payrollSettlementDbQueries.js";
import {
	appointments,
	cashBoxes,
	cashOperations,
	doctorPayrollStatements,
	inventoryItems,
	inventoryTransactions,
	labOrders,
	organizations,
	patients,
	payments,
	serviceCatalogItems,
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
				quantity: "1",
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
				quantityChanged: "-1",
				unitCostRub: "500",
			});

			// Transaction 2: Direct material with 'emergency_overdraft' type: 1 * 300 rub = 300 rub
			await tx.insert(inventoryTransactions).values({
				id: txAutoId,
				organizationId: orgId,
				visitId: visitJuneId,
				itemId: itemDirectId,
				inventoryItemId: itemDirectId,
				transactionType: "emergency_overdraft",
				quantityChanged: "-1",
				unitCostRub: "300",
			});

			// Transaction 3: Overhead item: 1 * 100 rub = 100 rub (must be excluded!)
			await tx.insert(inventoryTransactions).values({
				id: txOverheadId,
				organizationId: orgId,
				visitId: visitJuneId,
				itemId: itemOverheadId,
				inventoryItemId: itemOverheadId,
				transactionType: "auto_deduct",
				quantityChanged: "-1",
				unitCostRub: "100",
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

	it("4. Correctly normalizes clinic specialty aliases to canonical presets (DEFECT 1)", () => {
		const therapy = resolveDoctorPreset("therapy");
		assert.equal(therapy.specialtyId, "therapist");
		assert.equal(therapy.defaultPercentage, 30);
		assert.equal(therapy.deductsMaterialCosts, true);
		assert.equal(therapy.deductsLabCosts, false);

		const orthopedics = resolveDoctorPreset("orthopedics");
		assert.equal(orthopedics.specialtyId, "orthopedist");
		assert.equal(orthopedics.defaultPercentage, 30);
		assert.equal(orthopedics.deductsLabCosts, true);
		assert.equal(orthopedics.deductsMaterialCosts, false);

		const surgery = resolveDoctorPreset("surgery");
		assert.equal(surgery.specialtyId, "surgeon_implantologist");
		assert.equal(surgery.defaultPercentage, 20);

		const hygiene = resolveDoctorPreset("hygiene");
		assert.equal(hygiene.specialtyId, "hygienist");
		assert.equal(hygiene.defaultPercentage, 30);

		const pediatric = resolveDoctorPreset("pediatric");
		assert.equal(pediatric.specialtyId, "pediatric_dentist");
		assert.equal(pediatric.defaultPercentage, 25);

		const soloDoctor = resolveDoctorPreset("solo-doctor");
		assert.equal(soloDoctor.specialtyId, "general_dentist");
		assert.equal(soloDoctor.defaultPercentage, 25);

		const soloRental = resolveDoctorPreset("solo_rental");
		assert.equal(soloRental.specialtyId, "solo_practitioner");
		assert.equal(soloRental.defaultPercentage, 100);
	});

	it("5. Deterministically distributes visit materials proportionally to service gross (DEFECT 3)", async () => {
		const orgId = fixtureUuid("doctorPayrollMatTest", 1);
		const doctorId = fixtureUuid("doctorPayrollMatTest", 2);
		const patientId = fixtureUuid("doctorPayrollMatTest", 3);
		const apptId = fixtureUuid("doctorPayrollMatTest", 4);
		const visitId = fixtureUuid("doctorPayrollMatTest", 5);
		const treat1Id = fixtureUuid("doctorPayrollMatTest", 6);
		const treat2Id = fixtureUuid("doctorPayrollMatTest", 7);
		const itemId = fixtureUuid("doctorPayrollMatTest", 8);
		const txId = fixtureUuid("doctorPayrollMatTest", 9);

		await purgeFixtureOrganizations([orgId]);

		const visitDate = new Date("2026-08-10T11:00:00Z");

		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(organizations).values({ id: orgId, name: "Клиника Тест Материалов" });
			await tx.insert(users).values({
				id: doctorId,
				organizationId: orgId,
				email: `doc-mat-${Date.now()}@dente.ru`,
				passwordHash: "hash",
				fullName: "Кузнецов А.И.",
				role: "doctor",
				specialties: ["therapy"],
				isActive: true,
			});
			await tx.insert(patients).values({ id: patientId, organizationId: orgId, fullName: "Павлов П.П." });
			await tx.insert(appointments).values({
				id: apptId,
				organizationId: orgId,
				patientId,
				doctorUserId: doctorId,
				startsAt: visitDate,
				endsAt: new Date("2026-08-10T12:00:00Z"),
				status: "completed",
			});
			await tx.insert(visits).values({ id: visitId, organizationId: orgId, appointmentId: apptId, patientId, status: "signed" });

			// Услуга 1: 6 000 руб (60%), Услуга 2: 4 000 руб (40%)
			await tx.insert(treatmentItems).values([
				{
					id: treat1Id,
					organizationId: orgId,
					patientId,
					visitId,
					title: "Эндодонтия канала 1",
					priceRub: 6000,
					unitPriceRub: 6000,
					quantity: "1",
				},
				{
					id: treat2Id,
					organizationId: orgId,
					patientId,
					visitId,
					title: "Пломбирование зуба",
					priceRub: 4000,
					unitPriceRub: 4000,
					quantity: "1",
				},
			]);

			// Оплата визита 10 000 руб
			await tx.insert(payments).values({
				id: fixtureUuid("doctorPayrollMatTest", 10),
				organizationId: orgId,
				patientId,
				visitId,
				amountRub: 10000,
				status: "paid",
				paidAt: visitDate,
				fiscalReceiptNumber: "ЧЕК-МАТ-01",
			});

			// Материалы на сумму 2 000 руб (200 000 коп)
			await tx.insert(inventoryItems).values({
				id: itemId,
				organizationId: orgId,
				name: "Пломбировочный материал Estelite",
				unit: "шприц",
				isOverhead: false,
			});

			await tx.insert(inventoryTransactions).values({
				id: txId,
				organizationId: orgId,
				visitId,
				itemId,
				inventoryItemId: itemId,
				transactionType: "usage",
				quantityChanged: "-1",
				unitCostRub: "2000",
			});
		});

		try {
			const result = await withFixtureTenant(orgId, async () => {
				return fetchDoctorPayrollDataset({
					orgId,
					resolvedDocId: doctorId,
					fromStr: "2026-08-01",
					toStr: "2026-08-31",
					fromDate: new Date("2026-08-01T00:00:00Z"),
					toDate: new Date("2026-08-31T23:59:59Z"),
				});
			});

			assert.equal(result.completedServices.length, 2);
			const s1 = result.completedServices.find((s) => s.id === treat1Id);
			const s2 = result.completedServices.find((s) => s.id === treat2Id);
			assert.ok(s1);
			assert.ok(s2);

			// Пропорциональное детерминированное распределение:
			// s1 (6 000 руб из 10 000) получает 60% от 2 000 руб = 1 200 руб (120 000 коп)
			// s2 (4 000 руб из 10 000) получает 40% от 2 000 руб = 800 руб (80 000 коп)
			assert.equal(s1.materialCostKop, 120000, "Service 1 must receive exactly 60% of materials (120,000 kop)");
			assert.equal(s2.materialCostKop, 80000, "Service 2 must receive exactly 40% of materials (80,000 kop)");
			assert.equal(s1.materialCostKop + s2.materialCostKop, 200000, "Total materials must equal 200,000 kop");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("6. Prevents dental lab cost evaporation when lab orders exceed single service (DEFECT 2)", async () => {
		const orgId = fixtureUuid("doctorPayrollLabTest", 1);
		const doctorId = fixtureUuid("doctorPayrollLabTest", 2);
		const patientId = fixtureUuid("doctorPayrollLabTest", 3);
		const apptId = fixtureUuid("doctorPayrollLabTest", 4);
		const visitId = fixtureUuid("doctorPayrollLabTest", 5);
		const treatId = fixtureUuid("doctorPayrollLabTest", 6);
		const labOrderId = fixtureUuid("doctorPayrollLabTest", 7);

		await purgeFixtureOrganizations([orgId]);

		const orderDate = new Date("2026-09-15T10:00:00Z");

		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(organizations).values({ id: orgId, name: "Клиника Тест ЗТЛ" });
			await tx.insert(users).values({
				id: doctorId,
				organizationId: orgId,
				email: `doc-lab-${Date.now()}@dente.ru`,
				passwordHash: "hash",
				fullName: "Орлов И.В.",
				role: "doctor",
				specialties: ["orthopedics"],
				isActive: true,
			});
			await tx.insert(patients).values({ id: patientId, organizationId: orgId, fullName: "Семенов С.С." });
			await tx.insert(appointments).values({
				id: apptId,
				organizationId: orgId,
				patientId,
				doctorUserId: doctorId,
				startsAt: orderDate,
				endsAt: new Date("2026-09-15T11:00:00Z"),
				status: "completed",
			});
			await tx.insert(visits).values({ id: visitId, organizationId: orgId, appointmentId: apptId, patientId, status: "signed" });

			// Услуга ортопедии: 10 000 руб
			await tx.insert(treatmentItems).values({
				id: treatId,
				organizationId: orgId,
				patientId,
				visitId,
				title: "Коронка из диоксида циркония на зуб 26",
				toothCode: "26",
				priceRub: 10000,
				unitPriceRub: 10000,
				quantity: "1",
			});

			await tx.insert(payments).values({
				id: fixtureUuid("doctorPayrollLabTest", 8),
				organizationId: orgId,
				patientId,
				visitId,
				amountRub: 10000,
				status: "paid",
				paidAt: orderDate,
				fiscalReceiptNumber: "ЧЕК-ЗТЛ-01",
			});

			// Заказ ЗТЛ на 15 000 руб (1 500 000 коп) — превышает стоимость единичной услуги (10 000 руб)!
			await tx.insert(labOrders).values({
				id: labOrderId,
				organizationId: orgId,
				doctorId,
				patientId,
				appointmentId: apptId,
				toothFdi: "26",
				secureToken: "test-secure-token-12345",
				status: "completed",
				isWarranty: false,
				labCostKopecks: 1500000,
				labCostRub: 15000,
				createdAt: orderDate,
				completedAt: orderDate,
			});
		});

		try {
			const result = await withFixtureTenant(orgId, async () => {
				return fetchDoctorPayrollDataset({
					orgId,
					resolvedDocId: doctorId,
					fromStr: "2026-09-01",
					toStr: "2026-09-30",
					fromDate: new Date("2026-09-01T00:00:00Z"),
					toDate: new Date("2026-09-30T23:59:59Z"),
				});
			});

			// Суммарная себестоимость ЗТЛ по услугам врача должна составить все 15 000 руб (1 500 000 коп),
			// предотвращая испарение оставшихся 5 000 руб!
			const totalLabCost = result.completedServices.reduce((sum, s) => sum + s.labCostKop, 0);
			assert.equal(totalLabCost, 1500000, "All 1,500,000 kop of lab costs must be preserved and deducted from doctor net revenue");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("7. Creates cash_operations expense and debits cash_boxes on period close with markPaid (DEFECT 4)", async () => {
		const orgId = fixtureUuid("doctorPayrollRkoTest", 1);
		const doctorId = fixtureUuid("doctorPayrollRkoTest", 2);
		const cashBoxId = fixtureUuid("doctorPayrollRkoTest", 3);

		await purgeFixtureOrganizations([orgId]);

		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(organizations).values({ id: orgId, name: "Клиника РКО Тест" });
			await tx.insert(users).values({
				id: doctorId,
				organizationId: orgId,
				email: `doc-rko-${Date.now()}@dente.ru`,
				passwordHash: "hash",
				fullName: "Васильев В.В.",
				role: "doctor",
				specialties: ["therapy"],
				isActive: true,
			});

			// Создаем основную кассу с балансом 200 000 руб (20 000 000 коп)
			await tx.insert(cashBoxes).values({
				id: cashBoxId,
				organizationId: orgId,
				name: "Основная касса клиники",
				type: "main",
				isMain: true,
				balanceRub: 200000,
				balanceKopecks: 20000000,
			});
		});

		try {
			const res = await withFixtureTenant(orgId, async (tx) => {
				return closeSettlementPeriodInDb({
					organizationId: orgId,
					doctorId,
					periodKey: "2026-09",
					fromDate: new Date("2026-09-01T00:00:00Z"),
					toDate: new Date("2026-09-30T23:59:59Z"),
					payoutModel: "percentage",
					categoryPercent: 30,
					netPayoutKopecks: 6000000, // 60 000 руб к выплате
					netPayoutRub: 60000,
					markPaid: true,
					rkoNumber: "РКО-2026-09-001",
				}, tx);
			});

			assert.ok(res.statement);
			assert.equal(res.statement.rkoNumber, "РКО-2026-09-001");
			assert.ok(res.statement.paidAt);

			// Проверяем проводку в cash_operations и списание с баланса кассы
			await withFixtureTenant(orgId, async (tx) => {
				const ops = await tx
					.select()
					.from(cashOperations)
					.where(eq(cashOperations.organizationId, orgId));

				assert.equal(ops.length, 1, "Must create 1 cash_operations expense entry");
				const op = ops[0]!;
				assert.equal(op.operationType, "expense");
				assert.equal(op.reasonCode, 1, "Must have reasonCode = 1 (Зарплата персонала)");
				assert.equal(Number(op.amountKopecks), 6000000);
				assert.equal(Number(op.amountRub), 60000);
				assert.equal(op.cashBoxId, cashBoxId);

				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(eq(cashBoxes.id, cashBoxId));
				assert.ok(box);
				// Баланс кассы уменьшен: 20 000 000 коп - 6 000 000 коп = 14 000 000 коп (140 000 руб)
				assert.equal(Number(box.balanceKopecks), 14000000);
				assert.equal(Number(box.balanceRub), 140000);
			});
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("8. Prioritizes treatmentItems.priceKopecks BIGINT and collects refunded payment deductions (SEV-1.1 & SEV-1.3)", async () => {
		const orgId = fixtureUuid("doctorPayrollTest", 60);
		const doctorId = fixtureUuid("doctorPayrollTest", 61);
		const patientId = fixtureUuid("doctorPayrollTest", 62);
		const apptId = fixtureUuid("doctorPayrollTest", 63);
		const visitId = fixtureUuid("doctorPayrollTest", 64);
		const treatId = fixtureUuid("doctorPayrollTest", 65);
		const paymentId = fixtureUuid("doctorPayrollTest", 66);
		const refundPaymentId = fixtureUuid("doctorPayrollTest", 67);

		await purgeFixtureOrganizations([orgId]);

		const testDate = new Date("2026-10-15T12:00:00Z");

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Точных Копеек",
				});

				await tx.insert(users).values({
					id: doctorId,
					organizationId: orgId,
					email: `doctor-kop-${Date.now()}@dente.ru`,
					passwordHash: "hash",
					fullName: "Тестов К.П.",
					role: "doctor",
					specialties: ["therapy"],
					isActive: true,
				});

				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Пациентов Т.Т.",
				});

				await tx.insert(appointments).values({
					id: apptId,
					organizationId: orgId,
					patientId,
					doctorUserId: doctorId,
					startsAt: testDate,
					endsAt: new Date("2026-10-15T13:00:00Z"),
					status: "completed",
				});

				await tx.insert(visits).values({
					id: visitId,
					organizationId: orgId,
					appointmentId: apptId,
					patientId,
					status: "signed",
				});

				// Услуга с явным priceKopecks (125 050 коп = 1250.50 руб)
				await tx.insert(treatmentItems).values({
					id: treatId,
					organizationId: orgId,
					patientId,
					visitId,
					title: "Эндодонтическое лечение каналов",
					priceKopecks: 125050n,
					unitPriceKopecks: 125050n,
					priceRub: 1250.5,
					unitPriceRub: 1250.5,
					quantity: "1",
				});

				// Фактическая оплата на 125 050 коп (1250.50 руб)
				await tx.insert(payments).values({
					id: paymentId,
					organizationId: orgId,
					patientId,
					visitId,
					amountRub: 1250.5,
					amountKopecks: 125050n,
					status: "paid",
					paidAt: testDate,
					fiscalReceiptNumber: "ЧЕК-КОПЕЙКИ-001",
				});

				// Возврат пациенту за ранее выполненную процедуру в этом же периоде
				await tx.insert(payments).values({
					id: refundPaymentId,
					organizationId: orgId,
					patientId,
					visitId,
					amountRub: 500.25,
					amountKopecks: 50025n,
					status: "refunded",
					paidAt: testDate,
					updatedAt: testDate,
					fiscalReceiptNumber: "ЧЕК-ВОЗВРАТ-001",
					note: "Возврат по заявлению пациента",
				});
			});

			// Запрос датасета за октябрь 2026
			const dataset = await fetchDoctorPayrollDataset({
				orgId,
				resolvedDocId: doctorId,
				fromStr: "2026-10-01",
				toStr: "2026-10-31",
				fromDate: new Date("2026-10-01T00:00:00Z"),
				toDate: new Date("2026-10-31T23:59:59Z"),
			});

			assert.equal(dataset.orders.length, 1);
			const order = dataset.orders[0]!;
			// Должен точно прочитать priceKopecks (125 050 коп), без округлений float!
			assert.equal(order.grossKopecks, 125050, "Order grossKopecks must be exact integer 125050");
			assert.equal(order.paidKopecks, 125050, "Order paidKopecks must be exact integer 125050");
			assert.equal(order.isPaid54Fz, true);

			// Возврат должен быть собран в refundDeductions
			assert.equal(dataset.refundDeductions.length, 1, "Must collect 1 refund deduction");
			const refund = dataset.refundDeductions[0]!;
			assert.equal(refund.refundedGrossKop, 50025, "Refunded gross kopecks must be 50025");
			assert.equal(refund.receiptNumber, "ЧЕК-ВОЗВРАТ-001");
			assert.equal(refund.doctorId, doctorId);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
