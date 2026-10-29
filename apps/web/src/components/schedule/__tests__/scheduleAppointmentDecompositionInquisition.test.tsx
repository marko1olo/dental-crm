import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Appointment } from "@dental/shared";
import { GridAppointmentCard } from "../GridAppointmentCard";
import {
	APPOINTMENT_STATUS_LABELS_RU,
	areGridAppointmentCardPropsEqual,
} from "../appointmentCardModules/appointmentCardTypes";
import { AppointmentStatusMarker } from "../appointmentCardModules/AppointmentStatusMarker";
import { AppointmentPatientSummary } from "../appointmentCardModules/AppointmentPatientSummary";
import { AppointmentProcedureBadge } from "../appointmentCardModules/AppointmentProcedureBadge";
import { AppointmentQuickActionsMenu } from "../appointmentCardModules/AppointmentQuickActionsMenu";
import { useAppointmentCardDrag } from "../useAppointmentCardDrag";

const mockAppointment: Appointment = {
	id: "appt-test-101",
	organizationId: "org-1",
	patientId: "pat-1",
	doctorUserId: "doc-1",
	chairId: "chair-1",
	status: "planned",
	startsAt: "2026-10-15T09:00:00.000Z",
	endsAt: "2026-10-15T09:45:00.000Z",
	reason: "Лечение кариеса 36 зуба",
	comment: "Пациент с острой болью",
};

const mockDashboard: any = {
	clinicSettings: {
		staff: [
			{ id: "doc-1", fullName: "Иванов Иван Иванович", role: "doctor", specialties: ["therapist"] },
		],
		chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
		profile: { timezone: "Europe/Moscow" },
	},
	patients: [
		{ id: "pat-1", fullName: "Сидоров Алексей Петрович", phone: "+7 (999) 111-22-33", allergies: "Пенициллин" },
	],
	appointments: [mockAppointment],
};

const mockLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтверждён",
	arrived: "В холле",
	in_treatment: "В кресле",
	completed: "Ожидает оплаты",
	cancelled: "Отменён",
	no_show: "Не явился",
};

