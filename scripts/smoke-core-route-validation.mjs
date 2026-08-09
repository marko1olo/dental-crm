import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-clinical-secret";
process.env.DENTE_SCHEDULE_ADMIN_SECRET = "synthetic-schedule-secret";
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
delete process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS;
/*
 * СЕКРЕТ ПОДПИСИ ТОКЕНОВ — СИНТЕТИЧЕСКИЙ И ОБЯЗАТЕЛЕН ЗДЕСЬ.
 *
 * Сценарий работает под `NODE_ENV=production` намеренно: он проверяет боевое
 * поведение маршрутов, а не разрешённое послаблением. Но в production
 * `authTokenSecret()` СПРАВЕДЛИВО отказывается подписывать без
 * `AUTH_TOKEN_SECRET` — и без этой строки сценарий падал бы на своём же
 * правильном стороже, не дойдя до проверки.
 */
process.env.AUTH_TOKEN_SECRET ??=
	"synthetic-auth-token-secret-for-core-route-validation-smoke";

const routeFiles = {
	ai: path.resolve("apps/api/dist/routes/ai.js"),
	billing: path.resolve("apps/api/dist/routes/billing.js"),
	clinical: path.resolve("apps/api/dist/routes/clinical.js"),
	communications: path.resolve("apps/api/dist/routes/communications.js"),
	patients: path.resolve("apps/api/dist/routes/patients.js"),
	schedule: path.resolve("apps/api/dist/routes/schedule.js"),
};

for (const [label, routePath] of Object.entries(routeFiles)) {
	if (!existsSync(routePath)) {
		throw new Error(
			`Build API first: npm run build -w @dental/api (${label} missing)`,
		);
	}
}

const sourceFiles = {
	ai: readFileSync("apps/api/src/routes/ai.ts", "utf8"),
	billing: readFileSync("apps/api/src/routes/billing.ts", "utf8"),
	clinical: readFileSync("apps/api/src/routes/clinical.ts", "utf8"),
	communications: readFileSync("apps/api/src/routes/communications.ts", "utf8"),
	patients: readFileSync("apps/api/src/routes/patients.ts", "utf8"),
	schedule: readFileSync("apps/api/src/routes/schedule.ts", "utf8"),
};

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

const forbiddenSourceNeedles = [
	["ai", "parsedInput.error.issues.map((issue) => issue.message).join"],
	["billing", "parsedInput.error.issues.map((issue) => issue.message)"],
	[
		"communications",
		"parsedInput.error.issues.map((issue) => issue.message).join",
	],
	["communications", "message: error.message"],
	["clinical", "clinicalRuleEvaluationInputSchema.parse(request.body)"],
	["clinical", "createClinicalRuleSchema.parse(request.body)"],
	["patients", "createPatientSchema.parse(request.body)"],
	["patients", "updatePatientSchema.parse(request.body)"],
	["patients", "updatePatientAdministrativeProfileSchema.parse(request.body)"],
	["schedule", "createAppointmentSchema.parse(request.body)"],
	["schedule", "updateAppointmentSchema.parse(request.body)"],
	["schedule", "message: error instanceof Error ? error.message"],
	["schedule", "const message = error instanceof Error ? error.message"],
];

for (const [label, needle] of forbiddenSourceNeedles) {
	assert(
		!sourceFiles[label].includes(needle),
		`${label} route still exposes raw request validation: ${needle}`,
	);
}

[
	["ai", "AiRecognitionValidationError"],
	["ai", "VisitNoteDraftValidationError"],
	["billing", "BillingValidationError"],
	["communications", "CommunicationTaskValidationError"],
	["communications", "communicationTaskNotFoundMessage"],
	["clinical", "parseClinicalPayload("],
	["patients", "parsePatientPayload("],
	["schedule", "parseSchedulePayload("],
	["schedule", "appointmentRejectionResponse("],
].forEach(([label, needle]) => {
	assert(
		sourceFiles[label].includes(needle),
		`${label} route must keep route-owned validation marker: ${needle}`,
	);
});

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerAiRoutes } = await import(pathToFileURL(routeFiles.ai).href);
const { registerBillingRoutes } = await import(
	pathToFileURL(routeFiles.billing).href
);
const { registerClinicalRoutes } = await import(
	pathToFileURL(routeFiles.clinical).href
);
const { registerCommunicationRoutes } = await import(
	pathToFileURL(routeFiles.communications).href
);
const { registerPatientRoutes } = await import(
	pathToFileURL(routeFiles.patients).href
);
const { registerScheduleRoutes } = await import(
	pathToFileURL(routeFiles.schedule).href
);
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
await registerAiRoutes(app);
await registerBillingRoutes(app);
await registerClinicalRoutes(app);
await registerCommunicationRoutes(app);
await registerPatientRoutes(app);
await registerScheduleRoutes(app);

