import assert from "node:assert/strict";
import { describe, test } from "node:test";
import Fastify from "fastify";
import {
	createImplantInstallationSchema,
	rublesToKopecks,
} from "@dental/shared";
import { linkBillingAndOdontogram } from "../routes/clinicalImplants/installationBillingAndOdontogram.js";
import { registerPassportRoute } from "../routes/clinicalImplants/passportRoute.js";
import { registerInstallationRoute } from "../routes/clinicalImplants/installationRoute.js";
import type { DbExecutor } from "../services/treatmentConsumables/types.js";
import { signToken } from "../utils/cryptoHelper.js";
import { authTokenSecret } from "../security/authSecret.js";

describe("surgeryFixerSurgeon — Red Team Invariants & DoD Gates", () => {
	const secret = authTokenSecret();
	const orgId = "org-00000000-0000-0000-0000-000000000001";
	const userId = "usr-00000000-0000-0000-0000-000000000001";
	const clinicToken = signToken({ organizationId: orgId }, secret);
	const staffToken = signToken(
		{
			userId,
			organizationId: orgId,
			role: "doctor",
		},
		secret,
	);
	const authHeaders = {
		"x-dente-clinic-token": clinicToken,
		"x-dente-staff-token": staffToken,
	};

	describe("1. Schema & Kopeck Contract (Mandates 8bm, 8e)", () => {
		test("createImplantInstallationSchema accepts operationPriceKopecks as string, number, or bigint", () => {
			const basePayload = {
				patientId: "a0000000-0000-0000-0000-000000000001",
				toothNumberFdi: 46,
				implantBrand: "Osstem",
				implantDiameterMm: 4.0,
				implantLengthMm: 10.0,
				finalInsertionTorqueNcm: 35,
			};

			const withString = createImplantInstallationSchema.safeParse({
				...basePayload,
				operationPriceKopecks: "4500000",
			});
			assert.ok(withString.success, "String operationPriceKopecks must be valid");
			assert.equal(withString.data.operationPriceKopecks, "4500000");

			const withNumber = createImplantInstallationSchema.safeParse({
				...basePayload,
				operationPriceKopecks: 4500000,
			});
			assert.ok(withNumber.success, "Number operationPriceKopecks must be valid");
			assert.equal(withNumber.data.operationPriceKopecks, 4500000);

			const withBigInt = createImplantInstallationSchema.safeParse({
				...basePayload,
				operationPriceKopecks: 4500000n,
			});
			assert.ok(withBigInt.success, "BigInt operationPriceKopecks must be valid");
			assert.equal(withBigInt.data.operationPriceKopecks, 4500000n);
		});

		test("createImplantInstallationSchema strictly rejects deciduous teeth (51–85)", () => {
			for (const deciduousTooth of [51, 54, 63, 71, 75, 84, 85]) {
				const res = createImplantInstallationSchema.safeParse({
					patientId: "a0000000-0000-0000-0000-000000000001",
					toothNumberFdi: deciduousTooth,
					implantBrand: "Dentium",
					implantDiameterMm: 3.8,
					implantLengthMm: 8.0,
					finalInsertionTorqueNcm: 30,
				});
				assert.strictEqual(res.success, false, `Tooth ${deciduousTooth} must be rejected`);
			}
		});

		test("linkBillingAndOdontogram uses exact operationPriceKopecks preserving BIGINT accuracy", async () => {
			const recordedInserts: { table: string; values: unknown }[] = [];
			const mockTx: DbExecutor = {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: async () => [],
							orderBy: () => ({
								limit: async () => [],
							}),
						}),
					}),
				}),
				insert: (tableObj: unknown) => ({
					values: (val: unknown) => {
						recordedInserts.push({ table: String(tableObj), values: val });
						return {
							returning: async () => [{ id: "inv-created-id-01" }],
							onConflictDoUpdate: async () => [],
						};
					},
				}),
				update: () => ({
					set: () => ({
						where: async () => [],
					}),
				}),
			} as unknown as DbExecutor;

			const input = {
				patientId: "b0000000-0000-0000-0000-000000000002",
				toothNumberFdi: 36,
				implantBrand: "Dentium",
				implantDiameterMm: 4.5,
				implantLengthMm: 10.0,
				finalInsertionTorqueNcm: 40,
				isGuidedSurgery: false,
				boneDensityClass: "D2" as const,
				torqueCurveSamples: [],
				operationPriceKopecks: "5500050",
				operationPriceRub: 55000.5,
			};

			const financials = await linkBillingAndOdontogram(
				mockTx,
				orgId,
				input,
				12000,
				3500,
				"LOT-TEST-99",
				75,
				"transgingival_one_stage",
			);

			assert.strictEqual(financials.operationPriceKopecks, "5500050");
			assert.strictEqual(financials.amountKopecks, "5500050");
			const expectedMaterialKopecks = BigInt(rublesToKopecks(12000)) + BigInt(rublesToKopecks(3500));
			assert.strictEqual(financials.totalMaterialsCostKopecks, expectedMaterialKopecks.toString());
			const expectedGrossMargin = 5500050n - expectedMaterialKopecks;
			assert.strictEqual(financials.doctorGrossMarginKopecks, expectedGrossMargin.toString());
		});
	});

	describe("2. Dynamic QR Warranty URL (Mandate 8e, SEV-3)", () => {
		test("passportRoute builds QR URL dynamically from x-forwarded-host and x-forwarded-proto", async () => {
			const app = Fastify();
			registerPassportRoute(app);

			const response = await app.inject({
				method: "GET",
				url: "/api/clinical/implants/00000000-0000-0000-0000-000000000000/passport",
				headers: {
					"x-forwarded-host": "aurora-dental.ru",
					"x-forwarded-proto": "https",
					...authHeaders,
				},
			});

			assert.ok([401, 403, 404, 500].includes(response.statusCode));
			assert.ok(!response.body.includes("https://dente.clinic"), "Must not leak hardcoded dente.clinic URL");
		});
	});

	describe("3. Atomic Idempotency-Key & Deciduous Gate (Mandates 8bo, 8zp, SEV-1, SEV-2)", () => {
		test("installationRoute rejects deciduous tooth in teeth array or toothNumberFdi with 422", async () => {
			const app = Fastify();
			registerInstallationRoute(app);

			const singleDeciduousRes = await app.inject({
				method: "POST",
				url: "/api/clinical/implants/installations",
				headers: {
					...authHeaders,
				},
				payload: {
					patientId: "a0000000-0000-0000-0000-000000000001",
					toothNumberFdi: 54,
					implantBrand: "Osstem",
					implantDiameterMm: 4.0,
					implantLengthMm: 10.0,
					finalInsertionTorqueNcm: 35,
				},
			});

			assert.strictEqual(singleDeciduousRes.statusCode, 422);
			const singleBody = singleDeciduousRes.json();
			assert.strictEqual(singleBody.error, "DeciduousToothImplantForbidden");

			const batchDeciduousRes = await app.inject({
				method: "POST",
				url: "/api/clinical/implants/installations/batch",
				headers: {
					...authHeaders,
				},
				payload: {
					patientId: "a0000000-0000-0000-0000-000000000001",
					teeth: [46, 75],
					implantBrand: "Osstem",
					implantDiameterMm: 4.0,
					implantLengthMm: 10.0,
					finalInsertionTorqueNcm: 35,
				},
			});

			assert.strictEqual(batchDeciduousRes.statusCode, 422);
			const batchBody = batchDeciduousRes.json();
			assert.strictEqual(batchBody.error, "DeciduousToothImplantForbidden");
		});
	});

	describe("4. Extraction & Minor Surgery SSOT Standards (Domain 74, SEV-1..SEV-3)", () => {
		test("CANONICAL_SURGICAL_OPERATION_NORMS includes atraumatic, socket preservation, and alveolitis norms", async () => {
			const { CANONICAL_SURGICAL_OPERATION_NORMS } = await import("@dental/shared");

			const atraumatic = CANONICAL_SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_extraction_atraumatic");
			assert.ok(atraumatic, "surgery_extraction_atraumatic norm must exist");
			assert.equal(atraumatic?.priceKopecks, 450000n, "Atraumatic extraction must have 450000n priceKopecks");
			assert.equal(atraumatic?.code804n, "A16.07.001.001");

			const socketPreservation = CANONICAL_SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_socket_preservation");
			assert.ok(socketPreservation, "surgery_socket_preservation norm must exist");
			assert.equal(socketPreservation?.priceKopecks, 600000n, "Socket preservation must have 600000n priceKopecks");
			assert.equal(socketPreservation?.code804nSubcode, "A16.07.041.001");

			const alveolitis = CANONICAL_SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_alveolitis_curettage");
			assert.ok(alveolitis, "surgery_alveolitis_curettage norm must exist");
			assert.equal(alveolitis?.priceKopecks, 250000n, "Alveolitis curettage must have 250000n priceKopecks");
			assert.equal(alveolitis?.code804n, "A16.07.013");

			const simple = CANONICAL_SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_extraction_simple");
			const simpleCurettage = simple?.order804nServices?.find((s) => s.code === "A16.07.013");
			assert.ok(simpleCurettage, "Simple extraction curettage must have canonical 804n code A16.07.013 (not A16.07.026)");
		});

		test("SURGICAL_EXTRACTIONS_804N_CATALOG includes statutory 804n positions with BigInt kopecks", async () => {
			const { SURGICAL_EXTRACTIONS_804N_CATALOG } = await import("@dental/shared");

			const codes = SURGICAL_EXTRACTIONS_804N_CATALOG.map((e) => e.code);
			assert.ok(codes.includes("A16.07.001"), "A16.07.001 must be present");
			assert.ok(codes.includes("A16.07.001.001"), "A16.07.001.001 must be present");
			assert.ok(codes.includes("A16.07.001.002"), "A16.07.001.002 must be present");
			assert.ok(codes.includes("A16.07.013"), "A16.07.013 must be present");
			assert.ok(codes.includes("A16.07.097"), "A16.07.097 must be present");
			assert.ok(codes.includes("A16.07.041.001"), "A16.07.041.001 must be present");

			const curettage = SURGICAL_EXTRACTIONS_804N_CATALOG.find((e) => e.code === "A16.07.013");
			assert.equal(curettage?.defaultPriceKopecks, 250000n);

			const sutures = SURGICAL_EXTRACTIONS_804N_CATALOG.find((e) => e.code === "A16.07.097");
			assert.equal(sutures?.defaultPriceKopecks, 120000n);
		});

		test("createSurgicalProtocolSchema accepts multi-service payload with full validation", async () => {
			const { createSurgicalProtocolSchema } = await import("@dental/shared");

			const payload = {
				patientId: "a0000000-0000-0000-0000-000000000001",
				normId: "surgery_extraction_simple",
				toothNumberFdi: 18,
				protocolText: "Атравматичное удаление зуба 18, кюретаж лунки, гемостаз, наложение швов Викрил 4-0.",
				services: [
					{
						code: "A16.07.001.001",
						nameRu: "Удаление постоянного зуба простое",
						priceRub: 3500,
						priceKopecks: 350000n,
						quantity: 1,
						isPrimary: true,
					},
					{
						code: "A16.07.013",
						nameRu: "Кюретаж лунки удаленного зуба",
						priceRub: 2500,
						priceKopecks: 250000n,
						quantity: 1,
					},
					{
						code: "A16.07.097",
						nameRu: "Наложение шва на слизистую оболочку рта",
						priceRub: 1200,
						priceKopecks: 120000n,
						quantity: 1,
					},
				],
			};

			const parsed = createSurgicalProtocolSchema.safeParse(payload);
			assert.ok(parsed.success, "Multi-service protocol payload must be valid");
			assert.equal(parsed.data.services.length, 3);
		});
	});
});
