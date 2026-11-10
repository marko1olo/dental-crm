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

	it("1. GET /api/orthodontics/:patientId/progress returns 404 when no active ortho treatment exists (DEF-ORTHO-02)", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "GET",
			url: `/api/orthodontics/${PATIENT_ID}/progress`,
			headers: ORG_HEADERS,
		});

		assert.equal(res.statusCode, 404);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "OrthoTreatmentNotFound");
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
				note: "Сдача капп №1-2",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.issuedRange, "№1–2");
		assert.ok(body.nextVisitRecommendedDate);
		assert.ok(body.actionSummary.includes("Выдан сет элайнеров №1–2"));
		assert.equal(body.progress.currentAligner, 2);

		// Проверяем гидратацию: теперь GET возвращает 200 и актуальный прогресс
		const progressRes = await app.inject({
			method: "GET",
			url: `/api/orthodontics/${PATIENT_ID}/progress`,
			headers: ORG_HEADERS,
		});
		assert.equal(progressRes.statusCode, 200);
		const progressBody = JSON.parse(progressRes.body);
		assert.equal(progressBody.patientId, PATIENT_ID);
		assert.equal(progressBody.patientName, "Смирнова Екатерина Васильевна");
		assert.equal(progressBody.currentAligner, 2);
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
		assert.ok(body.deduction);
		assert.equal(body.deduction.success, true);

		// DEF-ORTHO-10: Для съемных пластинок или без смены дуги расходник не списывается (deduction: null)
		const plateRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/archwire-change`,
			headers: ORG_HEADERS,
			payload: {
				material: "niti", // DEF-ORTHO-11: lowercase normalisation
				section: ".014",
				arch: "upper",
				applianceCategory: "plate",
				isWireChange: false,
				note: "Контроль пластинки без смены дуги",
			},
		});
		assert.equal(plateRes.statusCode, 200);
		const plateBody = JSON.parse(plateRes.body);
		assert.equal(plateBody.success, true);
		assert.equal(plateBody.archwire, 'NiTi .014" (ВЧ)');
		assert.equal(plateBody.deduction, null);
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

	it("7. POST /api/orthodontics/:patientId/deduct-materials deducts materials with soft overdraft", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/deduct-materials`,
			headers: ORG_HEADERS,
			payload: {
				action: "spring_activation",
				quantity: 2,
				notes: "Тестовое списание пружин Open-Coil",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.action, "spring_activation");
		assert.ok(body.deduction);
		assert.equal(body.deduction.success, true);
		assert.equal(body.deduction.deductedQty, 2);
	});

	it("8. POST /api/orthodontics/:patientId/rebracket records rebracket and deducts bracket in 1 click", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/rebracket`,
			headers: ORG_HEADERS,
			payload: {
				toothNumber: 24,
				bracketType: "Damon Q2 (паз .022)",
				note: "Отрыв брекета после жевания",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.toothNumber, 24);
		assert.ok(body.actionSummary.includes("Повторная фиксация брекета (1 шт.) на зубе 24"));
		assert.ok(body.deduction);
		assert.equal(body.deduction.success, true);
		assert.equal(body.deduction.deductedQty, 1);
		assert.equal(body.progress.lastActionSummary, body.actionSummary);
	});

	it("9. POST /api/orthodontics/:patientId/ceph-analysis persists 16 landmarks and calculated metrics in PostgreSQL 18", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/ceph-analysis`,
			headers: ORG_HEADERS,
			payload: {
				patientName: "Смирнова Екатерина Васильевна",
				imageUrl: "/uploads/imaging/ceph-test.jpg",
				landmarks: {
					S: { x: 280, y: 190 },
					N: { x: 440, y: 155 },
					Or: { x: 415, y: 230 },
					Po: { x: 245, y: 245 },
					ANS: { x: 475, y: 310 },
					PNS: { x: 305, y: 325 },
					A: { x: 462, y: 342 },
					B: { x: 446, y: 440 },
					Pog: { x: 452, y: 490 },
					Gn: { x: 442, y: 520 },
					Me: { x: 420, y: 540 },
					Go: { x: 250, y: 435 },
					U1t: { x: 494, y: 395 },
					U1a: { x: 456, y: 325 },
					L1t: { x: 471, y: 400 },
					L1a: { x: 428, y: 495 },
				},
				scaleMmPerPixel: 0.15,
				analysis: {
					sna: 82.5,
					snb: 80.0,
					anb: 2.5,
					witsMm: -0.5,
					skeletalClass: "I",
				},
				source: "manual",
				backendUsed: "Цефалометрический модуль ТРГ",
				isCalibratedFallback: false,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.ok(body.id);
		assert.equal(body.study.placedCount, 16);
		assert.equal(body.study.analysis.anb, 2.5);
	});

	it("10. GET /api/orthodontics/:patientId/ceph-analysis returns persisted ceph analysis from PostgreSQL 18", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "GET",
			url: `/api/orthodontics/${PATIENT_ID}/ceph-analysis`,
			headers: ORG_HEADERS,
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.ok(body.study);
		assert.equal(body.study.placedCount, 16);
		assert.equal(body.study.landmarks.S.x, 280);
		assert.equal(body.study.analysis.sna, 82.5);
	});
});
