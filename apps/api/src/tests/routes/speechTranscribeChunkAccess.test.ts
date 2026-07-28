import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { aiJobs, organizations, patients, visits } from "../../db/schema.js";
import { registerSpeechRoutes } from "../../routes/speech.js";
import { TOKEN_SECRET } from "../../routes/auth.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { resetSpeechTranscriptionCacheForRestart } from "../../speech/storage.js";

/**
 * POST /api/speech/transcribe-chunk — единственный эндпоинт диктовки, который ПИШЕТ
 * в клиническую запись пациента.
 *
 * ЧТО БЫЛО СЛОМАНО. Обработчик стоял на requireClinicalMutationAccess. Этот гейт
 * возвращает только «да/нет» и при незаданном DENTE_CLINICAL_ADMIN_SECRET вместе с
 * DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1 пропускает запрос вообще без учетных
 * данных (accessGuard.ts:31-33). Организация вызывающего не определялась никогда, а
 * speech/storage.ts:404-425 берет организацию сохраняемого фрагмента ИЗ присланных
 * patientId/visitId — то есть арендатора записи выбирал клиент.
 *
 * ПОЧЕМУ ФЛАГИ ЗДЕСЬ ВКЛЮЧЕНЫ НАМЕРЕННО. DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1
 * выставлен ровно так, как в живой dev-среде, где дефект и был снят. Если бы защита
 * держалась на этом флаге, тест на 401 провалился бы. Он проходит — значит гейт больше
 * не зависит от переменных окружения.
 *
 * DENTE_DEV_ALLOW_HEADER_ORG НЕ включается: организация обязана приходить из подписанного
 * токена, а не из заголовка x-organization-id.
 *
 * Внешний провайдер не вызывается: передается только localTranscript без audioBase64,
 * gateway.ts:2018-2021 в этом случае сохраняет текст как fallback_text и не выходит в сеть.
 */

const ORG_A = "dce70000-0000-4000-8000-000000000901";
const ORG_B = "dce70000-0000-4000-8000-000000000902";
const PATIENT_A = "dce70000-0000-4000-8000-000000000911";
const VISIT_A = "dce70000-0000-4000-8000-000000000921";

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(message);
}

function chunkPayload(overrides: Record<string, unknown> = {}) {
	return {
		recordingId: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		chunkIndex: 0,
		localTranscript: "Жалобы на боль в области 36 зуба при накусывании.",
		language: "ru",
		source: "visit",
		patientId: PATIENT_A,
		visitId: VISIT_A,
		...overrides
	};
}

