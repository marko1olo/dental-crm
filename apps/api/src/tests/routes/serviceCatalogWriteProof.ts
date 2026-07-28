/**
 * Живое доказательство записи прайса: POST/PUT/DELETE /api/settings/catalog
 * против реальной PostgreSQL, со сверкой каждой строки независимым SQL.
 *
 * Это НЕ юнит-тест (имя без `.test.ts`, `npm test` его не подхватывает). Факт
 * существования маршрутов закрепляет tests/routes/serviceCatalogRoutes.test.ts;
 * здесь измеряется поведение на живых данных, которое статическим разбором не
 * доказывается:
 *   • доходит ли цена до базы без потери копеек;
 *   • отключается ли услуга ВМЕСТО физического удаления (на неё ссылаются
 *     позиции лечения и правила списания материалов — DELETE строки порвал бы
 *     историю лечения и уже выставленные счёта);
 *   • изолированы ли клиники: правит ли чужой токен чужой прайс;
 *   • отвечает ли сервер отказом человеческими словами, а не пустотой.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx src/tests/routes/serviceCatalogWriteProof.ts
 *
 * Создаёт СВОИ организации и удаляет их целиком в finally, как это делает
 * doctorPayoutsProof.ts. Секрет администратора настроек генерируется случайным на
 * прогон и в вывод НЕ попадает; секрет подписи токена берётся штатным
 * authTokenSecret() и тоже не печатается.
 */

import { randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { organizations, serviceCatalogItems } from "../../db/schema.js";
import { registerSettingsRoutes } from "../../routes/settings.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * Имена организаций прогона. Сверяются на точное равенство, без LIKE и без
 * маски, чтобы клиника с похожим названием не попала под удаление.
 */
const PROOF_ORGANIZATION_NAMES = ["Проверка прайса — клиника А", "Проверка прайса — клиника Б"] as const;

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok) failures += 1;
	console.log(
		`${ok ? "OK  " : "ПРОВАЛ"} ${label}: получено ${JSON.stringify(actual)}, ожидалось ${JSON.stringify(expected)}`,
	);
}

function checkRussianRefusal(label: string, message: unknown): void {
	const text = typeof message === "string" ? message : "";
	const ok = /[А-Яа-яЁё]/.test(text) && !/[A-Za-z]/.test(text);
	if (!ok) failures += 1;
	console.log(`${ok ? "OK  " : "ПРОВАЛ"} ${label}: «${text}»`);
}

function seeded<Row>(rows: Row[], what: string): Row {
	const row = rows[0];
	if (!row) throw new Error(`Посев не состоялся: вставка «${what}» не вернула ни одной строки.`);
	return row;
}

/** Секрет администратора настроек на прогон. Наружу не печатается никогда. */
const settingsAdminSecret = randomBytes(24).toString("hex");

async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify();
	// Тот же хук, что в apps/api/src/server.ts — он наполняет request.user.
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerSettingsRoutes(app);
	await app.ready();
	return app;
}

/**
 * Заголовки как их шлёт интерфейс.
 *
 * content-type ставится ТОЛЬКО когда есть тело, и это не косметика. Первая
 * редакция этого доказательства ставила его всегда, и DELETE без тела получал от
 * Fastify 400 `FST_ERR_CTP_EMPTY_JSON_BODY` — то есть падало доказательство, а не
 * маршрут. Интерфейс так не делает: `settingsAccessHeaders()` вызывается для
 * удаления без аргументов, а `denteAdminSecretRequestHeaders`
 * (apps/web/src/lib/denteRequestHeaders.ts:35) добавляет только секрет и токены и
 * content-type не подставляет никогда. Ровно этой формой уже работают удаление
 * сотрудника и кресла.
 */
function headersFor(organizationId: string, withBody: boolean): Record<string, string> {
	const headers: Record<string, string> = {
		"x-dente-admin-secret": settingsAdminSecret,
		"x-dente-clinic-token": signToken({ organizationId }, authTokenSecret()),
	};
	if (withBody) headers["content-type"] = "application/json";
	return headers;
}

type Injected = { statusCode: number; body: string; json: Record<string, unknown> };

async function call(
	app: FastifyInstance,
	method: "POST" | "PUT" | "DELETE",
	url: string,
	organizationId: string,
	payload?: unknown,
): Promise<Injected> {
	const response = await app.inject({
		method,
		url,
		headers: headersFor(organizationId, payload !== undefined),
		...(payload === undefined ? {} : { payload: JSON.stringify(payload) }),
	});
	let json: Record<string, unknown>;
	try {
		json = JSON.parse(response.body) as Record<string, unknown>;
	} catch {
		json = {};
	}
	return { statusCode: response.statusCode, body: response.body, json };
}

