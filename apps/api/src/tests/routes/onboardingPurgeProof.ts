/**
 * Разведка перед удалением недостижимого мастера первого запуска.
 *
 * Это НЕ юнит-тест (имя без `.test.ts`, `npm test` его не подхватывает). Он
 * поднимает СВОЙ экземпляр приложения и печатает настоящее дерево маршрутов,
 * потому что общий сервер разработки на 4100 отдаёт устаревший код и по его
 * ответу нельзя судить, существует ли маршрут.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx src/tests/routes/onboardingPurgeProof.ts
 *
 * Проверяется ровно четыре утверждения, каждое — фактом, а не догадкой:
 *   1. зарегистрирован ли POST /api/system/analyze-legacy-db (его зовёт Step7Migration);
 *   2. зарегистрирован ли POST /api/workspace/onboarding/complete (его зовёт мастер);
 *   3. какие /api/migration/* маршруты есть на самом деле (их зовёт достижимый
 *      MigrationWizard из вкладки «Импорт»);
 *   4. чем отвечает маршрут онбординга на запрос БЕЗ заголовков авторизации —
 *      именно так его зовёт useOnboardingLogic.ts:158.
 *
 * Ничего не пишет и ничего не удаляет: только чтение дерева маршрутов и один
 * запрос без токенов, который обязан быть отклонён.
 */

import { createDenteApiApp } from "../../server.js";

const PROBE_PATHS = [
	"/api/system/analyze-legacy-db",
	"/api/workspace/onboarding/complete",
] as const;

async function main(): Promise<void> {
	const app = await createDenteApiApp({
		startTelegramWorker: false,
		startCommunicationWorker: false,
		startMigrationWorker: false,
	});
	try {
		await app.ready();

		const tree = app.printRoutes({ commonPrefix: false });

		console.log("=== ПОИСК ПО ЖИВОМУ ДЕРЕВУ МАРШРУТОВ ===");
		for (const probe of PROBE_PATHS) {
			console.log(`${probe}: ${tree.includes(probe) ? "ЕСТЬ в дереве" : "НЕТ в дереве"}`);
		}

		console.log("\n=== ВСЕ МАРШРУТЫ, СОДЕРЖАЩИЕ migration ИЛИ imports ===");
		for (const line of tree.split("\n")) {
			if (/migration|imports|onboarding|legacy/i.test(line)) console.log(line);
		}

		/*
		 * Конвейер переноса зовёт достижимый MigrationWizard из вкладки «Импорт».
		 * printRoutes сворачивает потомков параметрического узла, поэтому наличие
		 * проверяется запросом: 404 значит маршрута нет, любой другой код — есть.
		 */
		console.log("\n=== КОНВЕЙЕР ПЕРЕНОСА, КОТОРЫЙ ЗОВЁТ MigrationWizard ===");
		const pipeline: ReadonlyArray<{ method: "GET" | "POST"; url: string; caller: string }> = [
			{ method: "POST", url: "/api/migration/upload", caller: "MigrationWizard.tsx:239" },
			{ method: "POST", url: "/api/migration/00000000-0000-0000-0000-000000000000/map", caller: ":274" },
			{ method: "GET", url: "/api/migration/00000000-0000-0000-0000-000000000000", caller: ":296" },
			{ method: "GET", url: "/api/migration/00000000-0000-0000-0000-000000000000/reconciliation", caller: ":304" },
			{ method: "POST", url: "/api/migration/00000000-0000-0000-0000-000000000000/execute", caller: ":321" },
			{ method: "POST", url: "/api/migration/rollback", caller: ":369" },
			{ method: "POST", url: "/api/migration/discover", caller: ":394" },
		];
		for (const probe of pipeline) {
			const response = await app.inject({ method: probe.method, url: probe.url });
			console.log(
				`${probe.method} ${probe.url} → HTTP ${response.statusCode} ` +
					`(${response.statusCode === 404 ? "МАРШРУТА НЕТ" : "маршрут есть"}) зовёт ${probe.caller}`,
			);
		}

		console.log("\n=== ОТВЕТ МАРШРУТА ОНБОРДИНГА БЕЗ ЗАГОЛОВКОВ АВТОРИЗАЦИИ ===");
		console.log("(именно так его зовёт useOnboardingLogic.ts:158)");
		const unauthorized = await app.inject({
			method: "POST",
			url: "/api/workspace/onboarding/complete",
			headers: { "Content-Type": "application/json" },
			payload: {
				specs: ["therapy"],
				chairs: 3,
				workHours: [9, 20],
				modules: { lab: true },
				theme: "teal",
				staff: [{ id: "1", fullName: "Иванов И.И.", role: "Врач", percentage: 25 }],
				legal: { inn: "", ogrn: "", address: "" },
			},
		});
		console.log(`HTTP ${unauthorized.statusCode}`);
		console.log(unauthorized.body.slice(0, 500));

		console.log("\n=== ОТВЕТ analyze-legacy-db БЕЗ ЗАГОЛОВКОВ (наличие маршрута) ===");
		const legacy = await app.inject({
			method: "POST",
			url: "/api/system/analyze-legacy-db",
			headers: { "Content-Type": "application/json" },
			payload: { fileName: "test.dbf", fileBase64: "" },
		});
		console.log(`HTTP ${legacy.statusCode}`);
		console.log(legacy.body.slice(0, 500));
	} finally {
		await app.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
