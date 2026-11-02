import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../../db/client.js";
import { payments } from "../../../db/schema.js";
import { withFixtureTenant } from "../../support/fixtureOrganizations.js";
import {
	CHAIR_ID,
	ManagerReportsTestContext,
	ORG_HEADERS,
	ORG_ID,
	PATIENT_NEW,
	PATIENT_OLD,
	getReportDates,
	setupReportsContext,
	teardownReportsContext,
} from "./fixture.js";

describe("отчёты руководителю: дебиторка, переплаты и загрузка кресел", () => {
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

	test("занятость кресла считается в минутах и от названной базы", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/chairs",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		const chair = body.rows.find(
			(row: { chairId: string }) => row.chairId === CHAIR_ID,
		);
		assert.ok(chair, JSON.stringify(body));
		// 90 + 60 минут завершённых приёмов. Отменённый и неявка кресло не заняли.
		assert.equal(chair.bookedMinutes, 150);
		assert.equal(chair.appointments, 2);
		assert.ok(
			chair.utilization !== null &&
				chair.utilization > 0 &&
				chair.utilization < 1,
		);
		// База расчёта обязана возвращаться рядом с процентом.
		assert.ok(body.basis.totalMinutesPerChair > 0);
		assert.ok(body.basis.note.includes("Отменённые"));
	});

	test("дебиторка считает долг как назначено минус оплачено", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/receivables",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		// Назначено 30 000, получено 10 000 → долг 20 000 у «старого» пациента.
		assert.equal(body.totalDebtRub, 20_000, JSON.stringify(body));
		const debtor = body.rows.find(
			(row: { patientId: string }) => row.patientId === PATIENT_OLD,
		);
		assert.equal(debtor?.debtRub, 20_000);
		assert.ok(debtor?.oldestChargeAt !== null);
		assert.ok(body.note.includes("назначено минус оплачено"));
	});

	/**
	 * ПЕРЕПЛАТА — отдельное число, а не исчезнувшая строка.
	 *
	 * Отрицательный долг отчёт отбрасывал фильтром, и пациент, заплативший больше
	 * назначенного, пропадал из всех отчётов, продолжая уменьшать долг ВСЕЙ
	 * клиники на главном экране (там одно вычитание по клинике).
	 */
	test("переплата названа отдельно, а долг от неё не поехал", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const [prepayment] = await withFixtureTenant(ORG_ID, async () =>
			db
				.insert(payments)
				.values({
					organizationId: ORG_ID,
					patientId: PATIENT_NEW,
					amountRub: 4_500.5,
					status: "paid",
					paidAt: inPeriod,
				})
				.returning({ id: payments.id }),
		);

		try {
			const response = await app.inject({
				method: "GET",
				url: "/api/reports/receivables",
				headers: ORG_HEADERS,
			});
			assert.equal(response.statusCode, 200, response.body);
			const body = JSON.parse(response.body);

			// Долг считается прежним выражением: способ подсчёта не менялся.
			assert.equal(body.totalDebtRub, 20_000, JSON.stringify(body));
			assert.equal(
				body.totalPrepaidRub,
				4_500.5,
				JSON.stringify(body.prepayments),
			);

			const prepaid = body.prepayments.find(
				(row: { patientId: string }) => row.patientId === PATIENT_NEW,
			);
			assert.equal(prepaid?.prepaidRub, 4_500.5);
			assert.equal(prepaid?.patientName, "Новый Пациент Петрович");

			// Переплативший не должник: попасть в дебиторку он не имеет права.
			assert.equal(
				body.rows.find(
					(row: { patientId: string }) => row.patientId === PATIENT_NEW,
				),
				undefined,
			);

			const noteText = String(body.note).replace(/\s/g, " ");
			assert.ok(noteText.includes("вернуть 4 500,50 ₽"), noteText);
			assert.ok(noteText.includes("20 000,00"), noteText);
			assert.ok(noteText.includes("15 499,50"), noteText);
		} finally {
			await withFixtureTenant(ORG_ID, async () => {
				await db.delete(payments).where(eq(payments.id, prepayment?.id ?? ""));
			});
		}
	});

	test("переплат нет — отчёт говорит это прямо, а не молчит", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/receivables",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		assert.equal(body.totalPrepaidRub, 0, JSON.stringify(body.prepayments));
		assert.deepEqual(body.prepayments, []);
		assert.ok(body.note.includes("Переплат нет"), body.note);
	});

	test("загрузка по дням недели и часам заполнена", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/schedule-load",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.isEmpty, false);
		assert.ok(body.cells.length > 0);
		assert.ok(
			body.busiestWeekday !== null &&
				body.busiestWeekday >= 1 &&
				body.busiestWeekday <= 7,
		);
		assert.ok(
			body.busiestHour !== null &&
				body.busiestHour >= 0 &&
				body.busiestHour <= 23,
		);
	});

	test("сводка собирает всё одним запросом", async (context) => {
		if (!ctx.databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/summary",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		assert.equal(body.revenue.totalRub, 10_000);
		assert.equal(body.appointments.total, 4);
		assert.equal(body.receivables.totalDebtRub, 20_000);
		assert.equal(body.receivables.debtors, 1);
		assert.equal(body.isEmpty, false);
	});
});
