import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import Fastify from "fastify";
import { TOKEN_SECRET } from "../../routes/auth.js";
import {
	registerVisitRoutes,
	sendVisitDraftMutationError,
	sendVisitOpenError,
} from "../../routes/visits.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * Маршруты черновика приёма требуют подписанный токен кабинета: они сами
 * проверяют x-dente-clinic-token через verifyToken и без него отдают 401
 * AuthRequired, не доходя до бизнес-логики. Послабление x-organization-id
 * здесь не действует.
 *
 * Тесты токен не слали, поэтому все четыре получали 401 вместо 404/409 и
 * ни одну ветку обработки ошибок на самом деле не проверяли. Токен
 * подписывается тем же секретом, которым маршрут его проверяет
 * (в не-production authTokenSecret берёт секрет разработки), — в репозитории
 * не появляется никакого секретного значения.
 */
const ORG_ID = "123e4567-e89b-12d3-a456-4266141740ff";

describe("visits routes integration", () => {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	let app: any;
	let clinicHeaders: Record<string, string>;
	const originalEnv = process.env;

	beforeEach(async () => {
		app = Fastify();
		await registerVisitRoutes(app);
		process.env = { ...originalEnv };
		clinicHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORG_ID },
				TOKEN_SECRET(),
			),
		};
	});

	afterEach(() => {
		app.close();
		process.env = originalEnv;
		mock.restoreAll();
	});

	const visitId = "123e4567-e89b-12d3-a456-426614174000";
	const validPayload = {
		patientId: "123e4567-e89b-12d3-a456-426614174001",
		selectedSpecialty: "therapist",
		text: "hello",
		draft: {
			complaint: "test",
			anamnesis: null,
			objectiveStatus: null,
			examination: null,
			diagnosis: null,
			treatment: null,
			treatmentPlan: null,
			recommendations: null,
			warnings: [],
		},
	};

	test('PUT /api/visits/:visitId/draft/autosave handles "Визит не найден"', async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTAL_MOCK_UPSERT_VISIT_DRAFT_AUTOSAVE_ERROR =
			"Визит не найден";

		const response = await app.inject({
			method: "PUT",
			url: `/api/visits/${visitId}/draft/autosave`,
			headers: clinicHeaders,
			payload: validPayload,
		});

		assert.strictEqual(response.statusCode, 404);
		const body = JSON.parse(response.body);
		assert.strictEqual(body.error, "VisitNotFound");
		assert.strictEqual(body.reason, "visit_not_found");
		assert.strictEqual(
			body.message,
			"Прием не найден. Обновите рабочий экран и выберите актуальный прием.",
		);
	});

	/**
	 * Разбор доменной ошибки проверяется на самой функции. Через HTTP до этих
	 * веток не добраться: единственный способ подставить ошибку — подменить
	 * upsertVisitDraftAutosaveInDb, а он импортирован деструктуризацией.
	 */
	function captureReply() {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const sent: { statusCode?: number; body?: any } = {};
		const reply = {
			code(statusCode: number) {
				sent.statusCode = statusCode;
				return reply;
			},
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			send(body: any) {
				sent.body = body;
				return reply;
			},
		};
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		return { reply: reply as any, sent };
	}

	test('sendVisitDraftMutationError: "Визит не найден" -> 404 visit_not_found', () => {
		const { reply, sent } = captureReply();
		sendVisitDraftMutationError(
			new Error("Визит не найден"),
			reply,
			"autosave",
		);

		assert.strictEqual(sent.statusCode, 404);
		assert.strictEqual(sent.body.error, "VisitNotFound");
		assert.strictEqual(sent.body.reason, "visit_not_found");
		assert.strictEqual(
			sent.body.message,
			"Прием не найден. Обновите рабочий экран и выберите актуальный прием.",
		);
	});

	test("sendVisitDraftMutationError: закрытый прием при autosave -> 409 visit_closed", () => {
		const { reply, sent } = captureReply();
		sendVisitDraftMutationError(
			new Error("Прием уже закрыт или аннулирован"),
			reply,
			"autosave",
		);

		assert.strictEqual(sent.statusCode, 409);
		assert.strictEqual(sent.body.error, "VisitDraftMutationRejected");
		assert.strictEqual(sent.body.reason, "visit_closed");
		assert.strictEqual(
			sent.body.message,
			"Черновик приема не сохранен: этот прием уже недоступен для изменений.",
		);
	});

	test("sendVisitDraftMutationError: закрытый прием при accept -> другое сообщение", () => {
		const { reply, sent } = captureReply();
		sendVisitDraftMutationError(
			new Error("Прием уже закрыт или аннулирован"),
			reply,
			"accept",
		);

		assert.strictEqual(sent.statusCode, 409);
		assert.strictEqual(sent.body.reason, "visit_closed");
		// Сообщение зависит от операции — это единственное отличие ветки accept.
		assert.strictEqual(
			sent.body.message,
			"Черновик приема не принят: этот прием уже недоступен для изменений.",
		);
	});

	test("sendVisitDraftMutationError: незнакомая ошибка -> 409 visit_draft_rejected", () => {
		const { reply, sent } = captureReply();
		sendVisitDraftMutationError(
			new Error("Some unknown error"),
			reply,
			"autosave",
		);

		assert.strictEqual(sent.statusCode, 409);
		assert.strictEqual(sent.body.error, "VisitDraftMutationRejected");
		assert.strictEqual(sent.body.reason, "visit_draft_rejected");
		assert.strictEqual(
			sent.body.message,
			"Черновик приема не изменен: обновите прием и повторите действие.",
		);
	});

	test("sendVisitDraftMutationError: не-Error тоже даёт 409, а не падение", () => {
		const { reply, sent } = captureReply();
		sendVisitDraftMutationError("строка вместо ошибки", reply, "autosave");

		assert.strictEqual(sent.statusCode, 409);
		assert.strictEqual(sent.body.reason, "visit_draft_rejected");
	});

	/*
	 * ОТКРЫТИЕ ПРИЁМА ПО ЗАПИСИ РАСПИСАНИЯ.
	 *
	 * Проверяются ровно две вещи, которые ломаются незаметно: разбор отказа
	 * (текст обязан назвать причину И действие — иначе врач у кресла жмёт одно и
	 * то же, как это было с «Обновите рабочий экран и выберите актуальный прием»
	 * при отсутствии способа выбрать приём) и барьер токена. Успешное открытие
	 * ходит в базу и проверено сквозным прогоном
	 * apps/api/src/tests/routes/chainWeldProof.ts, а не здесь.
	 */
	test("sendVisitOpenError: запись не найдена -> 404 appointment_not_found", () => {
		const { reply, sent } = captureReply();
		sendVisitOpenError(new Error("Запись не найдена"), reply);

		assert.strictEqual(sent.statusCode, 404);
		assert.strictEqual(sent.body.error, "AppointmentNotFound");
		assert.strictEqual(sent.body.reason, "appointment_not_found");
		assert.match(sent.body.message, /Обновите расписание/);
	});

	test("sendVisitOpenError: запись без пациента -> 409 appointment_without_patient", () => {
		const { reply, sent } = captureReply();
		sendVisitOpenError(new Error("У записи нет пациента"), reply);

		assert.strictEqual(sent.statusCode, 409);
		assert.strictEqual(sent.body.reason, "appointment_without_patient");
		assert.match(sent.body.message, /выберите пациента/);
	});

	test("sendVisitOpenError: отменённая запись -> 409 appointment_closed", () => {
		const { reply, sent } = captureReply();
		sendVisitOpenError(new Error("Запись отменена"), reply);

		assert.strictEqual(sent.statusCode, 409);
		assert.strictEqual(sent.body.reason, "appointment_closed");
		assert.match(sent.body.message, /Создайте новую запись/);
	});

	test("sendVisitOpenError: незнакомая ошибка -> 409 visit_open_rejected, а не падение", () => {
		const { reply, sent } = captureReply();
		sendVisitOpenError("строка вместо ошибки", reply);

		assert.strictEqual(sent.statusCode, 409);
		assert.strictEqual(sent.body.reason, "visit_open_rejected");
	});

	test("POST /api/appointments/:appointmentId/visit без токена кабинета -> 401", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/appointments/123e4567-e89b-12d3-a456-426614174002/visit",
		});

		assert.strictEqual(response.statusCode, 401);
		assert.strictEqual(JSON.parse(response.body).error, "AuthRequired");
	});
});

