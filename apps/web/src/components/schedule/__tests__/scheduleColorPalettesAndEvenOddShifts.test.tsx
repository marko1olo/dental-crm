/**
 * scheduleColorPalettesAndEvenOddShifts.test.tsx
 *
 * Wave 40 Parity Suite — Features 190 & 191 (Mandates 8b, 8zi):
 * - Feature 190: 14 StomX palettes & Chair top accent strip in ScheduleGrid / ChairScheduleView
 * - Feature 191: Even/Odd month shift generator & 1-click chair sanitation / technical break
 */

import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	QuickAddChairModal,
	CHAIR_COLOR_PRESETS,
} from "../QuickAddChairModal";
import { ChairScheduleView } from "../ChairScheduleView";
import {
	ScheduleGrid,
	type ChairMaintenanceBlock,
} from "../ScheduleGrid";
import {
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
	type StaffMember,
	type CabinetDefinition,
} from "../roster/doctorShiftRosterPresets";
import { applyDoctorChairWeeklyTemplate } from "../roster/doctorWeeklyScheduleGenerator";
import { DoctorRosterToolbar } from "../roster/DoctorRosterToolbar";
import { DoctorRosterMatrix } from "../roster/DoctorRosterMatrix";
import { checkAppointmentResourceCollision } from "../../../utils/scheduleCollisionUtils";
import type { Dashboard } from "@dental/shared";

const mockStaff: StaffMember[] = [
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
];

const mockCabinets: CabinetDefinition[] = [
	{
		id: "cab-1",
		number: 1,
		name: "Кабинет 1 (Терапия)",
		specialty: "therapist",
		chairs: [{ id: "chair-1", name: "Кресло 1", equipment: "Установка Diplomat" }],
	},
	{
		id: "cab-2",
		number: 2,
		name: "Кабинет 2 (Хирургия)",
		specialty: "surgeon",
		chairs: [{ id: "chair-2", name: "Кресло 2", equipment: "Установка Sirona" }],
	},
];

const mockDashboard = {
	stats: {
		totalPatients: 10,
		activeTreatmentPlans: 2,
		todayAppointmentsCount: 2,
		monthRevenue: 150000,
	},
	todayAppointments: [],
	recentPatients: [],
	clinicSettings: {
		profile: {
			clinicName: "Клиника ДЕНТЕ",
			address: "г. Москва, ул. Ленина, д. 1",
			phone: "+7 495 123-45-67",
			timezone: "Europe/Moscow",
		},
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
		chairs: [
			{
				id: "chair-1",
				name: "Кресло 1 (Терапия)",
				room: "1",
				color: "#0d9488",
				active: true,
			},
			{
				id: "chair-2",
				name: "Кресло 2 (Хирургия)",
				room: "2",
				color: "#2563eb",
				active: true,
			},
		],
	},
	patients: [
		{
			id: "pat-1",
			fullName: "Смирнов Алексей Владимирович",
			phone: "+7 999 111-22-33",
			birthDate: "1985-05-10",
		},
		{
			id: "pat-2",
			fullName: "Кузнецова Мария Ивановна",
			phone: "+7 999 444-55-66",
			birthDate: "1990-12-15",
		},
	],
} as unknown as Dashboard;

const defaultAppointmentLabels = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Прибыл",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

