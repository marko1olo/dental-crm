import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Dashboard, Patient } from "@dental/shared";
import { QuickBookingDrawer } from "./QuickBookingDrawer";
import { useScheduleStore } from "../../store/scheduleStore";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawerTypes";

const mockPatients: Patient[] = [
	{
		id: "pat-1",
		organizationId: "org-1",
		fullName: "Иванов Иван Иванович",
		phone: "+7 999 111-22-33",
		email: null,
		notes: null,
		birthDate: "1990-05-15",
		gender: null,
		status: "active",
		balanceRub: 0,
		administrativeProfile: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	},
];

// biome-ignore lint/suspicious/noExplicitAny: mock dashboard
const mockDashboard: any = {
	patients: mockPatients,
	appointments: [],
	clinicSettings: {
		staff: [
			{ id: "doc-1", fullName: "Д-р Ковалев С. П.", role: "doctor", active: true },
		],
		chairs: [
			{ id: "chair-1", name: "Кабинет 1", active: true },
		],
		profile: {
			mode: "solo_doctor",
			timezone: "Europe/Moscow",
		},
	},
};

describe("Stage Booking from Treatment Plan Integration (DentalPRO Parity)", () => {
	it("renders stage booking banner with stage number, title, and estimated duration badge", () => {
		const stageSlot: QuickBookingSlotInfo = {
			dateKey: "2026-08-25",
			startTime: "11:00",
			patientId: "pat-1",
			patientName: "Иванов Иван Иванович",
			treatmentPlanId: "PLAN-101",
			stageId: "stage_2_therapy",
			stageNumber: 2,
			stageTitle: "Терапевтическая санация полости рта",
			estimatedDurationMinutes: 45,
			durationMinutes: 45,
		};

		const html = renderToStaticMarkup(
			React.createElement(QuickBookingDrawer, {
				isOpen: true,
				onClose: () => {},
				dashboard: mockDashboard as Dashboard,
				initialSlot: stageSlot,
			}),
		);

		assert.ok(html.includes("data-testid=\"stage-booking-banner\""), "должен отрисовывать баннер этапа плана");
		assert.ok(html.includes("data-testid=\"stage-booking-title\""), "должен содержать testid заголовка этапа");
		assert.ok(html.includes("Этап 2:"), "должен отображать номер этапа");
		assert.ok(html.includes("Терапевтическая санация полости рта"), "должен отображать название этапа");
		assert.ok(html.includes("data-testid=\"stage-booking-duration-badge\""), "должен содержать бейдж рекомендуемого времени");
		assert.ok(html.includes("45 мин"), "бейдж должен содержать длительность 45 мин");
		assert.ok(html.includes("Привязка к плану лечения"), "должна быть отметка привязки к плану");
	});

	it("renders detailed list of 804n procedures assigned to stage with tooth and price", () => {
		const stageSlot: QuickBookingSlotInfo = {
			dateKey: "2026-08-25",
			startTime: "12:00",
			patientId: "pat-1",
			patientName: "Иванов Иван Иванович",
			treatmentPlanId: "PLAN-101",
			stageId: "stage_2_therapy",
			stageNumber: 1,
			stageTitle: "Лечение кариеса",
			services: [
				{
					id: "srv-1",
					code804n: "A16.07.002",
					title: "Восстановление зуба пломбой (глубокий кариес)",
					toothNumber: 16,
					priceRub: 4500,
					quantity: 1,
				},
				{
					id: "srv-2",
					code804n: "A16.07.008",
					title: "Пломбирование корневого канала",
					toothNumber: 16,
					priceRub: 3200,
					quantity: 1,
				},
			],
			estimatedDurationMinutes: 60,
		};

		const html = renderToStaticMarkup(
			React.createElement(QuickBookingDrawer, {
				isOpen: true,
				onClose: () => {},
				dashboard: mockDashboard as Dashboard,
				initialSlot: stageSlot,
			}),
		);

		const normalizedHtml = html.replace(/\u00a0/g, " ");
		assert.ok(normalizedHtml.includes("data-testid=\"stage-booking-services-list\""), "должен отображать список процедур этапа");
		assert.ok(normalizedHtml.includes("A16.07.002"), "должен содержать код 804н первой процедуры");
		assert.ok(normalizedHtml.includes("Восстановление зуба пломбой"), "должен отображать название первой процедуры");
		assert.ok(normalizedHtml.includes("4 500 ₽"), "должен отображать цену первой процедуры");
		assert.ok(normalizedHtml.includes("A16.07.008"), "должен содержать код 804н второй процедуры");
		assert.ok(normalizedHtml.includes("3 200 ₽"), "должен отображать цену второй процедуры");
		assert.ok(normalizedHtml.includes("зуб 16"), "должен отображать номер зуба");
	});

	it("prefills patient card and sets reason to stage title", () => {
		const stageSlot: QuickBookingSlotInfo = {
			dateKey: "2026-08-25",
			startTime: "15:00",
			patientId: "pat-1",
			patientName: "Иванов Иван Иванович",
			stageTitle: "Хирургический этап: удаление зуба мудрости",
			treatmentPlanId: "PLAN-999",
		};

		const html = renderToStaticMarkup(
			React.createElement(QuickBookingDrawer, {
				isOpen: true,
				onClose: () => {},
				dashboard: mockDashboard as Dashboard,
				initialSlot: stageSlot,
			}),
		);

		assert.ok(html.includes("Иванов Иван Иванович"), "должен автоматически выбрать пациента из базы");
		assert.ok(html.includes("Хирургический этап: удаление зуба мудрости"), "повод обращения должен быть предзаполнен");
	});

	it("integrates with useScheduleStore pendingStageBooking state", () => {
		const stageBookingData: QuickBookingSlotInfo = {
			treatmentPlanId: "PLAN-XYZ",
			stageId: "stage_3_orthopedics",
			stageNumber: 3,
			stageTitle: "Ортопедический этап: примерка коронки",
			patientId: "pat-1",
			patientName: "Иванов Иван Иванович",
			estimatedDurationMinutes: 60,
			services: [
				{
					code804n: "A16.07.004",
					title: "Установка временной коронки",
					priceRub: 6000,
				},
			],
		};

		// 1. Устанавливаем отложенную запись этапа
		useScheduleStore.getState().setPendingStageBooking(stageBookingData);
		const pending = useScheduleStore.getState().pendingStageBooking;

		assert.ok(pending !== null, "pendingStageBooking должен быть записан в Zustand store");
		assert.equal(pending?.treatmentPlanId, "PLAN-XYZ");
		assert.equal(pending?.stageTitle, "Ортопедический этап: примерка коронки");
		assert.equal(pending?.stageNumber, 3);
		assert.equal(pending?.estimatedDurationMinutes, 60);

		// 2. Сброс после потребления
		useScheduleStore.getState().setPendingStageBooking(null);
		assert.equal(useScheduleStore.getState().pendingStageBooking, null, "pendingStageBooking должен очищаться");
	});
});
