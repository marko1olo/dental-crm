import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../../db/client.js";
import { appointments, clinics, patients } from "../../../db/schema.js";
import { withFixtureTenant } from "../../support/fixtureOrganizations.js";
import {
	CLINIC_ID,
	ManagerReportsTestContext,
	ORG_HEADERS,
	ORG_ID,
	setupReportsContext,
	teardownReportsContext,
} from "./fixture.js";

describe("отчёты руководителю: выручка и валидация периодов", () => {
	let ctx: ManagerReportsTestContext;
	let app: FastifyInstance;

	before(async () => {
		ctx = await setupReportsContext();
		app = ctx.app;
	});

	after(async () => {
		await teardownReportsContext(ctx);
	});

	test("в выручку идут только полученные деньги", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/revenue",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		// 50 000 запланированных и 7 000 возвращённых в выручку не входят.
		assert.equal(body.totalRub, 10_000, JSON.stringify(body));
		assert.equal(body.isEmpty, false);
		assert.equal(body.granularity, "day");
		assert.equal(body.points.length, 1);
		assert.equal(body.points[0].payingPatients, 1);
	});

	test("детализация по месяцам сворачивает точки", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/revenue?granularity=month",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.granularity, "month");
		assert.equal(body.totalRub, 10_000);
	});

	/**
	 * КАЛЕНДАРНУЮ ДАТУ В МГНОВЕНИЕ ПРЕВРАЩАЕТ СЕРВЕР, А НЕ БРАУЗЕР.
	 *
	 * ЧТО БЫЛО СЛОМАНО. Маршрут требовал полный ISO (z.string().datetime({ offset: true })),
	 * поэтому календарную дату из поля <input type="date"> в мгновение превращал КЛИЕНТ.
	 * Строка без смещения разбирается в поясе БРАУЗЕРА (9 часов разницы между Москвой и Камчаткой).
	 */
	test("календарная дата разрешается в поясе клиники, а не в поясе браузера", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const FAR_ZONE = "Asia/Kamchatka";
		const CALENDAR_DAY = "2026-05-01";
		// 00:30 первого мая на Камчатке (+12) — первая смена месяца.
		const firstShift = new Date("2026-04-30T12:30:00.000Z");

		const { shiftPatient, shiftAppointment } = await withFixtureTenant(
			ORG_ID,
			async () => {
				await db
					.update(clinics)
					.set({ timezone: FAR_ZONE })
					.where(eq(clinics.id, CLINIC_ID));
				const [seededPatient] = await db
					.insert(patients)
					.values({
						organizationId: ORG_ID,
						fullName: "Первая Смена Месяцевна",
					})
					.returning({ id: patients.id });
				const [seededAppointment] = await db
					.insert(appointments)
					.values({
						organizationId: ORG_ID,
						patientId: seededPatient?.id ?? "",
						status: "completed",
						startsAt: firstShift,
						endsAt: new Date(firstShift.getTime() + 30 * 60_000),
					})
					.returning({ id: appointments.id });
				return {
					shiftPatient: seededPatient,
					shiftAppointment: seededAppointment,
				};
			},
		);

		try {
			const byCalendarDate = await app.inject({
				method: "GET",
				url: `/api/reports/appointments?from=${CALENDAR_DAY}&to=${CALENDAR_DAY}`,
				headers: ORG_HEADERS,
			});
			assert.equal(byCalendarDate.statusCode, 200, byCalendarDate.body);
			const calendarBody = JSON.parse(byCalendarDate.body);

			assert.equal(
				calendarBody.period.from,
				"2026-04-30T12:00:00.000Z",
				`начало суток посчитано не в поясе клиники: ${calendarBody.period.from}`,
			);
			assert.equal(
				calendarBody.period.to,
				"2026-05-01T11:59:59.999Z",
				`конец суток посчитан не в поясе клиники: ${calendarBody.period.to}`,
			);
			assert.equal(
				calendarBody.total,
				1,
				"приём первой смены месяца не попал в отчёт по календарной дате: границы снова считаются в чужом поясе",
			);

			const asMoscowBrowserSent = await app.inject({
				method: "GET",
				url: "/api/reports/appointments?from=2026-04-30T21%3A00%3A00.000Z&to=2026-05-01T20%3A59%3A59.000Z",
				headers: ORG_HEADERS,
			});
			assert.equal(asMoscowBrowserSent.statusCode, 200, asMoscowBrowserSent.body);
			const moscowBody = JSON.parse(asMoscowBrowserSent.body);
			assert.equal(moscowBody.period.from, "2026-04-30T21:00:00.000Z");
			assert.equal(
				moscowBody.total,
				0,
				"московская граница внезапно захватила камчатскую первую смену: проверка перестала показывать дефект",
			);
		} finally {
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.delete(appointments)
					.where(eq(appointments.id, shiftAppointment?.id ?? ""));
				await db
					.delete(patients)
					.where(eq(patients.id, shiftPatient?.id ?? ""));
				await db
					.update(clinics)
					.set({ timezone: "Europe/Moscow" })
					.where(eq(clinics.id, CLINIC_ID));
			});
		}
	});

	test("полный ISO со смещением принимается и границы не переразбираются", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/appointments?from=2026-05-01T00%3A00%3A00%2B12%3A00&to=2026-05-01T23%3A59%3A59%2B12%3A00",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(
			body.period.from,
			"2026-04-30T12:00:00.000Z",
			`смещение +12:00 разобрано неверно: ${body.period.from}`,
		);
		assert.equal(
			body.period.to,
			"2026-05-01T11:59:59.000Z",
			`смещение +12:00 разобрано неверно: ${body.period.to}`,
		);
	});

	test("несуществующая календарная дата отклоняется, а не превращается в соседнюю", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		for (const broken of ["2026-02-30", "2026-13-01", "2026-05-00"]) {
			const response = await app.inject({
				method: "GET",
				url: `/api/reports/appointments?from=${broken}&to=2026-05-31`,
				headers: ORG_HEADERS,
			});
			assert.equal(response.statusCode, 400, `${broken} принят: ${response.body}`);
		}
	});

	test("слишком широкий период отклоняется, а не обрезается молча", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/revenue?from=2000-01-01T00:00:00Z&to=2030-01-01T00:00:00Z",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 400, response.body);
		assert.ok(JSON.parse(response.body).message.includes("длиннее"));
	});

	test("перевёрнутый период отклоняется", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/revenue?from=2026-07-20T00:00:00Z&to=2026-07-01T00:00:00Z",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 400, response.body);
		assert.ok(JSON.parse(response.body).message.includes("позже"));
	});

	test("данные чужой организации в отчёт не попадают", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/revenue",
			headers: { "x-organization-id": "dce70000-0000-4000-8000-0000000004ff" },
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.totalRub, 0);
		assert.equal(body.isEmpty, true);
	});
});
