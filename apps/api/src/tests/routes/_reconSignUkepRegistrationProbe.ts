/**
 * ОДНОРАЗОВЫЙ ПРОБ РАЗВЕДКИ (имя без `.test.ts`, `npm test` его не подхватывает).
 * Удаляется после прогона — в дерево не коммитится.
 *
 * Вопрос: отвечает ли POST /api/documents/:id/sign-ukep в рантайме, если
 * registerDocumentRoutes его не вызывает. Статический разбор это показал, но
 * ловушка №1 требует мерить В ПРОЦЕССЕ (app.inject), а не через общий
 * dev-сервер на 4100, который наблюдался устаревшим.
 *
 * Проб УМЕЕТ ПОКРАСНЕТЬ (ловушка №5): в нём два контроля.
 *   КОНТРОЛЬ А: живой сосед POST /api/documents/:id/issue из того же
 *               registerDocumentRoutes обязан ответить НЕ 404. 404 здесь
 *               означает сломанный проб, а не мёртвый маршрут.
 *   КОНТРОЛЬ Б: тот же signUkep, зарегистрированный НАПРЯМУЮ на чистом
 *               приложении, обязан ответить НЕ 404. 404 здесь означает неверный
 *               путь или метод в пробе, и вывод «маршрут мёртв» недопустим.
 *
 * ЗАПУСК (cwd apps/api — оттуда загрузчик поднимает DATABASE_URL):
 *   node --import tsx src/tests/routes/_reconSignUkepRegistrationProbe.ts
 */

import Fastify from "fastify";
import { registerDocumentRoutes } from "../../routes/documents.js";
import { register as registerSignUkepDirectly } from "../../routes/documents/signUkep.js";

const DOCUMENT_ID = "00000000-0000-0000-0000-000000000000";

let failures = 0;

function report(label: string, statusCode: number, expectation: "404" | "not-404"): void {
	const ok = expectation === "404" ? statusCode === 404 : statusCode !== 404;
	if (!ok) failures += 1;
	console.log(`${ok ? "OK  " : "FAIL"} ${label}: HTTP ${statusCode} (ожидалось ${expectation})`);
}

async function main(): Promise<void> {
	const app = Fastify({ logger: false });
	await registerDocumentRoutes(app);
	await app.ready();

	const ukep = await app.inject({
		method: "POST",
		url: `/api/documents/${DOCUMENT_ID}/sign-ukep`,
		payload: { pkcs7Signature: "проб-разведки" },
	});
	report("POST /api/documents/:id/sign-ukep через registerDocumentRoutes", ukep.statusCode, "404");

	const simpleSign = await app.inject({
		method: "POST",
		url: `/api/documents/${DOCUMENT_ID}/sign`,
		payload: { signatureSvg: "<svg/>" },
	});
	report("POST /api/documents/:id/sign через registerDocumentRoutes", simpleSign.statusCode, "404");

	const issue = await app.inject({
		method: "POST",
		url: `/api/documents/${DOCUMENT_ID}/issue`,
		payload: {},
	});
	report("КОНТРОЛЬ А, живой сосед POST /api/documents/:id/issue", issue.statusCode, "not-404");

	console.log(`   тело ответа sign-ukep: ${ukep.body.slice(0, 200)}`);
	await app.close();

	const direct = Fastify({ logger: false });
	await registerSignUkepDirectly(direct);
	await direct.ready();
	const directUkep = await direct.inject({
		method: "POST",
		url: `/api/documents/${DOCUMENT_ID}/sign-ukep`,
		payload: { pkcs7Signature: "проб-разведки" },
	});
	report("КОНТРОЛЬ Б, signUkep подключён напрямую", directUkep.statusCode, "not-404");
	console.log(`   тело ответа при прямой регистрации: ${directUkep.body.slice(0, 200)}`);
	await direct.close();

	console.log(failures === 0 ? "ИТОГ: проб сошёлся" : `ИТОГ: расхождений ${failures}`);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
	console.error("проб упал:", error);
	process.exit(2);
});
