/**
 * Живое доказательство записи шаблонов протоколов приёма:
 * POST/PUT/DELETE /api/settings/protocols против реальной PostgreSQL, со сверкой
 * каждой строки независимым SQL.
 *
 * Это НЕ юнит-тест (имя без `.test.ts`, `npm test` его не подхватывает). Факт
 * существования маршрутов закрепляет tests/routes/protocolTemplateRoutes.test.ts;
 * здесь измеряется поведение на живых данных:
 *   • доходят ли до базы списки видов документов и снимков (jsonb) и остаётся ли
 *     шаблон ЧИТАЕМЫМ для экрана — то есть проходит ли он тот же контракт, каким
 *     чтение отбирает строки, молча выбрасывая непрошедшие;
 *   • отвергается ли незнакомый вид документа НА ЗАПИСИ, а не после того, как
 *     шаблон исчез с экрана;
 *   • изолированы ли клиники: правит ли чужой токен чужой протокол;
 *   • удаляется ли шаблон по-настоящему (на него никто не ссылается);
 *   • отвечает ли сервер отказом человеческими словами.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx src/tests/routes/protocolTemplateWriteProof.ts
 *
 * Создаёт СВОИ организации и удаляет их целиком в finally. Секрет администратора
 * настроек генерируется случайным на прогон и в вывод НЕ попадает.
 */

import { randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { protocolTemplateSchema } from "@dental/shared";
import { db, pool } from "../../db/client.js";
import { organizations, protocolTemplates } from "../../db/schema.js";
import { registerSettingsRoutes } from "../../routes/settings.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const PROOF_ORGANIZATION_NAMES = [
	"Проверка протоколов — клиника А",
	"Проверка протоколов — клиника Б",
] as const;

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

const settingsAdminSecret = randomBytes(24).toString("hex");

async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify();
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerSettingsRoutes(app);
	await app.ready();
	return app;
}

/**
 * content-type ставится только когда есть тело: DELETE без тела с
 * `application/json` Fastify отклоняет своим FST_ERR_CTP_EMPTY_JSON_BODY, и упало
 * бы доказательство, а не маршрут. Интерфейс на удалении content-type не шлёт
 * (SettingsProtocolsTab.tsx:143-145).
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

/** Независимый SQL: без drizzle-построителя и без проекции. */
async function independentRow(templateId: string) {
	const result = await db.execute(sql`
		select id::text as id,
		       organization_id::text as organization_id,
		       specialty::text as specialty,
		       title,
		       visit_reason,
		       default_duration_minutes,
		       complaint_prompt,
		       objective_template,
		       treatment_plan_template,
		       diagnosis_hints,
		       required_documents,
		       suggested_imaging,
		       safety_warnings,
		       updated_at is not null as has_updated_at
		  from protocol_templates
		 where id = ${templateId}
	`);
	return (result.rows[0] ?? null) as Record<string, unknown> | null;
}

