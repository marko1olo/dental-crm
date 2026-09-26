/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — todayQueueBoard.test.tsx
 *
 * Targeted Unit Tests for Today's Patient Shift Queue & Live Operational Board.
 * Parity with StomX Shift Queue (Мандаты 8c, 8d, 8e, 8n).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	buildPatientShiftQueue,
	PATIENT_SHIFT_QUEUE_TABS_META,
	OPERATIONAL_STATUS_META,
	type Appointment,
	type PatientOperationalStatus,
	type PatientQueueAction,
} from "@dental/shared";
import { TodayQueueBoard } from "../TodayQueueBoard";

// Cartoon emoji detector per Mandate 8d
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("TodayQueueBoard — Operational Shift Queue UI & 0-Click Actions", () => {
	const mockAppointments: Array<Partial<Appointment> & Record<string, any>> = [
		{
			id: "apt-1",
			patientName: "Барабаш С.В.",
			patientPhone: "+7 (999) 111-22-33",
			doctorUserId: "doc-1",
			doctorName: "Смирнова Е.А.",
			chairId: "chair-1",
			chairName: "Терапевтический",
			startsAt: "2026-09-25T09:00:00.000Z",
			endsAt: "2026-09-25T09:30:00.000Z",
			status: "confirmed",
			reason: "Лечение кариеса 1.6",
		},
		{
			id: "apt-2",
			patientName: "Иванов И.И.",
			patientPhone: "+7 (999) 222-33-44",
			doctorUserId: "doc-1",
			doctorName: "Смирнова Е.А.",
			chairId: "chair-1",
			chairName: "Терапевтический",
			startsAt: "2026-09-25T09:30:00.000Z",
			endsAt: "2026-09-25T10:00:00.000Z",
			status: "arrived",
			arrivedAt: "2026-09-25T09:20:00.000Z",
			reason: "Консультация",
		},
		{
			id: "apt-3",
			patientName: "Кузнецов А.П.",
			patientPhone: "+7 (999) 333-44-55",
			doctorUserId: "doc-2",
			doctorName: "Петров В.В.",
			chairId: "chair-2",
			chairName: "Хирургический",
			startsAt: "2026-09-25T10:00:00.000Z",
			endsAt: "2026-09-25T10:30:00.000Z",
			status: "in_treatment",
			inChairSince: "2026-09-25T10:00:00.000Z",
			reason: "Удаление зуба 3.8",
		},
		{
			id: "apt-4",
			patientName: "Сидорова О.М.",
			patientPhone: "+7 (999) 444-55-66",
			doctorUserId: "doc-1",
			doctorName: "Смирнова Е.А.",
			chairId: "chair-1",
			chairName: "Терапевтический",
			startsAt: "2026-09-25T10:30:00.000Z",
			endsAt: "2026-09-25T11:00:00.000Z",
			status: "in_treatment",
			comment: "Осмотр [ready_for_checkout]",
			reason: "Профгигиена Air-Flow",
		},
		{
			id: "apt-5",
			patientName: "Морозов Д.С.",
			patientPhone: "+7 (999) 555-66-77",
			doctorUserId: "doc-2",
			doctorName: "Петров В.В.",
			chairId: "chair-2",
			chairName: "Хирургический",
			startsAt: "2026-09-25T08:30:00.000Z",
			endsAt: "2026-09-25T09:00:00.000Z",
			status: "completed",
			reason: "Снятие швов",
		},
	];

	it("1. Renders TodayQueueBoard and all 5 operational segmented tabs", () => {
		const html = renderToString(
			<TodayQueueBoard
				appointments={mockAppointments}
				targetDateKey="2026-09-25"
			/>,
		);

		assert.ok(html.includes("Очередь смены дня"), "Title rendered");
		assert.ok(html.includes("data-testid=\"today-queue-board\""), "Board region rendered");
		assert.ok(html.includes("data-testid=\"queue-tab-all\""), "All tab rendered");
		assert.ok(html.includes("data-testid=\"queue-tab-waiting\""), "Waiting tab rendered");
		assert.ok(html.includes("data-testid=\"queue-tab-in_chair\""), "In-chair tab rendered");
		assert.ok(html.includes("data-testid=\"queue-tab-checkout\""), "Checkout tab rendered");
		assert.ok(html.includes("data-testid=\"queue-tab-completed\""), "Completed tab rendered");
	});

	it("2. Accurately renders patient cards and 0-click progression buttons", () => {
		const html = renderToString(
			<TodayQueueBoard
				appointments={mockAppointments}
				targetDateKey="2026-09-25"
			/>,
		);

		// apt-1: planned/confirmed -> button «Пациент пришел»
		assert.ok(html.includes("Барабаш С.В."), "apt-1 patient rendered");
		assert.ok(html.includes("Пациент пришел"), "0-click button 'Пациент пришел' rendered");

		// apt-2: arrived -> button «Пригласить в кабинет»
		assert.ok(html.includes("Иванов И.И."), "apt-2 patient rendered");
		assert.ok(html.includes("Пригласить в кабинет"), "0-click button 'Пригласить в кабинет' rendered");

		// apt-3: in_chair -> button «Завершить прием и отправить на кассу»
		assert.ok(html.includes("Кузнецов А.П."), "apt-3 patient rendered");
		assert.ok(
			html.includes("Завершить прием и отправить на кассу"),
			"0-click button 'Завершить прием и отправить на кассу' rendered",
		);

		// apt-4: ready_for_checkout -> button «Чек пробит»
		assert.ok(html.includes("Сидорова О.М."), "apt-4 patient rendered");
		assert.ok(html.includes("Чек пробит"), "0-click button 'Чек пробит' rendered");

		// apt-5: completed -> button «Возобновить прием»
		assert.ok(html.includes("Морозов Д.С."), "apt-5 patient rendered");
		assert.ok(html.includes("Возобновить прием"), "Secondary button 'Возобновить прием' rendered");
	});

	it("3. Displays clinical timers without cartoon emojis", () => {
		const html = renderToString(
			<TodayQueueBoard
				appointments={mockAppointments}
				targetDateKey="2026-09-25"
			/>,
		);

		assert.equal(
			hasCartoonEmojis(html),
			false,
			"TodayQueueBoard must have 0 cartoon emojis",
		);
	});

	it("4. Renders doctor and chair filter selectors when lists are provided", () => {
		const staffList = [
			{ id: "doc-1", name: "Смирнова Е.А." },
			{ id: "doc-2", name: "Петров В.В." },
		];
		const chairsList = [
			{ id: "chair-1", name: "Кабинет 1" },
			{ id: "chair-2", name: "Кабинет 2" },
		];

		const html = renderToString(
			<TodayQueueBoard
				appointments={mockAppointments}
				targetDateKey="2026-09-25"
				staffList={staffList}
				chairsList={chairsList}
			/>,
		);

		assert.ok(html.includes("Все врачи"), "Doctor filter select rendered");
		assert.ok(html.includes("Смирнова Е.А."), "Doctor option rendered");
		assert.ok(html.includes("Все кабинеты"), "Chair filter select rendered");
		assert.ok(html.includes("Кабинет 1"), "Chair option rendered");
	});

	it("5. Renders clean empty state when no appointments exist", () => {
		const html = renderToString(
			<TodayQueueBoard
				appointments={[]}
				targetDateKey="2026-09-25"
			/>,
		);

		assert.ok(
			html.includes("Записей на выбранный период не найдено"),
			"Clean empty state rendered",
		);
	});
});
