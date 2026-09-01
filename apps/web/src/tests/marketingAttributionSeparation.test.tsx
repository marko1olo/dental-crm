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
		assert.ok(html.includes("Фича №28"));

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
});
