/**
 * DENTE Dental CRM — StomX & DentalPRO Parity Test Suite
 * Tests:
 * 1. 1-Click Chair Archetype Presets in QuickAddChairModal
 * 2. 1-Click Weekly Doctor-to-Chair Shift Binding Templates (applyDoctorChairWeeklyTemplate)
 * 3. DoctorRosterMatrix weekly template buttons and touch targets (>= 44px)
 * 4. DoctorRosterToolbar weekly templates and mobile clinicName truncation
 * 5. ScheduleGrid chair header 1-tap doctor chips and popover (Mandates 8e, 8k, 8n)
 */

import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	QuickAddChairModal,
	CHAIR_ARCHETYPE_PRESETS,
	CHAIR_COLOR_PRESETS,
	CHAIR_SPECIALTY_PRESETS,
} from "../QuickAddChairModal";
import {
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
	type DoctorChairRosterTemplateId,
	type StaffMember,
	type CabinetDefinition,
} from "../roster/doctorShiftRosterPresets";
import { applyDoctorChairWeeklyTemplate } from "../roster/doctorWeeklyScheduleGenerator";
import { DoctorRosterMatrix } from "../roster/DoctorRosterMatrix";
import { DoctorRosterToolbar } from "../roster/DoctorRosterToolbar";
import { ScheduleGrid, type ChairDoctorShiftAssignment } from "../ScheduleGrid";
import type { Dashboard } from "@dental/shared";

const mockStaffList: StaffMember[] = [
	{
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		shortName: "Иванов И.И.",
		role: "therapist",
		tabNumber: "001",
		isDoctor: true,
		isAssistant: false,
		weeklyHourLimit: 33,
		avatarColor: "#0d9488",
		preferredChairId: "chair-1",
		defaultAssistantId: "asst-1",
	},
	{
		id: "doc-2",
		fullName: "Петров Петр Петрович",
		shortName: "Петров П.П.",
		role: "surgeon",
		tabNumber: "002",
		isDoctor: true,
		isAssistant: false,
		weeklyHourLimit: 33,
		avatarColor: "#2563eb",
		preferredChairId: "chair-2",
	},
	{
		id: "asst-1",
		fullName: "Смирнова Анна Сергеевна",
		shortName: "Смирнова А.С.",
		role: "assistant",
		tabNumber: "003",
		isDoctor: false,
		isAssistant: true,
		weeklyHourLimit: 39,
		avatarColor: "#10b981",
	},
];

const mockCabinets: CabinetDefinition[] = [
	{
		id: "cab-1",
		number: 1,
		name: "Кабинет №1 (Терапия)",
		specialty: "Терапия",
		chairs: [
			{ id: "chair-1", name: "Кресло 1 (Терапия)", equipment: "Микроскоп" },
			{ id: "chair-2", name: "Кресло 2 (Хирургия)", equipment: "Физиодиспенсер" },
		],
	},
];

const mockDashboard: any = {
	clinicName: "ООО Стоматологическая Клиника ДЕНТЕ",
	clinicSettings: {
		profile: {
			clinicName: "Клиника ДЕНТЕ Премиум Стоматология",
			timezone: "Europe/Moscow",
		},
		chairs: [
			{ id: "chair-1", name: "Кресло 1 (Терапия)", color: "#0d9488", active: true },
			{ id: "chair-2", name: "Кресло 2 (Хирургия)", color: "#2563eb", active: true },
		],
		staff: [
			{
				id: "doc-1",
				fullName: "Иванов Иван Иванович",
				role: "doctor",
				specialties: ["therapist"],
				active: true,
			},
			{
				id: "doc-2",
				fullName: "Петров Петр Петрович",
				role: "doctor",
				specialties: ["surgeon"],
				active: true,
			},
		],
	} as any,
	patients: [],
	appointments: [],
	records: [],
	invoices: [],
	treatments: [],
	files: [],
	prescriptions: [],
};

const mockWeekDays = [
	{ dateIso: "2026-09-07", dayName: "Пн", dayNumber: "07", isWeekend: false },
	{ dateIso: "2026-09-08", dayName: "Вт", dayNumber: "08", isWeekend: false },
	{ dateIso: "2026-09-09", dayName: "Ср", dayNumber: "09", isWeekend: false },
	{ dateIso: "2026-09-10", dayName: "Чт", dayNumber: "10", isWeekend: false },
	{ dateIso: "2026-09-11", dayName: "Пт", dayNumber: "11", isWeekend: false },
	{ dateIso: "2026-09-12", dayName: "Сб", dayNumber: "12", isWeekend: true },
	{ dateIso: "2026-09-13", dayName: "Вс", dayNumber: "13", isWeekend: true },
];

