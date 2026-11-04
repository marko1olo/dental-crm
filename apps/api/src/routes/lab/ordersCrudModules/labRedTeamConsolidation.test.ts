import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapStageToLabOrderStatus } from "../types.js";
import { buildAppointmentLabBudget } from "../../doctorEarnings/appointmentLabBudget.js";
import type { LiveCalculationInput } from "../../doctorEarnings/liveEarningsTypes.js";
import { calculateLabOrderCostAndMarkup } from "./labOrderCostCalculator.js";

describe("Red Team Inquisition: LAB-01..05 Subsystem Consolidation & Defense", () => {
	it("[LAB-05]: mapStageToLabOrderStatus maps routine clinic fitting to 'received', NOT 'refitting'", () => {
		// Рутинная примерка во рту в клинике обязана мапиться в received
		assert.equal(mapStageToLabOrderStatus("fitting"), "received");
		assert.equal(mapStageToLabOrderStatus("fitting_scheduled"), "received");
		assert.equal(mapStageToLabOrderStatus("fitting_in_mouth"), "received");
		assert.equal(mapStageToLabOrderStatus("Примерка"), "received");
		assert.equal(mapStageToLabOrderStatus("Примерка во рту"), "received");

		// Только реальный брак и рекламации мапятся в refitting
		assert.equal(mapStageToLabOrderStatus("correction_remake"), "refitting");
		assert.equal(mapStageToLabOrderStatus("warranty_rework"), "refitting");
		assert.equal(mapStageToLabOrderStatus("refitting"), "refitting");
		assert.equal(mapStageToLabOrderStatus("rework"), "refitting");
		assert.equal(mapStageToLabOrderStatus("Переделка"), "refitting");
		assert.equal(mapStageToLabOrderStatus("Рекламация"), "refitting");
	});

	it("[LAB-03]: buildAppointmentLabBudget does NOT deduct lab orders from therapy appointments without orthopedics", () => {
		const mockInput: LiveCalculationInput = {
			targetDoctorId: "doc-therapist-1",
			doctorName: "Д-р Терапевтов Т. Т.",
			doctorSpecialty: "therapy",
			fromDate: new Date("2026-11-01"),
			toDate: new Date("2026-11-30"),
			categoryRates: { therapy: 25, orthopedics: 25 },
			rawAppointments: [
				{
					id: "apt-therapy-only",
					patientId: "patient-1",
					status: "completed",
					startsAt: new Date("2026-11-02T10:00:00Z"),
					endsAt: new Date("2026-11-02T11:00:00Z"),
					patientName: "Иванов И. И.",
					cardNumber: "1001",
				},
			],
			appointmentToVisitMap: new Map([["apt-therapy-only", "visit-therapy-1"]]),
			dbTreatmentItems: [
				{
					id: "treat-caries-1",
					visitId: "visit-therapy-1",
					title: "Лечение глубокого кариеса",
					priceRub: 4500,
					quantity: 1,
					category: "therapy",
				},
			],
			dbLabOrders: [
				{
					id: "lab-crown-1",
					patientId: "patient-1",
					toothFdi: "16",
					material: "crown_zirconia",
					status: "received",
					priceRub: 25000,
					labCostRub: 8000,
					dueDate: new Date("2026-11-10"),
				},
			],
			dbPayments: [],
		};

		const budget = buildAppointmentLabBudget(mockInput);
		// У терапевта нет ортопедической выручки в приеме: вычет ЗТЛ обязан быть строго 0 копеек ([LAB-03])
		const deductedKop = budget.get("apt-therapy-only") ?? 0;
		assert.equal(deductedKop, 0, "Терапевтический прием без ортопедии не должен облагаться вычетом ЗТЛ");
	});

	it("[LAB-03]: buildAppointmentLabBudget correctly assigns lab cost when doctor has orthopedics revenue", () => {
		const mockInput: LiveCalculationInput = {
			targetDoctorId: "doc-ortho-1",
			doctorName: "Д-р Ортопедов О. О.",
			doctorSpecialty: "orthopedics",
			fromDate: new Date("2026-11-01"),
			toDate: new Date("2026-11-30"),
			categoryRates: { therapy: 25, orthopedics: 25 },
			rawAppointments: [
				{
					id: "apt-ortho-1",
					patientId: "patient-2",
					status: "completed",
					startsAt: new Date("2026-11-03T12:00:00Z"),
					endsAt: new Date("2026-11-03T13:00:00Z"),
					patientName: "Петров П. П.",
					cardNumber: "1002",
				},
			],
			appointmentToVisitMap: new Map([["apt-ortho-1", "visit-ortho-1"]]),
			dbTreatmentItems: [
				{
					id: "treat-crown-1",
					visitId: "visit-ortho-1",
					title: "Установка коронки из диоксида циркония",
					priceRub: 30000,
					quantity: 1,
					category: "orthopedics",
				},
			],
			dbLabOrders: [
				{
					id: "lab-crown-2",
					patientId: "patient-2",
					toothFdi: "26",
					material: "crown_zirconia",
					status: "completed",
					priceRub: 30000,
					labCostRub: 7500,
					dueDate: new Date("2026-11-12"),
				},
			],
			dbPayments: [],
		};

		const budget = buildAppointmentLabBudget(mockInput);
		// У ортопеда есть ортопедическая выручка: счет ЗТЛ 7500 руб = 750000 копеек списывается корректно
		const deductedKop = budget.get("apt-ortho-1") ?? 0;
		assert.equal(deductedKop, 750000, "Ортопедический прием получает корректный вычет ЗТЛ в копейках");
	});

	it("calculateLabOrderCostAndMarkup supports custom dynamic costs and calculates margins", () => {
		const dynamicResult = calculateLabOrderCostAndMarkup({
			materialOrConstruction: "crown_zirconia",
			unitsCount: 2,
			customCostPerUnit: 6800,
			priceRub: 50000,
		});

		assert.equal(dynamicResult.unitsCount, 2);
		assert.equal(dynamicResult.estimatedCostRub, 13600); // 6800 * 2
		assert.equal(dynamicResult.suggestedPriceRub, 50000);
		assert.equal(dynamicResult.grossMarginRub, 36400); // 50000 - 13600
		assert.equal(dynamicResult.grossMarginPercent, 73);
	});
});
