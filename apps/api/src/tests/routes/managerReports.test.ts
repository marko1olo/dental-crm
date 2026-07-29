import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	patients,
	payments,
	treatmentItems,
	users,
	visits
} from "../../db/schema.js";
import { registerReportRoutes } from "../../routes/reports.js";
import { currentMonthPeriod } from "../../services/reports/managerReports.js";

/**
 * Отчёты руководителю по живой базе.
 *
 * ЗАЧЕМ ИМЕННО ТАК. Отчёт — это агрегирующий SQL: суммы, доли, группировки по
 * дате. На моках проверялись бы сами моки. Здесь заводится организация с
 * известным набором данных, по которому все числа считаются вручную и
 * сравниваются с ответом.
 *
 * Проверяется в первую очередь то, на чём такие отчёты обычно врут:
 * незавершённые платежи в выручке, отменённые приёмы в загрузке кресел,
 * повторные пациенты, посчитанные первичными, и придуманная маржа.
 */

const ORG_ID = "dce70000-0000-4000-8000-000000000401";
const CLINIC_ID = "dce70000-0000-4000-8000-000000000402";
const DOCTOR_ID = "dce70000-0000-4000-8000-000000000403";
const CHAIR_ID = "dce70000-0000-4000-8000-000000000404";
const PATIENT_OLD = "dce70000-0000-4000-8000-000000000405";
const PATIENT_NEW = "dce70000-0000-4000-8000-000000000406";
const VISIT_ID = "dce70000-0000-4000-8000-000000000407";
const APPOINTMENT_ID = "dce70000-0000-4000-8000-000000000408";
const ORG_HEADERS = { "x-organization-id": ORG_ID };

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(message);
}

/**
 * Удаление всех строк фикстуры. Вызывается ДО засева, а не только после.
 *
 * ЗАЧЕМ. База одна на весь прогон, а четыре приёма из пяти вставляются без
 * заданного id, поэтому `onConflictDoNothing` их не отсекает — он не с чем
 * сравнивать. Стоит одному прогону упасть до `after` (потеря соединения,
 * убитый процесс, Ctrl+C), и в базе остаются приёмы прошлого прогона. Следующий
 * прогон досеивает свои поверх, и `body.total` становится 8 вместо 4 — тест
 * краснеет на данных, которых сам не заводил, а причина не видна в сообщении.
 * Префикс `dce70000-…-04xx` принадлежит только этому файлу, поэтому удаление по
 * organization_id ничьи чужие данные не задевает.
 */
async function removeFixtureRows(): Promise<void> {
	await db.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
	await db.delete(payments).where(eq(payments.organizationId, ORG_ID));
	await db.delete(visits).where(eq(visits.organizationId, ORG_ID));
	await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
	await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
	await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
	await db.delete(users).where(eq(users.organizationId, ORG_ID));
	await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
	await db.delete(organizations).where(eq(organizations.id, ORG_ID));
}

