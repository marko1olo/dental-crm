import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";

describe("RED TEAM INQUISITION: Endodontics & Canal Working Length Integrity", () => {
	const secret = authTokenSecret();
	const orgId = "00000000-0000-0000-0000-000000000001";
	const doctorToken = signToken(
		{ organizationId: orgId, userId: "doc-1", role: "doctor", fullName: "Врач Эндодонтист" },
		secret,
	);
	const marketerToken = signToken(
		{ organizationId: orgId, userId: "marketer-1", role: "marketer", fullName: "Маркетолог Взломщик" },
		secret,
	);

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
			url: "/api/patients/pat-1/tooth-states/16/endo",
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
		assert.equal(json.toothNumber, 16);
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
			url: "/api/patients/pat-1/tooth-states/36/endo",
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
		assert.equal(json.clinicalData.stageStamp, "TEMP_CAOH2");

		await app.close();
	});
});