describe("доступ к записи фрагмента диктовки", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalEnv = { ...process.env };
	let tokenOrgA = "";
	let tokenOrgB = "";

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

		app = Fastify();
		await registerSpeechRoutes(app);

		const secret = TOKEN_SECRET();
		tokenOrgA = signToken({ organizationId: ORG_A }, secret);
		tokenOrgB = signToken({ organizationId: ORG_B }, secret);

		try {
			await db
				.insert(organizations)
				.values([
					{ id: ORG_A, name: "Клиника диктовки А" },
					{ id: ORG_B, name: "Клиника диктовки Б" }
				])
				.onConflictDoNothing();
			await db
				.insert(patients)
				.values({ id: PATIENT_A, organizationId: ORG_A, fullName: "Гордеев Илья Максимович", birthDate: "1988-03-17" })
				.onConflictDoNothing();
			await db
				.insert(visits)
				.values({ id: VISIT_A, organizationId: ORG_A, patientId: PATIENT_A, status: "draft" })
				.onConflictDoNothing();
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await db.delete(aiJobs).where(eq(aiJobs.organizationId, ORG_A));
			await db.delete(aiJobs).where(eq(aiJobs.organizationId, ORG_B));
			await db.delete(visits).where(eq(visits.organizationId, ORG_A));
			await db.delete(patients).where(eq(patients.organizationId, ORG_A));
			await db.delete(organizations).where(eq(organizations.id, ORG_A));
			await db.delete(organizations).where(eq(organizations.id, ORG_B));
		}
		resetSpeechTranscriptionCacheForRestart();
		await app.close();
		process.env = originalEnv;
	});

	// ГЛАВНАЯ ПРОВЕРКА. Базы данных не требует: гейт срабатывает до любого обращения к ней.
	test("без учетных данных запись отклоняется, а не валидируется", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/speech/transcribe-chunk",
			payload: chunkPayload()
		});

		assert.equal(
			response.statusCode,
			401,
			`запись без токена должна получать 401, получено ${response.statusCode}: ${response.body}`
		);
		assert.equal(JSON.parse(response.body).error, "AuthRequired");
	});

	// Пустое тело раньше доходило до валидации схемы и отвечало 400 — это и был признак,
	// что запрос вообще не спрашивали об учетных данных.
	test("пустое тело без токена отклоняется по авторизации, а не по схеме", async () => {
		const response = await app.inject({ method: "POST", url: "/api/speech/transcribe-chunk", payload: {} });

		assert.equal(response.statusCode, 401, response.body);
		assert.notEqual(JSON.parse(response.body).error, "SpeechChunkValidationError");
	});

	test("с действующим токеном кабинета фрагмент сохраняется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/speech/transcribe-chunk",
			headers: { "x-dente-clinic-token": tokenOrgA },
			payload: chunkPayload()
		});

		assert.equal(response.statusCode, 201, `валидный токен должен пускать: ${response.body}`);
		const body = JSON.parse(response.body);
		assert.equal(body.chunk.status, "fallback_text");
		assert.equal(body.chunk.organizationId, ORG_A);
		assert.equal(body.chunk.patientId, PATIENT_A);
		assert.ok(
			body.chunk.transcript.includes("36 зуба"),
			`текст диктовки не сохранен: ${body.chunk.transcript}`
		);
	});

	test("токен чужой клиники не пишет в карту пациента по patientId", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/speech/transcribe-chunk",
			headers: { "x-dente-clinic-token": tokenOrgB },
			payload: chunkPayload({ visitId: null, source: "document" })
		});

		// 404, а не 403: существование чужого идентификатора не подтверждается.
		assert.equal(response.statusCode, 404, `чужая карта должна быть недоступна: ${response.body}`);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "SpeechClinicalScopeError");
		assert.ok(body.message.includes("не найден"), body.message);
	});

	test("токен чужой клиники не пишет в прием чужой клиники", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/speech/transcribe-chunk",
			headers: { "x-dente-clinic-token": tokenOrgB },
			payload: chunkPayload({ patientId: null })
		});

		assert.equal(response.statusCode, 404, `чужой прием должен быть недоступен: ${response.body}`);
		assert.equal(JSON.parse(response.body).error, "SpeechClinicalScopeError");
	});

	/**
	 * Доказательство, что проверка выше не пустая.
	 *
	 * Соседний read-эндпоинт диктовки по-прежнему стоит на булевом гейте
	 * requireClinicalReadAccess (speech.ts:151). При тех же переменных окружения он
	 * отдает 200 запросу без единого заголовка. Ровно на этом семействе гейтов стоял и
	 * пишущий эндпоинт — поэтому 401 выше получен новой проверкой, а не средой.
	 *
	 * Это одновременно фиксирует незакрытый дефект: чтение диктовки открыто и арендатор
	 * у него не проверяется. Отдельный пакет, см.
	 * .agents/archon/packets/S1-speech-unauthenticated/handoff.md.
	 */
	test("булевый гейт чтения все еще пускает запрос без учетных данных", async () => {
		const response = await app.inject({ method: "GET", url: "/api/speech/status" });

		assert.equal(
			response.statusCode,
			200,
			`ожидался открытый read-эндпоинт как эталон прежнего поведения, получено ${response.statusCode}`
		);
	});

	test("подделанный токен не пускает к записи", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/speech/transcribe-chunk",
			headers: { "x-dente-clinic-token": `${signToken({ organizationId: ORG_A }, "чужой-секрет-подписи")}` },
			payload: chunkPayload()
		});

		assert.equal(response.statusCode, 401, `токен с чужой подписью должен отклоняться: ${response.body}`);
		assert.equal(JSON.parse(response.body).error, "AuthRequired");
	});
});
