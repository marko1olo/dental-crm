import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-clinical-secret";
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
/*
 * СЕКРЕТ ПОДПИСИ ТОКЕНОВ — СИНТЕТИЧЕСКИЙ И ОБЯЗАТЕЛЕН ЗДЕСЬ.
 *
 * Сценарий работает под `NODE_ENV=production` намеренно: он проверяет боевое
 * поведение маршрута, а не разрешённое послаблением. Но в production
 * `authTokenSecret()` СПРАВЕДЛИВО отказывается подписывать без
 * `AUTH_TOKEN_SECRET` — и без этой строки сценарий падал бы на своём же
 * правильном стороже, не дойдя до проверки.
 *
 * Строка списана с `scripts/smoke-core-route-validation.mjs` дословно: там тот же
 * класс проверки для шести маршрутов, и заводить второй способ подписи нельзя.
 */
process.env.AUTH_TOKEN_SECRET ??=
	"synthetic-auth-token-secret-for-visit-route-validation-smoke";

const routePath = path.resolve("apps/api/dist/routes/visits.js");

if (!existsSync(routePath)) {
	throw new Error("Build API first: npm run build -w @dental/api");
}

const visitsSource = readFileSync("apps/api/src/routes/visits.ts", "utf8");

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

[
	"visitDraftAutosaveRequestSchema.parse({ ...(request.body as object), visitId })",
	"acceptVisitDraftSchema.parse({ ...(request.body as object), visitId })",
	"const message = error instanceof Error ? error.message",
	'return reply.code(409).send({ error: "VisitDraftMutationRejected", message })',
	'return reply.code(404).send({ error: "VisitNotFound", message: "Прием не найден" })',
].forEach((needle) => {
	assert(
		!visitsSource.includes(needle),
		`visit route still exposes raw request validation: ${needle}`,
	);
});
assert(
	visitsSource.includes("parseVisitPayload("),
	"visit route must keep route-owned validation helper",
);
assert(
	visitsSource.includes("visitDraftDomainMessage("),
	"visit route must isolate private domain exception text",
);
assert(
	visitsSource.includes('reason: "visit_closed"'),
	"visit route must expose bounded closed-visit reason",
);
assert(
	visitsSource.includes("visitDraftAutosaveValidationMessage") &&
		visitsSource.includes("visitDraftAcceptValidationMessage"),
	"visit route must keep separate operator messages for autosave and accept",
);

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerVisitRoutes } = await import(pathToFileURL(routePath).href);
const { signToken } = await import(
	pathToFileURL(path.resolve("apps/api/dist/utils/cryptoHelper.js")).href
);
const { authTokenSecret } = await import(
	pathToFileURL(path.resolve("apps/api/dist/security/authSecret.js")).href
);

const app = Fastify({ logger: false });
app.setErrorHandler((error, _request, reply) => {
	if (error?.name === "ZodError" && Array.isArray(error.issues)) {
		return reply.code(400).send({
			error: "ValidationError",
			issues: error.issues,
		});
	}
	return reply.send(error);
});
await registerVisitRoutes(app);

/*
 * ТОКЕН КАБИНЕТА ОБЯЗАТЕЛЕН, ИНАЧЕ ПРОВЕРЯЕТСЯ НЕ ВАЛИДАЦИЯ, А ВХОД.
 *
 * БЫЛО: обе проверки ниже посылали запрос БЕЗ токена кабинета и ждали 400 с
 * человеческим текстом, а получали 401 «Требуется авторизация рабочего кабинета
 * клиники» на первой же. Порядок барьеров в маршруте — сначала кабинет, потом
 * разбор тела (`requireClinicalMutationContext` до `parseVisitPayload`), поэтому
 * до текста отказа запрос не доходил НИКОГДА: ни одна из двух формулировок для
 * врача не проверялась.
 *
 * ПРАВ МАРШРУТ, УСТАРЕЛ СЦЕНАРИЙ. Гейт секрета администратора клиники маршрут
 * визитов получил коммитом e951c9550 (2026-07-29, «подписание карты приёма не
 * проверяло секрет администратора клиники») — до него охранник лежал в файле
 * мёртвым импортом. Тот же дефект того же класса в
 * `scripts/smoke-core-route-validation.mjs` починен в тот же день коммитом
 * 1d2e7dfb7 ровно этой подписью токена; здесь повторён его способ, а не заведён
 * второй.
 *
 * Организация синтетическая осознанно: оба тела заведомо невалидны, разбор падает
 * ДО первого обращения к базе, поэтому содержимое базы на предмет проверки не
 * влияет, а сценарий остаётся независимым от неподнятой PostgreSQL.
 */
const clinicToken = signToken(
	{ organizationId: "00000000-0000-4000-8000-0000000000c0" },
	authTokenSecret(),
);

const clinicalHeaders = {
	"x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET,
	"x-dente-clinic-token": clinicToken,
	"content-type": "application/json",
};

const forbiddenValidationTerms =
	/ZodError|too_small|invalid_type|invalid_string|issues|path|request\.body|safeParse|visitId|patientId|selectedSpecialty|transcript|baseRevision|clientDraftId|clientSavedAt|doctorSummary|clientMutationId|complaint|anamnesis|objectiveStatus|diagnosis|treatmentPlan|warnings/i;

async function requestJson(options) {
	const response = await app.inject({
		...options,
		headers: {
			...clinicalHeaders,
			...(options.headers ?? {}),
		},
	});
	let body;
	try {
		body = response.json();
	} catch {
		body = {};
	}
	return { response, body, text: response.body };
}

function assertRouteValidationResponse(actual, label, expectedMessage) {
	assert(
		actual.response.statusCode === 400,
		`${label} must return 400, got ${actual.response.statusCode}: ${actual.text}`,
	);
	assert(
		actual.body.error === "VisitDraftValidationError",
		`${label} error code mismatch: ${actual.text}`,
	);
	assert(
		actual.body.message === expectedMessage,
		`${label} must return bounded message, got: ${actual.text}`,
	);
	assert(
		!Object.hasOwn(actual.body, "issues"),
		`${label} must not return zod issues`,
	);
	assert(
		!forbiddenValidationTerms.test(actual.text),
		`${label} leaked schema/parser detail: ${actual.text}`,
	);
}

const visitId = "00000000-0000-4000-8000-000000000001";
const invalidPayload = {
	patientId: "bad",
	selectedSpecialty: "bad",
	transcript: "",
};

const checks = [
	[
		"visit draft autosave invalid payload",
		await requestJson({
			method: "PUT",
			url: `/api/visits/${visitId}/draft/autosave`,
			payload: invalidPayload,
		}),
		"Черновик приема не сохранен: передайте пациента, специальность, текст приема или заполненные поля черновика.",
	],
	[
		"visit draft accept invalid payload",
		await requestJson({
			method: "POST",
			url: `/api/visits/${visitId}/draft/accept`,
			payload: invalidPayload,
		}),
		"Черновик приема не принят: передайте текст приема, заполненные поля черновика и данные сохранения врача.",
	],
];

for (const [label, actual, expectedMessage] of checks) {
	assertRouteValidationResponse(actual, label, expectedMessage);
}

await app.close();
delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
delete process.env.NODE_ENV;

console.log(
	JSON.stringify({
		ok: true,
		checkedRoutes: checks.map(([label]) => label),
		rawValidationHidden: true,
	}),
);
