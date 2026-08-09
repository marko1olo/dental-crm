import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-clinical-secret";
/*
 * СЕКРЕТ ПОДПИСИ ТОКЕНОВ — СИНТЕТИЧЕСКИЙ И ОБЯЗАТЕЛЕН ЗДЕСЬ. Под
 * `NODE_ENV=production` `authTokenSecret()` справедливо отказывается подписывать
 * без него, и сценарий падал бы на своём же правильном стороже. Строка списана с
 * `scripts/smoke-core-route-validation.mjs`, второй способ подписи не заводится.
 */
process.env.AUTH_TOKEN_SECRET ??=
	"synthetic-auth-token-secret-for-visit-draft-status-smoke";

const routePath = path.resolve("apps/api/dist/routes/visits.js");
const cryptoHelperPath = path.resolve("apps/api/dist/utils/cryptoHelper.js");
const authSecretPath = path.resolve("apps/api/dist/security/authSecret.js");

/*
 * Проверяются ровно те три артефакта, которые сценарий импортирует ниже. Здесь
 * стоял `dist/sampleData.js` — файл, который после отказа от фикстур не
 * загружается вовсе, то есть страж следил за посторонним файлом и промолчал бы о
 * несобранном `cryptoHelper`, уронив сценарий невнятным ERR_MODULE_NOT_FOUND.
 */
for (const artifact of [routePath, cryptoHelperPath, authSecretPath]) {
	if (!existsSync(artifact)) {
		throw new Error(`Build API first: npm run build (нет ${artifact})`);
	}
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerVisitRoutes } = await import(pathToFileURL(routePath).href);
const { signToken } = await import(pathToFileURL(cryptoHelperPath).href);
const { authTokenSecret } = await import(pathToFileURL(authSecretPath).href);
/*
 * СЦЕНАРИЙ БОЛЬШЕ НЕ ВОЗИТ СОСТОЯНИЕ ЧЕРЕЗ `sampleData`, И ЭТО НЕ УПРОЩЕНИЕ.
 *
 * ЗАМЕРЕНО 2026-08-09 на живом PostgreSQL: приёма `activeVisit.id` из
 * `sampleData` в базе НЕТ ВОВСЕ (`select ... where id = ...` вернул 0 строк), а
 * маршрут читает базу. Поэтому первый же шаг «autosave обязан работать на
 * открытом приёме» получал 404 «Прием не найден», и ни один текст отказа ниже не
 * проверялся. Правки статусов (`activeVisit.status = "signed"`) и сверки
 * `visitDraftAutosaves.length` меняли и читали массивы в памяти процесса,
 * которых маршрут не касается ни одной строкой.
 *
 * ПРАВ МАРШРУТ, УСТАРЕЛ СЦЕНАРИЙ. Мутации визитов переведены в PostgreSQL
 * коммитом 50b64a49c (2026-07-04, «migrate patients and visits mutations to
 * Postgres»), а чтение черновика закрытого приёма СОЗНАТЕЛЬНО перестало быть
 * `200 { serverDraft: null }` в коммите 545d3490f (2026-07-29, «сервер говорил
 * „Прием не найден“ о приёме, который есть в базе и подписан») — теперь это
 * отдельный отказ с разными текстами для подписанного и аннулированного.
 * Сценарий требовал `200`/`null`, то есть закреплял ровно то поведение, которое
 * тот коммит признал ложью.
 *
 * ЧТО СТАЛО С ПОКРЫТИЕМ ЗАКРЫТОГО ПРИЁМА. Оно не потеряно и не ослаблено:
 * `apps/api/src/tests/routes/visits.test.ts:113-160` проверяет ровно эти тексты
 * и коды (`visit_closed` для autosave и accept, `visit_not_found`) через
 * `sendVisitDraftMutationError`, и делает это БЕЗ базы. Дублировать их здесь
 * посевом строк в живую базу значило бы писать в чужие данные ради того, что уже
 * проверено.
 *
 * ЧТО ОСТАЛОСЬ ЗДЕСЬ. Только то, что этот сценарий проверяет честно и целиком
 * через HTTP: запрет утечки внутреннего текста исключения (проверки по исходнику
 * выше) и две ветки отказа, которым фикстура не нужна вообще — метка
 * «открытого приёма нет» и неизвестный приём.
 */