async function independentCount(organizationId: string) {
	const result = await db.execute(sql`
		select count(*)::int as total from protocol_templates where organization_id = ${organizationId}
	`);
	return (result.rows[0] as { total: number }).total;
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

	console.log("\n=== СОЗДАНИЕ ШАБЛОНА (POST /api/settings/protocols) ===");
	const before = await independentCount(own.id);
	console.log(`  до создания шаблонов у клиники: ${before}`);

	const createResponse = await call(app, "POST", "/api/settings/protocols", own.id, {
		specialty: "therapist",
		title: "Лечение кариеса",
		visitReason: "Боль при накусывании",
		defaultDurationMinutes: 60,
		complaintPrompt: "Жалобы на боль от холодного",
		objectiveTemplate: "Зуб под пломбой, перкуссия отрицательная",
		treatmentPlanTemplate: "Препарирование, изоляция, реставрация",
		diagnosisHints: ["K02.1 Кариес дентина"],
		requiredDocuments: ["informed_consent", "treatment_plan"],
		suggestedImaging: ["periapical"],
		safetyWarnings: ["Уточнить аллергию на анестетик"],
	});
	check("шаблон создан", createResponse.statusCode, 201);
	if (createResponse.statusCode !== 201) {
		console.log(`  тело: ${createResponse.body.slice(0, 400)}`);
		return;
	}
	const templateId = String(createResponse.json.id ?? "");
	console.log(`  ответ маршрута: ${createResponse.body}`);

	const rowAfterCreate = await independentRow(templateId);
	console.log(`  независимый SQL: ${JSON.stringify(rowAfterCreate)}`);
	check("шаблон лёг в базу", rowAfterCreate !== null, true);
	check("клиника у строки своя", rowAfterCreate?.organization_id, own.id);
	check("специальность записана", rowAfterCreate?.specialty, "therapist");
	check("длительность записана", rowAfterCreate?.default_duration_minutes, 60);
	check("список документов дошёл до jsonb", rowAfterCreate?.required_documents, ["informed_consent", "treatment_plan"]);
	check("список снимков дошёл до jsonb", rowAfterCreate?.suggested_imaging, ["periapical"]);
	check("предупреждения дошли до jsonb", rowAfterCreate?.safety_warnings, ["Уточнить аллергию на анестетик"]);
	check("дата правки заполнена", rowAfterCreate?.has_updated_at, true);
	check("в прайсе шаблонов стало на один больше", await independentCount(own.id), before + 1);

	/*
	 * САМАЯ ВАЖНАЯ СВЕРКА. Чтение экранов прогоняет строку через
	 * protocolTemplateSchema и МОЛЧА выбрасывает не прошедшую. Если бы запись
	 * положила в jsonb что-то, чего контракт не принимает, шаблон существовал бы в
	 * базе и отсутствовал на экране, а оператор видел бы «сохранено».
	 */
	const readable = protocolTemplateSchema.safeParse({
		id: rowAfterCreate?.id,
		organizationId: rowAfterCreate?.organization_id,
		specialty: rowAfterCreate?.specialty,
		title: rowAfterCreate?.title,
		visitReason: rowAfterCreate?.visit_reason,
		defaultDurationMinutes: rowAfterCreate?.default_duration_minutes,
		complaintPrompt: rowAfterCreate?.complaint_prompt,
		objectiveTemplate: rowAfterCreate?.objective_template,
		diagnosisHints: rowAfterCreate?.diagnosis_hints,
		treatmentPlanTemplate: rowAfterCreate?.treatment_plan_template,
		requiredDocuments: rowAfterCreate?.required_documents,
		suggestedImaging: rowAfterCreate?.suggested_imaging,
		safetyWarnings: rowAfterCreate?.safety_warnings,
		updatedAt: new Date().toISOString(),
	});
	check("ЗАПИСАННЫЙ ШАБЛОН ЧИТАЕМ ЭКРАНОМ (тот же контракт)", readable.success, true);
	if (!readable.success) console.log(`  причина: ${JSON.stringify(readable.error.issues)}`);

	console.log("\n=== ПРАВКА (PUT /api/settings/protocols/:templateId) ===");
	// Интерфейс шлёт объект ЦЕЛИКОМ, включая id, organizationId и updatedAt.
	// Подсунутая чужая клиника в теле обязана быть отброшена.
	const updateResponse = await call(app, "PUT", `/api/settings/protocols/${templateId}`, own.id, {
		id: templateId,
		organizationId: foreign.id,
		updatedAt: "2020-01-01T00:00:00.000Z",
		title: "Лечение кариеса (исправлено)",
		defaultDurationMinutes: 90,
		requiredDocuments: ["informed_consent"],
	});
	check("шаблон исправлен", updateResponse.statusCode, 200);
	console.log(`  ответ маршрута: ${updateResponse.body}`);
	const rowAfterUpdate = await independentRow(templateId);
	check("новое название в базе", rowAfterUpdate?.title, "Лечение кариеса (исправлено)");
	check("новая длительность в базе", rowAfterUpdate?.default_duration_minutes, 90);
	check("список документов заменён", rowAfterUpdate?.required_documents, ["informed_consent"]);
	check("непереданное поле не затёрто", rowAfterUpdate?.visit_reason, "Боль при накусывании");
	check(
		"КЛИНИКА ИЗ ТЕЛА ЗАПРОСА ОТБРОШЕНА (осталась своя)",
		rowAfterUpdate?.organization_id,
		own.id,
	);

	console.log("\n=== ОТКАЗЫ ПО ВВОДУ ===");
	const unknownDocument = await call(app, "POST", "/api/settings/protocols", own.id, {
		title: "Шаблон с незнакомым документом",
		requiredDocuments: ["выдуманный_документ"],
	});
	check("незнакомый вид документа отклонён НА ЗАПИСИ", unknownDocument.statusCode, 400);
	checkRussianRefusal("текст отказа по видам документов", unknownDocument.json.message);

	const unknownImaging = await call(app, "POST", "/api/settings/protocols", own.id, {
		title: "Шаблон с незнакомым снимком",
		suggestedImaging: ["мрт_головы"],
	});
	check("незнакомый вид снимка отклонён на записи", unknownImaging.statusCode, 400);

	const emptyTitle = await call(app, "POST", "/api/settings/protocols", own.id, { title: "   " });
	check("шаблон без названия не создан", emptyTitle.statusCode, 400);
	checkRussianRefusal("текст отказа по названию", emptyTitle.json.message);

	const badDuration = await call(app, "PUT", `/api/settings/protocols/${templateId}`, own.id, {
		defaultDurationMinutes: 0,
	});
	check("нулевая длительность отклонена", badDuration.statusCode, 400);

	const emptyPatch = await call(app, "PUT", `/api/settings/protocols/${templateId}`, own.id, {
		какое_то_поле: 1,
	});
	check("правка без полей отклонена, а не выдана за успех", emptyPatch.statusCode, 400);
	checkRussianRefusal("текст отказа по пустой правке", emptyPatch.json.message);

	const missing = await call(app, "PUT", "/api/settings/protocols/00000000-0000-0000-0000-000000000000", own.id, {
		title: "Нет такого",
	});
	check("несуществующий шаблон даёт 404 маршрута, а не Fastify", missing.statusCode, 404);
	checkRussianRefusal("текст отказа по ненайденному шаблону", missing.json.message);

	const rowAfterRefusals = await independentRow(templateId);
	check("ни один отказ не изменил название", rowAfterRefusals?.title, "Лечение кариеса (исправлено)");
	check("отказы не наплодили шаблонов", await independentCount(own.id), before + 1);

	console.log("\n=== ИЗОЛЯЦИЯ КЛИНИК ===");
	const foreignUpdate = await call(app, "PUT", `/api/settings/protocols/${templateId}`, foreign.id, {
		title: "Захвачено чужой клиникой",
	});
	check("чужая клиника не правит шаблон", foreignUpdate.statusCode, 404);
	checkRussianRefusal("отказ чужой клинике", foreignUpdate.json.message);
	const foreignDelete = await call(app, "DELETE", `/api/settings/protocols/${templateId}`, foreign.id);
	check("чужая клиника не удаляет шаблон", foreignDelete.statusCode, 404);
	check("шаблон после чужих попыток на месте", (await independentRow(templateId)) !== null, true);
	check(
		"название после чужих попыток то же",
		(await independentRow(templateId))?.title,
		"Лечение кариеса (исправлено)",
	);

	console.log("\n=== УДАЛЕНИЕ (DELETE /api/settings/protocols/:templateId) ===");
	const deleteResponse = await call(app, "DELETE", `/api/settings/protocols/${templateId}`, own.id);
	check("шаблон удалён", deleteResponse.statusCode, 200);
	console.log(`  ответ маршрута: ${deleteResponse.body}`);
	check("маршрут вернул удалённый шаблон", deleteResponse.json.id, templateId);
	check("строки в базе больше нет", await independentRow(templateId), null);
	check("шаблонов у клиники снова столько же", await independentCount(own.id), before);
	const deleteAgain = await call(app, "DELETE", `/api/settings/protocols/${templateId}`, own.id);
	check("повторное удаление даёт человеческий 404", deleteAgain.statusCode, 404);
	checkRussianRefusal("текст повторного удаления", deleteAgain.json.message);

	console.log("\n=== ОХРАНА ДОСТУПА ===");
	const noSecret = await app.inject({
		method: "POST",
		url: "/api/settings/protocols",
		headers: {
			"x-dente-clinic-token": signToken({ organizationId: own.id }, authTokenSecret()),
			"content-type": "application/json",
		},
		payload: JSON.stringify({ title: "Без секрета" }),
	});
	check("без секрета администратора запись отклонена", noSecret.statusCode, 403);
	checkRussianRefusal("отказ без секрета", (JSON.parse(noSecret.body) as { message?: string }).message);

	await proveOverRealHttp(own.id);
}