/** Независимый SQL: написан руками, без drizzle-построителя и без проекции. */
async function independentRow(serviceId: string) {
	const result = await db.execute(sql`
		select id::text as id,
		       organization_id::text as organization_id,
		       code,
		       title,
		       category::text as category,
		       specialty::text as specialty,
		       base_price_rub::text as base_price_rub,
		       price_rub::text as price_rub,
		       duration_minutes,
		       tax_deductible,
		       is_active
		  from service_catalog_items
		 where id = ${serviceId}
	`);
	return (result.rows[0] ?? null) as Record<string, unknown> | null;
}

async function independentCount(organizationId: string) {
	const result = await db.execute(sql`
		select count(*)::int as total,
		       count(*) filter (where is_active) ::int as active
		  from service_catalog_items
		 where organization_id = ${organizationId}
	`);
	return result.rows[0] as { total: number; active: number };
}

async function proveWrites(app: FastifyInstance, created: string[]): Promise<void> {
	const own = seeded(
		await db.insert(organizations).values({ name: PROOF_ORGANIZATION_NAMES[0] }).returning({ id: organizations.id }),
		PROOF_ORGANIZATION_NAMES[0],
	);
	created.push(own.id);
	const foreign = seeded(
		await db.insert(organizations).values({ name: PROOF_ORGANIZATION_NAMES[1] }).returning({ id: organizations.id }),
		PROOF_ORGANIZATION_NAMES[1],
	);
	created.push(foreign.id);

	console.log(`\n=== СОЗДАНИЕ УСЛУГИ (POST /api/settings/catalog) ===`);
	const before = await independentCount(own.id);
	console.log(`  до создания в прайсе клиники: всего ${before.total}, активных ${before.active}`);

	// Цена С КОПЕЙКАМИ: ровно на этом прайс ломался раньше (см. db/schema.ts:426).
	const createResponse = await call(app, "POST", "/api/settings/catalog", own.id, {
		title: "Первичная консультация врача-терапевта",
		code: "T01",
		category: "consultation",
		specialty: "therapist",
		basePriceRub: 1500.5,
		durationMinutes: 45,
		taxDeductible: true,
		active: true,
	});
	check("услуга создана", createResponse.statusCode, 201);
	if (createResponse.statusCode !== 201) {
		console.log(`  тело: ${createResponse.body.slice(0, 400)}`);
		return;
	}
	const serviceId = String(createResponse.json.id ?? "");
	console.log(`  ответ маршрута: ${createResponse.body}`);

	const rowAfterCreate = await independentRow(serviceId);
	console.log(`  независимый SQL: ${JSON.stringify(rowAfterCreate)}`);
	check("услуга легла в базу", rowAfterCreate !== null, true);
	check("клиника у строки своя", rowAfterCreate?.organization_id, own.id);
	check("копейки не потеряны (base_price_rub)", rowAfterCreate?.base_price_rub, "1500.50");
	check("вторая денежная колонка заполнена тем же (price_rub)", rowAfterCreate?.price_rub, "1500.50");
	check("длительность записана", rowAfterCreate?.duration_minutes, 45);
	check("категория записана", rowAfterCreate?.category, "consultation");
	check("услуга активна", rowAfterCreate?.is_active, true);
	check("маршрут вернул цену как число", createResponse.json.basePriceRub, 1500.5);

	const afterCreate = await independentCount(own.id);
	check("в прайсе стало на одну услугу больше", afterCreate.total, before.total + 1);

	console.log(`\n=== ПРАВКА ЦЕНЫ (PUT /api/settings/catalog/:serviceId) ===`);
	const updateResponse = await call(app, "PUT", `/api/settings/catalog/${serviceId}`, own.id, {
		basePriceRub: 1990.99,
		durationMinutes: 60,
	});
	check("цена изменена", updateResponse.statusCode, 200);
	console.log(`  ответ маршрута: ${updateResponse.body}`);
	const rowAfterUpdate = await independentRow(serviceId);
	console.log(`  независимый SQL: ${JSON.stringify(rowAfterUpdate)}`);
	check("новая цена в базе", rowAfterUpdate?.base_price_rub, "1990.99");
	check("вторая колонка не разошлась с первой", rowAfterUpdate?.price_rub, "1990.99");
	check("новая длительность в базе", rowAfterUpdate?.duration_minutes, 60);
	check("непереданное поле не затёрто (название)", rowAfterUpdate?.title, "Первичная консультация врача-терапевта");
	check("непереданное поле не затёрто (код)", rowAfterUpdate?.code, "T01");

	console.log(`\n=== ОТКАЗЫ ПО ВВОДУ (проверяется текст, а не только код) ===`);
	const thirdDecimal = await call(app, "PUT", `/api/settings/catalog/${serviceId}`, own.id, { basePriceRub: 100.001 });
	check("цена с третьим знаком отклонена", thirdDecimal.statusCode, 400);
	checkRussianRefusal("текст отказа по копейкам", thirdDecimal.json.message);

	const negative = await call(app, "PUT", `/api/settings/catalog/${serviceId}`, own.id, { basePriceRub: -1 });
	check("отрицательная цена отклонена", negative.statusCode, 400);

	const emptyTitle = await call(app, "POST", "/api/settings/catalog", own.id, {
		title: "   ",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 100,
		durationMinutes: 30,
	});
	check("услуга без названия не создана", emptyTitle.statusCode, 400);
	checkRussianRefusal("текст отказа по названию", emptyTitle.json.message);

	const unknownCategory = await call(app, "POST", "/api/settings/catalog", own.id, {
		title: "Услуга неизвестной категории",
		category: "выдуманная",
		specialty: "therapist",
		basePriceRub: 100,
		durationMinutes: 30,
	});
	check("неизвестная категория не создана", unknownCategory.statusCode, 400);

	const emptyPatch = await call(app, "PUT", `/api/settings/catalog/${serviceId}`, own.id, { какое_то_поле: 1 });
	check("правка без полей отклонена, а не выдана за успех", emptyPatch.statusCode, 400);
	checkRussianRefusal("текст отказа по пустой правке", emptyPatch.json.message);

	const missing = await call(app, "PUT", "/api/settings/catalog/00000000-0000-0000-0000-000000000000", own.id, {
		basePriceRub: 500,
	});
	check("несуществующая услуга даёт 404 маршрута, а не Fastify", missing.statusCode, 404);
	checkRussianRefusal("текст отказа по ненайденной услуге", missing.json.message);

	// Цена в базе не должна была измениться ни одним из отказов.
	const rowAfterRefusals = await independentRow(serviceId);
	check("ни один отказ не изменил цену", rowAfterRefusals?.base_price_rub, "1990.99");

	console.log(`\n=== ИЗОЛЯЦИЯ КЛИНИК ===`);
	const foreignUpdate = await call(app, "PUT", `/api/settings/catalog/${serviceId}`, foreign.id, {
		basePriceRub: 1,
	});
	check("чужая клиника не правит услугу", foreignUpdate.statusCode, 404);
	checkRussianRefusal("отказ чужой клинике", foreignUpdate.json.message);
	const foreignDelete = await call(app, "DELETE", `/api/settings/catalog/${serviceId}`, foreign.id);
	check("чужая клиника не отключает услугу", foreignDelete.statusCode, 404);
	const rowAfterForeign = await independentRow(serviceId);
	check("цена после чужих попыток та же", rowAfterForeign?.base_price_rub, "1990.99");
	check("услуга после чужих попыток активна", rowAfterForeign?.is_active, true);

	console.log(`\n=== ОТКЛЮЧЕНИЕ, А НЕ УДАЛЕНИЕ (DELETE /api/settings/catalog/:serviceId) ===`);
	const deleteResponse = await call(app, "DELETE", `/api/settings/catalog/${serviceId}`, own.id);
	check("услуга отключена", deleteResponse.statusCode, 200);
	console.log(`  ответ маршрута: ${deleteResponse.body}`);
	const rowAfterDelete = await independentRow(serviceId);
	console.log(`  независимый SQL: ${JSON.stringify(rowAfterDelete)}`);
	check("СТРОКА В БАЗЕ ОСТАЛАСЬ (история лечения и счёта целы)", rowAfterDelete !== null, true);
	check("услуга ушла в архив", rowAfterDelete?.is_active, false);
	check("цена в архивной строке сохранена", rowAfterDelete?.base_price_rub, "1990.99");
	check("маршрут вернул active: false", deleteResponse.json.active, false);
	const afterDelete = await independentCount(own.id);
	check("строк в прайсе столько же, активных меньше", afterDelete.total, afterCreate.total);
	check("активных стало меньше на одну", afterDelete.active, afterCreate.active - 1);

	console.log(`\n=== ОХРАНА ДОСТУПА ===`);
	const noSecret = await app.inject({
		method: "POST",
		url: "/api/settings/catalog",
		headers: {
			"x-dente-clinic-token": signToken({ organizationId: own.id }, authTokenSecret()),
			"content-type": "application/json",
		},
		payload: JSON.stringify({ title: "Без секрета", category: "therapy", specialty: "therapist", basePriceRub: 10, durationMinutes: 30 }),
	});
	check("без секрета администратора запись отклонена", noSecret.statusCode, 403);
	checkRussianRefusal("отказ без секрета", (JSON.parse(noSecret.body) as { message?: string }).message);

	await proveOverRealHttp(own.id);
}