const noActiveVisitId = "00000000-0000-0000-0000-000000000000";
const unknownVisitId = "00000000-0000-4000-8000-000000000000";
const syntheticOrganizationId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const syntheticPatientId = "1f4d0c8e-6b2a-4f7c-9d31-5a8e2b7c4d69";

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

const visitRouteSource = readFileSync("apps/api/src/routes/visits.ts", "utf8");
assert(
	!visitRouteSource.includes(
		"const message = error instanceof Error ? error.message",
	),
	"visit route must not forward raw domain error.message",
);
assert(
	!visitRouteSource.includes(
		'send({ error: "VisitDraftMutationRejected", message })',
	),
	"visit route must not expose raw closed-visit text",
);
assert(
	visitRouteSource.includes("visitDraftDomainMessage("),
	"visit route must keep private domain message classifier",
);

const forbiddenVisitMutationTerms =
	/ZodError|issues|path|request\.body|safeParse|visitId|patientId|selectedSpecialty|transcript|baseRevision|clientDraftId|clientSavedAt|doctorSummary|clientMutationId|complaint|anamnesis|objectiveStatus|diagnosis|treatmentPlan|warnings|undefined|null|Визит не найден|Прием уже закрыт или аннулирован/i;

function assertVisitMutationRejection(
	response,
	label,
	expectedStatusCode,
	expectedError,
	expectedReason,
	expectedMessage,
) {
	assert(
		response.statusCode === expectedStatusCode,
		`${label} must return ${expectedStatusCode}: ${response.statusCode} ${response.body}`,
	);
	const payload = response.json();
	assert(
		payload.error === expectedError,
		`${label} error code mismatch: ${response.body}`,
	);
	assert(
		payload.reason === expectedReason,
		`${label} reason mismatch: ${response.body}`,
	);
	assert(
		payload.message === expectedMessage,
		`${label} message mismatch: ${response.body}`,
	);
	assert(
		payload.error !== payload.message,
		`${label} must not place operator copy in error`,
	);
	assert(
		!Object.hasOwn(payload, "issues"),
		`${label} must not expose zod issues`,
	);
	assert(
		!forbiddenVisitMutationTerms.test(response.body),
		`${label} leaked raw visit/schema detail: ${response.body}`,
	);
}

const app = Fastify({ logger: false });
await registerVisitRoutes(app);

/*
 * ТОКЕН КАБИНЕТА ОБЯЗАТЕЛЕН, ИНАЧЕ ПРОВЕРЯЕТСЯ НЕ КОНТРАКТ ЧЕРНОВИКА, А ВХОД.
 *
 * БЫЛО: все проверки посылали только секрет администратора клиники и получали 401
 * «Требуется авторизация рабочего кабинета клиники» на первом же запросе —
 * порядок барьеров в маршруте ставит кабинет ПЕРЕД разбором тела и перед базой
 * (`requireClinicalMutationContext`), поэтому ни один текст отказа черновика этим
 * сценарием не проверялся.
 *
 * ПРАВ МАРШРУТ, УСТАРЕЛ СЦЕНАРИЙ: гейт визитов введён коммитом e951c9550
 * (2026-07-29), а тот же дефект того же класса в
 * `scripts/smoke-core-route-validation.mjs` починен в тот же день коммитом
 * 1d2e7dfb7 этой же подписью токена. Способ повторён, а не заведён второй.
 *
 * Организация синтетическая: обе ветки ниже отказывают ДО того, как содержимое
 * клиники начинает что-то значить, поэтому сценарий не зависит от того, что лежит
 * в общей базе, и ничего в неё не пишет.
 */
const clinicToken = signToken(
	{ organizationId: syntheticOrganizationId },
	authTokenSecret(),
);

const clinicalHeaders = {
	"x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET,
	"x-dente-clinic-token": clinicToken,
};

