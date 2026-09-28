/**
 * DENTE Dental CRM — Leads Connection, Fastify Endpoints & SSOT Contracts Test Suite
 *
 * MANDATES INQUISITOR 2:
 * 1. Zero Sycophancy / T.A.R.S. 100%: Presumption of defect, verified contracts.
 * 2. NO BLOAT: Clean utilitarian code, <=800 lines.
 * 3. NO DUPLICATES: Single source of truth for Lead schemas and types.
 * 4. CONNECT BACKEND AND FRONTEND: Real Fastify endpoints (GET, POST, PATCH /api/leads/:id, POST /api/leads/:id/convert).
 * 5. DOCTOR AUTONOMY (Mandate 8e): <= 2 clicks lead conversion without mandatory chair/staff friction.
 */

import assert from "node:assert/strict";
import test, { describe, it, beforeEach, afterEach } from "node:test";
import {
	type Lead,
	type LeadStatus,
	LEAD_STATUS_VALUES,
	useLeadsStore,
} from "../../../store/leadsStore";
import {
	COLUMNS,
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
	bookingFailureMessage,
	isLeadBookingDisabled,
	resolveLeadBookingChairs,
	resolveLeadBookingStaff,
	resolveLeadVisitMinutes,
} from "../leadsKanbanTypes";
import {
	type FunnelLead,
	detectLeadStage,
	filterLeadsByPeriod,
} from "../leadsFunnelEngine";

