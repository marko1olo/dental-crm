/**
 * doctorChairScheduleDecomposed.test.tsx
 *
 * Unit and integration tests for the decomposed DoctorChairScheduleModal and subcomponents:
 * - Gate 2: AST Export Parity
 * - Gate 3: Test Anchors Parity
 * - Mandate 8e: Non-blocking doctor assignment, 0 disabled buttons
 * - Mandate 8n: Solo doctor quick anchor
 * - Anti-Matryoshka Sin 6: Inline doctor adding without nested dialogs
 */

import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DoctorChairScheduleModal } from "../DoctorChairScheduleModal";
import {
	DoctorChairScheduleHeader,
	DoctorChairShiftSelector,
	DoctorChairScheduleGrid,
	DoctorChairFooterActions,
} from "../doctorChairSchedule";
import type { ChairModalChairItem, ChairModalDoctorItem } from "../doctorChairSchedule/types";

const mockChair: ChairModalChairItem = {
	id: "chair-alpha",
	name: "Установка 1 (Кабинет 101)",
	roomNumber: "101",
};

const mockDoctors: ChairModalDoctorItem[] = [
	{
		id: "doc-1",
		fullName: "Смирнов Алексей Владимирович",
		name: "Смирнов А.В.",
		shortName: "Смирнов А.В.",
		role: "Терапевт",
	},
	{
		id: "doc-2",
		fullName: "Ковалева Елена Сергеевна",
		name: "Ковалева Е.С.",
		shortName: "Ковалева Е.С.",
		role: "Ортопед",
	},
];

