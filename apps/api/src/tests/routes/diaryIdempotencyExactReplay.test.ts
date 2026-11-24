/**
 * apps/api/src/tests/routes/diaryIdempotencyExactReplay.test.ts
 *
 * Проверка сквозной идемпотентности дневников приёма (Мандаты 8e, 8d/8zp):
 *   1. Повторный запрос POST /api/diaries с тем же Idempotency-Key возвращает сохранённый ответ (Idempotent-Replay: true).
 *   2. Не создаёт дублирующих строк в visit_diaries.
 *   3. Повторный запрос POST /api/diaries/:id/revise с тем же Idempotency-Key не плодит ревизий и возвращает закешированный результат.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	idempotencyKeys,
	organizations,
	patients,
	users,
	visitDiaries,
	visitDiaryRevisions,
	visits,
} from "../../db/schema.js";
import registerDiaryRoutes from "../../routes/diary.js";
import { idempotencyPlugin } from "../../plugins/idempotencyPlugin.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, purgeFixtureOrganizations } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const TEST_TENANT = fixtureUuid("diaryIdempotency", 1);
const TEST_DOCTOR = fixtureUuid("diaryIdempotency", 2);
const TEST_PATIENT = fixtureUuid("diaryIdempotency", 3);
const TEST_VISIT = fixtureUuid("diaryIdempotency", 4);

describe("Дневники приёма: сквозная идемпотентность Idempotency-Key (Мандат 8e, 8zp)", () => {
	let app: FastifyInstance;
	let doctorToken: string;

	before(async () => {
		await purgeFixtureOrganizations([TEST_TENANT]);

		// Инициализация базы тестовой клиники
		await db.insert(organizations).values({
			id: TEST_TENANT,
			name: "Клиника Идемпотентных Дневников",
			createdAt: new Date(),
		});

		await db.insert(users).values({
			id: TEST_DOCTOR,
			organizationId: TEST_TENANT,
			fullName: "Врач Идемпотент Тестович",
			role: "doctor",
			specialty: "Стоматолог-терапевт",
			isActive: true,
		});

		await db.insert(patients).values({
			id: TEST_PATIENT,
			organizationId: TEST_TENANT,
			fullName: "Пациент Повторный Клик",
			birthDate: "1990-05-15",
			phone: "+79998881122",
		});

		await db.insert(visits).values({
			id: TEST_VISIT,
			organizationId: TEST_TENANT,
			patientId: TEST_PATIENT,
			status: "draft",
		});

		doctorToken = signToken(
			{
				organizationId: TEST_TENANT,
				userId: TEST_DOCTOR,
				role: "doctor",
			},
			authTokenSecret(),
			3600,
		);

		app = createTenantTestApp();
		await app.register(idempotencyPlugin);
		await registerDiaryRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([TEST_TENANT]);
	});

	test("1. Повторный клик POST /api/diaries с одним Idempotency-Key даёт ровно 1 запись и дедуплицирует повтор", async () => {
		const idemKey = crypto.randomUUID();
		const body = {
			visitId: TEST_VISIT,
			patientId: TEST_PATIENT,
			diagnosisTooth: "16",
			diagnosisIcd10: "K02.1",
			complaint: "Кратковременные боли от холодного в зубе 1.6",
			anamnesis: "Появились 3 дня назад. Аллергоанамнез не отягощен.",
			statusLocalis: "На окклюзионной поверхности 1.6 глубокая кариозная полость",
			treatmentDescription: "Препарирование, антисептическая обработка, пломба Filtek Z250",
			status: "draft",
		};

		// 1-й запрос: создание черновика
		const res1 = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: {
				"content-type": "application/json",
				"x-dente-staff-token": doctorToken,
				"idempotency-key": idemKey,
			},
			payload: body,
		});

		assert.equal(res1.statusCode, 200, `Первый вызов вернул ${res1.statusCode}: ${res1.body}`);
		const json1 = JSON.parse(res1.body);
		assert.equal(json1.success, true);
		assert.ok(json1.id, "Должен вернуться ID дневника");

		// Проверяем таблицу idempotency_keys
		const [storedKey] = await db
			.select()
			.from(idempotencyKeys)
			.where(and(eq(idempotencyKeys.clinicId, TEST_TENANT), eq(idempotencyKeys.key, idemKey)));
		assert.ok(storedKey, "Ключ должен быть сохранён в idempotency_keys");
		assert.equal(storedKey.status, "completed");

		// 2-й запрос: дублирующий клик с тем же ключом
		const res2 = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: {
				"content-type": "application/json",
				"x-dente-staff-token": doctorToken,
				"idempotency-key": idemKey,
			},
			payload: body,
		});

		assert.equal(res2.statusCode, 200, `Повторный вызов вернул ${res2.statusCode}: ${res2.body}`);
		assert.equal(res2.headers["idempotent-replay"], "true", "Должен стоять заголовок Idempotent-Replay");
		const json2 = JSON.parse(res2.body);
		assert.equal(json2.id, json1.id, "Должен вернуться тот же ID дневника");

		// Проверяем физическое отсутствие дублей в базе данных
		const diaryRows = await db
			.select()
			.from(visitDiaries)
			.where(and(eq(visitDiaries.organizationId, TEST_TENANT), eq(visitDiaries.visitId, TEST_VISIT)));
		assert.equal(diaryRows.length, 1, "В базе должна быть строго 1 запись дневника, а не дубль!");
	});

	test("2. Повторный клик POST /api/diaries/:id/revise с тем же Idempotency-Key возвращает кеш без лишних ревизий", async () => {
		// Сначала подписываем дневник
		const [diary] = await db
			.select()
			.from(visitDiaries)
			.where(and(eq(visitDiaries.organizationId, TEST_TENANT), eq(visitDiaries.visitId, TEST_VISIT)));
		assert.ok(diary);

		await db
			.update(visitDiaries)
			.set({ isLocked: true, lockedAt: new Date(), digitalSignatureHash: "sha256-mock-hash" })
			.where(eq(visitDiaries.id, diary.id));

		const reviseIdemKey = crypto.randomUUID();
		const reviseBody = {
			treatmentDescription: "Препарирование, медикаментозная обработка, пломба Filtek Z250 A3",
			revisionReason: "Уточнена расцветка пломбировочного материала",
		};

		// 1-я ревизия
		const revRes1 = await app.inject({
			method: "POST",
			url: `/api/diaries/${diary.id}/revise`,
			headers: {
				"content-type": "application/json",
				"x-dente-staff-token": doctorToken,
				"idempotency-key": reviseIdemKey,
			},
			payload: reviseBody,
		});

		assert.equal(revRes1.statusCode, 200, `Первая ревизия: ${revRes1.body}`);
		const revJson1 = JSON.parse(revRes1.body);
		assert.equal(revJson1.success, true);
		assert.equal(revJson1.revisionCount, 1);

		// 2-я ревизия с тем же ключом (повторный клик врача)
		const revRes2 = await app.inject({
			method: "POST",
			url: `/api/diaries/${diary.id}/revise`,
			headers: {
				"content-type": "application/json",
				"x-dente-staff-token": doctorToken,
				"idempotency-key": reviseIdemKey,
			},
			payload: reviseBody,
		});

		assert.equal(revRes2.statusCode, 200, `Повторный клик ревизии: ${revRes2.body}`);
		assert.equal(revRes2.headers["idempotent-replay"], "true", "Должен стоять заголовок Idempotent-Replay");
		const revJson2 = JSON.parse(revRes2.body);
		assert.equal(revJson2.revisionCount, 1, "Число ревизий не должно увеличиться");

		// Проверяем в базе число записей ревизий
		const revisionsInDb = await db
			.select()
			.from(visitDiaryRevisions)
			.where(and(eq(visitDiaryRevisions.organizationId, TEST_TENANT), eq(visitDiaryRevisions.diaryId, diary.id)));
		assert.equal(revisionsInDb.length, 1, "В базе должна быть ровно 1 запись в истории ревизий!");
	});
});
