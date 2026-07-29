/**
 * ВРЕМЕННЫЙ ПРОБ ПЛАНИРОВЩИКА (имя без `.test.ts`, `npm test` его не подхватывает).
 * Удаляется сразу после прогона, в дерево не коммитится.
 *
 * Вопрос: что фактически получает клиент, который зовёт GET /api/templates так,
 * как это делает apps/web/src/components/VisitDiaryTemplateSelector.tsx — то есть
 * БЕЗ токена клиники и БЕЗ токена сотрудника. Разведка утверждала, что доктор
 * видит пустой список из-за провала посева шаблонов; проверяем, доходит ли запрос
 * до кода посева вообще.
 *
 * Запись в базу: её здесь быть не должно. Если ответ 401/403, обработчик
 * прерывается до ensureClinicalTemplatesSeeded, то есть проб read-only.
 *
 * ЗАПУСК (cwd apps/api): node --import tsx src/tests/routes/_planTemplatesAuthProbe.ts
 */

import Fastify from "fastify";
import registerTemplateRoutes from "../../routes/templates.js";

async function main(): Promise<void> {
	const app = Fastify({ logger: false });
	await registerTemplateRoutes(app);
	await app.ready();

	const asWebClient = await app.inject({
		method: "GET",
		url: "/api/templates",
		headers: { "Content-Type": "application/json" },
	});
	console.log("СЦЕНАРИЙ: GET /api/templates ровно как из VisitDiaryTemplateSelector");
	console.log(`  СТАТУС : ${asWebClient.statusCode}`);
	console.log(`  ТЕЛО   : ${asWebClient.body.slice(0, 300)}`);

	const create = await app.inject({
		method: "POST",
		url: "/api/templates",
		headers: { "Content-Type": "application/json" },
		payload: { title: "" },
	});
	console.log("СЦЕНАРИЙ: POST /api/templates без токенов");
	console.log(`  СТАТУС : ${create.statusCode}`);
	console.log(`  ТЕЛО   : ${create.body.slice(0, 300)}`);

	await app.close();
}

main().catch((error) => {
	console.error("проб упал:", error);
	process.exit(2);
});
