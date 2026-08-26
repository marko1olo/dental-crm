import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	areIntervalsOverlapping,
	calculateOverlapDurationMinutes,
	checkScheduleOverlap,
	calculateEmergencyReserveSlots,
	calculateScheduleOverlapGroups,
	findAvailableSlots,
	type ScheduledAppointment,
	type DoctorShiftSchedule,
} from "../schedule/shiftCollisionEngine.js";
import {
	STAGE_CATEGORY_META,
	calculateStagePaymentDistribution,
	recalculateTreatmentPlanTotals,
	stagedTreatmentPlanSchema,
	type TreatmentPlanStage,
	type StagedTreatmentPlan,
} from "../finance/treatmentPlanStages.js";

describe("Multi-Chair Clinical Schedule Collision & Emergency Reserve Engine (shiftCollisionEngine.ts)", () => {
	const clinicId = "11111111-1111-1111-1111-111111111111";
	const doctor1 = "22222222-2222-2222-2222-222222222222";
	const doctor2 = "33333333-3333-3333-3333-333333333333";
	const cabinet1 = "44444444-4444-4444-4444-444444444444";
	const patient1 = "55555555-5555-5555-5555-555555555555";
	const patient2 = "66666666-6666-6666-6666-666666666666";

	it("1.1 areIntervalsOverlapping accurately detects interval overlaps and non-overlaps", () => {
		assert.strictEqual(
			areIntervalsOverlapping(
				"2026-09-01T10:00:00Z",
				"2026-09-01T11:00:00Z",
				"2026-09-01T10:30:00Z",
				"2026-09-01T11:30:00Z",
			),
			true,
		);
		// Adjacent intervals (touching bounds) do NOT overlap
		assert.strictEqual(
			areIntervalsOverlapping(
				"2026-09-01T10:00:00Z",
				"2026-09-01T11:00:00Z",
				"2026-09-01T11:00:00Z",
				"2026-09-01T12:00:00Z",
			),
			false,
		);
		// Disjoint intervals
		assert.strictEqual(
			areIntervalsOverlapping(
				"2026-09-01T10:00:00Z",
				"2026-09-01T11:00:00Z",
				"2026-09-01T12:00:00Z",
				"2026-09-01T13:00:00Z",
			),
			false,
		);
	});

	it("1.2 calculateOverlapDurationMinutes computes exact overlap in minutes", () => {
		const mins = calculateOverlapDurationMinutes(
			"2026-09-01T10:00:00Z",
			"2026-09-01T11:00:00Z",
			"2026-09-01T10:15:00Z",
			"2026-09-01T10:45:00Z",
		);
		assert.strictEqual(mins, 30);
	});

	it("1.3 checkScheduleOverlap detects doctor collision, cabinet collision, and patient double booking", () => {
		const existing: ScheduledAppointment[] = [
			{
				id: "a1111111-1111-1111-1111-111111111111",
				clinicId,
				doctorId: doctor1,
				cabinetId: cabinet1,
				patientId: patient1,
				startTime: "2026-09-01T10:00:00Z",
				endTime: "2026-09-01T11:00:00Z",
				status: "confirmed",
			},
		];

		// Conflict 1: Doctor overlap
		const doctorCollision = checkScheduleOverlap(
			{
				doctorId: doctor1,
				cabinetId: "99999999-9999-9999-9999-999999999999",
				patientId: patient2,
				startTime: "2026-09-01T10:30:00Z",
				endTime: "2026-09-01T11:30:00Z",
			},
			existing,
		);
		assert.strictEqual(doctorCollision.hasConflict, true);
		assert.strictEqual(doctorCollision.conflicts.some((c) => c.type === "doctor_overlap"), true);

		// Conflict 2: Cabinet overlap (different doctor, same chair)
		const cabinetCollision = checkScheduleOverlap(
			{
				doctorId: doctor2,
				cabinetId: cabinet1,
				patientId: patient2,
				startTime: "2026-09-01T10:15:00Z",
				endTime: "2026-09-01T10:45:00Z",
			},
			existing,
		);
		assert.strictEqual(cabinetCollision.hasConflict, true);
		assert.strictEqual(cabinetCollision.conflicts.some((c) => c.type === "cabinet_overlap"), true);

		// Conflict 3: Patient double booking
		const patientCollision = checkScheduleOverlap(
			{
				doctorId: doctor2,
				cabinetId: "88888888-8888-8888-8888-888888888888",
				patientId: patient1,
				startTime: "2026-09-01T10:00:00Z",
				endTime: "2026-09-01T10:45:00Z",
			},
			existing,
		);
		assert.strictEqual(patientCollision.hasConflict, true);
		assert.strictEqual(patientCollision.conflicts.some((c) => c.type === "patient_double_booking"), true);

		// Ignored cancelled appointment
		const cancelledExisting: ScheduledAppointment[] = [
			{
				id: "a2222222-2222-2222-2222-222222222222",
				clinicId,
				doctorId: doctor1,
				cabinetId: cabinet1,
				patientId: patient1,
				startTime: "2026-09-01T10:00:00Z",
				endTime: "2026-09-01T11:00:00Z",
				status: "cancelled",
			},
		];
		const noCollision = checkScheduleOverlap(
			{
				doctorId: doctor1,
				cabinetId: cabinet1,
				patientId: patient1,
				startTime: "2026-09-01T10:00:00Z",
				endTime: "2026-09-01T11:00:00Z",
			},
			cancelledExisting,
		);
		assert.strictEqual(noCollision.hasConflict, false);
	});

	it("1.4 calculateEmergencyReserveSlots creates acute toothache buffer in shift", () => {
		const shift: DoctorShiftSchedule = {
			id: "s1111111-1111-1111-1111-111111111111",
			clinicId,
			doctorId: doctor1,
			shiftDate: "2026-09-01",
			startTime: "2026-09-01T09:00:00Z",
			endTime: "2026-09-01T15:00:00Z",
			isEmergencyReserveEnabled: true,
			emergencyReserveMinutes: 30,
		};

		const reserves = calculateEmergencyReserveSlots(shift, []);
		assert.strictEqual(reserves.length, 1);
		assert.strictEqual(reserves[0]!.durationMinutes, 30);
		assert.strictEqual(reserves[0]!.startTime, "2026-09-01T14:30:00.000Z");
		assert.strictEqual(reserves[0]!.endTime, "2026-09-01T15:00:00.000Z");
		assert.strictEqual(reserves[0]!.isBooked, false);
	});

	it("1.5 calculateScheduleOverlapGroups arranges concurrent appointments into side-by-side columns", () => {
		const apts: ScheduledAppointment[] = [
			{
				id: "a1",
				clinicId,
				doctorId: doctor1,
				patientId: patient1,
				startTime: "2026-09-01T10:00:00Z",
				endTime: "2026-09-01T11:00:00Z",
				status: "confirmed",
			},
			{
				id: "a2",
				clinicId,
				doctorId: doctor2,
				patientId: patient2,
				startTime: "2026-09-01T10:30:00Z",
				endTime: "2026-09-01T11:30:00Z",
				status: "confirmed",
			},
			{
				id: "a3",
				clinicId,
				doctorId: doctor1,
				patientId: patient1,
				startTime: "2026-09-01T12:00:00Z",
				endTime: "2026-09-01T13:00:00Z",
				status: "confirmed",
			},
		];

		const layout = calculateScheduleOverlapGroups(apts);
		assert.strictEqual(layout.get("a1")?.totalColumns, 2);
		assert.strictEqual(layout.get("a1")?.columnIndex, 0);
		assert.strictEqual(layout.get("a2")?.totalColumns, 2);
		assert.strictEqual(layout.get("a2")?.columnIndex, 1);
		assert.strictEqual(layout.get("a3")?.totalColumns, 1);
		assert.strictEqual(layout.get("a3")?.columnIndex, 0);
	});

	it("1.6 findAvailableSlots discovers free intervals respecting appointments, breaks, and emergency buffers", () => {
		const shift: DoctorShiftSchedule = {
			id: "s1111111-1111-1111-1111-111111111111",
			clinicId,
			doctorId: doctor1,
			shiftDate: "2026-09-01",
			startTime: "2026-09-01T09:00:00Z",
			endTime: "2026-09-01T13:00:00Z", // 4 hours
			breakStartTime: "2026-09-01T11:00:00Z",
			breakEndTime: "2026-09-01T11:30:00Z", // 30 min break
			isEmergencyReserveEnabled: true,
			emergencyReserveMinutes: 30, // 12:30..13:00 reserve
		};

		const booked: ScheduledAppointment[] = [
			{
				id: "a1",
				clinicId,
				doctorId: doctor1,
				patientId: patient1,
				startTime: "2026-09-01T09:30:00Z",
				endTime: "2026-09-01T10:30:00Z",
				status: "confirmed",
			},
		];

		const free = findAvailableSlots(shift, booked, { minDurationMinutes: 30 });
		// Free spans:
		// 1. 09:00..09:30 (30 min)
		// 2. 10:30..11:00 (30 min)
		// (11:00..11:30 is break)
		// 3. 11:30..12:30 (60 min)
		// (12:30..13:00 is emergency reserve)
		assert.strictEqual(free.length, 3);
		assert.strictEqual(free[0]!.durationMinutes, 30);
		assert.strictEqual(free[1]!.durationMinutes, 30);
		assert.strictEqual(free[2]!.durationMinutes, 60);
	});
});

