import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { organizations, patients } from "../../db/schema.js";
import { registerOrthodonticsRoutes } from "../../routes/orthodontics/index.js";
import { linkOrthoServiceToBillingSafely } from "../../routes/orthodontics/orthoBillingService.js";
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

	it("1. GET /api/orthodontics/:patientId/progress returns 200 with hasActiveTreatment: false when no active ortho treatment exists (DEF-ORTHO-02 / Мандат 8aj)", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "GET",
			url: `/api/orthodontics/${PATIENT_ID}/progress`,
			headers: ORG_HEADERS,
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.hasActiveTreatment, false);
		assert.equal(body.progress, null);
		assert.equal(body.patientId, PATIENT_ID);
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
		// DEF-ORTHO-01 / Red Team Досье: Проверка отсутствия перетирания раздельных дуг ВЧ и НЧ
		const upperRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/archwire-change`,
			headers: ORG_HEADERS,
			payload: {
				material: "CuNiTi",
				section: ".018",
				arch: "upper",
				note: "Установка рабочей дуги ВЧ",
			},
		});
		assert.equal(upperRes.statusCode, 200);
		const upperBody = JSON.parse(upperRes.body);
		assert.equal(upperBody.upperArchwire, 'CuNiTi .018" (ВЧ)');

		const lowerRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/archwire-change`,
			headers: ORG_HEADERS,
			payload: {
				material: "SS",
				section: ".019x.025",
				arch: "lower",
				note: "Установка стальной дуги НЧ",
			},
		});
		assert.equal(lowerRes.statusCode, 200);
		const lowerBody = JSON.parse(lowerRes.body);
		assert.equal(lowerBody.lowerArchwire, 'SS .019x.025" (НЧ)');
		// Проверяем, что дуга ВЧ не перетерлась, а сохранилась!
		assert.equal(lowerBody.progress.upperArchwire, 'CuNiTi .018" (ВЧ)');
		assert.equal(lowerBody.progress.lowerArchwire, 'SS .019x.025" (НЧ)');
		assert.ok(lowerBody.progress.archwire.includes("CuNiTi .018\" (ВЧ)"));
		assert.ok(lowerBody.progress.archwire.includes("SS .019x.025\" (НЧ)"));
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

	it("11. linkOrthoServiceToBillingSafely calculates exact kopecks and formats totals without float drift (Mandate 8bm)", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		const VISIT_ID = fixtureUuid(NAMESPACE, 15);
		const result1 = await linkOrthoServiceToBillingSafely({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			visitId: VISIT_ID,
			serviceCode: "A16.07.048.001",
			serviceName: "Активация брекет-системы",
			priceKopecks: 250050n,
		});

		assert.equal(result1.serviceAdded, true);
		assert.equal(result1.priceRub, 2500.5);
		assert.equal(result1.priceKopecks, 250050);
		assert.equal(result1.amountKopecks, 250050n);

		const result2 = await linkOrthoServiceToBillingSafely({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			visitId: VISIT_ID,
			serviceCode: "A16.07.048.002",
			serviceName: "Замена ортодонтической дуги",
			priceKopecks: 149950n,
		});

		assert.equal(result2.serviceAdded, true);
		assert.equal(result2.priceRub, 1499.5);
		assert.equal(result2.priceKopecks, 149950);
		assert.equal(result2.amountKopecks, 149950n);
	});

	it("12. DEF-ORTHO-API-01: Idempotency-Key validation & replay caching on archwire-change and ligatures-activate (Mandates 8bo, 8zp)", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		// 12a. archwire-change rejects non-UUID idempotency key
		const invalidIdemRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/archwire-change`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": "not-a-valid-uuid",
			},
			payload: {
				material: "NiTi",
				section: ".014",
				arch: "upper",
			},
		});
		assert.equal(invalidIdemRes.statusCode, 400);
		const invalidBody = JSON.parse(invalidIdemRes.body);
		assert.equal(invalidBody.error, "ValidationError");

		// 12b. archwire-change performs exactly-once execution and idempotent replay
		const idemKey1 = fixtureUuid(NAMESPACE, 21);
		const firstWireRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/archwire-change`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKey1,
			},
			payload: {
				material: "SS",
				section: ".018",
				arch: "upper",
				note: "Первая смена дуги",
			},
		});
		assert.equal(firstWireRes.statusCode, 200);
		const firstWireBody = JSON.parse(firstWireRes.body);
		assert.equal(firstWireBody.success, true);
		assert.equal(firstWireRes.headers["idempotency-key"], idemKey1);

		// Replay with identical key
		const secondWireRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/archwire-change`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKey1,
			},
			payload: {
				material: "SS",
				section: ".018",
				arch: "upper",
				note: "Первая смена дуги",
			},
		});
		assert.equal(secondWireRes.statusCode, 200);
		assert.equal(secondWireRes.headers["idempotency-replayed"], "true");
		const secondWireBody = JSON.parse(secondWireRes.body);
		assert.deepEqual(secondWireBody, firstWireBody);

		// 12c. ligatures-activate performs exactly-once execution and idempotent replay
		const idemKey2 = fixtureUuid(NAMESPACE, 22);
		const firstLigRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/ligatures-activate`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKey2,
			},
			payload: {
				powerChain: true,
				powerChainSpan: "14-24",
				note: "Закрытие тремы",
			},
		});
		assert.equal(firstLigRes.statusCode, 200);
		const firstLigBody = JSON.parse(firstLigRes.body);
		assert.equal(firstLigBody.success, true);

		// Replay with identical key
		const secondLigRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/ligatures-activate`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKey2,
			},
			payload: {
				powerChain: true,
				powerChainSpan: "14-24",
			},
		});
		assert.equal(secondLigRes.statusCode, 200);
		assert.equal(secondLigRes.headers["idempotency-replayed"], "true");
		const secondLigBody = JSON.parse(secondLigRes.body);
		assert.deepEqual(secondLigBody, firstLigBody);

		// 12d. aligners/issue-set performs idempotent replay and prevents double billing
		const idemKeyAligners = fixtureUuid(NAMESPACE, 23);
		const firstAlignerRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/aligners/issue-set`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKeyAligners,
			},
			payload: {
				alignerCount: 2,
				wearDaysPerAligner: 14,
				note: "Выдача кап №1-2",
			},
		});
		assert.equal(firstAlignerRes.statusCode, 200);
		const firstAlignerBody = JSON.parse(firstAlignerRes.body);
		assert.equal(firstAlignerBody.success, true);

		const secondAlignerRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/aligners/issue-set`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKeyAligners,
			},
			payload: {
				alignerCount: 2,
				wearDaysPerAligner: 14,
			},
		});
		assert.equal(secondAlignerRes.statusCode, 200);
		assert.equal(secondAlignerRes.headers["idempotency-replayed"], "true");
		const secondAlignerBody = JSON.parse(secondAlignerRes.body);
		assert.deepEqual(secondAlignerBody, firstAlignerBody);

		// 12e. stages/advance performs idempotent replay
		const idemKeyStage = fixtureUuid(NAMESPACE, 24);
		const firstStageRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/stages/advance`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKeyStage,
			},
			payload: {
				nextStage: 4,
				stageTitle: "Активация дуг и закрытие промежутков",
			},
		});
		assert.equal(firstStageRes.statusCode, 200);
		const firstStageBody = JSON.parse(firstStageRes.body);
		assert.equal(firstStageBody.success, true);

		const secondStageRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/stages/advance`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKeyStage,
			},
			payload: {
				nextStage: 4,
			},
		});
		assert.equal(secondStageRes.statusCode, 200);
		assert.equal(secondStageRes.headers["idempotency-replayed"], "true");
		const secondStageBody = JSON.parse(secondStageRes.body);
		assert.deepEqual(secondStageBody, firstStageBody);

		// 12f. rebracket performs idempotent replay and prevents double deduction
		const idemKeyRebracket = fixtureUuid(NAMESPACE, 25);
		const firstRebracketRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/rebracket`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKeyRebracket,
			},
			payload: {
				toothNumber: 14,
				bracketType: "Damon Clear 2",
			},
		});
		assert.equal(firstRebracketRes.statusCode, 200);
		const firstRebracketBody = JSON.parse(firstRebracketRes.body);
		assert.equal(firstRebracketBody.success, true);

		const secondRebracketRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/rebracket`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKeyRebracket,
			},
			payload: {
				toothNumber: 14,
				bracketType: "Damon Clear 2",
			},
		});
		assert.equal(secondRebracketRes.statusCode, 200);
		assert.equal(secondRebracketRes.headers["idempotency-replayed"], "true");
		const secondRebracketBody = JSON.parse(secondRebracketRes.body);
		assert.deepEqual(secondRebracketBody, firstRebracketBody);

		// 12g. deduct-materials performs idempotent replay
		const idemKeyDeduct = fixtureUuid(NAMESPACE, 26);
		const firstDeductRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/deduct-materials`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKeyDeduct,
			},
			payload: {
				action: "bonding",
				quantity: 2,
			},
		});
		assert.equal(firstDeductRes.statusCode, 200);
		const firstDeductBody = JSON.parse(firstDeductRes.body);
		assert.equal(firstDeductBody.success, true);

		const secondDeductRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/deduct-materials`,
			headers: {
				...ORG_HEADERS,
				"idempotency-key": idemKeyDeduct,
			},
			payload: {
				action: "bonding",
				quantity: 2,
			},
		});
		assert.equal(secondDeductRes.statusCode, 200);
		assert.equal(secondDeductRes.headers["idempotency-replayed"], "true");
		const secondDeductBody = JSON.parse(secondDeductRes.body);
		assert.deepEqual(secondDeductBody, firstDeductBody);
	});

	it("13. DEF-ORTHO-API-02: Sealed Zod schemas with .strict() reject extra unknown properties (Mandate 8bq)", async (t) => {
		if (!databaseAvailable) return t.skip("Database is unavailable");

		// 13a. issueAlignerSetSchema .strict()
		const alignerRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/aligners/issue-set`,
			headers: ORG_HEADERS,
			payload: {
				alignerCount: 2,
				wearDaysPerAligner: 14,
				unknownHackerField: "malicious_payload",
			},
		});
		assert.equal(alignerRes.statusCode, 400);

		// 13b. ligatureActivateSchema .strict()
		const ligatureRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/ligatures-activate`,
			headers: ORG_HEADERS,
			payload: {
				powerChain: true,
				rogueProperty: 123,
			},
		});
		assert.equal(ligatureRes.statusCode, 400);

		// 13c. stageAdvanceSchema .strict()
		const stageRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/stages/advance`,
			headers: ORG_HEADERS,
			payload: {
				nextStage: 3,
				unrecognizedPayload: true,
			},
		});
		assert.equal(stageRes.statusCode, 400);

		// 13d. rebracketSchema .strict()
		const rebracketRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/rebracket`,
			headers: ORG_HEADERS,
			payload: {
				toothNumber: 15,
				unexpectedField: "boom",
			},
		});
		assert.equal(rebracketRes.statusCode, 400);

		// 13e. deductOrthoMaterialsSchema .strict()
		const deductRes = await app.inject({
			method: "POST",
			url: `/api/orthodontics/${PATIENT_ID}/deduct-materials`,
			headers: ORG_HEADERS,
			payload: {
				action: "wire_change",
				quantity: 1,
				extraUnsafeParam: "denied",
			},
		});
		assert.equal(deductRes.statusCode, 400);
	});
});
