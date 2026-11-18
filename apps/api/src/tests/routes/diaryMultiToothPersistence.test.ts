import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	users,
	visitDiaries,
	visits,
} from "../../db/schema.js";
import registerDiaryRoutes from "../../routes/diary.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, purgeFixtureOrganizations, withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

describe("Multi-Tooth SOAP Diary ACID & Isolation (Domain 40, Mandates 8e, 8n)", () => {
	let app: FastifyInstance;
	let organizationId: string;
	let doctorUserId: string;
	let staffToken: string;
	let patientId: string;
	let visitId: string;

	before(async () => {
		organizationId = fixtureUuid("multi-tooth", 1);
		doctorUserId = fixtureUuid("multi-tooth", 2);
		patientId = fixtureUuid("multi-tooth", 3);
		visitId = fixtureUuid("multi-tooth", 4);

		await withFixtureTenant(organizationId, async (tx) => {
			await tx.insert(organizations).values({
				id: organizationId,
				name: "Multi-Tooth Test Clinic",
			});

			await tx.insert(users).values({
				id: doctorUserId,
				organizationId,
				role: "doctor",
				email: "doctor@multitooth.test",
				fullName: "Доктор Стоматологов",
			});

			await tx.insert(patients).values({
				id: patientId,
				organizationId,
				fullName: "Пациент Многозубов",
			});

			await tx.insert(visits).values({
				id: visitId,
				organizationId,
				patientId,
				status: "draft",
			});
		});

		staffToken = signToken(
			{
				organizationId,
				userId: doctorUserId,
				role: "doctor",
			},
			authTokenSecret(),
			3600,
		);

		app = createTenantTestApp();
		await registerDiaryRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([organizationId]);
	});

	test("сохранение дневников для зубов 16, 26, 36 не перезаписывает друг друга (Tooth-Scoped ACID)", async () => {
		// 1. Сохраняем дневник для зуба 16 (кариес)
		const res16 = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId,
				patientId,
				diagnosisTooth: "16",
				diagnosisIcd10: "K02.1",
				complaint: "Боль в зубе 16 от сладкого",
				statusLocalis: "Кариозная полость на окклюзионной поверхности зуба 16",
				treatmentDescription: "Препарирование и пломба светоотверждаемым композитом 16",
				status: "draft",
			},
		});
		assert.equal(res16.statusCode, 200, res16.body);

		// 2. Сохраняем дневник для зуба 26 (пульпит)
		const res26 = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId,
				patientId,
				diagnosisTooth: "26",
				diagnosisIcd10: "K04.0",
				complaint: "Острая ночная боль в зубе 26",
				statusLocalis: "Глубокая полость в зубе 26, вскрыт рог пульпы",
				treatmentDescription: "Экстирпация пульпы, эндодонтия 26",
				status: "draft",
			},
		});
		assert.equal(res26.statusCode, 200, res26.body);

		// 3. Сохраняем дневник для зуба 36 (периодонтит)
		const res36 = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId,
				patientId,
				diagnosisTooth: "36",
				diagnosisIcd10: "K04.5",
				complaint: "Боль при накусывании на зуб 36",
				statusLocalis: "Зуб 36 ранее лечен, перкуссия резко болезненна",
				treatmentDescription: "Распломбирование каналов 36, Ca(OH)2",
				status: "draft",
			},
		});
		assert.equal(res36.statusCode, 200, res36.body);

		// Проверяем физическое состояние БД: ровно 3 отдельных строки в visit_diaries!
		const allDiaries = await withFixtureTenant(organizationId, async (tx) =>
			tx
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, visitId),
						eq(visitDiaries.organizationId, organizationId),
					),
				),
		);

		assert.equal(allDiaries.length, 3, "Должно существовать ровно 3 раздельных дневника приёма");

		const diary16 = allDiaries.find((d) => d.diagnosisTooth === "16");
		const diary26 = allDiaries.find((d) => d.diagnosisTooth === "26");
		const diary36 = allDiaries.find((d) => d.diagnosisTooth === "36");

		assert.ok(diary16, "Дневник зуба 16 найден");
		assert.ok(diary26, "Дневник зуба 26 найден");
		assert.ok(diary36, "Дневник зуба 36 найден");

		assert.equal(diary16.diagnosisIcd10, "K02.1");
		assert.equal(diary16.treatmentDescription, "Препарирование и пломба светоотверждаемым композитом 16");

		assert.equal(diary26.diagnosisIcd10, "K04.0");
		assert.equal(diary26.treatmentDescription, "Экстирпация пульпы, эндодонтия 26");

		assert.equal(diary36.diagnosisIcd10, "K04.5");
		assert.equal(diary36.treatmentDescription, "Распломбирование каналов 36, Ca(OH)2");

		// 4. Проверяем обновление зуба 16: оно обязано менять ТОЛЬКО зуб 16
		const update16 = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId,
				patientId,
				diagnosisTooth: "16",
				diagnosisIcd10: "K02.1",
				treatmentDescription: "Шлифовка и полировка пломбы 16 (второй этап)",
				status: "draft",
			},
		});
		assert.equal(update16.statusCode, 200);

		const afterUpdate = await withFixtureTenant(organizationId, async (tx) =>
			tx
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, visitId),
						eq(visitDiaries.organizationId, organizationId),
					),
				),
		);
		assert.equal(afterUpdate.length, 3);
		const updated16 = afterUpdate.find((d) => d.diagnosisTooth === "16");
		const untouched26 = afterUpdate.find((d) => d.diagnosisTooth === "26");
		const untouched36 = afterUpdate.find((d) => d.diagnosisTooth === "36");

		assert.equal(updated16?.treatmentDescription, "Шлифовка и полировка пломбы 16 (второй этап)");
		assert.equal(untouched26?.treatmentDescription, "Экстирпация пульпы, эндодонтия 26");
		assert.equal(untouched36?.treatmentDescription, "Распломбирование каналов 36, Ca(OH)2");

		// 5. Проверяем консолидацию диагноза визита
		const [visitRow] = await withFixtureTenant(organizationId, async (tx) =>
			tx.select().from(visits).where(eq(visits.id, visitId)),
		);
		assert.ok(visitRow?.diagnosis?.includes("K02.1 (16)"));
		assert.ok(visitRow?.diagnosis?.includes("K04.0 (26)"));
		assert.ok(visitRow?.diagnosis?.includes("K04.5 (36)"));
	});
});