describe("Multi-Stage Treatment Plan & Penny-Exact Payment Engine (treatmentPlanStages.ts)", () => {
	it("2.1 STAGE_CATEGORY_META contains Russian clinical descriptions and standard sequence order", () => {
		assert.strictEqual(STAGE_CATEGORY_META.hygiene_sanitation.defaultStageNumber, 1);
		assert.strictEqual(STAGE_CATEGORY_META.endo_therapy.defaultStageNumber, 2);
		assert.strictEqual(STAGE_CATEGORY_META.surgery_implant.defaultStageNumber, 3);
		assert.strictEqual(STAGE_CATEGORY_META.ortho_prosthetics.defaultStageNumber, 4);

		assert.ok(STAGE_CATEGORY_META.hygiene_sanitation.typicalServicesRu.length > 0);
		assert.ok(STAGE_CATEGORY_META.surgery_implant.descriptionRu.includes("имплантат"));
	});

	it("2.2 calculateStagePaymentDistribution guarantees penny-exact distribution with no rounding loss", () => {
		const totalKopecks = 10000001; // 100,000.01 rubles (odd penny)
		const splits = [30, 30, 20, 20]; // 30% / 30% / 20% / 20%
		const titles = [
			"Этап 1: Гигиена",
			"Этап 2: Терапия",
			"Этап 3: Хирургия",
			"Этап 4: Ортопедия",
		];

		const result = calculateStagePaymentDistribution(totalKopecks, splits, titles);

		assert.strictEqual(result.isPennyExact, true);
		assert.strictEqual(result.grandTotalKopecks, totalKopecks);

		const sumAllocated = result.stageAllocations.reduce((a, b) => a + b.allocatedKopecks, 0);
		assert.strictEqual(sumAllocated, totalKopecks);
		assert.strictEqual(result.stageAllocations.length, 4);
	});

	it("2.3 calculateStagePaymentDistribution handles 3-way equal split of odd penny sums", () => {
		const totalKopecks = 100000; // 1,000.00 rubles split into 3 parts (333.33 + 333.33 + 333.34)
		const splits = [1, 1, 1];

		const result = calculateStagePaymentDistribution(totalKopecks, splits);
		assert.strictEqual(result.isPennyExact, true);

		const allocations = result.stageAllocations.map((a) => a.allocatedKopecks);
		assert.deepStrictEqual(allocations, [33333, 33333, 33334]);
		assert.strictEqual(allocations.reduce((a, b) => a + b, 0), 100000);
	});

	it("2.4 recalculateTreatmentPlanTotals updates stage subtotals and completion metrics accurately", () => {
		const planId = "p1111111-1111-1111-1111-111111111111";
		const stages: TreatmentPlanStage[] = [
			{
				id: "s1",
				planId,
				stageNumber: 1,
				category: "hygiene_sanitation",
				titleRu: "Гигиена",
				status: "completed",
				subtotalKopecks: 0,
				discountKopecks: 0,
				totalPriceKopecks: 0,
				allocatedPaymentKopecks: 0,
				paidAmountKopecks: 500000,
				items: [
					{
						id: "i1",
						code804n: "A16.07.051",
						nameRu: "Профгигиена",
						quantity: 1,
						unitPriceKopecks: 500000,
						discountKopecks: 0,
						totalPriceKopecks: 500000,
						status: "completed",
					},
				],
			},
			{
				id: "s2",
				planId,
				stageNumber: 2,
				category: "surgery_implant",
				titleRu: "Имплантация",
				status: "pending",
				subtotalKopecks: 0,
				discountKopecks: 0,
				totalPriceKopecks: 0,
				allocatedPaymentKopecks: 0,
				paidAmountKopecks: 0,
				items: [
					{
						id: "i2",
						code804n: "A16.07.054",
						nameRu: "Имплантат Straumann",
						toothNumber: 46,
						quantity: 1,
						unitPriceKopecks: 4500000,
						discountKopecks: 500000,
						totalPriceKopecks: 4000000,
						status: "pending",
					},
				],
			},
		];

		const summary = recalculateTreatmentPlanTotals(stages);
		assert.strictEqual(summary.totalPriceKopecks, 5000000);
		assert.strictEqual(summary.totalDiscountKopecks, 500000);
		assert.strictEqual(summary.grandTotalKopecks, 4500000);
		assert.strictEqual(summary.totalPaidKopecks, 500000);
		assert.strictEqual(summary.completionPercentage, 50); // 1 of 2 items completed
	});

	it("2.5 stagedTreatmentPlanSchema validates multi-stage plan data structure", () => {
		const samplePlan: StagedTreatmentPlan = {
			id: "88888888-8888-8888-8888-888888888888",
			clinicId: "11111111-1111-1111-1111-111111111111",
			patientId: "22222222-2222-2222-2222-222222222222",
			planNumber: "PLAN-2026-0042",
			title: "Комплексная санация и дентальная имплантация",
			stages: [
				{
					id: "33333333-3333-3333-3333-333333333333",
					planId: "88888888-8888-8888-8888-888888888888",
					stageNumber: 1,
					category: "hygiene_sanitation",
					titleRu: "Этап 1: Гигиеническая подготовка",
					status: "completed",
					items: [],
					subtotalKopecks: 500000,
					discountKopecks: 0,
					totalPriceKopecks: 500000,
					allocatedPaymentKopecks: 500000,
					paidAmountKopecks: 500000,
				},
			],
			totalPriceKopecks: 500000,
			totalDiscountKopecks: 0,
			grandTotalKopecks: 500000,
			totalPaidKopecks: 500000,
			status: "active",
		};

		const parsed = stagedTreatmentPlanSchema.parse(samplePlan);
		assert.strictEqual(parsed.planNumber, "PLAN-2026-0042");
		assert.strictEqual(parsed.stages[0]?.category, "hygiene_sanitation");
	});
});