/**
 * Настоящий HTTP через сокет: app.inject доказывает логику маршрута, но не то,
 * что маршрут поднимается на порту. Поднимается свой экземпляр на своём порту, а
 * не дёргается общий сервер разработки — его может использовать другой
 * исполнитель.
 */
async function proveOverRealHttp(organizationId: string): Promise<void> {
	const app = await buildApp();
	const port = Number(process.env.PROTOCOL_PROOF_PORT ?? 4197);
	await app.listen({ host: "127.0.0.1", port });
	try {
		console.log(`\n=== ЖИВОЙ HTTP на 127.0.0.1:${port} (не app.inject) ===`);
		const url = `http://127.0.0.1:${port}/api/settings/protocols`;

		const anonymous = await fetch(url, {
			method: "POST",
			body: "{}",
			headers: { "content-type": "application/json" },
		});
		check("живой HTTP без секрета отклонён", anonymous.status, 403);

		const response = await fetch(url, {
			method: "POST",
			headers: headersFor(organizationId, true),
			body: JSON.stringify({
				title: "Профгигиена по сети",
				specialty: "hygienist",
				defaultDurationMinutes: 45,
				requiredDocuments: ["informed_consent"],
			}),
		});
		const body = (await response.json()) as Record<string, unknown>;
		check("живой HTTP создал шаблон", response.status, 201);
		console.log(`  по сети: HTTP ${response.status} ${JSON.stringify(body)}`);
		const row = await independentRow(String(body.id ?? ""));
		check("шаблон из сети лежит в базе", row?.title, "Профгигиена по сети");
		check("умолчания не выдуманы (причина визита пустая)", row?.visit_reason, "");
	} finally {
		await app.close();
	}
}

async function cleanup(organizationIds: string[]): Promise<void> {
	for (const organizationId of organizationIds) {
		await db.delete(protocolTemplates).where(eq(protocolTemplates.organizationId, organizationId));
		await db.delete(organizations).where(eq(organizations.id, organizationId));
	}
}

/** Уборка следов прерванного прогона ДО начала работы. */
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
			       (select count(*)::int from protocol_templates) as templates
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
