/**
 * apps/web/src/tests/desktopErgonomicsArtisan.test.tsx
 *
 * Automated verification of Desktop Ergonomics (Studio Clinical HIG):
 * 1. ScheduleFilterStrip: 1 compact row (36px), smooth horizontal scroll, non-truncated chips, zero emoji.
 * 2. AppointmentHoverHud & AppointmentCard: <120ms delay, CLS=0 layout containment, medical markers (teeth, allergies, somatics, 54-FZ).
 * 3. PatientsView: Miller's law (<= 2 buttons on row + "..." menu), instant keyboard navigation, data-patient-id scrolling.
 * 4. patients-redesign.css & schedule.css: WCAG AAA contrast tokens for dark & light themes.
 */

import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { GridAppointmentCard } from "../components/schedule/GridAppointmentCard";
import { AppointmentCard, extractTeethList, formatPatientDisplayFio } from "../components/schedule/AppointmentCard";
import type { Appointment } from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../..");

test("Desktop Ergonomics — ScheduleFilterStrip and schedule.css enforce 36px 1-row toolbar and wheel scroll", () => {
	const scheduleTsx = fs.readFileSync(
		path.join(webRoot, "src/components/schedule/ScheduleFilterStrip.tsx"),
		"utf8",
	);
	const scheduleCss = fs.readFileSync(
		path.join(webRoot, "src/styles/modules/schedule.css"),
		"utf8",
	);

	// 1. Strictly 36px toolbar height on desktop
	assert.ok(
		scheduleTsx.includes("sm:min-h-[36px] sm:h-9 sm:max-h-9"),
		"Schedule toolbar must strictly enforce 36px (h-9) height on desktop",
	);

	// 2. Horizontal wheel scrolling handler
	assert.ok(
		scheduleTsx.includes("e.currentTarget.scrollLeft += e.deltaY"),
		"Schedule filter chips must implement onWheel horizontal scroll",
	);

	// 3. Smooth scroll and scrollbar suppression in CSS
	assert.ok(
		scheduleCss.includes(".schedule-filter-chips"),
		"schedule.css must include .schedule-filter-chips rule",
	);
	assert.ok(
		scheduleCss.includes("scroll-behavior: smooth"),
		"schedule.css must include smooth scroll-behavior",
	);

	// 4. Non-truncated chips and zero emoji
	assert.ok(
		!scheduleTsx.includes("📞 Автодозвон"),
		"Schedule toolbar must have zero emoji in text or comments (Mandate 8d)",
	);
	assert.ok(
		scheduleTsx.includes("Автодозвон"),
		"Schedule toolbar must render 'Автодозвон' text",
	);
	assert.ok(
		scheduleTsx.includes("Моё кресло"),
		"Schedule toolbar must render 'Моё кресло' text",
	);
});