const draft = {
	complaint: "Smoke closed visit complaint must not be written",
	anamnesis: "Smoke closed visit anamnesis must not be written",
	objectiveStatus: "Smoke closed visit objective must not be written",
	diagnosis: "Smoke closed visit diagnosis must not be written",
	treatmentPlan: "Smoke closed visit plan must not be written",
	warnings: [],
};

const autosavePayload = {
	patientId: syntheticPatientId,
	selectedSpecialty: "therapist",
	transcript: "Smoke draft text for a visit that does not exist.",
	draft,
	baseRevision: 1,
	clientDraftId: "smoke-open-draft",
	clientSavedAt: new Date().toISOString(),
};

const acceptPayload = {
	draft,
	doctorSummary: "Smoke accept must be rejected",
	clientMutationId: "smoke-accept",
	baseRevision: 1,
	clientSavedAt: new Date().toISOString(),
};

/*
 * МЕТКА «ОТКРЫТОГО ПРИЁМА НЕТ» — ветка, до которой этот сценарий не доходил
 * никогда, а врач в неё попадает на пустой клинике: сводка главного экрана кладёт
 * в `activeVisit.id` нулевой идентификатор, и клиентские сторожа `if (!id)` его
 * пропускают (разбор — в шапке `apps/api/src/routes/visits.ts`). Базы эта ветка
 * не касается: проверка стоит до разбора тела.
 */
const noActiveVisitAutosaveResponse = await app.inject({
	method: "PUT",
	url: `/api/visits/${noActiveVisitId}/draft/autosave`,
	headers: clinicalHeaders,
	payload: autosavePayload,
});
assertVisitMutationRejection(
	noActiveVisitAutosaveResponse,
	"no active visit autosave",
	409,
	"VisitDraftMutationRejected",
	"no_active_visit",
	"Черновик приема не сохранен: в клинике сейчас не открыт ни один прием, поэтому записывать некуда. Набранный текст остался на экране — " +
		"откройте прием по записи в расписании и повторите сохранение.",
);

const noActiveVisitAcceptResponse = await app.inject({
	method: "POST",
	url: `/api/visits/${noActiveVisitId}/draft/accept`,
	headers: clinicalHeaders,
	payload: acceptPayload,
});
assertVisitMutationRejection(
	noActiveVisitAcceptResponse,
	"no active visit accept",
	409,
	"VisitDraftMutationRejected",
	"no_active_visit",
	"Черновик приема не принят: в клинике сейчас не открыт ни один прием, поэтому подписывать нечего. Набранный текст остался на экране — " +
		"откройте прием по записи в расписании и повторите сохранение.",
);

/*
 * НЕИЗВЕСТНЫЙ ПРИЁМ. Тело ВАЛИДНО намеренно: иначе запрос отказался бы на разборе
 * и ветку доменного отказа сценарий бы не тронул. Строки с таким идентификатором в
 * базе нет, слой доступа честно бросает своё внутреннее «Визит не найден», и
 * проверяется главное — что наружу это внутреннее слово НЕ уходит
 * (`forbiddenVisitMutationTerms` ловит его дословно).
 *
 * ЭТОТ ШАГ ТРЕБУЕТ ДОСТУПНОЙ БАЗЫ, и это осознанно: при недоступной PostgreSQL
 * маршрут ответит общим 409 «обновите прием и повторите действие», сценарий
 * упадёт и НАЗОВЁТ полученный ответ. Тихого пропуска здесь нет — гейт, который
 * умеет молча самоотключаться, не гейт.
 */
const unknownVisitResponse = await app.inject({
	method: "PUT",
	url: `/api/visits/${unknownVisitId}/draft/autosave`,
	headers: clinicalHeaders,
	payload: autosavePayload,
});
assertVisitMutationRejection(
	unknownVisitResponse,
	"unknown visit autosave",
	404,
	"VisitNotFound",
	"visit_not_found",
	"Прием не найден. Обновите рабочий экран и выберите актуальный прием.",
);

await app.close();

delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

console.log(
	JSON.stringify(
		{
			ok: true,
			visitDraftStatusContract: true,
			checkedBranches: [
				"no active visit autosave",
				"no active visit accept",
				"unknown visit autosave",
			],
		},
		null,
		2,
	),
);
