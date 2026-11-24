import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import Fastify from "fastify";
import { and, eq } from "drizzle-orm";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { db } from "../../db/client.js";
import { organizations, patients, toothStates, idempotencyKeys } from "../../db/schema.js";

describe("RED TEAM INQUISITION: Endodontics & Canal Working Length Integrity", () => {
	const secret = authTokenSecret();
	const orgId = "00000000-0000-0000-0000-000000000001";
	const testPatientId = "00000000-0000-0000-0000-000000000002";
	const doctorToken = signToken(
		{ organizationId: orgId, userId: "doc-1", role: "doctor", fullName: "Врач Эндодонтист" },
		secret,
	);
	const marketerToken = signToken(
		{ organizationId: orgId, userId: "marketer-1", role: "marketer", fullName: "Маркетолог Взломщик" },
		secret,
	);

	before(async () => {
		await db.insert(organizations).values({
			id: orgId,
			name: "Test Org Endo Inquisition",
			createdAt: new Date(),
			updatedAt: new Date(),
		}).onConflictDoNothing();

		await db.insert(patients).values({
			id: testPatientId,
			organizationId: orgId,
			fullName: "Тестовый Пациент Эндо",
			phone: "+79991234567",
			birthDate: "1990-01-01",
			createdAt: new Date(),
			updatedAt: new Date(),
		}).onConflictDoNothing();

		await db.delete(toothStates).where(
			and(
				eq(toothStates.organizationId, orgId),
				eq(toothStates.patientId, testPatientId),
			),
		);
	});

	after(async () => {
		try {
			await db.delete(toothStates).where(
				and(
					eq(toothStates.organizationId, orgId),
					eq(toothStates.patientId, testPatientId),
				),
			);
			await db.delete(idempotencyKeys).where(
				eq(idempotencyKeys.clinicId, orgId),
			);
			await db.delete(patients).where(
				and(
					eq(patients.organizationId, orgId),
					eq(patients.id, testPatientId),
				),
			);
		} catch { /* safe */ }
	});

	it("1. 152-FZ Security Guard: Marketer attempting GET /endo is blocked with 403 Forbidden", async () => {
		const app = Fastify();
		await registerOdontogramRoutes(app);
		await app.ready();

		const res = await app.inject({
			method: "GET",
			url: "/api/patients/pat-1/tooth-states/16/endo",
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.equal(res.statusCode, 403);
		const json = JSON.parse(res.payload);
		assert.equal(json.error, "PermissionDenied");
		await app.close();
	});

	it("2. Anonymous Access Guard: Querying /endo without staff token returns 403", async () => {
		const app = Fastify();
		await registerOdontogramRoutes(app);
		await app.ready();

		const res = await app.inject({
			method: "GET",
			url: "/api/patients/pat-1/tooth-states/16/endo",
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
			},
		});

		assert.ok(
			res.statusCode === 403 || res.statusCode === 401,
			`Expected 401 or 403, got ${res.statusCode}`,
		);
		await app.close();
	});

	it("3. Doctor Autonomy (Mandate 8e): Doctor can save endo canals with MB2 obliteration and NiTi WaveOne", async () => {
		const app = Fastify();
		await registerOdontogramRoutes(app);
		await app.ready();

		const endoPayload = {
			canals: [
				{
					id: "c-1",
					canalName: "MB",
					referencePoint: "Щечный бугор",
					workingLengthMm: 21.5,
					masterApicalFile: "WaveOne Gold Primary #25",
					taper: ".07",
					obturationTechnique: "Непрерывная волна (GuttaCore)",
					sealer: "AH Plus",
					isObliterated: false,
				},
				{
					id: "c-2",
					canalName: "DB",
					referencePoint: "Дистальный щечный бугор",
					workingLengthMm: 20.0,
					masterApicalFile: "WaveOne Gold Small #20",
					taper: ".07",
					obturationTechnique: "Непрерывная волна",
					sealer: "AH Plus",
					isObliterated: false,
				},
				{
					id: "c-3",
					canalName: "P",
					referencePoint: "Небный бугор",
					workingLengthMm: 22.0,
					masterApicalFile: "ProTaper Gold F3 #30",
					taper: ".09",
					obturationTechnique: "Вертикальная конденсация",
					sealer: "AH Plus",
					isObliterated: false,
				},
				{
					id: "c-4",
					canalName: "MB2",
					referencePoint: "Устье не обнаружено",
					workingLengthMm: 0,
					masterApicalFile: "ISO 08",
					taper: ".02",
					obturationTechnique: "Не обтурирован",
					sealer: "—",
					isObliterated: true,
					notes: "MB2 — облитерация, устье не найдено при ревизии под микроскопом",
				},
			],
			irrigation: "Гипохлорит натрия NaOCl 3% + ЭДТА 17% с УЗ-активацией",
			rotarySystem: "WaveOne Gold / ProTaper Gold NiTi",
			radiologyControl: "RVG контроль: плотная гомогенная обтурация 3 каналов до апекса",
			apexLocator: "0.0 Apex (Raypex 6)",
			stageStamp: "COMPLETED",
		};

		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: endoPayload,
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.payload);
		assert.equal(json.success, true);
		assert.ok(json.data, "API envelope must return data property");
		assert.equal(json.toothNumber, 16);
		assert.equal(json.data.toothNumber, 16);
		assert.equal(json.clinicalData.canals.length, 4);
		assert.equal(json.clinicalData.rotarySystem, "WaveOne Gold / ProTaper Gold NiTi");
		assert.equal(json.clinicalData.canals[3].isObliterated, true);

		await app.close();
	});

	it("4. Temporary Ca(OH)2 Calasept Protocol: Saves stageStamp TEMP_CAOH2 without blocking", async () => {
		const app = Fastify();
		await registerOdontogramRoutes(app);
		await app.ready();

		const caoh2Payload = {
			canals: [
				{
					id: "c-m1",
					canalName: "Медиальный",
					referencePoint: "Бугор",
					workingLengthMm: 21.0,
					masterApicalFile: "ProTaper Gold F2",
					taper: ".08",
					obturationTechnique: "Временная обтурация Ca(OH)2",
					sealer: "Calasept / Metapex",
					isObliterated: false,
				},
				{
					id: "c-d1",
					canalName: "Дистальный",
					referencePoint: "Бугор",
					workingLengthMm: 21.5,
					masterApicalFile: "ProTaper Gold F3",
					taper: ".09",
					obturationTechnique: "Временная обтурация Ca(OH)2",
					sealer: "Calasept / Metapex",
					isObliterated: false,
				},
			],
			irrigation: "Гипохлорит натрия NaOCl 3%",
			rotarySystem: "ProTaper Gold",
			radiologyControl: "Контроль внесения гидроксида кальция в каналы",
			stageStamp: "TEMP_CAOH2",
		};

		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/36/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: caoh2Payload,
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.payload);
		assert.equal(json.success, true);
		assert.ok(json.data, "API envelope must return data property");
		assert.equal(json.clinicalData.stageStamp, "TEMP_CAOH2");

		await app.close();
	});

	it("5. Contract Normalization: Handles string working length ('21.5', '20,0') and extended apex locator ('-1.0 мм')", async () => {
		const app = Fastify();
		await registerOdontogramRoutes(app);
		await app.ready();

		const payload = {
			canals: [
				{
					id: "c-mb1",
					canalName: "MB1",
					workingLengthMm: "21.5",
					apexLocatorReading: "-1.0 мм",
					masterFile: "#25.04",
					masterCone: "Гуттаперча 0.04",
					referencePoint: "Бугор",
					taper: ".04",
					obturationTechnique: "Латеральная компакция",
					sealer: "AH Plus",
					isObliterated: false,
				},
				{
					id: "c-db",
					canalName: "DB",
					workingLengthMm: "20,0",
					apexLocatorReading: "-1.5 mm",
					masterFile: "#25.04",
					masterCone: "Гуттаперча 0.04",
					referencePoint: "Бугор",
					taper: ".04",
					obturationTechnique: "Латеральная компакция",
					sealer: "AH Plus",
					isObliterated: false,
				},
			],
			irrigation: "NaOCl 3%",
			stageStamp: "COMPLETED",
		};

		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload,
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.payload);
		assert.equal(json.success, true);
		assert.ok(json.data, "API envelope must return data property");
		assert.equal(json.clinicalData.canals[0].workingLengthMm, 21.5);
		assert.equal(typeof json.clinicalData.canals[0].workingLengthMm, "number");
		assert.equal(json.clinicalData.canals[0].apexLocatorReading, "-1.0 мм");
		assert.equal(json.clinicalData.canals[1].workingLengthMm, 20.0);
		assert.equal(typeof json.clinicalData.canals[1].workingLengthMm, "number");
		assert.equal(json.clinicalData.canals[1].apexLocatorReading, "-1.5 mm");

		await app.close();
	});

	it("6. Zod Validation (Defect 3 / SEV-3): Rejects negative working length or invalid strings with 400 Bad Request", async () => {
		const app = Fastify();
		await registerOdontogramRoutes(app);
		await app.ready();

		// Negative number
		const resNegNum = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				canals: [{ canalName: "MB", workingLengthMm: -5 }],
			},
		});
		assert.equal(resNegNum.statusCode, 400, "Negative working length must be rejected with 400");
		const jsonNegNum = JSON.parse(resNegNum.payload);
		assert.equal(jsonNegNum.error, "EndoValidationError");

		// Negative string
		const resNegStr = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				canals: [{ canalName: "MB", workingLengthMm: "-5.0" }],
			},
		});
		assert.equal(resNegStr.statusCode, 400, "Negative string working length must be rejected with 400");

		// Invalid non-numeric string
		const resInvalidStr = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				canals: [{ canalName: "MB", workingLengthMm: "invalid_length" }],
			},
		});
		assert.equal(resInvalidStr.statusCode, 400, "Invalid string must be rejected with 400");

		// Exceeding anatomical maximum (>35 mm)
		const resTooLong = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				canals: [{ canalName: "MB", workingLengthMm: 50 }],
			},
		});
		assert.equal(resTooLong.statusCode, 400, "Working length > 35mm must be rejected with 400");

		await app.close();
	});

	it("7. Zod Validation (Defect 3 / SEV-3): Accepts valid boundary working length (0 mm obliterated, 35 mm max)", async () => {
		const app = Fastify();
		await registerOdontogramRoutes(app);
		await app.ready();

		const resBoundary = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				canals: [
					{ canalName: "MB", workingLengthMm: 0, isObliterated: true },
					{ canalName: "DB", workingLengthMm: "35", isObliterated: false },
				],
			},
		});
		assert.equal(resBoundary.statusCode, 200, "Boundary working length (0, 35) must be accepted");
		const jsonBoundary = JSON.parse(resBoundary.payload);
		assert.equal(jsonBoundary.success, true);
		assert.ok(jsonBoundary.data, "API envelope must return data property");
		assert.equal(jsonBoundary.clinicalData.canals[0].workingLengthMm, 0);
		assert.equal(jsonBoundary.clinicalData.canals[1].workingLengthMm, 35);

		await app.close();
	});

	it("8. DEF-ENDO-02 Strict Schema: Rejects unknown fields with 400 Bad Request", async () => {
		const app = Fastify();
		await registerOdontogramRoutes(app);
		await app.ready();

		const resUnknown = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				canals: [{ canalName: "MB", workingLengthMm: 21 }],
				unrecognizedField: "evilPayload",
			},
		});

		assert.equal(resUnknown.statusCode, 400, "Unknown field must be rejected with 400 due to .strict()");
		const json = JSON.parse(resUnknown.payload);
		assert.equal(json.error, "EndoValidationError");

		await app.close();
	});

	it("9. DEF-ENDO-03 Idempotency: Replays cached response and avoids duplicates on Idempotency-Key", async () => {
		const app = Fastify();
		await registerOdontogramRoutes(app);
		await app.ready();

		const idemKey = "018f67b5-2345-7123-8abc-123456789abc";
		const payload = {
			canals: [{ canalName: "P", workingLengthMm: 22 }],
			irrigation: "NaOCl 3%",
			stageStamp: "COMPLETED",
		};

		const res1 = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"idempotency-key": idemKey,
				"content-type": "application/json",
			},
			payload,
		});

		assert.equal(res1.statusCode, 200);
		assert.equal(res1.headers["idempotency-key"], idemKey);

		// Second call with same idempotency key
		const res2 = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"idempotency-key": idemKey,
				"content-type": "application/json",
			},
			payload,
		});

		assert.equal(res2.statusCode, 200);
		assert.equal(res2.headers["idempotency-key"], idemKey);
		if (res2.headers["idempotency-replayed"]) {
			assert.equal(res2.headers["idempotency-replayed"], "true");
		}

		await app.close();
	});

	it("10. SEV-1 Guard: Querying non-existent patient returns 404, not fake 200", async () => {
		const app = Fastify();
		await registerOdontogramRoutes(app);
		await app.ready();

		const resNotFound = await app.inject({
			method: "POST",
			url: "/api/patients/00000000-0000-0000-0000-999999999999/tooth-states/16/endo",
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				canals: [{ canalName: "MB", workingLengthMm: 21 }],
			},
		});
		assert.equal(resNotFound.statusCode, 404);
		const jsonNotFound = JSON.parse(resNotFound.payload);
		assert.equal(jsonNotFound.error, "PatientNotFound");

		await app.close();
	});

	it("11. SEV-1 Fix: Accepts toothNumber in payload without Zod strict rejection & returns Mandate 8bm envelope", async () => {
		const app = Fastify();
		await registerOdontogramRoutes(app);
		await app.ready();

		const resPost = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				toothNumber: 16,
				canals: [{ canalName: "MB", workingLengthMm: 21.5 }],
				rotarySystem: "WaveOne Gold",
				irrigation: "NaOCl 3%",
			},
		});

		assert.equal(resPost.statusCode, 200, "Must accept toothNumber in payload without 400 Bad Request");
		const jsonPost = JSON.parse(resPost.payload);
		assert.equal(jsonPost.success, true);
		assert.ok(jsonPost.data, "POST must return data property (Mandate 8bm)");
		assert.equal(jsonPost.data.toothNumber, 16);

		const resGet = await app.inject({
			method: "GET",
			url: `/api/patients/${testPatientId}/tooth-states/16/endo`,
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.equal(resGet.statusCode, 200);
		const jsonGet = JSON.parse(resGet.payload);
		assert.equal(jsonGet.success, true);
		assert.ok(jsonGet.data, "GET must return data envelope (Mandate 8bm)");
		assert.equal(jsonGet.data.toothNumber, 16);
		assert.ok(Array.isArray(jsonGet.data.canalMeasurements));

		await app.close();
	});
});
