/**
 * DENTE CRM — Comprehensive Vitest Test Suite for PatientHeaderCard & TelegramMiniAppBooking
 * (DOMAIN: Modular Architecture, Miller's Law, Apple HIG, Touch Targets & State Progression)
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

// 1. Patient Header Modules
import { PatientHeaderCard, formatPatientBirthAndAge } from "../../../patients/PatientHeaderCard";
import { PatientHeaderBalanceBadge } from "../../../patients/headerModules/PatientHeaderBalanceBadge";
import { PatientHeaderAllergiesAlert } from "../../../patients/headerModules/PatientHeaderAllergiesAlert";
import { PatientHeaderQuickActions } from "../../../patients/headerModules/PatientHeaderQuickActions";

// 2. Telegram Mini App Booking Modules
import { TelegramMiniAppBooking, SPECIALIST_CATEGORIES } from "../TelegramMiniAppBooking";
import { BookingDoctorSelector } from "../bookingModules/BookingDoctorSelector";
import { BookingSlotPicker } from "../bookingModules/BookingSlotPicker";
import { BookingStickyBottomBar } from "../bookingModules/BookingStickyBottomBar";
import { BookingSuccessView } from "../bookingModules/BookingSuccessView";
import { DEFAULT_DOCTORS_LIST, generateCalendarDays } from "../bookingModules/bookingTypes";
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
				<PatientHeaderCard patientId="pat-facade-1" />
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

	it("generateCalendarDays generates 7 consecutive days starting with 'Сегодня' and 'Завтра'", () => {
		const days = generateCalendarDays();
		expect(days).toHaveLength(7);
		expect(days[0]?.dayOfWeek).toBe("Сегодня");
		expect(days[1]?.dayOfWeek).toBe("Завтра");
		expect(days[0]?.dayNum).toBeGreaterThan(0);
	});

	it("BookingDoctorSelector renders specialist category chips and doctor profile cards with ratings", () => {
		const html = renderToString(
			<BookingDoctorSelector
				activeCategory="therapist"
				filteredDoctors={DEFAULT_DOCTORS_LIST}
				selectedDoctorId="doc-1"
				onSelectCategory={() => {}}
				onSelectDoctor={() => {}}
			/>,
		);
		expect(html).toContain("1. Выберите направление приёма");
		expect(html).toContain("Терапевт");
		expect(html).toContain("Хирург / Имплантолог");
		expect(html).toContain("Д-р Смирнов А.В.");
		expect(html).toContain("★");
		expect(html).toContain("4.9");
		expect(html).toContain("Стаж практики:");
	});

	it("BookingSlotPicker renders horizontal date buttons and free appointment slot grid", () => {
		const days = generateCalendarDays();
		const slots = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];
		const html = renderToString(
			<BookingSlotPicker
				calendarDays={days}
				selectedDateIndex={0}
				availableSlots={slots}
				selectedSlot="10:30"
				onSelectDateIndex={() => {}}
				onSelectSlot={() => {}}
			/>,
		);
		expect(html).toContain("3. Выберите дату визита");
		expect(html).toContain("4. Свободное время");
		expect(html).toContain("10:30");
		expect(html).toContain("14:00");
		expect(html).toContain("tg-slot-btn");
	});

	it("BookingStickyBottomBar renders floating primary CTA adhering to Apple HIG thumb zone", () => {
		const days = generateCalendarDays();
		const doc = DEFAULT_DOCTORS_LIST[0]!;
		const html = renderToString(
			<BookingStickyBottomBar
				isSubmitting={false}
				currentDoctor={doc}
				selectedSlot="11:00"
				currentDayMeta={days[0]}
				onSubmitBooking={() => {}}
			/>,
		);
		expect(html).toContain("data-testid=\"booking-sticky-bottom-bar\"");
		expect(html).toContain("tg-floating-bottom-bar");
		expect(html).toContain("data-testid=\"booking-submit-cta-btn\"");
		expect(html).toContain("Записаться к доктору на");
		expect(html).toContain("в 11:00");
	});

	it("BookingSuccessView renders appointment confirmation and clinical guide", () => {
		const result = {
			appointmentId: "appt-999",
			doctorName: "Д-р Смирнов А.В.",
			dateString: "15 мая (Ср)",
			time: "14:00",
			teethSummary: "Зуб #16: Острая боль",
		};
		const html = renderToString(
			<BookingSuccessView
				bookingSuccessResult={result}
				patientFullName="Алексей"
				onResetResult={() => {}}
			/>,
		);
		expect(html).toContain("data-testid=\"booking-success-card\"");
		expect(html).toContain("Запись успешно оформлена!");
		expect(html).toContain("Д-р Смирнов А.В.");
		expect(html).toContain("15 мая (Ср)");
		expect(html).toContain("14:00");
		expect(html).toContain("Зуб #16: Острая боль");
		expect(html).toContain("Памятка перед приёмом");
		expect(html).toContain("data-testid=\"booking-back-to-teeth-btn\"");
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
		expect(html).toContain("1. Выберите направление приёма");
		expect(html).toContain("data-testid=\"booking-sticky-bottom-bar\"");
	});
});
