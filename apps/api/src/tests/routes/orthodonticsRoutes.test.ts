import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { organizations, patients } from "../../db/schema.js";
import { registerOrthodonticsRoutes } from "../../routes/orthodontics.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "orthodonticsRoutes";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 2);
const OTHER_ORG_ID = fixtureUuid(NAMESPACE, 3);
const OTHER_PATIENT_ID = fixtureUuid(NAMESPACE, 4);

const ORG_HEADERS = { "x-organization-id": ORG_ID };
const OTHER_ORG_HEADERS = { "x-organization-id": OTHER_ORG_ID };

describe("Orthodontics Routes & 1-Click Autonomy API (Mandates 8e, 8k, 8s)", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await registerOrthodonticsRoutes(app);

		try {
			await purgeFixtureOrganizations([ORG_ID, OTHER_ORG_ID]);

			await withFixtureTenant(OTHER_ORG_ID, async () => {
				await db.insert(organizations).values({
					id: OTHER_ORG_ID,
					name: "Соседняя ортодонтическая клиника",
				});
				await db.insert(patients).values({
					id: OTHER_PATIENT_ID,
					organizationId: OTHER_ORG_ID,
					fullName: "Соседов Ортодонт Чужович",
				});
			});

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Тестовая ортодонтическая клиника",
				});
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Смирнова Екатерина Васильевна",
				});
			});
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				databaseAvailable = false;
				return;
			}
			throw error;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID, OTHER_ORG_ID]);
		}
		await app.close();
	});

	it("1. GET /api/orthodontics/:patientId/progress returns default orthodontic progress", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "GET",
			url: `/api/orthodontics/${PATIENT_ID}/progress`,
			headers: ORG_HEADERS,
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.patientId, PATIENT_ID);
		assert.equal(body.patientName, "Смирнова Екатерина Васильевна");
		assert.equal(body.currentAligner, 1);
		assert.equal(body.totalAligners, 36);
		assert.equal(body.currentStage, 1);
		assert.ok(body.startDate);
	});

	it("2. POST /api/orthodontics/:patientId/aligners/issue-set issues aligner set in 1 click (Mandate 8e)", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/aligners/issue-set`,
			headers: ORG_HEADERS,
			payload: {
				alignerCount: 2,
				wearDaysPerAligner: 14,
				totalAligners: 36,
				note: "Сдача капп №1-3",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.issuedRange, "№1–3");
		assert.ok(body.nextVisitRecommendedDate);
		assert.ok(body.actionSummary.includes("Выдан сет элайнеров №1–3"));
		assert.equal(body.progress.currentAligner, 3);
	});

	it("3. POST /api/orthodontics/:patientId/archwire-change records archwire change in 1 click", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/archwire-change`,
			headers: ORG_HEADERS,
			payload: {
				material: "CuNiTi",
				section: ".016",
				arch: "both",
				note: "Плановая смена дуг на нивелировании",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.archwire, 'CuNiTi .016" (ВЧ + НЧ)');
		assert.ok(body.actionSummary.includes("Смена дуги: CuNiTi .016\" (ВЧ + НЧ)"));
		assert.equal(body.progress.archwire, 'CuNiTi .016" (ВЧ + НЧ)');
	});

	it("4. POST /api/orthodontics/:patientId/ligatures-activate records activation & Power Chain", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/ligatures-activate`,
			headers: ORG_HEADERS,
			payload: {
				powerChain: true,
				powerChainSpan: "13-23",
				note: "Закрытие трем во фронтальном отделе",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.ok(body.actionSummary.includes("Установка цепочки Power Chain (сегмент 13-23)"));
	});

	it("5. POST /api/orthodontics/:patientId/stages/advance advances orthodontic stage without 8-photo blocker (Mandate 8e)", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/stages/advance`,
			headers: ORG_HEADERS,
			payload: {
				nextStage: 2,
				stageTitle: "Рабочий этап: юстировка и закрытие промежутков",
				note: "Переход выполнен свободно врачом без обязательной загрузки 8 фото",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.currentStage, 2);
		assert.ok(body.actionSummary.includes("Переход на этап 2: Рабочий этап: юстировка и закрытие промежутков"));
		assert.equal(body.progress.currentStage, 2);
	});

	it("6. Tenant isolation: other organization cannot view or modify orthodontic progress", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		// Attempt GET from other org
		const getRes = await app.inject({
			method: "GET",
			url: `/api/orthodontics/${PATIENT_ID}/progress`,
			headers: OTHER_ORG_HEADERS,
		});
		assert.equal(getRes.statusCode, 404);

		// Attempt POST from other org
		const postRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/aligners/issue-set`,
			headers: OTHER_ORG_HEADERS,
			payload: {
				alignerCount: 2,
				wearDaysPerAligner: 14,
			},
		});
		assert.equal(postRes.statusCode, 404);
	});
});
