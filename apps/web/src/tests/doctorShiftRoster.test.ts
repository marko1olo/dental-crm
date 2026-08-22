import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	ANNUAL_NORM_TOTALS_2026,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	MEDICAL_STAFF_ROLES,
	RUSSIAN_PRODUCTION_CALENDAR_2026,
	SHIFT_ARCHETYPES,
	type StaffMember,
} from "../components/schedule/roster/doctorShiftRosterPresets";
import {
	calculateChairUtilization,
	calculateShiftDurationHours,
	calculateStaffRosterStats,
	createDefaultWeeklySchedule,
	detectRosterConflicts,
	doIntervalsOverlap,
	type DoctorShift,
	exportFormT13ToCsv,
	generateFormT13Matrix,
	generatePrintableRosterHtml,
	minutesToTimeString,
	timeStringToMinutes,
} from "../components/schedule/roster/doctorShiftRosterEngine";
import { DoctorShiftRosterModal } from "../components/schedule/roster/DoctorShiftRosterModal";

describe("Statutory Doctor Schedule Shift Roster & Labor Compliance Studio", () => {
	it("should verify 2026 Russian Production Calendar month norms for 33h medical week (ТК РФ ст. 350)", () => {
		// Verify all 12 months are defined
		for (let m = 1; m <= 12; m++) {
			const monthNorm = RUSSIAN_PRODUCTION_CALENDAR_2026[m];
			assert.ok(monthNorm, `Month ${m} must exist in 2026 production calendar`);
			assert.ok(monthNorm.normHours33 > 0);
			assert.ok(monthNorm.workingDays > 0);
		}

		// Spot check known statutory benchmarks
		assert.equal(RUSSIAN_PRODUCTION_CALENDAR_2026[1]!.normHours33, 99.0); // Jan (15 days * 6.6)
		assert.equal(RUSSIAN_PRODUCTION_CALENDAR_2026[2]!.normHours33, 124.4); // Feb (19 days * 6.6 - 1)
		assert.equal(RUSSIAN_PRODUCTION_CALENDAR_2026[3]!.normHours33, 138.6); // Mar (21 days * 6.6)
		assert.equal(RUSSIAN_PRODUCTION_CALENDAR_2026[4]!.normHours33, 144.2); // Apr (22 days * 6.6 - 1)
		assert.equal(RUSSIAN_PRODUCTION_CALENDAR_2026[5]!.normHours33, 124.4); // May (19 days * 6.6 - 1)
		assert.equal(RUSSIAN_PRODUCTION_CALENDAR_2026[7]!.normHours33, 151.8); // Jul (23 days * 6.6)
		assert.equal(RUSSIAN_PRODUCTION_CALENDAR_2026[8]!.normHours33, 138.6); // Aug (21 days * 6.6)
		assert.equal(RUSSIAN_PRODUCTION_CALENDAR_2026[11]!.normHours33, 131.0); // Nov (20 days * 6.6 - 1)

		// Annual totals
		assert.equal(ANNUAL_NORM_TOTALS_2026.totalWorkDays, 247);
		assert.equal(ANNUAL_NORM_TOTALS_2026.totalPreHolidayDays, 6);
		assert.equal(ANNUAL_NORM_TOTALS_2026.totalNormHours33, 1624.2);
	});

	it("should verify shift archetypes, staff roles, and clinic cabinets catalog", () => {
		// Archetypes
		assert.equal(SHIFT_ARCHETYPES.morning_shift.durationHours, 6.0);
		assert.equal(SHIFT_ARCHETYPES.morning_shift.startTime, "08:30");
		assert.equal(SHIFT_ARCHETYPES.morning_shift.endTime, "14:30");
		assert.equal(SHIFT_ARCHETYPES.morning_shift.t13Code, "Я");

		assert.equal(SHIFT_ARCHETYPES.evening_shift.durationHours, 6.0);
		assert.equal(SHIFT_ARCHETYPES.saturday_shift.durationHours, 7.0);
		assert.equal(SHIFT_ARCHETYPES.sunday_duty.durationHours, 6.0);
		assert.equal(SHIFT_ARCHETYPES.night_duty.durationHours, 12.0);
		assert.equal(SHIFT_ARCHETYPES.night_duty.nightHours, 8.0);
		assert.equal(SHIFT_ARCHETYPES.night_duty.t13Code, "Н");
		assert.equal(SHIFT_ARCHETYPES.sick_leave.t13Code, "Б");
		assert.equal(SHIFT_ARCHETYPES.vacation.t13Code, "ОТ");

		// Medical staff roles
		assert.equal(MEDICAL_STAFF_ROLES.therapist.standardWeeklyHours, 33);
		assert.equal(MEDICAL_STAFF_ROLES.surgeon.standardWeeklyHours, 33);
		assert.equal(MEDICAL_STAFF_ROLES.surgeon.requiresAssistant, true);
		assert.equal(MEDICAL_STAFF_ROLES.assistant.isAssistant, true);

		// Cabinets
		assert.equal(CLINIC_CABINETS_CATALOG.length, 4);
		assert.equal(CLINIC_CABINETS_CATALOG[0]!.chairs.length, 2);
	});

	it("should calculate shift durations and night hours correctly per TK RF Art. 96", () => {
		// Morning shift
		const morning = calculateShiftDurationHours("08:30", "14:30", 0);
		assert.equal(morning.durationHours, 6.0);
		assert.equal(morning.nightHours, 0.0);

		// Saturday shift with 60m lunch break
		const saturday = calculateShiftDurationHours("09:00", "17:00", 60);
		assert.equal(saturday.durationHours, 7.0);
		assert.equal(saturday.nightHours, 0.0);

		// Night shift crossing midnight: 20:00 to 08:00 (12h, 60m break = 11.0h, night hours 22:00-06:00 = 8h)
		const night = calculateShiftDurationHours("20:00", "08:00", 60);
		assert.equal(night.durationHours, 11.0);
		assert.equal(night.nightHours, 8.0);

		// Time conversions
		assert.equal(timeStringToMinutes("08:30"), 510);
		assert.equal(timeStringToMinutes("14:30"), 870);
		assert.equal(minutesToTimeString(510), "08:30");
		assert.equal(minutesToTimeString(870), "14:30");

		// Interval overlaps
		assert.equal(doIntervalsOverlap("08:30", "14:30", "10:00", "16:00"), true);
		assert.equal(doIntervalsOverlap("08:30", "14:30", "14:30", "20:30"), false); // touching but not overlapping
		assert.equal(doIntervalsOverlap("08:30", "14:30", "15:00", "20:00"), false);
	});

	it("should detect all types of scheduling conflicts and labor violations", () => {
		const testShifts: DoctorShift[] = [
			// Doctor double booking on same day
			{
				id: "s1",
				doctorId: "doc-smirnov",
				doctorName: "Д-р Смирнов А.П.",
				doctorRole: "therapist",
				assistantId: "asst-ivanova",
				assistantName: "Медсестра Иванова М.А.",
				cabinetId: "cab-1",
				chairId: "chair-1a",
				dateIso: "2026-08-24",
				archetypeId: "morning_shift",
				startTime: "08:30",
				endTime: "14:30",
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			},
			{
				id: "s2",
				doctorId: "doc-smirnov", // Same doctor!
				doctorName: "Д-р Смирнов А.П.",
				doctorRole: "therapist",
				assistantId: "asst-kovaleva",
				assistantName: "Медсестра Ковалева Т.Н.",
				cabinetId: "cab-1",
				chairId: "chair-1b",
				dateIso: "2026-08-24",
				archetypeId: "morning_shift",
				startTime: "10:00",
				endTime: "16:00", // Overlaps 10:00–14:30
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			},
			// Surgery shift without assistant
			{
				id: "s3",
				doctorId: "doc-volkov",
				doctorName: "Д-р Волков С.В.",
				doctorRole: "surgeon",
				assistantId: null, // Missing assistant for surgery!
				assistantName: null,
				cabinetId: "cab-2",
				chairId: "chair-2",
				dateIso: "2026-08-25",
				archetypeId: "morning_shift",
				startTime: "08:30",
				endTime: "14:30",
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			},
			// Chair double booking
			{
				id: "s4",
				doctorId: "doc-kuznetsova",
				doctorName: "Д-р Кузнецова Е.М.",
				doctorRole: "orthopedist",
				assistantId: "asst-sokolova",
				assistantName: "Медсестра Соколова Д.С.",
				cabinetId: "cab-3",
				chairId: "chair-3",
				dateIso: "2026-08-26",
				archetypeId: "morning_shift",
				startTime: "08:30",
				endTime: "14:30",
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			},
			{
				id: "s5",
				doctorId: "doc-lebedeva",
				doctorName: "Д-р Лебедева О.И.",
				doctorRole: "orthodontist",
				assistantId: "asst-ivanova",
				assistantName: "Медсестра Иванова М.А.",
				cabinetId: "cab-3",
				chairId: "chair-3", // Same chair-3 at overlapping time!
				dateIso: "2026-08-26",
				archetypeId: "morning_shift",
				startTime: "12:00",
				endTime: "18:00",
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			},
		];

		const conflicts = detectRosterConflicts(testShifts, DEFAULT_CLINIC_STAFF);

		// Check doctor double booking found
		const docConflict = conflicts.find((c) => c.type === "doctor_double_booking");
		assert.ok(docConflict, "Doctor double booking conflict must be detected");
		assert.equal(docConflict.severity, "error");
		assert.ok(docConflict.staffIds.includes("doc-smirnov"));

		// Check surgery without assistant found
		const surgeryConflict = conflicts.find((c) => c.type === "no_assistant_for_surgery");
		assert.ok(surgeryConflict, "Surgery without assistant warning must be detected");
		assert.equal(surgeryConflict.severity, "warning");

		// Check chair double booking found
		const chairConflict = conflicts.find((c) => c.type === "chair_double_booking");
		assert.ok(chairConflict, "Chair double booking conflict must be detected");
		assert.equal(chairConflict.severity, "error");
	});

	it("should detect weekly overtime exceeding 33 hours for medical doctors", () => {
		// Schedule 6 shifts of 6.0 hours = 36.0 hours in the same week (> 33h limit)
		const overtimeShifts: DoctorShift[] = [
			"2026-08-24",
			"2026-08-25",
			"2026-08-26",
			"2026-08-27",
			"2026-08-28",
			"2026-08-29",
		].map((dateIso, idx) => ({
			id: `ot-shift-${idx}`,
			doctorId: "doc-smirnov",
			doctorName: "Д-р Смирнов А.П.",
			doctorRole: "therapist",
			assistantId: "asst-ivanova",
			assistantName: "Медсестра Иванова М.А.",
			cabinetId: "cab-1",
			chairId: "chair-1a",
			dateIso,
			archetypeId: "morning_shift",
			startTime: "08:30",
			endTime: "14:30",
			durationHours: 6.0,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		}));

		const conflicts = detectRosterConflicts(overtimeShifts, DEFAULT_CLINIC_STAFF);
		const otConflict = conflicts.find((c) => c.type === "weekly_overtime_tk_rf");

		assert.ok(otConflict, "Weekly overtime conflict must be detected when hours > 33");
		assert.equal(otConflict.severity, "warning");
		assert.ok(otConflict.message.includes("36.0 ч"));
		assert.ok(otConflict.message.includes("+3.0 ч"));
	});

	it("should calculate chair utilization percentage accurately", () => {
		const shifts: DoctorShift[] = [
			{
				id: "u-shift-1",
				doctorId: "doc-smirnov",
				doctorName: "Д-р Смирнов А.П.",
				doctorRole: "therapist",
				assistantId: "asst-ivanova",
				assistantName: "Медсестра Иванова М.А.",
				cabinetId: "cab-1",
				chairId: "chair-1a",
				dateIso: "2026-08-24",
				archetypeId: "morning_shift",
				startTime: "08:30",
				endTime: "14:30", // 6 hours = 360 minutes
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			},
		];

		// Case 1: Appointments covering 180 minutes (50% utilization)
		const appointments = [
			{
				chairId: "chair-1a",
				startsAt: "2026-08-24T09:00:00",
				endsAt: "2026-08-24T10:30:00", // 90 min
				status: "confirmed",
			},
			{
				chairId: "chair-1a",
				startsAt: "2026-08-24T11:00:00",
				endsAt: "2026-08-24T12:30:00", // 90 min
				status: "confirmed",
			},
			// Cancelled appointment should be ignored
			{
				chairId: "chair-1a",
				startsAt: "2026-08-24T13:00:00",
				endsAt: "2026-08-24T14:00:00",
				status: "cancelled",
			},
		];

		const metrics = calculateChairUtilization(shifts, appointments, "2026-08-24", CLINIC_CABINETS_CATALOG);

		const chair1a = metrics.find((m) => m.chairId === "chair-1a");
		assert.ok(chair1a);
		assert.equal(chair1a.totalShiftMinutes, 360);
		assert.equal(chair1a.bookedAppointmentMinutes, 180);
		assert.equal(chair1a.utilizationRatePercent, 50.0);
		assert.equal(chair1a.heatLevel, "optimal");

		// Chair with 0 shifts
		const chair2 = metrics.find((m) => m.chairId === "chair-2");
		assert.ok(chair2);
		assert.equal(chair2.totalShiftMinutes, 0);
		assert.equal(chair2.utilizationRatePercent, 0);
		assert.equal(chair2.heatLevel, "empty");
	});

	it("should calculate staff monthly stats vs statutory norm", () => {
		// Generate standard shifts
		const defaultShifts = createDefaultWeeklySchedule("2026-08-24", DEFAULT_CLINIC_STAFF, CLINIC_CABINETS_CATALOG);
		const stats = calculateStaffRosterStats(DEFAULT_CLINIC_STAFF, defaultShifts, 2026, 8);

		assert.equal(stats.length, DEFAULT_CLINIC_STAFF.length);
		const docSmirnov = stats.find((s) => s.staffId === "doc-smirnov");
		assert.ok(docSmirnov);
		assert.equal(docSmirnov.monthNormHours, 138.6); // Aug 2026 norm for 33h
		assert.ok(docSmirnov.totalScheduledHours > 0);
		assert.ok(docSmirnov.totalShifts > 0);
	});

	it("should generate Form T-13 matrix and export CSV with UTF-8 BOM", () => {
		const shifts = createDefaultWeeklySchedule("2026-08-01", DEFAULT_CLINIC_STAFF, CLINIC_CABINETS_CATALOG);
		const t13 = generateFormT13Matrix(DEFAULT_CLINIC_STAFF, shifts, 2026, 8);

		assert.equal(t13.length, DEFAULT_CLINIC_STAFF.length);
		const row1 = t13[0]!;
		assert.ok(row1.tabNumber);
		assert.ok(row1.staffName);
		assert.equal(row1.days.length, 31); // August has 31 days

		// Days have codes (Я, В, etc.)
		const workedDays = row1.days.filter((d) => d.code === "Я" || d.code === "Н");
		assert.ok(workedDays.length >= 1);

		// Half-month splits
		assert.equal(row1.firstHalfDays + row1.secondHalfDays, row1.totalMonthDays);
		assert.equal(
			Math.round((row1.firstHalfHours + row1.secondHalfHours) * 10) / 10,
			row1.totalMonthHours,
		);

		// CSV Export
		const csv = exportFormT13ToCsv(t13, 2026, 8, 'ООО "Денте Клиник"');
		assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM");
		assert.ok(csv.includes("ТАБЕЛЬ УЧЕТА РАБОЧЕГО ВРЕМЕНИ"));
		assert.ok(csv.includes('ООО "Денте Клиник"'));
		assert.ok(csv.includes("Смирнов Алексей Павлович"));
		assert.ok(csv.includes(";")); // Semicolon separated for RU Excel
	});

	it("should generate printable A4 Landscape HTML roster", () => {
		const shifts = createDefaultWeeklySchedule("2026-08-24", DEFAULT_CLINIC_STAFF, CLINIC_CABINETS_CATALOG);
		const html = generatePrintableRosterHtml(shifts, "2026-08-24", "2026-08-30", 'ООО "Денте Клиник"', CLINIC_CABINETS_CATALOG);

		assert.ok(html.includes("@page { size: A4 landscape;"));
		assert.ok(html.includes("ГРАФИК СМЕННОСТИ"));
		assert.ok(html.includes('ООО "Денте Клиник"'));
		assert.ok(html.includes("Кабинет 1"));
		assert.ok(html.includes("Кабинет 2"));
		assert.ok(html.includes("Д-р Смирнов А.П."));
		assert.ok(html.includes("Главный врач:"));
	});

	it("should export DoctorShiftRosterModal component function", () => {
		assert.equal(typeof DoctorShiftRosterModal, "function");
	});
});
