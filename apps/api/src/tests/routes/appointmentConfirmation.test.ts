import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq, like } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { appointmentActionCodes } from "../../db/communicationsSchema.js";
import {
	appointments,
	clinics,
	communicationOutbox,
	communicationTasks,
	organizations,
	patients,
} from "../../db/schema.js";
import { registerPublicAppointmentActionRoutes } from "../../routes/publicAppointmentActions.js";
import {
	actionCodeExpiry,
	actionLinkFor,
	generateActionCode,
	issueAppointmentActionLinks,
	readPublicBaseUrl,
	resolveActionCode,
} from "../../services/communications/appointmentActionLinks.js";
import { invalidateAppointmentReminders } from "../../services/communications/appointmentReminders.js";
import { describeSmsPayload } from "../../services/communications/templateRenderer.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * Подтверждение приёма пациентом в одно касание и снятие устаревших напоминаний.
 *
 * ЗАЧЕМ ЭТО ВАЖНО. Напоминание уменьшает неявки, но не отвечает на вопрос
 * «придёт ли». Тот, кто не может прийти, обычно молчит: звонить неудобно,
 * промолчать легко. Одно касание меняет исход — администратор либо не тратит
 * утро на обзвон, либо получает освободившийся слот заранее.
 *
 * ВТОРАЯ ЧАСТЬ — ИСПРАВЛЕНИЕ ДЫРЫ В САМИХ НАПОМИНАНИЯХ. Напоминание ставится в
 * очередь заранее и несёт в тексте дату и время. После переноса приёма оно
 * оставалось в очереди с прежним временем, и пациент получил бы «ждём вас
 * 12 августа в 14:30» на приём, которого в это время уже нет.
 *
 * ТРЕТЬЕ, ЧТО ЗДЕСЬ ЗАКРЕПЛЕНО — ДЛИНА ССЫЛКИ. Первая версия несла подписанный
 * токен на 300 символов: Fastify не сопоставляет параметр маршрута длиннее 100
 * знаков и отвечал 404 у каждого пациента, а в SMS такая ссылка стоила пяти
 * лишних сегментов.
 */

const ORG_ID = "dce70000-0000-4000-8000-000000000601";
const CLINIC_ID = "dce70000-0000-4000-8000-000000000602";
const PATIENT_ID = "dce70000-0000-4000-8000-000000000603";
const APPOINTMENT_ID = "dce70000-0000-4000-8000-000000000604";
const PAST_APPOINTMENT_ID = "dce70000-0000-4000-8000-000000000605";
const CANCEL_APPOINTMENT_ID = "dce70000-0000-4000-8000-000000000606";
const BASE_URL = "https://clinic.example";

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(
		message,
	);
}

