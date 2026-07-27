import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import Fastify from "fastify";
import { registerVisitRoutes, sendVisitDraftMutationError } from "../../routes/visits.js";
import { TOKEN_SECRET } from "../../routes/auth.js";
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
	let app: any;
	let clinicHeaders: Record<string, string>;
	const originalEnv = process.env;

	beforeEach(async () => {
		app = Fastify();
		await registerVisitRoutes(app);
		process.env = { ...originalEnv };
		clinicHeaders = {
			"x-dente-clinic-token": signToken({ organizationId: ORG_ID }, TOKEN_SECRET()),
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
		const sent: { statusCode?: number; body?: any } = {};
		const reply = {
			code(statusCode: number) {
				sent.statusCode = statusCode;
				return reply;
			},
			send(body: any) {
				sent.body = body;
				return reply;
			},
		};
		return { reply: reply as any, sent };
	}

	test('sendVisitDraftMutationError: "Визит не найден" -> 404 visit_not_found', () => {
		const { reply, sent } = captureReply();
		sendVisitDraftMutationError(new Error("Визит не найден"), reply, "autosave");

		assert.strictEqual(sent.statusCode, 404);
		assert.strictEqual(sent.body.error, "VisitNotFound");
		assert.strictEqual(sent.body.reason, "visit_not_found");
		assert.strictEqual(
			sent.body.message,
			"Прием не найден. Обновите рабочий экран и выберите актуальный прием.",
		);
	});

	test('sendVisitDraftMutationError: закрытый прием при autosave -> 409 visit_closed', () => {
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

	test('sendVisitDraftMutationError: закрытый прием при accept -> другое сообщение', () => {
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
		sendVisitDraftMutationError(new Error("Some unknown error"), reply, "autosave");

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
});
