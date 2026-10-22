import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
	ORTHOPEDIC_WORK_TYPES,
	createDentalLabOrder,
} from "../dentalLabWorkflowEngine";
import { calculateZtlWageFinancials } from "../dentalLabOrderEngine";

describe("chairsideLabOrder — Order Draft & Financials", () => {
	test("createDentalLabOrder создает наряд с расчетом дат и копеек", () => {
		const order = createDentalLabOrder({
			patientId: "pat-123",
			patientName: "Петрова Анна Сергеевна",
			doctorId: "doc-orlov",
			doctorName: "Д-р Орлов А.В.",
			workTypeId: "crown_zirconia",
			selectedTeeth: [16, 17],
			pricePerUnitRub: 22000,
			costPerUnitRub: 7000,
			doctorPercent: 20,
			orderDate: "2026-10-05",
		});

		assert.equal(order.selectedTeeth.length, 2);
		assert.equal(order.financials.unitsCount, 2);
		assert.equal(order.financials.patientPriceTotalKopecks, 4400000);
		assert.equal(order.financials.labCostTotalKopecks, 1400000);
		assert.equal(order.financials.doctorWageBaseKopecks, 3000000);
		assert.equal(order.financials.doctorWageKopecks, 600000);
		assert.equal(order.financials.clinicNetProfitKopecks, 2400000);
		assert.equal(order.financials.isBalanced, true);
		assert.equal(order.expectedLabDateIso, "2026-10-12");
		assert.equal(order.fittingDateIso, "2026-10-13");
	});

	test("Черновик записи на примерку соответствует прейскуранту ортопедии", () => {
		const order = createDentalLabOrder({
			patientId: "pat-99",
			patientName: "Сидоров К.М.",
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов",
			workTypeId: "crown_emax",
			selectedTeeth: [21],
			orderDate: "2026-10-05",
		});

		const workTypeTitle = ORTHOPEDIC_WORK_TYPES[order.workTypeId]?.shortNameRu || "Конструкция ЗТЛ";
		const appointmentDraft = {
			patientId: order.patientId,
			serviceTitle: `Примерка и фиксация: ${workTypeTitle} (зуб ${order.selectedTeeth.join(", ")})`,
			serviceCode: "A16.07.004",
			scheduledDate: order.fittingDateIso,
			stageKind: "stage_3_orthopedics",
		};

		assert.equal(appointmentDraft.serviceCode, "A16.07.004");
		assert.equal(appointmentDraft.stageKind, "stage_3_orthopedics");
		assert.equal(appointmentDraft.scheduledDate, "2026-10-13");
		assert.match(appointmentDraft.serviceTitle, /Примерка и фиксация: Коронка e.max Press/);
	});

	test("calculateZtlWageFinancials исключает себестоимость ЗТЛ и переделка 0 ₽", () => {
		const fin = calculateZtlWageFinancials({
			unitsCount: 1,
			patientPriceRub: 25000,
			ztlCostRub: 8000,
			doctorSharePercent: 25,
		});
		assert.equal(fin.patientPriceKopecks, 2500000);
		assert.equal(fin.doctorWageBaseKopecks, 1700000);
		assert.equal(fin.doctorWageKopecks, 425000);
		assert.equal(fin.clinicMarginKopecks, 1275000);
		assert.equal(fin.isBalanced, true);

		const rework = calculateZtlWageFinancials({
			unitsCount: 1,
			patientPriceRub: 25000,
			ztlCostRub: 8000,
			isWarrantyRework: true,
			warrantyLiabilityType: "lab_defect",
		});
		assert.equal(rework.patientPriceKopecks, 0);
		assert.equal(rework.ztlCostKopecks, 0);
		assert.equal(rework.isBalanced, true);
	});
});