describe("код ссылки на приём", () => {
	test("алфавит кода не содержит похожих знаков", () => {
		// Ссылку из SMS иногда перенабирают с экрана: «O» вместо «0» стоит
		// потерянного приёма.
		for (let attempt = 0; attempt < 200; attempt += 1) {
			const code = generateActionCode();
			assert.equal(code.length, 10);
			assert.equal(
				/[0O1lI]/.test(code),
				false,
				`в коде ${code} есть похожий знак`,
			);
			assert.equal(/^[A-Za-z0-9]+$/.test(code), true);
		}
	});

	test("коды не повторяются", () => {
		const codes = new Set(
			Array.from({ length: 500 }, () => generateActionCode()),
		);
		assert.equal(codes.size, 500);
	});

	test("срок жизни считается от начала приёма с запасом", () => {
		const now = new Date("2026-08-01T09:00:00Z");
		const tomorrow = new Date("2026-08-02T09:00:00Z");
		// Приём плюс шесть часов запаса на ответ пациента.
		assert.equal(
			actionCodeExpiry(tomorrow, now).toISOString(),
			"2026-08-02T15:00:00.000Z",
		);
		// Приём в прошлом: ссылка живёт минимум час от сейчас, но не бессрочно.
		assert.equal(
			actionCodeExpiry(new Date("2026-07-01T09:00:00Z"), now).toISOString(),
			"2026-08-01T10:00:00.000Z",
		);
	});

	test("публичный адрес берётся только из настройки и без пути", () => {
		assert.equal(
			readPublicBaseUrl({
				DENTE_PUBLIC_BASE_URL: "https://clinic.example/portal?a=1",
			}),
			BASE_URL,
		);
		assert.equal(readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "  " }), null);
		assert.equal(readPublicBaseUrl({}), null);
		assert.equal(
			readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "ftp://clinic.example" }),
			null,
		);
		assert.equal(
			readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "не адрес" }),
			null,
		);
	});

	test("ошибка разбора некорректного адреса безопасно перехватывается", () => {
		assert.equal(readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "http://" }), null);
		assert.equal(
			readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "this-is-not-a-url" }),
			null,
		);
		assert.equal(
			readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "http://%" }),
			null,
		);
	});

	test("короткая ссылка втрое дешевле подписанного токена в SMS", () => {
		// Кириллица даёт 70 знаков на сегмент, и клиника платит за каждый.
		// Здесь измеряется ровно та разница, из-за которой токен был заменён кодом.
		const shortLink = actionLinkFor(BASE_URL, generateActionCode());
		assert.ok(
			shortLink.length <= 50,
			`ссылка длиной ${shortLink.length}: ${shortLink}`,
		);

		const text = "Приём 12 августа 14:30. Подтвердить: ";
		const withCode = describeSmsPayload(`${text}${shortLink}`);
		// Токен прежней версии: 300 символов в адресе.
		const withToken = describeSmsPayload(
			`${text}${BASE_URL}/api/public/appointments/${"a".repeat(300)}/confirm`,
		);

		assert.equal(
			withCode.segments,
			2,
			`с кодом получилось ${withCode.segments} сегмент(ов)`,
		);
		assert.ok(
			withToken.segments >= withCode.segments * 3,
			`ожидалась разница не меньше трёхкратной: ${withToken.segments} против ${withCode.segments}`,
		);
	});

	test("Fastify пропускает параметр такой длины", async () => {
		// Прямая проверка того, на чём сломалась первая версия: параметр длиннее
		// 100 знаков не сопоставляется маршрутом, и ответ был 404.
		const app = createTenantTestApp();
		await registerPublicAppointmentActionRoutes(app);
		try {
			const shortCode = generateActionCode();
			const short = await app.inject({
				method: "GET",
				url: `/api/p/${shortCode}`,
			});
			// Код не существует в базе, поэтому 400 — но маршрут найден.
			assert.equal(short.statusCode, 400, short.body.slice(0, 200));

			const long = await app.inject({
				method: "GET",
				url: `/api/p/${"a".repeat(300)}`,
			});
			assert.equal(
				long.statusCode,
				404,
				"параметр в 300 знаков маршрутом не сопоставляется",
			);
		} finally {
			await app.close();
		}
	});
});

/**
 * Одна и та же уборка ДО засева и после прогона — иначе она не уборка.
 *
 * ЧТО ЛОМАЛОСЬ. Уборка стояла только в `after`. Прогон, оборванный до него
 * (Ctrl+C, закрытая труба вида `| head`, убитый процесс, падение соединения),
 * оставлял фикстуру в живой базе, и `onConflictDoNothing` на засеве следующего
 * прогона молча оставлял старые строки вместо своих выданных.
 *
 * ЗДЕСЬ ЭТО БЬЁТ ПРЯМО В ПРОВЕРЯЕМОЕ. Тесты этого файла МЕНЯЮТ status приёма:
 * подтверждение переводит `planned` -> `confirmed`, отмена -> `cancelled`.
 * Остаток от прошлого прогона приходит уже подтверждённым и отменённым, засев
 * его не перезаписывает, и проверки судят по чужому исходу: «подтверждение
 * ставит confirmed» зеленеет на строке, которую подтвердил ПРЕДЫДУЩИЙ прогон, а
 * «повторное подтверждение не меняет состояние» теряет смысл целиком. Время
 * приёма отсчитывается от «сейчас», поэтому остаток вдобавок несёт чужие
 * `startsAt`/`endsAt` — вчерашний «завтрашний» приём становится прошедшим.
 *
 * Уборка общая на все три describe этого файла: организация `dce70000-…-0601` у
 * них одна. Порядок удаления — от зависимых строк к организации.
 */
