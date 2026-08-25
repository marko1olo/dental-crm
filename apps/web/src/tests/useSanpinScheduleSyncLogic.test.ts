import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	exportSanpinDailyLoadReportToCsv,
	getDateRangeFromPreset,
	useSanpinScheduleSyncLogic,
} from "../hooks/domains/useSanpinScheduleSyncLogic.js";
import {
	mapScheduleAppointmentsToSanpinDailyLoad,
	type SanpinAppointmentSource,
} from "@dental/shared";

describe("useSanpinScheduleSyncLogic & Web Domain Schedule Synchronization", () => {
	describe("1. Date Range Presets", () => {
		it("generates correct ISO date bounds for presets", () => {
			const today = getDateRangeFromPreset("today");
			assert.ok(today.startDate);
			assert.equal(today.startDate, today.endDate);

			const yesterday = getDateRangeFromPreset("yesterday");
			assert.ok(yesterday.startDate);
			assert.equal(yesterday.startDate, yesterday.endDate);

			const thisWeek = getDateRangeFromPreset("this_week");
			assert.ok(thisWeek.startDate <= thisWeek.endDate);

			const thisMonth = getDateRangeFromPreset("this_month");
			assert.ok(thisMonth.startDate.endsWith("-01"));
			assert.ok(thisMonth.startDate <= thisMonth.endDate);
		});
	});

	describe("2. Schedule Daily Load Report CSV Export", () => {
		it("exports daily load and summary metrics with UTF-8 BOM and RFC 4180 formatting", () => {
			const appointments: SanpinAppointmentSource[] = [
				{
					id: "a1",
					startsAt: "2026-08-25T09:00:00Z",
					chairId: "chair-1",
					specialty: "therapy",
					status: "completed",
					reason: "Кариес 16",
				},
				{
					id: "a2",
					startsAt: "2026-08-25T11:00:00Z",
					chairId: "chair-1",
					specialty: "surgery",
					status: "completed",
					reason: "Удаление 38",
				},
				{
					id: "a3",
					startsAt: "2026-08-25T14:00:00Z",
					chairId: "chair-2",
					specialty: "orthopedics",
					status: "completed",
					reason: "Коронка 46",
				},
			];

			const report = mapScheduleAppointmentsToSanpinDailyLoad(appointments, {
				startDate: "2026-08-25",
				endDate: "2026-08-25",
			});

			const csv = exportSanpinDailyLoadReportToCsv(report);

			// UTF-8 BOM check
			assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM for Excel compatibility");

			// Headers and content check
			assert.ok(csv.includes("Дата;День недели;Рабочий день;Всего пациентов"));
			assert.ok(csv.includes("Терапия (пац.);Хирургия (пац.);Ортопедия (пац.)"));
			assert.ok(csv.includes("2026-08-25"));
			assert.ok(csv.includes("ИТОГО ЗА ПЕРИОД"));
		});
	});

	describe("3. Hook Contract & Function Existence", () => {
		it("confirms useSanpinScheduleSyncLogic is exported as a function", () => {
			assert.equal(typeof useSanpinScheduleSyncLogic, "function");
			assert.equal(typeof exportSanpinDailyLoadReportToCsv, "function");
			assert.equal(typeof getDateRangeFromPreset, "function");
		});
	});
});
