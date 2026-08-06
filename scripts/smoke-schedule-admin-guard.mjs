import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_SCHEDULE_ADMIN_SECRET = "synthetic-schedule-secret";
/*
 * Секрет подписи токенов — синтетический и обязателен здесь.
 *
 * Сценарий работает под `NODE_ENV=production` намеренно: он проверяет, что в бою
 * охрана расписания закрывается, а не открывается послаблением. Но в production
 * `authTokenSecret()` СПРАВЕДЛИВО отказывается работать без `AUTH_TOKEN_SECRET`
 * («не подписывать токены известным секретом») — и без этой строки сценарий
 * падает на своём же правильном стороже, не дойдя до проверки.
 */
process.env.AUTH_TOKEN_SECRET =
	"synthetic-auth-token-secret-for-schedule-guard-smoke";

const routePath = path.resolve("apps/api/dist/routes/schedule.js");

if (!existsSync(routePath)) {
	throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerScheduleRoutes } = await import(pathToFileURL(routePath).href);
const { signToken } = await import(
	pathToFileURL(path.resolve("apps/api/dist/utils/cryptoHelper.js")).href
);
const { authTokenSecret } = await import(
	pathToFileURL(path.resolve("apps/api/dist/security/authSecret.js")).href
);

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

/*
 * ТОКЕН КАБИНЕТА ОБЯЗАТЕЛЕН, ИНАЧЕ СТОРОЖ ПРОВЕРЯЕТ НЕ СЕКРЕТ, А ВХОД.
 *
 * Этот сценарий был КРАСНЫМ и до того, как охрану расписания вообще подключили:
 * он посылал запрос без токена кабинета и ждал 403, а получал 401. Порядок
 * барьеров в маршруте — сначала кабинет, потом секрет, и это сознательное
 * решение: с секретом первым администратор с истёкшим входом получал бы 503 про
 * настройку сервера вместо «войдите заново». Значит запрос без токена до секрета
 * не доходит НИКОГДА, и сценарий не проверял секрет ни одного дня своей жизни.
 *
 * Токен подписывается тем же секретом, что и в бою (`authTokenSecret`), поэтому
 * гейт остаётся настоящим: проверяется секрет расписания, а не послабление.
 */
const clinicToken = signToken(
	{ organizationId: "d0000000-0000-4000-8000-00000000d001" },
	authTokenSecret(),
);
const clinicHeaders = {
	"content-type": "application/json",
	"x-dente-clinic-token": clinicToken,
};

const scheduleRouteSource = readFileSync(
	"apps/api/src/routes/schedule.ts",
	"utf8",
);
const configuredSecretFunction =
	scheduleRouteSource.match(
		/function configuredScheduleAdminSecret\(\): string \| null \{[\s\S]*?\n\}/,
	)?.[0] ?? "";
assert(
	configuredSecretFunction.includes("DENTE_SCHEDULE_ADMIN_SECRET"),
	"schedule guard must read DENTE_SCHEDULE_ADMIN_SECRET",
);
assert(
	!configuredSecretFunction.includes("DENTE_SETTINGS_ADMIN_SECRET"),
	"schedule guard must not accept settings admin secret fallback",
);
assert(
	!configuredSecretFunction.includes("DENTE_TELEGRAM_ADMIN_SECRET"),
	"schedule guard must not accept Telegram admin secret fallback",
);

const app = Fastify({ logger: false });
await registerScheduleRoutes(app);

const request = {
	method: "PATCH",
	url: "/api/appointments/59d16574-5f6e-4cc7-9f49-2da2f126e11d",
	headers: clinicHeaders,
	payload: { reason: "Schedule admin guard smoke" },
};

const missingSecretResponse = await app.inject(request);
assert(
	missingSecretResponse.statusCode === 403,
	`missing schedule secret must block mutation: ${missingSecretResponse.statusCode}`,
);
assert(
	missingSecretResponse.json().error === "ScheduleAdminSecretRequired",
	"missing schedule secret error mismatch",
);

const wrongSecretResponse = await app.inject({
	...request,
	headers: { ...clinicHeaders, "x-dente-admin-secret": "wrong-secret" },
});
assert(
	wrongSecretResponse.statusCode === 403,
	`wrong schedule secret must block mutation: ${wrongSecretResponse.statusCode}`,
);
assert(
	wrongSecretResponse.json().error === "ScheduleAdminSecretRequired",
	"wrong schedule secret error mismatch",
);

