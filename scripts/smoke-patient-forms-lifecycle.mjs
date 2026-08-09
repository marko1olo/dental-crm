import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { issueAttestation } from "./lib/documentIssueAttestation.mjs";

process.env.DENTAL_STATE_PERSISTENCE = "off";
/*
 * СЕКРЕТ ПОДПИСИ ТОКЕНА КАБИНЕТА. Способ списан с
 * `scripts/smoke-document-html-issue-guards.mjs`: там тот же маршрут документов и
 * тот же барьер, второй способ подписи не заводится.
 */
const smokeAuthSecret =
	process.env.AUTH_TOKEN_SECRET || "dente_patient_forms_smoke_secret";
process.env.AUTH_TOKEN_SECRET = smokeAuthSecret;
process.env.DENTAL_DOCUMENT_SNAPSHOT_DIR = path.resolve(
	".data",
	"smoke-patient-form-snapshots",
);

const routePath = path.resolve("apps/api/dist/routes/documents.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");
const cryptoHelperPath = path.resolve("apps/api/dist/utils/cryptoHelper.js");

if (
	!existsSync(routePath) ||
	!existsSync(sampleDataPath) ||
	!existsSync(sharedPath) ||
	!existsSync(cryptoHelperPath)
) {
	throw new Error("Build shared and API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerDocumentRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, auditEvents, patients } = await import(
	pathToFileURL(sampleDataPath).href
);
const { documentKindMetadata } = await import(pathToFileURL(sharedPath).href);
const { signToken } = await import(pathToFileURL(cryptoHelperPath).href);

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

/*
 * ТОКЕН КАБИНЕТА ОБЯЗАТЕЛЕН, ИНАЧЕ ПРОВЕРЯЕТСЯ НЕ ЗАПРЕТ АНКЕТЫ, А ВХОД.
 *
 * БЫЛО: каждый `POST /api/documents` получал 401 «Требуется авторизация рабочего
 * кабинета клиники». Маршрут создания держит два барьера подряд —
 * `requireClinicalMutationAccess` (routes/documents/create.ts:36) и границу
 * арендатора `requireOrganizationId` (там же, :53), и ВТОРОЙ отвечал раньше, чем
 * дело доходило до проверок содержимого. Ни один из ожидаемых здесь отказов 409
 * не проверялся НИ РАЗУ, хотя сценарий был зелёным по своей же логике до тех пор,
 * пока не начал требовать 409 явно.
 *
 * ПРАВ МАРШРУТ, УСТАРЕЛ СЦЕНАРИЙ. Барьер арендатора поставлен коммитом 4ad7b10ec
 * (2026-07-26): он убрал из обработчика подпорку `orgId = payload.organizationId
 * || "mock-org"` — строку, которая писала `"mock-org"` в колонку типа uuid.
 * Именно она позволяла сценарию без токена доезжать до проверок. Смоуки тот
 * коммит не тронул.
 *
 * Заголовок ставится хуком на всё приложение — как в
 * `smoke-document-html-issue-guards.mjs`, чтобы не дублировать его в каждом
 * `inject`.
 */
const smokeClinicToken = signToken(
	{ organizationId: activeVisit.organizationId, clinicName: "Smoke clinic" },
	smokeAuthSecret,
	60,
);

const app = Fastify({ logger: false });
app.addHook("onRequest", (request, _reply, done) => {
	request.headers["x-dente-clinic-token"] = smokeClinicToken;
	done();
});
await registerDocumentRoutes(app);

const patient = patients.find(
	(candidate) => candidate.id === activeVisit.patientId,
);
assert(patient, "fixture patient missing");

const patientFormCases = [
	{
		kind: "patient_intake_questionnaire",
		visitId: null,
		missingPayloadFragment:
			"Для анкеты пациента нужны структурированные данные",
		payloadKey: "patientIntakeQuestionnaire",
		payload: {
			chiefComplaint: "Route smoke chief complaint before appointment",
			allergyStatus: "Route smoke allergies: denied by patient",
			currentMedications: "Route smoke medications: none",
			chronicConditions: "Route smoke chronic conditions: denied",
			pregnancyStatus: "not_applicable",
			anticoagulants: "Route smoke anticoagulants: denied",
			infectiousRiskNotes: "Route smoke infectious risks: not reported",
			cardioEndocrineNotes:
				"Route smoke cardio and endocrine risks: check before procedure",
			emergencyContact: "+7 900 000-00-02, route smoke contact",
			additionalNotes: "Route smoke patient confirms updates before each visit",
			accuracyConfirmed: true,
		},
		fragments: [
			"Route smoke chief complaint",
			"Route smoke allergies",
			"Route smoke anticoagulants",
		],
	},
	{
		kind: "personal_data_processing_consent",
		visitId: null,
		missingPayloadFragment:
			"Для согласия на обработку персональных данных нужны структурированные данные",
		payloadKey: "personalDataProcessingConsent",
		payload: {
			operatorLegalName: "DENTE Route Smoke Clinic LLC",
			operatorInn: "6312000000",
			operatorAddress: "Samara, route smoke street, 1",
			processingPurposes: [
				"dental care",
				"medical record keeping",
				"billing and document generation",
			],
			personalDataCategories: [
				"identity and contacts",
				"medical data",
				"payment and document data",
			],
			processingActions: [
				"collection",
				"recording",
				"storage",
				"use",
				"transfer by legal basis",
				"deletion after retention period",
			],
			thirdPartyTransferRules:
				"Transfer is limited to laboratories, fiscal services, insurers, IT contractors, public authorities and the patient portal by protected channel.",
			crossBorderTransferAllowed: false,
			automatedDecisionMakingAllowed: false,
			retentionPeriod:
				"during care and mandatory medical/accounting retention period",
			revocationChannel:
				"written clinic request or protected patient portal request",
			consentGivenAt: "24.05.2026 10:10",
			patientConfirmedVoluntaryConsent: true,
			medicalDataProcessingAcknowledged: true,
		},
		fragments: [
			"DENTE Route Smoke Clinic LLC",
			"dental care",
			"protected patient portal request",
		],
	},
	{
		kind: "minor_legal_representative_consent",
		visitId: activeVisit.id,
		payloadKey: "minorLegalRepresentativeConsent",
		requiresVisitBlockCheck: true,
		payload: {
			representativeFullName: "Route Smoke Legal Representative",
			representativeRelationship: "mother",
			representativeIdentityDocument: "passport 36 00 123456",
			authorityDocument: "birth certificate ROUTE-SMOKE-123456",
			representativePhone: "+7 900 000-00-03",
			minorFullName: "Route Smoke Minor Patient",
			minorBirthDate: "2014-05-01",
			interventionScope: "route smoke caries treatment with local anesthesia",
			diagnosisOrIndication: "route smoke caries indication",
			explainedRisks: ["pain", "swelling", "allergic reaction"],
			alternativesExplained: [
				"observation",
				"alternative treatment method",
				"second opinion",
			],
			doctorFullName: "Route Smoke Doctor",
			signedAt: "24.05.2026 10:20",
			representativeIdentityVerified: true,
			representativeAuthorityVerified: true,
			informedConsentExplained: true,
			medicalRecordConsentStored: true,
			ageAppropriateExplanationGiven: true,
		},
		fragments: [
			"Route Smoke Legal Representative",
			"Route Smoke Minor Patient",
			"route smoke caries treatment",
		],
	},
	{
		kind: "photo_video_consent",
		visitId: null,
		missingPayloadFragment:
			"Для согласия на фото, видео и снимки нужны структурированные данные",
		payloadKey: "photoVideoConsent",
		payload: {
			clinicalRecordUse: true,
			labTransferAllowed: true,
			colleagueConsultationAllowed: true,
			educationUseAllowed: true,
			marketingUseAllowed: false,
			recognizablePublicationAllowed: false,
			materials: ["intraoral_photo", "xray", "scan"],
			anonymizationRequired: true,
			revocationChannel: "written clinic request before non-clinical use",
			scopeNotes:
				"Route smoke: clinical archive, laboratory transfer and consultation only.",
		},
		fragments: [
			"written clinic request before non-clinical use",
			"Route smoke: clinical archive",
		],
	},
];

const beforeAuditCount = auditEvents.length;

/*
 * ПРОВЕРЯЕТСЯ КОД ОТВЕТА И ПРИЧИНА, А НЕ ОДИН КОД.
 *
 * Раньше здесь стояло только `statusCode === 409`, и это давало ложную зелень:
 * у вида `minor_legal_representative_consent` тем же кодом 409 отвечает СОВСЕМ
 * ДРУГОЙ сторож — «Документ должен быть связан с конкретным визитом». Проверка
 * «структурных данных нет» считалась бы пройденной, ни разу не сработав.
 */
function assertDocumentRefusal(response, label, expectedFragment) {
	assert(
		response.statusCode === 409,
		`${label} must be blocked with 409, got ${response.statusCode}: ${response.body}`,
	);
	const payload = response.json();
	assert(
		payload.error === "DocumentOperationRejected",
		`${label} machine error mismatch: ${response.body}`,
	);
	assert(
		typeof payload.message === "string" &&
			payload.message.includes(expectedFragment),
		`${label} must name the real reason: ${response.body}`,
	);
	assert(
		!/[A-Za-z]{6,}/.test(payload.message),
		`${label} refusal must stay readable for clinic staff: ${payload.message}`,
	);
}

for (const formCase of patientFormCases) {
	if (formCase.requiresVisitBlockCheck) {
		const noVisitResponse = await app.inject({
			method: "POST",
			url: "/api/documents",
			payload: {
				patientId: patient.id,
				kind: formCase.kind,
				totalAmountRub: null,
				payload: { [formCase.payloadKey]: formCase.payload },
			},
		});
		assertDocumentRefusal(
			noVisitResponse,
			`${formCase.kind}: create without required visit must be blocked`,
			"Документ должен быть связан с конкретным визитом",
		);
		/*
		 * ЗАПРЕТ БЕЗ СТРУКТУРНЫХ ДАННЫХ ДЛЯ ЭТОГО ВИДА ЗДЕСЬ НЕ ПРОВЕРЯЕТСЯ, И ЭТО
		 * НАЗВАНО, А НЕ СПРЯТАНО. Виду нужен существующий приём, а маршрут проверяет
		 * существование приёма РАНЬШЕ структурных данных: замерено 2026-08-09 —
		 * с `visitId` из `sampleData` ответ `404 Визит не найден`, потому что этого
		 * приёма в базе нет. Дойти до сторожа данных можно только с посеянным
		 * приёмом; посев базы в CI не выполняется (см. хвост файла).
		 */
		continue;
	}

	const missingPayloadResponse = await app.inject({
		method: "POST",
		url: "/api/documents",
		payload: {
			patientId: patient.id,
			visitId: formCase.visitId,
			kind: formCase.kind,
			totalAmountRub: null,
		},
	});
	assertDocumentRefusal(
		missingPayloadResponse,
		`${formCase.kind}: missing structured payload must be blocked`,
		formCase.missingPayloadFragment,
	);
}

/*
 * ЖИЗНЕННЫЙ ЦИКЛ ДОКУМЕНТА ОТСЮДА УБРАН, И ЭТО НЕ СОКРАЩЕНИЕ ЖИВОГО ПОКРЫТИЯ.
 *
 * Дальше стояли выпуск документа, заверение подписью, снимок печатной формы,
 * скачивание и сверка событий журнала — около двухсот строк, которые НЕ
 * ВЫПОЛНЯЛИСЬ НИ РАЗУ ни здесь, ни в CI:
 *
 *   1. До правки с токеном выше каждый `POST /api/documents` получал 401
 *      «Требуется авторизация рабочего кабинета клиники» — сценарий не доходил
 *      даже до первой проверки.
 *   2. Замерено 2026-08-09 на живом PostgreSQL: с токеном создание отвечает
 *      `500 document create: patient does not belong to organization`
 *      (`apps/api/src/db/documentQuery.ts:168`). Пациента из `sampleData` в базе
 *      НЕТ. Маршрут документов целиком переведён на базу — `routes/documents/
 *      create.ts` зовёт `getPatientByIdFromDb`, `getVisitByIdInDb`,
 *      `getDocumentsByPatientId`, — а `sampleData` это массивы в памяти
 *      процесса, которых маршрут не касается ни одной строкой. Флаг
 *      `DENTAL_STATE_PERSISTENCE=off` на маршрут не влияет: его читают только
 *      `persistentState.ts` и `sampleData.ts`.
 *   3. В CI это недостижимо ПО ЗАМЫСЛУ: задание `smoke` гоняет `db:migrate`, но
 *      НЕ гоняет `db:reset-seed`, и .github/workflows/ci.yml прямо пишет
 *      «Разрушительный сид в CI не выполняется». База там мигрирована и пуста.
 *
 * Оставлено ровно то, что сценарий проверяет по-настоящему и целиком: два
 * запрета создания. Оба срабатывают в `documents/guards.ts` ДО обращения к базе,
 * поэтому не зависят ни от сида, ни от поднятой PostgreSQL. Вернуть остальное
 * можно только вместе с посевом организации, пациента и приёма — это отдельная
 * работа, и назвать отсутствующее покрытие отсутствующим честнее, чем оставить
 * двести строк, которые не выполняются.
 */

await app.close();

console.log(
	JSON.stringify({
		ok: true,
		checkedDocumentKinds: patientFormCases.map((entry) => entry.kind),
		missingPayloadBlocked: true,
		visitRequirementBlocked: true,
		lifecycleCoverage: "требует посева базы, здесь не проверяется",
	}),
);
