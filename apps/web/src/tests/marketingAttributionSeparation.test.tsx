/**
 * marketingAttributionSeparation.test.tsx — Unit & SSR tests for Feature #28 (Separation of Online Self-Booking and Administrator Telephony).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OnlineBookingConversionPanel } from "../components/analytics/OnlineBookingConversionPanel.js";
import { MarketingAttributionDashboard } from "../components/analytics/MarketingAttributionDashboard.js";
import { PatientCreationModal } from "../components/patients/PatientCreationModal.js";
import { LeadConvertModal } from "../components/leads/LeadConvertModal.js";
import { validateRecallInviteSafety } from "../components/recalls/recallSmsAndMessaging.js";
import type { PatientRecallRecord } from "../components/recalls/recallCycleCatalog.js";
import { AppLogicProvider } from "../contexts/AppLogicContext.js";

// Mock AppLogicContext for isolated testing
// biome-ignore lint/suspicious/noExplicitAny: mock AppLogic value
const mockAppLogicValue: any = {
	dashboard: {
		clinicSettings: {
			name: "Стоматологический центр DENTE",
			staff: [{ id: "doc-1", fullName: "Д-р Ковалев", role: "doctor" }],
		},
		patients: [{ id: "p-1", fullName: "Иванов Сергей", phone: "+79001234567" }],
	},
	recalls: [],
	patientId: "p-1",
};

describe("Marketing Attribution Separation & Self-Booking Panel (Feature #28 & #35)", () => {
	it("1. Renders OnlineBookingConversionPanel into static HTML markup with distinct self-booking channels", () => {
		const html = renderToStaticMarkup(createElement(OnlineBookingConversionPanel));

		// Root container
		assert.ok(html.includes("data-testid=\"online-booking-conversion-panel\""));
		assert.ok(html.includes("Сквозная аналитика: Онлайн-записи vs Администраторы"));

		// KPI cards
		assert.ok(html.includes("Доля самозаписи"));
		assert.ok(html.includes("Конверсия виджета"));
		assert.ok(html.includes("Доходимость (Явка)"));
		assert.ok(html.includes("Выручка от самозаписи"));

		// Channels table
		assert.ok(html.includes("Сайт клиники (Виджет самозаписи)"));
		assert.ok(html.includes("Яндекс Карты (Кнопка «Записаться»)"));
		assert.ok(html.includes("2ГИС (Профиль клиники)"));
		assert.ok(html.includes("ПроДокторов / СберЗдоровье"));
		assert.ok(html.includes("Telegram-бот / Mini App"));
		assert.ok(html.includes("WhatsApp-чатбот / WABA"));

		// Summary totals
		assert.ok(html.includes("ИТОГО ПО САМОЗАПИСИ:"));
	});

	it("2. MarketingAttributionDashboard integrates online analytics, ROMI table, and clinic field settings", () => {
		const html = renderToStaticMarkup(createElement(MarketingAttributionDashboard));

		assert.ok(html.includes("data-testid=\"marketing-attribution-dashboard\""));
		assert.ok(html.includes("Сквозная аналитика маркетинга и каналов записи"));
		assert.ok(html.includes("data-testid=\"tab-online-vs-admin\""));
		assert.ok(html.includes("data-testid=\"tab-romi-table\""));
		assert.ok(html.includes("data-testid=\"tab-field-requirements\""));
	});

	it("3. PatientCreationModal renders advertising source and requirement badges properly inside AppLogicProvider", () => {
		const modal = createElement(PatientCreationModal, {
			isOpen: true,
			onClose: () => {},
			createPatient: () => {},
			customRequirements: {
				requirePhone: true,
				requireAdvertisingSource: true,
				requireSnils: true,
				requireBirthDate: false,
				requireIdentityDocument: false,
			},
		});

		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, { value: mockAppLogicValue, children: modal }),
		);

		assert.ok(html.includes("data-testid=\"patient-creation-modal-overlay\""));
		assert.ok(html.includes("Новый пациент"));
		assert.ok(html.includes("Рекламный источник"));
		assert.ok(html.includes("data-testid=\"patient-create-advertising-source-select\""));
		assert.ok(html.includes("Онлайн-самозапись (Автоматические каналы)"));
		assert.ok(html.includes("Обязательно по настройке клиники"));
		assert.ok(html.includes("СНИЛС"));
	});

	it("4. LeadConvertModal renders Zero Attribution Loss card with Russian channel badge, UTM indicator and primary inquiry", () => {
		const modal = createElement(LeadConvertModal, {
			isOpen: true,
			onClose: () => {},
			onSubmit: () => {},
			staff: [{ id: "doc-1", name: "Д-р Ковалев", specialty: "Хирург" }] as any,
			chairs: [{ id: "chair-1", name: "Кресло 1" }],
			effectiveStaff: [
				{ id: "doc-1", name: "Д-р Ковалев", specialty: "Хирург" },
			] as any,
			effectiveChairs: [{ id: "chair-1", name: "Кресло 1" }],
			selectedDoctorId: "doc-1",
			setSelectedDoctorId: () => {},
			selectedChairId: "chair-1",
			setSelectedChairId: () => {},
			appointmentDate: "2026-10-25",
			setAppointmentDate: () => {},
			appointmentTime: "10:00",
			setAppointmentTime: () => {},
			isBooking: false,
			lead: {
				id: "lead-401",
				name: "Елена Воронова",
				phone: "+7 999 888-77-66",
				source:
					"Яндекс.Директ ?utm_source=yandex&utm_campaign=whitening_autumn",
				notes: "Отбеливание зубов Zoom 4 и чистка",
				status: "new",
			},
			consentMedical: true,
			consentMarketing: false,
		});

		const html = renderToStaticMarkup(modal);

		// Zero Attribution Loss section
		assert.ok(
			html.includes('data-testid="lead-convert-attribution-card"'),
		);
		assert.ok(html.includes("Елена Воронова"));
		assert.ok(html.includes("+7 999 888-77-66"));

		// Russian channel badge and UTM tags
		assert.ok(html.includes('data-testid="lead-convert-channel-badge"'));
		assert.ok(html.includes("Канал: Яндекс.Директ"));
		assert.ok(html.includes('data-testid="lead-convert-utm-badge"'));
		assert.ok(html.includes("UTM сохранены"));

		// Primary inquiry
		assert.ok(
			html.includes('data-testid="lead-convert-primary-inquiry"'),
		);
		assert.ok(html.includes("Отбеливание зубов Zoom 4 и чистка"));
		assert.ok(html.includes("Zero Attribution Loss"));
	});

	it("5. LeadConvertModal enforces 152-FZ & FZ-38 consent separation with independent checkboxes", () => {
		const modal = createElement(LeadConvertModal, {
			isOpen: true,
			onClose: () => {},
			onSubmit: () => {},
			staff: [],
			chairs: [],
			effectiveStaff: [
				{
					id: "doc-solo",
					name: "Дежурный врач",
					specialty: "Терапевт",
				},
			] as any,
			effectiveChairs: [{ id: "chair-solo", name: "Кресло 1" }],
			selectedDoctorId: "doc-solo",
			setSelectedDoctorId: () => {},
			selectedChairId: "chair-solo",
			setSelectedChairId: () => {},
			appointmentDate: "2026-10-25",
			setAppointmentDate: () => {},
			appointmentTime: "11:00",
			setAppointmentTime: () => {},
			isBooking: false,
			lead: {
				id: "lead-402",
				name: "Роман Кузнецов",
				source: "2ГИС Карты",
				status: "new",
			},
			consentMedical: true,
			consentMarketing: false,
		});

		const html = renderToStaticMarkup(modal);

		// Consent separation container
		assert.ok(
			html.includes('data-testid="lead-convert-consent-section"'),
		);
		assert.ok(
			html.includes(
				"Разделение согласий (152-ФЗ и ст. 18 ФЗ «О рекламе»)",
			),
		);

		// Medical consent checkbox
		assert.ok(html.includes('data-testid="consent-medical-checkbox"'));
		assert.ok(
			html.includes("Согласие на обработку персданных (152-ФЗ)"),
		);
		assert.ok(
			html.includes("Обязательно для оказания медицинской помощи"),
		);

		// Marketing consent checkbox
		assert.ok(
			html.includes('data-testid="consent-marketing-checkbox"'),
		);
		assert.ok(
			html.includes("Согласие на рекламные рассылки и акции (ФЗ-38)"),
		);
		assert.ok(
			html.includes(
				"Отказ от рекламы: пациент исключается из промо-рассылок",
			),
		);
	});

	it("6. validateRecallInviteSafety enforces 152-FZ consent and suppresses recalls when appointment is scheduled today", () => {
		const candidate = {
			patientId: "pat-rec-1",
			patientName: "Ольга Сергеева",
			phone: "+7 912 345-67-89",
			recallCycleType: "hygiene_6m",
			lastVisitDate: "2026-04-15",
			recommendedNextDate: "2026-10-15",
			daysOverdue: 10,
			urgency: "medium",
			status: "pending",
		} as unknown as PatientRecallRecord;

		// 1. Without marketing consent -> blocked with 152-FZ reason
		const noConsentResult = validateRecallInviteSafety(candidate, {
			consentMarketing: false,
		});
		assert.equal(noConsentResult.allowed, false);
		assert.equal(noConsentResult.suppressionType, "no_marketing_consent");
		assert.ok(noConsentResult.reason?.includes("152-ФЗ"));

		// 2. With marketing consent, but has appointment today -> suppressed by service priority
		const visitCollisionResult = validateRecallInviteSafety(candidate, {
			consentMarketing: true,
			hasServiceAppointmentToday: true,
		});
		assert.equal(visitCollisionResult.allowed, false);
		assert.equal(
			visitCollisionResult.suppressionType,
			"service_priority_suppression",
		);
		assert.ok(visitCollisionResult.reason?.includes("запланирован приём"));

		// 3. With consent and no collision -> permitted
		const allowedResult = validateRecallInviteSafety(candidate, {
			consentMarketing: true,
			hasServiceAppointmentToday: false,
		});
		assert.equal(allowedResult.allowed, true);
	});
});
