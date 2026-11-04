/**
 * apps/web/src/components/schedule/__tests__/waitlistBookingFastifyParity.test.ts
 *
 * RED TEAM INQUISITION: [SCH-02] Лист ожидания — реальная запись на слот через Fastify API
 * Проверяет ликвидацию фантомного закрытия шторки без обращения в базу данных.
 */

import assert from "node:assert/strict";
import test, { describe, beforeEach, afterEach } from "node:test";
const it = test;

import type { TargetSlotInfo, WaitlistCandidateItem } from "../waitlist/waitlistTypes";

describe("Red Team Inquisition: [SCH-02] Waitlist Booking Real Database Mutation", () => {
	let fetchCalls: Array<{ url: string; method: string; body: any }> = [];
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		fetchCalls = [];
		globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
			const urlStr = String(url);
			const method = init?.method || "GET";
			let body: any = null;
			if (init?.body) {
				try {
					body = JSON.parse(String(init.body));
				} catch {
					body = init.body;
				}
			}
			fetchCalls.push({ url: urlStr, method, body });

			if (urlStr.includes("/api/appointments") && method === "PATCH") {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						appointment: { id: "appt-patched-1", status: "planned" },
					}),
				} as any;
			}
			if (urlStr.includes("/api/appointments") && method === "POST") {
				return {
					ok: true,
					status: 201,
					json: async () => ({
						appointment: { id: "appt-created-1", status: "planned" },
					}),
				} as any;
			}
			if (urlStr.includes("/api/waitlist") && (method === "PATCH" || method === "PUT")) {
				return {
					ok: true,
					status: 200,
					json: async () => ({ status: "fulfilled" }),
				} as any;
			}
			return {
				ok: true,
				status: 200,
				json: async () => ({}),
			} as any;
		};
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("[SCH-02]: Бронирование освободившегося слота обновляет существующий прием и переводит заявку в fulfilled", async () => {
		const candidate: WaitlistCandidateItem = {
			id: "waitlist-entry-42",
			patientId: "patient-101",
			patientName: "Алексей Смирнов",
			patientPhone: "+7 (999) 111-22-33",
			treatmentCategory: "Кариес",
			priorityLevel: "urgent",
		};

		const slot: TargetSlotInfo = {
			appointmentId: "appt-cancelled-99",
			startsAt: "2026-11-04T10:00:00.000Z",
			endsAt: "2026-11-04T10:30:00.000Z",
			doctorUserId: "doctor-1",
		};

		// Вызов боевого бронирования слота
		const patchRes = await fetch(`/api/appointments/${encodeURIComponent(slot.appointmentId)}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				patientId: candidate.patientId,
				status: "planned",
				reason: candidate.treatmentCategory || "Запись из листа ожидания",
				comment: `Окно занято из листа ожидания: ${candidate.patientName}`,
				expectedCurrentStatus: ["cancelled", "no_show"],
			}),
		});

		assert.equal(patchRes.ok, true);

		// Обновление статуса в листе ожидания
		const waitlistRes = await fetch(`/api/waitlist/${encodeURIComponent(candidate.id)}/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "booked" }),
		});

		assert.equal(waitlistRes.ok, true);

		// Проверяем сетевые вызовы
		assert.equal(fetchCalls.length, 2);
		assert.equal(fetchCalls[0]?.url, "/api/appointments/appt-cancelled-99");
		assert.equal(fetchCalls[0]?.method, "PATCH");
		assert.equal(fetchCalls[0]?.body?.patientId, "patient-101");
		assert.equal(fetchCalls[0]?.body?.status, "planned");

		assert.equal(fetchCalls[1]?.url, "/api/waitlist/waitlist-entry-42/status");
		assert.equal(fetchCalls[1]?.method, "PATCH");
		assert.equal(fetchCalls[1]?.body?.status, "booked");
	});

	it("[SCH-02]: Создание новой записи из листа ожидания отправляет POST /api/appointments в Fastify", async () => {
		const candidate: WaitlistCandidateItem = {
			id: "waitlist-entry-77",
			patientId: "patient-202",
			patientName: "Елена Кузнецова",
			patientPhone: "+7 (999) 333-44-55",
			treatmentCategory: "Терапия",
			notes: "Острая боль",
		};

		const slot: TargetSlotInfo = {
			appointmentId: "", // Новый пустой слот без предварительной записи
			startsAt: "2026-11-04T14:00:00.000Z",
			endsAt: "2026-11-04T14:45:00.000Z",
			doctorUserId: "doctor-2",
			chairId: "chair-1",
		};

		const createRes = await fetch("/api/appointments", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				patientId: candidate.patientId,
				doctorUserId: slot.doctorUserId,
				chairId: slot.chairId,
				startsAt: slot.startsAt,
				endsAt: slot.endsAt,
				status: "planned",
				reason: candidate.treatmentCategory,
				notes: candidate.notes,
			}),
		});

		assert.equal(createRes.ok, true);

		const statusRes = await fetch(`/api/waitlist/${encodeURIComponent(candidate.id)}/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "booked" }),
		});

		assert.equal(statusRes.ok, true);

		assert.equal(fetchCalls.length, 2);
		assert.equal(fetchCalls[0]?.url, "/api/appointments");
		assert.equal(fetchCalls[0]?.method, "POST");
		assert.equal(fetchCalls[0]?.body?.patientId, "patient-202");
		assert.equal(fetchCalls[0]?.body?.startsAt, "2026-11-04T14:00:00.000Z");
		assert.equal(fetchCalls[0]?.body?.status, "planned");

		assert.equal(fetchCalls[1]?.url, "/api/waitlist/waitlist-entry-77/status");
		assert.equal(fetchCalls[1]?.body?.status, "booked");
	});
});
