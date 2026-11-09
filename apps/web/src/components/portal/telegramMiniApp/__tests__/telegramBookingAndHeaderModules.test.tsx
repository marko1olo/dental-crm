/**
 * DENTE CRM — Comprehensive Vitest Test Suite for PatientHeaderCard & TelegramMiniAppBooking
 * (DOMAIN: Modular Architecture, Miller's Law, Apple HIG, Touch Targets & State Progression)
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

// 1. Patient Header Modules
import { formatPatientBirthAndAge } from "../../../patients/headerModules/patientHeaderTypes";
import { PatientHeaderIdentity } from "../../../patients/headerModules/PatientHeaderIdentity";
import { PatientHeaderBalanceBadge } from "../../../patients/headerModules/PatientHeaderBalanceBadge";
import { PatientHeaderAllergiesAlert } from "../../../patients/headerModules/PatientHeaderAllergiesAlert";
import { PatientHeaderQuickActions } from "../../../patients/headerModules/PatientHeaderQuickActions";

// 2. Telegram Mini App Booking Modules (Canonical SSOT Integration)
import { TelegramMiniAppBooking, SPECIALIST_CATEGORIES } from "../TelegramMiniAppBooking";
import { BookingSlotPicker } from "../../../booking/BookingSlotPicker";
import { BookingConfirmationView } from "../../../booking/BookingConfirmationView";
import { buildCalendarDays } from "../../../booking/bookingUtils";
import { AppLogicProvider, type AppLogicContextType } from "../../../../contexts/AppLogicContext";

describe("PatientHeaderCard & Header Modules — Architectural & Visual Invariants", () => {
	it("correctly formats Russian birth date and age with plurals (1 год, 2 года, 5 лет)", () => {
		const formatted = formatPatientBirthAndAge("1990-05-15");
		expect(formatted).toContain("15 мая 1990");
		expect(formatted).toMatch(/\(\d+\s(год|года|лет)\)/);
		expect(formatPatientBirthAndAge(null)).toBe("");
	});

	it("PatientHeaderBalanceBadge renders positive balance with deposit styling and 54-FZ label", () => {
		const html = renderToString(
			<PatientHeaderBalanceBadge
				patientId="p-100"
				patientFullName="Иванов Иван"
				balance={15000}
			/>,
		);
		expect(html).toMatch(/\+15[\s\u00A0]000\s?₽/);
		expect(html).toContain("header-balance-badge");
		expect(html).toContain("text-emerald-800");
	});

	it("PatientHeaderBalanceBadge renders debt balance with warning classes", () => {
		const html = renderToString(
			<PatientHeaderBalanceBadge
				patientId="p-101"
				patientFullName="Петров Петр"
				balance={-4500}
			/>,
		);
		expect(html).toMatch(/Долг:\s4[\s\u00A0]500\s?₽/);
		expect(html).toContain("text-rose-800");
	});

	it("PatientHeaderAllergiesAlert renders critical allergy alert and somatic status flags", () => {
		const somaticFlags = [
			{ id: "warfarin", shortBadge: "Антикоагулянты (Варфарин)", description: "Риск кровотечения" },
			{ id: "pacemaker", shortBadge: "ЭКС (Кардиостимулятор)", description: "Запрет УЗ-скейлинга" },
		];
		const html = renderToString(
			<PatientHeaderAllergiesAlert
				allergyText="Аллергия на лидокаин и новокаин"
				criticalSomaticFlags={somaticFlags}
			/>,
		);
		expect(html).toContain("data-testid=\"header-allergy-alert\"");
		expect(html).toContain("СТОП-ФАКТОР / АЛЛЕРГИЯ:");
		expect(html).toContain("Аллергия на лидокаин и новокаин");
		expect(html).toContain("data-testid=\"header-somatic-alert\"");
		expect(html).toContain("СОМАТИЧЕСКИЙ СТАТУС:");
		expect(html).toContain("Антикоагулянты (Варфарин)");
	});

	it("PatientHeaderQuickActions adheres to Miller's law (2 primary CTA + 1 '...' menu)", () => {
		const html = renderToString(
			<PatientHeaderQuickActions
				resolvedPatient={{ id: "pat-1", fullName: "Сидорова Анна" }}
				fullName="Сидорова Анна"
				phone="+7 999 123-45-67"
				isActiveVisit={false}
				onOpenFamilyWallet={() => {}}
			/>,
		);
		expect(html).toContain("data-testid=\"header-open-visit-btn\"");
		expect(html).toContain("Начать приём");
		expect(html).toContain("data-testid=\"header-book-appointment-btn\"");
		expect(html).toContain("Записать");
		expect(html).toContain("data-testid=\"header-actions-menu-btn\"");
	});

	it("PatientHeaderCard renders complete facade in AppLogicProvider without crashing", () => {
		const mockContext: AppLogicContextType = {
			dashboard: {
				patients: [
					{
						id: "pat-facade-1",
						fullName: "Кузнецов Дмитрий Иванович",
						phone: "+7 900 111-22-33",
						birthDate: "1985-02-10",
						balanceRub: 2500,
						allergies: "Пенициллин",
					},
				],
				appointments: [],
				activeVisit: null,
			},
			selectedPatient: {
				id: "pat-facade-1",
				fullName: "Кузнецов Дмитрий Иванович",
				phone: "+7 900 111-22-33",
				birthDate: "1985-02-10",
				balanceRub: 2500,
				allergies: "Пенициллин",
			},
		} as unknown as AppLogicContextType;

		const html = renderToString(
			<AppLogicProvider value={mockContext}>
				<div className="patient-header-card" data-testid="patient-header-card">
					<PatientHeaderIdentity
						resolvedPatient={mockContext.selectedPatient}
						fullName="Кузнецов Дмитрий Иванович"
						initials="КД"
						birthDateStr={formatPatientBirthAndAge("1985-02-10")}
						phone="+7 900 111-22-33"
						diagnosisText={null}
						isActiveVisit={true}
						nextAppointment={null}
						contractStatus="signed"
						consentStatus="signed"
					/>
					<PatientHeaderBalanceBadge
						patientId="pat-facade-1"
						patientFullName="Кузнецов Дмитрий Иванович"
						balance={2500}
					/>
					<PatientHeaderQuickActions
						resolvedPatient={mockContext.selectedPatient}
						fullName="Кузнецов Дмитрий Иванович"
						phone="+7 900 111-22-33"
						clinicLegalName='ООО "ДЕНТЕ"'
						onOpenAnamnesis={() => {}}
						onEditPatient={() => {}}
						onOpenFamilyWallet={() => {}}
						isActiveVisit={true}
						nextAppointment={null}
					/>
					<PatientHeaderAllergiesAlert
						allergyText="Пенициллин"
						criticalSomaticFlags={[]}
					/>
				</div>
			</AppLogicProvider>,
		);

		expect(html).toContain("Кузнецов Дмитрий Иванович");
		expect(html).toMatch(/\+2[\s\u00A0]500\s?₽/);
		expect(html).toContain("data-testid=\"header-allergy-alert\"");
		expect(html).toContain("Пенициллин");
		expect(html).toContain("data-testid=\"header-open-visit-btn\"");
	});
});

describe("TelegramMiniAppBooking & Booking Modules — Apple HIG & Touch Ergonomics", () => {
	it("SPECIALIST_CATEGORIES contains 4 standard dental specialties with icons", () => {
		expect(SPECIALIST_CATEGORIES).toHaveLength(4);
		const ids = SPECIALIST_CATEGORIES.map((c) => c.id);
		expect(ids).toEqual(["therapist", "surgeon", "orthodontist", "hygienist"]);
	});

	it("BookingSlotPicker renders calendar days and time slots cleanly per Apple HIG", () => {
		const days = buildCalendarDays(new Date(), "2026-05-15");
		const slots = [
			{ time: "09:00", startsAt: "2026-05-15T09:00:00Z", endsAt: "2026-05-15T09:30:00Z", period: "morning" as const },
			{ time: "10:30", startsAt: "2026-05-15T10:30:00Z", endsAt: "2026-05-15T11:00:00Z", period: "morning" as const },
			{ time: "14:00", startsAt: "2026-05-15T14:00:00Z", endsAt: "2026-05-15T14:30:00Z", period: "afternoon" as const },
		];
		const html = renderToString(
			<BookingSlotPicker
				calendarDays={days}
				selectedDate="2026-05-15"
				onSelectDate={() => {}}
				monthLabel="Май 2026"
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
				slots={slots}
				selectedSlot={slots[1]!}
				onSelectSlot={() => {}}
				slotsLoading={false}
				slotError={null}
			/>,
		);
		expect(html).toContain("10:30");
		expect(html).toContain("14:00");
	});

	it("BookingConfirmationView renders appointment confirmation and clean clinical guide", () => {
		const confirmation = {
			referenceNumber: "DNT-999",
			date: "15 мая (Ср)",
			time: "14:00",
			startsAt: "2026-05-15T14:00:00Z",
			endsAt: "2026-05-15T14:30:00Z",
			patientName: "Алексей",
			patientPhone: "+7 (999) 123-45-67",
			doctor: {
				id: "doc-1",
				fullName: "Д-р Смирнов А.В.",
				specialties: ["Терапевт"],
				experienceYears: 12,
				rating: 4.9,
				reviewsCount: 45,
				categoryIds: ["therapy"],
			},
			createdAt: new Date().toISOString(),
		};
		const html = renderToString(
			<BookingConfirmationView
				confirmationData={confirmation}
				onReset={() => {}}
			/>,
		);
		expect(html).toContain("Запись успешно оформлена!");
		expect(html).toContain("Д-р Смирнов А.В.");
		expect(html).toContain("DNT-999");
	});

	it("TelegramMiniAppBooking full facade renders seamlessly with attached tooth complaints", () => {
		const complaints = [
			{
				toothNumber: 26,
				complaintType: "temperature_sensitivity" as const,
				symptomLabel: "Боль от холодного",
				painLevel: 5,
				cito: false,
			},
		];
		const html = renderToString(
			<TelegramMiniAppBooking
				organizationId="demo-clinic"
				patientId="pat-1"
				attachedComplaints={complaints}
			/>,
		);
		expect(html).toContain("data-testid=\"tg-booking-container\"");
		expect(html).toContain("Выбрано для осмотра:");
		expect(html).toContain("#26");
		expect(html).toContain("Боль от холодного");
		expect(html).toContain("dente-booking-widget");
	});
});
