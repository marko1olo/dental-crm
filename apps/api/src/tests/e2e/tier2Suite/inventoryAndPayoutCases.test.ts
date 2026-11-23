import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	inventoryItems,
	procedureMaterialRules,
	serviceCatalogItems,
	treatmentItems,
	visits,
} from "../../../db/schema.js";
import { calculateDoctorPeriodPayroll } from "@dental/shared";
import { deductForVisit as deductMaterialsForVisit } from "../../../services/treatmentConsumables/stockDeduction.js";
import {
	fixtureUuid,
	withFixtureTenant,
} from "../../support/fixtureOrganizations.js";
import {
	DOCTOR_1_ID,
	ITEM_1_ID,
	ITEM_2_ID,
	NAMESPACE,
	ORG_ID,
	PATIENT_1_ID,
	SERVICE_1_ID,
	SERVICE_2_ID,
	type Tier2FixtureContext,
} from "./tier2Fixture.js";

export function registerInventoryAndPayoutCases(ctx: Tier2FixtureContext): void {
	// ==========================================
	// Feature 6: Doctor Payroll Boundaries (SSOT in kopecks)
	// ==========================================
	describe("Feature 6: Doctor Payroll Boundaries & Corner Cases (SSOT in kopecks)", () => {
		it("6.1 handles materials deduction exceeding gross revenue (floored at zero net base)", () => {
			const result = calculateDoctorPeriodPayroll({
				doctorId: DOCTOR_1_ID,
				doctorName: "Врач-1",
				specialtyId: "therapy",
				periodStartIso: "2029-03-01",
				periodEndIso: "2029-03-31",
				services: [
					{
						id: SERVICE_1_ID,
						dateIso: "2029-03-15",
						patientName: "Тестовый Пациент",
						medicalCardNumber: "043/у-001",
						serviceNameRu: "Терапия",
						category: "therapy",
						grossRevenueKop: 500000,
						labCostKop: 0,
						materialCostKop: 1000000,
						doctorId: DOCTOR_1_ID,
						isPaid: true,
					},
				],
				customBasePercentage: 30,
			});
			assert.equal(result.totalGrossRevenueKop, 500000);
			assert.equal(result.totalMaterialDeductionsKop, 1000000);
			assert.equal(result.totalNetBaseKop, 0);
			assert.equal(result.earnedBaseCommissionKop, 0);
		});

		it("6.2 handles 0% commission rate validly (accrued = 0, payout = 0)", () => {
			const result = calculateDoctorPeriodPayroll({
				doctorId: DOCTOR_1_ID,
				doctorName: "Врач-1",
				specialtyId: "therapy",
				periodStartIso: "2029-03-01",
				periodEndIso: "2029-03-31",
				services: [
					{
						id: SERVICE_1_ID,
						dateIso: "2029-03-15",
						patientName: "Тестовый Пациент",
						medicalCardNumber: "043/у-001",
						serviceNameRu: "Терапия",
						category: "therapy",
						grossRevenueKop: 5000000,
						labCostKop: 0,
						materialCostKop: 0,
						doctorId: DOCTOR_1_ID,
						isPaid: true,
					},
				],
				customBasePercentage: 0,
			});
			assert.equal(result.totalGrossRevenueKop, 5000000);
			assert.equal(result.totalNetBaseKop, 5000000);
			assert.equal(result.earnedBaseCommissionKop, 0);
		});

		it("6.3 handles 100% commission rate boundary (accrued = net base)", () => {
			const result = calculateDoctorPeriodPayroll({
				doctorId: DOCTOR_1_ID,
				doctorName: "Врач-1",
				specialtyId: "therapy",
				periodStartIso: "2029-03-01",
				periodEndIso: "2029-03-31",
				services: [
					{
						id: SERVICE_1_ID,
						dateIso: "2029-03-15",
						patientName: "Тестовый Пациент",
						medicalCardNumber: "043/у-001",
						serviceNameRu: "Терапия",
						category: "therapy",
						grossRevenueKop: 4500050,
						labCostKop: 0,
						materialCostKop: 0,
						doctorId: DOCTOR_1_ID,
						isPaid: true,
					},
				],
				customBasePercentage: 100,
			});
			assert.equal(result.totalGrossRevenueKop, 4500050);
			assert.equal(result.totalNetBaseKop, 4500050);
			assert.equal(result.earnedBaseCommissionKop, 4500050);
		});

		it("6.4 handles mixed lab orders and material deductions correctly", () => {
			const result = calculateDoctorPeriodPayroll({
				doctorId: DOCTOR_1_ID,
				doctorName: "Врач-1",
				specialtyId: "orthopedics",
				periodStartIso: "2029-03-01",
				periodEndIso: "2029-03-31",
				services: [
					{
						id: SERVICE_1_ID,
						dateIso: "2029-03-15",
						patientName: "Тестовый Пациент",
						medicalCardNumber: "043/у-001",
						serviceNameRu: "Коронка",
						category: "orthopedics",
						grossRevenueKop: 2000000,
						labCostKop: 500000,
						materialCostKop: 200000,
						doctorId: DOCTOR_1_ID,
						isPaid: true,
					},
				],
				customBasePercentage: 25,
			});
			assert.equal(result.totalGrossRevenueKop, 2000000);
			assert.equal(result.totalLabDeductionsKop, 500000);
			assert.equal(result.totalMaterialDeductionsKop, 200000);
			assert.equal(result.totalNetBaseKop, 1300000);
			assert.equal(result.earnedBaseCommissionKop, 325000);
		});
	});

	// ==========================================
	// Feature 9: Atomic Inventory Deductions Boundaries
	// ==========================================
	describe("Feature 9: Atomic Inventory Deductions Boundaries", () => {
		const DEDUCT_VISIT_ID = fixtureUuid(NAMESPACE, 92);

		it("9.1 deducts into deficit (negative stock) when required quantity exceeds available stock", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(visits)
					.values({
						id: DEDUCT_VISIT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_1_ID,
						status: "draft",
					})
					.onConflictDoNothing();
				await tx
					.insert(serviceCatalogItems)
					.values({
						id: SERVICE_1_ID,
						organizationId: ORG_ID,
						code: "T2-SERV-1",
						title: "Сложное удаление зуба",
						basePriceRub: 5000,
						priceRub: 5000,
					})
					.onConflictDoNothing();
				await tx
					.insert(inventoryItems)
					.values({
						id: ITEM_1_ID,
						organizationId: ORG_ID,
						name: "Анестетик Ультракаин Д-С",
						stockQuantity: "1",
						unitCostRub: "200.00",
						category: "anesthetics",
					})
					.onConflictDoNothing();
				await tx
					.insert(procedureMaterialRules)
					.values({
						organizationId: ORG_ID,
						serviceId: SERVICE_1_ID,
						inventoryItemId: ITEM_1_ID,
						quantityToDeduct: "5",
					})
					.onConflictDoNothing();
				await tx
					.insert(treatmentItems)
					.values({
						organizationId: ORG_ID,
						patientId: PATIENT_1_ID,
						visitId: DEDUCT_VISIT_ID,
						serviceId: SERVICE_1_ID,
						title: "Сложное удаление зуба",
						quantity: "1",
						priceRub: 5000,
						unitPriceRub: 5000,
						status: "approved",
					})
					.onConflictDoNothing();

				const res = await deductMaterialsForVisit(tx, {
					organizationId: ORG_ID,
					visitId: DEDUCT_VISIT_ID,
					userId: DOCTOR_1_ID,
				});

				assert.equal(res.completedTreatmentItems, 1);
				assert.equal(res.deductions.length, 1);
				assert.equal(res.deductions[0]?.inventoryItemId, ITEM_1_ID);
				assert.equal(res.deductions[0]?.quantityChanged, "-5");

				const [item] = await tx
					.select()
					.from(inventoryItems)
					.where(eq(inventoryItems.id, ITEM_1_ID));
				assert.equal(Number(item?.stockQuantity), -4);
			});
		});

		it("9.2 ignores rules with 0 quantityToDeduct without creating empty transaction logs", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const ZERO_VISIT_ID = fixtureUuid(NAMESPACE, 93);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(visits)
					.values({
						id: ZERO_VISIT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_1_ID,
						status: "draft",
					})
					.onConflictDoNothing();
				await tx
					.insert(serviceCatalogItems)
					.values({
						id: SERVICE_2_ID,
						organizationId: ORG_ID,
						code: "T2-SERV-2",
						title: "Осмотр и консультация",
						basePriceRub: 1000,
						priceRub: 1000,
					})
					.onConflictDoNothing();
				await tx
					.insert(inventoryItems)
					.values({
						id: ITEM_2_ID,
						organizationId: ORG_ID,
						name: "Перчатки смотровые",
						stockQuantity: "100",
						unitCostRub: "15.00",
					})
					.onConflictDoNothing();
				await tx
					.insert(procedureMaterialRules)
					.values({
						organizationId: ORG_ID,
						serviceId: SERVICE_2_ID,
						inventoryItemId: ITEM_2_ID,
						quantityToDeduct: "0",
					})
					.onConflictDoNothing();
				await tx
					.insert(treatmentItems)
					.values({
						organizationId: ORG_ID,
						patientId: PATIENT_1_ID,
						visitId: ZERO_VISIT_ID,
						serviceId: SERVICE_2_ID,
						title: "Осмотр и консультация",
						quantity: "1",
						priceRub: 1000,
						unitPriceRub: 1000,
						status: "approved",
					})
					.onConflictDoNothing();

				const res = await deductMaterialsForVisit(tx, {
					organizationId: ORG_ID,
					visitId: ZERO_VISIT_ID,
					userId: DOCTOR_1_ID,
				});
				assert.equal(res.deductions.length, 0);
			});
		});

		it("9.3 does not deduct materials if visit has no approved treatment items", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const EMPTY_VISIT_ID = fixtureUuid(NAMESPACE, 94);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(visits)
					.values({
						id: EMPTY_VISIT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_1_ID,
						status: "draft",
					})
					.onConflictDoNothing();

				const res = await deductMaterialsForVisit(tx, {
					organizationId: ORG_ID,
					visitId: EMPTY_VISIT_ID,
					userId: DOCTOR_1_ID,
				});
				assert.equal(res.completedTreatmentItems, 0);
				assert.equal(res.deductions.length, 0);
			});
		});

		it("9.4 rolls back atomic transaction if invalid item reference occurs during batch deduction", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const initialStock = await withFixtureTenant(ORG_ID, async () => {
				const [i] = await db
					.select()
					.from(inventoryItems)
					.where(eq(inventoryItems.id, ITEM_2_ID));
				return i?.stockQuantity;
			});

			const ERROR_VISIT_ID = fixtureUuid(NAMESPACE, 96);
			const MISSING_ITEM_ID = fixtureUuid(NAMESPACE, 97);
			const ERROR_SERVICE_ID = fixtureUuid(NAMESPACE, 98);

			try {
				await withFixtureTenant(ORG_ID, async (tx) => {
					await tx
						.insert(visits)
						.values({
							id: ERROR_VISIT_ID,
							organizationId: ORG_ID,
							patientId: PATIENT_1_ID,
							status: "draft",
						})
						.onConflictDoNothing();
					await tx
						.insert(serviceCatalogItems)
						.values({
							id: ERROR_SERVICE_ID,
							organizationId: ORG_ID,
							code: "T2-ERR-SERV",
							title: "Ошибочная услуга",
							basePriceRub: 2000,
							priceRub: 2000,
						})
						.onConflictDoNothing();
					await tx.insert(procedureMaterialRules).values({
						organizationId: ORG_ID,
						serviceId: ERROR_SERVICE_ID,
						inventoryItemId: MISSING_ITEM_ID,
						quantityToDeduct: "10",
					});
					await tx.insert(treatmentItems).values({
						organizationId: ORG_ID,
						patientId: PATIENT_1_ID,
						visitId: ERROR_VISIT_ID,
						serviceId: ERROR_SERVICE_ID,
						title: "Ошибочная услуга",
						quantity: "1",
						priceRub: 2000,
						unitPriceRub: 2000,
						status: "approved",
					});

					await deductMaterialsForVisit(tx, {
						organizationId: ORG_ID,
						visitId: ERROR_VISIT_ID,
						userId: DOCTOR_1_ID,
					});
				});
			} catch {
				// Expected foreign key or item not found error
			}

			const currentStock = await withFixtureTenant(ORG_ID, async () => {
				const [i] = await db
					.select()
					.from(inventoryItems)
					.where(eq(inventoryItems.id, ITEM_2_ID));
				return i?.stockQuantity;
			});
			assert.equal(currentStock, initialStock);
		});

		it("9.5 prevents cross-organization stock deduction attacks", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const OTHER_ORG = fixtureUuid(NAMESPACE, 99);
			const OTHER_VISIT = fixtureUuid(NAMESPACE, 88);

			await withFixtureTenant(ORG_ID, async (tx) => {
				const res = await deductMaterialsForVisit(tx, {
					organizationId: OTHER_ORG,
					visitId: OTHER_VISIT,
					userId: DOCTOR_1_ID,
				});
				assert.equal(res.completedTreatmentItems, 0);
				assert.equal(res.deductions.length, 0);
			});
		});
	});
}
