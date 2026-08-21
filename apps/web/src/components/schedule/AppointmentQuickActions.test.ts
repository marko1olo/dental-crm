import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	AppointmentQuickActions,
	type QuickActionStatus,
} from "./AppointmentQuickActions";

describe("AppointmentQuickActions", () => {
	it("renders all 6 status pills with correct Russian labels and accessible attributes", () => {
		const html = renderToString(
			React.createElement(AppointmentQuickActions, {
				appointmentId: "appt-123",
				currentStatus: "planned",
				patientName: "Иванов Иван Иванович",
				onStatusChange: () => {},
			}),
		);

		assert.ok(html.includes("Пришел"), "должна быть кнопка «Пришел»");
		assert.ok(html.includes("В кресле"), "должна быть кнопка «В кресле»");
		assert.ok(html.includes("Завершен"), "должна быть кнопка «Завершен»");
		assert.ok(html.includes("Подтвердить"), "должна быть кнопка «Подтвердить»");
		assert.ok(html.includes("Опоздал"), "должна быть кнопка «Опоздал»");
		assert.ok(html.includes("Не пришел"), "должна быть кнопка «Не пришел»");
		assert.ok(
			html.includes('data-testid="appointment-quick-actions-appt-123"'),
			"должен быть data-testid с ID записи",
		);
		assert.ok(
			html.includes('role="toolbar"'),
			"должен быть role=toolbar для доступности клавиатуры",
		);
	});

	it("marks current status as active and pressed", () => {
		const html = renderToString(
			React.createElement(AppointmentQuickActions, {
				appointmentId: "appt-456",
				currentStatus: "arrived",
				patientName: "Петрова Анна Сергеевна",
				onStatusChange: () => {},
			}),
		);

		assert.ok(html.includes('aria-pressed="true"'), "активный статус должен иметь aria-pressed=true");
	});

	it("disables buttons when disabled prop is true", () => {
		const html = renderToString(
			React.createElement(AppointmentQuickActions, {
				appointmentId: "appt-789",
				currentStatus: "planned",
				patientName: "Сидоров Алексей",
				disabled: true,
				onStatusChange: () => {},
			}),
		);

		assert.ok(html.includes("disabled"), "кнопки должны быть заблокированы при disabled=true");
	});

	it("locks closed visit statuses when appointment has active open visit", () => {
		const lockedStatuses = new Set<QuickActionStatus>(["completed", "no_show"]);
		const html = renderToString(
			React.createElement(AppointmentQuickActions, {
				appointmentId: "appt-lock",
				currentStatus: "in_treatment",
				patientName: "Смирнов Павел",
				appointmentHasOpenVisit: true,
				// biome-ignore lint/suspicious/noExplicitAny: test set
				activeVisitLockedAppointmentStatuses: lockedStatuses as any,
				onStatusChange: () => {},
			}),
		);

		assert.ok(html.includes("Статус заблокирован"), "подсказка должна указывать на блокировку открытым визитом");
	});
});