/*
 * ВЕРНЫЙ СЕКРЕТ ОБЯЗАН ПРОПУСТИТЬ ЗА ОХРАНУ — И БОЛЬШЕ НИЧЕГО.
 *
 * Здесь стояло `statusCode === 200` и чтение `appointments` из ответа. Ни того,
 * ни другого быть не может: приёма `59d16574…` в базе нет, маршрут таких полей
 * больше не возвращает, а сценарий работает под `NODE_ENV=production` без живой
 * базы. То есть утверждение описывало ответ, которого не бывает, и держало
 * сценарий красным независимо от состояния охраны.
 *
 * Область сценария — ОХРАНА, а не маршрут. Поэтому проверяется ровно то, что
 * охрана пропустила: ответ НЕ 403 и НЕ 503 и не несёт кодов охраны. Что будет
 * дальше — забота маршрута и его собственных проверок.
 */
const allowedResponse = await app.inject({
	...request,
	headers: {
		...clinicHeaders,
		"x-dente-admin-secret": process.env.DENTE_SCHEDULE_ADMIN_SECRET,
	},
});
assert(
	allowedResponse.statusCode !== 403 && allowedResponse.statusCode !== 503,
	`valid schedule secret must pass the guard: ${allowedResponse.statusCode} ${allowedResponse.body}`,
);
{
	let guardCode = null;
	try {
		guardCode = allowedResponse.json().error ?? null;
	} catch {
		guardCode = null;
	}
	assert(
		guardCode !== "ScheduleAdminSecretRequired" &&
			guardCode !== "ScheduleAdminSecretMissing",
		`valid schedule secret still rejected by the guard: ${allowedResponse.body}`,
	);
}

const createWithoutSecretResponse = await app.inject({
	method: "POST",
	url: "/api/appointments",
	// Токен кабинета есть, секрета администратора нет: проверяется именно секрет.
	// Без токена этот запрос упирался бы в 401 на входе и до охраны не доходил.
	headers: clinicHeaders,
	payload: {
		patientId: "fe736762-aef9-46c2-94d8-0ba5ea1bd11a",
		doctorUserId: "8356141b-7cfa-4221-95f7-70f47e7344b1",
		assistantUserId: "f365da0c-7094-4f80-b52d-59b7b1254791",
		chairId: "b5450677-b0fc-4228-9672-56b27062783f",
		status: "planned",
		startsAt: "2026-05-26T14:00:00+04:00",
		endsAt: "2026-05-26T14:30:00+04:00",
		reason: "Schedule admin guard create smoke",
	},
});
assert(
	createWithoutSecretResponse.statusCode === 403,
	"missing schedule secret must block appointment creation",
);

delete process.env.DENTE_SCHEDULE_ADMIN_SECRET;
process.env.DENTE_SETTINGS_ADMIN_SECRET = "synthetic-settings-only-secret";

const settingsOnlyResponse = await app.inject({
	...request,
	headers: {
		...clinicHeaders,
		"x-dente-admin-secret": process.env.DENTE_SETTINGS_ADMIN_SECRET,
	},
});
assert(
	settingsOnlyResponse.statusCode === 503,
	`settings-only secret must not unlock schedule mutation: ${settingsOnlyResponse.statusCode}`,
);
assert(
	settingsOnlyResponse.json().error === "ScheduleAdminSecretMissing",
	"settings-only schedule error mismatch",
);

delete process.env.DENTE_SETTINGS_ADMIN_SECRET;
process.env.DENTE_TELEGRAM_ADMIN_SECRET = "synthetic-telegram-only-secret";

const telegramOnlyResponse = await app.inject({
	...request,
	headers: {
		...clinicHeaders,
		"x-dente-admin-secret": process.env.DENTE_TELEGRAM_ADMIN_SECRET,
	},
});
assert(
	telegramOnlyResponse.statusCode === 503,
	`Telegram-only secret must not unlock schedule mutation: ${telegramOnlyResponse.statusCode}`,
);
assert(
	telegramOnlyResponse.json().error === "ScheduleAdminSecretMissing",
	"Telegram-only schedule error mismatch",
);

await app.close();

delete process.env.DENTE_TELEGRAM_ADMIN_SECRET;

console.log(
	JSON.stringify(
		{
			ok: true,
			scheduleAdminGuard: true,
			domainScopedSecret: true,
			productionFailsClosed: true,
		},
		null,
		2,
	),
);
