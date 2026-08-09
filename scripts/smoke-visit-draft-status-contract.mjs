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
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath)) {
	throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerVisitRoutes } = await import(pathToFileURL(routePath).href);
const { signToken } = await import(
	pathToFileURL(path.resolve("apps/api/dist/utils/cryptoHelper.js")).href
);
const { authTokenSecret } = await import(
	pathToFileURL(path.resolve("apps/api/dist/security/authSecret.js")).href
);
const { activeVisit, visitDraftAutosaves } = await import(
	pathToFileURL(sampleDataPath).href
);

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
 * ОРГАНИЗАЦИЯ ЗДЕСЬ НЕ СИНТЕТИЧЕСКАЯ, В ОТЛИЧИЕ ОТ СОСЕДНЕГО СЦЕНАРИЯ, И ЭТО
 * СУЩЕСТВЕННО: тела запросов ниже ВАЛИДНЫ, они доходят до слоя доступа и
 * сверяются с приёмом из `sampleData` (`activeVisit`). Токен с чужой организацией
 * дал бы «приём не найден» на каждом шаге, то есть сценарий стал бы зелёным на
 * ложном основании либо красным по неверной причине.
 */
const clinicToken = signToken(
	{ organizationId: activeVisit.organizationId },
	authTokenSecret(),
);

const clinicalHeaders = {
	"x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET,
	"x-dente-clinic-token": clinicToken,
};
const originalStatus = activeVisit.status;
const originalComplaint = activeVisit.complaint;
const originalRevision = activeVisit.revision;
const originalDraftCount = visitDraftAutosaves.length;

const draft = {
	complaint: "Smoke closed visit complaint must not be written",
	anamnesis: "Smoke closed visit anamnesis must not be written",
	objectiveStatus: "Smoke closed visit objective must not be written",
	diagnosis: "Smoke closed visit diagnosis must not be written",
	treatmentPlan: "Smoke closed visit plan must not be written",
	warnings: [],
};

const autosavePayload = {
	patientId: activeVisit.patientId,
	selectedSpecialty: "therapist",
	transcript: "Smoke draft text for a still-open visit.",
	draft,
	baseRevision: activeVisit.revision,
	clientDraftId: "smoke-open-draft",
	clientSavedAt: new Date().toISOString(),
};

assert(
	originalStatus === "draft",
	`sample active visit must start as draft, got ${originalStatus}`,
);

const openAutosaveResponse = await app.inject({
	method: "PUT",
	url: `/api/visits/${activeVisit.id}/draft/autosave`,
	headers: clinicalHeaders,
	payload: autosavePayload,
});
assert(
	openAutosaveResponse.statusCode === 200,
	`draft autosave must work while visit is draft: ${openAutosaveResponse.statusCode} ${openAutosaveResponse.body}`,
);
assert(
	openAutosaveResponse.json().serverDraft?.visitId === activeVisit.id,
	"open draft autosave response must return server draft",
);
const draftCountAfterOpenAutosave = visitDraftAutosaves.length;

for (const closedStatus of ["signed", "voided"]) {
	activeVisit.status = closedStatus;
	activeVisit.complaint = originalComplaint;
	activeVisit.revision = originalRevision;

	const closedReadResponse = await app.inject({
		method: "GET",
		url: `/api/visits/${activeVisit.id}/draft/autosave`,
		headers: clinicalHeaders,
	});
	assert(
		closedReadResponse.statusCode === 200,
		`closed visit draft read must be handled: ${closedReadResponse.statusCode}`,
	);
	assert(
		closedReadResponse.json().serverDraft === null,
		`${closedStatus} visit must not expose stale draft autosave`,
	);

	const closedAutosaveResponse = await app.inject({
		method: "PUT",
		url: `/api/visits/${activeVisit.id}/draft/autosave`,
		headers: clinicalHeaders,
		payload: {
			...autosavePayload,
			transcript: `Smoke blocked autosave for ${closedStatus}.`,
			clientDraftId: `smoke-blocked-${closedStatus}`,
		},
	});
	assertVisitMutationRejection(
		closedAutosaveResponse,
		`${closedStatus} visit autosave`,
		409,
		"VisitDraftMutationRejected",
		"visit_closed",
		"Черновик приема не сохранен: этот прием уже недоступен для изменений.",
	);
	assert(
		visitDraftAutosaves.length === draftCountAfterOpenAutosave,
		`${closedStatus} autosave rejection must not add a draft`,
	);

	const closedAcceptResponse = await app.inject({
		method: "POST",
		url: `/api/visits/${activeVisit.id}/draft/accept`,
		headers: clinicalHeaders,
		payload: {
			draft,
			doctorSummary: "Smoke closed visit accept must be rejected",
			clientMutationId: `smoke-closed-${closedStatus}`,
			baseRevision: activeVisit.revision,
			clientSavedAt: new Date().toISOString(),
		},
	});
	assertVisitMutationRejection(
		closedAcceptResponse,
		`${closedStatus} visit accept`,
		409,
		"VisitDraftMutationRejected",
		"visit_closed",
		"Черновик приема не принят: этот прием уже недоступен для изменений.",
	);
	assert(
		activeVisit.complaint === originalComplaint,
		`${closedStatus} accept rejection must not mutate signed clinical complaint`,
	);
	assert(
		activeVisit.revision === originalRevision,
		`${closedStatus} accept rejection must not advance visit revision`,
	);
}

activeVisit.status = "draft";
const unknownVisitResponse = await app.inject({
	method: "PUT",
	url: "/api/visits/00000000-0000-4000-8000-000000000000/draft/autosave",
	headers: clinicalHeaders,
	payload: autosavePayload,
});
assert(
	unknownVisitResponse.statusCode === 404,
	`unknown visit autosave must be 404: ${unknownVisitResponse.statusCode} ${unknownVisitResponse.body}`,
);
assertVisitMutationRejection(
	unknownVisitResponse,
	"unknown visit autosave",
	404,
	"VisitNotFound",
	"visit_not_found",
	"Прием не найден. Обновите рабочий экран и выберите актуальный прием.",
);

activeVisit.status = originalStatus;
activeVisit.complaint = originalComplaint;
activeVisit.revision = originalRevision;
visitDraftAutosaves.splice(originalDraftCount);

await app.close();

delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

console.log(
	JSON.stringify(
		{
			ok: true,
			visitDraftStatusContract: true,
			visitId: activeVisit.id,
		},
		null,
		2,
	),
);