describe("visits routes - accept visit draft errors", () => {
	let app: ReturnType<typeof Fastify>;
	let clinicHeaders: Record<string, string>;

	beforeEach(async () => {
		process.env.NODE_ENV = "test";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		clinicHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: "123e4567-e89b-12d3-a456-4266141740ff" },
				TOKEN_SECRET(),
			),
		};

		app = Fastify();
		await app.register(registerVisitRoutes);
	});

	afterEach(async () => {
		await app.close();
		mock.restoreAll();
	});

	test("accept visit draft visit not found error path", async () => {
		const fakeUuid = "7f3a91c4-5b2e-4d18-9a06-2c7e845fb013";
		const response = await app.inject({
			method: "POST",
			url: `/api/visits/${fakeUuid}/draft/accept`,
			headers: clinicHeaders,
			payload: {
				visitId: fakeUuid,
				draft: {
					complaint: null,
					anamnesis: null,
					objectiveStatus: null,
					diagnosis: null,
					treatmentPlan: null,
					warnings: [],
				},
			},
		});

		assert.strictEqual(response.statusCode, 404);
		assert.deepStrictEqual(response.json(), {
			error: "VisitNotFound",
			reason: "visit_not_found",
			message:
				"Прием не найден. Обновите рабочий экран и выберите актуальный прием.",
		});
	});

	test("apply plan items validation error on empty payload", async () => {
		const fakeUuid = "7f3a91c4-5b2e-4d18-9a06-2c7e845fb013";
		const response = await app.inject({
			method: "POST",
			url: `/api/visits/${fakeUuid}/apply-plan-items`,
			headers: clinicHeaders,
			payload: {},
		});

		assert.strictEqual(response.statusCode, 400);
		assert.strictEqual(response.json().error, "ValidationError");
	});

	test("apply plan items validation error on invalid itemIds", async () => {
		const fakeUuid = "7f3a91c4-5b2e-4d18-9a06-2c7e845fb013";
		const response = await app.inject({
			method: "POST",
			url: `/api/visits/${fakeUuid}/apply-plan-items`,
			headers: clinicHeaders,
			payload: {
				planId: "7f3a91c4-5b2e-4d18-9a06-2c7e845fb014",
				itemIds: ["invalid-id"],
			},
		});

		assert.strictEqual(response.statusCode, 400);
		assert.strictEqual(response.json().error, "ValidationError");
	});
});

