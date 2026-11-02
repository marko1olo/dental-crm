/**
 * chairRosterShiftsAndCopy.test.tsx
 *
 * Модульные и интеграционные тесты смен врачей на креслах и копирования расписания:
 * - 1-клик назначение пресетов смен (утро 08-14, утро 09-15, вечер 14-20, вечер 15-21, полный день, очистка)
 * - Назначение интервалов дат (applyDoctorChairDateRange, 2/2 ротация, 5-дневка)
 * - Копирование смен недели на следующую неделю и на месяц (4 недели вперед)
 * - Автономия врача и персонала (Мандат 8e)
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ChairScheduleView } from "../ChairScheduleView";
import {
	applyCellShiftPreset,
	applyDoctorChairDateRange,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	DEFAULT_CLINIC_STAFF,
	CLINIC_CABINETS_CATALOG,
	type DoctorShift,
} from "../chairRosterMath";
import {
	setupMockDom,
	findNodeByTestId,
	clickNode,
	getMockDashboard,
	type MockDomNode,
} from "./chairDoctorRosterTestHelpers";

describe("Schedule Parity: Doctor Shifts Binding & Week/Month Copy", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	describe("3. 1-Click Shift Presets & Doctor-to-Chair Binding", () => {
		it("applyCellShiftPreset supports morning, morning_9, evening, evening_15, full_day, and clear", () => {
			const initialShifts: DoctorShift[] = [];
			const baseParams = {
				dateIso: "2026-09-09",
				cabinetId: "cab-1",
				chairId: "chair-1",
				doctorId: "doc-1",
				staffList: DEFAULT_CLINIC_STAFF,
				cabinets: CLINIC_CABINETS_CATALOG,
			};

			// 1. Morning 08:00–14:00
			const s1 = applyCellShiftPreset(initialShifts, { ...baseParams, presetType: "morning" });
			assert.strictEqual(s1.length, 1);
			assert.strictEqual(s1[0]?.startTime, "08:00");
			assert.strictEqual(s1[0]?.endTime, "14:00");

			// 2. Morning_9 09:00–15:00
			const s2 = applyCellShiftPreset(initialShifts, { ...baseParams, presetType: "morning_9" });
			assert.strictEqual(s2.length, 1);
			assert.strictEqual(s2[0]?.startTime, "09:00");
			assert.strictEqual(s2[0]?.endTime, "15:00");

			// 3. Evening 14:00–20:00
			const s3 = applyCellShiftPreset(initialShifts, { ...baseParams, presetType: "evening" });
			assert.strictEqual(s3.length, 1);
			assert.strictEqual(s3[0]?.startTime, "14:00");
			assert.strictEqual(s3[0]?.endTime, "20:00");

			// 4. Evening_15 15:00–21:00
			const s4 = applyCellShiftPreset(initialShifts, { ...baseParams, presetType: "evening_15" });
			assert.strictEqual(s4.length, 1);
			assert.strictEqual(s4[0]?.startTime, "15:00");
			assert.strictEqual(s4[0]?.endTime, "21:00");

			// 5. Full day 08:00–20:00
			const s5 = applyCellShiftPreset(initialShifts, { ...baseParams, presetType: "full_day" });
			assert.strictEqual(s5.length, 1);
			assert.strictEqual(s5[0]?.startTime, "08:00");
			assert.strictEqual(s5[0]?.endTime, "20:00");

			// 6. Clear (removes shift on chair)
			const s6 = applyCellShiftPreset(s5, { ...baseParams, presetType: "clear" });
			assert.strictEqual(s6.length, 0, "Shift should be cleared");
		});

		it("ChairScheduleView popover renders morning-9 and evening-15 preset buttons", async () => {
			const db = getMockDashboard();
			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={db}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			// Open popover for chair-1
			const assignBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			assert.ok(assignBtn, "chair-view-assign-doctor-chair-1 must exist");

			await clickNode(assignBtn);

			const m9Btn = findNodeByTestId(container, "chair-view-shift-morning-9-chair-1");
			const e15Btn = findNodeByTestId(container, "chair-view-shift-evening-15-chair-1");

			assert.ok(m9Btn, "chair-view-shift-morning-9-chair-1 must exist in shift popover");
			assert.ok(e15Btn, "chair-view-shift-evening-15-chair-1 must exist in shift popover");
		});
	});

	describe("4. Multi-Day Date Range Shift Assignment", () => {
		it("applyDoctorChairDateRange generates shifts for all days in date range", () => {
			const initialShifts: DoctorShift[] = [];
			const result = applyDoctorChairDateRange(initialShifts, {
				startDateIso: "2026-09-07",
				endDateIso: "2026-09-11", // 5 days (Mon–Fri)
				doctorId: "doc-1",
				chairId: "chair-1",
				shiftPreset: "morning_9",
				staffList: DEFAULT_CLINIC_STAFF,
				cabinets: CLINIC_CABINETS_CATALOG,
			});

			assert.strictEqual(result.length, 5, "Should create 5 shifts for 5 days");
			for (const shift of result) {
				assert.strictEqual(shift.doctorId, "doc-1");
				assert.strictEqual(shift.chairId, "chair-1");
				assert.strictEqual(shift.startTime, "09:00");
				assert.strictEqual(shift.endTime, "15:00");
			}
		});

		it("applyDoctorChairDateRange correctly handles two_two (2/2) rotation", () => {
			const initialShifts: DoctorShift[] = [];
			const result = applyDoctorChairDateRange(initialShifts, {
				startDateIso: "2026-09-07",
				endDateIso: "2026-09-14", // 8 days: 2 work, 2 off, 2 work, 2 off
				doctorId: "doc-1",
				chairId: "chair-1",
				shiftPreset: "two_two",
				staffList: DEFAULT_CLINIC_STAFF,
				cabinets: CLINIC_CABINETS_CATALOG,
			});

			// 8 days in 2/2 rotation = 4 working days (days 0, 1, 4, 5)
			assert.strictEqual(result.length, 4, "2/2 rotation over 8 days should yield 4 working days");
		});

		it("applyDoctorChairDateRange correctly handles five_day (skips weekends)", () => {
			const initialShifts: DoctorShift[] = [];
			const result = applyDoctorChairDateRange(initialShifts, {
				startDateIso: "2026-09-07", // Monday
				endDateIso: "2026-09-13", // Sunday (7 days)
				doctorId: "doc-1",
				chairId: "chair-1",
				shiftPreset: "five_day",
				staffList: DEFAULT_CLINIC_STAFF,
				cabinets: CLINIC_CABINETS_CATALOG,
			});

			// Monday to Sunday: 5 workdays (Mon–Fri), Sat and Sun skipped
			assert.strictEqual(result.length, 5, "five_day preset must skip Sat and Sun");
		});

		it("ChairScheduleView: dropdown menu has btn-assign-date-range which opens date range modal", async () => {
			const db = getMockDashboard();
			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={db}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			const menuBtn = findNodeByTestId(container, "btn-assign-date-range");
			assert.ok(menuBtn, "btn-assign-date-range must exist in dropdown menu");

			// Click to open modal
			await clickNode(menuBtn);

			const modal =
				findNodeByTestId(container, "chair-schedule-date-range-modal") ||
				findNodeByTestId(document.body as any, "chair-schedule-date-range-modal");
			assert.ok(modal, "chair-schedule-date-range-modal must open");

			const applyModalBtn =
				findNodeByTestId(container, "chair-range-modal-apply-btn") ||
				findNodeByTestId(document.body as any, "chair-range-modal-apply-btn");
			assert.ok(applyModalBtn, "chair-range-modal-apply-btn must exist in modal");
		});
	});

	describe("5. 1-Click Week Copy & Month Copy", () => {
		it("copyWeekShiftsToTargetWeek correctly shifts dates by 7 days", () => {
			const week1Shifts: DoctorShift[] = [
				{
					id: "s1",
					doctorId: "doc-1",
					doctorName: "Иванов И.И.",
					doctorRole: "therapist",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-1",
					chairId: "chair-1",
					dateIso: "2026-09-07",
					archetypeId: "morning_shift",
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
			];

			const copied = copyWeekShiftsToTargetWeek(week1Shifts, "2026-09-07", "2026-09-14");
			const targetShift = copied.find((s) => s.dateIso === "2026-09-14");
			assert.ok(targetShift, "Shift must be copied to target date 2026-09-14");
			assert.strictEqual(targetShift.doctorId, "doc-1");
			assert.strictEqual(targetShift.chairId, "chair-1");
			assert.strictEqual(targetShift.startTime, "08:00");
		});

		it("copyWeekShiftsToMonth copies shifts across 4 consecutive weeks", () => {
			const week1Shifts: DoctorShift[] = [
				{
					id: "s1",
					doctorId: "doc-1",
					doctorName: "Иванов И.И.",
					doctorRole: "therapist",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-1",
					chairId: "chair-1",
					dateIso: "2026-09-07",
					archetypeId: "morning_shift",
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
			];

			const copied = copyWeekShiftsToMonth(week1Shifts, "2026-09-07", 4);
			assert.ok(copied.some((s) => s.dateIso === "2026-09-14"));
			assert.ok(copied.some((s) => s.dateIso === "2026-09-21"));
			assert.ok(copied.some((s) => s.dateIso === "2026-09-28"));
		});

		it("ChairScheduleView dropdown menu has btn-copy-chair-week-next and btn-copy-chair-month", async () => {
			const db = getMockDashboard();
			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={db}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			const copyNextWeekBtn = findNodeByTestId(container, "btn-copy-chair-week-next");
			const copyMonthBtn = findNodeByTestId(container, "btn-copy-chair-month");

			assert.ok(copyNextWeekBtn, "btn-copy-chair-week-next must exist");
			assert.ok(copyMonthBtn, "btn-copy-chair-week-month must exist");
		});
	});
});
