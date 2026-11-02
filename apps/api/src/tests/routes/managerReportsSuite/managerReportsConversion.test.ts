import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../../db/client.js";
import { appointments, clinics, patients } from "../../../db/schema.js";
import { currentMonthPeriod } from "../../../services/reports/managerReports.js";
import { withFixtureTenant } from "../../support/fixtureOrganizations.js";
import {
	CLINIC_ID,
	ManagerReportsTestContext,
	ORG_HEADERS,
	ORG_ID,
	setupReportsContext,
	teardownReportsContext,
} from "./fixture.js";

describe("отчёты руководителю: воронка приемов, конверсия и эффект напоминаний", () => {
	let ctx: ManagerReportsTestContext;
	let app: FastifyInstance;

	before(async () => {
		ctx = await setupReportsContext();
		app = ctx.app;
	});

	after(async () => {
		await teardownReportsContext(ctx);
	});

	test("воронка приёмов даёт потери и доли", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/appointments",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		assert.equal(body.total, 4);
		assert.equal(body.byStatus.completed, 2);
		assert.equal(body.byStatus.cancelled, 1);
		assert.equal(body.byStatus.no_show, 1);
		// Именно этот показатель клиника уменьшает напоминаниями.
		assert.equal(body.lostAppointments, 2);
		assert.equal(body.completionRate, 0.5);
	});

	test("первичный считается по первому приёму за всю историю, а не в периоде", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/patient-flow",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		// «Старый» пациент был на приёме год назад, поэтому в этом месяце он
		// повторный. «Новый» — первичный. Считать «первый в периоде» нельзя:
		// тогда оба оказались бы первичными.
		assert.equal(body.newTotal, 1, JSON.stringify(body));
		assert.equal(body.returningTotal, 1, JSON.stringify(body));
	});

	/**
	 * МЕСЯЦ ВОРОНКИ — КАЛЕНДАРНОЕ ПОНЯТИЕ ПОЯСА КЛИНИКИ, А НЕ ПОЯСА СЕССИИ БАЗЫ.
	 */
	test("месяц воронки берётся в поясе клиники, а не в поясе сессии базы", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const FAR_ZONE = "Asia/Kamchatka";
		const monthIn = (zone: string, at: Date): string => {
			const parts = new Map(
				new Intl.DateTimeFormat("en-CA", {
					timeZone: zone,
					year: "numeric",
					month: "2-digit",
				})
					.formatToParts(at)
					.map((part) => [part.type, part.value]),
			);
			return `${parts.get("year")}-${parts.get("month")}`;
		};

		const clinicMonthStart = currentMonthPeriod(new Date(), FAR_ZONE).from;
		const justAfterMonthStart = new Date(
			clinicMonthStart.getTime() + 30 * 60_000,
		);
		const clinicMonth = monthIn(FAR_ZONE, justAfterMonthStart);
		const previousMonth = monthIn(
			FAR_ZONE,
			new Date(clinicMonthStart.getTime() - 60 * 60_000),
		);

		const { boundaryPatient, boundaryAppointment } = await withFixtureTenant(
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
						fullName: "Ночной Пациент Границевич",
					})
					.returning({ id: patients.id });
				const [seededAppointment] = await db
					.insert(appointments)
					.values({
						organizationId: ORG_ID,
						patientId: seededPatient?.id ?? "",
						status: "completed",
						startsAt: justAfterMonthStart,
						endsAt: new Date(justAfterMonthStart.getTime() + 30 * 60_000),
					})
					.returning({ id: appointments.id });
				return {
					boundaryPatient: seededPatient,
					boundaryAppointment: seededAppointment,
				};
			},
		);

		try {
			const from = new Date(
				clinicMonthStart.getTime() - 2 * 60 * 60_000,
			).toISOString();
			const response = await app.inject({
				method: "GET",
				url: `/api/reports/patient-flow?from=${encodeURIComponent(from)}`,
				headers: ORG_HEADERS,
			});
			assert.equal(response.statusCode, 200, response.body);
			const body = JSON.parse(response.body);
			const buckets = body.points.map(
				(point: { bucket: string }) => point.bucket,
			);

			assert.ok(
				buckets.includes(clinicMonth),
				`${clinicMonth} нет в ${JSON.stringify(buckets)}`,
			);
			assert.ok(
				!buckets.includes(previousMonth),
				`приём попал в предыдущий месяц ${previousMonth}: месяц снова считается в поясе сессии — ${JSON.stringify(buckets)}`,
			);
		} finally {
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.delete(appointments)
					.where(eq(appointments.id, boundaryAppointment?.id ?? ""));
				await db
					.delete(patients)
					.where(eq(patients.id, boundaryPatient?.id ?? ""));
				await db
					.update(clinics)
					.set({ timezone: "Europe/Moscow" })
					.where(eq(clinics.id, CLINIC_ID));
			});
		}
	});

	/**
	 * ПОЯС ЧИТАЕТСЯ И ТОГДА, КОГДА КЛИЕНТ ПРИСЛАЛ ОБЕ ГРАНИЦЫ ПЕРИОДА.
	 */
	test("месяц воронки берётся в поясе клиники и когда клиент прислал обе границы", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const FAR_ZONE = "Asia/Kamchatka";
		const monthIn = (zone: string, at: Date): string => {
			const parts = new Map(
				new Intl.DateTimeFormat("en-CA", {
					timeZone: zone,
					year: "numeric",
					month: "2-digit",
				})
					.formatToParts(at)
					.map((part) => [part.type, part.value]),
			);
			return `${parts.get("year")}-${parts.get("month")}`;
		};

		const clinicMonthStart = currentMonthPeriod(new Date(), FAR_ZONE).from;
		const justAfterMonthStart = new Date(
			clinicMonthStart.getTime() + 30 * 60_000,
		);
		const clinicMonth = monthIn(FAR_ZONE, justAfterMonthStart);
		const previousMonth = monthIn(
			FAR_ZONE,
			new Date(clinicMonthStart.getTime() - 60 * 60_000),
		);

		const { boundaryPatient, boundaryAppointment } = await withFixtureTenant(
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
						fullName: "Панельный Пациент Границевич",
					})
					.returning({ id: patients.id });
				const [seededAppointment] = await db
					.insert(appointments)
					.values({
						organizationId: ORG_ID,
						patientId: seededPatient?.id ?? "",
						status: "completed",
						startsAt: justAfterMonthStart,
						endsAt: new Date(justAfterMonthStart.getTime() + 30 * 60_000),
					})
					.returning({ id: appointments.id });
				return {
					boundaryPatient: seededPatient,
					boundaryAppointment: seededAppointment,
				};
			},
		);

		try {
			const from = new Date(
				clinicMonthStart.getTime() - 3 * 60 * 60_000,
			).toISOString();
			const to = new Date(
				justAfterMonthStart.getTime() + 3 * 60 * 60_000,
			).toISOString();
			const response = await app.inject({
				method: "GET",
				url: `/api/reports/patient-flow?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
				headers: ORG_HEADERS,
			});
			assert.equal(response.statusCode, 200, response.body);
			const body = JSON.parse(response.body);
			const buckets = body.points.map(
				(point: { bucket: string }) => point.bucket,
			);

			assert.ok(
				buckets.includes(clinicMonth),
				`${clinicMonth} нет в ${JSON.stringify(buckets)}: с обеими границами маршрут снова не читает пояс клиники`,
			);
			assert.ok(
				!buckets.includes(previousMonth),
				`приём попал в предыдущий месяц ${previousMonth}: с обеими границами месяц считается в поясе сессии — ${JSON.stringify(buckets)}`,
			);
		} finally {
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.delete(appointments)
					.where(eq(appointments.id, boundaryAppointment?.id ?? ""));
				await db
					.delete(patients)
					.where(eq(patients.id, boundaryPatient?.id ?? ""));
				await db
					.update(clinics)
					.set({ timezone: "Europe/Moscow" })
					.where(eq(clinics.id, CLINIC_ID));
			});
		}
	});

	test("эффект напоминаний: малая выборка помечена, а не выдана за вывод", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/reminder-effect",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		assert.ok(body.reminded, response.body);
		assert.ok(body.notReminded, response.body);

		assert.equal(body.enoughData, false, JSON.stringify(body));
		assert.ok(body.caveat.includes("Данных мало"), body.caveat);
		assert.equal(typeof body.smallestGroupSize, "number");

		for (const group of [body.reminded, body.notReminded]) {
			assert.equal(
				group.lost,
				group.cancelled + group.noShow,
				JSON.stringify(group),
			);
			if (group.appointments === 0) {
				assert.equal(
					group.lostRate,
					null,
					"доля потерь без приёмов должна быть прочерком, а не нулём",
				);
			}
		}
	});
});