/*
 * ТОКЕН КАБИНЕТА ОБЯЗАТЕЛЕН, ИНАЧЕ ПРОВЕРЯЕТСЯ НЕ ВАЛИДАЦИЯ, А ВХОД.
 *
 * Все двенадцать проверок ниже посылали запрос БЕЗ токена кабинета и ждали 400 с
 * человеческим текстом, а получали 401 «Требуется авторизация рабочего кабинета
 * клиники» на первой же из них. Порядок барьеров в маршрутах — сначала кабинет,
 * потом разбор тела, поэтому до текста отказа запрос не доходил НИКОГДА: ни одна
 * из двенадцати формулировок для администратора клиники не проверялась.
 *
 * Токен подписывается ТЕМ ЖЕ секретом, что и в бою (`authTokenSecret`), поэтому
 * гейт остаётся настоящим. Организация синтетическая осознанно: все двенадцать
 * тел заведомо невалидны, разбор падает ДО первого обращения к базе, поэтому
 * существование клиники в базе на предмет проверки не влияет — а сценарий
 * остаётся независимым от содержимого общей базы.
 */
const clinicToken = signToken(
	{ organizationId: "00000000-0000-4000-8000-0000000000c0" },
	authTokenSecret(),
);

const clinicalHeaders = {
	"x-dente-admin-secret": "synthetic-clinical-secret",
	"x-dente-clinic-token": clinicToken,
	"content-type": "application/json",
};
const scheduleHeaders = {
	"x-dente-admin-secret": "synthetic-schedule-secret",
	"x-dente-clinic-token": clinicToken,
	"content-type": "application/json",
};

const forbiddenValidationTerms =
	/ZodError|too_small|invalid_type|invalid_string|issues|path|request\.body|safeParse|patientId|visitId|birthDate|fullName|administrativeProfile|preferredAppointmentStart|preferredAppointmentEnd|doctorUserId|assistantUserId|chairId|startsAt|endsAt|appointmentId|amountRub|fiscalReceipt|payerInn|kind|target|inputText|imagingStudyId|transcript|specialty|taskId|ruleId|serviceIds|triggerServiceIds|warningText|patientText/i;

const routeValidationMessageOverrides = new Map([
	[
		"appointment create invalid payload",
		"Запись не создана: выберите пациента, врача, кресло, дату и время приема.",
	],
	[
		"appointment update invalid payload",
		"Запись не обновлена: проверьте статус, время, врача, кресло и пациента.",
	],
]);

