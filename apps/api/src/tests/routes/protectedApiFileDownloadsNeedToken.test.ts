import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerFilesRoutes } from "../../routes/files.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * СЕРВЕРНАЯ ПОЛОВИНА ДОКАЗАТЕЛЬСТВА ДОСТИЖИМОСТИ ФАЙЛОВ ВЛОЖЕНИЙ.
 *
 * Запуск: из apps/api
 *   node --import tsx --test src/tests/routes/protectedApiFileDownloadsNeedToken.test.ts
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Список вложений приёма
 * (GET /api/files/visits/:visitId/attachments) отдаёт клиенту адрес каждого файла
 * в поле `url` — `/api/attachments/<id>/download` (routes/files.ts:137,185).
 * Дневник приёма подставлял этот адрес прямо в `<img src>` и в ссылку
 * «увеличить». Запрос по такому адресу отправляет БРАУЗЕР, а не fetch, и никаких
 * заголовков в нём нет: подмена window.fetch на клиенте
 * (apps/web/src/lib/apiAuthFetch.ts) действует только на fetch. Обработчик
 * скачивания закрыт requireResolvedOrganizationId, то есть отвечал
 * 401 AuthRequired. Врач прикреплял фотографии лечения, видел подтверждение
 * «Фото сжато в WebP и загружено» — и вместо снимков навсегда получал значки
 * битых картинок, при том что маршрут скачивания дописан до конца: отбор по
 * организации, Content-Disposition с именем файла, поток с диска.
 *
 * ЗАЧЕМ ЭТОТ ТЕСТ, ЕСЛИ ЕСТЬ ТЕСТ НА КЛИЕНТЕ. Клиентская половина
 * (apps/web/src/tests/protectedApiFilesReachTheBrowser.test.ts) запрещает
 * подставлять такой адрес в разметку. Здесь доказывается ПРИЧИНА этого запрета:
 * тот же адрес без токена не обслуживается, а с токеном доходит до обработчика.
 * Порознь любая из двух половин выглядит придиркой к стилю; вместе они и есть
 * цепочка достижимости.
 *
 * ПОЧЕМУ БЕЗ ЗАПИСИ В БАЗУ. База разработки одна на всех агентов, и заводить в
 * ней вложение ради теста значит менять общее состояние. Разница между «запрос не
 * пропущен охраной» (401) и «запрос дошёл до обработчика» (404 по несуществующему
 * вложению) доказывает связь полностью: 404 приходит из тела обработчика после
 * успешного отбора по организации.
 */

const ORG = "aa990000-0000-4000-8000-0000000000a1";
const ATTACHMENT = "aa990000-0000-4000-8000-0000000000b1";
const VISIT = "aa990000-0000-4000-8000-0000000000c1";
const TEST_SECRET = "protected-file-download-token-proof".padEnd(48, "z");

/** Заголовки, которые браузер шлёт за картинкой из <img src>. Токена среди них нет. */
const IMG_TAG_HEADERS = {
	accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
	referer: "http://127.0.0.1:5173/",
} as const;

describe("файл вложения не отдаётся запросу без токена кабинета", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";

	before(async () => {
		// Самое разрешающее окружение: клинические гейты пропускают запрос без
		// секрета, заголовок организации разрешён. Если бы отказ ниже держался на
		// переменных среды, а не на охране маршрута, проверка бы не покраснела.
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		resetAuthSecretCacheForTests();

		clinicToken = signToken({ organizationId: ORG }, TEST_SECRET, 3600);

		app = Fastify({ logger: false });
		await registerFilesRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	test("запрос ровно как из <img src> получает 401 — картинка была бы битой", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/api/attachments/${ATTACHMENT}/download`,
			headers: IMG_TAG_HEADERS,
		});

		assert.equal(response.statusCode, 401, response.body);
		assert.equal(response.json().error, "AuthRequired");
	});

	test("тот же адрес с токеном кабинета доходит до обработчика", async () => {
		// 404 по несуществующему вложению — это ответ ТЕЛА обработчика, то есть
		// охрана пройдена и отбор по организации выполнен. Именно так ходит fetch
		// после подстановки токена, и именно этот путь теперь использует дневник.
		const response = await app.inject({
			method: "GET",
			url: `/api/attachments/${ATTACHMENT}/download`,
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken },
		});

		assert.equal(response.statusCode, 404, response.body);
		assert.equal(response.json().error, "AttachmentNotFound");
	});

	test("вне режима разработки заголовок организации токен не заменяет", async () => {
		/*
		 * ЗАМЕР, КОТОРЫЙ ИСПРАВИЛ МОЁ СОБСТВЕННОЕ ПРЕДПОЛОЖЕНИЕ. Я ожидал 401 и
		 * получил 404: при DENTE_DEV_ALLOW_HEADER_ORG=1 этот маршрут принимает
		 * x-organization-id от клиента на чтение (security/identity.ts). То есть
		 * маршрут вложений НЕ ужесточён так, как patients.ts, который отвергает
		 * заголовок при любой переменной среды.
		 *
		 * Для клиники это ничего не меняет: тег <img> не посылает и такого
		 * заголовка тоже, а в рабочей установке переменной нет — тогда ответ 401,
		 * что и проверяется здесь. Записано подробно, чтобы следующий читатель не
		 * принял 404 в режиме разработки за доказательство достижимости: dev-API
		 * на 4100 отвечает мягче рабочего.
		 */
		const withDevHeaderOrg = await app.inject({
			method: "GET",
			url: `/api/attachments/${ATTACHMENT}/download`,
			headers: { ...IMG_TAG_HEADERS, "x-organization-id": ORG },
		});
		assert.equal(withDevHeaderOrg.statusCode, 404, withDevHeaderOrg.body);

		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		try {
			const production = await app.inject({
				method: "GET",
				url: `/api/attachments/${ATTACHMENT}/download`,
				headers: { ...IMG_TAG_HEADERS, "x-organization-id": ORG },
			});
			assert.equal(production.statusCode, 401, production.body);
			assert.equal(production.json().error, "AuthRequired");
		} finally {
			process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		}
	});

	test("список вложений приёма закрыт той же охраной", async () => {
		const anonymous = await app.inject({
			method: "GET",
			url: `/api/files/visits/${VISIT}/attachments`,
		});

		assert.equal(anonymous.statusCode, 401, anonymous.body);
		assert.equal(anonymous.json().error, "AuthRequired");
	});

	test("сервер публикует адрес скачивания, а не путь к файлу на диске", async () => {
		// Связь с клиентом: он забирает файл по тому адресу, который пришёл в поле
		// url. Если сервер начнёт отдавать что-то другое (путь на диске, внешнюю
		// ссылку), клиентская половина проверки станет проверять не то место.
		const filesRoute = await import("node:fs").then(({ readFileSync }) =>
			readFileSync(new URL("../../routes/files.ts", import.meta.url), "utf8"),
		);

		const published = [...filesRoute.matchAll(/url:\s*`([^`]+)`/g)].map(
			(m) => m[1],
		);
		assert.ok(
			published.length >= 2,
			`поле url больше не публикуется: ${published.join(", ")}`,
		);
		for (const template of published) {
			assert.match(
				String(template),
				/^\/api\/attachments\/\$\{[^}]+\}\/download$/,
			);
		}
	});
});