describe("DoctorChairScheduleModal Decomposed Suite", () => {
	it("renders DoctorChairScheduleModal with all primary test anchors and clinical typography", () => {
		const html = renderToString(
			<DoctorChairScheduleModal
				isOpen={true}
				onClose={() => {}}
				chair={mockChair}
				doctors={mockDoctors}
				dateKey="2026-10-12"
				onAssign={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="chair-doctor-assignment-modal"'), "Modal container must exist");
		assert.ok(html.includes('id="chair-doctor-modal-title"'), "Title anchor must exist");
		assert.ok(html.includes("Закрепление врача за установкой"), "Russian title must render");
		assert.ok(html.includes('data-testid="btn-close-chair-doctor-modal"'), "Close button anchor must exist");
		assert.ok(html.includes('data-testid="tab-schedule-day"'), "Day tab must exist");
		assert.ok(html.includes('data-testid="tab-schedule-range"'), "Range tab must exist");
		assert.ok(html.includes('data-testid="chair-shift-visual-timeline"'), "Visual timeline must exist");
		assert.ok(html.includes('data-testid="shift-preset-morning"'), "Morning preset anchor must exist");
		assert.ok(html.includes('data-testid="shift-preset-two_shifts"'), "Two shifts preset anchor must exist");
		assert.ok(html.includes('data-testid="select-chair-doctor"'), "Doctor select must exist");
		assert.ok(html.includes('data-testid="btn-confirm-chair-doctor"'), "Confirm button anchor must exist");
		assert.ok(html.includes("Закрепить за креслом"), "Confirm button label must render");
	});

	it("renders solo doctor quick anchor card when isSoloDoctor=true (Mandate 8n)", () => {
		const html = renderToString(
			<DoctorChairScheduleModal
				isOpen={true}
				onClose={() => {}}
				chair={mockChair}
				doctors={mockDoctors}
				dateKey="2026-10-12"
				onAssign={() => {}}
				isSoloDoctor={true}
			/>,
		);

		assert.ok(html.includes('data-testid="solo-doctor-quick-anchor-card"'), "Solo anchor card must render");
		assert.ok(html.includes('data-testid="btn-solo-doctor-quick-anchor"'), "Solo anchor button must render");
		assert.ok(html.includes("Закрепить меня"), "Solo anchor button label must render");
	});

	it("renders unassign button when currentAssignment exists", () => {
		const html = renderToString(
			<DoctorChairScheduleModal
				isOpen={true}
				onClose={() => {}}
				chair={mockChair}
				doctors={mockDoctors}
				dateKey="2026-10-12"
				currentAssignment={{
					chairId: mockChair.id,
					chairName: mockChair.name,
					doctorId: mockDoctors[0]!.id,
					doctorName: mockDoctors[0]!.fullName,
					shiftPreset: "morning",
					shiftLabel: "Утренняя смена",
					shiftHours: "08:00–14:00",
					startHour: 8,
					endHour: 14,
				}}
				onAssign={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="btn-unassign-chair-doctor"'), "Unassign button must render");
		assert.ok(html.includes("Снять назначение"), "Unassign label must render");
	});

	it("renders multi-shift selection for two_shifts preset", () => {
		const html = renderToString(
			<DoctorChairShiftSelector
				selectedShiftPreset="two_shifts"
				onSelectShiftPreset={() => {}}
				doctors={mockDoctors}
				selectedDoctorId="doc-1"
				onSelectDoctorId={() => {}}
				selectedEveningDoctorId="doc-2"
				onSelectEveningDoctorId={() => {}}
				isInlineDoctorFormOpen={false}
				onToggleInlineDoctorForm={() => {}}
				newDocName=""
				onChangeNewDocName={() => {}}
				newDocSpecialty="therapist"
				onChangeNewDocSpecialty={() => {}}
				onSubmitInlineDoctor={async () => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="select-chair-doctor"'), "Morning doctor select must exist");
		assert.ok(html.includes('data-testid="select-chair-evening-doctor"'), "Evening doctor select must exist");
		assert.ok(html.includes('data-testid="doctor-quick-switch-pills"'), "Morning pills must exist");
		assert.ok(html.includes('data-testid="evening-doctor-quick-switch-pills"'), "Evening pills must exist");
	});

	it("renders inline doctor add form when open (Anti-Matryoshka Sin 6)", () => {
		const html = renderToString(
			<DoctorChairShiftSelector
				selectedShiftPreset="morning"
				onSelectShiftPreset={() => {}}
				doctors={mockDoctors}
				selectedDoctorId="doc-1"
				onSelectDoctorId={() => {}}
				selectedEveningDoctorId="doc-2"
				onSelectEveningDoctorId={() => {}}
				isInlineDoctorFormOpen={true}
				onToggleInlineDoctorForm={() => {}}
				newDocName=""
				onChangeNewDocName={() => {}}
				newDocSpecialty="therapist"
				onChangeNewDocSpecialty={() => {}}
				onSubmitInlineDoctor={async () => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="inline-quick-add-doctor-form"'), "Inline doctor form must render");
		assert.ok(html.includes('data-testid="inline-doctor-fullname-input"'), "Inline fullname input must render");
		assert.ok(html.includes('data-testid="inline-doctor-submit-btn"'), "Inline submit button must render");
	});

	it("renders visual timeline and range presets in DoctorChairScheduleGrid", () => {
		const htmlDay = renderToString(
			<DoctorChairScheduleGrid
				activeTab="day"
				onSelectTab={() => {}}
				selectedShiftPreset="morning"
				rangeStartDate="2026-10-12"
				onChangeRangeStartDate={() => {}}
				rangeEndDate="2026-10-18"
				onChangeRangeEndDate={() => {}}
				rangeRotationPreset="five_day"
				onSelectRangeRotationPreset={() => {}}
			/>,
		);

		assert.ok(htmlDay.includes('data-testid="chair-shift-visual-timeline"'), "Timeline must render in day mode");
		assert.ok(htmlDay.includes("08:00–14:00"), "Hours must render");

		const htmlRange = renderToString(
			<DoctorChairScheduleGrid
				activeTab="range"
				onSelectTab={() => {}}
				selectedShiftPreset="morning"
				rangeStartDate="2026-10-12"
				onChangeRangeStartDate={() => {}}
				rangeEndDate="2026-10-18"
				onChangeRangeEndDate={() => {}}
				rangeRotationPreset="five_day"
				onSelectRangeRotationPreset={() => {}}
			/>,
		);

		assert.ok(htmlRange.includes("Пятидневка Пн–Пт"), "Rotation preset must render in range mode");
		assert.ok(htmlRange.includes("График 2/2"), "2/2 preset must render");
	});

	it("renders footer actions with min-h-[44px] touch target (Mandate 8d)", () => {
		const html = renderToString(
			<DoctorChairFooterActions
				hasActiveAssignment={true}
				onUnassign={() => {}}
				onClose={() => {}}
				onConfirm={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="btn-unassign-chair-doctor"'), "Unassign button exists");
		assert.ok(html.includes('data-testid="btn-confirm-chair-doctor"'), "Confirm button exists");
		assert.ok(html.includes("min-h-[44px]"), "Touch target standard 44px preserved");
	});
});