describe("visits routes - охрана каждого маршрута", () => {
	const zero = "00000000-0000-0000-0000-000000000000";
	const org = "123e4567-e89b-12d3-a456-4266141740ff";
	const adminSecret = "test-clinical-admin-secret";

	/** Все маршруты файла. Изменяющие помечены, чтобы список читался как контракт. */
	const routes = [
		{
			method: "POST",
			url: `/api/appointments/${zero}/visit`,
			mutating: true,
			error: "ClinicalAdminSecretRequired",
		},
		{
			method: "GET",
			url: `/api/visits/${zero}/draft/autosave`,
			mutating: false,
			error: "ClinicalReadSecretRequired",
		},
		{
			method: "PUT",
			url: `/api/visits/${zero}/draft/autosave`,
			mutating: true,
			error: "ClinicalAdminSecretRequired",
		},
		{
			method: "POST",
			url: `/api/visits/${zero}/draft/accept`,
			mutating: true,
			error: "ClinicalAdminSecretRequired",
		},
		{
			method: "POST",
			url: `/api/visits/${zero}/apply-plan-items`,
			mutating: true,
			error: "ClinicalAdminSecretRequired",
		},
	] as const;

	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		process.env.NODE_ENV = "test";
		delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		process.env.DENTE_CLINICAL_ADMIN_SECRET = adminSecret;
		app = Fastify();
		await app.register(registerVisitRoutes);
	});

	afterEach(async () => {
		await app.close();
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		mock.restoreAll();
	});

	for (const route of routes) {
		const label = `${route.method} ${route.url.replace(zero, ":id")}`;

		test(`${label} — без учетных данных вовсе не выполняется`, async () => {
			const response = await app.inject({
				method: route.method,
				url: route.url,
			});
			assert.strictEqual(
				response.statusCode,
				403,
				`${label} ответил ${response.statusCode} на запрос без учетных данных`,
			);
			assert.strictEqual(response.json().error, route.error);
		});

		test(`${label} — токен кабинета без секрета администратора не пропускается`, async () => {
			const response = await app.inject({
				method: route.method,
				url: route.url,
				headers: {
					"x-dente-clinic-token": signToken(
						{ organizationId: org },
						TOKEN_SECRET(),
					),
				},
			});
			assert.strictEqual(
				response.statusCode,
				403,
				`${label} ответил ${response.statusCode} на запрос без секрета администратора`,
			);
			assert.strictEqual(response.json().error, route.error);
		});
	}

	test("секрет администратора без токена кабинета не определяет клинику", async () => {
		for (const route of routes) {
			const response = await app.inject({
				method: route.method,
				url: route.url,
				headers: { "x-dente-admin-secret": adminSecret },
			});
			assert.strictEqual(
				response.statusCode,
				401,
				`${route.method} ${route.url} ответил ${response.statusCode} на запрос без токена кабинета`,
			);
			assert.strictEqual(response.json().error, "AuthRequired");
		}
	});

	test("оба фактора вместе открывают маршрут — охрана не кирпичная стена", async () => {
		const headers = {
			"x-dente-clinic-token": signToken(
				{ organizationId: org },
				TOKEN_SECRET(),
			),
			"x-dente-admin-secret": adminSecret,
		};
		const response = await app.inject({
			method: "GET",
			url: `/api/visits/${zero}/draft/autosave`,
			headers,
		});
		assert.strictEqual(response.statusCode, 200);
		assert.deepStrictEqual(response.json(), { serverDraft: null });

		const rejected = await app.inject({
			method: "POST",
			url: `/api/visits/${zero}/draft/accept`,
			headers: { ...headers, "Content-Type": "application/json" },
			payload: {},
		});
		assert.notStrictEqual(
			rejected.statusCode,
			401,
			"гейт пройден, а ответ 401",
		);
		assert.notStrictEqual(
			rejected.statusCode,
			403,
			"гейт пройден, а ответ 403",
		);
	});
});