describe("Red Team Schedule Appointment Card Decomposed Architecture (Mandates 8c, 8e, 8n)", () => {
	it("1. Statuses dictionary correctly defines Russian clinical medical terminology", () => {
		assert.equal(APPOINTMENT_STATUS_LABELS_RU.planned, "Запланирован");
		assert.equal(APPOINTMENT_STATUS_LABELS_RU.confirmed, "Подтверждён");
		assert.equal(APPOINTMENT_STATUS_LABELS_RU.arrived, "В холле");
		assert.equal(APPOINTMENT_STATUS_LABELS_RU.in_treatment, "В кресле");
		assert.equal(APPOINTMENT_STATUS_LABELS_RU.completed, "Завершён");
		assert.equal(APPOINTMENT_STATUS_LABELS_RU.cancelled, "Отменён");
		assert.equal(APPOINTMENT_STATUS_LABELS_RU.no_show, "Не явился");
	});

	it("2. AppointmentStatusMarker renders compact color status marker with touch safety", () => {
		const html = renderToStaticMarkup(
			<AppointmentStatusMarker
				appointment={mockAppointment}
				appointmentLabels={mockLabels}
				isStatusPickerOpen={false}
				pName="Сидоров Алексей Петрович"
				onToggleStatusPicker={() => {}}
				onCloseStatusPicker={() => {}}
			/>,
		);

		assert.ok(html.includes("data-testid=\"appointment-card-status-badge-appt-test-101\""));
		assert.ok(html.includes("Запланирован"));
		// Touch target safety classes
		assert.ok(html.includes("touch-manipulation"));
	});

	it("3. AppointmentPatientSummary renders patient FIO, time and allergy alert without overlaps", () => {
		const html = renderToStaticMarkup(
			<AppointmentPatientSummary
				appointment={mockAppointment}
				pName="Сидоров Алексей Петрович"
				aStart="09:00"
				aEnd="09:45"
				isCito={true}
				durationMin={45}
				patientAgeLabel="34 года"
				patObj={mockDashboard.patients[0]}
			/>,
		);

		assert.ok(html.includes("09:00"));
		assert.ok(html.includes("Сидоров Алексей П."));
		assert.ok(html.includes("СРОЧНО"));
		assert.ok(html.includes("appointment-cito-overbooking-badge"));
		assert.ok(html.includes("Аллергия"));
	});

	it("4. AppointmentProcedureBadge renders teeth list, procedure label, and doctor specialty badge", () => {
		const html = renderToStaticMarkup(
			<AppointmentProcedureBadge
				appointment={mockAppointment}
				procedureLabel="Лечение кариеса 36 зуба"
				teethList={["36"]}
				docTheme={{
					specialtyKey: "therapist",
					cardBgClass: "bg-indigo-500/10",
					borderClass: "border-indigo-500/30",
					textClass: "text-indigo-900",
					badgeClass: "bg-indigo-500/15 text-indigo-800",
					label: "Терапия",
				}}
				durationMin={45}
			/>,
		);

		assert.ok(html.includes("Лечение кариеса 36 зуба"));
		assert.ok(html.includes("Зуб 36"));
		assert.ok(html.includes("Терапия"));
		assert.ok(html.includes("card-specialty-badge-appt-test-101"));
	});

	it("5. AppointmentQuickActionsMenu renders 1-click stage transitions and contextual actions", () => {
		const htmlHeader = renderToStaticMarkup(
			<AppointmentQuickActionsMenu
				variant="header"
				appointment={mockAppointment}
				pName="Сидоров Алексей Петрович"
				patObj={mockDashboard.patients[0]}
				docObj={mockDashboard.clinicSettings.staff[0]}
				effectiveChairs={mockDashboard.clinicSettings.chairs}
				doctors={mockDashboard.clinicSettings.staff}
				dashboard={mockDashboard}
				isHovered={false}
				isMenuOpen={false}
				onAppointmentClick={() => {}}
				onToggleMenu={() => {}}
				onCloseMenu={() => {}}
				onAdjustDuration={() => {}}
				onShiftLateness={() => {}}
				onReassignChair={() => {}}
				onReassignDoctor={() => {}}
				onFreeSlotToWaitlist={() => {}}
				onQuickStatusChange={() => {}}
			/>,
		);

		assert.ok(htmlHeader.includes("appointment-action-more"));

		const htmlFooter = renderToStaticMarkup(
			<AppointmentQuickActionsMenu
				variant="footer"
				appointment={mockAppointment}
				pName="Сидоров Алексей Петрович"
				patObj={mockDashboard.patients[0]}
				docObj={mockDashboard.clinicSettings.staff[0]}
				effectiveChairs={mockDashboard.clinicSettings.chairs}
				doctors={mockDashboard.clinicSettings.staff}
				dashboard={mockDashboard}
				isHovered={false}
				isMenuOpen={false}
				onAppointmentClick={() => {}}
				onToggleMenu={() => {}}
				onCloseMenu={() => {}}
				onAdjustDuration={() => {}}
				onShiftLateness={() => {}}
				onReassignChair={() => {}}
				onReassignDoctor={() => {}}
				onFreeSlotToWaitlist={() => {}}
			/>,
		);

		assert.ok(htmlFooter.includes("appointment-card-footer-appt-test-101"));
		assert.ok(htmlFooter.includes("appointment-action-start-appt-test-101"));
		assert.ok(htmlFooter.includes("В приём →"));
	});

	it("6. Completed appointment switches footer action to 1-click Checkout [К оплате 💳]", () => {
		const completedAppt = { ...mockAppointment, status: "completed" as const };
		const htmlFooter = renderToStaticMarkup(
			<AppointmentQuickActionsMenu
				variant="footer"
				appointment={completedAppt}
				pName="Сидоров Алексей Петрович"
				patObj={mockDashboard.patients[0]}
				docObj={mockDashboard.clinicSettings.staff[0]}
				effectiveChairs={mockDashboard.clinicSettings.chairs}
				doctors={mockDashboard.clinicSettings.staff}
				dashboard={mockDashboard}
				isHovered={false}
				isMenuOpen={false}
				onAppointmentClick={() => {}}
				onToggleMenu={() => {}}
				onCloseMenu={() => {}}
				onAdjustDuration={() => {}}
				onShiftLateness={() => {}}
				onReassignChair={() => {}}
				onReassignDoctor={() => {}}
				onFreeSlotToWaitlist={() => {}}
			/>,
		);

		assert.ok(htmlFooter.includes("appointment-action-pay-appt-test-101"));
		assert.ok(htmlFooter.includes("К оплате"));
	});

	it("7. GridAppointmentCard facade renders monolithic progressive card with CLS=0 layout containment", () => {
		const html = renderToStaticMarkup(
			<GridAppointmentCard
				appointment={mockAppointment}
				chair={{ id: "chair-1", name: "Кабинет 1" }}
				effectiveChairs={mockDashboard.clinicSettings.chairs}
				doctors={mockDashboard.clinicSettings.staff}
				patientLookupMap={new Map([["pat-1", mockDashboard.patients[0]]])}
				staffLookupMap={new Map([["doc-1", mockDashboard.clinicSettings.staff[0]]])}
				collisionMap={new Map()}
				dashboard={mockDashboard}
				timezone="Europe/Moscow"
				toDateTimeLocalValue={(iso) => iso.replace("Z", "")}
				appointmentLabels={mockLabels}
				isHovered={false}
				isStatusPickerOpen={false}
				isMenuOpen={false}
				isNearBottom={false}
				isNearRightEdge={false}
				onAppointmentClick={() => {}}
				onSelectMobileAppt={() => {}}
				onAdjustDuration={() => {}}
				onShiftLateness={() => {}}
				onReassignChair={() => {}}
				onReassignDoctor={() => {}}
				onFreeSlotToWaitlist={() => {}}
				onMouseEnter={() => {}}
				onMouseLeave={() => {}}
				onKeepHovered={() => {}}
				onToggleStatusPicker={() => {}}
				onToggleMenu={() => {}}
				onCloseStatusPicker={() => {}}
				onCloseMenu={() => {}}
			/>,
		);

		assert.ok(html.includes("contain-intrinsic-size"));
		assert.ok(html.includes("content-visibility:auto"));
		assert.ok(html.includes("data-testid=\"appointment-card-appt-test-101\""));
		assert.ok(html.includes("Запланирован"));
		assert.ok(html.includes("Лечение кариеса 36 зуба"));
	});

	it("8. areGridAppointmentCardPropsEqual prevents unnecessary re-renders for 60 FPS", () => {
		const baseProps: any = {
			appointment: mockAppointment,
			isHovered: false,
			isStatusPickerOpen: false,
			isMenuOpen: false,
			isNearBottom: false,
			isNearRightEdge: false,
			chair: { id: "chair-1", name: "Кабинет 1" },
			effectiveChairs: mockDashboard.clinicSettings.chairs,
			doctors: mockDashboard.clinicSettings.staff,
			patientLookupMap: new Map(),
			staffLookupMap: new Map(),
			collisionMap: new Map(),
			appointmentLabels: mockLabels,
			timezone: "Europe/Moscow",
			dashboard: mockDashboard,
			densityMode: "informative",
		};

		assert.equal(areGridAppointmentCardPropsEqual(baseProps, { ...baseProps }), true);
		assert.equal(areGridAppointmentCardPropsEqual(baseProps, { ...baseProps, isHovered: true }), false);
		assert.equal(
			areGridAppointmentCardPropsEqual(baseProps, {
				...baseProps,
				appointment: { ...mockAppointment, status: "in_treatment" },
			}),
			false,
		);
	});
});