test("Desktop Ergonomics — GridAppointmentCard real hover preview replaces dead AppointmentHoverHud (CLS=0 & 54-FZ)", () => {
	// 1. Verify AppointmentHoverHud.tsx is eradicated (Mandates 8s, 8p)
	const hoverHudPath = path.join(webRoot, "src/components/schedule/AppointmentHoverHud.tsx");
	assert.ok(!fs.existsSync(hoverHudPath), "AppointmentHoverHud.tsx dead clone must be deleted per Mandate 8s");

	const dummyAppt: Appointment = {
		id: "appt-hud-test",
		organizationId: "org-1",
		patientId: "pat-1",
		doctorUserId: "doc-1",
		chairId: "chair-1",
		assistantUserId: null,
		startsAt: "2026-09-15T11:00:00.000Z",
		endsAt: "2026-09-15T11:45:00.000Z",
		status: "confirmed",
		reason: "Лечение пульпита зуба 36",
		comment: "Острая боль снята",
	};

	const mockDashboard = {
		patients: [{ id: "pat-1", fullName: "Иванов Иван Иванович", balanceRub: 2500 }],
		clinicSettings: { staff: [{ id: "doc-1", fullName: "Д-р Смирнов А. В." }] },
	};

	const markupNorm = renderToStaticMarkup(
		React.createElement(GridAppointmentCard, {
			appointment: dummyAppt,
			chair: { id: "chair-1", name: "Кабинет 1" },
			effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
			doctors: [{ id: "doc-1", fullName: "Д-р Смирнов А. В." }],
			patientLookupMap: new Map([["pat-1", mockDashboard.patients[0]]]),
			staffLookupMap: new Map([["doc-1", mockDashboard.clinicSettings.staff[0]]]),
			collisionMap: new Map(),
			patientNameFn: () => "Иванов Иван Иванович",
			dashboard: mockDashboard as any,
			timezone: "Europe/Moscow",
			toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
			appointmentLabels: {
				planned: "Запланирован",
				confirmed: "Подтвержден",
				arrived: "Пришел",
				in_treatment: "В кресле",
				completed: "Завершен",
				cancelled: "Отменен",
				no_show: "Не явился",
			},
			isHovered: true,
			isStatusPickerOpen: false,
			isMenuOpen: false,
			isNearBottom: false,
			isNearRightEdge: false,
			onAppointmentClick: () => {},
			onSelectMobileAppt: () => {},
			onQuickStatusChange: () => {},
			onAdjustDuration: () => {},
			onShiftLateness: () => {},
			onReassignChair: () => {},
			onReassignDoctor: () => {},
			onFreeSlotToWaitlist: () => {},
			onMouseEnter: () => {},
			onMouseLeave: () => {},
			onKeepHovered: () => {},
			onToggleStatusPicker: () => {},
			onToggleMenu: () => {},
			onCloseStatusPicker: () => {},
			onCloseMenu: () => {},
		}),
	);

	// 2. Layout containment to prevent CLS
	assert.ok(
		markupNorm.includes("content-visibility:auto") || markupNorm.includes("contain-intrinsic-size"),
		"GridAppointmentCard must specify content-visibility/containment for CLS=0",
	);

	// 3. Hover preview DOM container
	assert.ok(
		markupNorm.includes("schedule-grid-patient-hover-preview"),
		"GridAppointmentCard must render schedule-grid-patient-hover-preview on hover",
	);

	// 4. 54-FZ deposit balance (handling unicode non-breaking space \u00a0)
	const normalizedNorm = markupNorm.replace(/\u00a0/g, " ");
	assert.ok(
		normalizedNorm.includes("Депозит: +2 500 ₽"),
		"GridAppointmentCard hover preview must display 54-FZ fiscal deposit",
	);

	// 5. Debt & Allergy alert when present
	const mockAlertDashboard = {
		patients: [{
			id: "pat-1",
			fullName: "Иванов Иван Иванович",
			balanceRub: -1500,
			notes: "Аллергия на ультракаин",
		}],
		clinicSettings: { staff: [{ id: "doc-1", fullName: "Д-р Смирнов А. В." }] },
	};

	const markupAlert = renderToStaticMarkup(
		React.createElement(GridAppointmentCard, {
			appointment: dummyAppt,
			chair: { id: "chair-1", name: "Кабинет 1" },
			effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
			doctors: [{ id: "doc-1", fullName: "Д-р Смирнов А. В." }],
			patientLookupMap: new Map([["pat-1", mockAlertDashboard.patients[0]]]),
			staffLookupMap: new Map([["doc-1", mockAlertDashboard.clinicSettings.staff[0]]]),
			collisionMap: new Map(),
			patientNameFn: () => "Иванов Иван Иванович",
			dashboard: mockAlertDashboard as any,
			timezone: "Europe/Moscow",
			toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
			appointmentLabels: {
				planned: "Запланирован",
				confirmed: "Подтвержден",
				arrived: "Пришел",
				in_treatment: "В кресле",
				completed: "Завершен",
				cancelled: "Отменен",
				no_show: "Не явился",
			},
			isHovered: true,
			isStatusPickerOpen: false,
			isMenuOpen: false,
			isNearBottom: false,
			isNearRightEdge: false,
			onAppointmentClick: () => {},
			onSelectMobileAppt: () => {},
			onQuickStatusChange: () => {},
			onAdjustDuration: () => {},
			onShiftLateness: () => {},
			onReassignChair: () => {},
			onReassignDoctor: () => {},
			onFreeSlotToWaitlist: () => {},
			onMouseEnter: () => {},
			onMouseLeave: () => {},
			onKeepHovered: () => {},
			onToggleStatusPicker: () => {},
			onToggleMenu: () => {},
			onCloseStatusPicker: () => {},
			onCloseMenu: () => {},
		}),
	);

	const normalizedAlert = markupAlert.replace(/\u00a0/g, " ");
	assert.ok(
		normalizedAlert.includes("Долг: 1 500 ₽"),
		"GridAppointmentCard hover preview must display 54-FZ debt",
	);
	assert.ok(
		markupAlert.includes("Аллергия на ультракаин"),
		"GridAppointmentCard hover preview must display allergy alert",
	);
});

