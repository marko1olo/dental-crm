/**
 * СОБСТВЕННЫЙ listen для разведки раздела «Связь».
 *
 * ЗАЧЕМ. Живого API на 127.0.0.1:4100 сейчас нет: два чужих `tsx watch
 * src/server.ts` (запущены 22:27) не занимают порт, а `npx tsx src/server.ts`
 * доходит до вывода стартовых строк и не доходит до listen — в это же время в
 * дереве идёт полный прогон тестов API (`node --import tsx --test`), который
 * держит общую PostgreSQL. Снимать интерфейс без API нельзя: экран показывает
 * «Рабочий сервер недоступен», и это был бы снимок не раздела, а ошибки связи.
 *
 * Поэтому поднимается своё приложение теми же маршрутами, но БЕЗ фоновых
 * рабочих: именно `await startMigrationWorker()` внутри createDenteApiApp стоит
 * перед listen и упирается в занятую базу. Ни один маршрут при этом не
 * подменяется — отвечает тот же код, что в бою.
 *
 * Ничего не пишет в дерево и ничего не сеет в базу.
 */

import { createDenteApiApp } from "../apps/api/src/server.js";

const host = process.env.API_HOST ?? "127.0.0.1";
const port = Number(process.env.API_PORT ?? 4100);

const app = await createDenteApiApp({
	startTelegramWorker: false,
	startCommunicationWorker: false,
	startMigrationWorker: false
});

await app.listen({ host, port });
console.log(`[recon] API слушает http://${host}:${port}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		void app.close().then(() => process.exit(0));
	});
}