/**
 * Настоящий HTTP через сокет, а не app.inject.
 *
 * app.inject вызывает обработчик в том же процессе: он доказывает логику
 * маршрута, но не доказывает, что маршрут поднимается на порту. Поднимается свой
 * экземпляр на своём порту, а не дёргается общий сервер разработки: его в этот
 * момент может использовать другой исполнитель, и перезапуск чужого процесса —
 * не моя зона.
 */
async function proveOverRealHttp(organizationId: string): Promise<void> {
	const app = await buildApp();
	const port = Number(process.env.SERVICE_CATALOG_PROOF_PORT ?? 4198);
	await app.listen({ host: "127.0.0.1", port });
	try {
		console.log(`\n=== ЖИВОЙ HTTP на 127.0.0.1:${port} (не app.inject) ===`);
		const url = `http://127.0.0.1:${port}/api/settings/catalog`;

		const anonymous = await fetch(url, { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
		check("живой HTTP без секрета отклонён", anonymous.status, 403);

		const response = await fetch(url, {
			method: "POST",
			headers: headersFor(organizationId, true),
			body: JSON.stringify({
				title: "Снятие зубных отложений по сети",
				code: "H01",
				category: "hygiene",
				specialty: "hygienist",
				basePriceRub: 3200.75,
				durationMinutes: 60,
			}),
		});
		const body = (await response.json()) as Record<string, unknown>;
		check("живой HTTP создал услугу", response.status, 201);
		console.log(`  по сети: HTTP ${response.status} ${JSON.stringify(body)}`);
		const row = await independentRow(String(body.id ?? ""));
		check("услуга из сети лежит в базе с копейками", row?.base_price_rub, "3200.75");
		check("код по умолчанию не выдуман", row?.code, "H01");
	} finally {
		await app.close();
	}
}

async function cleanup(organizationIds: string[]): Promise<void> {
	for (const organizationId of organizationIds) {
		await db.delete(serviceCatalogItems).where(eq(serviceCatalogItems.organizationId, organizationId));
		await db.delete(organizations).where(eq(organizations.id, organizationId));
	}
}

/**
 * Уборка следов прерванного прогона ДО начала работы: прогон, убитый снаружи
 * (Ctrl+C, закрытая труба вида `| head`), не доходит до finally, и его тестовые
 * клиники остались бы в живой базе, где их потом читают как данные клиники.
 */
async function sweepStaleProofOrganizations(): Promise<void> {
	const stale = await db
		.select({ id: organizations.id, name: organizations.name })
		.from(organizations)
		.where(inArray(organizations.name, [...PROOF_ORGANIZATION_NAMES]));
	if (stale.length === 0) return;
	console.log(`Следы прерванного прогона: организаций ${stale.length} — удаляю до начала проверки.`);
	for (const row of stale) console.log(`  ${row.id}  ${row.name}`);
	await cleanup(stale.map((row) => row.id));
}

async function main(): Promise<void> {
	// Охрана настроек проверяется целиком, поэтому обход выключен, а секрет задан
	// случайным на прогон.
	delete process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS;
	process.env.DENTE_SETTINGS_ADMIN_SECRET = settingsAdminSecret;

	const app = await buildApp();
	const created: string[] = [];
	try {
		await sweepStaleProofOrganizations();
		await proveWrites(app, created);
	} finally {
		await app.close();
		await cleanup(created);
		const leftovers = await db.execute(sql`
			select (select count(*)::int from organizations) as organizations,
			       (select count(*)::int from service_catalog_items) as services
		`);
		console.log(`\nПОСЛЕ УБОРКИ ${JSON.stringify(leftovers.rows[0])}`);
		const stillThere = await db
			.select({ id: organizations.id })
			.from(organizations)
			.where(inArray(organizations.name, [...PROOF_ORGANIZATION_NAMES]));
		check("тестовых клиник в базе не осталось", stillThere.length, 0);
		console.log(failures === 0 ? "\nВСЕ СВЕРКИ СОШЛИСЬ" : `\nРАСХОЖДЕНИЙ: ${failures}`);
		await pool.end();
	}
	if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