describe("отчёты руководителю", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalEnv = { ...process.env };
	const period = currentMonthPeriod();
	// Середина текущего месяца — чтобы данные заведомо попали в период
	// по умолчанию и не зависели от того, какое сегодня число.
	const inPeriod = new Date(period.from.getTime() + 12 * 60 * 60 * 1000);
	// Приём годичной давности: первый в истории «старого» пациента.
	const longAgo = new Date(period.from.getTime() - 300 * 24 * 60 * 60 * 1000);

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = Fastify();
		await registerReportRoutes(app);

		try {
			// Сначала подчистить за упавшим прогоном, потом сеять: иначе к своим
			// пяти приёмам добавятся чужие и все счётчики удвоятся.
			await removeFixtureRows();
			await db.insert(organizations).values({ id: ORG_ID, name: "Клиника отчётов" }).onConflictDoNothing();
			await db
				.insert(clinics)
				.values({ id: CLINIC_ID, organizationId: ORG_ID, name: "Главная", timezone: "Europe/Moscow" })
				.onConflictDoNothing();
			await db
				.insert(chairs)
				.values({ id: CHAIR_ID, organizationId: ORG_ID, clinicId: CLINIC_ID, name: "Кресло 1" })
				.onConflictDoNothing();
			await db
				.insert(users)
				.values({ id: DOCTOR_ID, organizationId: ORG_ID, fullName: "Петров Пётр Петрович", role: "doctor" })
				.onConflictDoNothing();
			await db
				.insert(patients)
				.values([
					{ id: PATIENT_OLD, organizationId: ORG_ID, fullName: "Старый Пациент Иванович" },
					{ id: PATIENT_NEW, organizationId: ORG_ID, fullName: "Новый Пациент Петрович" }
				])
				.onConflictDoNothing();

			// Приёмы: один давний завершённый у «старого», один завершённый в
			// периоде у каждого, один отменённый и один с неявкой.
			await db
				.insert(appointments)
				.values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_OLD,
						doctorUserId: DOCTOR_ID,
						chairId: CHAIR_ID,
						status: "completed",
						startsAt: longAgo,
						endsAt: new Date(longAgo.getTime() + 60 * 60_000)
					},
					{
						id: APPOINTMENT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_OLD,
						doctorUserId: DOCTOR_ID,
						chairId: CHAIR_ID,
						status: "completed",
						startsAt: inPeriod,
						endsAt: new Date(inPeriod.getTime() + 90 * 60_000)
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_NEW,
						doctorUserId: DOCTOR_ID,
						chairId: CHAIR_ID,
						status: "completed",
						startsAt: new Date(inPeriod.getTime() + 3 * 60 * 60_000),
						endsAt: new Date(inPeriod.getTime() + 4 * 60 * 60_000)
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_NEW,
						doctorUserId: DOCTOR_ID,
						chairId: CHAIR_ID,
						status: "cancelled",
						startsAt: new Date(inPeriod.getTime() + 6 * 60 * 60_000),
						endsAt: new Date(inPeriod.getTime() + 7 * 60 * 60_000)
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_NEW,
						doctorUserId: DOCTOR_ID,
						chairId: CHAIR_ID,
						status: "no_show",
						startsAt: new Date(inPeriod.getTime() + 8 * 60 * 60_000),
						endsAt: new Date(inPeriod.getTime() + 9 * 60 * 60_000)
					}
				])
				.onConflictDoNothing();

			await db
				.insert(visits)
				.values({
					id: VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_OLD,
					// Визит связан с приёмом: только через эту связь платёж
					// доходит до врача, у визита своего поля «врач» нет.
					appointmentId: APPOINTMENT_ID,
					status: "signed",
					createdAt: inPeriod
				})
				.onConflictDoNothing();

			// Платежи: 10 000 полученных, 50 000 запланированных и 7 000
			// возвращённых. В выручку должны попасть только 10 000.
			await db
				.insert(payments)
				.values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_OLD,
						visitId: VISIT_ID,
						amountRub: 10_000,
						status: "paid",
						paidAt: inPeriod
					},
					{ organizationId: ORG_ID, patientId: PATIENT_OLD, amountRub: 50_000, status: "planned", paidAt: inPeriod },
					{ organizationId: ORG_ID, patientId: PATIENT_NEW, amountRub: 7_000, status: "refunded", paidAt: inPeriod }
				])
				.onConflictDoNothing();

			// Позиции лечения: назначено 30 000, из них скидка 2 000.
			await db
				.insert(treatmentItems)
				.values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_OLD,
						visitId: VISIT_ID,
						title: "Лечение кариеса",
						quantity: "2",
						priceRub: 8_000,
						unitPriceRub: 8_000,
						discountRub: 2_000,
						status: "completed"
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_OLD,
						visitId: VISIT_ID,
						title: "Гигиена",
						quantity: "1",
						priceRub: 16_000,
						unitPriceRub: 16_000,
						discountRub: 0,
						status: "completed"
					}
				])
				.onConflictDoNothing();
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await removeFixtureRows();
		}
		await app.close();
		process.env = originalEnv;
	});

	test("в выручку идут только полученные деньги", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/reports/revenue", headers: ORG_HEADERS });
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
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/revenue?granularity=month",
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.granularity, "month");
		assert.equal(body.totalRub, 10_000);
	});

	test("по врачу считаются доли отмен и неявок, а маржа не выдумывается", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/reports/doctors", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		const doctor = body.rows.find((row: { doctorUserId: string }) => row.doctorUserId === DOCTOR_ID);
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
		if (!databaseAvailable) return context.skip("база недоступна");

		// У визита нет поля «врач»: связь платежа с врачом идёт только через
		// приём. Платёж без такой связи нельзя отнести никому, и придумывать
		// пропорцию хуже, чем показать сумму отдельно с объяснением.
		const [orphanPayment] = await db
			.insert(payments)
			.values({ organizationId: ORG_ID, patientId: PATIENT_NEW, amountRub: 3_000, status: "paid", paidAt: inPeriod })
			.returning({ id: payments.id });

		const response = await app.inject({ method: "GET", url: "/api/reports/doctors", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.unattributedRevenueRub, 3_000, JSON.stringify(body));
		assert.ok(body.attributionNote.includes("не отнесена"), body.attributionNote);

		const doctor = body.rows.find((row: { doctorUserId: string }) => row.doctorUserId === DOCTOR_ID);
		// Врачу чужие 3 000 не приписаны.
		assert.equal(doctor.revenueRub, 10_000);

		await db.delete(payments).where(eq(payments.id, orphanPayment?.id ?? ""));
	});

	test("занятость кресла считается в минутах и от названной базы", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/reports/chairs", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		const chair = body.rows.find((row: { chairId: string }) => row.chairId === CHAIR_ID);
		assert.ok(chair, JSON.stringify(body));
		// 90 + 60 минут завершённых приёмов. Отменённый и неявка кресло не заняли.
		assert.equal(chair.bookedMinutes, 150);
		assert.equal(chair.appointments, 2);
		assert.ok(chair.utilization !== null && chair.utilization > 0 && chair.utilization < 1);
		// База расчёта обязана возвращаться рядом с процентом.
		assert.ok(body.basis.totalMinutesPerChair > 0);
		assert.ok(body.basis.note.includes("Отменённые"));
	});

	test("воронка приёмов даёт потери и доли", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/reports/appointments", headers: ORG_HEADERS });
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
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/reports/patient-flow", headers: ORG_HEADERS });
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
	 *
	 * ЧТО БЫЛО СЛОМАНО. `date_trunc('month', starts_at)` режет месяц по поясу
	 * СЕССИИ PostgreSQL. Приём в первые часы месяца по часам клиники попадал в
	 * ПРЕДЫДУЩИЙ месяц, и первичный пациент числился пришедшим не в тот месяц:
	 * отчёт «сколько новых дал июль» дарил их июню, а по этим числам оценивают
	 * рекламу.
	 *
	 * ЧЕМ ПРОВЕРЯЕТСЯ. Клинике на время теста ставится пояс +12
	 * (`Asia/Kamchatka`), а приём — через полчаса после начала месяца по её
	 * часам. В любом поясе сессии западнее (на этом хосте `Europe/Samara`, +4)
	 * тот же момент — ещё предыдущий месяц. Значит корзина предыдущего месяца в
	 * ответе означает возврат дефекта.
	 *
	 * Пояс восстанавливается в `finally`: остальные тесты считают период по
	 * умолчанию в поясе клиники, и оставленный +12 сдвинул бы им месяц в
	 * последние сутки.
	 */
	test("месяц воронки берётся в поясе клиники, а не в поясе сессии базы", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const FAR_ZONE = "Asia/Kamchatka";
		const monthIn = (zone: string, at: Date): string => {
			const parts = new Map(
				new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit" })
					.formatToParts(at)
					.map((part) => [part.type, part.value])
			);
			return `${parts.get("year")}-${parts.get("month")}`;
		};

		const clinicMonthStart = currentMonthPeriod(new Date(), FAR_ZONE).from;
		const justAfterMonthStart = new Date(clinicMonthStart.getTime() + 30 * 60_000);
		const clinicMonth = monthIn(FAR_ZONE, justAfterMonthStart);
		const previousMonth = monthIn(FAR_ZONE, new Date(clinicMonthStart.getTime() - 60 * 60_000));

		await db.update(clinics).set({ timezone: FAR_ZONE }).where(eq(clinics.id, CLINIC_ID));
		const [boundaryPatient] = await db
			.insert(patients)
			.values({ organizationId: ORG_ID, fullName: "Ночной Пациент Границевич" })
			.returning({ id: patients.id });
		const [boundaryAppointment] = await db
			.insert(appointments)
			.values({
				organizationId: ORG_ID,
				patientId: boundaryPatient?.id ?? "",
				status: "completed",
				startsAt: justAfterMonthStart,
				endsAt: new Date(justAfterMonthStart.getTime() + 30 * 60_000)
			})
			.returning({ id: appointments.id });

		try {
			// Задан только `from`: пояс клиники маршрут читает лишь когда период
			// не пришёл целиком из запроса (routes/reports.ts, scopeFor).
			const from = new Date(clinicMonthStart.getTime() - 2 * 60 * 60_000).toISOString();
			const response = await app.inject({
				method: "GET",
				url: `/api/reports/patient-flow?from=${encodeURIComponent(from)}`,
				headers: ORG_HEADERS
			});
			assert.equal(response.statusCode, 200, response.body);
			const body = JSON.parse(response.body);
			const buckets = body.points.map((point: { bucket: string }) => point.bucket);

			assert.ok(buckets.includes(clinicMonth), `${clinicMonth} нет в ${JSON.stringify(buckets)}`);
			assert.ok(
				!buckets.includes(previousMonth),
				`приём попал в предыдущий месяц ${previousMonth}: месяц снова считается в поясе сессии — ${JSON.stringify(buckets)}`
			);
		} finally {
			await db.delete(appointments).where(eq(appointments.id, boundaryAppointment?.id ?? ""));
			await db.delete(patients).where(eq(patients.id, boundaryPatient?.id ?? ""));
			await db.update(clinics).set({ timezone: "Europe/Moscow" }).where(eq(clinics.id, CLINIC_ID));
		}
	});

	test("услуги показывают назначенные суммы и оговаривают это", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/reports/services", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		// Кариес: 8 000 × 2 − 2 000 = 14 000. Гигиена: 16 000.
		const caries = body.rows.find((row: { title: string }) => row.title === "Лечение кариеса");
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

	test("дебиторка считает долг как назначено минус оплачено", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/reports/receivables", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		// Назначено 30 000, получено 10 000 → долг 20 000 у «старого» пациента.
		assert.equal(body.totalDebtRub, 20_000, JSON.stringify(body));
		const debtor = body.rows.find((row: { patientId: string }) => row.patientId === PATIENT_OLD);
		assert.equal(debtor?.debtRub, 20_000);
		assert.ok(debtor?.oldestChargeAt !== null);
		assert.ok(body.note.includes("назначено минус оплачено"));
	});

	/**
	 * ПЕРЕПЛАТА — отдельное число, а не исчезнувшая строка.
	 *
	 * Отрицательный долг отчёт отбрасывал фильтром, и пациент, заплативший больше
	 * назначенного, пропадал из всех отчётов, продолжая уменьшать долг ВСЕЙ
	 * клиники на главном экране (там одно вычитание по клинике). Так на живой базе
	 * возникло расхождение 51 400 ₽ против 53 000 ₽ — ровно две переплаты по 800 ₽.
	 *
	 * Проверяется именно то, что ломается незаметно: итог долга не поехал,
	 * переплата названа суммой и пациентом, и переплативший НЕ попал в должники.
	 * Сумма с копейками взята намеренно — деньги точны до копейки.
	 */
	test("переплата названа отдельно, а долг от неё не поехал", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// У «нового» пациента нет ни одной позиции лечения, значит любая оплата
		// делает его баланс отрицательным.
		const [prepayment] = await db
			.insert(payments)
			.values({ organizationId: ORG_ID, patientId: PATIENT_NEW, amountRub: 4_500.5, status: "paid", paidAt: inPeriod })
			.returning({ id: payments.id });

		try {
			const response = await app.inject({ method: "GET", url: "/api/reports/receivables", headers: ORG_HEADERS });
			assert.equal(response.statusCode, 200, response.body);
			const body = JSON.parse(response.body);

			// Долг считается прежним выражением: способ подсчёта не менялся.
			assert.equal(body.totalDebtRub, 20_000, JSON.stringify(body));
			assert.equal(body.totalPrepaidRub, 4_500.5, JSON.stringify(body.prepayments));

			const prepaid = body.prepayments.find((row: { patientId: string }) => row.patientId === PATIENT_NEW);
			assert.equal(prepaid?.prepaidRub, 4_500.5);
			assert.equal(prepaid?.patientName, "Новый Пациент Петрович");

			// Переплативший не должник: попасть в дебиторку он не имеет права.
			assert.equal(
				body.rows.find((row: { patientId: string }) => row.patientId === PATIENT_NEW),
				undefined
			);

			/*
			 * Пробелы нормализуются: разряды в русской локали Intl разделяет
			 * неразрывным пробелом U+00A0, и сравнение с обычным пробелом падало бы
			 * на тексте, который человек видит правильным. Копейки при этом
			 * проверяются буквально — «4 500,5» вместо «4 500,50» в сумме денег
			 * считается ошибкой.
			 */
			const noteText = String(body.note).replace(/\s/g, " ");
			assert.ok(noteText.includes("вернуть 4 500,50 ₽"), noteText);
			assert.ok(noteText.includes("20 000,00"), noteText);
			assert.ok(noteText.includes("15 499,50"), noteText);
		} finally {
			await db.delete(payments).where(eq(payments.id, prepayment?.id ?? ""));
		}
	});

	test("переплат нет — отчёт говорит это прямо, а не молчит", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/reports/receivables", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		assert.equal(body.totalPrepaidRub, 0, JSON.stringify(body.prepayments));
		assert.deepEqual(body.prepayments, []);
		assert.ok(body.note.includes("Переплат нет"), body.note);
	});

	test("загрузка по дням недели и часам заполнена", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/reports/schedule-load", headers: ORG_HEADERS });
		// Код ответа проверяется ДО чтения полей. Без этой строки ошибка 500
		// превращалась в «undefined !== false»: тело ответа — это
		// {statusCode:500,message:"Failed query: …"}, полей isEmpty и cells в нём
		// нет. Сообщение указывало на данные, хотя падал сам SQL, и по нему
		// диагноз ставился неверный.
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.isEmpty, false);
		assert.ok(body.cells.length > 0);
		assert.ok(body.busiestWeekday !== null && body.busiestWeekday >= 1 && body.busiestWeekday <= 7);
		assert.ok(body.busiestHour !== null && body.busiestHour >= 0 && body.busiestHour <= 23);
	});

	test("сводка собирает всё одним запросом", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/reports/summary", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		assert.equal(body.revenue.totalRub, 10_000);
		assert.equal(body.appointments.total, 4);
		assert.equal(body.receivables.totalDebtRub, 20_000);
		assert.equal(body.receivables.debtors, 1);
		assert.equal(body.isEmpty, false);
	});

	test("эффект напоминаний: малая выборка помечена, а не выдана за вывод", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/reports/reminder-effect", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		// Обе группы присутствуют всегда, даже пустые: интерфейс не должен
		// догадываться, чего не хватает.
		assert.ok(body.reminded, response.body);
		assert.ok(body.notReminded, response.body);

		// В тестовой клинике приёмов единицы, поэтому вывод обязан быть помечен
		// как ненадёжный. Разница долей на выборке из трёх приёмов
		// переворачивается одной неявкой.
		assert.equal(body.enoughData, false, JSON.stringify(body));
		assert.ok(body.caveat.includes("Данных мало"), body.caveat);
		assert.equal(typeof body.smallestGroupSize, "number");

		// Потери — это отмены плюс неявки, и в обеих группах считаются одинаково.
		for (const group of [body.reminded, body.notReminded]) {
			assert.equal(group.lost, group.cancelled + group.noShow, JSON.stringify(group));
			if (group.appointments === 0) {
				assert.equal(group.lostRate, null, "доля потерь без приёмов должна быть прочерком, а не нулём");
			}
		}
	});

	test("слишком широкий период отклоняется, а не обрезается молча", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/revenue?from=2000-01-01T00:00:00Z&to=2030-01-01T00:00:00Z",
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 400, response.body);
		assert.ok(JSON.parse(response.body).message.includes("длиннее"));
	});

	test("перевёрнутый период отклоняется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/revenue?from=2026-07-20T00:00:00Z&to=2026-07-01T00:00:00Z",
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 400, response.body);
		assert.ok(JSON.parse(response.body).message.includes("позже"));
	});

	test("данные чужой организации в отчёт не попадают", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/revenue",
			headers: { "x-organization-id": "dce70000-0000-4000-8000-0000000004ff" }
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.totalRub, 0);
		assert.equal(body.isEmpty, true);
	});
});
