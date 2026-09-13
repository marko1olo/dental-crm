import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TomorrowRemindersModal } from "../TomorrowRemindersModal.js";
import type { Dashboard, Appointment, Patient } from "@dental/shared";

describe("TomorrowRemindersModal Component Suite", () => {
	const mockTomorrowIso = "2026-08-26";

	const mockDashboard: Dashboard = {
		clinicSettings: {
			profile: {
				clinicName: "Стоматология «ДЕНТЕ Плюс»",
				address: "Москва, ул. Ленина, 25",
				phone: "+7 (495) 777-88-99",
				timezone: "Europe/Moscow",
			},
			staff: [
				{
					id: "doc-1",
					fullName: "Иванов Иван Иванович",
					specialties: ["therapist"],
					active: true,
					role: "doctor",
				},
			],
			chairs: [
				{ id: "chair-1", name: "Кабинет 1", active: true },
			],
		},
		patients: [
			{
				id: "pat-1",
				fullName: "Смирнова Анна Сергеевна",
				phone: "+7 (916) 123-45-67",
				allergies: "Лидокаин",
			} as unknown as Patient,
		],
		appointments: [
			{
				id: "appt-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-26T10:00:00.000Z",
				endsAt: "2026-08-26T11:00:00.000Z",
				status: "planned",
				reason: "Лечение кариеса",
			} as unknown as Appointment,
		],
	} as unknown as Dashboard;

	it("renders nothing when isOpen is false", () => {
		const html = renderToStaticMarkup(
			<TomorrowRemindersModal
				isOpen={false}
				onClose={() => {}}
				dashboard={mockDashboard}
			/>,
		);
		assert.equal(html, "");
	});

	it("renders modal structure with multi-channel actions, patient details and 1-click controls when open", () => {
		const html = renderToStaticMarkup(
			<TomorrowRemindersModal
				isOpen={true}
				onClose={() => {}}
				dashboard={mockDashboard}
				targetDateIso={mockTomorrowIso}
			/>,
		);

		assert.ok(html.includes("data-testid=\"tomorrow-reminders-modal\""), "Renders modal testid");
		assert.ok(html.includes("Напоминания на завтра"), "Renders modal title");
		assert.ok(html.includes("Смирнова Анна Сергеевна"), "Renders patient name");
		assert.ok(html.includes("+7 (916) 123-45-67"), "Renders patient phone");
		assert.ok(html.includes("Иванов Иван Иванович"), "Renders doctor name");
		assert.ok(html.includes("Копировать все"), "Renders copy all button");
		assert.ok(html.includes("Разослать все (Каскад)"), "Renders cascade dispatch button");
		assert.ok(html.includes("WhatsApp"), "Renders WhatsApp channel");
		assert.ok(html.includes("SMS"), "Renders SMS channel");
	});
});