describe("INQUISITOR 2: Leads & CRM Funnel Domain — SSOT & Connection Verification", () => {
	describe("1. SSOT Schema & Types Parity", () => {
		it("LEAD_STATUS_VALUES matches canonical 6 lead statuses", () => {
			const expectedStatuses: LeadStatus[] = [
				"new",
				"contacted",
				"consult_booked",
				"showed_up",
				"no_answer",
				"trash",
			];
			assert.deepStrictEqual([...LEAD_STATUS_VALUES], expectedStatuses);
		});

		it("Kanban COLUMNS IDs exactly match canonical LeadStatus values", () => {
			const columnIds = COLUMNS.map((c) => c.id);
			assert.strictEqual(columnIds.length, 6);
			for (const status of LEAD_STATUS_VALUES) {
				assert.ok(
					columnIds.includes(status),
					`Kanban COLUMNS must include status "${status}"`,
				);
			}
		});

		it("FunnelLead is compatible with Lead including createdAt, notes and expectedRevenue", () => {
			const fullLead: Lead = {
				id: "lead-001",
				name: "Анна Смирнова",
				phone: "+7 (999) 000-11-22",
				source: "Яндекс.Директ",
				status: "consult_booked",
				expectedRevenue: "25000",
				notes: "Острая боль 36 зуба",
				createdAt: "2026-09-20T10:00:00.000Z",
			};

			const funnelLead: FunnelLead = fullLead;
			assert.strictEqual(funnelLead.id, "lead-001");
			assert.strictEqual(funnelLead.name, "Анна Смирнова");
			assert.strictEqual(funnelLead.status, "consult_booked");
			assert.strictEqual(funnelLead.expectedRevenue, "25000");
			assert.strictEqual(funnelLead.createdAt, "2026-09-20T10:00:00.000Z");

			// Stage detection verifies status correctly
			const stage = detectLeadStage(funnelLead);
			assert.strictEqual(stage, "consult_booked");
		});

		it("filterLeadsByPeriod filters real Leads by createdAt timestamp without losing data", () => {
			const now = new Date("2026-09-25T12:00:00.000Z");
			const leads: FunnelLead[] = [
				{
					id: "lead-today",
					name: "Сегодняшний",
					status: "new",
					createdAt: "2026-09-25T08:00:00.000Z",
				},
				{
					id: "lead-old",
					name: "Старый",
					status: "contacted",
					createdAt: "2026-08-01T08:00:00.000Z",
				},
			];

			const filteredToday = filterLeadsByPeriod(leads, "today", now);
			assert.strictEqual(filteredToday.length, 1);
			assert.strictEqual(filteredToday[0]?.id, "lead-today");

			const filteredAll = filterLeadsByPeriod(leads, "all", now);
			assert.strictEqual(filteredAll.length, 2);
		});
	});

	describe("2. Fastify Endpoints & Store Connection", () => {
		const originalFetch = globalThis.fetch;
		let fetchCalls: { url: string; method: string; body?: unknown }[] = [];

		beforeEach(() => {
			fetchCalls = [];
			useLeadsStore.setState({
				leads: [
					{
						id: "lead-123",
						name: "Петр Васильев",
						phone: "+79998887766",
						status: "new",
						source: "2gis",
						expectedRevenue: "12000",
					},
				],
				isLoading: false,
				error: null,
			});
		});

		afterEach(() => {
			globalThis.fetch = originalFetch;
		});

		it("updateLeadDetails calls real PATCH /api/leads/:id with partial payload", async () => {
			globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = input.toString();
				const method = init?.method ?? "GET";
				const body = init?.body ? JSON.parse(init.body.toString()) : undefined;
				fetchCalls.push({ url, method, body });

				return new Response(
					JSON.stringify({
						id: "lead-123",
						name: "Петр Васильев (Обновлен)",
						phone: "+79998887766",
						status: "contacted",
						source: "2gis",
						expectedRevenue: "15000",
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}) as typeof fetch;

			await useLeadsStore.getState().updateLeadDetails("lead-123", {
				name: "Петр Васильев (Обновлен)",
				status: "contacted",
				expectedRevenue: "15000",
			});

			assert.strictEqual(fetchCalls.length, 1);
			assert.match(fetchCalls[0]!.url, /\/api\/leads\/lead-123$/);
			assert.strictEqual(fetchCalls[0]!.method, "PATCH");
			assert.deepStrictEqual(fetchCalls[0]!.body, {
				name: "Петр Васильев (Обновлен)",
				status: "contacted",
				expectedRevenue: "15000",
			});

			// Store updated atomically
			const leadInStore = useLeadsStore
				.getState()
				.leads.find((l) => l.id === "lead-123");
			assert.strictEqual(leadInStore?.name, "Петр Васильев (Обновлен)");
			assert.strictEqual(leadInStore?.status, "contacted");
		});

		it("convertLeadToAppointment calls real POST /api/leads/:id/convert and updates store status to consult_booked", async () => {
			globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = input.toString();
				const method = init?.method ?? "GET";
				const body = init?.body ? JSON.parse(init.body.toString()) : undefined;
				fetchCalls.push({ url, method, body });

				return new Response(
					JSON.stringify({
						patient: { id: "pat-999", fullName: "Петр Васильев" },
						appointment: {
							id: "app-888",
							doctorUserId: FALLBACK_SOLO_DOCTOR.id,
							chairId: FALLBACK_DEFAULT_CHAIR.id,
							status: "planned",
						},
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}) as typeof fetch;

			const result = await useLeadsStore.getState().convertLeadToAppointment(
				"lead-123",
				{
					appointmentStart: "2026-09-26T10:00:00.000Z",
					appointmentEnd: "2026-09-26T10:30:00.000Z",
					chairId: FALLBACK_DEFAULT_CHAIR.id,
					doctorId: FALLBACK_SOLO_DOCTOR.id,
				},
			);

			assert.strictEqual(fetchCalls.length, 1);
			assert.match(fetchCalls[0]!.url, /\/api\/leads\/lead-123\/convert$/);
			assert.strictEqual(fetchCalls[0]!.method, "POST");
			assert.ok(result.patient);
			assert.ok(result.appointment);

			// Lead status in store automatically updated to consult_booked without needing a second PATCH call
			const leadInStore = useLeadsStore
				.getState()
				.leads.find((l) => l.id === "lead-123");
			assert.strictEqual(leadInStore?.status, "consult_booked");
		});

		it("updateLeadStatus calls real PATCH /api/leads/:id/status and handles rollback on network failure", async () => {
			globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = input.toString();
				const method = init?.method ?? "GET";
				fetchCalls.push({ url, method });

				return new Response(
					JSON.stringify({ message: "Ошибка соединения с СУБД" }),
					{ status: 500 },
				);
			}) as typeof fetch;

			await assert.rejects(
				async () => {
					await useLeadsStore.getState().updateLeadStatus("lead-123", "trash");
				},
				{
					message: /Ошибка соединения с СУБД|Статус обращения не изменён/,
				},
			);

			assert.strictEqual(fetchCalls.length, 1);
			assert.match(fetchCalls[0]!.url, /\/api\/leads\/lead-123\/status$/);
			assert.strictEqual(fetchCalls[0]!.method, "PATCH");

			// Rolled back to "new"
			const leadInStore = useLeadsStore
				.getState()
				.leads.find((l) => l.id === "lead-123");
			assert.strictEqual(leadInStore?.status, "new");
		});
	});

	describe("3. Doctor Autonomy & <= 2 Clicks Lead Conversion (Mandate 8e & 8n)", () => {
		it("Conversion requires <= 2 user actions: opening dialog (1) and submitting with defaults (2)", () => {
			// Zero configured staff and chairs
			const unconfiguredStaff: Parameters<typeof resolveLeadBookingStaff>[0] = [];
			const unconfiguredChairs: Parameters<typeof resolveLeadBookingChairs>[0] = [];

			// 1. System resolves defaults automatically without forcing operator to configure chairs/assistants
			const effectiveDoctors = resolveLeadBookingStaff(unconfiguredStaff);
			const effectiveChairs = resolveLeadBookingChairs(unconfiguredChairs);
			const duration = resolveLeadVisitMinutes(null);

			assert.strictEqual(effectiveDoctors[0]?.id, FALLBACK_SOLO_DOCTOR.id);
			assert.strictEqual(effectiveChairs[0]?.id, FALLBACK_DEFAULT_CHAIR.id);
			assert.strictEqual(duration, 30);

			// 2. Submit button is never blocked by lack of configured staff/chairs
			const disabledWhenIdle = isLeadBookingDisabled(false);
			assert.strictEqual(disabledWhenIdle, false, "Submit must NOT be disabled");

			// 3. Submit button is disabled only during active in-flight request
			const disabledWhenBooking = isLeadBookingDisabled(true);
			assert.strictEqual(disabledWhenBooking, true, "Submit must be disabled while booking");
		});

		it("bookingFailureMessage extracts server Russian message and formats error codes", async () => {
			const res409 = new Response(
				JSON.stringify({
					error: "LeadAlreadyConverted",
					message: "Лид уже был сконвертирован в запись другим администратором.",
				}),
				{ status: 409 },
			);
			const msg409 = await bookingFailureMessage(res409);
			assert.strictEqual(
				msg409,
				"Лид уже был сконвертирован в запись другим администратором.",
			);

			const res404 = new Response(
				JSON.stringify({ error: "Lead not found" }),
				{ status: 404 },
			);
			const msg404 = await bookingFailureMessage(res404);
			assert.match(msg404, /Обращение уже удалено или записано кем-то другим/);

			const resDoctorNotFound = new Response(
				JSON.stringify({ error: "DoctorNotFound" }),
				{ status: 400 },
			);
			const msgDoctor = await bookingFailureMessage(resDoctorNotFound);
			assert.match(msgDoctor, /Выбранный врач больше не работает в клинике/);
		});
	});
});