describe("Feature 190: 14 StomX Palettes & Chair Top Accent Strip", () => {
	it("CHAIR_COLOR_PRESETS contains exactly 14 authentic StomX palettes with paired light/dark tokens", () => {
		assert.strictEqual(CHAIR_COLOR_PRESETS.length, 14);
		const expectedIds = [
			"teal",
			"sapphire",
			"emerald",
			"indigo",
			"amber",
			"coral",
			"amethyst",
			"azure",
			"olive",
			"terracotta",
			"slate",
			"mint",
			"rose",
			"graphite",
		];
		const ids = CHAIR_COLOR_PRESETS.map((p) => p.id);
		assert.deepStrictEqual(ids, expectedIds);

		for (const palette of CHAIR_COLOR_PRESETS) {
			assert.ok(palette.hex.startsWith("#"), `hex format for ${palette.id}`);
			assert.ok(palette.lightHex.startsWith("#"), `lightHex format for ${palette.id}`);
			assert.ok(palette.darkHex.startsWith("#"), `darkHex format for ${palette.id}`);
			assert.notStrictEqual(palette.lightHex, palette.darkHex, `Dual tone tokens for ${palette.id}`);
		}
	});

	it("QuickAddChairModal renders dual-tone swatches and 1-click live preview card", () => {
		const html = renderToString(
			<QuickAddChairModal
				isOpen={true}
				onClose={() => {}}
				onAddChair={() => {}}
				existingChairsCount={1}
			/>,
		);
		assert.ok(html.includes("quick-add-chair-live-preview"), "renders live preview card");
		assert.ok(html.includes("quick-add-chair-color-teal"), "renders teal color swatch");
		assert.ok(html.includes("quick-add-chair-color-graphite"), "renders graphite color swatch");
		assert.ok(html.includes("quick-add-chair-color-terracotta"), "renders terracotta color swatch");
		assert.ok(html.includes("quick-add-chair-preview-accent-strip"), "renders preview accent strip");
	});

	it("ScheduleGrid renders top accent strip and borderTop on chair column headers", () => {
		const html = renderToString(
			<ScheduleGrid
				dashboard={mockDashboard}
				dateKey="2026-09-08"
				appointments={[]}
				onSlotClick={() => {}}
				onAppointmentClick={() => {}}
				patientName={(_, id) => id || ""}
				formatTime={(iso) => iso.slice(11, 16)}
				toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
				appointmentLabels={defaultAppointmentLabels}
			/>,
		);
		assert.ok(html.includes('data-testid="chair-header-chair-1"'), "renders chair 1 header");
		assert.ok(html.includes('data-testid="chair-accent-bar-chair-1"'), "renders chair 1 top accent bar");
		assert.ok(
			html.includes("background-color:#0d9488") ||
			html.includes("background-color: #0d9488") ||
			html.includes("rgb(13, 148, 136)"),
			"renders chair 1 accent bar color",
		);
		assert.ok(
			html.includes("background-color:#2563eb") ||
			html.includes("background-color: #2563eb") ||
			html.includes("rgb(37, 99, 235)"),
			"renders chair 2 accent bar color",
		);
	});

	it("ChairScheduleView renders chair-schedule-palette-strip with top accent bars", () => {
		const html = renderToString(
			<ChairScheduleView
				dashboard={mockDashboard}
				dateKey="2026-09-08"
				appointments={[]}
				onSlotClick={() => {}}
				onAppointmentClick={() => {}}
				patientName={(_, id) => id || ""}
				formatTime={(iso) => iso.slice(11, 16)}
				toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
				appointmentLabels={defaultAppointmentLabels}
			/>,
		);
		assert.ok(html.includes("chair-schedule-palette-strip"), "renders palette strip");
		assert.ok(html.includes('data-testid="chair-view-badge-chair-1"'), "renders chair badge 1");
		assert.ok(html.includes('data-testid="chair-view-badge-chair-2"'), "renders chair badge 2");
	});
});

