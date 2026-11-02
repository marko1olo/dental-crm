import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../../db/client.js";
import { payments } from "../../../db/schema.js";
import { withFixtureTenant } from "../../support/fixtureOrganizations.js";
import {
	DOCTOR_ID,
	ManagerReportsTestContext,
	ORG_HEADERS,
	ORG_ID,
	PATIENT_NEW,
	getReportDates,
	setupReportsContext,
	teardownReportsContext,
} from "./fixture.js";

describe("отчёты руководителю: продуктивность врачей, услуги и финансовая сводка", () => {
	let ctx: ManagerReportsTestContext;
	let app: FastifyInstance;
	const { inPeriod } = getReportDates();

	before(async () => {
		ctx = await setupReportsContext();
		app = ctx.app;
	});

	after(async () => {
		await teardownReportsContext(ctx);
	});

	test("по врачу считаются доли отмен и неявок, а маржа не выдумывается", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/doctors",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		const doctor = body.rows.find(
			(row: { doctorUserId: string }) => row.doctorUserId === DOCTOR_ID,
		);
		assert.ok(doctor, JSON.stringify(body));
		assert.equal(doctor.revenueRub, 10_000);
		// В периоде: 2 завершённых, 1 отменённый, 1 неявка.
		assert.equal(doctor.appointmentsTotal, 4);
		assert.equal(doctor.appointmentsCompleted, 2);
		assert.equal(doctor.appointmentsCancelled, 1);
		assert.equal(doctor.appointmentsNoShow, 1);
		assert.equal(doctor.completionRate, 0.5);
		assert.equal(doctor.noShowRate, 0.25);
		assert.equal(doctor.averageTicketRub, 5_000);
		// Себестоимости и процента врача в базе нет — прочерк, а не «35 %».
		assert.equal(doctor.marginRub, null);
	});

	test("платёж без приёма не размазывается по врачам, а называется отдельно", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const [orphanPayment] = await withFixtureTenant(ORG_ID, async () =>
			db
				.insert(payments)
				.values({
					organizationId: ORG_ID,
					patientId: PATIENT_NEW,
					amountRub: 3_000,
					status: "paid",
					paidAt: inPeriod,
				})
				.returning({ id: payments.id }),
		);

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/doctors",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.unattributedRevenueRub, 3_000, JSON.stringify(body));
		assert.ok(
			body.attributionNote.includes("не отнесена"),
			body.attributionNote,
		);

		const doctor = body.rows.find(
			(row: { doctorUserId: string }) => row.doctorUserId === DOCTOR_ID,
		);
		// Врачу чужие 3 000 не приписаны.
		assert.equal(doctor.revenueRub, 10_000);

		await withFixtureTenant(ORG_ID, async () => {
			await db.delete(payments).where(eq(payments.id, orphanPayment?.id ?? ""));
		});
	});

	test("услуги показывают назначенные суммы и оговаривают это", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/services",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		// Кариес: 8 000 × 2 − 2 000 = 14 000. Гигиена: 16 000.
		const caries = body.rows.find(
			(row: { title: string }) => row.title === "Лечение кариеса",
		);
		assert.equal(caries?.plannedRub, 14_000, JSON.stringify(body.rows));
		assert.equal(caries?.quantity, 2);
		assert.equal(caries?.averagePriceRub, 7_000);
		assert.equal(body.plannedTotalRub, 30_000);
		assert.equal(body.discountTotalRub, 2_000);
		// Сумма назначенная, а не полученная — это должно быть сказано прямо.
		assert.ok(body.note.includes("назначенные"));
		// Первой идёт самая дорогая услуга: LIMIT не должен отрезать её.
		assert.equal(body.rows[0].title, "Гигиена");
	});

	test("финансовая сводка руководителя отдает честные типы оплат и наряды", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/financial-summary",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.ok(typeof body.totalRevenueRub === "number");
		assert.ok(typeof body.totalRevenueKopecks === "number");
		assert.ok(typeof body.invoicesCount === "number");
		assert.ok(typeof body.averageCheckRub === "number");
		assert.ok(body.paymentBreakdown);
		assert.ok(body.paymentBreakdown.cash);
		assert.ok(body.paymentBreakdown.card);
		assert.ok(body.paymentBreakdown.sbp);
		assert.ok(body.paymentBreakdown.deposit);
	});

	test("ведомость начисления зарплаты врачам считает Net Revenue в копейках", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/doctor-payroll",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.ok(Array.isArray(body.rows));
		assert.ok(body.totals);
		assert.ok(typeof body.totals.totalNetRevenueKopecks === "number");
		assert.ok(typeof body.totals.totalPayoutKopecks === "number");
	});
});
