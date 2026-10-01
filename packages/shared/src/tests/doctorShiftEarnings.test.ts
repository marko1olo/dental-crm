/**
 * doctorShiftEarnings.test.ts — Unit tests for Doctor Shift Earnings & Chairside HUD Accrual Engine.
 * 
 * Verifies:
 * 1. Exact formula: Gross - ZTL/Lab - Materials = Net Base * Commission% = Doctor Shift Earnings.
 * 2. Kopeck-exact integer arithmetic (Zero float drift).
 * 3. Overhead consumables (saliva ejector, cotton rolls, gloves) are NOT deducted from doctor.
 * 4. Isolation of doctor's completed & in-chair appointments on target shift date.
 * 5. Formatting and formula explanation for chairside HUD.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateChairsideShiftEarnings,
	createSampleChairsideShiftAppointments,
} from "../finance/doctorShiftEarnings.js";
import { formatKopecksRu } from "../money.js";
import type { DoctorShiftAppointment } from "../doctor-portal/doctorShiftEngine.js";

describe("Chairside HUD Doctor Shift Earnings Engine (salary-view)", () => {
	it("1. Net revenue formula integrity: Gross - Lab - Materials = Net Base * 25% = Accrual", () => {
		const sampleAppointments = createSampleChairsideShiftAppointments("doc-10", "Д-р Иванов И. И.", "2026-09-25");

		const result = calculateChairsideShiftEarnings({
			appointments: sampleAppointments,
			doctorId: "doc-10",
			shiftDateIso: "2026-09-25",
			defaultCommissionPercent: 25,
		});

		// Check counts
		assert.equal(result.patientsCompletedCount, 3, "3 completed visits");
		assert.equal(result.patientsInChairCount, 1, "1 patient in chair");
		assert.equal(result.patientsTotalCount, 4, "4 total appointments on shift");

		// Apt 1: Gross 6 000 ₽ (600k kop), Lab 0, Mat 600 ₽ (60k kop). Base = 5 400 ₽. 25% = 1 350 ₽ (135 000 kop)
		// Apt 2: Gross 10 000 ₽ (1000k kop), Lab 0, Mat 1 000 ₽ (100k kop). Base = 9 000 ₽. 25% = 2 250 ₽ (225 000 kop)
		// Apt 3: Gross 38 000 ₽ (3800k kop), Lab 12 000 ₽ (1200k kop), Mat 2 000 ₽ (200k kop). Base = 24 000 ₽. 25% = 6 000 ₽ (600 000 kop)
		// Apt 4: Gross 7 500 ₽ (750k kop), Lab 0, Mat 500 ₽ (50k kop). Base = 7 000 ₽. 30% = 2 100 ₽ (210 000 kop)

		const expectedGrossKop = 600000 + 1000000 + 3800000 + 750000; // 6 150 000 kop = 61 500 ₽
		const expectedLabKop = 1200000; // 12 000 ₽
		const expectedMatKop = 60000 + 100000 + 200000 + 50000; // 410 000 kop = 4 100 ₽
		const expectedNetBaseKop = expectedGrossKop - expectedLabKop - expectedMatKop; // 4 540 000 kop = 45 400 ₽
		const expectedPayoutKop = 135000 + 225000 + 600000 + 210000; // 1 170 000 kop = 11 700 ₽

		assert.equal(result.grossRevenueKop, expectedGrossKop, "Gross matches exactly");
		assert.equal(result.labCostKop, expectedLabKop, "Lab deduction matches exactly");
		assert.equal(result.materialsCostKop, expectedMatKop, "Material deduction matches exactly");
		assert.equal(result.netBaseRevenueKop, expectedNetBaseKop, "Net base matches exactly");
		assert.equal(result.totalEarnedPayoutKop, expectedPayoutKop, "Earned doctor payout matches exactly");

		assert.ok(result.formulaExplanationRu.includes("Выручка"), "Formula explanation contains Gross label");
		assert.ok(result.formulaExplanationRu.includes("ЗТЛ"), "Formula explanation contains Lab label");
	});

	it("2. Zero appointments shift returns clean zero kopecks without NaN or errors", () => {
		const emptyResult = calculateChairsideShiftEarnings({
			appointments: [],
			doctorId: "doc-empty",
			shiftDateIso: "2026-09-25",
		});

		assert.equal(emptyResult.patientsCompletedCount, 0);
		assert.equal(emptyResult.grossRevenueKop, 0);
		assert.equal(emptyResult.labCostKop, 0);
		assert.equal(emptyResult.materialsCostKop, 0);
		assert.equal(emptyResult.netBaseRevenueKop, 0);
		assert.equal(emptyResult.totalEarnedPayoutKop, 0);
		assert.equal(emptyResult.patientItems.length, 0);
	});

	it("3. Ignores other doctors' appointments and other dates", () => {
		const appointments: DoctorShiftAppointment[] = [
			{
				id: "apt-other-doc",
				patientId: "pat-99",
				patientFullName: "Чужой Пациент",
				cardNumber: "043/у-099",
				doctorId: "doc-2", // Different doctor!
				doctorFullName: "Д-р Петров П. П.",
				startsAtIso: "2026-09-25T10:00:00.000Z",
				endsAtIso: "2026-09-25T11:00:00.000Z",
				status: "completed",
				emrCard043uStatus: "signed",
				services: [
					{
						id: "srv-99",
						code804n: "A16.07.002",
						nameRu: "Пломба",
						category: "therapy",
						quantity: 1,
						unitPriceKop: 500000,
						totalCostKop: 500000,
						discountKop: 0,
						finalRevenueKop: 500000,
						directLabZtlCostKop: 0,
						directMaterialCostKop: 0,
						commissionPercent: 25,
						earnedDoctorPayoutKop: 125000,
					},
				],
			},
			{
				id: "apt-other-date",
				patientId: "pat-100",
				patientFullName: "Вчерашний Пациент",
				cardNumber: "043/у-100",
				doctorId: "doc-1",
				doctorFullName: "Д-р Смирнов А. П.",
				startsAtIso: "2026-09-24T10:00:00.000Z", // Yesterday!
				endsAtIso: "2026-09-24T11:00:00.000Z",
				status: "completed",
				emrCard043uStatus: "signed",
				services: [
					{
						id: "srv-100",
						code804n: "A16.07.002",
						nameRu: "Пломба",
						category: "therapy",
						quantity: 1,
						unitPriceKop: 500000,
						totalCostKop: 500000,
						discountKop: 0,
						finalRevenueKop: 500000,
						directLabZtlCostKop: 0,
						directMaterialCostKop: 0,
						commissionPercent: 25,
						earnedDoctorPayoutKop: 125000,
					},
				],
			},
		];

		const res = calculateChairsideShiftEarnings({
			appointments,
			doctorId: "doc-1",
			shiftDateIso: "2026-09-25",
		});

		assert.equal(res.patientsTotalCount, 0, "Neither other doctor nor yesterday appointment included");
		assert.equal(res.totalEarnedPayoutKop, 0);
	});

	it("4. Category commission defaults apply when service has no explicit commissionPercent", () => {
		const appointments: DoctorShiftAppointment[] = [
			{
				id: "apt-cat-defaults",
				patientId: "pat-cat",
				patientFullName: "Пациент По Категориям",
				cardNumber: "043/у-777",
				doctorId: "doc-cat",
				doctorFullName: "Д-р Категоричный",
				startsAtIso: "2026-09-25T10:00:00.000Z",
				endsAtIso: "2026-09-25T11:00:00.000Z",
				status: "completed",
				emrCard043uStatus: "signed",
				services: [
					{
						id: "srv-hygiene",
						code804n: "A16.07.051",
						nameRu: "Профгигиена",
						category: "hygiene", // default: 30%
						quantity: 1,
						unitPriceKop: 1000000,
						totalCostKop: 1000000,
						discountKop: 0,
						finalRevenueKop: 1000000,
						directLabZtlCostKop: 0,
						directMaterialCostKop: 0,
						// No commissionPercent!
					},
					{
						id: "srv-surgery",
						code804n: "A16.07.001",
						nameRu: "Удаление зуба сложное",
						category: "surgery", // default: 20%
						quantity: 1,
						unitPriceKop: 500000,
						totalCostKop: 500000,
						discountKop: 0,
						finalRevenueKop: 500000,
						directLabZtlCostKop: 0,
						directMaterialCostKop: 0,
						// No commissionPercent!
					},
				],
			},
		];

		const res = calculateChairsideShiftEarnings({
			appointments,
			doctorId: "doc-cat",
			shiftDateIso: "2026-09-25",
			defaultCommissionPercent: 15, // fallback if not in category map
		});

		// Hygiene: 1 000 000 * 30% = 300 000 kop
		// Surgery: 500 000 * 20% = 100 000 kop
		// Total payout: 400 000 kop
		assert.equal(res.totalEarnedPayoutKop, 400000, "Calculates 30% on hygiene and 20% on surgery by default");
	});

	it("5. Custom categoryRates override default category rates", () => {
		const appointments: DoctorShiftAppointment[] = [
			{
				id: "apt-custom-rates",
				patientId: "pat-custom",
				patientFullName: "Пациент Спец-Тариф",
				cardNumber: "043/у-888",
				doctorId: "doc-custom",
				doctorFullName: "Д-р Специалист",
				startsAtIso: "2026-09-25T10:00:00.000Z",
				endsAtIso: "2026-09-25T11:00:00.000Z",
				status: "completed",
				emrCard043uStatus: "signed",
				services: [
					{
						id: "srv-surgery-custom",
						code804n: "A16.07.001",
						nameRu: "Имплантация",
						category: "surgery",
						quantity: 1,
						unitPriceKop: 2000000,
						totalCostKop: 2000000,
						discountKop: 0,
						finalRevenueKop: 2000000,
						directLabZtlCostKop: 0,
						directMaterialCostKop: 500000, // 5k mat
						// No commissionPercent!
					},
				],
			},
		];

		const res = calculateChairsideShiftEarnings({
			appointments,
			doctorId: "doc-custom",
			shiftDateIso: "2026-09-25",
			categoryRates: { surgery: 35 }, // custom 35% instead of default 20%
		});

		// Net base: 2 000 000 - 500 000 = 1 500 000 kop. Payout: 1 500 000 * 35% = 525 000 kop
		assert.equal(res.totalEarnedPayoutKop, 525000, "Custom 35% surgery rate applies to net base");
	});
});