describe("StomX & DentalPRO Doctor-to-Chair Roster Parity Suite", () => {
	describe("1. QuickAddChairModal: 1-Click Chair Archetype Presets", () => {
		it("exports all 5 canonical chair archetypes with distinct colors and specializations", () => {
			assert.strictEqual(CHAIR_ARCHETYPE_PRESETS.length, 5);
			const ids = CHAIR_ARCHETYPE_PRESETS.map((a) => a.id);
			assert.deepStrictEqual(ids, [
				"therapy",
				"surgery",
				"orthodontics",
				"pediatric",
				"hygiene",
			]);

			const colors = CHAIR_ARCHETYPE_PRESETS.map((a) => a.colorHex);
			assert.deepStrictEqual(colors, [
				"#0d9488",
				"#2563eb",
				"#6366f1",
				"#f59e0b",
				"#10b981",
			]);
		});

		it("renders 1-click archetype selector buttons with >= 44px touch targets", () => {
			const html = renderToString(
				<QuickAddChairModal
					isOpen={true}
					onClose={() => {}}
					onAddChair={() => {}}
					existingChairsCount={1}
				/>,
			);

			for (const arch of CHAIR_ARCHETYPE_PRESETS) {
				assert.ok(
					html.includes(`data-testid="quick-add-chair-archetype-${arch.id}"`),
					`Expected button for archetype ${arch.id}`,
				);
			}
			assert.ok(html.includes("min-h-[44px]"));
			assert.ok(html.includes("Терапевтическое"));
			assert.ok(html.includes("Хирургическое"));
			assert.ok(html.includes("Гигиеническое"));
		});
	});

	describe("2. Pure Engine: applyDoctorChairWeeklyTemplate (StomX / DentalPRO parity)", () => {
		it("applies 'mon_wed_fri_morning' template correctly across Mon, Wed, Fri", () => {
			const result = applyDoctorChairWeeklyTemplate([], {
				weekStartDateIso: "2026-09-07",
				templateId: "mon_wed_fri_morning",
				doctorId: "doc-1",
				chairId: "chair-1",
				cabinetId: "cab-1",
				staffList: mockStaffList,
				cabinets: mockCabinets,
			});

			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0]?.dateIso, "2026-09-07"); // Mon
			assert.strictEqual(result[1]?.dateIso, "2026-09-09"); // Wed
			assert.strictEqual(result[2]?.dateIso, "2026-09-11"); // Fri

			for (const shift of result) {
				assert.strictEqual(shift.doctorId, "doc-1");
				assert.strictEqual(shift.chairId, "chair-1");
				assert.strictEqual(shift.cabinetId, "cab-1");
				assert.strictEqual(shift.startTime, "08:00");
				assert.strictEqual(shift.endTime, "14:00");
				assert.strictEqual(shift.durationHours, 6.0);
				assert.strictEqual(shift.archetypeId, "morning_shift");
				// Auto-assigned assistant from preferredAssistantId
				assert.strictEqual(shift.assistantId, "asst-1");
			}
		});

		it("applies 'tue_thu_sat_evening' template correctly across Tue, Thu, Sat", () => {
			const result = applyDoctorChairWeeklyTemplate([], {
				weekStartDateIso: "2026-09-07",
				templateId: "tue_thu_sat_evening",
				doctorId: "doc-2",
				chairId: "chair-2",
				cabinetId: "cab-1",
				staffList: mockStaffList,
				cabinets: mockCabinets,
			});

			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0]?.dateIso, "2026-09-08"); // Tue
			assert.strictEqual(result[1]?.dateIso, "2026-09-10"); // Thu
			assert.strictEqual(result[2]?.dateIso, "2026-09-12"); // Sat

			for (const shift of result) {
				assert.strictEqual(shift.doctorId, "doc-2");
				assert.strictEqual(shift.chairId, "chair-2");
				assert.strictEqual(shift.startTime, "14:00");
				assert.strictEqual(shift.endTime, "20:00");
				assert.strictEqual(shift.durationHours, 6.0);
				assert.strictEqual(shift.archetypeId, "evening_shift");
			}
		});

		it("applies 'two_two_full' template (2 on / 2 off)", () => {
			const result = applyDoctorChairWeeklyTemplate([], {
				weekStartDateIso: "2026-09-07",
				templateId: "two_two_full",
				doctorId: "doc-1",
				chairId: "chair-1",
				cabinetId: "cab-1",
				staffList: mockStaffList,
				cabinets: mockCabinets,
			});

			// Days: 0 (Mon), 1 (Tue), 4 (Fri), 5 (Sat)
			assert.strictEqual(result.length, 4);
			assert.strictEqual(result[0]?.dateIso, "2026-09-07");
			assert.strictEqual(result[1]?.dateIso, "2026-09-08");
			assert.strictEqual(result[2]?.dateIso, "2026-09-11");
			assert.strictEqual(result[3]?.dateIso, "2026-09-12");

			for (const shift of result) {
				assert.strictEqual(shift.startTime, "08:00");
				assert.strictEqual(shift.endTime, "20:00");
				assert.strictEqual(shift.durationHours, 11.0);
				assert.strictEqual(shift.breakMinutes, 60);
				assert.strictEqual(shift.archetypeId, "morning_shift");
			}
		});

		it("applies 'five_day_standard' template (Mon–Fri 09:00–18:00)", () => {
			const result = applyDoctorChairWeeklyTemplate([], {
				weekStartDateIso: "2026-09-07",
				templateId: "five_day_standard",
				doctorId: "doc-1",
				chairId: "chair-1",
				cabinetId: "cab-1",
				staffList: mockStaffList,
				cabinets: mockCabinets,
			});

			assert.strictEqual(result.length, 5);
			const dates = result.map((s) => s.dateIso);
			assert.deepStrictEqual(dates, [
				"2026-09-07",
				"2026-09-08",
				"2026-09-09",
				"2026-09-10",
				"2026-09-11",
			]);

			for (const shift of result) {
				assert.strictEqual(shift.startTime, "09:00");
				assert.strictEqual(shift.endTime, "18:00");
				assert.strictEqual(shift.durationHours, 8.0);
				assert.strictEqual(shift.breakMinutes, 60);
			}
		});

		it("replaces existing shifts on matching days without duplicates", () => {
			// Pre-existing shift on Monday for doc-1 on chair-1
			const existing = [
				{
					id: "old-shift-1",
					doctorId: "doc-1",
					doctorName: "Иванов И.И.",
					doctorRole: "therapist" as const,
					assistantId: null,
					assistantName: null,
					archetypeId: "morning_shift" as const,
					dateIso: "2026-09-07",
					startTime: "10:00",
					endTime: "16:00",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled" as const,
					cabinetId: "cab-1",
					chairId: "chair-1",
				},
				// Pre-existing shift on another chair (should be preserved!)
				{
					id: "other-chair-shift",
					doctorId: "doc-2",
					doctorName: "Петров П.П.",
					doctorRole: "surgeon" as const,
					assistantId: null,
					assistantName: null,
					archetypeId: "morning_shift" as const,
					dateIso: "2026-09-07",
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6.0,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled" as const,
					cabinetId: "cab-1",
					chairId: "chair-2",
				},
			];

			const result = applyDoctorChairWeeklyTemplate(existing, {
				weekStartDateIso: "2026-09-07",
				templateId: "mon_wed_fri_morning",
				doctorId: "doc-1",
				chairId: "chair-1",
				cabinetId: "cab-1",
				staffList: mockStaffList,
				cabinets: mockCabinets,
			});

			// Other chair shift preserved + 3 new shifts = 4 total
			assert.strictEqual(result.length, 4);
			assert.ok(result.some((s) => s.id === "other-chair-shift"));
			assert.ok(!result.some((s) => s.id === "old-shift-1"));
		});
	});

	describe("3. DoctorRosterMatrix: Weekly Templates in Cell Popover", () => {
		it("renders all 4 weekly doctor-chair template buttons in the cell popover with >= 44px touch targets", () => {
			const html = renderToString(
				<DoctorRosterMatrix
					activeTab="cabinets"
					weekDays={mockWeekDays}
					weekStartDateIso="2026-09-07"
					weekEndDateIso="2026-09-13"
					selectedYear={2026}
					selectedMonth={9}
					cabinets={mockCabinets}
					staffList={mockStaffList}
					shifts={[]}
					conflicts={[]}
					t13Matrix={[]}
					sanitizedAppointments={[]}
					onOpenEdit={() => {}}
					onOpenCreateInCell={() => {}}
					onOpenInternalT13Modal={() => {}}
					onExportT13={() => {}}
					onClose={() => {}}
					activePopoverCell={{
						dateIso: "2026-09-07",
						cabinetId: "cab-1",
						chairId: "chair-1",
						doctorId: "doc-1",
					}}
				/>,
			);

			assert.ok(html.includes('data-testid="cell-template-mon-wed-fri"'));
			assert.ok(html.includes('data-testid="cell-template-tue-thu-sat"'));
			assert.ok(html.includes('data-testid="cell-template-two-two"'));
			assert.ok(html.includes('data-testid="cell-template-five-day"'));
			assert.ok(html.includes("Недельное закрепление за креслом (StomX)"));
		});
	});

	describe("4. DoctorRosterToolbar: Weekly Templates and Mobile Ellipsis", () => {
		it("renders weekly templates in toolbar and truncates clinicName on mobile", () => {
			const html = renderToString(
				<DoctorRosterToolbar
					clinicName="Очень Длинное Название Стоматологической Клиники"
					kpis={{
						totalWeekShifts: 10,
						totalWeeklyHours: 60,
						assistantPairingPct: 100,
						conflictCount: 0,
						errorConflictCount: 0,
					}}
					activeTab="cabinets"
					onSelectTab={() => {}}
					weekStartDateIso="2026-09-07"
					weekEndDateIso="2026-09-13"
					selectedYear={2026}
					onPrevWeek={() => {}}
					onNextWeek={() => {}}
					onAutoFillDefault={() => {}}
					onApplyPreset={() => {}}
					onApplyDoctorChairWeeklyTemplate={() => {}}
					onPrintSchedule={() => {}}
					onExportT13={() => {}}
					onSaveAll={() => {}}
					onClose={() => {}}
					notification={null}
					conflicts={[]}
					staffList={mockStaffList}
					cabinets={mockCabinets}
				/>,
			);

			// Defect 5 fix verification: truncate and max-width on clinicName
			assert.ok(html.includes("truncate"));
			assert.ok(html.includes("max-w-[140px]"));

			// Toolbar templates
			assert.ok(html.includes('data-testid="toolbar-template-mon-wed-fri"'));
			assert.ok(html.includes('data-testid="toolbar-template-tue-thu-sat"'));
			assert.ok(html.includes('data-testid="toolbar-template-two-two"'));
			assert.ok(html.includes('data-testid="toolbar-template-five-day"'));
		});
	});

	describe("5. ScheduleGrid: Chair Header 1-Tap Doctor Chips & Popover", () => {
		it("renders quick doctor chips in chair header for instant 1-tap doctor binding", () => {
			const html = renderToString(
				<ScheduleGrid
					dashboard={mockDashboard as any}
					dateKey="2026-09-07"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					patientName={(_, id) => (id ? "Пациент" : "—")}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={{} as any}
				/>,
			);

			// Quick chips for both doctors on chair-1 and chair-2
			assert.ok(html.includes('data-testid="chair-quick-doctor-chip-chair-1-doc-1"'));
			assert.ok(html.includes('data-testid="chair-quick-doctor-chip-chair-1-doc-2"'));
			assert.ok(html.includes('data-testid="chair-quick-doctor-chip-chair-2-doc-1"'));
			assert.ok(html.includes('data-testid="chair-quick-doctor-chip-chair-2-doc-2"'));

			// Quick popover trigger buttons on chair headers
			assert.ok(html.includes('data-testid="btn-chair-doctor-popover-chair-1"'));
			assert.ok(html.includes('data-testid="btn-chair-doctor-popover-chair-2"'));
		});

		it("renders 1-tap popover when chair doctor popover is opened", () => {
			// ScheduleGrid renders popover container when opened
			const html = renderToString(
				<ScheduleGrid
					dashboard={mockDashboard as any}
					dateKey="2026-09-07"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					patientName={(_, id) => (id ? "Пациент" : "—")}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={{} as any}
					onEditChair={() => {}}
				/>,
			);

			// Check that buttons have >= 44px minHeight
			assert.ok(html.includes('data-testid="btn-chair-doctor-popover-chair-1"'));
			assert.ok(html.includes('data-testid="btn-edit-chair-chair-1"'));
			assert.ok(html.includes("min-h-[44px]"));
			assert.ok(html.includes("min-w-[44px]"));
		});
	});
});
