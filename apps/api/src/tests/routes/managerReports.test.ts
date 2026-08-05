import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { type FastifyInstance } from "fastify";
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
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

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
 *
 * ПОД ТЕНАНТ-КОНТЕКСТОМ, И БЕЗ НЕГО ЭТО БЫЛА ПУСТАЯ ФУНКЦИЯ. Под FORCE RLS
 * запрос без `app.current_tenant` не видит ни одной строки клиники, а `DELETE`,
 * не нашедший строк, ошибкой не является — уборка доходила до конца, снимала
 * ноль и молчала. Контекст здесь ещё и сужает удаление до своего арендатора:
 * чужую клинику этими девятью строками не задеть даже при ошибке в предикате.
 */
async function removeFixtureRows(): Promise<void> {
	await withFixtureTenant(ORG_ID, async () => {
		await db.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
		await db.delete(payments).where(eq(payments.organizationId, ORG_ID));
		await db.delete(visits).where(eq(visits.organizationId, ORG_ID));
		await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
		await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
		await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
		await db.delete(users).where(eq(users.organizationId, ORG_ID));
		await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
		await db.delete(organizations).where(eq(organizations.id, ORG_ID));
	});
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

		app = createTenantTestApp();
		await registerReportRoutes(app);

		try {
			// Сначала подчистить за упавшим прогоном, потом сеять: иначе к своим
			// пяти приёмам добавятся чужие и все счётчики удвоятся.
			await removeFixtureRows();
			// Сев идёт под тенант-контекстом клиники. Под FORCE RLS вставка без
			// `app.current_tenant` отвергается кодом 42501 на КАЖДОЙ таблице:
			// дизъюнкт обхода есть только в USING политик, в WITH CHECK его нет
			// нигде, кроме самой organizations. Контекст выставлен по заранее
			// известному ORG_ID — тем же приёмом, каким создаёт клинику боевой
			// маршрут регистрации (`routes/auth.ts`).
			await withFixtureTenant(ORG_ID, async () => {
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
			});
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
		//
		// Досев ВНУТРИ теста нуждается в тенант-контексте ровно так же, как сев в
		// `before`: под FORCE RLS вставка без `app.current_tenant` отвергается
		// кодом 42501, а `DELETE` без него не видит собственной строки и снимает
		// ноль, не сообщая об этом.
		const [orphanPayment] = await withFixtureTenant(ORG_ID, async () =>
			db
				.insert(payments)
				.values({ organizationId: ORG_ID, patientId: PATIENT_NEW, amountRub: 3_000, status: "paid", paidAt: inPeriod })
				.returning({ id: payments.id })
		);

		const response = await app.inject({ method: "GET", url: "/api/reports/doctors", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.unattributedRevenueRub, 3_000, JSON.stringify(body));
		assert.ok(body.attributionNote.includes("не отнесена"), body.attributionNote);

		const doctor = body.rows.find((row: { doctorUserId: string }) => row.doctorUserId === DOCTOR_ID);
		// Врачу чужие 3 000 не приписаны.
		assert.equal(doctor.revenueRub, 10_000);

		await withFixtureTenant(ORG_ID, async () => {
			await db.delete(payments).where(eq(payments.id, orphanPayment?.id ?? ""));
		});
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

		// Пояс клиники, пациент и приём заводятся одним севом под тенант-контекстом.
		// Без `app.current_tenant` `UPDATE` не видит строки клиники и молча меняет
		// ноль строк, а `INSERT` отвергается политикой кодом 42501.
		const { boundaryPatient, boundaryAppointment } = await withFixtureTenant(ORG_ID, async () => {
			await db.update(clinics).set({ timezone: FAR_ZONE }).where(eq(clinics.id, CLINIC_ID));
			const [seededPatient] = await db
				.insert(patients)
				.values({ organizationId: ORG_ID, fullName: "Ночной Пациент Границевич" })
				.returning({ id: patients.id });
			const [seededAppointment] = await db
				.insert(appointments)
				.values({
					organizationId: ORG_ID,
					patientId: seededPatient?.id ?? "",
					status: "completed",
					startsAt: justAfterMonthStart,
					endsAt: new Date(justAfterMonthStart.getTime() + 30 * 60_000)
				})
				.returning({ id: appointments.id });
			return { boundaryPatient: seededPatient, boundaryAppointment: seededAppointment };
		});

		try {
			/*
			 * Задан только `from`. Раньше это было ВЫНУЖДЕННО: маршрут читал пояс
			 * клиники лишь когда период не пришёл из запроса целиком, и с обоими
			 * границами проверка не увидела бы починку. Теперь пояс читается
			 * всегда, и форму запроса панели — обе границы — держит отдельный
			 * тест ниже. Этот случай оставлен как проверка второй ветки: период
			 * по умолчанию.
			 */
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
			// Уборка тоже под контекстом: без него `DELETE` не видит собственных
			// строк и снимает ноль без ошибки, а восстановление пояса не доходит до
			// клиники — следующие тесты считали бы период в чужом поясе.
			await withFixtureTenant(ORG_ID, async () => {
				await db.delete(appointments).where(eq(appointments.id, boundaryAppointment?.id ?? ""));
				await db.delete(patients).where(eq(patients.id, boundaryPatient?.id ?? ""));
				await db.update(clinics).set({ timezone: "Europe/Moscow" }).where(eq(clinics.id, CLINIC_ID));
			});
		}
	});

	/**
	 * ПОЯС ЧИТАЕТСЯ И ТОГДА, КОГДА КЛИЕНТ ПРИСЛАЛ ОБЕ ГРАНИЦЫ ПЕРИОДА.
	 *
	 * ПОЧЕМУ ЭТО ОТДЕЛЬНЫЙ ТЕСТ, А НЕ ПОВТОР ПРЕДЫДУЩЕГО. Панель отчётов
	 * посылает `from` И `to` при КАЖДОЙ загрузке: оба поля заполнены из
	 * `monthBounds()` ещё до первого щелчка оператора
	 * (`apps/web/src/components/reports/ManagerReportsPanel.tsx:222-237`).
	 * Маршрут же читал пояс клиники ТОЛЬКО когда период не пришёл целиком —
	 * значит на единственном пути, которым ходит клиент, пояс был `null` всегда,
	 * и ни одна починка поясов в отчётах не исполнялась ни разу: ни динамика
	 * выручки, ни тепловая карта смен, ни воронка пациентов. Предыдущий тест
	 * проходил потому, что посылал только `from`.
	 *
	 * Это ТРЕТИЙ случай одного класса в этом дереве: панель обзвона всегда
	 * посылала `?date=` и отменяла серверный расчёт «на завтра», а три починки
	 * диктовки не дошли до врача, потому что экран не открывался. Зелёный тест на
	 * маршруте не доказывает работу пути, которым ходит клиент, — поэтому здесь
	 * запрос собран ровно так, как его собирает панель.
	 *
	 * ЧЕМ ПРОВЕРЯЕТСЯ. Клинике ставится пояс +12, приём — через полчаса после
	 * начала месяца по её часам. Границы периода задаются ОБЕ и с запасом в обе
	 * стороны, чтобы приём в них попадал заведомо: проверяется не отбор по
	 * периоду, а пояс ГРУППИРОВКИ внутри него. Корзина предыдущего месяца в
	 * ответе означает возврат дефекта.
	 */
	test("месяц воронки берётся в поясе клиники и когда клиент прислал обе границы", async (context) => {
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

		// Тот же тенант-контекст, что и в севе `before`: без него `UPDATE` меняет
		// ноль строк молча, а `INSERT` падает с 42501 — проверка поясов не дошла бы
		// до запроса вовсе.
		const { boundaryPatient, boundaryAppointment } = await withFixtureTenant(ORG_ID, async () => {
			await db.update(clinics).set({ timezone: FAR_ZONE }).where(eq(clinics.id, CLINIC_ID));
			const [seededPatient] = await db
				.insert(patients)
				.values({ organizationId: ORG_ID, fullName: "Панельный Пациент Границевич" })
				.returning({ id: patients.id });
			const [seededAppointment] = await db
				.insert(appointments)
				.values({
					organizationId: ORG_ID,
					patientId: seededPatient?.id ?? "",
					status: "completed",
					startsAt: justAfterMonthStart,
					endsAt: new Date(justAfterMonthStart.getTime() + 30 * 60_000)
				})
				.returning({ id: appointments.id });
			return { boundaryPatient: seededPatient, boundaryAppointment: seededAppointment };
		});

		try {
			const from = new Date(clinicMonthStart.getTime() - 3 * 60 * 60_000).toISOString();
			const to = new Date(justAfterMonthStart.getTime() + 3 * 60 * 60_000).toISOString();
			const response = await app.inject({
				method: "GET",
				url: `/api/reports/patient-flow?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
				headers: ORG_HEADERS
			});
			assert.equal(response.statusCode, 200, response.body);
			const body = JSON.parse(response.body);
			const buckets = body.points.map((point: { bucket: string }) => point.bucket);

			assert.ok(
				buckets.includes(clinicMonth),
				`${clinicMonth} нет в ${JSON.stringify(buckets)}: с обеими границами маршрут снова не читает пояс клиники`
			);
			assert.ok(
				!buckets.includes(previousMonth),
				`приём попал в предыдущий месяц ${previousMonth}: с обеими границами месяц считается в поясе сессии — ${JSON.stringify(buckets)}`
			);
		} finally {
			// Уборка тоже под контекстом: без него `DELETE` не видит собственных
			// строк и снимает ноль без ошибки, а восстановление пояса не доходит до
			// клиники — следующие тесты считали бы период в чужом поясе.
			await withFixtureTenant(ORG_ID, async () => {
				await db.delete(appointments).where(eq(appointments.id, boundaryAppointment?.id ?? ""));
				await db.delete(patients).where(eq(patients.id, boundaryPatient?.id ?? ""));
				await db.update(clinics).set({ timezone: "Europe/Moscow" }).where(eq(clinics.id, CLINIC_ID));
			});
		}
	});

	/**
	 * КАЛЕНДАРНУЮ ДАТУ В МГНОВЕНИЕ ПРЕВРАЩАЕТ СЕРВЕР, А НЕ БРАУЗЕР.
	 *
	 * ЧТО БЫЛО СЛОМАНО. Маршрут требовал полный ISO
	 * (`z.string().datetime({ offset: true })`), поэтому календарную дату из поля
	 * `<input type="date">` в мгновение превращал КЛИЕНТ:
	 * `new Date(`${from}T00:00:00`).toISOString()`. Строка без смещения
	 * разбирается в поясе БРАУЗЕРА. Измерено на выборе «июль»: браузер в Москве
	 * (+3) посылал `2026-06-30T21:00:00.000Z`, браузер на Камчатке (+12) —
	 * `2026-06-30T12:00:00.000Z`. Девять часов разницы на одном и том же выборе.
	 *
	 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Владелец сети из Москвы смотрит камчатский
	 * филиал: московская граница «1 мая» — это 1 мая 09:00 по часам клиники.
	 * Приёмы и касса первой смены месяца в отчёт не попадали вовсе, зато
	 * попадали девять часов следующего дня. Числа выглядят правдоподобно, поэтому
	 * расхождение с кассой ищут в кассе.
	 *
	 * ЧЕМ ПРОВЕРЯЕТСЯ. Клинике ставится пояс +12, приём — 00:30 первого мая по её
	 * часам, то есть ровно та первая смена. Один и тот же день запрашивается
	 * дважды:
	 *   1. календарной датой — границы обязан посчитать сервер в поясе клиники,
	 *      и приём в отчёте ЕСТЬ;
	 *   2. мгновением, посчитанным браузером в Москве (прежнее поведение
	 *      клиента) — приёма в отчёте НЕТ.
	 * Второй запрос заодно держит прежний контракт: полный ISO маршрут принимает
	 * и уважает как есть, ничего не переразбирая.
	 *
	 * Пояс восстанавливается в `finally`: остальные тесты считают период по
	 * умолчанию в поясе клиники.
	 */
	test("календарная дата разрешается в поясе клиники, а не в поясе браузера", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const FAR_ZONE = "Asia/Kamchatka";
		// День выбран заведомо в стороне от фикстуры: у неё приёмы в текущем месяце
		// и один за 300 суток до него. Иначе счётчик судил бы о чужих строках.
		const CALENDAR_DAY = "2026-05-01";
		// 00:30 первого мая на Камчатке (+12) — первая смена месяца.
		const firstShift = new Date("2026-04-30T12:30:00.000Z");

		// Один сев под тенант-контекстом клиники: под FORCE RLS `INSERT` без
		// `app.current_tenant` отвергается кодом 42501, а `UPDATE` пояса без него
		// меняет ноль строк и об этом не сообщает.
		const { shiftPatient, shiftAppointment } = await withFixtureTenant(ORG_ID, async () => {
			await db.update(clinics).set({ timezone: FAR_ZONE }).where(eq(clinics.id, CLINIC_ID));
			const [seededPatient] = await db
				.insert(patients)
				.values({ organizationId: ORG_ID, fullName: "Первая Смена Месяцевна" })
				.returning({ id: patients.id });
			const [seededAppointment] = await db
				.insert(appointments)
				.values({
					organizationId: ORG_ID,
					patientId: seededPatient?.id ?? "",
					status: "completed",
					startsAt: firstShift,
					endsAt: new Date(firstShift.getTime() + 30 * 60_000)
				})
				.returning({ id: appointments.id });
			return { shiftPatient: seededPatient, shiftAppointment: seededAppointment };
		});

		try {
			const byCalendarDate = await app.inject({
				method: "GET",
				url: `/api/reports/appointments?from=${CALENDAR_DAY}&to=${CALENDAR_DAY}`,
				headers: ORG_HEADERS
			});
			assert.equal(byCalendarDate.statusCode, 200, byCalendarDate.body);
			const calendarBody = JSON.parse(byCalendarDate.body);

			// Границы посчитаны в поясе клиники, до миллисекунды. Конец суток
			// ВКЛЮЧАЮЩИЙ: начало следующих суток минус миллисекунда.
			assert.equal(
				calendarBody.period.from,
				"2026-04-30T12:00:00.000Z",
				`начало суток посчитано не в поясе клиники: ${calendarBody.period.from}`
			);
			assert.equal(
				calendarBody.period.to,
				"2026-05-01T11:59:59.999Z",
				`конец суток посчитан не в поясе клиники: ${calendarBody.period.to}`
			);
			assert.equal(
				calendarBody.total,
				1,
				"приём первой смены месяца не попал в отчёт по календарной дате: границы снова считаются в чужом поясе"
			);

			/*
			 * Тот же «1 мая», но так, как его посылал браузер из Москвы:
			 * `new Date("2026-05-01T00:00:00").toISOString()` в поясе +3.
			 * Приём 00:30 по часам клиники в такое окно не попадает — это и есть
			 * цена дефекта, выраженная числом.
			 */
			const asMoscowBrowserSent = await app.inject({
				method: "GET",
				url:
					"/api/reports/appointments?from=2026-04-30T21%3A00%3A00.000Z&to=2026-05-01T20%3A59%3A59.000Z",
				headers: ORG_HEADERS
			});
			assert.equal(asMoscowBrowserSent.statusCode, 200, asMoscowBrowserSent.body);
			const moscowBody = JSON.parse(asMoscowBrowserSent.body);
			// Полный ISO принимается и уважается как есть — прежний контракт цел.
			assert.equal(moscowBody.period.from, "2026-04-30T21:00:00.000Z");
			assert.equal(
				moscowBody.total,
				0,
				"московская граница внезапно захватила камчатскую первую смену: проверка перестала показывать дефект"
			);
		} finally {
			// Под контекстом, иначе уборка снимет ноль строк молча, а клиника
			// останется в поясе +12 для всех следующих тестов файла.
			await withFixtureTenant(ORG_ID, async () => {
				await db.delete(appointments).where(eq(appointments.id, shiftAppointment?.id ?? ""));
				await db.delete(patients).where(eq(patients.id, shiftPatient?.id ?? ""));
				await db.update(clinics).set({ timezone: "Europe/Moscow" }).where(eq(clinics.id, CLINIC_ID));
			});
		}
	});

	/**
	 * ПОЛНЫЙ ISO СО СМЕЩЕНИЕМ, А НЕ ТОЛЬКО С `Z`.
	 *
	 * Прежняя схема принимала обе записи (`datetime({ offset: true })`), и союз с
	 * календарной датой не должен был отобрать ни одну. Клиент посылает `Z`,
	 * поэтому запись со смещением проверять больше некому — а именно она отличает
	 * «расширили набор принимаемых значений» от «поменяли его».
	 */
	test("полный ISO со смещением принимается и границы не переразбираются", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/reports/appointments?from=2026-05-01T00%3A00%3A00%2B12%3A00&to=2026-05-01T23%3A59%3A59%2B12%3A00",
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.period.from, "2026-04-30T12:00:00.000Z", `смещение +12:00 разобрано неверно: ${body.period.from}`);
		assert.equal(body.period.to, "2026-05-01T11:59:59.000Z", `смещение +12:00 разобрано неверно: ${body.period.to}`);
	});

	/**
	 * НЕСУЩЕСТВУЮЩАЯ КАЛЕНДАРНАЯ ДАТА ОТКЛОНЯЕТСЯ, А НЕ НОРМАЛИЗУЕТСЯ МОЛЧА.
	 *
	 * `Date.UTC` переполнение чинит сам: 30 февраля становится 2 марта, а
	 * тринадцатый месяц — январём следующего года. Отчёт за «февраль по 30-е»,
	 * молча выданный за отчёт по 2 марта, — правдоподобный ответ на невозможный
	 * запрос, и это худший исход из возможных: его никто не перепроверит.
	 */
	test("несуществующая календарная дата отклоняется, а не превращается в соседнюю", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		for (const broken of ["2026-02-30", "2026-13-01", "2026-05-00"]) {
			const response = await app.inject({
				method: "GET",
				url: `/api/reports/appointments?from=${broken}&to=2026-05-31`,
				headers: ORG_HEADERS
			});
			assert.equal(response.statusCode, 400, `${broken} принят: ${response.body}`);
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
		// делает его баланс отрицательным. Досев под тенант-контекстом: в WITH CHECK
		// политики `payments` дизъюнкта обхода нет, и вставка без
		// `app.current_tenant` отвергается кодом 42501.
		const [prepayment] = await withFixtureTenant(ORG_ID, async () =>
			db
				.insert(payments)
				.values({ organizationId: ORG_ID, patientId: PATIENT_NEW, amountRub: 4_500.5, status: "paid", paidAt: inPeriod })
				.returning({ id: payments.id })
		);

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
			// Без контекста переплата осталась бы в базе: DELETE не увидел бы её и
			// вернул ноль строк без ошибки, а следующий тест ждёт «переплат нет».
			await withFixtureTenant(ORG_ID, async () => {
				await db.delete(payments).where(eq(payments.id, prepayment?.id ?? ""));
			});
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
