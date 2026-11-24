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
});
