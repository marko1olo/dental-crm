import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	APPOINTMENT_REFUSAL_REASONS_CATALOG,
	DEFAULT_WORKPLACE_CHAIR_PALETTE,
	getWorkplaceChairPalette,
	WORKPLACE_CHAIR_PALETTES,
	WORKPLACE_CHAIR_PALETTES_MAP,
	type Appointment,
	type Dashboard,
} from "@dental/shared";
import { ScheduleChairHeader } from "../grid/ScheduleChairHeader";
import { AppointmentRefusalBanner } from "../appointmentPaymentBadges/AppointmentRefusalBanner";
import { formatPatientDisplayFio } from "../AppointmentCard";
import { CashRegisterStudioModal } from "../../cashbox/CashRegisterStudioModal";

describe("Wave 115 Schedule Parity: Chair Palettes, Refusal Chips & Unified Cashbox SSOT", () => {
	it("1. Workplace chair palettes expose all 5 canonical hues & numeric wrap-around lookup", () => {
		assert.ok(Array.isArray(WORKPLACE_CHAIR_PALETTES));
		assert.strictEqual(WORKPLACE_CHAIR_PALETTES.length, 5);
		assert.deepStrictEqual(
			WORKPLACE_CHAIR_PALETTES.map((p) => p.nameRu),
			["Лаванда", "Синий", "Роза", "Олива", "Песок"],
		);
		assert.strictEqual(WORKPLACE_CHAIR_PALETTES_MAP.lavender.nameRu, "Лаванда");
		assert.strictEqual(getWorkplaceChairPalette("blue").nameRu, "Синий");
		assert.strictEqual(getWorkplaceChairPalette("rose").nameRu, "Роза");
		assert.strictEqual(getWorkplaceChairPalette("olive").nameRu, "Олива");
		assert.strictEqual(getWorkplaceChairPalette("sand").nameRu, "Песок");
		assert.strictEqual(getWorkplaceChairPalette(0).nameRu, "Лаванда");
		assert.strictEqual(getWorkplaceChairPalette(1).nameRu, "Лаванда");
		assert.strictEqual(getWorkplaceChairPalette(5).nameRu, "Синий");
		assert.strictEqual(getWorkplaceChairPalette(6).nameRu, "Роза");
		assert.strictEqual(getWorkplaceChairPalette(8).nameRu, "Олива");
		assert.strictEqual(getWorkplaceChairPalette(9).nameRu, "Песок");
		assert.strictEqual(getWorkplaceChairPalette("").nameRu, DEFAULT_WORKPLACE_CHAIR_PALETTE.nameRu);
	});

	it("2. ScheduleChairHeader renders chair palette attribute and chair title via real component", () => {
		const minimalDashboard = {
			patients: [],
			appointments: [],
			doctors: [{ id: "doc-1", fullName: "Иванов Сергей Петрович", role: "doctor" }],
			clinicSettings: { staff: [], chairs: [], isSoloPractice: false },
		} as unknown as Dashboard;

		const html = renderToStaticMarkup(
			React.createElement(ScheduleChairHeader, {
				chair: { id: "chair-1", name: "Кресло 1", colorId: 5 },
				chairIndex: 0,
				effectiveChairAssignments: {},
				doctors: [{ id: "doc-1", fullName: "Иванов Сергей Петрович", role: "doctor" }],
				suggestedDoctor: null,
				isSoloDoctor: false,
				dateKey: "2026-11-27",
				dashboard: minimalDashboard,
				isToday: true,
				currentHour: 11,
				activeHeaderDoctorPopoverChairId: null,
				setActiveHeaderDoctorPopoverChairId: () => {},
				openAssignModal: () => {},
				handleConfirmAssignDoctor: () => {},
				handleUnassignDoctor: () => {},
				handleAssignDoctorWeek: () => {},
				handleAssignDoctorMonth: () => {},
				handleQuickSubstituteDoctor: () => {},
				handleBindDoctorToChair: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="chair-header-chair-1"'));
		assert.ok(html.includes('data-chair-palette="Синий"'));
		assert.ok(html.includes("Кресло 1"));
	});

	it("3. APPOINTMENT_REFUSAL_REASONS_CATALOG & AppointmentRefusalBanner render quick refusal chips & patient FIO formatting", () => {
		assert.strictEqual(APPOINTMENT_REFUSAL_REASONS_CATALOG.length, 10);
		const cancelledAppt = {
			id: "appt-cancel-1",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			startsAt: "2026-11-27T10:00:00.000Z",
			endsAt: "2026-11-27T10:30:00.000Z",
			status: "cancelled",
			reason: "Консультация",
			comment: "",
		} as unknown as Appointment;

		const htmlUnreasoned = renderToStaticMarkup(
			React.createElement(AppointmentRefusalBanner, {
				appointment: cancelledAppt,
				isQuickStatusUpdating: false,
				appointmentHasOpenVisit: false,
				onQuickStatusChange: async () => {},
			}),
		);
		assert.ok(htmlUnreasoned.includes('data-testid="appointment-card-refusal-banner"'));
		assert.ok(htmlUnreasoned.includes('data-testid="appointment-card-refusal-chips"'));
		assert.ok(htmlUnreasoned.includes("Запись отменена"));
		assert.ok(htmlUnreasoned.includes("Причина отказа:"));

		const htmlWithReason = renderToStaticMarkup(
			React.createElement(AppointmentRefusalBanner, {
				appointment: { ...cancelledAppt, comment: "[Отмена: Передумал / нет времени]" },
				isQuickStatusUpdating: false,
				appointmentHasOpenVisit: false,
				onQuickStatusChange: async () => {},
			}),
		);
		assert.ok(htmlWithReason.includes("Передумал / нет времени"));
		assert.equal(htmlWithReason.includes('data-testid="appointment-card-refusal-chips"'), false);

		assert.ok(formatPatientDisplayFio("Иванова Мария Сергеевна").includes("Иванова"));
	});

	it("4. Unified CashRegisterStudioModal SSOT replaces PatientBillingModal using kopeck props", () => {
		const html = renderToStaticMarkup(
			React.createElement(CashRegisterStudioModal, {
				isOpen: true,
				onClose: () => {},
				mode: "checkout",
				patientName: "Сидоров Иван Николаевич",
				totalDueKopecks: 550000,
				amountKopecks: 550000,
				patientDepositKopecks: 100000,
			}),
		);
		assert.ok(html.includes("Сидоров Иван Николаевич"));
		assert.ok(html.replace(/\u00a0/g, " ").includes("5 500") || html.includes("5500"));
		assert.equal(html.includes("54-ФЗ"), false);
		assert.equal(/<button[^>]*\sdisabled(?:=|(?=\s|>|$))/i.test(html), false);
	});
});
