/*
 * ВРЕМЕННЫЙ ПРОБНИК (удалить после снятия доказательства).
 *
 * Строит Fastify-экземпляр целиком и доводит его до ready(). Именно на ready()
 * Fastify собирает валидаторы AJV и сериализаторы fast-json-stringify по всем
 * зарегистрированным маршрутам, поэтому невалидная схема падает здесь, а не на
 * запросе.
 *
 * К БАЗЕ НЕ ПОДКЛЮЧАЕТСЯ. DATABASE_URL выставлен заведомо нерабочей заглушкой
 * ДО импорта db/client.js: loadServerEnv.ts:59 перезаписывает только
 * неопределённые переменные, поэтому настоящее значение из .env не читается.
 * Пул pg создаётся лениво и без запроса соединение не открывает.
 */
process.env.DATABASE_URL =
	"postgres://probe:probe@127.0.0.1:1/probe_no_connect";
process.env.NODE_TEST_CONTEXT ??= "child-v8";
delete process.env.NODE_ENV;

const { createDenteApiApp } = await import("./src/server.js");

const app = await createDenteApiApp({
	startTelegramWorker: false,
	startCommunicationWorker: false,
	startMigrationWorker: false,
});

try {
	await app.ready();
	process.stdout.write("READY_OK\n");

	// Маршруты ищем в самом дереве маршрутизатора: printRoutes ломает путь на
	// сегменты по строкам, поэтому подстрока "sberbank" в одной строке не видна.
	const tree = app.printRoutes({ commonPrefix: false });
	process.stdout.write(
		`SBERBANK_IN_TREE=${tree.includes("sberbank") ? "yes" : "no"}\n`,
	);

	// Валидация AJV живая? Тело заведомо негодное: amount строкой, patientId не uuid.
	const bad = await app.inject({
		method: "POST",
		url: "/api/sberbank/pay",
		headers: { "content-type": "application/json" },
		payload: { patientId: "not-a-uuid", amount: "abc" },
	});
	process.stdout.write(`BAD_BODY_STATUS=${bad.statusCode}\n`);
	process.stdout.write(`BAD_BODY_PAYLOAD=${bad.body.slice(0, 300)}\n`);

	// Тело без обязательных полей вовсе.
	const missing = await app.inject({
		method: "POST",
		url: "/api/sberbank/pay",
		headers: { "content-type": "application/json" },
		payload: {},
	});
	process.stdout.write(`MISSING_BODY_STATUS=${missing.statusCode}\n`);
	process.stdout.write(`MISSING_BODY_PAYLOAD=${missing.body.slice(0, 300)}\n`);

	// Несуществующий маршрут для контраста: подтверждает, что 400 выше — не 404.
	const nope = await app.inject({
		method: "POST",
		url: "/api/sberbank/definitely-not-here",
		headers: { "content-type": "application/json" },
		payload: {},
	});
	process.stdout.write(`UNKNOWN_ROUTE_STATUS=${nope.statusCode}\n`);

	await app.close();
	process.exit(0);
} catch (error) {
	const err = error as { code?: string; message?: string };
	process.stdout.write("READY_FAIL\n");
	process.stdout.write(`FAIL_CODE=${err.code ?? "(none)"}\n`);
	process.stdout.write(`FAIL_MESSAGE=${err.message ?? String(error)}\n`);
	await app.close().catch(() => {});
	process.exit(1);
}