async function purgeFixtures(): Promise<void> {
	/*
	 * Уборка идёт под тенант-контекстом клиники. Под FORCE RLS запрос без
	 * `app.current_tenant` не видит ни одной строки этой организации, а DELETE,
	 * не увидевший строк, снимает НОЛЬ и ошибкой это не считается: уборка
	 * отчиталась бы об успехе, оставив приёмы прошлого прогона подтверждёнными.
	 */
	await withFixtureTenant(ORG_ID, async () => {
		await db
			.delete(appointmentActionCodes)
			.where(eq(appointmentActionCodes.organizationId, ORG_ID));
		await db
			.delete(communicationOutbox)
			.where(eq(communicationOutbox.organizationId, ORG_ID));
		await db
			.delete(communicationTasks)
			.where(eq(communicationTasks.organizationId, ORG_ID));
		await db
			.delete(appointments)
			.where(eq(appointments.organizationId, ORG_ID));
		await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
		await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
		await db.delete(organizations).where(eq(organizations.id, ORG_ID));
	});
}

describe("страница подтверждения приёма", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
	const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const env = { DENTE_PUBLIC_BASE_URL: BASE_URL };

	before(async () => {
		app = createTenantTestApp();
		await registerPublicAppointmentActionRoutes(app);

		try {
			// Сначала расчистить место за оборванным прогоном, потом сеять: иначе
			// приёмы придут уже подтверждёнными и отменёнными, см. purgeFixtures.
			await purgeFixtures();

			/*
			 * Сев под тенант-контекстом клиники. У всех тенант-таблиц в WITH CHECK
			 * стоит только `organization_id = current_tenant`, поэтому INSERT без
			 * контекста отвергается кодом 42501 и до проверок дело не доходит.
			 */
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({ id: ORG_ID, name: "Клиника подтверждений" });
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Клиника на Ленина",
					timezone: "Europe/Moscow",
				});
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Подтвердов Пётр Петрович",
				});
				await db.insert(appointments).values([
					{
						id: APPOINTMENT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						status: "planned",
						startsAt: soon,
						endsAt: new Date(soon.getTime() + 3_600_000),
					},
					{
						id: PAST_APPOINTMENT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						status: "planned",
						startsAt: past,
						endsAt: new Date(past.getTime() + 3_600_000),
					},
					{
						id: CANCEL_APPOINTMENT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						status: "confirmed",
						startsAt: soon,
						endsAt: new Date(soon.getTime() + 3_600_000),
					},
				]);
			});
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtures();
		}
		await app.close();
	});

	/** Путь для запроса из выданной ссылки. */
	function pathOf(link: string): string {
		return link.slice(BASE_URL.length);
	}

	test("без публичного адреса ссылки не выдаются", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Сообщение с нерабочей ссылкой хуже сообщения без неё.
		const links = await issueAppointmentActionLinks(
			{ organizationId: ORG_ID, appointmentId: APPOINTMENT_ID, startsAt: soon },
			new Date(),
			{},
		);
		assert.equal(links, null);
	});

	test("подтверждение переводит приём в confirmed и показывает страницу", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		/*
		 * Выдача ссылок ВСТАВЛЯЕТ коды, а сверка статуса ЧИТАЕТ приём. В бою обе
		 * операции идут внутри `withTenantCtx` (планировщик напоминаний, маршрут);
		 * вызванные из теста напрямую, без контекста они дают 42501 на вставке и
		 * пустую выборку на чтении — `row?.status` был бы undefined.
		 */
		const links = await withFixtureTenant(ORG_ID, async () =>
			issueAppointmentActionLinks(
				{
					organizationId: ORG_ID,
					appointmentId: APPOINTMENT_ID,
					startsAt: soon,
				},
				new Date(),
				env,
			),
		);
		assert.ok(links);

		const response = await app.inject({
			method: "GET",
			url: pathOf(links.confirmLink),
		});
		assert.equal(response.statusCode, 200, response.body.slice(0, 300));
		// Пациент открывает ссылку в телефоне: ответ — страница, а не JSON.
		assert.ok(response.headers["content-type"]?.includes("text/html"));
		assert.ok(
			response.body.includes("подтверждён"),
			response.body.slice(0, 300),
		);
		assert.ok(response.body.includes("Клиника на Ленина"));
		// Ссылка на запись пациента не должна попадать в поисковики.
		assert.ok(response.body.includes('name="robots" content="noindex'));

		const [row] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ status: appointments.status })
				.from(appointments)
				.where(eq(appointments.id, APPOINTMENT_ID)),
		);
		assert.equal(row?.status, "confirmed");
	});

	test("повторное нажатие не считается ошибкой", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const links = await withFixtureTenant(ORG_ID, async () =>
			issueAppointmentActionLinks(
				{
					organizationId: ORG_ID,
					appointmentId: APPOINTMENT_ID,
					startsAt: soon,
				},
				new Date(),
				env,
			),
		);
		assert.ok(links);
		const response = await app.inject({
			method: "GET",
			url: pathOf(links.confirmLink),
		});
		assert.equal(response.statusCode, 200, response.body.slice(0, 200));
		assert.ok(response.body.includes("уже подтверждён"));
	});

	test("повторная выдача возвращает тот же код", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Напоминание может уйти дважды — за сутки и за два часа. В обоих
		// сообщениях должна быть одна ссылка, иначе первая перестанет работать.
		const first = await withFixtureTenant(ORG_ID, async () =>
			issueAppointmentActionLinks(
				{
					organizationId: ORG_ID,
					appointmentId: APPOINTMENT_ID,
					startsAt: soon,
				},
				new Date(),
				env,
			),
		);
		const second = await withFixtureTenant(ORG_ID, async () =>
			issueAppointmentActionLinks(
				{
					organizationId: ORG_ID,
					appointmentId: APPOINTMENT_ID,
					startsAt: soon,
				},
				new Date(),
				env,
			),
		);
		assert.equal(first?.confirmLink, second?.confirmLink);
		assert.equal(first?.cancelLink, second?.cancelLink);
	});

	test("прошедший приём подтвердить нельзя, и об этом сказано понятно", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const links = await withFixtureTenant(ORG_ID, async () =>
			issueAppointmentActionLinks(
				{
					organizationId: ORG_ID,
					appointmentId: PAST_APPOINTMENT_ID,
					startsAt: past,
				},
				new Date(),
				env,
			),
		);
		assert.ok(links);
		const response = await app.inject({
			method: "GET",
			url: pathOf(links.confirmLink),
		});
		assert.equal(response.statusCode, 409, response.body.slice(0, 300));
		assert.ok(
			response.body.includes("уже прошёл"),
			response.body.slice(0, 300),
		);
	});

	test("просроченный код не срабатывает", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Код на пару «приём + действие» один: сдвигаем срок у существующего, а
		// не вставляем второй — на это есть уникальный индекс.
		const links = await withFixtureTenant(ORG_ID, async () =>
			issueAppointmentActionLinks(
				{
					organizationId: ORG_ID,
					appointmentId: APPOINTMENT_ID,
					startsAt: soon,
				},
				new Date(),
				env,
			),
		);
		assert.ok(links);
		const code = links.cancelLink.slice(links.cancelLink.lastIndexOf("/") + 1);

		// UPDATE без контекста не видит строки и меняет НОЛЬ строк, не сообщая об
		// этом: срок остался бы прежним, и проверка судила бы о живой ссылке.
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.update(appointmentActionCodes)
				.set({ expiresAt: new Date(Date.now() - 60_000) })
				.where(eq(appointmentActionCodes.code, code));
		});

		const resolved = await resolveActionCode(code);
		assert.equal(resolved?.expired, true);

		const response = await app.inject({ method: "GET", url: `/api/p/${code}` });
		assert.equal(response.statusCode, 400, response.body.slice(0, 200));
		assert.ok(response.body.includes("недействительна"));

		// Возвращаем срок: следующие проверки опираются на живые ссылки.
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.update(appointmentActionCodes)
				.set({ expiresAt: actionCodeExpiry(soon) })
				.where(eq(appointmentActionCodes.code, code));
		});
	});

	test("неизвестный и просроченный код отвечают одинаково", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// По разнице ответов можно было бы перебором находить живые ссылки.
		const unknown = await app.inject({
			method: "GET",
			url: `/api/p/${generateActionCode()}`,
		});
		assert.equal(unknown.statusCode, 400);
		assert.ok(unknown.body.includes("недействительна"));
	});

	test("мусор вместо кода не доходит до базы", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		assert.equal(await resolveActionCode("короткий"), null);
		assert.equal(await resolveActionCode("с-дефисом-и-длинный"), null);
		assert.equal(await resolveActionCode(""), null);
	});

	test("отмена освобождает слот, снимает напоминание и ставит задачу администратору", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Напоминание уже стоит в очереди — после отказа оно уйти не должно.
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(communicationOutbox).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				channel: "sms",
				intent: "appointment_confirmation",
				recipientAddress: "79160000601",
				body: "Ждём вас завтра",
				status: "queued",
				dedupeKey: `reminder:${CANCEL_APPOINTMENT_ID}:24`,
			});
		});

		const links = await withFixtureTenant(ORG_ID, async () =>
			issueAppointmentActionLinks(
				{
					organizationId: ORG_ID,
					appointmentId: CANCEL_APPOINTMENT_ID,
					startsAt: soon,
				},
				new Date(),
				env,
			),
		);
		assert.ok(links);

		const response = await app.inject({
			method: "GET",
			url: pathOf(links.cancelLink),
		});
		assert.equal(response.statusCode, 200, response.body.slice(0, 300));
		assert.ok(response.body.includes("отменён"), response.body.slice(0, 300));

		const [row] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ status: appointments.status })
				.from(appointments)
				.where(eq(appointments.id, CANCEL_APPOINTMENT_ID)),
		);
		assert.equal(row?.status, "cancelled");

		// Пациент, только что отказавшийся, не должен получить «ждём вас завтра».
		const leftovers = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: communicationOutbox.id })
				.from(communicationOutbox)
				.where(
					and(
						eq(communicationOutbox.organizationId, ORG_ID),
						like(
							communicationOutbox.dedupeKey,
							`reminder:${CANCEL_APPOINTMENT_ID}:%`,
						),
					),
				),
		);
		assert.equal(leftovers.length, 0);

		// Отмена не проходит молча: администратор должен узнать о слоте.
		const tasks = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					title: communicationTasks.title,
					priority: communicationTasks.priority,
					body: communicationTasks.body,
				})
				.from(communicationTasks)
				.where(eq(communicationTasks.organizationId, ORG_ID)),
		);
		assert.equal(tasks.length, 1, JSON.stringify(tasks));
		assert.ok(tasks[0]?.title.includes("отменил"));
		assert.equal(tasks[0]?.priority, "high");
		assert.ok(tasks[0]?.body.includes("листа ожидания"));
	});

	test("повторная отмена не создаёт вторую задачу", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const links = await withFixtureTenant(ORG_ID, async () =>
			issueAppointmentActionLinks(
				{
					organizationId: ORG_ID,
					appointmentId: CANCEL_APPOINTMENT_ID,
					startsAt: soon,
				},
				new Date(),
				env,
			),
		);
		assert.ok(links);
		const response = await app.inject({
			method: "GET",
			url: pathOf(links.cancelLink),
		});
		assert.equal(response.statusCode, 200, response.body.slice(0, 200));
		assert.ok(response.body.includes("уже отменён"));

		const tasks = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: communicationTasks.id })
				.from(communicationTasks)
				.where(eq(communicationTasks.organizationId, ORG_ID)),
		);
		assert.equal(tasks.length, 1);
	});

	test("переход по ссылке отмечается временем", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const rows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					action: appointmentActionCodes.action,
					usedAt: appointmentActionCodes.usedAt,
				})
				.from(appointmentActionCodes)
				.where(eq(appointmentActionCodes.appointmentId, CANCEL_APPOINTMENT_ID)),
		);
		const cancelCode = rows.find((row) => row.action === "cancel");
		assert.notEqual(cancelCode?.usedAt, null);
	});
});

