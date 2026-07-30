/**
 * ОДНОРАЗОВЫЙ ПРОБ РАЗВЕДКИ (не тест, `npm test` его не подхватывает).
 *
 * Вопрос: отвечает ли POST /api/documents/:id/sign-ukep в рантайме, если
 * registerDocumentRoutes его не вызывает. Статический разбор это уже показал,
 * но ловушка №1 задания требует мерить В ПРОЦЕССЕ (app.inject), а не через
 * общий dev-сервер на 4100, который бывает устаревшим.
 *
 * Проб УМЕЕТ ПОКРАСНЕТЬ (ловушка №5): в нём два контроля.
 *   Контроль А: живой сосед POST /api/documents/:id/issue из того же
 *               registerDocumentRoutes обязан ответить НЕ 404. Если ответит
 *               404 — сломан сам проб, а не маршрут.
 *   Контроль Б: тот же signUkep, зарегистрированный НАПРЯМУЮ на чистом
 *               приложении, обязан ответить НЕ 404. Если ответит 404 — путь
 *               или метод в пробе неверны, и вывод «маршрут мёртв» недопустим.
 *
 * ЗАПУСК (cwd apps/api — оттуда загрузчик поднимает DATABASE_URL):
 *   node --import tsx ../../scratch/_recon_signukep_registration_probe.ts
 */

import Fastify from "fastify";
import { registerDocumentRoutes } from "../apps/api/src/routes/documents.js";
import { register as registerSignUkepDirectly } from "../apps/api/src/routes/documents/signUkep.js";

const DOCUMENT_ID = "00000000-0000-0000-0000-000000000000";

let failures = 0;

function report(label: string, statusCode: number, expectation: "404" | "not-404"): void {
	const ok = expectation === "404" ? statusCode === 404 : statusCode !== 404;
	if (!ok) failures += 1;
	console.log(`${ok ? "OK  " : "FAIL"} ${label}: HTTP ${statusCode} (ожидалось ${expectation})`);
}

async function main(): Promise<void> {
	// Как приложение регистрирует документы на самом деле.
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

	// КОНТРОЛЬ А: живой сосед в том же регистраторе.
	const issue = await app.inject({
		method: "POST",
		url: `/api/documents/${DOCUMENT_ID}/issue`,
		payload: {},
	});
	report("КОНТРОЛЬ А, живой сосед POST /api/documents/:id/issue", issue.statusCode, "not-404");

	console.log(`   тело ответа sign-ukep: ${ukep.body.slice(0, 200)}`);
	await app.close();

	// КОНТРОЛЬ Б: тот же модуль, подключённый напрямую.
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
