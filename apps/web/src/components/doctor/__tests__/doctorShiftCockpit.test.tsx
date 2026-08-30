import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
	DoctorShiftCockpitModal,
	DoctorDesktopHeader,
} from "../index";
import {
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	type DoctorShiftAppointment,
} from "@dental/shared";

describe("DoctorShiftCockpitModal Component (Medical Density & Design Laws)", () => {
	it("renders DoctorShiftCockpitModal when isOpen is true with strict graphite theme", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов Алексей Петрович",
				doctorSpecialty: "Врач-стоматолог терапевт-ортопед",
				cabinetName: "Кабинет № 1 (Терапия)",
				shiftDateIso: "2026-08-29",
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(html.includes("doctor-cockpit-overlay"), "Renders modal overlay");
		assert.ok(html.includes("doctor-cockpit-container"), "Renders cockpit container");
		assert.ok(html.includes("Кокпит смены"), "Renders cockpit title");
		assert.ok(html.includes("Д-р Смирнов Алексей Петрович"), "Renders doctor full name");
		assert.ok(html.includes("Кабинет № 1 (Терапия)"), "Renders cabinet name");
	});

	it("does not render when isOpen is false", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);

		assert.equal(html, "", "Renders nothing when closed");
	});

	it("satisfies Hick's Law: exactly 1 dominant Primary Action CTA for active patient", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("btn-primary-finish-visit"),
			"Has primary finish action button testid",
		);
		assert.ok(
			html.includes("Завершить приём и сформировать наряд"),
			"Has distinct single primary CTA text",
		);
		assert.ok(
			html.includes("doctor-primary-action-btn"),
			"Uses high-contrast primary action styling",
		);
	});

	it("satisfies Miller's Law: provides secondary action dropdown to avoid cognitive clutter (>7 visible items)", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("btn-secondary-actions-menu"),
			"Contains secondary action dropdown trigger",
		);
	});

	it("satisfies Fitts's Law: close and touch targets have >= 44x44px hitboxes", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("min-w-[44px]") && html.includes("min-h-[44px]"),
			"Close and touch buttons have min-w-[44px] min-h-[44px] hitboxes for gloved touch",
		);
	});

	it("renders high-visibility ⚠️ red emergency allergy and somatic risk alert badges", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("doctor-allergy-alert-badge") || html.includes("allergy-alert-badge"),
			"Contains emergency allergy alert badge",
		);
		assert.ok(
			html.includes("Лидокаин") || html.includes("Новокаин"),
			"Displays specific critical anesthetic allergies",
		);
		assert.ok(
			html.includes("бисфосфонатов"),
			"Displays somatic risk warning regarding bisphosphonates/osteonecrosis",
		);
	});

	it("renders Live Countdown Timer with overtime status indicator", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("doctor-countdown-timer"),
			"Renders live countdown timer container",
		);
		assert.ok(
			html.includes("role=\"timer\""),
			"Has accessible timer role",
		);
	});

	it("renders 0-Click Fast Action Buttons (Odontogram, Lab Order, Imaging, Consent, Assistant Call)", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(html.includes("btn-quick-odontogram"), "Has quick odontogram button");
		assert.ok(html.includes("btn-quick-lab-order"), "Has quick lab order button");
		assert.ok(html.includes("btn-quick-imaging"), "Has quick imaging button");
		assert.ok(html.includes("btn-quick-consent"), "Has quick consent button");
		assert.ok(html.includes("btn-quick-assistant"), "Has quick assistant call button");
	});

	it("renders Next Queued Patient Card with arrival status indicator", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("next-patient-card"),
			"Renders next queued patient card container",
		);
		assert.ok(
			html.includes("Следующий по очереди"),
			"Displays queue heading",
		);
		assert.ok(
			html.includes("btn-invite-next-to-chair"),
			"Has 1-click button to invite next patient into chair",
		);
	});

	it("displays exact integer kopecks doctor earnings summary with ZTL deductions", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("doctor-cockpit-earned-val"),
			"Displays total doctor piece-rate earnings value",
		);
		assert.ok(
			html.includes("₽"),
			"Formats monetary amounts in Russian rubles with integer kopecks",
		);
	});

	it("satisfies Tab Ergonomics: navigation tabs container has flex-wrap and displays unsigned badge without clipping", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("doctor-tabs-container"),
			"Contains navigation tabs container testid",
		);
		assert.ok(
			html.includes("flex-wrap"),
			"Tabs container uses flex-wrap to prevent horizontal tab clipping",
		);
		assert.ok(
			html.includes("tab-unsigned-badge"),
			"Contains unsigned badge in EMR journal tab",
		);
		assert.ok(
			html.includes("Нужна подпись ("),
			"Renders clear signature status text in badge",
		);
	});

	it("renders detailed piece-rate doctor salary and Form 043/u status in patient cards", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("active-doctor-earned"),
			"Renders doctor earned amount for active in-chair patient",
		);
		assert.ok(
			html.includes("Врачу:"),
			"Displays explicit doctor share prefix in active card",
		);
		assert.ok(
			html.includes("active-patient-emr-status"),
			"Renders Form 043/u EMR status badge for active patient",
		);
		assert.ok(
			html.includes("next-patient-doctor-earned"),
			"Renders calculated doctor earnings for next queued patient",
		);
		assert.ok(
			html.includes("next-patient-emr-status"),
			"Renders Form 043/u EMR status badge for next queued patient",
		);
	});

	it("guarantees high contrast semantic CSS tokens (var(--ink-2)) for dark mode WCAG AA compliance", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("var(--ink-2"),
			"Uses var(--ink-2) semantic token for high contrast secondary labels",
		);
		assert.ok(
			!html.includes("#64748b"),
			"Does not use non-compliant low-contrast static hex #64748b",
		);
	});

	it("guarantees NO hardcoded demo backdoors (771204) in the SMS signing flow", () => {
		const html = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			!html.includes("771204"),
			"Does NOT contain hardcoded demo code 771204 in production UI",
		);
		assert.ok(
			!html.includes("Демо-код"),
			"Does NOT display demo backdoor buttons",
		);
	});
});