async function requestJson(options, headers = clinicalHeaders) {
	const response = await app.inject({
		...options,
		headers: {
			...headers,
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

/*
 * НАХОДКИ СОБИРАЮТСЯ ВСЕ, А НЕ ПЕРВАЯ.
 *
 * Прежде каждая проверка бросала исключение немедленно, и прогон умирал на
 * первом расхождении. Замер 2026-08-09: гейт сообщал ровно об одном отказе
 * (`billing payment invalid payload`), а остальные ОДИННАДЦАТЬ проверок из
 * двенадцати не выполнялись вовсе — их состояние было неизвестно и со стороны
 * читалось как «сломано одно место». Это молчаливый предел: починка одного
 * возвращает гейт в красное с новой находкой, а не в зелёное, и настоящий
 * объём расхождений виден только после дюжины итераций.
 *
 * Теперь расхождения собираются и печатаются вместе. Ни одно утверждение не
 * ослаблено: код возврата по-прежнему ненулевой при любой находке.
 */
const failures = [];

function record(condition, message) {
	if (!condition) failures.push(message);
}

function assertRouteValidationResponse(actual, label, expectedMessage) {
	const boundedMessage =
		routeValidationMessageOverrides.get(label) ?? expectedMessage;
	record(
		actual.response.statusCode === 400,
		`${label}: ожидался код 400, получен ${actual.response.statusCode} — ${actual.text}`,
	);
	record(
		actual.body.message === boundedMessage,
		`${label}: текст отказа разошёлся\n      ожидалось: «${boundedMessage}»\n      получено:  «${actual.body.message}»`,
	);
	record(
		!Object.hasOwn(actual.body, "issues"),
		`${label}: наружу утекли issues из Zod`,
	);
	record(
		!forbiddenValidationTerms.test(actual.text),
		`${label}: утекла внутренность схемы или разборщика — ${actual.text}`,
	);
}

const checks = [
	[
		"patient create invalid payload",
		await requestJson({ method: "POST", url: "/api/patients", payload: {} }),
		"Пациент не создан: заполните ФИО, дату рождения, контакты и обязательные поля карты.",
	],
	[
		"patient update invalid payload",
		await requestJson({
			method: "PUT",
			url: "/api/patients/00000000-0000-4000-8000-000000000001",
			payload: { birthDate: 123 },
		}),
		"Пациент не обновлен: проверьте ФИО, дату рождения, контакты и обязательные поля карты.",
	],
	[
		"patient administrative profile invalid payload",
		await requestJson({
			method: "PUT",
			url: "/api/patients/00000000-0000-4000-8000-000000000001/administrative-profile",
			payload: { preferredAppointmentStart: "10:00" },
		}),
		"Административный профиль не сохранен: проверьте документы, согласия, страховку и данные представителя.",
	],
	[
		"billing payment invalid payload",
		await requestJson({
			method: "POST",
			url: "/api/billing/payments",
			payload: {},
		}),
		/*
		 * ОЖИДАНИЕ ОБНОВЛЕНО 2026-08-09, И ЭТО ЕДИНСТВЕННЫЙ ИЗ ЧЕТЫРЁХ СЛУЧАЕВ,
		 * ГДЕ ПРАВ ОКАЗАЛСЯ МАРШРУТ, А НЕ ГЕЙТ.
		 *
		 * Прежде здесь стояло «Оплата не записана: проверьте сумму, дату, способ
		 * оплаты, фискальный чек и явные данные плательщика.» — перечисление ВСЕХ
		 * полей независимо от того, какое из них незаполнено. Маршрут перешёл на
		 * apps/api/src/utils/schemaRefusalWords.ts, который собирает отказ из
		 * названий РЕАЛЬНО пропущенных полей, и на пустом теле даёт «Не заполнены
		 * поля «пациент» и «сумма оплаты»…». Для администратора это строго лучше:
		 * названы те два поля, которые он и должен заполнить.
		 *
		 * Остальные три расхождения того же прогона — регрессии продукта, и там
		 * восстановлен маршрут (routes/clinical.ts:37-40). Ожидание в гейте
		 * подгонять под испорченный текст НЕЛЬЗЯ: это превратило бы страж в
		 * протокол порчи. Направление правки каждый раз решается сверкой с
		 * историей, а не удобством.
		 */
		"Не заполнены поля «пациент» и «сумма оплаты». Заполните их, затем повторите запись оплаты.",
	],
	[
		"ai recognition invalid payload",
		await requestJson({
			method: "POST",
			url: "/api/ai/recognition-jobs",
			payload: {},
		}),
		"AI-задача не создана: выберите пациента или снимок и тип черновика.",
	],
	[
		"visit note draft invalid payload",
		await requestJson({
			method: "POST",
			url: "/api/ai/visit-note-draft",
			payload: {},
		}),
		"Черновик приема не собран: передайте текст диктовки и специальность врача.",
	],
	[
		"communication task complete invalid payload",
		await requestJson({
			method: "POST",
			url: "/api/communications/tasks/complete",
			payload: {},
		}),
		"Задача связи не закрыта: выберите задачу, сотрудника и корректный исход действия.",
	],
	[
		"clinical rule evaluate invalid payload",
		await requestJson({
			method: "POST",
			url: "/api/clinical/rules/evaluate",
			payload: {},
		}),
		"Клинические правила не проверены: передайте пациента, визит и факты приема.",
	],
	[
		"clinical rule create invalid payload",
		await requestJson({
			method: "POST",
			url: "/api/clinical/rules",
			payload: {},
		}),
		"Клиническое правило не сохранено: заполните название, условие и действие правила.",
	],
	[
		"clinical rule update invalid payload",
		await requestJson({
			method: "PATCH",
			url: "/api/clinical/rules/smoke-rule",
			payload: { active: "yes" },
		}),
		"Клиническое правило не сохранено: заполните название, условие и действие правила.",
	],
	[
		"appointment create invalid payload",
		await requestJson(
			{ method: "POST", url: "/api/appointments", payload: {} },
			scheduleHeaders,
		),
		"Запись не создана: выберите пациента, врача, кресло, дату и время приема.",
	],
	[
		"appointment update invalid payload",
		await requestJson(
			{
				method: "PATCH",
				url: "/api/appointments/00000000-0000-4000-8000-000000000001",
				payload: { startsAt: "bad-date" },
			},
			scheduleHeaders,
		),
		"Запись не обновлена: проверьте статус, время, врача, кресло и пациента.",
	],
];

for (const [label, actual, expectedMessage] of checks) {
	assertRouteValidationResponse(actual, label, expectedMessage);
}

await app.close();

if (failures.length > 0) {
	console.error(
		`Отказы маршрутов разошлись с закреплённым контрактом: ${failures.length} из ${checks.length * 4} проверок.\n`,
	);
	for (const failure of failures) console.error(`  ${failure}`);
	console.error(
		"\nЧто это значит. Маршрут обязан отвечать 400 с человеческим текстом и " +
			"НЕ выдавать наружу внутренности Zod: пациент и администратор клиники " +
			"читают этот текст на экране.\n" +
			"Если текст изменён осознанно — обновите ожидание в `checks` или " +
			"внесите ярлык в `routeValidationMessageOverrides` этого файла.\n" +
			"Если текст собирается динамически (apps/api/src/utils/" +
			"schemaRefusalWords.ts), сверяйте его тестом " +
			"`schemaRefusalWordsAreHuman.test.ts`, а здесь держите закреплённую форму.",
	);
	process.exit(1);
}

console.log(
	JSON.stringify({
		ok: true,
		checkedRoutes: checks.map(([label]) => label),
		assertionsRun: checks.length * 4,
		rawValidationHidden: true,
	}),
);