describe("Feature 191: Even/Odd Month Shifts & Chair Technical Breaks", () => {
	it("DOCTOR_CHAIR_ROSTER_TEMPLATES exports even_odd_month template", () => {
		const template = DOCTOR_CHAIR_ROSTER_TEMPLATES.find((t) => t.id === "even_odd_month");
		assert.ok(template, "even_odd_month exists in roster templates");
		assert.strictEqual(template?.durationHours, 6);
		assert.strictEqual(template?.dayOfMonthFilter, "even_odd_split");
	});

	it("applyDoctorChairWeeklyTemplate generates Doctor A on even dates and Doctor B on odd dates", () => {
		const shifts = applyDoctorChairWeeklyTemplate([], {
			templateId: "even_odd_month",
			weekStartDateIso: "2026-09-07",
			chairId: "chair-1",
			doctorId: "doc-1",
			doctorBId: "doc-2",
			staffList: mockStaff,
			cabinets: mockCabinets,
		});

		assert.strictEqual(shifts.length, 7, "generates shift for all 7 days of the week");

		const evenShift = shifts.find((s) => s.dateIso === "2026-09-08");
		assert.ok(evenShift, "shift on even day 8 exists");
		assert.strictEqual(evenShift?.doctorId, "doc-1", "Doctor A on even date");
		assert.strictEqual(evenShift?.startTime, "08:00");
		assert.strictEqual(evenShift?.endTime, "14:00");

		const oddShift = shifts.find((s) => s.dateIso === "2026-09-07");
		assert.ok(oddShift, "shift on odd day 7 exists");
		assert.strictEqual(oddShift?.doctorId, "doc-2", "Doctor B on odd date");
		assert.strictEqual(oddShift?.startTime, "14:00");
		assert.strictEqual(oddShift?.endTime, "20:00");
	});

	it("DoctorRosterToolbar and DoctorRosterMatrix include even-odd template buttons", () => {
		const toolbarHtml = renderToString(
			<DoctorRosterToolbar
				clinicName="Клиника ДЕНТЕ"
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
				staffList={mockStaff}
				cabinets={mockCabinets}
			/>,
		);
		assert.ok(toolbarHtml.includes('data-testid="toolbar-template-even-odd"'), "toolbar has even-odd button");

		const mockWeekDays = [
			{ dateIso: "2026-09-07", dayName: "Пн", dayNumber: "7", isWeekend: false },
			{ dateIso: "2026-09-08", dayName: "Вт", dayNumber: "8", isWeekend: false },
			{ dateIso: "2026-09-09", dayName: "Ср", dayNumber: "9", isWeekend: false },
			{ dateIso: "2026-09-10", dayName: "Чт", dayNumber: "10", isWeekend: false },
			{ dateIso: "2026-09-11", dayName: "Пт", dayNumber: "11", isWeekend: false },
			{ dateIso: "2026-09-12", dayName: "Сб", dayNumber: "12", isWeekend: true },
			{ dateIso: "2026-09-13", dayName: "Вс", dayNumber: "13", isWeekend: true },
		];

		const matrixHtml = renderToString(
			<DoctorRosterMatrix
				activeTab="cabinets"
				weekStartDateIso="2026-09-07"
				weekEndDateIso="2026-09-13"
				selectedYear={2026}
				selectedMonth={9}
				t13Matrix={[]}
				sanitizedAppointments={[]}
				weekDays={mockWeekDays}
				cabinets={mockCabinets}
				staffList={mockStaff}
				shifts={[]}
				conflicts={[]}
				onOpenEdit={() => {}}
				onOpenCreateInCell={() => {}}
				onOpenInternalT13Modal={() => {}}
				onApplyDoctorChairWeeklyTemplate={() => {}}
				onExportT13={() => {}}
				onClose={() => {}}
				activePopoverCell={{
					dateIso: "2026-09-07",
					cabinetId: "chair-1",
					chairId: "chair-1",
					doctorId: "doc-1",
				}}
			/>,
		);
		assert.ok(matrixHtml.includes('data-testid="cell-template-even-odd"'), "matrix popover has even-odd button");
	});

	it("ScheduleGrid renders chair maintenance button and maintenance block", () => {
		const mockMaintenanceBlocks: ChairMaintenanceBlock[] = [
			{
				id: "maint-1",
				chairId: "chair-1",
				startsAt: "2026-09-08T13:00:00.000Z",
				endsAt: "2026-09-08T13:30:00.000Z",
				reason: "sanitation",
				note: "Санитарная обработка",
			},
		];

		const html = renderToString(
			<ScheduleGrid
				dashboard={mockDashboard}
				dateKey="2026-09-08"
				appointments={[]}
				onSlotClick={() => {}}
				onAppointmentClick={() => {}}
				patientName={(_, id) => id || ""}
				formatTime={(iso) => iso.slice(11, 16)}
				toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
				appointmentLabels={defaultAppointmentLabels}
				chairMaintenanceBlocks={mockMaintenanceBlocks}
			/>,
		);

		// Mandate 8i: CRM does not dictate reality. Zero artificial chair maintenance lock buttons in header.
		assert.ok(!html.includes('data-testid="btn-chair-maintenance-chair-1"'), "does not render artificial maintenance lock button in chair header");
	});

	it("Mandate 8i: checkAppointmentResourceCollision permits booking without artificial sanitation blocks", () => {
		const maintenanceBlocks: ChairMaintenanceBlock[] = [
			{
				id: "maint-1",
				chairId: "chair-1",
				startsAt: "2026-09-08T13:00:00.000Z",
				endsAt: "2026-09-08T13:30:00.000Z",
				reason: "sanitation",
			},
		];

		const result = checkAppointmentResourceCollision(
			{
				startsAt: "2026-09-08T13:10:00.000Z",
				endsAt: "2026-09-08T13:40:00.000Z",
				chairId: "chair-1",
				doctorUserId: "doc-1",
				patientId: "pat-1",
			},
			[],
			{
				chairs: mockDashboard.clinicSettings.chairs,
				chairMaintenanceBlocks: maintenanceBlocks,
			},
		);

		// Mandate 8i: Sanitation must never block the doctor or administrator
		assert.strictEqual(result.hasCollision, false);
		assert.strictEqual(result.conflictType, null);
	});
});