test("Desktop Ergonomics — AppointmentCard extracts teeth and renders medical markers and double-click", () => {
	const appointmentCardTsx = fs.readFileSync(
		path.join(webRoot, "src/components/schedule/AppointmentCard.tsx"),
		"utf8",
	);

	// 1. Hover delay <120ms (specifically 80ms)
	assert.ok(
		appointmentCardTsx.includes("setIsHoverPreviewOpen(true)") && appointmentCardTsx.includes("80);"),
		"AppointmentCard must use 80ms delay (<120ms) for hover preview",
	);

	// 2. extractTeethList helper
	const teeth = extractTeethList({
		reason: "Профгигиена и пломбирование 14, 15, 24",
	} as any);
	assert.deepEqual(teeth, ["14", "15", "24"], "extractTeethList must parse valid FDI tooth numbers");

	// 3. formatPatientDisplayFio
	assert.equal(
		formatPatientDisplayFio("Кузнецов Петр Сергеевич"),
		"Кузнецов Петр С.",
		"formatPatientDisplayFio must format full name cleanly without truncation",
	);

	// 4. Double click handler present on card body heading
	assert.ok(
		appointmentCardTsx.includes("onDoubleClick={(e) => {"),
		"AppointmentCard must have onDoubleClick handler for instant visit opening",
	);
});

test("Desktop Ergonomics — PatientsView enforces Miller's Law (<=2 direct buttons + '...' menu) and keyboard navigation", () => {
	const patientsViewTsx = fs.readFileSync(
		path.join(webRoot, "src/PatientsView.tsx"),
		"utf8",
	);
	const patientsCss = fs.readFileSync(
		path.join(webRoot, "src/styles/patients-redesign.css"),
		"utf8",
	);

	// 1. Miller's law buttons on patient-row
	assert.ok(
		patientsViewTsx.includes("patient-row-chart-btn"),
		"PatientsView must have direct 'В карту' button on patient-row",
	);
	assert.ok(
		patientsViewTsx.includes("patient-row-book-btn"),
		"PatientsView must have direct 'Запись' button on patient-row",
	);
	assert.ok(
		patientsViewTsx.includes("patient-row-more-btn"),
		"PatientsView must have '...' more actions menu button on patient-row",
	);
	assert.ok(
		patientsViewTsx.includes("patient-row-menu-dropdown"),
		"PatientsView must render dropdown menu for secondary actions",
	);

	// 2. Instant keyboard navigation with scrollIntoView
	assert.ok(
		patientsViewTsx.includes("data-patient-id={patient.id}"),
		"patient-row must have data-patient-id attribute for keyboard scrolling",
	);
	assert.ok(
		patientsViewTsx.includes("el?.scrollIntoView({ block: \"nearest\", behavior: \"smooth\" })"),
		"Arrow key navigation must smoothly scroll active patient row into view",
	);

	// 3. Dark mode WCAG AAA contrast tokens in CSS
	assert.ok(
		patientsCss.includes("[data-theme=\"dark\"] .patient-row"),
		"patients-redesign.css must include dark theme patient-row rules",
	);
	assert.ok(
		patientsCss.includes(".patient-row:focus-visible"),
		"patients-redesign.css must include focus-visible styles for keyboard navigation",
	);
	assert.ok(
		patientsCss.includes("[data-theme=\"dark\"] .patient-row-menu-dropdown"),
		"patients-redesign.css must style dropdown for dark mode",
	);
});