describe("снятие устаревших напоминаний", () => {
	let databaseAvailable = true;

	before(async () => {
		try {
			/*
			 * Уборка и здесь, хотя describe выше уже убрал за собой: гарантию даёт
			 * не сосед, а собственный вход. Проверка ниже вставляет напоминания с
			 * dedupeKey, а у communication_outbox есть unique(org, dedupe_key) —
			 * остаток от оборванного прогона ронял бы вставку на этом ограничении.
			 */
			await purgeFixtures();

			// Тот же тенант-контекст, что и у сева выше: без него вставка
			// организации и пациента отвергается кодом 42501.
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({ id: ORG_ID, name: "Клиника подтверждений" });
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Подтвердов Пётр Петрович",
				});
			});
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtures();
		}
	});

	test("снимаются только неотправленные напоминания этого приёма", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const targetAppointment = "dce70000-0000-4000-8000-000000000611";
		const otherAppointment = "dce70000-0000-4000-8000-000000000612";

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(communicationOutbox).values([
				{
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					channel: "sms",
					intent: "appointment_confirmation",
					recipientAddress: "79160000611",
					body: "Напоминание за сутки",
					status: "queued",
					dedupeKey: `reminder:${targetAppointment}:24`,
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					channel: "sms",
					intent: "appointment_confirmation",
					recipientAddress: "79160000611",
					body: "Напоминание за два часа",
					status: "queued",
					dedupeKey: `reminder:${targetAppointment}:2`,
				},
				{
					// Уже отправленное не трогаем: историю переписывать нельзя.
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					channel: "sms",
					intent: "appointment_confirmation",
					recipientAddress: "79160000611",
					body: "Уже отправлено",
					status: "sent",
					sentAt: new Date(),
					dedupeKey: `reminder:${targetAppointment}:48`,
				},
				{
					// Напоминание другого приёма.
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					channel: "sms",
					intent: "appointment_confirmation",
					recipientAddress: "79160000611",
					body: "Другой приём",
					status: "queued",
					dedupeKey: `reminder:${otherAppointment}:24`,
				},
				{
					// Рассылка: ключ другой, снятие её не касается.
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					channel: "sms",
					intent: "general",
					recipientAddress: "79160000611",
					body: "Рассылка",
					status: "queued",
					dedupeKey: `campaign:some-campaign:${PATIENT_ID}`,
				},
			]);
		});

		const removed = await invalidateAppointmentReminders(
			ORG_ID,
			targetAppointment,
			"перенос в тесте",
		);
		assert.equal(
			removed,
			2,
			"должны сняться ровно два неотправленных напоминания этого приёма",
		);

		const remaining = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ dedupeKey: communicationOutbox.dedupeKey })
				.from(communicationOutbox)
				.where(eq(communicationOutbox.organizationId, ORG_ID)),
		);

		assert.deepEqual(
			remaining.map((row) => row.dedupeKey).sort(),
			[
				`campaign:some-campaign:${PATIENT_ID}`,
				`reminder:${otherAppointment}:24`,
				`reminder:${targetAppointment}:48`,
			].sort(),
		);
	});

	test("повторный вызов ничего не ломает", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const removed = await invalidateAppointmentReminders(
			ORG_ID,
			"dce70000-0000-4000-8000-000000000611",
			"повтор",
		);
		assert.equal(removed, 0);
	});
});
