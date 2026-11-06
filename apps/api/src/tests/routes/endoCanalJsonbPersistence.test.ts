import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { registerEndoRoutes } from "../../routes/odontogram/endoRoutes.js";
import { db } from "../../db/client.js";
import { organizations, patients, toothStates, toothStateHistory } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

describe("Red Team Endo JSONB & Wheeler Persistence [END-03..07]", () => {
	const app = Fastify({ logger: false });
	const testOrgId = "a1111111-1111-4111-8111-111111111111";
	const testPatientId = "b2222222-2222-4222-8222-222222222222";
	const testDoctorId = "c3333333-3333-4333-8333-333333333333";
	const testToothNumber = 16; // Верхний моляр Wheeler (4 канала: MB1, MB2, DB, P)

	before(async () => {
		// Регистрация аутентификационного хука для эмуляции авторизованного врача (152-ФЗ)
		app.addHook("onRequest", async (req: any) => {
			req.__denteIdentity = {
				organizationId: testOrgId,
				userId: testDoctorId,
				role: "doctor",
				verified: true,
				fullName: "Доктор Эндодонтист",
			};
			req.user = {
				organizationId: testOrgId,
				role: "doctor",
				id: testDoctorId,
				userId: testDoctorId,
			};
		});

		registerEndoRoutes(app);
		await app.ready();

		// Инициализация тестовой организации и пациента в БД
		await db.insert(organizations).values({
			id: testOrgId,
			name: "Клиника Эндодонтии Red Team",
			createdAt: new Date(),
			updatedAt: new Date(),
		}).onConflictDoNothing();

		await db.insert(patients).values({
			id: testPatientId,
			organizationId: testOrgId,
			fullName: "Кузнецов Эндодонтический Пациент",
			phone: "+79991112233",
			birthDate: "1988-04-12",
			gender: "male",
			createdAt: new Date(),
			updatedAt: new Date(),
		}).onConflictDoNothing();

		// Очистка предыдущего состояния зуба
		await db.delete(toothStates).where(
			and(
				eq(toothStates.organizationId, testOrgId),
				eq(toothStates.patientId, testPatientId),
				eq(toothStates.toothNumber, testToothNumber),
			),
		);
	});

	after(async () => {
		// Очистка тестовых данных
		try {
			await db.delete(toothStates).where(
				and(
					eq(toothStates.organizationId, testOrgId),
					eq(toothStates.patientId, testPatientId),
				),
			);
			await db.delete(toothStateHistory).where(
				and(
					eq(toothStateHistory.organizationId, testOrgId),
					eq(toothStateHistory.patientId, testPatientId),
				),
			);
		} catch { /* safe */ }
		await app.close();
	});

	it("[END-03 & END-04] Сохраняет canalMeasurements в типизированный JSONB, чистый notes и реальный апекслокатор", async () => {
		const payload = {
			canals: [
				{ canalName: "MB1", workingLengthMm: 21.0, masterFile: "#25.04", masterCone: "Гуттаперча 0.04", referencePoint: "MB бугор", apexLocatorReading: "0.0 (Apex)" },
				{ canalName: "MB2", workingLengthMm: 20.0, masterFile: "#20.04", masterCone: "Гуттаперча 0.04", referencePoint: "MB бугор", apexLocatorReading: "-0.5 мм" },
				{ canalName: "DB", workingLengthMm: 20.5, masterFile: "#25.04", masterCone: "Гуттаперча 0.04", referencePoint: "DB бугор", apexLocatorReading: "0.0 (Apex)" },
				{ canalName: "P", workingLengthMm: 22.0, masterFile: "#30.04", masterCone: "Гуттаперча 0.04", referencePoint: "P бугор", apexLocatorReading: "0.0 (Apex)" },
			],
			notes: "Болезненность при перкуссии отсутствует. Полость раскрыта, каналы высушены.",
			irrigation: "NaOCl 3% + EDTA 17% (УЗ-активация)",
			rotarySystem: "WaveOne Gold / ProTaper Next",
			stageStamp: "COMPLETED",
			apexLocator: "MB1,DB,P: 0.0; MB2: -0.5",
		};

		const postRes = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/${testToothNumber}/endo`,
			payload,
		});

		assert.equal(postRes.statusCode, 200);
		const postBody = postRes.json();
		assert.equal(postBody.success, true);
		assert.equal(postBody.toothNumber, testToothNumber);
		assert.equal(postBody.notes, payload.notes, "Заметки врача не должны быть JSON.stringify помойкой!");
		assert.equal(postBody.canalMeasurements.length, 4, "Все 4 канала Wheeler сохранены в JSONB");

		// Проверка чтения из БД через GET
		const getRes = await app.inject({
			method: "GET",
			url: `/api/patients/${testPatientId}/tooth-states/${testToothNumber}/endo`,
		});

		assert.equal(getRes.statusCode, 200);
		const getBody = getRes.json();
		assert.equal(getBody.success, true);
		assert.equal(getBody.notes, payload.notes);
		assert.ok(Array.isArray(getBody.canalMeasurements));
		assert.equal(getBody.canalMeasurements.length, 4);

		// Проверка сохранности показаний апекслокатора по каждому каналу
		const mb2 = getBody.canalMeasurements.find((c: any) => c.canalName === "MB2");
		assert.ok(mb2);
		assert.equal(mb2.workingLengthMm, 20.0);
		assert.equal(mb2.apexLocatorReading, "-0.5 мм");
		assert.equal(mb2.masterFile, "#20.04");

		// Проверка физической записи в PostgreSQL 18
		const [dbRow] = await db.select().from(toothStates).where(
			and(
				eq(toothStates.organizationId, testOrgId),
				eq(toothStates.patientId, testPatientId),
				eq(toothStates.toothNumber, testToothNumber),
			),
		);
		assert.ok(dbRow);
		assert.equal(dbRow.notes, payload.notes);
		assert.ok(Array.isArray(dbRow.canalMeasurements));
		assert.equal((dbRow.canalMeasurements as any[]).length, 4);
	});
});