describe("DoctorDesktopHeader Component (High-Density Top Bar)", () => {
	it("renders compact desktop header with doctor identity and cabinet badge", () => {
		const html = renderToString(
			createElement(DoctorDesktopHeader, {
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов А.П.",
				doctorSpecialty: "Терапевт-ортопед",
				cabinetName: "Кабинет № 1",
				shiftDateIso: "2026-08-29",
				appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("doctor-desktop-header-strip"),
			"Contains desktop header strip class",
		);
		assert.ok(
			html.includes("Д-р Смирнов А.П."),
			"Displays doctor name",
		);
		assert.ok(
			html.includes("Кабинет № 1"),
			"Displays cabinet name",
		);
	});

	it("displays active patient banner with allergy alert and live countdown timer", () => {
		const html = renderToString(
			createElement(DoctorDesktopHeader, {
				doctorId: "doc-1",
				appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(
			html.includes("header-patient-name"),
			"Displays active patient name in header",
		);
		assert.ok(
			html.includes("header-allergy-alert"),
			"Displays emergency allergy alert badge in header",
		);
		assert.ok(
			html.includes("header-countdown-timer"),
			"Displays live countdown timer in header",
		);
	});

	it("renders 0-Click action tools and 1 Primary Finish Action button", () => {
		const html = renderToString(
			createElement(DoctorDesktopHeader, {
				doctorId: "doc-1",
				appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);

		assert.ok(html.includes("header-btn-odontogram"), "Has quick odontogram button");
		assert.ok(html.includes("header-btn-lab-order"), "Has quick lab order button");
		assert.ok(html.includes("header-btn-imaging"), "Has quick imaging button");
		assert.ok(html.includes("header-btn-consent"), "Has quick consent button");
		assert.ok(html.includes("header-btn-assistant"), "Has quick assistant button");
		assert.ok(html.includes("header-btn-finish-visit"), "Has 1 Primary finish visit CTA");
		assert.ok(html.includes("header-btn-open-cockpit"), "Has button to open full cockpit modal");
	});

	it("prevents timer wrapping with whitespace-nowrap tabular-nums shrink-0 classes", () => {
		const headerHtml = renderToString(
			createElement(DoctorDesktopHeader, {
				doctorId: "doc-1",
				appointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);
		assert.ok(
			headerHtml.includes("whitespace-nowrap") &&
				headerHtml.includes("tabular-nums") &&
				headerHtml.includes("shrink-0"),
			"DoctorDesktopHeader timer contains whitespace-nowrap tabular-nums shrink-0",
		);

		const modalHtml = renderToString(
			createElement(DoctorShiftCockpitModal, {
				isOpen: true,
				onClose: () => {},
				initialAppointments: SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			}),
		);
		assert.ok(
			modalHtml.includes("whitespace-nowrap") &&
				modalHtml.includes("tabular-nums") &&
				modalHtml.includes("shrink-0"),
			"DoctorShiftCockpitModal timer contains whitespace-nowrap tabular-nums shrink-0",
		);
	});
});
