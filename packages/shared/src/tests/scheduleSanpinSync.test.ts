import assert from "node:assert";
import { describe, test } from "node:test";
import {
	classifyAppointmentSpecialty,
	generateRetrospectiveAutoclaveRecordsFromDailyLoad,
	generateRetrospectiveKraftPackagesFromDailyLoad,
	generateRetrospectivePsoRecordsFromDailyLoad,
	mapScheduleAppointmentsToSanpinDailyLoad,
	SANPIN_VISIT_CONSUMPTION_STANDARDS,
	type SanpinAppointmentSource,
} from "../index.js";

describe("SanPiN 3.3686-21 Schedule & Appointments Synchronization Engine", () => {
	// ─── 1. Specialty Classification ───────────────────────────────────────────
	describe("1. Clinical Specialty Classification", () => {
		test("classifies by explicit specialty or category fields", () => {
			assert.strictEqual(
				classifyAppointmentSpecialty({ id: "1", startsAt: "2026-08-25T10:00:00Z", specialty: "surgery" }),
				"surgery",
			);
			assert.strictEqual(
				classifyAppointmentSpecialty({ id: "2", startsAt: "2026-08-25T10:00:00Z", category: "orthopedics" }),
				"orthopedics",
			);
			assert.strictEqual(
				classifyAppointmentSpecialty({ id: "3", startsAt: "2026-08-25T10:00:00Z", specialty: "therapy" }),
				"therapy",
			);
		});

		test("classifies by doctor specialty mapping", () => {
			const doctorMap = {
				"doc-surg-1": "surgery",
				"doc-ortho-1": "orthopedics",
				"doc-therap-1": "therapy",
			};

			assert.strictEqual(
				classifyAppointmentSpecialty(
					{ id: "1", startsAt: "2026-08-25T10:00:00Z", doctorUserId: "doc-surg-1" },
					doctorMap,
				),
				"surgery",
			);
			assert.strictEqual(
				classifyAppointmentSpecialty(
					{ id: "2", startsAt: "2026-08-25T10:00:00Z", doctorUserId: "doc-ortho-1" },
					doctorMap,
				),
				"orthopedics",
			);
		});

		test("classifies by keyword semantic analysis in reason and comment", () => {
			// Surgical keywords
			assert.strictEqual(
				classifyAppointmentSpecialty({
					id: "s1",
					startsAt: "2026-08-25T10:00:00Z",
					reason: "Сложное удаление зуба 38 и кюретаж лунки",
				}),
				"surgery",
			);
			assert.strictEqual(
				classifyAppointmentSpecialty({
					id: "s2",
					startsAt: "2026-08-25T10:00:00Z",
					comment: "Установка имплантата и синус-лифтинг",
				}),
				"surgery",
			);

			// Orthopedic keywords
			assert.strictEqual(
				classifyAppointmentSpecialty({
					id: "o1",
					startsAt: "2026-08-25T10:00:00Z",
					reason: "Препарирование под металлокерамическую коронку и снятие слепка",
				}),
				"orthopedics",
			);
			assert.strictEqual(
				classifyAppointmentSpecialty({
					id: "o2",
					startsAt: "2026-08-25T10:00:00Z",
					comment: "Примерка мостовидного протеза на имплантах и виниров",
				}),
				"orthopedics",
			);

			// Therapeutic keywords
			assert.strictEqual(
				classifyAppointmentSpecialty({
					id: "t1",
					startsAt: "2026-08-25T10:00:00Z",
					reason: "Лечение глубокого кариеса зуба 16, фотополимерная пломба",
				}),
				"therapy",
			);
			assert.strictEqual(
				classifyAppointmentSpecialty({
					id: "t2",
					startsAt: "2026-08-25T10:00:00Z",
					reason: "Эндодонтическое перелечивание каналов пульпита",
				}),
				"therapy",
			);
		});
	});

	// ─── 2. Statutory Consumption Standards ────────────────────────────────────
	describe("2. Statutory Per-Visit Material Consumption Standards", () => {
		test("verifies therapeutic visit standard: 1 basic tray + 1 bur set + 2 handpieces (4 kraft packages)", () => {
			const std = SANPIN_VISIT_CONSUMPTION_STANDARDS.therapy;
			assert.strictEqual(std.basicTraysCount, 1);
			assert.strictEqual(std.burSetsCount, 1);
			assert.strictEqual(std.handpiecesCount, 2);
			assert.strictEqual(std.surgicalTraysCount, 0);
			assert.strictEqual(std.totalInstrumentsCount, 4);
			assert.strictEqual(std.totalKraftPackagesCount, 4);
			assert.strictEqual(std.kraftPackagesBySize.size_75x150, 2);
			assert.strictEqual(std.kraftPackagesBySize.size_100x200, 2);
		});

		test("verifies surgical visit standard: 1 surgical tray + 1 forceps + 1 elevator + 1 syringe (4 kraft packages)", () => {
			const std = SANPIN_VISIT_CONSUMPTION_STANDARDS.surgery;
			assert.strictEqual(std.surgicalTraysCount, 1);
			assert.strictEqual(std.forcepsCount, 1);
			assert.strictEqual(std.elevatorsCount, 1);
			assert.strictEqual(std.syringesCount, 1);
			assert.strictEqual(std.basicTraysCount, 0);
			assert.strictEqual(std.totalInstrumentsCount, 4);
			assert.strictEqual(std.totalKraftPackagesCount, 4);
			assert.strictEqual(std.kraftPackagesBySize.size_150x250, 3);
			assert.strictEqual(std.kraftPackagesBySize.size_100x200, 1);
		});

		test("verifies orthopedic visit standard: 1 tray + 1 impression trays set (2 kraft packages)", () => {
			const std = SANPIN_VISIT_CONSUMPTION_STANDARDS.orthopedics;
			assert.strictEqual(std.orthopedicTraysCount, 1);
			assert.strictEqual(std.impressionTraysCount, 1);
			assert.strictEqual(std.basicTraysCount, 0);
			assert.strictEqual(std.totalInstrumentsCount, 2);
			assert.strictEqual(std.totalKraftPackagesCount, 2);
			assert.strictEqual(std.kraftPackagesBySize.size_100x200, 1);
			assert.strictEqual(std.kraftPackagesBySize.size_150x250, 1);
		});
	});

	// ─── 3. mapScheduleAppointmentsToSanpinDailyLoad ───────────────────────────
	describe("3. mapScheduleAppointmentsToSanpinDailyLoad Calculation", () => {
		const sampleAppointments: SanpinAppointmentSource[] = [
			// Day 1: 2026-08-25 (3 therapy, 2 surgery, 1 orthopedics on Chair 1 & Chair 2)
			{
				id: "app-01",
				startsAt: "2026-08-25T09:00:00Z",
				chairId: "chair-1",
				doctorUserId: "doc-1",
				specialty: "therapy",
				status: "completed",
				reason: "Лечение кариеса",
			},
			{
				id: "app-02",
				startsAt: "2026-08-25T10:30:00Z",
				chairId: "chair-1",
				doctorUserId: "doc-1",
				specialty: "therapy",
				status: "completed",
				reason: "Эндодонтия",
			},
			{
				id: "app-03",
				startsAt: "2026-08-25T12:00:00Z",
				chairId: "chair-1",
				doctorUserId: "doc-1",
				specialty: "therapy",
				status: "completed",
				reason: "Профгигиена",
			},
			{
				id: "app-04",
				startsAt: "2026-08-25T14:00:00Z",
				chairId: "chair-2",
				doctorUserId: "doc-2",
				specialty: "surgery",
				status: "completed",
				reason: "Удаление зуба 48",
			},
			{
				id: "app-05",
				startsAt: "2026-08-25T15:30:00Z",
				chairId: "chair-2",
				doctorUserId: "doc-2",
				specialty: "surgery",
				status: "completed",
				reason: "Имплантация",
			},
			{
				id: "app-06",
				startsAt: "2026-08-25T17:00:00Z",
				chairId: "chair-2",
				doctorUserId: "doc-3",
				specialty: "orthopedics",
				status: "completed",
				reason: "Снятие слепков под коронку",
			},
			// Cancelled appointment (should be ignored)
			{
				id: "app-cancelled",
				startsAt: "2026-08-25T18:00:00Z",
				chairId: "chair-1",
				doctorUserId: "doc-1",
				specialty: "therapy",
				status: "cancelled",
				reason: "Пациент отменил запись",
			},
		];

		test("correctly tallies patients by profile for the day", () => {
			const report = mapScheduleAppointmentsToSanpinDailyLoad(sampleAppointments, {
				startDate: "2026-08-25",
				endDate: "2026-08-25",
			});

			assert.strictEqual(report.totalDays, 1);
			assert.strictEqual(report.activeWorkingDaysCount, 1);

			const day = report.dailyLoads[0]!;
			assert.strictEqual(day.date, "2026-08-25");
			assert.strictEqual(day.therapyPatientsCount, 3);
			assert.strictEqual(day.surgeryPatientsCount, 2);
			assert.strictEqual(day.orthopedicsPatientsCount, 1);
			assert.strictEqual(day.totalPatientsCount, 6);
		});

		test("calculates exact instrument counts for the day", () => {
			const report = mapScheduleAppointmentsToSanpinDailyLoad(sampleAppointments, {
				startDate: "2026-08-25",
				endDate: "2026-08-25",
			});

			const day = report.dailyLoads[0]!;

			// 3 therapy -> 3 basic trays, 3 bur sets, 6 handpieces
			assert.strictEqual(day.totalBasicTraysCount, 3);
			assert.strictEqual(day.totalBurSetsCount, 3);
			assert.strictEqual(day.totalHandpiecesCount, 6);

			// 2 surgery -> 2 surgical trays, 2 forceps, 2 elevators, 2 syringes
			assert.strictEqual(day.totalSurgicalTraysCount, 2);
			assert.strictEqual(day.totalForcepsCount, 2);
			assert.strictEqual(day.totalElevatorsCount, 2);
			assert.strictEqual(day.totalSyringesCount, 2);

			// 1 orthopedics -> 1 orthopedic tray, 1 impression trays set
			assert.strictEqual(day.totalOrthopedicTraysCount, 1);
			assert.strictEqual(day.totalImpressionTraysCount, 1);

			// Total instruments = 3*4 + 2*4 + 1*2 = 12 + 8 + 2 = 22 items
			assert.strictEqual(day.totalInstrumentsCount, 22);
		});

		test("calculates exact kraft packages and sizes", () => {
			const report = mapScheduleAppointmentsToSanpinDailyLoad(sampleAppointments, {
				startDate: "2026-08-25",
				endDate: "2026-08-25",
			});

			const day = report.dailyLoads[0]!;
			// Therapy: 3 * 4 = 12 packs (6 size_75x150, 6 size_100x200)
			// Surgery: 2 * 4 = 8 packs (2 size_100x200, 6 size_150x250)
			// Orthopedics: 1 * 2 = 2 packs (1 size_100x200, 1 size_150x250)
			// Total kraft packs = 12 + 8 + 2 = 22 packs
			assert.strictEqual(day.totalKraftPackagesCount, 22);
			assert.strictEqual(day.kraftPackagesBySize.size_75x150, 6);
			assert.strictEqual(day.kraftPackagesBySize.size_100x200, 9); // 6 + 2 + 1 = 9
			assert.strictEqual(day.kraftPackagesBySize.size_150x250, 7); // 6 + 1 = 7
		});

		test("calculates autoclave cycles based on chamber capacity", () => {
			// With capacity = 14 packs per cycle:
			// 22 packs -> ceil(22 / 14) = 2 autoclave cycles
			const report = mapScheduleAppointmentsToSanpinDailyLoad(sampleAppointments, {
				startDate: "2026-08-25",
				endDate: "2026-08-25",
			}, { autoclaveCapacityPacks: 14 });

			const day = report.dailyLoads[0]!;
			assert.strictEqual(day.totalAutoclaveCyclesCount, 2);
			assert.strictEqual(day.proposedAutoclaveCycles.length, 2);
			assert.strictEqual(day.proposedAutoclaveCycles[0]!.packagesCount, 14);
			assert.strictEqual(day.proposedAutoclaveCycles[1]!.packagesCount, 8);
			assert.strictEqual(day.proposedAutoclaveCycles[0]!.targetTemperatureCelsius, 134);
			assert.strictEqual(day.proposedAutoclaveCycles[0]!.targetPressureBar, 2.1);
		});

		test("breaks down load and autoclave cycles per chair", () => {
			const report = mapScheduleAppointmentsToSanpinDailyLoad(sampleAppointments, {
				startDate: "2026-08-25",
				endDate: "2026-08-25",
			}, {
				autoclaveCapacityPacks: 14,
				chairNameMap: {
					"chair-1": "Кабинет № 1 (Терапия)",
					"chair-2": "Кабинет № 2 (Хирургия/Ортопедия)",
				},
			});

			const day = report.dailyLoads[0]!;
			assert.strictEqual(day.chairList.length, 2);

			const chair1 = day.chairs["chair-1"]!;
			assert.strictEqual(chair1.chairName, "Кабинет № 1 (Терапия)");
			assert.strictEqual(chair1.therapyPatientsCount, 3);
			assert.strictEqual(chair1.surgeryPatientsCount, 0);
			assert.strictEqual(chair1.totalPatientsCount, 3);
			assert.strictEqual(chair1.kraftPackagesCount, 12);
			assert.strictEqual(chair1.autoclaveCyclesCount, 1); // ceil(12/14) = 1

			const chair2 = day.chairs["chair-2"]!;
			assert.strictEqual(chair2.chairName, "Кабинет № 2 (Хирургия/Ортопедия)");
			assert.strictEqual(chair2.surgeryPatientsCount, 2);
			assert.strictEqual(chair2.orthopedicsPatientsCount, 1);
			assert.strictEqual(chair2.totalPatientsCount, 3);
			assert.strictEqual(chair2.kraftPackagesCount, 10); // 2*4 + 1*2 = 10
			assert.strictEqual(chair2.autoclaveCyclesCount, 1); // ceil(10/14) = 1
		});

		test("calculates Form 366/у PSO sampling requirements (1% rule)", () => {
			const report = mapScheduleAppointmentsToSanpinDailyLoad(sampleAppointments, {
				startDate: "2026-08-25",
				endDate: "2026-08-25",
			});

			const day = report.dailyLoads[0]!;
			// For surgical day: min sample count is 5 (or 1% of 22 = 1 -> min is 5 for surgical)
			assert.strictEqual(day.psoMinSampleRequired, 5);
			assert.strictEqual(day.psoAzopyramReagentMl, 2.5); // 5 * 0.5 ml
			assert.strictEqual(day.psoPhenolphthaleinMl, 2.5);
		});
	});

	// ─── 4. Retrospective Journal Generators ───────────────────────────────────
	describe("4. Retrospective Journal Record Generators", () => {
		const sampleAppointments: SanpinAppointmentSource[] = [
			{ id: "1", startsAt: "2026-08-25T10:00:00Z", specialty: "therapy", status: "completed" },
			{ id: "2", startsAt: "2026-08-25T12:00:00Z", specialty: "surgery", status: "completed" },
			{ id: "3", startsAt: "2026-08-25T15:00:00Z", specialty: "orthopedics", status: "completed" },
		];

		const report = mapScheduleAppointmentsToSanpinDailyLoad(sampleAppointments, {
			startDate: "2026-08-25",
			endDate: "2026-08-25",
		});
		const dailyLoad = report.dailyLoads[0]!;

		test("generates valid Form 366/у PSO records for each category", () => {
			const psoRecords = generateRetrospectivePsoRecordsFromDailyLoad(dailyLoad);
			assert.strictEqual(psoRecords.length, 3); // therapy, surgery, orthopedics batches

			for (const r of psoRecords) {
				assert.strictEqual(r.isBatchApproved, true);
				assert.strictEqual(r.isAzopyramNegative, true);
				assert.strictEqual(r.isPhenolphthaleinNegative, true);
				assert.ok(r.testedSampleCount >= 3);
				assert.ok(r.id.startsWith("PSO-20260825-"));
			}
		});

		test("generates valid Form 257/у Autoclave records with digital stamps", () => {
			const autoRecords = generateRetrospectiveAutoclaveRecordsFromDailyLoad(dailyLoad);
			assert.strictEqual(autoRecords.length, 1); // 10 packs -> 1 cycle

			const r = autoRecords[0]!;
			assert.strictEqual(r.isCyclePassed, true);
			assert.strictEqual(r.status, "sterile_passed");
			assert.strictEqual(r.actualTemperatureCelsius, 134.4);
			assert.strictEqual(r.actualPressureBar, 2.15);
			assert.strictEqual(r.chamberPoints.length, 5);
			assert.strictEqual(r.areAllPointsPassed, true);
			assert.ok(r.digitalStampHash.startsWith("DENTE-CSO-257-"));
		});

		test("generates KraftPackageRecord items with valid barcodes", () => {
			const kraftPacks = generateRetrospectiveKraftPackagesFromDailyLoad(dailyLoad);
			assert.strictEqual(kraftPacks.length, 4); // 1 basic tray + 1 bur set + 1 surg tray + 1 ortho tray

			for (const pack of kraftPacks) {
				assert.strictEqual(pack.status, "sterile_valid");
				assert.strictEqual(pack.daysLifespan, 50);
				assert.ok(pack.barcodeDataMatrixPayload.includes("АК-01"));
				assert.ok(pack.barcodeDataMatrixPayload.includes("CYC"));
			}
		});
	});
});
